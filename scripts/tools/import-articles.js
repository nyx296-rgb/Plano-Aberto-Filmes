const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'db/database.db');
const db = new sqlite3.Database(dbPath);

// Exemplo de artigos de cinema para preencher o site
const sampleArticles = [
  {
    type: 'article',
    title: 'O Renascimento do Cinema Independente em 2026',
    description: 'Como pequenos estúdios estão dominando as premiações e trazendo roteiros originais de volta aos holofotes.',
    content: '<p>Nos últimos anos, temos visto uma mudança clara no comportamento do público. Cansados de sequências intermináveis, os espectadores estão lotando as salas para ver produções originais e independentes.</p><p>Estúdios como A24 e Neon continuam a liderar esse movimento...</p>',
    author: 'Equipe Plano Aberto',
    category: 'Artigos',
    videoUrl: '',
    thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=1000'
  },
  {
    type: 'article',
    title: 'Análise Crítica: Duna - Parte Final',
    description: 'Um mergulho profundo na conclusão épica da saga de ficção científica que redefiniu o gênero nesta década.',
    content: '<p>A conclusão de Duna entrega tudo o que prometeu e mais. Com efeitos visuais deslumbrantes e uma trilha sonora que reverbera na alma, o filme consolida a visão do diretor.</p><p>Destacamos aqui as principais diferenças entre o livro e esta adaptação magistral.</p>',
    author: 'Samuca SC',
    category: 'Críticas',
    videoUrl: '',
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1000'
  },
  {
    type: 'article',
    title: 'Os 10 Melhores Diretores de Fotografia da Atualidade',
    description: 'Uma lista com os profissionais que estão moldando a estética visual do cinema contemporâneo.',
    content: '<p>A direção de fotografia é a alma visual de qualquer obra cinematográfica. Hoje listamos os dez profissionais que têm se destacado pelo uso inovador da luz e cor.</p><p>Entre os citados, temos veteranos e novos talentos que estão chamando a atenção de Hollywood.</p>',
    author: 'Equipe Plano Aberto',
    category: 'Listas',
    videoUrl: '',
    thumbnail: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=1000'
  }
];

db.serialize(() => {
  let inserted = 0;
  const stmt = db.prepare(`
    INSERT INTO content (type, title, description, content, author, category, videoUrl, thumbnail)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  sampleArticles.forEach((article) => {
    stmt.run(
      [
        article.type,
        article.title,
        article.description,
        article.content,
        article.author,
        article.category,
        article.videoUrl,
        article.thumbnail
      ],
      function (err) {
        if (err) {
          console.error('Erro ao importar:', err.message);
        } else {
          inserted++;
          console.log(`Inserido: "${article.title}"`);
        }
        
        if (inserted === sampleArticles.length) {
          console.log('---');
          console.log('Importação concluída com sucesso!');
          db.close();
        }
      }
    );
  });
  
  stmt.finalize();
});
