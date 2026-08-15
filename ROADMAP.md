# Estado do projeto e próximos passos

## Implementado

- Next.js 16 App Router com `proxy.ts` para o bloqueio de rotas.
- Sessão HMAC com expiração e rate limit persistido no Turso.
- CRUD transacional de orçamentos, validação no servidor e totais recalculados.
- Numeração protegida contra colisões e duplicação atômica.
- Itens com múltiplas dimensões, descontos, condições e observações.
- Busca paginada e cartões próprios para telas pequenas.
- Dashboard agregado no banco, sem carregar todos os orçamentos em memória.
- Preview de impressão responsivo e acessível.
- PWA Serwist com manifesto, ícones e headers de segurança.
- Formulário móvel com itens recolhíveis, IDs estáveis, alvos de 44 px e autosave local.
- Testes unitários de segurança, validação, estado e rascunhos.

## Melhorias futuras opcionais

- sincronizar rascunhos ainda não salvos entre aparelhos;
- histórico/auditoria das alterações em cada orçamento;
- usuários individuais com papéis e revogação de sessões;
- testes E2E contínuos em WebKit e dispositivos reais;
- anexar automaticamente o PDF no fluxo de compartilhamento quando a plataforma permitir.

Itens futuros não são pré-requisitos para o uso atual.
