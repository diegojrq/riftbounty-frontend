# Validação de decks (API ↔ frontend)

O backend pode devolver validação em dois formatos paralelos:

1. **`errors` / `warnings`** — strings já traduzidas, de acordo com o header **`Accept-Language`** (`en` ou `pt-BR`, default `pt-BR`). O cliente Next já envia o idioma atual via `apiClient` / proxy.

2. **`issues.errors` / `issues.warnings`** — objetos `{ key, args? }` com chaves alinhadas ao i18n (ex.: `common.decks.validation_main_exact` e `args: { required: 39, current: 0 }`).

### Comportamento no frontend

- Se `errors` / `warnings` tiverem itens, eles são usados (opção A).
- Se vierem vazios mas existir `issues`, o texto é montado com `t(key, args)` nas mensagens sob **`common.decks.*`** em `src/locales/en.json` e `src/locales/pt-BR.json` (opção B).

Helpers: `src/lib/deck-validation.ts` (`rawDeckValidationErrors`, `rawDeckValidationWarnings`, `formatDeckValidationItem`).
