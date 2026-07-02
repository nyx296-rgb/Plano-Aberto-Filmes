const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'database.db');

const imageMap = [
  { term: 'chuck norris', image: '/imagens_artigos/chuck-norris.jpeg' },
  { term: 'linda mulher', image: '/imagens_artigos/uma-linda-mulher.jpeg' },
  { term: 'face oculta', image: '/imagens_artigos/a-face-oculta.jpg' },
  { term: 'bonequinha', image: '/imagens_artigos/bonequinha-de-luxo.jpeg' },
  { term: 'cruz de ferro', image: '/imagens_artigos/a-cruz-de-ferro.jpeg' },
  { term: 'pistoleiro', image: '/imagens_artigos/o-ultimo-pistoleiro.jpg' }
];

async function main() {
  console.log('Carregando banco de dados...');
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  const articles = db.exec("SELECT id, title FROM articles");
  
  if (articles.length === 0 || articles[0].values.length === 0) {
    console.log('Nenhum artigo encontrado.');
    return;
  }

  let updatedCount = 0;

  articles[0].values.forEach(row => {
    const id = row[0];
    const title = row[1].toLowerCase();
    
    const match = imageMap.find(m => title.includes(m.term));
    if (match) {
      db.run("UPDATE articles SET image_url = ? WHERE id = ?", [match.image, id]);
      console.log(`✅ Imagem atribuída: [${id}] ${title} -> ${match.image}`);
      updatedCount++;
    } else {
      console.log(`⚠️ Nenhuma imagem correspondente para: [${id}] ${title}`);
    }
  });

  if (updatedCount > 0) {
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
    console.log(`\nBanco salvo! ${updatedCount} artigos atualizados.`);
    console.log('⚠️ Reinicie o servidor para aplicar as mudanças (node server.js)');
  }
}

main().catch(console.error);
