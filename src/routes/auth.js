const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/register',
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Min 6 chars password'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;
    const normEmail = String(email).trim().toLowerCase();
    try {
      const { rows: existing } = await db.query('SELECT id FROM users WHERE email=$1', [normEmail]);
      if (existing.length) return res.status(409).json({ message: 'Email already registered' });

      const hash = await bcrypt.hash(password, 10);
      const { rows } = await db.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, is_admin',
        [normEmail, hash]
      );
      const user = rows[0];
      const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, {
        expiresIn: '1d',
      });
      res.status(201).json({ token, user });
    } catch (err) {
      res.status(500).json({ message: 'Registration failed' });
    }
  }
);

router.post(
  '/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;
    const normEmail = String(email).trim().toLowerCase();
    try {
      const { rows } = await db.query('SELECT id, email, password, is_admin FROM users WHERE email=$1', [normEmail]);
      if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });
      const user = rows[0];
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, {
        expiresIn: '1d',
      });
      res.json({ token, user: { id: user.id, email: user.email, is_admin: user.is_admin } });
    } catch (err) {
      res.status(500).json({ message: 'Login failed' });
    }
  }
);

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, email, is_admin FROM users WHERE id=$1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

module.exports = router;
