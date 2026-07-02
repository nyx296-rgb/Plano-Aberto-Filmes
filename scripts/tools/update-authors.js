const db = require('../../db/database.js');

setTimeout(() => {
  const stmt = db.prepare('UPDATE articles SET author = ? WHERE title LIKE ?');
  
  // Samuca Chaves
  stmt.run('Samuca Chaves', '%Chuck Norris%');
  stmt.run('Samuca Chaves', '%Uma Linda Mulher%');
  stmt.run('Samuca Chaves', '%Bonequinha de Luxo%');
  stmt.run('Samuca Chaves', '%Cruz de Ferro%');

  // Ricardo de Freitas
  stmt.run('Ricardo de Freitas', '%Face Oculta%');
  stmt.run('Ricardo de Freitas', '%Pistoleiro%');

  console.log("Autores atualizados com sucesso no banco de dados!");
  process.exit(0);
}, 1000);
