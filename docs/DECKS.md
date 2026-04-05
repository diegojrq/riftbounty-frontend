# Decks (API ↔ frontend)

## Validação de decks

O backend pode devolver validação em dois formatos paralelos:

1. **`errors` / `warnings`** — strings já traduzidas, de acordo com o header **`Accept-Language`** (`en` ou `pt-BR`, default `pt-BR`). O cliente Next já envia o idioma atual via `apiClient` / proxy.

2. **`issues.errors` / `issues.warnings`** — objetos `{ key, args? }` com chaves alinhadas ao i18n (ex.: `common.decks.validation_main_exact` e `args: { required: 39, current: 0 }`).

### Comportamento no frontend

- Se `errors` / `warnings` tiverem itens, eles são usados (opção A).
- Se vierem vazios mas existir `issues`, o texto é montado com `t(key, args)` nas mensagens sob **`common.decks.*`** em `src/locales/en.json` e `src/locales/pt-BR.json` (opção B).

Helpers: `src/lib/deck-validation.ts` (`rawDeckValidationErrors`, `rawDeckValidationWarnings`, `formatDeckValidationItem`).

---

## Importar deck a partir de texto

### Endpoint (único para os dois formatos)

- **`POST /v1/decks/import`**
- **Body:** `{ "list": string, "name"?: string }`
- **Auth:** `Bearer`
- **`Accept-Language`:** `en` ou `pt-BR` (mensagens de erro)

Não é enviado nenhum flag `format`; o backend infere o formato pelo conteúdo de `list`.

### Como o backend escolhe o formato

| Condição | Formato |
|----------|---------|
| O texto contém **pelo menos um** destes cabeçalhos (linha que **termina com `:`**): `Legend:`, `Champion:`, `MainDeck:`, `Battlefields:`, `Rune Pool:` | **Por seções** (legacy) |
| **Nenhum** desses cabeçalhos aparece **e** existe uma linha **`Sideboard:`** (case-insensitive) | **Compacto** |
| Nenhum dos casos acima | **`400`** com código **`import_list_invalid`** |

**Nota:** `Sideboard:` é usado também no legacy, mas **não** força o modo por seções. No modo compacto, `Sideboard:` é **obrigatório** para delimitar o fim do “miolo” do deck (main + runas + battlefields misturados).

### Formato A — Por seções (export completo)

Cabeçalhos típicos:

- `Legend:`
- `Champion:`
- `MainDeck:`
- `Battlefields:`
- `Rune Pool:`
- `Sideboard:`

Em cada secção: linhas `quantidade nome` (espaço entre número e nome). Legend/Champion: normalmente a primeira linha válida de cada bloco. Main, runas, battlefields e sideboard seguem as regras de soma e ordem acordadas com o backend.

### Formato B — Compacto (lista misturada)

Para listas **sem** `Legend:` / `MainDeck:` / `Rune Pool:` / `Battlefields:` / `Champion:` no texto:

1. **Linha 1** (`qty nome`) → lenda  
2. **Linha 2** → campeão  
3. **Linhas 3 até a linha imediatamente antes de `Sideboard:`** → bloco misto: main + runas + battlefields em qualquer ordem. O backend classifica cada carta pelo catálogo (tipo/tag; runas com fallback se o nome sugerir runa, ex. “Calm Rune”).  
4. **Depois da linha `Sideboard:`** → apenas linhas `qty nome` do sideboard (merge por nome como no formato A).

**Requisitos mínimos (compacto):**

- Presença da linha **`Sideboard:`** no texto (mesmo que não haja linhas depois).  
- **Pelo menos duas** linhas `qty nome` **antes** de `Sideboard:` (lenda + campeão). Só uma linha antes do marcador → **`400 import_list_invalid`**.

### Resolução de nomes (ambos os formatos)

- Match por nome no catálogo.  
- Regra **Tag, Título** quando houver vírgula no nome (ex.: `Irelia, Blade Dancer`).

### Erros comuns

| Código / situação | Significado |
|-------------------|-------------|
| **`import_list_invalid`** | Lista vazia, sem `Sideboard:` no compacto, ou menos de duas linhas antes de `Sideboard:` no compacto, etc. |
| **`import_cards_not_found`** | Um ou mais nomes não batem com o catálogo. O payload pode incluir **`missingCardNames`** (array de strings). |

O frontend (`src/app/decks/page.tsx`) envia `list` + `name` opcional, exibe a mensagem da API e, quando existir, lista `missingCardNames`. Após sucesso, redireciona para o builder (`/decks/:id`), que faz **`GET /v1/decks/:id?validate=true`** para mostrar avisos de construção.

### Referência de código

- Cliente: `importDeck` em `src/lib/decks.ts`  
- UI: `src/app/decks/page.tsx` (secção “Import from list” / “Importar lista”)
