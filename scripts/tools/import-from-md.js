const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'database.db');
const mdPath = path.join(__dirname, 'artigos_plano_aberto_20260502_004743.md');

const months = {
  'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
  'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
  'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
};

function parseDate(dateStr) {
  if (!dateStr) return null;
  const regex = /(\d+)\s+de\s+(\w+)\s+de\s+(\d+)/;
  const match = dateStr.match(regex);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = months[match[2].toLowerCase()] || '01';
    const year = match[3];
    return `${year}-${month}-${day} 00:00:00`;
  }
  return null;
}

function parseCommentDate(dateStr) {
  if (!dateStr) return null;
  const regex = /(\d+)\s+de\s+(\w+)\s+de\s+(\d+)\s+às\s+(\d+:\d+)/;
  const match = dateStr.match(regex);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = months[match[2].toLowerCase()] || '01';
    const year = match[3];
    return `${year}-${month}-${day} ${match[4]}:00`;
  }
  return null;
}

function parseMarkdown(content) {
  const blocks = content.split(/\n---+\n/).map(b => b.trim()).filter(b => b.match(/##\s+Artigo\s+\d+/));
  const articles = [];

  blocks.forEach(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l !== '');
    
    // Remove cabeçalho ## Artigo N e URL
    let start = 0;
    if (lines[start] && lines[start].match(/^##\s+Artigo\s+\d+/)) start++;
    if (lines[start] && lines[start].startsWith('**URL:**')) start++;
    if (lines[start] === 'Voltar aos Artigos') start++;

    // Título
    const title = lines[start] ? lines[start] : '';
    start++;

    // Subtítulo ou Data
    let excerpt = '';
    let date = '';
    if (lines[start] && !lines[start].match(/^\d+\s+de\s+/)) {
      excerpt = lines[start];
      start++;
    }
    if (lines[start] && lines[start].match(/^\d+\s+de\s+/)) {
      date = lines[start];
      start++;
    }

    // Corpo do artigo até métricas
    const metricIdx = lines.findIndex(l => l.match(/^\d+\s+curtidas?$/));
    let contentLines = [];
    for (let i = start; i < (metricIdx !== -1 ? metricIdx : lines.length); i++) {
      contentLines.push(lines[i]);
    }
    const contentHtml = contentLines.map(l => `<p>${l}</p>`).join('\n');

    // Métricas
    let likes = 0, views = 0;
    if (metricIdx !== -1) {
      likes = parseInt(lines[metricIdx]) || 0;
      const viewLine = lines.slice(metricIdx, metricIdx + 5).find(l => l.match(/^\d+\s+visualizações?$/));
      if (viewLine) views = parseInt(viewLine) || 0;
    }

    // Comentários
    const comments = [];
    const sendIdx = lines.indexOf('Enviar Comentário');
    if (sendIdx !== -1) {
      let i = sendIdx + 1;
      while (i < lines.length) {
        const author = lines[i];
        const dateLine = lines[i + 1] || '';
        const text = lines[i + 2] || '';
        
        if (!author || !dateLine.includes('às')) break;
        
        comments.push({
          author,
          date: parseCommentDate(dateLine),
          text
        });
        i += 3;
      }
    }

    articles.push({ title, excerpt, date: parseDate(date), content: contentHtml, likes, views, comments });
  });

  return articles;
}

async function main() {
  console.log('Carregando banco de dados...');
  const SQL = await initSqlJs();
  
  if (!fs.existsSync(DB_PATH)) {
    console.error('Banco de dados não encontrado em:', DB_PATH);
    process.exit(1);
  }
  
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);
  
  console.log('Banco carregado. Lendo arquivo Markdown...');
  const mdContent = fs.readFileSync(mdPath, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const articles = parseMarkdown(mdContent);
  
  console.log(`Encontrados ${articles.length} artigos para importar.\n`);
  
  let totalArticles = 0;
  let totalComments = 0;
  let totalLikes = 0;
  let totalViews = 0;
  
  articles.forEach(art => {
    if (!art.title) return;
    
    // Verificar se já existe
    const exists = db.exec(`SELECT id FROM articles WHERE title = '${art.title.replace(/'/g, "''")}'`);
    if (exists[0] && exists[0].values.length > 0) {
      console.log(`⚠️  Já existe: "${art.title}", pulando...`);
      return;
    }
    
    // Inserir artigo
    db.run(
      `INSERT INTO articles (title, excerpt, content, author, category, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [art.title, art.excerpt, art.content, 'Equipe Plano Aberto', 'Artigos', 'published',
       art.date || '2026-03-01 00:00:00', art.date || '2026-03-01 00:00:00']
    );
    
    const idResult = db.exec('SELECT last_insert_rowid()');
    const articleId = idResult[0].values[0][0];
    totalArticles++;
    
    // Inserir views
    for (let i = 0; i < art.views; i++) {
      db.run(
        `INSERT INTO page_views (path, ip_hash, user_agent, timestamp) VALUES (?, ?, ?, ?)`,
        [`/articles/${articleId}`, `imp_view_${i}`, 'ImportScript', art.date || '2026-03-01 00:00:00']
      );
    }
    totalViews += art.views;
    
    // Inserir likes
    for (let i = 0; i < art.likes; i++) {
      try {
        db.run(
          `INSERT INTO likes (content_id, content_type, ip_hash, created_at) VALUES (?, ?, ?, ?)`,
          [articleId, 'article', `imp_like_${articleId}_${i}`, art.date || '2026-03-01 00:00:00']
        );
      } catch(e) { }
    }
    totalLikes += art.likes;
    
    // Inserir comentários
    art.comments.forEach(c => {
      if (!c.text) return;
      db.run(
        `INSERT INTO comments (content_id, content_type, author_name, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [articleId, 'article', c.author, c.text, 'approved', c.date || art.date || '2026-03-01 00:00:00']
      );
      totalComments++;
    });
    
    console.log(`✅ "${art.title}" → ${art.likes} curtidas, ${art.views} views, ${art.comments.length} comentários`);
  });
  
  // Salvar no disco
  console.log('\nSalvando banco de dados...');
  const data = db.export();
  const outBuffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, outBuffer);
  
  console.log(`\n📦 Importação concluída!`);
  console.log(`   ${totalArticles} artigos importados`);
  console.log(`   ${totalComments} comentários`);
  console.log(`   ${totalLikes} curtidas`);
  console.log(`   ${totalViews} visualizações`);
  console.log('\n⚠️  IMPORTANTE: Reinicie o servidor (node server.js) para carregar os dados!');
}

main().catch(console.error);
