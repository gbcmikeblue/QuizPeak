FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/i18n/package.json packages/i18n/
COPY server/package.json server/
RUN npm install --workspace @quizpeak/server --workspace @quizpeak/shared --workspace @quizpeak/i18n --include-workspace-root

COPY tsconfig.base.json ./
COPY packages ./packages
COPY server ./server

RUN npm run build -w @quizpeak/shared \
 && npm run build -w @quizpeak/i18n \
 && npx prisma generate --schema server/prisma/schema.prisma \
 && npm run build -w @quizpeak/server

ENV NODE_ENV=production
EXPOSE 8080
CMD ["sh", "-c", "npx prisma migrate deploy --schema server/prisma/schema.prisma && node server/dist/main.js"]
