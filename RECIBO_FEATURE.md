# Feature: Gerador de Recibo

> Adicionar botão "Gerar Recibo" na lista de orçamentos, gerando automaticamente
> um recibo no modelo visual da SE7E, puxando dados do cliente + empresa.

---

## Dados Disponíveis vs. Necessários

| Dado                        | Já existe? | Onde                    |
| --------------------------- | :--------: | ----------------------- |
| Nome da empresa             |     ✅     | `companyData.name`      |
| CNPJ                        |     ✅     | `companyData.cnpj`      |
| Nome do cliente             |     ✅     | `quote.client.name`     |
| Valor total do orçamento    |     ✅     | `quote.total`           |
| Itens/descrição do serviço  |     ✅     | `quote.items[].title`   |
| Logo SE7E                   |     ✅     | `/se7e-logo-v2.png`     |
| **Banco, Agência, Conta**   |     ❌     | Adicionar em `company-data.ts` |
| **Chave PIX**               |     ❌     | Adicionar em `company-data.ts` |
| **Nome do titular da conta** |    ❌     | Adicionar em `company-data.ts` |

---

## Opção A: Recibo direto (mesmo padrão do PDF)

Criar um `ReceiptPreview` igual ao `QuotePreview` — modal fullscreen com preview + botão imprimir.

- Novo arquivo: `src/components/pdf/receipt-preview.tsx`
- Novo botão na coluna de ações (ícone de recibo)
- Dados bancários adicionados ao `company-data.ts`
- CSS de print: mesma técnica `data-*` (`data-receipt-modal`, `data-receipt-content`)
- Descrição do serviço: concatena automaticamente os títulos dos itens

**Pros:**

- Reutiliza 100% da infraestrutura de impressão existente
- O usuário já conhece o fluxo (clicou → viu preview → imprimiu)
- Zero dependências externas
- Implementação rápida

**Contras:**

- Descrição do serviço é automática (sem edição)
- Valor é sempre o total do orçamento (sem parcelas)

**Esforço:** Baixo (2-3 horas)

---

## Opção B: Recibo com campos editáveis (RECOMENDADA)

Igual à Opção A, mas antes de abrir o preview, abre um mini formulário onde o usuário pode:

- Editar a descrição do serviço (pré-preenchida com títulos dos itens)
- Ajustar o valor (caso seja pagamento parcial, entrada, parcela)
- Escolher a data do recibo

**Pros:**

- Flexibilidade total — recibo de entrada, parcela, valor ajustado
- Descrição personalizável (ex: "manutenção de 2 portas de vidro")
- Valor editável permite recibos parciais
- Campos já vêm pré-preenchidos, na maioria dos casos é só confirmar

**Contras:**

- Um passo extra no fluxo (formulário → preview → imprimir)
- Mais complexidade de código

**Esforço:** Médio (4-5 horas)

---

## Opção C: Recibo direto sem preview

Clicou no botão → monta HTML do recibo invisível → dispara `window.print()` direto.

**Pros:**

- Mais rápido para o usuário (1 clique)
- Menos código

**Contras:**

- Sem chance de revisar antes de imprimir
- Se algo estiver errado, desperdiça papel/tempo
- Padrão diferente do fluxo de PDF (inconsistência UX)

**Esforço:** Baixo (1-2 horas)

---

## 💡 Recomendação: Opção B

Na prática, recibos raramente são pelo valor total exato do orçamento.
O cliente pode pagar em parcelas, pode ter desconto extra, pode ser um adiantamento.
Um mini formulário rápido (3 campos: valor, descrição, data) resolve isso sem complicar.

O formulário já viria **pré-preenchido** com os dados do orçamento,
então na maioria dos casos o usuário só confirma e imprime.

---

## Layout Visual do Recibo

O recibo segue o modelo da SE7E com 3 seções:

```
┌─────────────────┬────────────────────────────────┬──────────────────┐
│  (fundo azul)   │                                │  RECIBO R$ XXX   │
│                 │  Empresa: SE7E Alumínio        │                  │
│  VALOR TOTAL:   │  CNPJ: XX.XXX.XXX/XXXX-XX     │                  │
│  R$ XXX,XX      │  Banco: Itaú                   │                  │
│  ─────────────  │  Agência: XXXX                 │                  │
│  CLIENTE:       │  Conta: XXXXX-X                │                  │
│  Nome do cliente│  Chave Pix: XXXXXXXXXXX        │                  │
│                 │  Nome: SE7E ALUMINIO           │                  │
│  Descrição do   │                                │                  │
│  serviço aqui   │  ┌─────────────────────────┐   │   ┌───────────┐ │
│                 │  │ x _____________________ │   │   │  LOGO SE7E│ │
│                 │  │   Nome do responsável   │   │   └───────────┘ │
└─────────────────┴──┴─────────────────────────┴───┴──────────────────┘
```

---

## Arquivos que serão criados/modificados

| Arquivo                                    | Ação     |
| ------------------------------------------ | -------- |
| `src/lib/company-data.ts`                  | Modificar — adicionar dados bancários |
| `src/components/pdf/receipt-preview.tsx`    | Criar — componente do recibo |
| `src/components/pdf/receipt-form.tsx`       | Criar — formulário pré-preenchido (só Opção B) |
| `src/app/globals.css`                      | Modificar — regras print para `data-receipt-*` |
| `src/app/(app)/orcamentos/page.tsx`        | Modificar — adicionar botão + estado |
