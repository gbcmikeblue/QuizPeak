FROM node:22-alpine
WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/i18n/package.json packages/i18n/
COPY admin/package.json admin/
RUN npm install --workspace @quizpeak/admin --workspace @quizpeak/shared --include-workspace-root

COPY tsconfig.base.json ./
COPY packages ./packages
COPY admin ./admin

RUN npm run build -w @quizpeak/shared && npm run build -w @quizpeak/admin

ENV NODE_ENV=production
EXPOSE 3001
WORKDIR /app/admin
CMD ["npx", "next", "start", "-p", "3001"]
