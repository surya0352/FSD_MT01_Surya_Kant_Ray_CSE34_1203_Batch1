const express = require("express");

const app = express();

app.use(express.json());


// ---------- In-memory data ----------
let products = [
  { id: 301, name: "Wireless Mouse", category: "Electronics", price: 799, quantity: 25, inStock: true },
  { id: 302, name: "Notebook", category: "Stationery", price: 60, quantity: 100, inStock: true },
  { id: 303, name: "USB Keyboard", category: "Electronics", price: 999, quantity: 0, inStock: false },
];
let nextId = 304;

// ---------- Helpers ----------
const isNonEmptyString = (v) => typeof v === "string" && v.trim() !== "";
const isValidNumber = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;

// Validates a body. When `requireAll` is true every field must be present (POST).
// For PUT, only the fields that are supplied are validated.
function validateProduct(body, requireAll) {
  const errors = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return ["Request body must be a JSON object"];
  }

  const rules = {
    name: [isNonEmptyString, "name must be a non-empty string"],
    category: [isNonEmptyString, "category must be a non-empty string"],
    price: [isValidNumber, "price must be a non-negative number"],
    quantity: [isValidNumber, "quantity must be a non-negative number"],
    inStock: [(v) => typeof v === "boolean", "inStock must be a boolean"],
  };

  for (const [field, [check, message]] of Object.entries(rules)) {
    if (body[field] === undefined) {
      if (requireAll) errors.push(`${field} is required`);
    } else if (!check(body[field])) {
      errors.push(message);
    }
  }
  return errors;
}

// ---------- Routes ----------

// 1. GET all products
app.get("/api/products", (req, res) => {
  res.status(200).json(products);
});

// 6. Filter by category (must be declared BEFORE /:id so "filter" isn't read as an id)
app.get("/api/products/filter", (req, res) => {
  const { category } = req.query;
  if (typeof category !== "string" || category.trim() === "") {
    return res.status(400).json({ error: "category query parameter is required" });
  }
  const result = products.filter(
    (p) => p.category.toLowerCase() === category.trim().toLowerCase()
  );
  res.status(200).json(result);
});

// Extra: general filter using a JSON body (any combination of fields)
// POST /api/products/search
// Body example: { "category": "electronics", "inStock": true, "minPrice": 500, "maxPrice": 1000, "name": "mouse" }
app.post("/api/products/search", (req, res) => {
  const b = req.body;
  if (!b || typeof b !== "object" || Array.isArray(b)) {
    return res.status(400).json({ error: "Request body must be a JSON object" });
  }

  const errors = [];
  if (b.name !== undefined && typeof b.name !== "string") errors.push("name must be a string");
  if (b.category !== undefined && typeof b.category !== "string") errors.push("category must be a string");
  if (b.inStock !== undefined && typeof b.inStock !== "boolean") errors.push("inStock must be a boolean");
  for (const f of ["minPrice", "maxPrice", "minQuantity", "maxQuantity"]) {
    if (b[f] !== undefined && !isValidNumber(b[f])) errors.push(`${f} must be a non-negative number`);
  }
  if (errors.length) return res.status(400).json({ errors });

  const result = products.filter((p) =>
    (b.category === undefined || p.category.toLowerCase() === b.category.trim().toLowerCase()) &&
    (b.name === undefined || p.name.toLowerCase().includes(b.name.trim().toLowerCase())) &&
    (b.inStock === undefined || p.inStock === b.inStock) &&
    (b.minPrice === undefined || p.price >= b.minPrice) &&
    (b.maxPrice === undefined || p.price <= b.maxPrice) &&
    (b.minQuantity === undefined || p.quantity >= b.minQuantity) &&
    (b.maxQuantity === undefined || p.quantity <= b.maxQuantity)
  );
  res.status(200).json(result);
});

// 3. GET product by id
app.get("/api/products/:id", (req, res) => {
  const product = products.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.status(200).json(product);
});

// 2. POST new product
app.post("/api/products", (req, res) => {
  const errors = validateProduct(req.body, true);
  if (errors.length) return res.status(400).json({ errors });

  const { name, category, price, quantity, inStock } = req.body;
  const product = { id: nextId++, name: name.trim(), category: category.trim(), price, quantity, inStock };
  products.push(product);
  res.status(201).json(product);
});

// 4. PUT update product
app.put("/api/products/:id", (req, res) => {
  const index = products.findIndex((p) => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Product not found" });

  const errors = validateProduct(req.body, false);
  if (errors.length) return res.status(400).json({ errors });

  const { name, category, price, quantity, inStock } = req.body;
  const current = products[index];
  products[index] = {
    id: current.id, // id never changes
    name: name !== undefined ? name.trim() : current.name,
    category: category !== undefined ? category.trim() : current.category,
    price: price !== undefined ? price : current.price,
    quantity: quantity !== undefined ? quantity : current.quantity,
    inStock: inStock !== undefined ? inStock : current.inStock,
  };
  res.status(200).json(products[index]);
});

// 5. DELETE product
app.delete("/api/products/:id", (req, res) => {
  const index = products.findIndex((p) => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Product not found" });

  const [removed] = products.splice(index, 1);
  res.status(200).json({ message: "Product deleted successfully", product: removed });
});

// ---------- Error handling ----------
// Malformed JSON body -> 400
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;