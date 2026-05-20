#!/bin/sh
# Marca como rolled_back qualquer migration com falha para permitir re-execução
echo "UPDATE \"_prisma_migrations\" SET rolled_back_at = NOW() WHERE finished_at IS NULL AND rolled_back_at IS NULL;" | npx prisma db execute --stdin 2>/dev/null || true
