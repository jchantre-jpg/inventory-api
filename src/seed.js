const fs = require("fs");
const path = require("path");
const db = require("./db");

fs.mkdirSync(path.join(__dirname, "..", "data"), { recursive: true });

const count = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
if (count > 0) {
  console.log("Already seeded");
  process.exit(0);
}

const insert = db.prepare(
  `INSERT INTO products (sku, name, category, price_cents, stock)
   VALUES (@sku, @name, @category, @price_cents, @stock)`
);

const items = [
  { sku: "KB-01", name: "Teclado mecánico", category: "periféricos", price_cents: 18990000, stock: 14 },
  { sku: "MS-02", name: "Mouse inalámbrico", category: "periféricos", price_cents: 7990000, stock: 32 },
  { sku: "MN-03", name: "Monitor 27\"", category: "pantallas", price_cents: 89990000, stock: 7 },
  { sku: "CH-04", name: "Silla ergonómica", category: "oficina", price_cents: 65000000, stock: 5 },
];

const tx = db.transaction((rows) => rows.forEach((r) => insert.run(r)));
tx(items);
console.log(`Seeded ${items.length} products`);
