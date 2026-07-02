const db = require('./db/database');

const sampleArticles = [
  {
    title: 'O Renascimento do Cinema Independente em 2026',
    excerpt: 'Como pequenos estúdios estão dominando as premiações e trazendo roteiros originais de volta aos holofotes.',
    content: '<p>Nos últimos anos, temos visto uma mudança clara no comportamento do público. Cansados de sequências intermináveis, os espectadores estão lotando as salas para ver produções originais e independentes.</p><p>Estúdios como A24 e Neon continuam a liderar esse movimento, provando que o público valoriza narrativas que fogem do comum.</p>',
    author: 'Samuca SC',
    category: 'Artigos',
    image_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=1000',
    status: 'published'
  },
  {
    title: 'Análise Crítica: Duna - Parte Final',
    excerpt: 'Um mergulho profundo na conclusão épica da saga de ficção científica que redefiniu o gênero nesta década.',
    content: '<p>A conclusão de Duna entrega tudo o que prometeu e mais. Com efeitos visuais deslumbrantes e uma trilha sonora que reverbera na alma, o filme consolida a visão do diretor.</p><p>Destacamos aqui as principais diferenças entre o livro e esta adaptação magistral, e como Denis Villeneuve conseguiu traduzir a complexidade de Arrakis para a tela.</p>',
    author: 'Equipe Plano Aberto',
    category: 'Críticas',
    image_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1000',
    status: 'published'
  },
  {
    title: 'Os 10 Melhores Diretores de Fotografia da Atualidade',
    excerpt: 'Uma lista com os profissionais que estão moldando a estética visual do cinema contemporâneo.',
    content: '<p>A direção de fotografia é a alma visual de qualquer obra cinematográfica. Hoje listamos os dez profissionais que têm se destacado pelo uso inovador da luz e cor.</p><p>Entre os citados, temos veteranos e novos talentos que estão chamando a atenção de Hollywood, como Roger Deakins e Hoyte van Hoytema.</p>',
    author: 'Equipe Plano Aberto',
    category: 'Listas',
    image_url: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=1000',
    status: 'published'
  }
];

setTimeout(() => {
  console.log('Iniciando importação de artigos fictícios...');
  let inserted = 0;
  
  const stmt = db.prepare(`
    INSERT INTO articles (title, excerpt, content, author, category, image_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  sampleArticles.forEach((article) => {
    try {
      stmt.run(
        article.title,
        article.excerpt,
        article.content,
        article.author,
        article.category,
        article.image_url,
        article.status
      );
      inserted++;
      console.log(`Inserido: "${article.title}"`);
    } catch (err) {
      console.error('Erro ao inserir:', err.message);
    }
  });

  console.log(`\nImportação concluída: ${inserted} artigos adicionados.`);
  process.exit(0);
}, 2000); // Wait 2s for DB to init
