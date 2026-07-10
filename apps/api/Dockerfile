# Build depuis la racine du monorepo :
#   docker build -f apps/api/Dockerfile .

FROM node:24-alpine AS build
RUN apk add --no-cache openssl
RUN npm install -g pnpm@10.32.1
WORKDIR /app

# DATABASE_URL factice : prisma generate n'a pas besoin d'une vraie connexion
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter api

COPY apps/api apps/api
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build
# Dépendances de prod uniquement, dé-symlinkées du store pnpm
RUN pnpm --filter api deploy --legacy --prod /prod/api

FROM node:24-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/api/node_modules ./node_modules
COPY --from=build /prod/api/package.json ./package.json
COPY --from=build /app/apps/api/dist ./dist
EXPOSE 4000
CMD ["node", "dist/src/main.js"]
