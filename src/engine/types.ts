// Tipos centrais do motor do jogo. Nenhum código de UI deve ser importado aqui.

import type { EstiloId, TaticaId } from './data/estilos';
import type { Esquema } from './data/formacoes';

export type Pos = 'G' | 'LD' | 'ZG' | 'LE' | 'VOL' | 'MEI' | 'ATA';
export type Setor = 'GOL' | 'DEF' | 'MEI' | 'ATA';

export type Confed = 'CONMEBOL' | 'UEFA' | 'AFC' | 'CAF' | 'CONCACAF' | 'OFC';

export type CountryCode =
  | 'BRA' | 'ARG' | 'CHI' | 'COL' | 'ECU' | 'BOL' | 'PAR' | 'PER' | 'URU' | 'VEN'
  | 'ENG' | 'ESP' | 'GER' | 'FRA' | 'ITA' | 'POR' | 'NED' | 'SCO' | 'TUR' | 'GRE'
  | 'KSA' | 'JPN' | 'KOR' | 'QAT' | 'UAE' | 'EGY' | 'MAR' | 'TUN' | 'RSA' | 'ALG' | 'NGA'
  | 'MEX' | 'USA' | 'CAN' | 'CRC' | 'HON' | 'GUA' | 'SLV' | 'PAN' | 'JAM' | 'NZL';

/** Pé dominante: destro, canhoto ou ambidestro. */
export type Pe = 'D' | 'E' | 'A';

export type Personalidade = 'lider' | 'profissional' | 'temperamental' | 'ambicioso' | 'tranquilo';

export type Clima = 'normal' | 'chuva' | 'frio' | 'calor';

export interface Player {
  id: number;
  /** Jogos da temporada já contados na evolução semanal. */
  devGames?: number;
  /** Venda acertada para o exterior: o garoto da base só se muda ao completar 18 anos (regra da FIFA). */
  saleAgreed?: { clubId: number; amount: number };
  name: string;
  nat: CountryCode;
  pos: Pos;
  age: number;
  force: number;
  potential: number;
  /** Classe do jogador (1-7): 1-3 normais, 4-5 desequilibram, 6-7 lendários. */
  stars: number;
  /** Até quantas estrelas o jogador ainda pode chegar. */
  starCap: number;
  /** Joia lendária (nasce na base com chance ligada ao investimento). */
  legend?: boolean;
  /** Índices no banco de habilidades (4, 5 ou 6 conforme as estrelas). */
  abilities: number[];
  style: EstiloId;
  foot: Pe;
  personality: Personalidade;
  /** 0-100 — fôlego atual. */
  energy: number;
  /** 0-100 — respeito/relacionamento com o técnico do clube. */
  respeito: number;
  /** 0-100 — ritmo de jogo: sobe quando joga, cai quando fica no banco. */
  oportunidade: number;
  /** 0-100 — preparo vindo do treinamento (CT + intensidade). */
  treino: number;
  clubId: number;
  injuredSlots: number;
  /** Tipo da lesão atual (ex.: "Entorse no tornozelo"). */
  lesao?: string;
  /** Total de jogos de suspensão a cumprir (soma de `suspensoes`). */
  suspendedGames: number;
  /** Jogos de suspensão por competição (id da competição). */
  suspensoes?: Record<string, number>;
  /** Amarelos na temporada (todas as competições). */
  yellowCards: number;
  /** Amarelos pendentes por competição (3 = suspensão; zera depois). */
  amarelos?: Record<string, number>;
  seasonGoals: number;
  seasonGames: number;
  seasonAssists: number;
  benchStreak: number;
  value: number;
  salary: number;
  forSale: boolean;
  /** Último ano de contrato (o vínculo termina em dezembro desse ano). */
  contractUntil: number;
  /** Emprestado por outro clube até o fim do ano indicado. */
  loan?: { fromClubId: number; untilYear: number };
  /** Jogador das categorias de base (15-20 anos), fora do elenco profissional. */
  youth?: boolean;
  /** Promessa de oportunidade feita pelo técnico (slot limite). */
  promiseUntilSlot?: number;
  retired?: boolean;
}

