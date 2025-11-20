FROM node:20-alpine AS base

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
