#!/bin/bash

# Script de migração: Copia os arquivos modificados para o site em produção

SOURCE_DIR="/home/mv/Documentos/PAF novo site"
TARGET_DIR="/home/mv/Documentos/Plano Aberto Filmes"

echo "Iniciando migração de Links Dinâmicos para o projeto de Produção..."

if [ ! -d "$TARGET_DIR" ]; then
    echo "Erro: Pasta de destino $TARGET_DIR não encontrada!"
    exit 1
fi

echo "Copiando db/database.js..."
cp "$SOURCE_DIR/db/database.js" "$TARGET_DIR/db/database.js"

echo "Copiando routes/partners.js..."
cp "$SOURCE_DIR/routes/partners.js" "$TARGET_DIR/routes/partners.js"

echo "Copiando public/admin.html..."
cp "$SOURCE_DIR/public/admin.html" "$TARGET_DIR/public/admin.html"

echo "Copiando public/admin-app.js..."
cp "$SOURCE_DIR/public/admin-app.js" "$TARGET_DIR/public/admin-app.js"

echo "Copiando public/patrocinadores.html..."
cp "$SOURCE_DIR/public/patrocinadores.html" "$TARGET_DIR/public/patrocinadores.html"

echo ""
echo "✅ Migração de arquivos concluída com sucesso!"
echo "O banco de dados será atualizado automaticamente (as novas colunas serão criadas) assim que você iniciar o servidor em produção."
echo ""
echo "PRÓXIMOS PASSOS:"
echo "1. Vá até a pasta original do projeto: cd \"$TARGET_DIR\""
echo "2. Reinicie o servidor Node (ex: pm2 restart all ou npm start)"
echo "3. Lembre-se de dar Ctrl+F5 na página de Admin em produção para limpar o cache."