export interface Stadium {
  name: string;
  capacity: number;
  /** Expansão em andamento: lugares extras e slot em que fica pronta. */
  expansion?: { seats: number; readySlot: number };
}

export interface Club {
  id: number;
  name: string;
  short: string;
  country: CountryCode;
  confed: Confed;
  state?: string;
  city?: string;
  /** Divisão nacional (1 = elite). 0 = clube externo (só torneios internacionais). 9 = só estadual. */
  tier: number;
  leagueId: string | null;
  colors: [string, string];
  reputation: number;
  altitude: number;
  stadium: Stadium;
  /** Nível do centro de treinamento (1-5). */
  ct: number;
  ctUpgradeReadySlot?: number;
  money: number;
  /** Piso da receita anual (€), definido na criação do mundo. */
  revenueFloor?: number;
  ticketPrice: number;
  playerIds: number[];
  /** Força média de referência (usada para geração e para IA). */
  baseForce: number;
  /** Nível das categorias de base (1-5). */
  baseLevel: number;
  /** Jogadores da base (15-20 anos). */
  youthIds: number[];
  /** Dinheiro investido na base na temporada (patrocínios de base, investidores, clube). */
  baseInvest: number;
  /** Investidores que ficam com uma fatia das vendas. */
  investors: Investor[];
  /** Técnicos que viraram ídolos/lendas do clube (para sempre). */
  legends?: { coach: string; honor: Honra; seasons: number; titles: number; until: number }[];
  /** Conferência na MLS (Leste/Oeste). */
  conference?: 'Leste' | 'Oeste';
  /** Pontos dos últimos 5 jogos (3/1/0) — o "momento" do time. */
  form?: number[];
}

export interface Investor {
  name: string;
  /** Percentual das vendas de jogadores (0-1). */
  share: number;
  untilYear: number;
}

export interface Sponsor {
  name: string;
  sector: string;
  /** 1 (marca pequena) a 5 (gigante). */
  tier: number;
  weekly: number;
  untilYear: number;
  /** Temporadas de parceria com o clube. */
  seasons: number;
  /** Bônus pago por título conquistado. */
  bonusTitle: number;
  /** Cláusula de desempenho: corta o valor se a temporada for ruim. */
  clausula?: boolean;
}

/** clubId de jogadores sem clube (agentes livres). */
export const FREE_AGENT = -1;

export type CarreiraJogador = 'umClube' | 'variosClubes';

export interface Coach {
  name: string;
  age: number;
  /** Nacionalidade (compatriotas confiam um pouco mais). */
  nat?: CountryCode;
  exPlayer: boolean;
  career: CarreiraJogador | null;
  titulosCarreira: boolean;
  experience: number;
  clubId: number;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  titles: string[];
  confDiretoria: number;
  confTorcida: number;
  fired: boolean;
  /** História como jogador (criada no novo jogo, para técnicos ex-jogadores). */
  playerCareer?: PlayerCareer;
  /** Passagens como técnico por cada clube. */
  history?: CoachStint[];
  /** Grandes momentos da carreira (títulos, goleadas, acessos, honrarias, marcos). */
  momentos?: GrandeMomento[];
  /** Pediu demissão e está escolhendo um novo clube (ou a aposentadoria). */
  pediuDemissao?: boolean;
  /** Ano da aposentadoria: a carreira acabou e o save vira Hall da Fama. */
  aposentadoEm?: number;
}

export type TipoMomento = 'estreia' | 'clube' | 'titulo' | 'goleada' | 'acesso' | 'honra' | 'marco' | 'adeus';

export interface GrandeMomento {
  year: number;
  tipo: TipoMomento;
  clubId: number;
  clubName: string;
  texto: string;
  /** Títulos: competição e tipo (para o troféu da arte). */
  compId?: string;
  compName?: string;
  kind?: CompKind;
}

