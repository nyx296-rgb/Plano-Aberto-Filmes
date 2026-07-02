const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Own profile (any authenticated user)
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, full_name, photo_url, links, role, role_name, bio, show_on_contact, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ users: [user] }); // same shape as admin endpoint so editor reuses openEditor()
});

router.get('/', authenticateToken, (req, res) => {

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const users = db.prepare('SELECT id, username, full_name, photo_url, links, show_on_contact, role, role_name, bio, created_at FROM users').all();
  const maxUsers = db.prepare('SELECT value FROM settings WHERE key = ?').get('max_users');

  res.json({
    users,
    maxUsers: parseInt(maxUsers.value, 10),
    currentCount: users.length
  });
});

// Public profile list (for Contato section)
router.get('/profiles', (req, res) => {
  const users = db.prepare('SELECT id, username, full_name, photo_url, links, role, role_name, bio FROM users WHERE show_on_contact = 1 ORDER BY id ASC').all();
  res.json(users);
});

router.post('/', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { username, password, full_name, role = 'editor', photo_url = '', links = '', show_on_contact = 0, role_name = '', bio = '' } = req.body;

  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'Username, password and full name required' });
  }

  const maxUsers = parseInt(db.prepare('SELECT value FROM settings WHERE key = ?').get('max_users').value, 10);
  const currentCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

  if (currentCount >= maxUsers) {
    return res.status(400).json({ error: `Maximum users (${maxUsers}) reached` });
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  
  try {
    const result = db.prepare('INSERT INTO users (username, full_name, password, role, photo_url, links, show_on_contact, role_name, bio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(username, full_name, hashedPassword, role, photo_url, links, show_on_contact, role_name, bio);
    res.json({ id: result.lastInsertRowid, username, full_name, role });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== Number(req.params.id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { username, full_name, password, role, photo_url, links, show_on_contact, role_name, bio } = req.body;
  const userId = req.params.id;

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newRole = (req.user.role === 'admin' && role) ? role : user.role;
    const linksStr = links !== undefined ? (typeof links === 'string' ? links : JSON.stringify(links)) : user.links;
    const newPhotoUrl = photo_url !== undefined ? photo_url : user.photo_url;

    const newShowOnContact = show_on_contact !== undefined ? show_on_contact : user.show_on_contact;

    const newRoleName = role_name !== undefined ? role_name : user.role_name;
    const newBio = bio !== undefined ? bio : user.bio;

    if (password && password.trim() !== "") {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET username = ?, full_name = ?, password = ?, role = ?, photo_url = ?, links = ?, show_on_contact = ?, role_name = ?, bio = ? WHERE id = ?')
        .run(username || user.username, full_name || user.full_name, hashedPassword, newRole, newPhotoUrl, linksStr, newShowOnContact, newRoleName, newBio, userId);
    } else {
      db.prepare('UPDATE users SET username = ?, full_name = ?, role = ?, photo_url = ?, links = ?, show_on_contact = ?, role_name = ?, bio = ? WHERE id = ?')
        .run(username || user.username, full_name || user.full_name, newRole, newPhotoUrl, linksStr, newShowOnContact, newRoleName, newBio, userId);
    }

    res.json({ message: 'User updated' });
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.put('/max', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { max } = req.body;

  if (!max || typeof max !== 'number' || max < 1) {
    return res.status(400).json({ error: 'Valid max number required' });
  }

  const currentCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  
  if (max < currentCount) {
    return res.status(400).json({ error: `Cannot set max below current user count (${currentCount})` });
  }

  db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(max.toString(), 'max_users');
  res.json({ maxUsers: max });
});

router.delete('/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }

  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.role === 'admin') {
    return res.status(400).json({ error: 'Cannot delete admin users' });
  }

  if (['1', '2', '3'].includes(req.params.id.toString())) {
    return res.status(400).json({ error: 'Não é possível deletar os 3 usuários iniciais do sistema.' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

module.exports = router;