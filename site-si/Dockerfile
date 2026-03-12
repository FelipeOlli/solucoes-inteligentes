# Build + Runtime (uma etapa para ter Prisma no start)
# Usar imagem baseada em Debian em vez de Alpine para evitar problemas
# de compatibilidade do Prisma com libssl (libssl.so.1.1 em Alpine).
FROM node:20

WORKDIR /app
ARG CACHEBUST=2

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .
# Falhar o build se favicon/logo não estiverem no contexto (ex.: Build path errado no EasyPanel)
RUN test -f public/favicon.svg && test -f public/logo/logo-simbolo-branco.svg || (echo "ERRO: public/favicon.svg ou public/logo/logo-simbolo-branco.svg não encontrados." && exit 1)

# Build (DATABASE_URL só para generate; em produção vem do Environment do EasyPanel)
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Postgres: aplicar migrações, seed (dono + categorias) e subir (DATABASE_URL no EasyPanel: postgresql://...)
CMD sh -c "npx prisma migrate deploy && npx tsx prisma/seed.ts && npm start"
