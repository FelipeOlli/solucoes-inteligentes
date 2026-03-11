# Build + Runtime (uma etapa para ter Prisma no start)
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build (DATABASE_URL pode ser qualquer path para o build)
ENV DATABASE_URL="file:./dev.db"
RUN npx prisma generate
RUN npm run build

# Pasta para SQLite em produção (volume no EasyPanel)
RUN mkdir -p /app/data

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Criar/migrar DB e subir (DATABASE_URL no EasyPanel: file:/app/data/si.db)
CMD sh -c "npx prisma db push --accept-data-loss 2>/dev/null || true && npm start"
