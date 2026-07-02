const https = require('https');

https.get('https://plano-filmes-zrcbs3tq.manus.space/assets/index-HU-bpUEb.js', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
      // Find indexes of "title:" and print context
      let index = data.indexOf("title:");
      let count = 0;
      while(index !== -1 && count < 10) {
          const start = Math.max(0, index - 50);
          const end = Math.min(data.length, index + 200);
          console.log(`\n--- Match ${count} ---`);
          console.log(data.substring(start, end));
          
          index = data.indexOf("title:", index + 1);
          count++;
      }
  });
});
