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
4. Gere um segredo aleatório independente, com pelo menos 32 bytes, para `AUTH_SECRET`. Ele é obrigatório e é usado apenas para assinar as sessões.
5. Instale as dependências:

```bash
npm install
```

6. Para um banco novo, crie o schema atual:

```bash
npm run db:push
```

7. Inicie em desenvolvimento:

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Atualização de bancos existentes

A versão endurecida armazena valores monetários como **centavos inteiros**, exige número de orçamento único e aplica constraints aos campos críticos.

Antes de publicar esta versão sobre um banco criado pelo schema antigo:

1. faça um backup do banco Turso;
2. aponte `.env.local` para o banco correto;
3. execute a migração idempotente;
4. sincronize o schema Drizzle.

```bash
npm run db:harden
npm run db:push
```

`db:harden` interrompe antes de alterar os dados se encontrar número de orçamento ausente ou duplicado. Não publique a versão nova da aplicação antes de concluir essa migração no banco de produção.

## Verificações

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm audit
```

Ou execute os quatro checks de qualidade de uma vez:

```bash
npm run check
```

O workflow `.github/workflows/ci.yml` executa testes, lint, typecheck e build em pull requests e pushes para `main`.

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
- `AUTH_SECRET` obrigatório e independente de `APP_PASSWORD`;
- IPs bloqueados pelo rate limit são rejeitados antes de qualquer verificação de senha;
- limitação de tentativas de login persistida no Turso;
- proxy de imagens restrito ao hostname público exato do Vercel Blob, sem encaminhar tokens;
- upload limitado a 10 MB e validado por MIME e assinatura do arquivo;
- cabeçalhos CSP, `nosniff`, política de referência e permissões restritas.

Consulte [COMO_CONFIGURAR_O_PROJETO.md](./COMO_CONFIGURAR_O_PROJETO.md) e [DEPLOY_E_PWA.md](./DEPLOY_E_PWA.md) para a preparação dos serviços e publicação.
