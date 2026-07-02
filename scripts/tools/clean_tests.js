const db = require('./db/database.js');

setTimeout(() => {
  console.log('Iniciando limpeza de dados de teste...');

  // 1. Apagar vídeos e artigos de teste
  db.prepare('DELETE FROM videos WHERE title LIKE "%teste%"').run();
  db.prepare('DELETE FROM articles WHERE title LIKE "%teste%"').run();

  // 2. Apagar comentários e curtidas órfãos
  db.prepare('DELETE FROM comments WHERE content_type = "article" AND content_id NOT IN (SELECT id FROM articles)').run();
  db.prepare('DELETE FROM comments WHERE content_type = "video" AND content_id NOT IN (SELECT id FROM videos)').run();
  db.prepare('DELETE FROM likes WHERE content_type = "article" AND content_id NOT IN (SELECT id FROM articles)').run();
  db.prepare('DELETE FROM likes WHERE content_type = "video" AND content_id NOT IN (SELECT id FROM videos)').run();

  // 3. Apagar comentários de teste explícitos que podem ter sobrado
  db.prepare('DELETE FROM comments WHERE id IN (35, 36, 37, 38)').run();
  db.prepare('DELETE FROM comments WHERE author_name LIKE "%teste%" OR content LIKE "%teste%"').run();
  
  // 4. Apagar curtidas em comentários que não existem mais
  db.prepare('DELETE FROM comment_likes WHERE comment_id NOT IN (SELECT id FROM comments)').run();

  // 5. Apagar mensagens de contato de teste
  db.prepare('DELETE FROM messages WHERE name LIKE "%teste%" OR subject LIKE "%teste%"').run();

  // 6. Apagar visualizações de páginas de teste (IDs antigos que eram testes)
  db.prepare('DELETE FROM page_views WHERE path LIKE "%teste%"').run();

  console.log('Limpeza concluída com sucesso!');
  process.exit(0);
}, 1500);
