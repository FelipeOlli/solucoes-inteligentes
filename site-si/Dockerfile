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

# Build (DATABASE_URL pode ser qualquer path para o build)
ENV DATABASE_URL="file:./dev.db"
RUN npx prisma generate
RUN npm run build

# Pasta para SQLite em produção (volume no EasyPanel)
RUN mkdir -p /app/data

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Criar/migrar DB, garantir usuário dono (seed se DB vazio) e subir (DATABASE_URL no EasyPanel: file:/app/data/si.db)
# O seed é idempotente: só cria dono@solucoesinteligentes.com se não existir — evita "E-mail ou senha inválidos" após restart
CMD sh -c "npx prisma db push --accept-data-loss 2>/dev/null || true && npx tsx prisma/seed.ts && npm start"
