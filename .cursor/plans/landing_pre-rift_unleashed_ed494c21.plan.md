---
name: Landing Pre-Rift Unleashed
overview: "Nova rota estática no Next.js com landing promocional do evento Pre-Rift (Set Unleashed): explicação resumida das regras, carta promocional Ashe, e os 6 decks com listagem completa. Conteúdo principalmente estático no front; imagens das cartas podem usar o catálogo já carregado (`useCards`) com fallback, sem exigir mudanças de backend."
todos:
  - id: data-module
    content: Criar `src/data/unleashed-pre-rift-decks.ts` com os 6 decks + Ashe promo (UNL-169/219)
    status: completed
  - id: page-route
    content: Adicionar `src/app/events/unleashed-pre-rift/page.tsx` com seções hero, formato, promo, grid/accordion dos decks
    status: completed
  - id: card-resolve
    content: "Componente cliente opcional: resolver carta via `useCards` + `getCardImageUrl` com fallback"
    status: completed
  - id: i18n-metadata
    content: Chaves de locale (pt/en) + `metadata` da rota
    status: completed
  - id: verify-build
    content: Rodar `npm run build` e ajustar SSR/client boundaries se necessário
    status: completed
isProject: false
---

# Landing page Pre-Rift Set Unleashed

## Contexto e escopo

- **Objetivo:** página promocional que explica o formato (1 deck mini escolhido + 6 boosters, alinhado ao [artigo Rift Mana](https://riftmana.com/unleashed-pre-rift-event-rules-6-mini-pre-constructed-decks/)) e **lista os 6 pulls** (Legend, Champion, Battlefield, Main Deck) por deck.
- **Promo em todos:** Ashe, Focused — **UNL-169/219** (único `collector_number` explícito que você passou; útil para montar URL de imagem via `[stemFromCollectorNumber](src/lib/cards.ts)` / `getCardImageUrl` mesmo sem `id` de API).
- **Escopo:** só front neste repo. **Backend não é obrigatório** para publicar a página: textos e listas podem ser 100% estáticos (constante TS ou JSON importado).

## Backend / catálogo — quando ajuda e quando não


| Cenário                                                     | Precisa de backend?                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Página com nomes das cartas em listas (acessível, SEO)      | Não                                                                                                                                                                                                                                                                                                             |
| Thumbnails das cartas via CDN como no resto do app          | Opcional: o app já carrega o catálogo em `[CardsProvider](src/app/layout.tsx)` + `[useCards()](src/lib/cards-context.tsx)`. Se as cartas UNL existirem em `GET /cards` com `name` / `image_key` / `collector_number` compatíveis, dá para resolver imagens no cliente com `[getCardImageUrl](src/lib/cards.ts)` |
| Nomes oficiais divergirem do catálogo (apóstrofos, sufixos) | Pode exigir um **mapa manual** `nome exibido → id` ou `collector_number` no front — ainda sem backend novo                                                                                                                                                                                                      |


**Conclusão:** nenhum endpoint novo é necessário. Se no ambiente real o catálogo ainda não tiver Unleashed, as imagens podem cair em fallback (`/images/card-back.webp` já usado em vários fluxos) até o sync existir.

## Estrutura de rota

- Criar rota **estática** em `[src/app/events/unleashed-pre-rift/page.tsx](src/app/events/unleashed-pre-rift/page.tsx)` (ou `src/app/unleashed-pre-rift/page.tsx`). Rotas estáticas têm prioridade sobre `[src/app/[slug]/page.tsx](src/app/[slug]/page.tsx)` (perfis públicos em um segmento); evitar um único segmento genérico tipo `/pre-rift` sem verificar colisão com perfis.
- Exportar `metadata` (title/description) para SEO.

## Dados dos 6 decks

Fonte única de verdade: módulo em algo como `src/data/unleashed-pre-rift-decks.ts` com array de objetos:

- `slug`, `title` (ex.: Ivern, Jhin, Kha'Zix, Diana, Vi, **Master Yi**)
- `legend`, `champion`, `battlefield` (1 carta cada)
- `mainDeck`: array de nomes (12 cartas por deck no material que você enviou)

Incluir bloco separado para **Ashe, Focused** com `collector_number: "UNL-169/219"` para preview garantido se a convenção de stem bater com o R2.

## UI/UX (alinhada ao app)

- Reutilizar padrão visual da home (`[src/app/page.tsx](src/app/page.tsx)`): `bg-gray-900`, gradientes suaves, tipografia clara, `max-w-`* centralizado.
- Seções sugeridas:
  1. **Hero** — título do evento (Set Unleashed / Pre-Rift), subtítulo, link “Regras completas” para o artigo Rift Mana.
  2. **Formato** — bullet curto: escolha 1 dos 6 decks + 6 boosters (texto pode ser i18n ou PT fixo conforme preferência do produto).
  3. **Promo** — destaque Ashe + número da carta.
  4. **Os 6 decks** — grid ou accordion por campeão; em cada um: Legend / Champion / Battlefields / Main Deck em sublistas.
- Componente opcional `PreRiftCardRow`: recebe nome; tenta `cards.find` por nome normalizado; se achar, `<img>` com `getCardImageUrl`; senão, texto só ou card-back.

## i18n

- Opção A: strings em `[src/locales/pt-BR.json](src/locales/pt-BR.json)` + `[src/locales/en.json](src/locales/en.json)` sob chave tipo `events.unleashedPreRift.`* (títulos de seção, CTA, parágrafos fixos). Nomes de cartas podem permanecer nos dados em inglês (como no jogo).
- Opção B: copy só em PT na primeira versão (menos trabalho); documentar no PR.

## Navegação

- Link discreto no `[Header](src/components/layout/Header.tsx)` ou só no rodapé — **só se você quiser** descoberta global; senão a página fica “link direto” / campanha.

## Testes manuais

- `npm run build` — garantir que não há erro de SSR (se usar `useCards`, marcar página `"use client"` ou separar componente cliente para thumbs).
- Verificar uma carta com `collector_number` UNL no catálogo de staging (imagem aparece) e uma sem match (fallback aceitável).

## Resumo dos 6 decks (para implementação)

1. Ivern — Trapping Grounds
2. Jhin — Forgotten Library
3. Kha'Zix — Ripper's Bay
4. Diana — Abandoned Hall
5. Vi — Valley of Idols
6. Master Yi — Gardens of Becoming

Promo: Ashe, Focused (UNL-169/219).