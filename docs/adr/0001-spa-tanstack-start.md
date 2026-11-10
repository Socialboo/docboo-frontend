# ADR 0001: TanStack Start em modo SPA

- **Status:** aceito
- **Data:** 2026-11-09

## Contexto
O frontend foi criado com TanStack Start, que é um framework com SSR. O projeto exige uma SPA sem SSR, servida como estáticos.

## Decisão
Manter o TanStack Start com `tanstackStart({ spa: { enabled: true } })`.

- O build pré-renderiza apenas um *shell* (`dist/client/_shell.html`) e os assets.
- O nginx serve `dist/client` com fallback para `/_shell.html` e faz proxy de `/api` para a API.
- Não existe servidor Node em produção. A pasta `dist/server` gerada pelo build é ignorada.
- Os dados são buscados no cliente com TanStack Query e o cliente tipado `openapi-fetch`.

### Hidratação do shell
O shell é pré-renderizado só com a rota raiz, com o outlet vazio. Na hidratação, o cliente já casa a rota (por exemplo, `/`) e renderiza o conteúdo dela, e o React acusa *hydration mismatch* (erro #418).

Foi validado no navegador, com React em modo dev servido via nginx, que `defaultSsr: false` (em `src/start.ts`) **não** resolve sozinho. Remover `setupRouterSsrQueryIntegration` também não.

A correção adotada é a rota raiz renderizar `<ClientOnly><Outlet /></ClientOnly>` (`RootComponent` em `src/routes/__root.tsx`). Com isso, o shell e o primeiro render do cliente ficam idênticos (vazios), e as rotas montam logo após a hidratação. `defaultSsr: false` foi mantido para que loaders de rota nunca rodem durante o prerender.

## Consequências
- O projeto mantém o roteamento por arquivos e as integrações do template, sem custo de SSR.
- Se no futuro houver interesse em SSR, a migração é simples. Por ora, nenhuma `server function` deve ser usada.
