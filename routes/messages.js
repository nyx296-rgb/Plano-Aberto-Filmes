const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('./auth');

// Rate limiting for messages
const messageAttempts = new Map();
const MSG_MAX = 5;
const MSG_WINDOW = 10 * 60 * 1000; // 10 minutes

function checkMessageRate(ip) {
  const now = Date.now();
  const entry = messageAttempts.get(ip);
  if (!entry || now - entry.first > MSG_WINDOW) {
    messageAttempts.set(ip, { count: 1, first: now });
    return false;
  }
  entry.count++;
  return entry.count > MSG_MAX;
}

// Public: Send a message
router.post('/', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  if (checkMessageRate(ip)) {
    return res.status(429).json({ error: 'Muitas mensagens. Aguarde alguns minutos.' });
  }

  const { source, name, email, subject, content } = req.body;
  if (!source || !name || !content) {
    return res.status(400).json({ error: 'Source, Name and Content are required' });
  }

  const safeName = String(name).substring(0, 200);
  const safeEmail = String(email || '').substring(0, 200);
  const safeSubject = String(subject || '').substring(0, 200);
  const safeContent = String(content).substring(0, 5000);
  const safeSource = String(source).substring(0, 200);

  try {
    db.prepare('INSERT INTO messages (source, name, email, subject, content) VALUES (?, ?, ?, ?, ?)')
      .run(safeSource, safeName, safeEmail, safeSubject, safeContent);
    res.json({ success: true, message: 'Mensagem enviada com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

// Admin: List messages
router.get('/', authenticateToken, (req, res) => {
  const messages = db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
  res.json(messages);
});

// Admin: Update status
router.put('/:id', authenticateToken, (req, res) => {
  const { status } = req.body;
  try {
    db.prepare('UPDATE messages SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar mensagem' });
  }
});

// Admin: Delete
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir mensagem' });
  }
});

module.exports = router;
