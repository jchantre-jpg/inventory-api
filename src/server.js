const express = require("express");
const cors = require("cors");
const { z } = require("zod");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const productSchema = z.object({
  sku: z.string().min(2).max(40),
  name: z.string().min(2).max(120),
  category: z.string().min(2).max(60),
  price_cents: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative().default(0),
});

const moveSchema = z.object({
  type: z.enum(["in", "out", "adjust"]),
  qty: z.number().int().positive(),
  note: z.string().max(200).optional(),
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "inventory-api", db: "sqlite" });
});

app.get("/products", (req, res) => {
  const { category, q } = req.query;
  let sql = "SELECT * FROM products WHERE 1=1";
  const params = [];
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  if (q) {
    sql += " AND (name LIKE ? OR sku LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += " ORDER BY name ASC";
  res.json(db.prepare(sql).all(...params));
});

app.post("/products", (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const p = parsed.data;
  try {
    const info = db
      .prepare(
        `INSERT INTO products (sku, name, category, price_cents, stock)
         VALUES (@sku, @name, @category, @price_cents, @stock)`
      )
      .run(p);
    const row = db.prepare("SELECT * FROM products WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    res.status(409).json({ error: e.message });
  }
});

app.get("/products/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

app.post("/products/:id/movements", (req, res) => {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const parsed = moveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { type, qty, note } = parsed.data;

  const tx = db.transaction(() => {
    let next = product.stock;
    if (type === "in") next += qty;
    else if (type === "out") next -= qty;
    else next = qty; // adjust = set absolute via qty as new stock delta from 0? better: adjust sets absolute
    // For adjust: qty is the new absolute stock
    if (type === "adjust") next = qty;
    if (next < 0) throw new Error("Insufficient stock");

    db.prepare(
      `INSERT INTO movements (product_id, type, qty, note) VALUES (?, ?, ?, ?)`
    ).run(product.id, type, qty, note || null);
    db.prepare(`UPDATE products SET stock = ? WHERE id = ?`).run(next, product.id);
    return db.prepare("SELECT * FROM products WHERE id = ?").get(product.id);
  });

  try {
    const updated = tx();
    res.status(201).json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/stats", (_req, res) => {
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS products,
              SUM(stock) AS units,
              SUM(stock * price_cents) AS inventory_value_cents
       FROM products`
    )
    .get();
  const byCategory = db
    .prepare(
      `SELECT category, COUNT(*) AS products, SUM(stock) AS units
       FROM products GROUP BY category ORDER BY units DESC`
    )
    .all();
  res.json({ ...totals, byCategory });
});

const PORT = process.env.PORT || 4070;
app.listen(PORT, () => {
  console.log(`inventory-api on http://localhost:${PORT}`);
});
