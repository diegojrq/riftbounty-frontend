# Simulador Riftbound MVP

## O que será esta funcionalidade
O Simulador Riftbound MVP será uma experiência jogável dentro do app atual, usando os recursos já existentes de cartas e decks para acelerar entrega.

Escopo do MVP:
- partida 1v1 local no mesmo navegador
- engine de regras simplificada (turno, fases e ações principais)
- seleção de dois decks já existentes no app para iniciar a partida
- interface de mesa com mão, campo, descarte e log curto de ações

Fora do escopo neste MVP:
- matchmaking online
- ranking/ladder
- engine completa com todas as exceções avançadas
- replay persistido e espectador

## Princípios de implementação
- Reaproveitar ao máximo catálogo, busca de cartas, componentes visuais e deck builder atuais.
- Não duplicar CRUD de deck em rotas novas; o jogo consome decks existentes.
- Isolar a engine de jogo da UI para facilitar testes e futura migração para online.
- Definir contrato de ação/estado estável desde o começo.

## Responsabilidades do Frontend
- Criar a camada de domínio do jogo local:
  - tipos de estado/ação/fase
  - reducer/engine pura para aplicar ações válidas
  - gerador de estado inicial com base em dois decks
- Integrar recursos já existentes:
  - usar decks atuais para setup da partida
  - usar busca/catálogo e preview de carta já existentes
  - reaproveitar componentes de imagem/card tile quando possível
- Implementar UX da partida:
  - tela de setup (escolher deck A e deck B)
  - tela de mesa local com zonas de jogo
  - controles por fase e feedback de ação inválida
  - log curto de eventos da partida
- Garantir qualidade:
  - testes unitários da engine
  - validações de fluxo principal do turno

## Responsabilidades do Backend (Nest)
Mesmo sem online no MVP local, o backend precisa preparar base para a próxima etapa:
- Manter endpoints de decks/cartas estáveis para o setup do jogo.
- Definir contrato de tempo real para fase online:
  - `GameAction` serializável
  - `GameState` versionado
  - eventos de partida (snapshot/delta)
- Implementar gateway WebSocket autoritativo na fase online.
- Validar regras no servidor quando online existir (anti-cheat e consistência).
- Persistir estado/sessão de partida online (não obrigatório no MVP local).

## Fronteira Front x Back
- Front no MVP local é autoritativo apenas para simulação offline/local.
- No modo online futuro, backend passa a ser autoritativo e o front vira cliente de renderização + envio de ações.
- O contrato de ações/estado deve ser compartilhado para reduzir retrabalho na migração.

## Entregáveis esperados neste repositório (Front)
- Núcleo `features/simulator/core` com engine simplificada.
- Adapter de deck atual para formato de partida.
- Página de setup e página de partida local.
- Testes da engine cobrindo fluxo básico.

## Critério de sucesso do MVP
- Usuário consegue selecionar 2 decks existentes e jogar uma partida local completa sem quebrar fluxo de turno.
- Interface impede ações inválidas por fase.
- Engine possui testes automatizados para regras básicas acordadas.
