FROM node:18-alpine

WORKDIR /app

# Copia os ficheiros do package.json para tirar proveito da cache do Docker
COPY package*.json ./
RUN npm ci --only=production

# Copia o resto dos ficheiros para dentro da imagem
COPY . .

# Permite que o diretório db seja manipulado ou que os dados sejam postos lá se DATA_DIR não estiver configurado (fallback)
RUN mkdir -p db uploads_tmp public/uploads && chown -R node:node /app

# Usa um utilizador sem privilégios para correr o servidor
USER node

# Porta que o NodeJS vai expor
EXPOSE 8080

CMD ["npm", "start"]
