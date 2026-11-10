# docboo-frontend

Interface web do **Docboo**, o formatador de trabalhos acadêmicos (MVP: ABNT para TCC/monografia). Ela consome a API do [docboo-backend](https://github.com/Socialboo/docboo-backend).

**Stack:**
- React 19 + TypeScript + Vite;
- TanStack Start em **modo SPA** (sem SSR), com Router, Query e Form;
- shadcn (Base UI) + Tailwind 4;
- cliente tipado `openapi-fetch`;
- gerenciador de pacotes: **bun**.

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

## Rotas

As rotas são baseadas em arquivos (TanStack Router) e separadas em dois grupos *pathless*: o nome da pasta não aparece na URL.

```
src/routes/
├─ __root.tsx               shell HTML + contexto do router (queryClient, auth)
├─ _public/                 páginas abertas
│  ├─ route.tsx             layout público
│  └─ index.tsx             /            (página inicial)
└─ _private/                páginas que exigem usuário autenticado
   ├─ route.tsx             layout privado + guarda (beforeLoad → redirect para /)
   └─ works/index.tsx       /works       (meus trabalhos)
```

- Uma página nova aberta vai em `_public/`. Uma página que exige login vai em `_private/` e herda a guarda automaticamente.
- Ainda não há login: `src/auth/auth.ts` expõe um usuário local sempre autenticado, espelhando o usuário local da API. Para adotar autenticação real, basta trocar esse provedor; a guarda não muda.

## Cliente tipado (OpenAPI → TypeScript)

```bash
bun run gen:api
```

- O comando gera `src/api/schema.gen.d.ts` a partir de `http://localhost:5248/openapi/v1.json`, com a API rodando.
- Para usar outra fonte, defina `OPENAPI_SOURCE` com uma URL ou um caminho de arquivo, por exemplo `../docboo-backend/Backend/openapi/openapi.json`.
- O arquivo gerado fica versionado. **Nunca escreva tipos da API à mão.**

## Scripts

| Script | O quê |
| --- | --- |
| `bun run dev` | Servidor de desenvolvimento (porta 3000) |
| `bun run build` | Build estático (`dist/client`) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | ESLint |
| `bun run gen:api` | Regenera os tipos da API |

## Documentação

[docs/adr](docs/adr): decisões do frontend, como o modo SPA e a hidratação do shell.
