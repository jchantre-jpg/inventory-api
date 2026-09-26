# Inventory API

![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white)
![Zod](https://img.shields.io/badge/validation-Zod-3E67B1)

API REST de **inventario** con movimientos de stock (entrada / salida / ajuste) y validación Zod.

## Stack
Node.js · Express · **SQLite** (better-sqlite3) · Zod

## Endpoints
- `GET /health`
- `GET /products?category=&q=`
- `POST /products`
- `GET /products/:id`
- `POST /products/:id/movements` — `{ "type":"in"|"out"|"adjust", "qty": n }`
- `GET /stats` — valor de inventario y breakdown por categoría

## Arranque
```bash
npm install
npm run seed
npm run dev
```

## Autora
**Juliana Chantre Astudillo** · [GitHub](https://github.com/jchantre-jpg)
