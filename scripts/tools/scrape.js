const puppeteer = require('puppeteer');

(async () => {
  console.log('Iniciando o navegador...');
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Vamos escutar todas as requisições de rede para ver se achamos a API
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/articles') || url.includes('graphql') || response.request().resourceType() === 'fetch' || response.request().resourceType() === 'xhr') {
      try {
        const text = await response.text();
        if (text.includes('title') || text.includes('content') || text.includes('excerpt')) {
            console.log('\n--- POSSÍVEL RESPOSTA DA API (' + url + ') ---');
            console.log(text.substring(0, 500) + '...');
        }
      } catch (e) { }
    }
  });

  console.log('Navegando para a página...');
  await page.goto('https://plano-filmes-zrcbs3tq.manus.space/articles', { waitUntil: 'networkidle2' });
  
  console.log('Esperando por conteúdo (artigos)...');
  await page.waitForTimeout(5000); // Espera 5 segundos para garantir que a página carregue

  console.log('Extraindo artigos do DOM...');
  const articles = await page.evaluate(() => {
    // Tenta encontrar artigos no DOM
    const items = [];
    const elements = document.querySelectorAll('article, .article-card, a'); // Busca tags comuns
    
    elements.forEach(el => {
      const titleEl = el.querySelector('h1, h2, h3, .title');
      const descEl = el.querySelector('p, .description, .excerpt');
      
      if (titleEl && titleEl.innerText.trim()) {
        let isNew = !items.some(i => i.title === titleEl.innerText.trim());
        if(isNew) {
            items.push({
                title: titleEl.innerText.trim(),
                excerpt: descEl ? descEl.innerText.trim() : '',
                link: el.tagName === 'A' ? el.href : (el.querySelector('a') ? el.querySelector('a').href : '')
            });
        }
      }
    });
    return items;
  });

  console.log('\n--- ARTIGOS EXTRAÍDOS ---');
  console.log(JSON.stringify(articles, null, 2));

  await browser.close();
  console.log('\nFinalizado.');
})();
