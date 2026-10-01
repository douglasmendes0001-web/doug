// Tipos centrais do motor do jogo. Nenhum código de UI deve ser importado aqui.

export type Pos = 'G' | 'LD' | 'ZG' | 'LE' | 'VOL' | 'MEI' | 'ATA';
export type Setor = 'GOL' | 'DEF' | 'MEI' | 'ATA';

export type Confed = 'CONMEBOL' | 'UEFA' | 'AFC' | 'CAF' | 'CONCACAF' | 'OFC';

export type CountryCode =
  | 'BRA' | 'ARG' | 'CHI' | 'COL' | 'ECU' | 'BOL' | 'PAR' | 'PER' | 'URU' | 'VEN'
  | 'ENG' | 'ESP' | 'GER' | 'FRA' | 'ITA' | 'POR' | 'NED' | 'SCO' | 'TUR' | 'GRE'
  | 'KSA' | 'JPN' | 'KOR' | 'QAT' | 'UAE' | 'EGY' | 'MAR' | 'TUN' | 'RSA' | 'ALG' | 'NGA'
  | 'MEX' | 'USA' | 'CAN' | 'CRC' | 'NZL';

export type Personalidade = 'lider' | 'profissional' | 'temperamental' | 'ambicioso' | 'tranquilo';

export type Clima = 'normal' | 'chuva' | 'frio' | 'calor';

export interface Player {
  id: number;
  name: string;
  nat: CountryCode;
  pos: Pos;
  age: number;
  force: number;
  potential: number;
  traits: [string, string];
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
  suspendedGames: number;
  yellowCards: number;
  seasonGoals: number;
  seasonGames: number;
  benchStreak: number;
  value: number;
  salary: number;
  forSale: boolean;
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
  ticketPrice: number;
  playerIds: number[];
  /** Força média de referência (usada para geração e para IA). */
  baseForce: number;
}

export type CarreiraJogador = 'umClube' | 'variosClubes';

export interface Coach {
  name: string;
  age: number;
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
}

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
  scorers?: { clubId: number; playerId: number; minute: number }[];
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

export type Formacao = '4-4-2' | '4-3-3' | '3-5-2' | '4-5-1' | '5-3-2' | '4-2-3-1';

export interface Lineup {
  formation: Formacao;
  starters: number[];
  bench: number[];
}

export type TreinoIntensidade = 'leve' | 'normal' | 'forte';

export interface Settings {
  halfSeconds: 15 | 30 | 60;
  mundialAnual: boolean;
}

export interface SeasonRecord {
  year: number;
  champions: Record<string, number>;
}

export interface GameState {
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
