# SE7E — Gerador de Orçamentos

Aplicação Next.js para criar, editar, duplicar, pesquisar e imprimir orçamentos. Os dados ficam no Turso e as imagens de catálogo no Vercel Blob. A interface é PWA e foi otimizada para formulários longos no iPhone.

## Requisitos

- Node.js 20 ou superior
- Banco Turso/libSQL
- Vercel Blob para o catálogo de imagens

## Configuração local

1. Copie `.env.example` para `.env.local`.
2. Preencha `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BLOB_READ_WRITE_TOKEN`, `APP_PASSWORD` e `AUTH_SECRET`.
3. Use uma senha exclusiva em `APP_PASSWORD`. Não existe senha padrão no código.
4. Gere um segredo aleatório longo para `AUTH_SECRET`; ele assina sessões com expiração.
5. Instale e prepare o banco:

```bash
npm install
npx drizzle-kit push
```

6. Inicie em desenvolvimento:

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Verificações

```bash
npm test
npm run lint
npm run build
npm audit
```

## Comportamento móvel

- somente um item do orçamento fica expandido por vez;
- rascunhos são salvos localmente após alterações e no evento `pagehide`;
- valores aceitam vírgula no teclado decimal do iPhone;
- controles principais têm área de toque mínima de 44 px;
- a barra inferior respeita a safe area e sai da frente durante a digitação;
- a gravação definitiva é validada e recalculada no servidor dentro de uma transação.

O rascunho local ajuda na recuperação após interrupções, mas só o botão **Salvar orçamento** grava no Turso.

## Segurança

- sessão assinada por HMAC, com nonce e expiração;
- limitação de tentativas de login persistida no Turso;
- proxy de imagens restrito ao hostname público exato do Vercel Blob, sem encaminhar tokens;
- upload limitado a 10 MB e validado por MIME e assinatura do arquivo;
- cabeçalhos CSP, `nosniff`, política de referência e permissões restritas.

Consulte [COMO_CONFIGURAR_O_PROJETO.md](./COMO_CONFIGURAR_O_PROJETO.md) e [DEPLOY_E_PWA.md](./DEPLOY_E_PWA.md) para a preparação dos serviços e publicação.
