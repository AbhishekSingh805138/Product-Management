const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public: list products
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name, description, price, stock, created_at, updated_at FROM products ORDER BY id DESC');
    res.json({ products: rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// Public: get product by id
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
  try {
    const { rows } = await db.query('SELECT id, name, description, price, stock, created_at, updated_at FROM products WHERE id=$1', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json({ product: rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch product' });
  }
});

// Admin: create product
router.post(
  '/',
  requireAuth,
  requireAdmin,
  body('name').isLength({ min: 1 }).withMessage('Name required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be >= 0'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be >= 0'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, description = '', price, stock } = req.body;
    try {
      const { rows } = await db.query(
        'INSERT INTO products (name, description, price, stock) VALUES ($1, $2, $3, $4) RETURNING id, name, description, price, stock, created_at, updated_at',
        [name, description, price, stock]
      );
      res.status(201).json({ product: rows[0] });
    } catch (err) {
      res.status(500).json({ message: 'Failed to create product' });
    }
  }
);

// Admin: update product
router.put(
  '/:id',
  requireAuth,
  requireAdmin,
  body('name').optional().isLength({ min: 1 }),
  body('price').optional().isFloat({ min: 0 }),
  body('stock').optional().isInt({ min: 0 }),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, description, price, stock } = req.body;
    try {
      // Build dynamic update
      const fields = [];
      const values = [];
      let idx = 1;
      if (name !== undefined) { fields.push(`name=$${idx++}`); values.push(name); }
      if (description !== undefined) { fields.push(`description=$${idx++}`); values.push(description); }
      if (price !== undefined) { fields.push(`price=$${idx++}`); values.push(price); }
      if (stock !== undefined) { fields.push(`stock=$${idx++}`); values.push(stock); }
      fields.push(`updated_at=NOW()`);
      const sql = `UPDATE products SET ${fields.join(', ')} WHERE id=$${idx} RETURNING id, name, description, price, stock, created_at, updated_at`;
      values.push(id);
      const { rows } = await db.query(sql, values);
      if (!rows.length) return res.status(404).json({ message: 'Not found' });
      res.json({ product: rows[0] });
    } catch (err) {
      res.status(500).json({ message: 'Failed to update product' });
    }
  }
);

// Admin: delete product
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
  try {
    const { rowCount } = await db.query('DELETE FROM products WHERE id=$1', [id]);
    if (!rowCount) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

module.exports = router;

