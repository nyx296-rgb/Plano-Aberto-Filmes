const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'database.db');
const mdPath = path.join(__dirname, 'videos_plano_aberto.md');

const months = {
  'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
  'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
  'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
};

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Format: 13/04/2026
  const slashMatch = dateStr.match(/(\d+)\/(\d+)\/(\d+)/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2,'0')}-${slashMatch[1].padStart(2,'0')} 00:00:00`;
  }
  return null;
}

function parseMarkdown(content) {
  // Normalize line endings
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const blocks = content.split(/\n---+\n/).filter(b => b.match(/^##\s+\d+\./m));
  const videos = [];

  blocks.forEach(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l !== '');

    // Title: line starting with ##
    const titleLine = lines.find(l => l.match(/^##\s+\d+\./));
    const title = titleLine ? titleLine.replace(/^##\s+\d+\.\s*/, '').trim() : '';

    // Extract fields
    const dateMatch = block.match(/\*\*Data:\*\*\s*(.+)/);
    const authorMatch = block.match(/\*\*Autor:\*\*\s*(.+)/);
    const ytIdMatch = block.match(/\*\*YouTube ID:\*\*\s*(.+)/);

    const date = dateMatch ? parseDate(dateMatch[1].trim()) : null;
    const author = authorMatch ? authorMatch[1].trim() : 'Samuel Chaves';
    const youtubeId = ytIdMatch ? ytIdMatch[1].trim() : null;
    const videoUrl = youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : '';
    const thumbnailUrl = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '';

    // Description: lines after **Descrição:**
    const descIdx = lines.findIndex(l => l === '**Descrição:**');
    let description = '';
    if (descIdx !== -1) {
      const descLines = lines.slice(descIdx + 1).filter(l => !l.startsWith('**') && l !== '');
      description = descLines.join(' ');
    }

    if (title && videoUrl) {
      videos.push({ title, description, date, author, videoUrl, thumbnailUrl, youtubeId });
    }
  });

  return videos;
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
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  const videos = parseMarkdown(mdContent);

  console.log(`Encontrados ${videos.length} vídeos para importar.\n`);

  let totalVideos = 0;

  videos.forEach(vid => {
    if (!vid.title || !vid.videoUrl) return;

    // Check if already exists
    const exists = db.exec(
      `SELECT id FROM videos WHERE title = '${vid.title.replace(/'/g, "''")}'`
    );
    if (exists[0] && exists[0].values.length > 0) {
      console.log(`⚠️  Já existe: "${vid.title}", pulando...`);
      return;
    }

    db.run(
      `INSERT INTO videos (title, description, video_url, thumbnail_url, author, category, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vid.title,
        vid.description,
        vid.videoUrl,
        vid.thumbnailUrl,
        vid.author,
        'Vídeos',
        'published',
        vid.date || '2026-01-01 00:00:00',
        vid.date || '2026-01-01 00:00:00'
      ]
    );

    const idResult = db.exec('SELECT last_insert_rowid()');
    const videoId = idResult[0].values[0][0];
    totalVideos++;

    console.log(`✅ [${videoId}] "${vid.title}" (${vid.youtubeId})`);
  });

  // Save to disk
  console.log('\nSalvando banco de dados...');
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));

  console.log(`\n📦 Importação concluída!`);
  console.log(`   ${totalVideos} vídeos importados`);
  console.log('\n⚠️  Reinicie o servidor para carregar os dados: node server.js');
}

main().catch(console.error);
