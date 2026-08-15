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

## Complemento: cena animada no desktop

### Entendimento confirmado

- A área institucional à direita deve ganhar vida em telas desktop sem competir com o formulário.
- O painel móvel não reutiliza esta cena; sua animação possui especificação própria e mais leve.
- O movimento deve reforçar a estética industrial técnica da grade, da marca SE7E e do selo de segurança.
- A experiência precisa continuar estática e legível quando `prefers-reduced-motion` estiver ativo.
- Não serão usados canvas, WebGL, partículas, eventos do ponteiro ou dependências adicionais.

### Alternativas consideradas

1. **Camadas CSS e entrada com Framer Motion — escolhida.** Um feixe azul lento cruza a grade; a marca e a frase entram uma vez; o selo recebe um pulso discreto. Usa apenas `transform` e `opacity` e aproveita a configuração de movimento reduzido existente.
2. **Parallax ligado ao ponteiro.** É mais interativo, mas adiciona listeners, atualizações frequentes e movimento que pode distrair durante o login.
3. **Canvas com partículas.** Teria maior impacto visual, porém aumentaria bundle, uso de GPU e manutenção sem melhorar a tarefa principal.

### Decisões

| Decisão | Alternativas | Motivo |
| --- | --- | --- |
| Restringir esta cena a `lg` | Reutilizar o mesmo feixe no celular | Evita transportar a composição larga para um viewport estreito. |
| Usar um feixe de 16 segundos com abertura imediata | Brilho atrasado ou partículas | Mantém a primeira passagem perceptível, porém mais lenta, e espaça os ciclos seguintes. |
| Animar marca e frase somente na entrada | Repetir texto em loop | Garante legibilidade e evita fadiga visual. |
| Pulsar apenas o halo do selo | Mover ícone e texto | Comunica segurança sem prejudicar leitura. |
| Desativar loops com movimento reduzido | Manter animação lenta | Respeita a preferência do sistema e mantém fallback completo. |

### Testes

- A cena decorativa existe somente no painel desktop e permanece fora da árvore acessível.
- Feixe, marca, frase e halo do selo recebem ganchos de animação estáveis.
- As regras CSS usam apenas `transform` e `opacity` e têm fallback explícito para movimento reduzido.

## Complemento: grid técnico vivo no mobile

### Entendimento confirmado

- O login mobile deve ganhar profundidade visual em iPhone e Android sem atrasar ou bloquear a digitação.
- O grid deve começar assim que a página abrir e ser perceptível antes de o usuário informar a senha.
- A cena desktop também deve iniciar imediatamente; não pode depender de um atraso longo para revelar o feixe.
- O movimento será decorativo, ficará fora da árvore acessível e não alterará o layout quando o teclado virtual abrir.
- Não serão usados canvas, vídeo, partículas, listeners ou loops em JavaScript.

### Premissas

- O usuário permanece pouco tempo na tela, então um movimento CSS contínuo e leve tem impacto de bateria aceitável.
- A aplicação continua sendo uma PWA Next.js usada em navegadores de iPhone e Android.
- A autenticação, o conteúdo e os alvos de toque existentes não serão modificados.
- O fallback com `prefers-reduced-motion` mantém o grid estático e revela os elementos imediatamente.

### Alternativas consideradas

1. **Grid técnico vivo — escolhida.** Uma malha sutil se desloca em uma camada maior que o viewport, com máscara que favorece a região da marca e perde força sobre o formulário.
2. **Corte de precisão.** Um traço único revela a marca e desaparece; tem ótimo desempenho, mas oferece menos presença no espaço vazio do mobile.
3. **Pulso no logotipo.** É a alternativa mais leve, porém menos memorável e com menor continuidade visual em relação ao painel desktop.

### Design final

1. O grid mobile aparece nos primeiros 250 ms e inicia o deslocamento no primeiro frame, usando somente `translate3d` e `opacity`.
2. Um brilho difuso percorre a região da marca durante aproximadamente 1,8 segundo e depois reaparece de forma mais discreta no ciclo ambiente.
3. A máscara mantém o grid mais evidente na área livre e atrás da marca, reduzindo sua intensidade sobre campo, ajuda e botão.
4. A camada usa posicionamento absoluto, `pointer-events: none` e dimensões excedentes para não causar reflow, overflow ou saltos com o teclado virtual.
5. No desktop, o feixe começa visualmente em até 100 ms e leva cerca de 4 segundos para atravessar o painel; os ciclos seguintes permanecem mais espaçados.
6. Com movimento reduzido, feixe, brilho e deslocamento deixam de animar, mantendo uma composição estática completa.

### Decisões

| Decisão | Alternativas | Motivo |
| --- | --- | --- |
| Usar grid em movimento no mobile | Corte único ou halo no logo | Preenche o espaço negativo e cria continuidade com a estética técnica do desktop. |
| Começar no primeiro frame | Aguardar a entrada do formulário | Garante que usuários que digitam rapidamente percebam a assinatura visual. |
| Destacar a primeira passagem | Usar um ciclo sempre igual | Torna a abertura perceptível sem manter a mesma intensidade durante todo o login. |
| Animar uma camada excedente com `transform` | Animar `background-position` | Mantém o trabalho no compositor e evita repintura contínua do grid. |
| Mascarar a região do formulário | Aplicar opacidade uniforme | Preserva contraste e concentração na tarefa principal. |

### Testes

- O grid mobile está presente, é decorativo e não recebe eventos de ponteiro.
- A animação mobile não depende de breakpoint desktop e começa sem atraso.
- O primeiro feixe desktop não possui atraso e fica visível no início do ciclo.
- Todas as animações contínuas usam apenas `transform` e `opacity`.
- O fallback de movimento reduzido desativa os loops e mantém a composição legível.
