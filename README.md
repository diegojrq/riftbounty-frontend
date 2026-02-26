# Riftbounty

Frontend do **Riftbounty** — app de cartas para ver, colecionar e (em breve) trocar e montar decks.

---

## O que é o Riftbounty

O Riftbounty é um **app de cartas** em que você pode:

- **Ver as cartas e seus atributos** e filtrar por qualquer critério (nome, set, raridade, domínio, tipo, atributos, etc.).
- **Montar sua coleção**: adicionar qualquer carta à sua coleção e ter um **tracking** do que você tem e do que falta.
- **(Futuro)** **Conectar jogadores**: usuários poderão ter mais de uma cópia da mesma carta, informar o que precisam e o que têm disponível para **troca**, conectando com outros jogadores no mundo.
- **(Futuro)** **Montar decks** a partir das suas coleções, com **sugestões e ajuda via IA** na montagem, incluindo consulta ao metagame atual de outras fontes.

---

## Funcionalidades atuais

| Área | Descrição |
|------|-----------|
| **Listagem** | Grid de cartas com busca por nome, filtro por domínio (body, calm, chaos, fury, mind, order) e carregamento infinito ao rolar. |
| **Coleção** | Adicionar/remover cartas e ajustar quantidade (+ / −). Cartas na coleção em cores; as que não estão aparecem em grayscale na tela “My collection”. |
| **Auth** | Login e registro; rotas protegidas; JWT em `localStorage`. |
| **My collection** | Mesma listagem com filtro por domínio e ordenação por número de colecionador; indicador visual de qual domínio está selecionado. |

---

## Stack

- **Next.js 15** (App Router)
- **React 19** + **TypeScript**
- **Tailwind CSS**
- Autenticação via JWT; chamadas à API com Bearer token

---

## Como rodar

### Pré-requisitos

- Node.js 18+
- Backend da API do Riftbounty rodando (ex.: `http://localhost:3010/v1`)

### Instalação

```bash
npm install
```

### Variáveis de ambiente

Copie o exemplo e preencha a URL da API:

```bash
cp .env.local.example .env.local
```

Em `.env.local`:

```env
# URL base da API (ex.: http://localhost:3010/v1)
NEXT_PUBLIC_API_URL=http://localhost:3010/v1

# Opcional: "true" para logar todas as requisições ao backend no terminal (via /api/proxy)
# NEXT_PUBLIC_USE_API_PROXY=true
```

### Desenvolvimento

```bash
npm run dev
```

O app sobe em **http://localhost:3011**.

### Build e produção

```bash
npm run build
npm start
```

### Deploy na Vercel

1. Conecte o repositório ao [Vercel](https://vercel.com); o framework Next.js é detectado automaticamente.
2. Configure as variáveis de ambiente no painel do projeto:
   - **NEXT_PUBLIC_API_URL**: URL base da API (ex.: `https://sua-api.vercel.app/v1` ou o backend onde estiver rodando).
3. (Opcional) **NEXT_PUBLIC_USE_API_PROXY**: `true` só faz sentido em desenvolvimento com proxy local; em produção deixe sem valor ou `false`.
4. Faça o deploy; a Vercel usa `npm run build` e serve o app.

---

## Estrutura do projeto (resumo)

```
src/
├── app/
│   ├── page.tsx           # Home – listagem de cartas, filtro por domínio, infinite scroll
│   ├── collection/        # My collection – mesma ideia com foco em “o que tenho / não tenho”
│   ├── login/             # Login
│   ├── register/          # Registro
│   └── api/proxy/         # Proxy opcional para chamadas ao backend
├── components/
│   └── cards/
│       └── CardTile.tsx   # Card com imagem, collector number, quantidade e ações (+ / −)
├── lib/
│   ├── api.ts             # Cliente HTTP (GET, POST, PATCH, DELETE) + auth
│   ├── auth.ts            # Helpers de token (localStorage)
│   ├── auth-context.tsx   # Contexto de usuário logado
│   └── collections.ts     # addToCollection, removeFromCollection, updateQuantity
├── types/
│   ├── card.ts            # Card, CardsListResponse, CardsQueryParams
│   └── collection.ts      # CollectionItem, CollectionItemResponse
public/
└── images/                # Ícones dos domínios (body, calm, chaos, fury, mind, order)
```

---

## API esperada (resumo)

- **GET /v1/cards** — listagem com `name`, `domain`, `limit`, `offset`, `sortBy`, `order`; com auth retorna `inCollection` e `collectionQuantity`.
- **POST /v1/collections/me/items** — adicionar carta à coleção.
- **PATCH /v1/collections/me/items/:cardId** — alterar quantidade.
- **DELETE /v1/collections/me/items/:cardId** — remover da coleção.
- Auth via header `Authorization: Bearer <token>`.

---

## Licença

Projeto privado.
