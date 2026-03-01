---
name: Riot API submission and compliance
overview: Plano para a submissão do Riftbounty à Riot (descrição do produto no formato deles) e para alinhar o app às regras de uso da API (casos aprovados, proibições e requisitos de design), incluindo onde colocar o aviso legal obrigatório.
todos: []
isProject: false
---

# Plano: Submissão à Riot e conformidade com as regras da API

## 1. Descrição do produto para o formulário da Riot

Use o texto abaixo no campo "Example Product Description" (ajuste o link do app quando tiver URL pública e confirme os nomes exatos das APIs Riftbound no [Developer Portal](https://developer.riotgames.com/docs/riftbound)):

---

**Riftbounty** is a **card library and collection tracker** for Riftbound. It helps players browse all cards, filter by name and domain (body, calm, chaos, fury, mind, order), and track their personal collection with quantities. Players can see which cards they own and which they are missing. Planned features include connecting players for **trading** (wants and haves) and **deckbuilding** from their collections. The product is free to use and does not simulate or replicate Riftbound gameplay.

**Note:** The app is currently a **prototype**. It does not yet display card images, in line with Riot’s guidelines to use only official assets from the API; we are waiting for API key approval to integrate official card art and data. We plan to improve the experience significantly—including filters, usability, and security—once we have access to the API.

**APIs we are using (or plan to use):** card catalog / assets API (for card data and official images).

**Link to the app:** [add your production URL when available]

---

Se a Riot tiver endpoints com nomes específicos (ex.: `cards`, `assets`, `catalog`), troque "card catalog / assets API" pelos nomes oficiais no portal.

---

## 2. Enquadramento nas regras da Riot


| Requisito                                    | Situação do Riftbounty                                                                                                                                                                                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Casos aprovados**                          | Card library + collection tracking (e futuro deckbuilder/trading) se encaixam em "Card libraries" e "Deckbuilders".                                                                                                                                                                                                |
| **Sem simular gameplay**                     | App não implementa regras de jogo nem enforcement automático. OK.                                                                                                                                                                                                                                                  |
| **Sem cliente standalone só para Riftbound** | É um app complementar (biblioteca + coleção), não um cliente de jogo. OK.                                                                                                                                                                                                                                          |
| **Monetização**                              | Hoje sem monetização. Doações opcionais são permitidas (sem pagamentos dentro do app). Se no futuro houver monetização, será preciso: tier gratuito, conteúdo transformativo, sem apostas, sem moedas trocáveis por fiat.                                                                                          |
| **Sem metagame-defining data**               | Não publicar nem reter play rates, win rates ou matchup win % de Riftbound. **Atenção:** o README menciona futuro "consulta ao metagame atual de outras fontes" — isso deve ser apenas referência/link a fontes externas, sem republicar ou armazenar dados que definam metagame (ex.: win rates de decks/cartas). |
| **Sem rank/ladder/leaderboard**              | App não tem sistema de skill, ranking ou ladder. OK.                                                                                                                                                                                                                                                               |


---

## 3. Obrigações de design e funcionalidade

### 3.1 Aviso legal obrigatório (Section 6 / API Terms)

A Riot exige um **disclaimer em local visível e fácil de encontrar**. O texto típico (conforme termos de API) é algo como:

> *"Riftbounty isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc."*

**Ação no app:**  

- Incluir esse texto (ou o texto exato da **Section 6 do Legal Jibber Jabber** atual em [Riot Legal](https://www.riotgames.com/en/legal)) no frontend.  
- Lugares adequados: **footer** de todas as páginas ou página dedicada **"Legal" / "About"** linked no footer.  
- Não insinuar que o app é oficial ou patrocinado pela Riot.

**Arquivos a tocar:**  

- Layout global (ex.: [src/app/layout.tsx](src/app/layout.tsx)) ou um componente de layout que renderize o footer.  
- Se existir header/nav, pode-se adicionar link "Legal" ou "About" que leve a uma página com o disclaimer.

### 3.2 Uso de cartas e assets

- **Texto das cartas:** usar apenas texto oficial em inglês ou tradução oficial da Riot (se disponível via API). Se houver tradução própria, exibir junto com o texto oficial em inglês.  
- **Assets:** usar **apenas** assets de Riftbound fornecidos pela API da Riot. Nada de artes ou imagens de fontes externas/não oficiais para as cartas.  
- **Cartas em preview:** se a API expuser cartas ainda não lançadas em formato oficial, exibir com rótulo claro do tipo "Preview / Unreleased".

Hoje o app usa um backend próprio; quando integrar a API da Riot, o backend deve servir dados e imagens vindos dessa API (ou o front chama a API conforme os termos).

### 3.3 Formatos oficiais e custom

- Se no futuro o app implementar formatos oficiais (ex.: restrições de deckbuilding), **não** alterar regras ou restrições oficiais.  
- Se houver formatos custom (ex.: "kitchen table"), deixar **explícito** que são não oficiais.  
- Não implementar formatos que só funcionem em ambiente digital (ex.: manipulação de zonas ocultas, objetos custom só digitais) de forma que viole as políticas.

### 3.4 Marca e reputação

- Não afirmar ou sugerir que o Riftbounty é endossado ou patrocinado pela Riot.  
- O disclaimer acima (ou o da Section 6) cobre parte disso; manter tom neutro em textos de marketing e na UI.

---

## 4. Checklist de implementação (após aprovação da chave)

1. **Legal**
  - Obter o texto exato da Section 6 do Legal Jibber Jabber atual.  
  - Adicionar disclaimer no footer (ou página Legal/About) e link visível (ex.: "Legal" no footer).
2. **Assets e dados**
  - Garantir que dados e imagens das cartas venham somente da API Riot (ou de cache autorizado).  
  - Remover ou substituir qualquer asset não oficial das cartas.
3. **Metagame**
  - Se houver "consulta ao metagame": só referência/link a terceiros; não publicar nem reter play rates, win rates ou matchup % no app.
4. **Monetização**
  - Se monetizar no futuro: manter tier gratuito, conteúdo transformativo, sem apostas, sem moedas trocáveis por fiat; revisar políticas Riot na época.

---

## 5. Resumo

- **Para enviar agora:** usar a **descrição do produto** da seção 1 no formulário da Riot e preencher o link do app quando existir.  
- **Para manter a chave:** implementar o **disclaimer** em lugar visível, usar só assets/API Riot para cartas e respeitar proibições (metagame data, rank/ladder, simulação de gameplay).  
- **Referências:** [Riot Legal](https://www.riotgames.com/en/legal), [Developer Portal – Riftbound](https://developer.riotgames.com/docs/riftbound), termos e políticas de API no portal.