export interface PlayerCareer {
  games: number;
  goals: number;
  assists: number;
  clubs: {
    name: string;
    clubId?: number;
    country?: CountryCode;
    titles: Record<string, number>;
    /** Anos no clube (início e fim). */
    anos?: [number, number];
    jogos?: number;
    gols?: number;
    assistencias?: number;
    /** Virou lenda/ídolo do clube como jogador. */
    lenda?: boolean;
  }[];
  /** Posição em que jogava. */
  posicao?: string;
  /** Nível do jogador: comum, bom, craque ou lenda. */
  nivel?: 'comum' | 'bom' | 'craque' | 'lenda';
  /** Passagem pela seleção. */
  selecao?: { jogos: number; gols: number; assistencias: number; lenda?: boolean };
  /** Títulos pela seleção (ex.: Copa do Mundo → 1). */
  national: Record<string, number>;
  /** Prêmios individuais (ex.: Bola de Ouro → 2). */
  individual: Record<string, number>;
}

export type Honra = 'idolo' | 'lenda';

export interface CoachStint {
  clubId: number;
  clubName: string;
  fromYear: number;
  toYear?: number;
  seasons: number;
  games: number;
  wins: number;
  titles: string[];
  honor?: Honra;
}

/** Artes mostradas em tela cheia (boas-vindas, título, lenda). */
export type ArtEvent =
  | { type: 'welcome'; clubId: number; coach: string; year: number; honor?: Honra }
  | { type: 'title'; clubId: number; coach: string; year: number; compId: string; compName: string; kind: CompKind; quotes: { channel: CanalMensagem; text: string }[] }
  | { type: 'legend'; clubId: number; coach: string; year: number; honor: Honra; seasons: number; titles: number };

export type CanalMensagem = 'diretoria' | 'torcida' | 'midia' | 'jogador';

export interface MessageAction {
  id: string;
  label: string;
}

export interface Message {
  id: number;
  slot: number;
  channel: CanalMensagem;
  title: string;
  body: string;
  read: boolean;
  playerId?: number;
  kind?: string;
  actions?: MessageAction[];
  resolved?: string;
  /** Dados extras (ex.: valor de proposta). */
  data?: Record<string, number>;
}

export interface Fixture {
  id: number;
  compId: string;
  stageIdx: number;
  slot: number;
  home: number;
  away: number;
  neutral: boolean;
  played: boolean;
  hg: number;
  ag: number;
  pens?: [number, number];
  tieId?: number;
  /** Grupo da fase de pontos corridos (para atualizar a tabela certa). */
  group?: number;
  leg?: number;
  legs?: number;
  /** Jogo de ida do mesmo confronto (para calcular o agregado). */
  prevLeg?: number;
  weather?: Clima;
  temperature?: number;
  scorers?: { clubId: number; playerId: number; minute: number; assistId?: number }[];
}

export interface TableRow {
  clubId: number;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
}

// ---------- Definições de competição ----------

export type GroupingMode = 'snake' | 'ranges' | 'random' | 'draw';

export interface RRStageDef {
  type: 'rr';
  name: string;
  groups: number;
  legs: number;
  /** Quantos avançam por grupo (ou no total, se `advanceTotal`). */
  advance?: number;
  advanceTotal?: number;
  /** Como montar os grupos a partir da fase anterior. */
  grouping?: GroupingMode;
  /** Tamanhos dos grupos em modo 'ranges' (ex.: [6,6] para o split escocês). */
  rangeSizes?: number[];
  /** Carrega a pontuação da fase anterior (split escocês/grego). */
  carry?: boolean;
}

export interface KOStageDef {
  type: 'ko';
  name: string;
  /** Rodadas com mais participantes que isso são jogo único. */
  singleLegAbove?: number;
  legs: 1 | 2;
  finalSingle?: boolean;
  finalNeutral?: boolean;
}

export interface SwissStageDef {
  type: 'swiss';
  name: string;
  matches: number;
  advanceTotal: number;
}

export type StageDef = RRStageDef | KOStageDef | SwissStageDef;

export type CompKind = 'liga' | 'copa' | 'estadual' | 'continental' | 'mundial';

