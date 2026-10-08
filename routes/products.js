const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/products - list all products (any logged-in user)
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id, name, price, quantity FROM products ORDER BY name').all();
  res.json(rows);
});

// POST /api/products - add a new product to the catalog (owner only)
router.post('/', requireAuth, requireRole('owner'), (req, res) => {
  const { name, price, quantity } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'A product name is required' });
  }
  if (price == null || isNaN(price) || price <= 0) {
    return res.status(400).json({ error: 'Price must be a number greater than 0' });
  }
  if (quantity != null && (isNaN(quantity) || quantity < 0)) {
    return res.status(400).json({ error: 'Starting quantity cannot be negative' });
  }

  const startQty = quantity || 0;
  const info = db
    .prepare('INSERT INTO products (name, price, quantity) VALUES (?, ?, ?)')
    .run(name.trim(), price, startQty);

  if (startQty > 0) {
    db.prepare(
      'INSERT INTO stock_movements (product_id, change_amount, reason, done_by) VALUES (?, ?, ?, ?)'
    ).run(info.lastInsertRowid, startQty, 'initial_stock', req.user.id);
  }

  res.status(201).json({ id: info.lastInsertRowid, name, price, quantity: startQty });
});

// POST /api/products/:id/restock - owner adds newly delivered stock
router.post('/:id/restock', requireAuth, requireRole('owner'), (req, res) => {
  const { amount } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Enter a restock amount greater than 0' });
  }

  db.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?').run(
    amount,
    req.params.id
  );
  db.prepare(
    'INSERT INTO stock_movements (product_id, change_amount, reason, done_by) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, amount, 'restock', req.user.id);

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json({ message: 'Stock updated', product: updated });
});

module.exports = router;
