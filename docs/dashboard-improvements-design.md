# Melhorias do dashboard

## Entendimento confirmado

O dashboard deve continuar com a identidade visual atual da SE7E, mas precisa ser confiável quando a API falhar, acessível por teclado e leitor de tela, confortável em iPhone e Android e útil como ponto de entrada para os orçamentos. A solicitação para corrigir todos os pontos apresentados também inclui o filtro de status na tela de orçamentos, pois os atalhos do dashboard precisam chegar a um resultado já filtrado.

## Premissas

- O projeto continua como aplicação Next.js/React responsiva, sem dependências novas para busca de dados.
- Um orçamento recente abre a edição existente em `/novo?id={id}`.
- Os estados aceitos são `rascunho`, `enviado`, `aprovado`, `recusado` e `concluido`; o valor legado `concluído` continua sendo tratado como concluído.
- Excluir uma anotação permite desfazer por meio de recriação do conteúdo. O novo registro pode receber outro identificador e horário.
- Dados válidos já exibidos não desaparecem durante uma tentativa de atualização que falhe.

## Abordagens avaliadas

1. **Refatoração incremental dos componentes atuais — escolhida.** Mantém o contrato e a arquitetura conhecidos, corrige cada problema de forma isolável e limita o risco sobre alterações já existentes no projeto.
2. **Transformar o dashboard em uma página totalmente renderizada no servidor.** Melhoraria o primeiro carregamento, mas complicaria as ações locais, a repetição de requisição e as anotações sem resolver por si só os problemas de acessibilidade.
3. **Adicionar uma biblioteca de cache/consulta no cliente.** Resolveria repetição e estados remotos, porém adicionaria peso e um novo padrão arquitetural para uma única tela.

## Decisões

- A carga inicial terá esqueleto semântico. Falhas terão alerta, explicação e botão de nova tentativa; uma falha de atualização preservará os dados anteriores.
- O comparativo de receita será derivado dos valores atual e anterior. Quando o mês anterior for zero, a interface dirá que não há base de comparação em vez de mostrar `+100%`.
- O gráfico exibirá o valor exato selecionado, aceitará toque, foco e mouse, terá tabela acessível e estado vazio. A animação usará `scaleY` e opacidade, respeitando movimento reduzido.
- Títulos dos cartões serão `h2`; links e botões terão nomes acessíveis e área mínima de 44 px. O layout terá link para pular ao conteúdo.
- Linhas de status serão links para `/orcamentos?status=...`; a listagem e sua API aceitarão e preservarão esse filtro.
- Orçamentos recentes serão links claros para edição.
- Anotações terão rótulo, horário, mensagens de sucesso/erro e ação para desfazer exclusão.
- Animações serão reduzidas e coordenadas por `MotionConfig reducedMotion="user"`; efeitos redundantes de ruído e desfoque serão removidos.
- A responsividade será verificada em 375, 768, 1024 e 1440 px, com atenção a estouro horizontal e alvos de toque.

## Contratos afetados

- `GET /api/dashboard`: acrescenta `lastMonthRevenue` às métricas; mantém `revenueGrowth` por compatibilidade.
- `GET /api/quotes`: aceita `status` validado; valores inválidos são ignorados.
- `/orcamentos?status=...`: apresenta o filtro ativo, permite trocá-lo ou removê-lo e o envia à API.

## Critérios de validação

- Testes unitários para comparação de receita e normalização de status.
- Testes de componente para gráfico, falha/repetição do dashboard e anotações.
- Testes de navegação/acessibilidade para cabeçalho e atalhos.
- Testes existentes, lint, checagem TypeScript e build de produção.
- Inspeção visual e funcional nos tamanhos responsivos definidos.
