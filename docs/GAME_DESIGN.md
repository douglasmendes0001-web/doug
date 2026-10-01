# Game design: regras e algoritmos

## Técnico

- Idade de **20 a 75 anos**. A tela de criação avisa que a idade influencia o jogo.
- Com **30 anos ou mais** o usuário escolhe se o técnico foi jogador. Se foi, escolhe se
  **passou por vários clubes** ou **ficou em um só**, e se **teve carreira de títulos**.
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

## Simplificações conhecidas (próximas fases)

- Temporada de janeiro a dezembro para todos (a Europa real vai de agosto a maio).
- Sem fases prévias na Libertadores/Sul-Americana e sem vaga de copa nacional na Europa.
- Promedio (ARG/COL) substituído pela soma de pontos do ano; playoffs de acesso viram vagas diretas.
- Mercado simples: compra pelo preço pedido e venda por propostas. Ainda não há contratos, empréstimos
  nem negociação de salário.
- Sem escudos nem nomes de jogadores reais: os jogadores são fictícios e os clubes europeus, genéricos.
