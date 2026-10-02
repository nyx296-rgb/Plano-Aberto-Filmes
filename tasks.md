# Tierlist de Apoiadores e Patrocinadores

## Contexto
Site Plano Aberto Filmes (Node/Express + SQLite). Tema escuro:
fundo #000, cards #141414, destaque vermelho #e50914.
Referência visual: parceiros-apoio-mock.html (na raiz/docs).
Hoje os níveis (Bronze, Silver, Gold, Platinum) existem no cadastro,
mas todos os cards aparecem iguais nas páginas de apoiadores e patrocinadores.

## Regras
- Linguagem simples para respostas e perguntas pra mim
- Sem bibliotecas novas; HTML/CSS/JS puros
- Não alterar o schema nem apagar dados sem me avisar
- Não usar vermelho nos níveis (reservado à identidade do site)
- Um commit por tarefa

## Tarefas
- [ ] 1. Reconhecimento: listar arquivos, rotas, consulta SQL e formato do campo "nível". Só reportar, sem alterar nada
- [ ] 2. Normalizar o nível (trim + minúsculas) e ordenar: Platinum, Gold, Silver, Bronze, depois nome
- [ ] 3. Agrupar por nível e renderizar uma seção por nível (sem seção vazia)
- [ ] 4. CSS: variáveis --bronze #cd7f32, --silver #c0c4cc, --gold #f5c518, --platinum #e8f1ff; classes .tier-* só definem --tier
- [ ] 5. Estilo: Platinum (card grande, avatar 96px, glow, brilho animado), Gold (médio, glow), Silver (menor, descrição de 1 linha), Bronze (compacto, só avatar e nome)
- [ ] 6. Aplicar nas duas páginas públicas, com responsivo e prefers-reduced-motion
- [ ] 7. Painel admin: selo colorido na coluna Nível e <select> com as 4 opções, validando também no servidor
- [ ] 8. Testar localmente e listar o que fazer no servidor (PM2)
