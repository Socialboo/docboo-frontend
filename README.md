# docboo-frontend

Interface web do **Docboo**, o formatador de trabalhos acadêmicos (MVP: ABNT para TCC/monografia). Ela consome a API do [docboo-backend](https://github.com/Socialboo/docboo-backend).

**Stack:**
- React 19 + TypeScript + Vite;
- TanStack Start em **modo SPA** (sem SSR), com Router, Query e Form;
- shadcn (Base UI) + Tailwind 4;
- editor Tiptap 3;
- pdf.js;
- cliente tipado `openapi-fetch`;
- gerenciador de pacotes: **bun**.

## Telas

| Rota | Tela |
| --- | --- |
| `/works` | Lista de trabalhos: criar (escolhendo a norma), abrir e excluir |
| `/works/:id/metadata` | Assistente de capa, folha de rosto e elementos pré-textuais (4 etapas, validação com zod) |
| `/works/:id/editor` | Editor estruturado: árvore de seções/apêndices/anexos; editor Tiptap; painel de propriedades (figura, tabela, citação, nota) e de referências (adicionar, editar, importar BibTeX, citar) |
| `/works/:id/preview` | Pré-visualização aproximada em tempo real e "Gerar PDF real" (pdf.js) |
| `/works/:id/export` | Exportar `.docx`/PDF, acompanhar o status, baixar e corrigir o que falta (com link para a tela certa) |

- O trabalho é salvo automaticamente, com debounce. O cabeçalho mostra o status: salvo, salvando, sem conexão ou conflito.
- Se outra janela salvar antes, a tela oferece **Recarregar** ou **Manter as minhas**.
- Os detalhes estão em [docs/adr/0002-editor-and-autosave.md](docs/adr/0002-editor-and-autosave.md).

## Pré-requisito: a API

O front faz proxy de `/api` para a API do backend, que precisa estar escutando em `localhost:5248`. Ela pode rodar com `docker compose up -d` ou `dotnet run` no repositório do backend. Para usar outro endereço, ajuste `VITE_API_PROXY_TARGET` (no dev) ou `API_UPSTREAM` (no Docker).

## Desenvolvimento nativo

```bash
bun install
```

```bash
bun run dev
```

Abre em http://localhost:3000. O Vite encaminha `/api` para `http://localhost:5248`.

## Docker

```bash
cp .env.example .env
```

Build de produção, com o nginx servindo o SPA em http://localhost:8080:

```bash
docker compose up --build -d
```

Hot reload, com o servidor de desenvolvimento do Vite em http://localhost:3000:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

- O container chega na API do host via `host.docker.internal` (variável `API_UPSTREAM`).
- O nginx usa o template `docker/nginx/default.conf.template`, que o próprio entrypoint da imagem processa com envsubst.
- As imagens usam a tag `latest` (`oven/bun:latest` para build/dev e `nginx:latest` em produção).

## Estrutura

```
src/
├─ api/                 cliente openapi-fetch, tipos gerados e queries do TanStack Query
├─ document-model/      tipos do modelo (do OpenAPI), conversão modelo ↔ Tiptap, seções,
│                       citações, BibTeX e ids, com testes (bun test)
├─ features/
│  ├─ works/            lista e criação de trabalhos
│  ├─ work/             WorkProvider (estado do documento + salvamento automático) e status de salvamento
│  ├─ metadata/         assistente de capa e folha de rosto
│  ├─ editor/           árvore de seções, editor Tiptap, nós próprios, barra de ferramentas e painéis
│  ├─ preview/          pré-visualização aproximada e visualizador de PDF
│  └─ export/           exportação e status dos jobs
├─ auth/                estado de autenticação (usuário local no MVP)
└─ routes/
   ├─ _public/          páginas abertas
   └─ _private/         páginas que exigem usuário (guarda em route.tsx)
```

### Rotas públicas e privadas

As rotas são separadas em dois grupos *pathless*: o nome da pasta não aparece na URL.
- Uma página nova aberta vai em `_public/`.
- Uma página que exige login vai em `_private/` e herda a guarda automaticamente.
- Ainda não há login: `src/auth/auth.ts` expõe um usuário local sempre autenticado, espelhando o usuário local da API. Para adotar autenticação real, basta trocar esse provedor.

## Cliente tipado (OpenAPI → TypeScript)

```bash
bun run gen:api
```

- O comando gera `src/api/schema.gen.d.ts` a partir de `http://localhost:5248/openapi/v1.json`, com a API rodando.
- Para usar outra fonte, defina `OPENAPI_SOURCE` com uma URL ou um caminho de arquivo, por exemplo `../docboo-backend/Backend/openapi/openapi.json`.
- O arquivo gerado fica versionado. **Nunca escreva tipos da API à mão**: até os tipos do modelo de documento vêm daí (`src/document-model/types.ts`).

## Scripts

| Script | O quê |
| --- | --- |
| `bun run dev` | Servidor de desenvolvimento (porta 3000) |
| `bun run build` | Build estático (`dist/client`) |
| `bun test src` / `bun run test` | Testes do modelo de documento (conversão, seções, citações, BibTeX, ids) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | ESLint |
| `bun run gen:api` | Regenera os tipos da API |

## Documentação

[docs/adr](docs/adr): decisões do frontend, entre elas o modo SPA e o editor com salvamento automático.
