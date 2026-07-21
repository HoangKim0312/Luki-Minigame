FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY server ./server
COPY lib ./lib

ENV NODE_ENV=production
EXPOSE 8787

CMD ["npm", "run", "start:server"]
