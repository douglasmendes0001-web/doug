# Futebol Visionário: Modo Carreira

Jogo de gerenciamento de futebol para celular, no estilo Brasfoot. Você escolhe um clube,
cria o técnico (idade e passado como jogador mudam o jogo) e comanda o time em estaduais,
ligas nacionais, copas, torneios continentais e na Copa do Mundo de Clubes.

Tem logo próprio na tela inicial, arte de apresentação a cada clube novo, arte de celebração
a cada título (com recados da torcida, da mídia e da diretoria), homenagem de ídolo/lenda do
clube, galeria de títulos e sons gerados na hora (apito, torcida, grito de gol, vaias).

A economia segue os valores reais de 2026 em euro, com câmbio para real e dólar: receitas por liga,
patrocínios proporcionais ao tamanho do clube, valores de mercado até € 358 milhões e salários realistas.
No celular, a escalação é feita por toque no campo e no banco, e o botão voltar do Android navega
dentro do app.

Os clubes das Américas têm prestígio pela história real (títulos mundiais reconhecidos ou não pela
FIFA, títulos internacionais, campanhas e ídolos lendários): craques das 5 grandes ligas europeias só
aceitam clubes de reputação intercontinental ou mundial. A América do Norte tem MLS, Liga MX, liga
canadense, U.S. Open Cup, Canadian Championship, Leagues Cup e Concacaf Champions Cup, com vaga no
Mundial de Clubes.

As estrelas seguem a força (5★ de 60 a 89, 6★ de 90 a 104, 7★ de 105 em diante), o fôlego depende da
idade e da classe, a força evolui semana a semana (jovens que jogam e treinam crescem mais rápido) e a
história do técnico como jogador é sorteada, com 5 chances.

Cartões e lesões seguem as regras atuais: 3 amarelos na mesma competição suspendem por 1 jogo nela,
dois amarelos no jogo viram vermelho (1 jogo) e o vermelho direto dá de 1 a 3 jogos. As lesões têm tipo e
tempo de recuperação, e suspensos ou lesionados saem sozinhos da escalação. São 8 slots de save, as
bandeiras têm as cores e os desenhos reais, e o técnico pode pedir demissão ou se aposentar, com uma arte
da carreira inteira (números, clubes, troféus e grandes momentos) guardada como Hall da Fama.

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

**APK de teste:** a cada push, o GitHub Actions (`.github/workflows/android.yml`) roda os
testes, gera o APK e publica numa *release* de teste (aba **Releases** do repositório,
arquivo `futebol-visionario-<versão>-build<N>.apk`). No celular, baixe e abra o arquivo
(permitindo "instalar apps desconhecidos"). Os APKs usam uma chave de teste fixa
(`android/app/teste.keystore`), então cada build novo instala por cima e mantém os saves.

Localmente (precisa do Android SDK):

```bash
npm run android:sync     # build + copia para o projeto Android
npm run android:open     # abre no Android Studio
cd android && ./gradlew assembleDebug   # gera app/build/outputs/apk/debug/app-debug.apk
```

## Estrutura

```
src/engine/
  data/          clubes reais (Brasil, América do Sul e América do Norte), ligas europeias genéricas,
                 história real dos clubes (historia.ts),
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
  career.ts      história do técnico como jogador, passagens, ídolo/lenda e fila de artes
  economy.ts     moedas, câmbio, receitas por liga, valor de mercado e salários (em euro)
  money.ts       formatação de dinheiro na moeda do clube (R$, €, US$) e conversões
  migrations.ts  conversão de saves antigos
  development.ts evolução semanal (força, estrelas), fôlego e recuperação
  prestige.ts    prestígio internacional dos clubes e a regra dos craques das 5 grandes ligas
  save.ts        3 slots de carreira + banco do editor no IndexedDB
src/ui/          telas no estilo Brasfoot
  sound.ts       sons com Web Audio (sem arquivos de áudio)
  back.ts        botão voltar do Android (pilha de navegação)
  components/Art.tsx  logo, troféus, artes de boas-vindas, título e lenda (SVG)
tests/           testes do motor
scripts/         gerador do banco de habilidades
docs/GAME_DESIGN.md  regras, algoritmos e a pesquisa dos formatos das ligas
```

Detalhes das regras e algoritmos estão em [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md).
