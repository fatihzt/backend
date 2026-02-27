FROM node:22-slim

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    librsvg2-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN NODE_ENV=development npm ci

COPY . .

RUN npx tsc

RUN npm prune --production

EXPOSE 3000

CMD ["node", "dist/server.js"]
