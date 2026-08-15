# Compartilhamento móvel de orçamentos

## Entendimento

- O usuário deve conseguir gerar e compartilhar o orçamento em PDF pelo celular com poucas etapas.
- O fluxo atende iPhone e Android em uma PWA Next.js, com uso principal em telefones e suporte responsivo a tablets e desktop.
- A ação principal é **Compartilhar PDF**; **Baixar PDF**, **Imprimir** e **Abrir WhatsApp** são alternativas visíveis.
- O PDF deve manter os dados, imagens e identidade visual do orçamento atual, inclusive antes de ele ser salvo.
- Orçamentos extensos não devem consumir memória excessiva no telefone.
- Falhas de rede ou incompatibilidade do navegador precisam oferecer recuperação clara, sem perder o orçamento.
- Compartilhar não altera silenciosamente o status do orçamento.

## Premissas e requisitos não funcionais

- A geração de um novo PDF requer conexão; a pré-visualização e a impressão atual continuam disponíveis como fallback local.
- O serviço será usado por uma equipe pequena, mas cada orçamento pode ter até 250 itens e 250 dimensões por item, conforme a validação existente.
- O endpoint continua protegido pela sessão atual e não armazena cópias do PDF.
- Imagens remotas só serão buscadas em origens permitidas, terão limite de tamanho/tempo e serão reduzidas antes de entrar no documento.
- A geração ocorre no servidor para poupar CPU, memória e bateria do celular.
- A interface terá alvos de toque de pelo menos 48 px, rótulos acessíveis e estado de carregamento.

## Alternativas consideradas

1. **PDF vetorial no servidor (escolhida):** documento consistente, arquivo real para compartilhamento e menor custo no aparelho. Exige um endpoint e uma biblioteca de PDF.
2. **Capturar o HTML no navegador:** reaproveita exatamente a prévia, mas rasteriza páginas e imagens no celular; é o maior risco para orçamentos longos.
3. **Manter somente `window.print()`:** menor complexidade, porém não cria um arquivo anexável e mantém o fluxo manual já identificado.

## Design final

1. A prévia envia os dados normalizados para `POST /api/quotes/pdf`.
2. O servidor valida o mesmo contrato usado ao salvar, reduz imagens permitidas e renderiza um PDF A4 paginado.
3. A resposta contém `application/pdf`, `Content-Disposition` e `Cache-Control: no-store`.
4. A interface transforma a resposta em `File` e, quando `navigator.canShare({ files })` aceitar, abre o compartilhamento nativo com texto e arquivo.
5. Sem suporte a arquivos compartilháveis, o mesmo PDF é baixado e a interface explica como anexá-lo; o WhatsApp abre com a mensagem pronta somente por escolha do usuário.
6. A barra da prévia oferece **Compartilhar PDF**, **Baixar**, **Imprimir** e **Fechar**, com progresso, bloqueio contra toque duplo e erros recuperáveis.
7. Cancelar a folha nativa não é tratado como erro. Um compartilhamento concluído oferece a opção explícita de marcar o orçamento como enviado somente em uma evolução futura.

## Decisões

| Decisão | Alternativas | Motivo |
| --- | --- | --- |
| Gerar PDF no servidor | Captura HTML ou impressão | Evita uso pesado de memória em Android/iPhone e entrega um arquivo consistente. |
| Usar o compartilhamento nativo | Abrir diretamente `wa.me` | Permite anexar o PDF e deixa o usuário escolher WhatsApp ou outro destino. |
| Manter três fallbacks visíveis | Falha silenciosa ou ação única | Navegadores e permissões variam; o usuário sempre terá uma saída. |
| Não mudar status automaticamente | Marcar como enviado ao abrir a folha | O navegador não informa com segurança qual destino recebeu o arquivo. |
| Reutilizar a validação de orçamento | Criar contrato paralelo | Reduz divergência entre o que pode ser salvo e o que pode virar PDF. |

## Validação

- Testes unitários para nome de arquivo, texto, detecção de compartilhamento, cancelamento e fallback.
- Teste de geração verificando assinatura `%PDF`, tipo e cabeçalhos.
- Teste manual responsivo em 390 × 844 e Android compacto, incluindo navegador sem compartilhamento de arquivos.
- Verificação de PDF com muitos itens, imagens ausentes e rede indisponível.
