const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('./auth');

const VALID_TIERS_SUPPORTER = ['Gold', 'Silver', 'Bronze'];
const VALID_TIERS_SPONSOR = ['Platinum', 'Gold', 'Silver', 'Bronze'];
const VALID_STATUSES = ['active', 'inactive'];

function sanitize(str, maxLen = 200) {
  return str ? String(str).substring(0, maxLen) : null;
}

// Public: List supporters
router.get('/supporters', (req, res) => {
  const list = db.prepare('SELECT * FROM supporters').all();
  res.json(list);
});

// Public: List sponsors
router.get('/sponsors', (req, res) => {
  const list = db.prepare('SELECT * FROM sponsors').all();
  res.json(list);
});

// Admin: Add supporter
router.post('/supporters', authenticateToken, (req, res) => {
  const { name, photo_url, tier, status, description, instagram, website } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const safeTier = VALID_TIERS_SUPPORTER.includes(tier) ? tier : 'Gold';
  const safeStatus = VALID_STATUSES.includes(status) ? status : 'active';
  db.prepare('INSERT INTO supporters (name, photo_url, tier, status, description, instagram, website) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    sanitize(name), sanitize(photo_url, 500), safeTier, safeStatus,
    sanitize(description, 500), sanitize(instagram), sanitize(website, 500)
  );
  res.json({ success: true });
});

// Admin: Update supporter
router.put('/supporters/:id', authenticateToken, (req, res) => {
  const { name, photo_url, tier, status, description, instagram, website } = req.body;
  const safeTier = VALID_TIERS_SUPPORTER.includes(tier) ? tier : 'Gold';
  const safeStatus = VALID_STATUSES.includes(status) ? status : 'active';
  db.prepare('UPDATE supporters SET name = ?, photo_url = ?, tier = ?, status = ?, description = ?, instagram = ?, website = ? WHERE id = ?').run(
    sanitize(name), sanitize(photo_url, 500), safeTier, safeStatus,
    sanitize(description, 500), sanitize(instagram), sanitize(website, 500), req.params.id
  );
  res.json({ success: true });
});

// Admin: Delete supporter
router.delete('/supporters/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM supporters WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Admin: Add sponsor
router.post('/sponsors', authenticateToken, (req, res) => {
  const { name, logo_url, tier, status, description, instagram, website } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const safeTier = VALID_TIERS_SPONSOR.includes(tier) ? tier : 'Platinum';
  const safeStatus = VALID_STATUSES.includes(status) ? status : 'active';
  db.prepare('INSERT INTO sponsors (name, logo_url, tier, status, description, instagram, website) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    sanitize(name), sanitize(logo_url, 500), safeTier, safeStatus,
    sanitize(description, 500), sanitize(instagram), sanitize(website, 500)
  );
  res.json({ success: true });
});

// Admin: Update sponsor
router.put('/sponsors/:id', authenticateToken, (req, res) => {
  const { name, logo_url, tier, status, description, instagram, website } = req.body;
  const safeTier = VALID_TIERS_SPONSOR.includes(tier) ? tier : 'Platinum';
  const safeStatus = VALID_STATUSES.includes(status) ? status : 'active';
  db.prepare('UPDATE sponsors SET name = ?, logo_url = ?, tier = ?, status = ?, description = ?, instagram = ?, website = ? WHERE id = ?').run(
    sanitize(name), sanitize(logo_url, 500), safeTier, safeStatus,
    sanitize(description, 500), sanitize(instagram), sanitize(website, 500), req.params.id
  );
  res.json({ success: true });
});

// Admin: Delete sponsor
router.delete('/sponsors/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM sponsors WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
