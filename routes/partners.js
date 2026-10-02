const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('./auth');

const VALID_TIERS_SUPPORTER = ['Platinum', 'Gold', 'Silver', 'Bronze'];
const VALID_TIERS_SPONSOR = ['Platinum', 'Gold', 'Silver', 'Bronze'];
const VALID_STATUSES = ['active', 'inactive'];
const TIER_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const CANONICAL_TIER = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

function sanitize(str, maxLen = 200) {
  return str ? String(str).substring(0, maxLen) : null;
}
function normalizeTier(t) {
  return String(t || '').trim().toLowerCase();
}
function canonicalTier(t) {
  const n = normalizeTier(t);
  return CANONICAL_TIER[n] || null;
}
function isValidTier(t, allowed) {
  const n = normalizeTier(t);
  return allowed.map((x) => x.toLowerCase()).includes(n);
}
function sortByTierAndName(list) {
  return [...list].sort((a, b) => {
    const ta = normalizeTier(a.tier);
    const tb = normalizeTier(b.tier);
    const oa = TIER_ORDER[ta] ?? 99;
    const ob = TIER_ORDER[tb] ?? 99;
    if (oa !== ob) return oa - ob;
    return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
  });
}

// Public: List supporters
router.get('/supporters', (req, res) => {
  const list = db.prepare('SELECT * FROM supporters').all();
  res.json(sortByTierAndName(list));
});

// Public: List sponsors
router.get('/sponsors', (req, res) => {
  const list = db.prepare('SELECT * FROM sponsors').all();
  res.json(sortByTierAndName(list));
});

// Admin: Add supporter
router.post('/supporters', authenticateToken, (req, res) => {
  const { name, photo_url, tier, status, description, social_links } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const safeTier = canonicalTier(tier) && isValidTier(tier, VALID_TIERS_SUPPORTER) ? canonicalTier(tier) : 'Gold';
  const safeStatus = VALID_STATUSES.includes(String(status || '').trim().toLowerCase()) ? String(status).trim().toLowerCase() : 'active';
  let socialLinksJson = null;
  if (social_links && Array.isArray(social_links)) {
    socialLinksJson = JSON.stringify(social_links);
  }
  db.prepare('INSERT INTO supporters (name, photo_url, tier, status, description, social_links) VALUES (?, ?, ?, ?, ?, ?)').run(
    sanitize(name), sanitize(photo_url, 500), safeTier, safeStatus,
    sanitize(description, 500), socialLinksJson
  );
  res.json({ success: true });
});

// Admin: Update supporter
router.put('/supporters/:id', authenticateToken, (req, res) => {
  const { name, photo_url, tier, status, description, social_links } = req.body;
  const safeTier = canonicalTier(tier) && isValidTier(tier, VALID_TIERS_SUPPORTER) ? canonicalTier(tier) : 'Gold';
  const safeStatus = VALID_STATUSES.includes(String(status || '').trim().toLowerCase()) ? String(status).trim().toLowerCase() : 'active';
  let socialLinksJson = null;
  if (social_links && Array.isArray(social_links)) {
    socialLinksJson = JSON.stringify(social_links);
  }
  db.prepare('UPDATE supporters SET name = ?, photo_url = ?, tier = ?, status = ?, description = ?, social_links = ? WHERE id = ?').run(
    sanitize(name), sanitize(photo_url, 500), safeTier, safeStatus,
    sanitize(description, 500), socialLinksJson, req.params.id
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
  const { name, logo_url, tier, status, description, instagram, website, social_links } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const safeTier = canonicalTier(tier) && isValidTier(tier, VALID_TIERS_SPONSOR) ? canonicalTier(tier) : 'Platinum';
  const safeStatus = VALID_STATUSES.includes(String(status || '').trim().toLowerCase()) ? String(status).trim().toLowerCase() : 'active';
  
  let socialLinksJson = null;
  if (social_links && Array.isArray(social_links)) {
    socialLinksJson = JSON.stringify(social_links);
  }

  db.prepare('INSERT INTO sponsors (name, logo_url, tier, status, description, instagram, website, social_links) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    sanitize(name), sanitize(logo_url, 500), safeTier, safeStatus,
    sanitize(description, 500), sanitize(instagram), sanitize(website, 500), socialLinksJson
  );
  res.json({ success: true });
});

// Admin: Update sponsor
router.put('/sponsors/:id', authenticateToken, (req, res) => {
  const { name, logo_url, tier, status, description, instagram, website, social_links } = req.body;
  const safeTier = canonicalTier(tier) && isValidTier(tier, VALID_TIERS_SPONSOR) ? canonicalTier(tier) : 'Platinum';
  const safeStatus = VALID_STATUSES.includes(String(status || '').trim().toLowerCase()) ? String(status).trim().toLowerCase() : 'active';
  
  let socialLinksJson = null;
  if (social_links && Array.isArray(social_links)) {
    socialLinksJson = JSON.stringify(social_links);
  }

  db.prepare('UPDATE sponsors SET name = ?, logo_url = ?, tier = ?, status = ?, description = ?, instagram = ?, website = ?, social_links = ? WHERE id = ?').run(
    sanitize(name), sanitize(logo_url, 500), safeTier, safeStatus,
    sanitize(description, 500), sanitize(instagram), sanitize(website, 500), socialLinksJson, req.params.id
  );
  res.json({ success: true });
});

// Admin: Delete sponsor
router.delete('/sponsors/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM sponsors WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
