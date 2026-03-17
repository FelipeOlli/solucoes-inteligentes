#!/usr/bin/env node
/**
 * Roda "next dev" e repete stdout/stderr, para ver se algo é impresso antes do processo encerrar.
 * Uso: node scripts/dev-with-log.js
 */
const { spawn } = require('child_process');
const path = require('path');

const nextBin = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
const proc = spawn(process.execPath, [nextBin, 'dev', '--webpack'], {
  cwd: path.join(__dirname, '..'),
  stdio: ['inherit', 'pipe', 'pipe'],
  env: { ...process.env, FORCE_COLOR: '1' },
});

proc.stdout.on('data', (chunk) => process.stdout.write(chunk));
proc.stderr.on('data', (chunk) => process.stderr.write(chunk));
proc.on('error', (err) => {
  console.error('[dev-with-log] Erro ao iniciar:', err);
  process.exit(1);
});
proc.on('exit', (code, signal) => {
  if (code != null && code !== 0) {
    console.error(`[dev-with-log] Processo encerrou com código ${code}${signal ? `, sinal ${signal}` : ''}`);
  }
  process.exit(code ?? 0);
});
