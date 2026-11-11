# ADR 0002: Editor estruturado, conversão do modelo e salvamento automático

- **Status:** aceito
- **Data:** 2026-11-11

## Contexto
O documento é um JSON tipado (gerado do OpenAPI do backend), e é ele, não o HTML, que a API valida e o Exporter formata. O editor precisa permitir escrever com conforto sem nunca produzir algo que o modelo não represente.

## Decisão

### Editor por seção
- **Organização da tela:**
  - à esquerda, a árvore de seções (numeração 1, 1.1…, até 5 níveis), apêndices e anexos;
  - no centro, um editor Tiptap **por seção**, recriado ao trocar de seção;
  - à direita, as propriedades do item selecionado e as referências.
- **Títulos:** vêm da árvore, não do editor. Por isso o editor não registra `heading`.
- **Schema do Tiptap espelha o modelo:**
  - `paragraph`, `longQuote`, listas, `figure`, `table` (com título e fonte) e `hardBreak`;
  - inlines `citation` e `footnote`;
  - marcas: negrito, itálico, sublinhado, sobrescrito e subscrito.
  - Link, código, título, citação comum, régua e tachado **não são registrados**. Com isso, um HTML colado é reduzido pelo próprio schema ao que o modelo suporta, e nada sai do editor que a API não aceite.

### Conversão (`src/document-model/tiptap.ts`)
- Funções puras `blocksToTiptap` / `tiptapToBlocks`, testadas com `bun test`. Há um teste de ida e volta sem perda usando o documento "golden" do backend.
- **IDs:** cada bloco guarda o próprio id como atributo. Ao quebrar um parágrafo, o id não é copiado (`keepOnSplit: false`). Antes de salvar, `ensureUniqueIds` troca ids duplicados (copiar/colar) ou inválidos, porque o backend exige ids únicos no documento inteiro.
- **Simplificações do MVP:**
  - o texto de nota de rodapé, legenda e fonte é editado como texto simples;
  - listas aninhadas são achatadas;
  - parágrafos vazios não são exportados.

### Estado e salvamento automático (`WorkProvider`)
- **Uma fonte local:** o documento aberto vive em um único estado local. Toda edição (assistente, editor, referências) é uma transformação imutável `update(doc => …)`.
- **Debounce de 1,2 s:**
  - os salvamentos são serializados;
  - edições feitas durante um salvamento disparam outro em seguida;
  - em falha de rede, tenta de novo após 5 s;
  - antes de exportar, `flush()` garante que a exportação parta da versão salva.
- **Conflito (409):**
  - o salvamento automático para e o aluno escolhe entre **Recarregar** (descarta as alterações desta janela) ou **Manter as minhas** (salva por cima da versão atual, usando o `currentVersion` devolvido pela API);
  - **trade-off:** não há mesclagem campo a campo; a colaboração em tempo real está fora do escopo do MVP.
- **Fechar com pendências:** fechar a aba com alterações não salvas aciona o aviso nativo do navegador.

### Pré-visualização
- **Aproximada:** HTML com o CSS da norma (largura A4, margens, fontes, recuos), sem paginação.
- **Real:** o botão "Gerar PDF real" exporta pela API e mostra o arquivo com pdf.js, carregado sob demanda. É o mesmo arquivo que o aluno baixaria.

## Consequências
- O que o aluno vê no editor é uma aproximação; a formatação definitiva é a da exportação, e a pré-visualização real existe para isso.
- Trocar de seção recria o editor e perde o histórico de desfazer daquela seção. É aceitável no MVP e simplifica a sincronização com o modelo.
