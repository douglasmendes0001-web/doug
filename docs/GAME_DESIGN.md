# Game design: regras e algoritmos

## Menu inicial

- **Continuar**: abre a carreira salva mais recentemente.
- **Novo jogo** em 3 passos:
  1. Técnico: nome, idade (o aviso de que a idade influencia o jogo aparece na hora), nacionalidade e, a partir de 30 anos, o passado como jogador.
  2. Time: país, liga e clube, com a opção de usar o banco do editor.
  3. Configurações: duração dos tempos, formato do Mundial e slot de save.
- **Carregar jogo**: 3 slots de carreira, com opção de apagar.
- **Modo editor**: banco de dados editável e salvo no aparelho, usado nas próximas carreiras. Permite:
  - editar clubes: nome, sigla, cores, estádio, CT, base e caixa;
  - editar jogadores: nome, posição, nacionalidade, idade, força, potencial, estrelas, estilo de jogo e
    habilidades, escolhidas entre as 130 da posição, com limite pelas estrelas;
  - criar jogadores novos, que começam com **15 anos**, e excluir jogadores.

  O editor não altera carreiras já salvas, e o botão "Restaurar banco original" desfaz todas as edições.

## Técnico

- Idade de **20 a 75 anos**. A tela de criação avisa que a idade influencia o jogo.
- Com **30 anos ou mais** o usuário escolhe se o técnico foi jogador. Se foi, escolhe se
  **passou por vários clubes** ou **ficou em um só**, e se **teve carreira de títulos**.
- Nacionalidade: jogadores compatriotas começam com +5 de respeito.
- Experiência inicial (0–100): `(idade − 20) × 1,6` (máx. 50) + ex-jogador 10 + vários clubes 6 /
  um clube 3 + títulos 12. Um técnico de 20 anos começa com 0.
- A experiência cresce a cada jogo (+0,12, +0,06 extra por vitória), por título (+3) e por temporada (+2).

### Efeitos da experiência

- **Rendimento do time:** multiplicador `0,96 + 0,08 × exp/100`.
- **Substituições:** o impacto de quem entra tem uma parcela aleatória com desvio
  `0,25 × (1,2 − exp/100)`, ou seja, técnico novato tem trocas menos previsíveis.
- **Respeito inicial do elenco:** veteranos mais velhos que o técnico desconfiam
  (penalidade de até 32 pontos pela diferença de idade, reduzida pelo prestígio). Jovens se
  identificam com técnico jovem.

## Respeito (relação jogador × técnico)

Cada jogador do seu elenco tem `respeito` (0–100), que afeta o rendimento em campo
(`0,9 + 0,2 × respeito/100`) e o impacto quando entra no jogo.

| Evento | Efeito |
|---|---|
| Vitória | +2 (veteranos +1,5) |
| Derrota | −0,5 (veteranos −1,5) |
| Jogou a partida | +0,5 |
| Veterano destaque no banco por 2+ jogos | −3 por jogo |
| Promessa de chance cumprida / quebrada | +8 / −15 |
| Veterano substituído antes dos 70' por técnico 6+ anos mais novo | −3 ("sai reclamando") |
| Título | +10 para todos |
| Conversa em particular (resposta a mensagem) | +12 ou −4, chance depende do prestígio |

## Partida (motor minuto a minuto)

Rendimento de cada jogador:
`força × fôlego × respeito × ritmo de jogo × adequação à posição × fatores do time × impacto da substituição`.

- **Fatores do time:** mando de campo (`1,045 + 0,05 × torcida`, zero em campo neutro), clima,
  altitude (`−2,5%` por km de diferença acima de 1.000 m) e experiência do técnico.
- **Setores:** defesa, meio e ataque somam a contribuição de cada posição. O meio decide a posse, e
  ataque × defesa decidem a chance de criar lances. Atacante × goleiro decide o gol.
- **Fôlego:** desgaste por minuto × clima × altitude × idade × preparo físico. Na altitude o
  desgaste aumenta ainda mais no 2º tempo.
- **Clima** (por país, mês e altitude da sede):
  - calor: mais desgaste, pior para times de clima frio;
  - frio: menos desgaste, mais lesões, pior para times tropicais;
  - chuva: jogo mais imprevisível e mais faltas.
- **Substituições:** 5 por jogo. O impacto de quem entra (−1 a +1) vem do ritmo de jogo, do treino,
  do respeito, de ter pedido para jogar e da aleatoriedade ligada à experiência do técnico. Ele altera o
  rendimento do jogador em até ±12%.
- **Mata-mata:** placar agregado e pênaltis quando necessário.
- **Duração real:** cada tempo dura 15 s, 30 s ou 1 min, conforme a configuração.

