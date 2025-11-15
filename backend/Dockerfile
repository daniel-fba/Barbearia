FROM ghcr.io/puppeteer/puppeteer:latest

# Define o diretório de trabalho final no container
WORKDIR /backend

# INSTALAÇÃO DE DEPENDÊNCIAS
COPY backend/package*.json ./
RUN npm install

# CÓPIA DO CÓDIGO FONTE
COPY backend/ .

# PORTA DE EXPOSIÇÃO
EXPOSE 3001

# COMANDO DE INICIALIZAÇÃO
CMD ["npm", "start"]