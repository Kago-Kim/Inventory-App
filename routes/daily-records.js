const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/daily-records - an employee's end-of-day submission of what was sold
// body: { items: [{ product_id, quantity_sold }], notes }
router.post('/', requireAuth, requireRole('employee', 'owner'), (req, res) => {
  const { items, notes } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Enter at least one item that was sold today' });
  }

  try {
    db.exec('BEGIN');

    let total = 0;
    const resolvedItems = [];

    for (const item of items) {
      const qty = Number(item.quantity_sold);
      if (!qty || qty <= 0) continue; // skip items left at 0 - nothing was sold

      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
      if (!product) throw new Error(`Product ${item.product_id} not found`);
      if (product.quantity < qty) {
        throw new Error(`Cannot record ${qty} sold for "${product.name}" - only ${product.quantity} in stock`);
      }

      total += product.price * qty;
      resolvedItems.push({ product, quantity_sold: qty });
    }

    if (resolvedItems.length === 0) {
      throw new Error('Enter at least one item with a quantity greater than 0');
    }

    const recordInfo = db
      .prepare(
        'INSERT INTO daily_records (employee_id, notes, total_expected_revenue) VALUES (?, ?, ?)'
      )
      .run(req.user.id, notes || null, total);

    for (const { product, quantity_sold } of resolvedItems) {
      db.prepare(
        'INSERT INTO daily_record_items (daily_record_id, product_id, product_name, quantity_sold, price_at_time) VALUES (?, ?, ?, ?, ?)'
      ).run(recordInfo.lastInsertRowid, product.id, product.name, quantity_sold, product.price);

      db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?').run(
        quantity_sold,
        product.id
      );

      db.prepare(
        'INSERT INTO stock_movements (product_id, change_amount, reason, done_by) VALUES (?, ?, ?, ?)'
      ).run(product.id, -quantity_sold, 'daily_sale', req.user.id);
    }

    db.exec('COMMIT');
    res.status(201).json({
      message: 'Daily record saved',
      record_id: Number(recordInfo.lastInsertRowid),
      total_expected_revenue: total
    });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(400).json({ error: err.message });
  }
});

// GET /api/daily-records - owner view: every day's submissions, with items and reconciliation status
router.get('/', requireAuth, requireRole('owner'), (req, res) => {
  const records = db
    .prepare(`
      SELECT dr.id, dr.record_date, dr.notes, dr.total_expected_revenue, dr.actual_cash_received, dr.created_at,
             u.name as employee_name
      FROM daily_records dr JOIN users u ON dr.employee_id = u.id
      ORDER BY dr.created_at DESC
    `)
    .all();

  const withItems = records.map((record) => {
    const items = db
      .prepare('SELECT product_name, quantity_sold, price_at_time FROM daily_record_items WHERE daily_record_id = ?')
      .all(record.id);

    const difference =
      record.actual_cash_received == null
        ? null
        : Number((record.actual_cash_received - record.total_expected_revenue).toFixed(2));

    return { ...record, items, difference };
  });

  res.json(withItems);
});

// PUT /api/daily-records/:id/cash - owner enters the actual cash brought to them for that day
router.put('/:id/cash', requireAuth, requireRole('owner'), (req, res) => {
  const { actual_cash_received } = req.body;
  const record = db.prepare('SELECT * FROM daily_records WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Daily record not found' });

  if (actual_cash_received == null || isNaN(actual_cash_received) || actual_cash_received < 0) {
    return res.status(400).json({ error: 'Enter a valid cash amount (0 or more)' });
  }

  db.prepare('UPDATE daily_records SET actual_cash_received = ? WHERE id = ?').run(
    actual_cash_received,
    req.params.id
  );

  const difference = Number((actual_cash_received - record.total_expected_revenue).toFixed(2));
  res.json({
    message: 'Cash recorded',
    total_expected_revenue: record.total_expected_revenue,
    actual_cash_received,
    difference,
    match: difference === 0
  });
});

module.exports = router;
