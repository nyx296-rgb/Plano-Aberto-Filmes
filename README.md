# Plano Aberto Filmes

Plano Aberto Filmes é uma plataforma dedicada a análises, notícias e vídeos sobre cinema. Este projeto contém tanto o painel administrativo (CMS) quanto o site público.

## Stack Tecnológica
- **Backend:** Node.js, Express
- **Banco de Dados:** SQLite (via `sql.js`)
- **Frontend:** Vanilla JS, CSS puro
- **Autenticação:** JWT (JSON Web Tokens)

## Como Rodar Localmente

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o servidor:
   ```bash
   npm run dev
   ```

3. Acesse:
   - Site Público: `http://localhost:8080`
   - Painel Admin: `http://localhost:8080/login.html`

## Deploy

O projeto está configurado para ser feito o deploy facilmente em plataformas como Render, Heroku ou VPS.
Certifique-se de configurar a variável de ambiente `PORT` no seu provedor de hospedagem.
O banco de dados SQLite (`db/database.db`) já contém todos os dados de produção atuais.
