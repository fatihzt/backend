FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npx tsc

RUN npm prune --production

EXPOSE 3000

CMD ["node", "dist/server.js"]