Validação (testes): com elencos idênticos, o mandante vence ~41% e o visitante ~31%.
Em La Paz (3.640 m) contra um time do nível do mar, o mandante vence ~52% e o visitante termina com
~15 pontos a menos de fôlego. Média de ~2,6 gols por jogo.

## Caixas de mensagens

- **Diretoria:** objetivo da temporada, alertas quando a confiança cai (40%, 20%), elogios, propostas
  pelos seus jogadores (aceitar/recusar), obras concluídas, demissão.
- **Torcida organizada:** reage a goleadas, sequências de vitórias, jejuns, eliminações e títulos.
- **Mídia:** zebras, vexames, artilheiros, crise e a narrativa do técnico jovem.
- **Jogadores:** pedem para jogar, pedem descanso ou reclamam do técnico, e cada mensagem traz
  ações de resposta.

A confiança muda após cada jogo pela diferença entre os pontos obtidos e os esperados (força dos
elencos + mando). Com confiança da diretoria ≤ 5% (após 6 jogos) o técnico é demitido e recebe
propostas de outros clubes.

## Força dos elencos

| Liga | Faixa de força média |
|---|---|
| Brasil — Série A / B / C / D | 40–60 / 20–40 / 12–28 / 5–18 |
| Argentina — LPF / Primera Nacional | 37–57 / 18–36 |
| Chile e Colômbia — 1ª / 2ª | 30–50 / 14–30 |
| Equador — 1ª / 2ª (com altitude) | 29–49 / 13–28 |
| Bolívia — 1ª / 2ª (com altitude) | 24–42 / 10–24 |
| Inglaterra, Espanha, Alemanha, Itália, França (1ª) | 70–120 |
| Portugal, Holanda, Turquia, Escócia, Grécia (1ª) | 60–95 |

As faixas ficam em `src/engine/data/ligas.ts`. A força de cada jogador é sorteada em torno da força do
clube.

## Formatos pesquisados (2026)

| Competição | Formato real | No jogo |
|---|---|---|
| Brasileirão Série A/B | 20 clubes, pontos corridos, 4 sobem/caem | igual |
| Série C | 20 clubes, turno único + quadrangulares, 2 caem em 2026 (24 clubes em 2027) | igual, mas com 4 trocas para manter o tamanho |
| Série D | **96 clubes**, 16 grupos de 6, mata-mata ida e volta | igual; os 4 semifinalistas sobem |
| Copa do Brasil | **126 clubes**, 9 fases, final única | 128 clubes, jogo único até a 3ª fase, depois ida e volta, final única |
| Estaduais | variados | um por estado (Paulista com 16; demais até 12) |
| Liga Profesional (ARG) | 30 clubes em 2 zonas de 15, Apertura e Clausura com playoffs; 2 rebaixados | igual; rebaixamento pela tabela anual |
| Liga de Primera (CHI) | 16 clubes, 30 rodadas, 2 caem | igual |
| Liga BetPlay (COL) | 20 clubes; Apertura com playoffs, Finalización com cuadrangulares; descenso por média | igual; rebaixamento pela soma do ano |
| LigaPro (ECU) | 16 clubes, 30 rodadas + hexagonal do título | igual |
| División Profesional (BOL) | 16 clubes, 30 rodadas; último cai, penúltimo joga série | 1 rebaixado |
| Libertadores / Sul-Americana | 47 clubes com fases prévias + 32 nos grupos | 32 nos grupos (sem fases prévias) |
| Champions / Liga Europa / Conference | 36 clubes, fase de liga suíça (8 jogos), top 8 direto às oitavas, 9º–24º playoff | igual |
| Ligas europeias | Premier 20, LaLiga 20, Bundesliga 18, Serie A 20, Ligue 1 18, Liga Portugal 18, Eredivisie 18, Süper Lig 18, Escócia 12 com split, Grécia 14 com playoffs | igual (nomes genéricos) |
| Copa do Mundo de Clubes | 32 clubes a cada 4 anos (UEFA 12, CONMEBOL 6, AFC 4, CAF 4, CONCACAF 4, OFC 1, sede 1) | igual; 1ª edição em 2029, ou opção "todo ano" |

### Fontes

