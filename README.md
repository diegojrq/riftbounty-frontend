# Riftbounty

Frontend do **Riftbounty** — app de cartas para ver, colecionar, trocar e montar decks (companion para Riftbound).

---

## O que é o Riftbounty

Riftbounty é uma **biblioteca de cartas e rastreador de coleção** gratuito para Riftbound. Ajuda jogadores a navegar por todas as cartas, filtrar por nome e domínio (body, calm, chaos, fury, mind, order), rastrear a coleção pessoal com quantidades e ver o que têm e o que falta.

**Funcionalidades atuais:**

- **Biblioteca de cartas** — listagem com busca por nome, filtros por domínio, raridade, tipo, set e atributos; carregamento infinito.
- **Minha coleção** — adicionar/remover cartas, ajustar quantidade; indicador do que você tem e do que falta; opção de coleção pública no perfil (visível para outros, com opção de esconder um número de cópias por carta).
- **Trocas** — ver perfil de outro jogador, escolher cartas que ele tem e você quer, montar proposta e enviar; contraproposta, aceitar ou rejeitar; notificações de trocas pendentes.
- **Decks** — montar decks a partir da coleção: lenda, campeão, deck principal, runas, sideboard e campos de batalha; validação de regras; visualização do deck completo.

O produto é gratuito e não simula nem replica o gameplay de Riftbound. **Planejamentos futuros:** acompanhamento do metagame (decks em alta) e sugestões via IA para decks ou melhorias com base no meta e na coleção do usuário. Não há monetização; a intenção é adicionar um botão de doação para quem quiser ajudar a manter o projeto. **APIs utilizadas (ou planejadas):** catálogo de cartas / API de assets (dados e imagens oficiais). O app é um protótipo; melhorias de filtros, usabilidade e segurança seguem conforme o acesso à API oficial. Riftbounty não é afiliado nem endossado pela Riot Games.

---

## Funcionalidades atuais (resumo)

| Área | Descrição |
|------|-----------|
| **Cartas** | Grid com busca, filtros (domínio, raridade, tipo, set, atributos, energia/poder/vigor), infinite scroll. |
| **Coleção** | Adicionar/remover e ajustar quantidade; grayscale para cartas que não tem; coleção pública opcional no perfil. |
| **Perfil** | Nome, username (slug), endereço opcional; configuração de visibilidade da coleção e "mostrar apenas cópias". |
| **Trocas** | Perfil público com coleção; cesta de troca; enviar proposta; contraproposta; aceitar/rejeitar; notificações. |
| **Decks** | Criar e editar decks (lenda, campeão, main, runas, sideboard, battlefields); validação; visualização. |
| **Auth** | Login e registro; JWT; rotas protegidas. |

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
2. Configure as variáveis de ambiente no painel do projeto (Settings → Environment Variables):
   - **API_URL**: URL base do backend (ex.: `https://api.riftbounty.com/v1`). Usado no servidor e pelo proxy; o browser nunca vê essa URL.
   - **API_KEY**: (se o backend exigir) mesma chave configurada no backend (header `X-API-Key`).
3. Faça o deploy; a Vercel usa `npm run build` e serve o app.

### Troubleshooting – backend na Vercel

- **Testar se o backend está acessível**  
  Abra no navegador: `https://seu-app.vercel.app/api/health`  
  A resposta indica se `API_URL` está definida, se o backend respondeu e qual status (200 = ok; 502 = timeout ou backend inacessível).

- **Onde ver os logs do proxy**  
  No dashboard da Vercel: **Project → Logs** (ou **Deployments → [deploy] → Functions**). Cada requisição que passa pelo proxy (`/api/proxy/...`) gera uma linha `[proxy] GET /cards/... → 200`. Se der erro de conexão, aparece `[proxy] ... → BACKEND_ERROR: ...`.

- **Backend não responde / 502**  
  Confirme que `API_URL` está exatamente como o backend espera (ex.: `https://api.riftbounty.com/v1` com `/v1`). Se o backend exigir `X-API-Key`, defina `API_KEY` nas variáveis de ambiente da Vercel.

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
