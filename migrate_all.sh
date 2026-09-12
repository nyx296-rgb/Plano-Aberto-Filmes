#!/bin/bash

# Script de migração completo
# Copia TODOS os arquivos modificados ou criados hoje (via Git) para o site em produção.
# Isso garante que a base de dados de produção (database.db) ou uploads não sejam sobrescritos acidentalmente.

SOURCE_DIR="/home/mv/Documentos/PAF novo site"
TARGET_DIR="/home/mv/Documentos/Plano Aberto Filmes"

echo "================================================="
echo "Iniciando migração completa do projeto..."
echo "================================================="

if [ ! -d "$TARGET_DIR" ]; then
    echo "Erro: Pasta de destino $TARGET_DIR não encontrada!"
    exit 1
fi

cd "$SOURCE_DIR" || exit 1

# Pega todos os arquivos modificados (rastreados) e novos (não rastreados)
MODIFIED_FILES=$(git diff --name-only HEAD)
NEW_FILES=$(git ls-files --others --exclude-standard)

ALL_FILES=$(echo -e "$MODIFIED_FILES\n$NEW_FILES" | grep -v 'migrate_social_links.sh' | grep -v 'migrate_all.sh' | grep -v '^$')

if [ -z "$ALL_FILES" ]; then
    echo "Nenhum arquivo modificado encontrado para migrar."
    exit 0
fi

echo "Os seguintes arquivos serão copiados para a produção:"
echo "$ALL_FILES" | sed 's/^/ - /'
echo ""

for FILE in $ALL_FILES; do
    if [ -f "$FILE" ]; then
        # Cria os diretórios no destino se não existirem
        TARGET_PATH="$TARGET_DIR/$FILE"
        TARGET_DIR_FILE=$(dirname "$TARGET_PATH")
        
        mkdir -p "$TARGET_DIR_FILE"
        cp "$FILE" "$TARGET_PATH"
        echo "Copiado: $FILE"
    fi
done

echo ""
echo "✅ Migração completa concluída com sucesso!"
echo "O banco de dados será atualizado automaticamente com as novas colunas quando o servidor reiniciar."
echo ""
echo "PRÓXIMOS PASSOS:"
echo "1. Vá até a pasta original do projeto: cd \"$TARGET_DIR\""
echo "2. Execute 'npm install' (para instalar quaisquer novos pacotes que você adicionou hoje)"
echo "3. Reinicie o servidor Node (ex: pm2 restart all ou npm start)"
echo "4. Dê Ctrl+F5 na página de Admin em produção para limpar o cache."
