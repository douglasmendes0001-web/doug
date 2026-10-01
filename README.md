# Futebol Manager

Jogo de gerenciamento de futebol para celular, no estilo Brasfoot. Você escolhe um clube,
cria o técnico (idade e passado como jogador mudam o jogo) e comanda o time em estaduais,
ligas nacionais, copas, torneios continentais e na Copa do Mundo de Clubes.

## Stack

- **React 19 + TypeScript + Vite**: interface
- **Capacitor 8**: empacota o app para Android
- **IndexedDB (idb-keyval)**: o jogo salvo fica no aparelho (alguns MB)
- **Vitest**: testes do motor

O motor do jogo (`src/engine`) é TypeScript puro, sem React, e é testado de forma isolada.
A interface (`src/ui`) só lê o estado e chama funções do motor.

## Rodando

```bash
npm install
npm run dev        # abre no navegador (use o modo celular do DevTools)
npm test           # testes do motor (temporada completa, regras, partida)
npm run build      # typecheck + build de produção em dist/
```

### Android

```bash
npx cap add android      # só na primeira vez (cria a pasta android/)
npm run android:sync     # build + copia para o projeto Android
npm run android:open     # abre no Android Studio
```

## Estrutura

```
src/engine/
  data/          clubes reais (Brasil e América do Sul), ligas europeias genéricas,
                 formatos de competição, países, nomes, 910 habilidades por posição,
                 estilos de jogador, 12 táticas, marcas de patrocínio
  world.ts       gera clubes e elencos (força aleatória dentro da faixa de cada liga)
  coach.ts       experiência do técnico, prestígio e respeito inicial do elenco
  match.ts       motor minuto a minuto (mando, clima, altitude, substituições)
  competitions.ts pontos corridos, grupos, split, mata-mata com byes, fase suíça
  calendar.ts    distribui as datas sem nenhum clube jogar duas vezes no mesmo dia
  season.ts      ciclo do jogo: preparar/jogar partidas, avançar dias, pós-jogo
  endSeason.ts   campeões, acesso/rebaixamento, vagas continentais, evolução, demissão
  inbox.ts       mensagens da diretoria, torcida organizada, mídia e jogadores
  clubOps.ts     finanças, estádio, CT e ingressos
  transfers.ts   janelas (europeia/sul-americana), contratos, agentes livres, empréstimos
  sponsors.ts    patrocínios (master e base) e investidores, ligados ao desempenho
  youth.ts       categorias de base (15-20 anos) e joias lendárias
  forecast.ts    previsão Monte Carlo (Libertadores, copas e ligas)
  actions.ts     respostas às mensagens (propostas, patrocínio, contratos...)
  editor.ts      modo editor (edição de clubes e jogadores do banco de dados)
  save.ts        3 slots de carreira + banco do editor no IndexedDB
src/ui/          telas no estilo Brasfoot
tests/           testes do motor
scripts/         gerador do banco de habilidades
docs/GAME_DESIGN.md  regras, algoritmos e a pesquisa dos formatos das ligas
```

Detalhes das regras e algoritmos estão em [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md).
