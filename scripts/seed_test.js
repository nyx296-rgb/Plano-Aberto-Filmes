const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'database.db');

async function seed() {
  const SQL = await initSqlJs();
  let db;
  
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Clear tables
  db.run('DELETE FROM comments');
  db.run('DELETE FROM likes');
  db.run('DELETE FROM articles');
  db.run('DELETE FROM videos');
  
  console.log('Tables cleared');

  // Insert test articles
  const articles = [
    {
      title: 'Teste Artigo 1',
      content: 'Conteúdo de teste para verificar comentários.',
      excerpt: 'Artigo de teste 1',
      image_url: '',
      author: 'Autor Teste',
      category: 'Teste',
      status: 'published'
    },
    {
      title: 'Teste Artigo 2',
      content: 'Outro artigo para testar o sistema.',
      excerpt: 'Artigo de teste 2',
      image_url: '',
      author: 'Autor Teste',
      category: 'Teste',
      status: 'published'
    }
  ];

  articles.forEach(a => {
    db.run('INSERT INTO articles (title, content, excerpt, image_url, author, category, status) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [a.title, a.content, a.excerpt, a.image_url, a.author, a.category, a.status]);
  });
  console.log('Articles inserted');

  // Insert test videos
  const videos = [
    {
      title: 'Video Teste 1',
      description: 'Video de teste para comentários',
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: '',
      author: 'Autor Teste',
      category: 'Teste',
      status: 'published'
    }
  ];

  videos.forEach(v => {
    db.run('INSERT INTO videos (title, description, video_url, thumbnail_url, author, category, status) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [v.title, v.description, v.video_url, v.thumbnail_url, v.author, v.category, v.status]);
  });
  console.log('Videos inserted');

  console.log('Inserted', articles.length, 'articles and', videos.length, 'videos');

  // Save database
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
  
  console.log('Database saved');
  db.close();
}

seed().catch(console.error);
