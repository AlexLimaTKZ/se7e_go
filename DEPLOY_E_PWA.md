# Deploy e PWA

## Arquitetura atual

O projeto usa Next.js 16, Turso/libSQL, Drizzle ORM, Vercel Blob e Serwist. Não depende de Puppeteer, banco em arquivo local nem diretório de uploads persistente. Por isso, a Vercel é compatível com a aplicação atual.

## Publicação na Vercel

1. Envie o repositório para um provedor Git.
2. Importe o projeto na Vercel.
3. Cadastre as variáveis de `.env.example` nos ambientes de produção e preview.
4. Execute `npx drizzle-kit push` apontando para o banco correto antes do primeiro uso.
5. Publique e valide login, criação, edição, duplicação, PDF e imagens.

Nunca publique `.env.local`, tokens do Turso/Blob, `APP_PASSWORD` ou `AUTH_SECRET`.

## PWA

O manifesto, os ícones, o service worker Serwist e os headers de `/sw.js` já estão configurados. Em produção:

- abra a aplicação no Safari do iPhone;
- use **Compartilhar → Adicionar à Tela de Início**;
- confirme que o ícone abre em modo standalone;
- crie um orçamento longo, feche/reabra o app e verifique a recuperação do rascunho;
- depois de um deploy, confirme que a nova versão do service worker é ativada.

O cache PWA não substitui o Turso. Rascunhos ainda não salvos ficam apenas no armazenamento local daquele navegador/aparelho.

## Checklist antes de publicar

```bash
npm ci
npm test
npm run lint
npm run build
npm audit
```

- use HTTPS e uma senha exclusiva;
- use um `AUTH_SECRET` aleatório e diferente da senha;
- confirme que `npm audit` não relata vulnerabilidades;
- teste em um iPhone real e em uma janela móvel de 390 × 844;
- confira os headers CSP e `Cache-Control` de `/sw.js` no ambiente publicado.