export interface CompetitionDef {
  id: string;
  name: string;
  short: string;
  kind: CompKind;
  country?: CountryCode;
  confed?: Confed;
  tier?: number;
  stages: StageDef[];
  /** Janela de semanas (0-51) em que a competição é disputada. */
  window: [number, number];
  prefer: 'fds' | 'meio' | 'any';
  track: string;
  prize: number;
  /** Todos os jogos em campo neutro (ex.: Mundial de Clubes). */
  neutral?: boolean;
  /** Liga nacional a que pertence (para acesso/rebaixamento). */
  leagueId?: string;
  /** Sede fixa (jogos neutros), usada para clima e altitude. */
  venueClubId?: number;
}

export interface KOTie {
  id: number;
  a: number;
  b: number;
  fixtureIds: number[];
  winner?: number;
}

export interface StageState {
  groups: number[][];
  tables: Record<number, TableRow>[];
  koRounds: KOTie[][];
  started: boolean;
  finished: boolean;
  /** Ordem de cabeças de chave do mata-mata (melhor primeiro). */
  koSeeds?: number[];
  /** Times que folgam na primeira rodada do mata-mata. */
  koByes?: number[];
}

export interface Competition {
  def: CompetitionDef;
  season: number;
  teams: number[];
  slots: number[];
  slotCursor: number;
  stageIdx: number;
  stages: StageState[];
  champion?: number;
  runnerUp?: number;
  finished: boolean;
  /** Pontos agregados por clube em todas as fases de pontos corridos. */
  aggregate: Record<number, TableRow>;
}

// ---------- Escalação / partida ----------

/** Id da formação (padrão, ex.: '4-3-3', ou personalizada, ex.: 'custom-1'). */
export type Formacao = string;

export interface Lineup {
  formation: Formacao;
  /** Cópia do esquema quando a formação é personalizada. */
  esquema?: Esquema;
  /** Ordem manual dos titulares nas vagas da formação (vaga → jogador). */
  slots?: number[];
  tactic: TaticaId;
  starters: number[];
  bench: number[];
}

export type TreinoIntensidade = 'leve' | 'normal' | 'forte';

/** Quando salvar automaticamente: a cada alteração, ao fim de cada partida ou só manualmente. */
export type AutoSave = 'sempre' | 'partida' | 'manual';

export interface Settings {
  halfSeconds: 15 | 30 | 60;
  mundialAnual: boolean;
  /** Padrão: 'partida'. */
  autoSave?: AutoSave;
}

export interface SeasonRecord {
  year: number;
  champions: Record<string, number>;
  /** Nome e tipo de cada competição no ano (para a galeria de títulos). */
  names?: Record<string, string>;
  kinds?: Record<string, CompKind>;
}

export interface GameState {
  /** Câmbio do ano (quanto vale € 1 em reais e dólares). */
  fx?: { BRL: number; USD: number };
  version: number;
  seed: number;
  rng: number;
  year: number;
  slot: number;
  clubs: Club[];
  players: Player[];
  coach: Coach;
  userClubId: number;
  competitions: Competition[];
  fixtures: Fixture[];
  messages: Message[];
  lineup: Lineup;
  treino: TreinoIntensidade;
  settings: Settings;
  history: SeasonRecord[];
  nextIds: { player: number; fixture: number; message: number; tie: number };
  /** Resultado do último jogo do usuário (para tela de resumo). */
  lastUserFixtureId?: number;
  seasonObjective?: string;
  objectiveRank?: number;
  /** Classificados para torneios continentais da próxima temporada. */
  qualifications?: Record<string, number[]>;
  financeLog: FinanceEntry[];
  /** Slot de salvamento (1 a 8). */
  saveSlot?: number;
  /** A carreira foi alterada pelo modo editor. */
  edited?: boolean;
  /** Artes pendentes para mostrar ao usuário. */
  pendingArt?: ArtEvent[];
  /** Formações criadas pelo técnico. */
  customFormations?: Esquema[];
  /** Nota de desempenho da última temporada (patrocínios e investidores). */
  lastPerformance?: number;
  /** Patrocinadores do clube do usuário. */
  sponsors: { master: Sponsor | null; base: Sponsor[] };
  /** Índice do anfitrião do Mundial (rotação entre confederações). */
  mundialEdition: number;
}

export interface FinanceEntry {
  slot: number;
  year: number;
  label: string;
  amount: number;
}

export const SLOTS_PER_YEAR = 104;
