const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, 'db', 'database.db');

const junkTitles = [
  'Teste Artigo 1',
  'Teste Artigo 2',
  '# Artigos - Plano Aberto Filmes',
  'O Renascimento do Cinema Independente em 2026',
  'Análise Crítica: Duna - Parte Final',
  'Os 10 Melhores Diretores de Fotografia da Atualidade'
];

initSqlJs().then(SQL => {
  const buf = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buf);

  // Get IDs to remove
  const placeholders = junkTitles.map(() => '?').join(',');
  const toDelete = db.exec(`SELECT id FROM articles WHERE title IN (${placeholders})`, junkTitles);
  
  if (toDelete.length > 0 && toDelete[0].values.length > 0) {
    const ids = toDelete[0].values.map(r => r[0]);
    console.log(`Removendo ${ids.length} artigos de teste...`);
    
    ids.forEach(id => {
      db.run(`DELETE FROM comments WHERE content_id = ? AND content_type = 'article'`, [id]);
      db.run(`DELETE FROM likes WHERE content_id = ? AND content_type = 'article'`, [id]);
      db.run(`DELETE FROM page_views WHERE path = ?`, [`/articles/${id}`]);
      db.run(`DELETE FROM articles WHERE id = ?`, [id]);
    });
  } else {
    console.log('Nenhum artigo de teste encontrado.');
  }

  // Show remaining
  const remaining = db.exec('SELECT id, title FROM articles ORDER BY id');
  console.log('\nArtigos restantes no banco:');
  if (remaining[0]) {
    remaining[0].values.forEach(r => console.log(` ✅ [${r[0]}] ${r[1]}`));
  }

  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  console.log('\nBanco salvo! Reiniciando servidor...');
});
