FROM node:22-alpine
WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/i18n/package.json packages/i18n/
COPY web-pc/package.json web-pc/
RUN npm install --workspace @quizpeak/web-pc --workspace @quizpeak/shared --include-workspace-root

COPY tsconfig.base.json ./
COPY packages ./packages
COPY web-pc ./web-pc

RUN npm run build -w @quizpeak/shared && npm run build -w @quizpeak/web-pc

ENV NODE_ENV=production
EXPOSE 3000
WORKDIR /app/web-pc
CMD ["npx", "next", "start", "-p", "3000"]
