# Node.js e `npm run dev`

O Next.js 16 pode falhar com **Node.js 25** (processo encerra sem mensagem ou erro de `semver`).

## Usar Node 20 (recomendado)

### Opção 1: Homebrew (macOS)

```bash
# Instalar Node 20
brew install node@20

# Usar Node 20 neste projeto (sessão atual)
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
npm run dev
```

Para deixar Node 20 fixo no terminal, adicione no `~/.zshrc`:

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
```

### Opção 2: nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# Reinicie o terminal, depois:
nvm install 20
nvm use 20
npm run dev
```

O arquivo `.nvmrc` na raiz do projeto já está com `20`; com nvm instalado, `nvm use` usa esse valor.

### Conferir versão

```bash
node -v   # deve ser v20.x.x
npm run dev
```

---

## Se `npm run dev` encerrar sem mensagem

O Next 16 usa **Turbopack** por padrão. Em alguns ambientes o processo pode sair logo após iniciar. Tente usar o Webpack:

```bash
npm run dev:webpack
```

Ou rode o dev normal redirecionando a saída para um arquivo e confira se aparece algum erro:

```bash
npm run dev 2>&1 | tee dev.log
# Se o processo encerrar, veja as últimas linhas:
tail -50 dev.log
```
