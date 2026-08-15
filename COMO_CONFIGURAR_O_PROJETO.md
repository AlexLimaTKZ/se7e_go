# Como configurar o projeto

## 1. Turso

Crie um banco em [turso.tech](https://turso.tech), gere uma URL e um token e preencha:

```dotenv
TURSO_DATABASE_URL=libsql://seu-banco.turso.io
TURSO_AUTH_TOKEN=seu-token
```

Com as variáveis carregadas, sincronize o schema:

```bash
npx drizzle-kit push
```

O schema inclui clientes, orçamentos, itens, dimensões, notas e tentativas de login.

## 2. Vercel Blob

Crie um Blob Store no painel da Vercel e preencha:

```dotenv
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

Envie imagens JPEG, PNG, GIF ou WebP pelo painel do Blob ou pela rota autenticada da aplicação. O backend rejeita conteúdo incompatível, SVG e arquivos acima de 10 MB.

## 3. Acesso e sessão

Defina duas credenciais diferentes:

```dotenv
APP_PASSWORD=uma-senha-exclusiva-e-forte
AUTH_SECRET=um-segredo-aleatorio-longo-com-pelo-menos-32-bytes
```

Não há senha padrão. `APP_PASSWORD` autentica o usuário; `AUTH_SECRET` assina os cookies de sessão. Se o segredo for alterado, as sessões existentes são invalidadas.

## 4. Desenvolvimento

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Antes de entregar uma alteração, execute:

```bash
npm test
npm run lint
npm run build
npm audit
```

## 5. Dados e recuperação no iPhone

Enquanto um orçamento é preenchido, o navegador mantém um rascunho versionado no armazenamento local. Ao reabrir a mesma criação/edição no mesmo aparelho, o rascunho é recuperado. Para persistir de forma definitiva e permitir acesso em outros aparelhos, use **Salvar orçamento**.