- [Novo calendário do futebol brasileiro 2026 (Olympics.com)](https://www.olympics.com/pt/noticias/novo-calendario-futebol-brasileiro-2026-mudancas)
- [CBF: documentos técnicos da Série C 2026](https://www.cbf.com.br/futebol-brasileiro/noticias/noticias-campeonato-brasileiro-serie-c/a/cbf-publica-documentos-tecnicos-da-serie-c-de-2026)
- [2026 Campeonato Brasileiro Série D (Wikipedia)](https://en.wikipedia.org/wiki/2026_Campeonato_Brasileiro_S%C3%A9rie_D)
- [Série C 2026: os 20 clubes (Band)](https://www.band.com.br/esportes/futebol/brasileirao-serie-c-de-2026-tem-os-20-clubes-definidos-veja-a-lista)
- [Série B 2026 (CNN Brasil)](https://www.cnnbrasil.com.br/esportes/brasileirao/campeonato-brasileiro-veja-os-clubes-que-participarao-da-serie-b-em-2026/)
- [Copa do Brasil 2026: formato (Lance!)](https://www.lance.com.br/futebol-nacional/copa-do-brasil-2026-confira-classificados-formato-e-quando-estreiam-os-times.html)
- [Liga Profesional 2026: formato (El Economista)](https://eleconomista.com.ar/deportes/arranca-liga-profesional-claves-entender-formato-primera-division-n92099)
- [Liga BetPlay 2026: formato (Futbolred)](https://www.futbolred.com/futbol-colombiano/liga-betplay/liga-betplay-i-2026-formato-nuevo-sistemas-calendario-y-como-se-define-campeon-en-colombia-260900)
- [2026 LigaPro Serie A (Wikipedia)](https://en.wikipedia.org/wiki/2026_LigaPro_Serie_A)
- [División Profesional 2026 (El Deber)](https://eldeber.com.bo/deportes/asi-distribuyen-16-equipos-division-profesional-2026_1766579649)
- [2026 Liga de Primera (Wikipedia)](https://en.wikipedia.org/wiki/2026_Liga_de_Primera)
- [Libertadores 2026: 47 clubes (Ámbito)](https://www.ambito.com/deportes/los-47-equipos-clasificados-la-copa-libertadores-2026-todos-los-detalles-las-fases-previas-sorteo-y-bombos-n6227282)
- [2026–27 UEFA Champions League league phase (Wikipedia)](https://en.wikipedia.org/wiki/2026%E2%80%9327_UEFA_Champions_League_league_phase)
- [2029 FIFA Club World Cup (beIN Sports)](https://www.beinsports.com/en-us/soccer/fifa-club-world-cup/articles/fifa-club-world-cup-to-increase-number-of-slots-for-2029-edition-2026-02-20)
- [Super League Greece (Wikipedia)](https://en.wikipedia.org/wiki/Super_League_Greece) · [Süper Lig (Wikipedia)](https://en.wikipedia.org/wiki/S%C3%BCper_Lig) · [Scottish Premiership (Wikipedia)](https://en.wikipedia.org/wiki/Scottish_Premiership)

## Estrelas, habilidades e estilos dos jogadores

**Estrelas (1–7):**

| Estrelas | Classe | Habilidades | Rendimento extra |
|---|---|---|---|
| 1–3 | jogadores normais | 4 | 0% a +1,5% |
| 4–5 | desequilibram o jogo | 5 | +5% / +8% |
| 6–7 | lendários | 6 | +12% / +17% |

As estrelas também multiplicam a chance dos estilos dispararem (`0,6 + 0,2 × estrelas`) e o valor de
mercado. Na geração do mundo, cerca de 88% dos jogadores têm 1 a 3 estrelas, 11% têm 4 ou 5 e menos de
0,5% têm 6 ou 7. Jovens podem ganhar estrelas até o limite (`starCap`).

**Habilidades:** o banco em `src/engine/data/habilidades.ts` tem **910 habilidades**, 130 por posição.
São 26 habilidades-base por posição, cada uma combinada com condições como "sob pressão", "no fim do
jogo", "em jogos grandes", "fora de casa", "na chuva", "na altitude" e outras. O arquivo é gerado por
`scripts/gen_habilidades.py`. Cada habilidade tem um efeito no motor (defesa do goleiro, desarme, passe,
finalização, cruzamento, cabeceio, falta, pênalti, fôlego, liderança, disciplina etc.). Habilidade fixa
dá +3%; condicional dá +6%, mas só quando a condição está ativa.

**Estilos de jogo** (cada jogador tem um; as probabilidades são por minuto e crescem com as estrelas):

| Posição | Estilo | O que faz no motor |
|---|---|---|
| Goleiro | Paredão / Líbero | mais defesas difíceis / corta lançamentos antes da chance |
| Zagueiro | Visionário / Barreira | passe que cria jogada / trava a finalização |
| Lateral | Visionário / Barreira | chega ao fundo e cruza (chance de cabeça) / defende as jogadas pelo lado |
| Volante | Caçador / Visionário | rouba a bola no meio e mata o ataque / passe vertical que inicia o ataque |
| Meia de ligação | Construtor / Veloz | constrói jogadas / está em todo o meio (mais posse) |
| Armador | Na medida / Abre caminho | assistência perfeita (gol mais provável) / dribla a barreira que travaria o lance |
| Atacante | Segundo atacante / Pivô / Nato | volta para armar / segura e rola para quem chega / finaliza e converte mais |

## Táticas do técnico (12)

Equilibrado, Posse de bola, Tiki-taka, Contra-ataque, Pressão alta, Gegenpressing, Retranca, Catenaccio,
Jogo aéreo, Jogo pelas pontas, Ligação direta e Futebol total. Cada tática:

- muda a posse, as chances criadas e as sofridas, o desgaste, os cartões, os cruzamentos e a conversão;
- **favorece estilos de jogadores**: um estilo favorecido dispara até 35% mais. A tela mostra o
  "encaixe" do time titular;
- tem **complexidade**: a execução é `1 − max(0, complexidade − exp/100 − 0,15) × 1,2` (mín. 40%). Um
  técnico novato usando Tiki-taka executa só 40%, perde os bônus e ainda sofre penalidade de rendimento.

## Patrocínios

- **Master:** valor semanal pelo tamanho da marca (1–5) e pela economia da liga.
- **Base:** até 3 marcas pequenas. Esse dinheiro também conta como investimento nas categorias de base.
- **Revisão anual por desempenho.** A nota soma: objetivo cumprido (+1/−1), títulos (+1 cada), acesso
  (+1), rebaixamento (−2) e humor da torcida (±1).
  - ≥ 2 (excelente ou brilhante): uma marca maior oferece contrato com cláusula de desempenho, e a atual
    faz **contraproposta com argumentos** (tempo de parceria, venda de camisas, histórico da
    concorrente, bônus por título). O usuário escolhe entre a nova, a contraproposta ou manter.
  - −1: a marca pede **ajuste** de −25% (aceitar ou deixar sair).
  - ≤ −2: a marca **sai** e entra uma menor.
  - Cláusula de desempenho: a marca nova corta 30% após uma temporada ruim.

## Categorias de base, investidores e joias lendárias

- Garotos de **15 a 20 anos**, com duas safras por ano (janeiro e julho) e 2 a 4 garotos conforme o
  nível da base. Evoluem toda semana pelo CT, pelo nível da base, pelo investimento e pelo treino.
  Aos 21 anos sobem automaticamente ou são dispensados.
- **Investimento na temporada** = patrocínios da base + investidores + aportes do clube. Metade se
  perde na virada do ano.
- **Investidores:** no início da temporada, grupos oferecem dinheiro para o CT ou para a base em troca
  de 5–15% das vendas de jogadores por 3 temporadas.
- **Joia lendária:** a chance por garoto é `0,2% + 0,3% × nível da base + 0,15% × CT + 3% × investimento`
  (até ~5,5%). A joia chega com 15 anos, força 61–88 e **1 a 5 estrelas** (mais investimento puxa para
  mais estrelas), com potencial para 6 ou 7 estrelas e evolução acelerada.

## Mercado: janelas, contratos e empréstimos

- **Janelas:** Europa nas semanas 0–4 (janeiro) e 26–34 (julho–agosto); América do Sul nas semanas 0–9
  e 27–32. Para negociar, a janela do comprador e a do vendedor precisam estar abertas. Propostas de
  clubes europeus só chegam na janela europeia, e com valor maior.
- **Agentes livres** podem assinar a qualquer momento.
- **Contratos** de 1 a 5 anos, com salário pedido pelo jogador (valor + estrelas). Na semana 40 chegam
  os avisos de contratos que vencem: renovar por 2 ou 4 anos, ou deixar sair. Quem tem respeito < 20 não
  quer renovar, mas dá para tentar convencer. Sem renovação, o jogador sai de graça. Na IA, 85% renovam.
- **Empréstimos** até o fim do ano: pegar reservas de outros clubes (taxa de 8% do valor) ou mandar um
  jogador para ganhar ritmo. Na virada do ano todos voltam.

## Previsão (Monte Carlo)

Na tela de Tabelas, o botão "Simular 400x" roda o restante da competição com um modelo de gols de
Poisson baseado na força dos elencos (top 11 × estrelas). Mostra:

- na **Libertadores** e nas copas: a chance de título e de passar de fase de cada clube;
- nas ligas: a chance de título, de vaga na Libertadores ou Champions e de rebaixamento.

## Simplificações conhecidas (próximas fases)

- Temporada de janeiro a dezembro para todos (a Europa real vai de agosto a maio).
- Sem fases prévias na Libertadores/Sul-Americana e sem vaga de copa nacional na Europa.
- Promedio (ARG/COL) substituído pela soma de pontos do ano; playoffs de acesso viram vagas diretas.
- Ainda não há negociação de valores (contraproposta do usuário) nem cláusulas de rescisão.
- Sem escudos nem nomes de jogadores reais: os jogadores são fictícios e os clubes europeus, genéricos.
