# Melhorias da tela de login

## Entendimento

- O login deve continuar simples, com uma única senha administrativa e a identidade visual escura da SE7E.
- O fluxo atende iPhone e Android em uma aplicação Next.js/PWA, além de tablet e desktop.
- A tela precisa permanecer utilizável com teclado virtual, zoom de texto, mensagens longas de bloqueio e preferência por movimento reduzido.
- Depois da autenticação, o usuário deve voltar à rota protegida que tentou abrir, sem aceitar redirecionamentos externos.
- A API pública de login deve rejeitar corpos malformados ou excessivos antes de validar credenciais.

## Premissas e requisitos não funcionais

- Não serão adicionados usuários, recuperação de senha ou autenticação offline.
- O rate limit, o cookie `HttpOnly` e o token de sessão existentes serão preservados.
- Os alvos de toque terão pelo menos 48 px e o campo não abrirá o teclado automaticamente no celular.
- A tela não terá rolagem horizontal em larguras móveis e respeitará as áreas seguras do aparelho.
- Erros serão anunciados por tecnologia assistiva e ocuparão espaço no fluxo, sem sobrepor outros elementos.
- Animações serão curtas e respeitarão a preferência `prefers-reduced-motion`.

## Alternativas consideradas

1. **Página servidor + formulário cliente (escolhida):** o servidor lê e sanitiza `from`; o componente cliente cuida somente da interação. Evita uma fronteira `Suspense` adicional e mantém o valor não confiável fora do roteador.
2. **`useSearchParams` no cliente:** funciona, mas exige `Suspense` para a página estática nesta versão do Next.js e mistura navegação com o formulário.
3. **Ler `window.location` ao enviar:** é menor, porém menos testável e mais fácil de usar incorretamente com URLs externas.

## Design final

1. A página servidor recebe `searchParams`, aceita apenas um caminho interno seguro e entrega `redirectTo` ao formulário cliente.
2. O campo recebe `autocomplete="current-password"`, controles de capitalização/correção e botão acessível para mostrar ou ocultar a senha.
3. O formulário remove o foco automático, amplia o campo e os controles, usa foco visível e reserva uma área para ajuda ou erro.
4. O erro usa `role="alert"`, `aria-live`, `aria-invalid` e `aria-describedby`; o estado de envio usa `aria-busy`.
5. Decorações são limitadas ao viewport, efeitos pesados são reduzidos no telefone e toda a raiz corta overflow horizontal.
6. Contraste e tamanhos dos textos auxiliares são elevados. O selo estático “Online” vira uma indicação verdadeira de “Acesso seguro” e o ano deixa de ser fixo.
7. A API limita o corpo a 1 KiB, trata JSON inválido e aceita somente senha string não vazia com até 256 caracteres.

## Decisões

| Decisão | Alternativas | Motivo |
| --- | --- | --- |
| Sanitizar o destino no servidor | URL direta do cliente | Impede navegação externa/injetada e segue a API assíncrona de `searchParams` do Next.js atual. |
| Manter uma área estável de feedback | Erro posicionado de forma absoluta | Mensagens longas não se sobrepõem ao botão e são lidas por tecnologia assistiva. |
| Não usar `autoFocus` | Focar o campo ao montar | Evita abrir o teclado e deslocar a tela automaticamente em iPhone/Android. |
| Usar `MotionConfig reducedMotion="user"` | Remover toda animação | Preserva a identidade visual sem ignorar a preferência do sistema. |
| Validar o corpo antes da credencial | Desestruturar qualquer JSON | Reduz entradas ambíguas, custo desnecessário e risco de abuso do endpoint público. |

## Validação

- Testes unitários do destino seguro e do contrato de entrada.
- Testes do formulário para autocomplete, alternância de visibilidade, erro acessível e redirecionamento.
- Testes da rota para JSON inválido, tipo incorreto, limite de senha e limite de corpo.
- Testes de projeto (`test`, `lint`, TypeScript e `build`).
- Inspeção responsiva em iPhone compacto, iPhone moderno, tablet e desktop, incluindo ausência de overflow horizontal.
