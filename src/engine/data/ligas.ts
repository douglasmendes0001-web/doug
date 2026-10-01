// Configuração das ligas nacionais: formato de disputa (pesquisado para 2026),
// faixa de força média dos elencos e regras de acesso/rebaixamento.
//
// Escala de força: Brasil Série A ~40-60; Europa 60-120. Ajuste os valores
// de `force` aqui para calibrar a dificuldade — o resto do jogo se adapta.

import type { CountryCode, StageDef } from '../types';

export interface TournamentSeed {
  suffix: string;
  name: string;
  short: string;
  stages: StageDef[];
  window: [number, number];
}

export interface LeagueSeed {
  id: string;
  country: CountryCode;
  tier: number;
  force: [number, number];
  /** Escala econômica (TV, bilheteria, salários). Série A = 1. */
  eco: number;
  tournaments: TournamentSeed[];
  /** Quantos caem para a divisão de baixo (e sobem dela). */
  swap?: number;
  /** Base do rebaixamento: tabela final ou soma de pontos do ano (promedio/tabela anual). */
  relegationBasis: 'final' | 'aggregate';
  /** Texto curto sobre o formato real e as simplificações feitas. */
  formatoReal: string;
}

const pontosCorridos = (legs = 2): StageDef[] => [{ type: 'rr', name: 'Pontos corridos', groups: 1, legs }];
const umTorneio = (name: string, short: string, stages: StageDef[], window: [number, number] = [3, 50]): TournamentSeed[] => [
  { suffix: '', name, short, stages, window },
];

export const LIGAS: LeagueSeed[] = [
  // ---------------- Brasil ----------------
  {
    id: 'BRA1', country: 'BRA', tier: 1, force: [40, 60], eco: 1, swap: 4, relegationBasis: 'final',
    tournaments: umTorneio('Brasileirão Série A', 'Série A', pontosCorridos()),
    formatoReal: '20 clubes, pontos corridos em turno e returno (38 rodadas). 4 rebaixados.',
  },
  {
    id: 'BRA2', country: 'BRA', tier: 2, force: [20, 40], eco: 0.3, swap: 4, relegationBasis: 'final',
    tournaments: umTorneio('Brasileirão Série B', 'Série B', pontosCorridos()),
    formatoReal: '20 clubes, pontos corridos (38 rodadas). 4 sobem, 4 caem.',
  },
  {
    id: 'BRA3', country: 'BRA', tier: 3, force: [12, 28], eco: 0.08, swap: 4, relegationBasis: 'aggregate',
    tournaments: umTorneio('Brasileirão Série C', 'Série C', [
      { type: 'rr', name: 'Primeira fase', groups: 1, legs: 1, advanceTotal: 8 },
      { type: 'rr', name: 'Quadrangulares', groups: 2, legs: 2, grouping: 'snake', advance: 2 },
      { type: 'ko', name: 'Final', legs: 2 },
    ]),
    formatoReal: '20 clubes: turno único, 8 melhores em 2 quadrangulares; 2 de cada grupo sobem e os líderes decidem o título. Em 2026 caem 2 (em 2027 a Série C passa a 24 clubes); no jogo usamos 4 para manter as divisões estáveis.',
  },
  {
    id: 'BRA4', country: 'BRA', tier: 4, force: [5, 18], eco: 0.02, relegationBasis: 'final',
    tournaments: umTorneio('Brasileirão Série D', 'Série D', [
      { type: 'rr', name: 'Fase 1 (grupos)', groups: 16, legs: 2, grouping: 'draw', advance: 4 },
      { type: 'ko', name: 'Mata-mata', legs: 2 },
    ]),
    formatoReal: 'Novo formato 2026: 96 clubes em 16 grupos de 6 (ida e volta), 4 avançam e o mata-mata é todo em ida e volta. Os 4 semifinalistas sobem.',
  },
  // ---------------- Argentina ----------------
  {
    id: 'ARG1', country: 'ARG', tier: 1, force: [37, 57], eco: 0.6, swap: 2, relegationBasis: 'aggregate',
    tournaments: [
      {
        suffix: 'AP', name: 'Torneo Apertura', short: 'Apertura', window: [3, 24],
        stages: [
          { type: 'rr', name: 'Zonas', groups: 2, legs: 1, grouping: 'draw', advance: 8 },
          { type: 'ko', name: 'Playoffs', legs: 1, finalNeutral: true },
        ],
      },
      {
        suffix: 'CL', name: 'Torneo Clausura', short: 'Clausura', window: [29, 50],
        stages: [
          { type: 'rr', name: 'Zonas', groups: 2, legs: 1, grouping: 'draw', advance: 8 },
          { type: 'ko', name: 'Playoffs', legs: 1, finalNeutral: true },
        ],
      },
    ],
    formatoReal: '30 clubes em 2 zonas de 15; os 8 melhores de cada zona vão aos playoffs (Apertura e Clausura). 2 rebaixados: pior promedio e pior da Tabela Anual — no jogo, os 2 piores da tabela anual.',
  },
  {
    id: 'ARG2', country: 'ARG', tier: 2, force: [18, 36], eco: 0.12, relegationBasis: 'final',
    tournaments: umTorneio('Primera Nacional', 'Primera Nacional', [
      { type: 'rr', name: 'Zonas', groups: 2, legs: 2, grouping: 'draw', advance: 4 },
      { type: 'ko', name: 'Reducido', legs: 1, finalNeutral: true },
    ]),
    formatoReal: '36 clubes em 2 zonas de 18. Sobem 2.',
  },
  // ---------------- Chile ----------------
  {
    id: 'CHI1', country: 'CHI', tier: 1, force: [30, 50], eco: 0.3, swap: 2, relegationBasis: 'final',
    tournaments: umTorneio('Liga de Primera', 'Primera CHI', pontosCorridos()),
    formatoReal: '16 clubes, turno e returno (30 rodadas). 15º e 16º caem.',
  },
  {
    id: 'CHI2', country: 'CHI', tier: 2, force: [14, 30], eco: 0.06, relegationBasis: 'final',
    tournaments: umTorneio('Liga de Ascenso', 'Ascenso CHI', pontosCorridos()),
    formatoReal: '16 clubes. Campeão e vencedor do playoff sobem (no jogo, os 2 primeiros).',
  },
  // ---------------- Colômbia ----------------
  {
    id: 'COL1', country: 'COL', tier: 1, force: [30, 50], eco: 0.3, swap: 2, relegationBasis: 'aggregate',
    tournaments: [
      {
        suffix: 'AP', name: 'Liga BetPlay — Apertura', short: 'Apertura COL', window: [3, 24],
        stages: [
          { type: 'rr', name: 'Todos contra todos', groups: 1, legs: 1, advanceTotal: 8 },
          { type: 'ko', name: 'Playoffs', legs: 2 },
        ],
      },
      {
        suffix: 'FI', name: 'Liga BetPlay — Finalización', short: 'Finalización', window: [29, 50],
        stages: [
          { type: 'rr', name: 'Todos contra todos', groups: 1, legs: 1, advanceTotal: 8 },
          { type: 'rr', name: 'Cuadrangulares', groups: 2, legs: 2, grouping: 'snake', advance: 1 },
          { type: 'ko', name: 'Final', legs: 2 },
        ],
      },
    ],
    formatoReal: '20 clubes, 19 rodadas por torneio. Apertura 2026 com playoffs; Finalización com cuadrangulares. 2 rebaixados pela média de 3 anos (no jogo: soma de pontos do ano).',
  },
  {
    id: 'COL2', country: 'COL', tier: 2, force: [14, 30], eco: 0.06, relegationBasis: 'final',
    tournaments: umTorneio('Torneo BetPlay (Primera B)', 'Primera B COL', pontosCorridos()),
    formatoReal: '16 clubes. Sobem 2.',
  },
  // ---------------- Equador ----------------
  {
    id: 'ECU1', country: 'ECU', tier: 1, force: [29, 49], eco: 0.3, swap: 2, relegationBasis: 'aggregate',
    tournaments: umTorneio('LigaPro Serie A', 'LigaPro', [
      { type: 'rr', name: 'Primera etapa', groups: 1, legs: 2, advanceTotal: 6 },
      { type: 'rr', name: 'Hexagonal final', groups: 1, legs: 2 },
    ]),
    formatoReal: '16 clubes em turno e returno (30 rodadas); os 6 primeiros jogam o hexagonal pelo título, 7º-10º um quadrangular por vaga internacional e os 6 últimos o grupo do descenso (no jogo: os 2 piores do ano caem).',
  },
  {
    id: 'ECU2', country: 'ECU', tier: 2, force: [13, 28], eco: 0.05, relegationBasis: 'final',
    tournaments: umTorneio('LigaPro Serie B', 'Serie B ECU', pontosCorridos()),
    formatoReal: '10 clubes, sobem 2.',
  },
  // ---------------- Bolívia ----------------
  {
    id: 'BOL1', country: 'BOL', tier: 1, force: [24, 42], eco: 0.15, swap: 1, relegationBasis: 'final',
    tournaments: umTorneio('División Profesional', 'División Prof.', pontosCorridos()),
    formatoReal: '16 clubes, 30 rodadas. Último cai direto; penúltimo joga série contra o campeão da Copa Simón Bolívar (no jogo: 1 rebaixado).',
  },
  {
    id: 'BOL2', country: 'BOL', tier: 2, force: [10, 24], eco: 0.03, relegationBasis: 'final',
    tournaments: umTorneio('Copa Simón Bolívar', 'Simón Bolívar', pontosCorridos()),
    formatoReal: 'Segunda divisão nacional (simplificada em pontos corridos).',
  },
  // ---------------- Europa (genérica) ----------------
  ...europa('ENG', 'Liga Inglesa', 'Inglaterra', [80, 120], [60, 80], 4, 1.2, 3, 'Premier: 20 clubes, 3 caem. Championship: 24 clubes, 2 sobem direto + playoff (no jogo: 3).'),
  ...europa('ESP', 'Liga Espanhola', 'Espanha', [78, 118], [58, 76], 2.5, 0.6, 3, 'Primeira: 20 clubes, 3 caem. Segunda: 22 clubes, 2 sobem direto + playoff (no jogo: 3).'),
  ...europa('GER', 'Liga Alemã', 'Alemanha', [75, 115], [58, 75], 2.5, 0.6, 3, '18 clubes: 2 caem direto e o 16º joga playoff (no jogo: 3).'),
  ...europa('ITA', 'Liga Italiana', 'Itália', [75, 113], [56, 72], 2.2, 0.5, 3, '20 clubes, 3 caem. Série B: 2 sobem direto + playoff (no jogo: 3).'),
  ...europa('FRA', 'Liga Francesa', 'França', [70, 108], [55, 70], 1.8, 0.4, 3, '18 clubes: 2 caem e o 16º joga playoff (no jogo: 3).'),
  ...europa('POR', 'Liga Portuguesa', 'Portugal', [65, 95], [48, 62], 0.8, 0.15, 3, '18 clubes: 2 caem e o 16º joga playoff (no jogo: 3).'),
  ...europa('NED', 'Liga Holandesa', 'Holanda', [65, 92], [45, 60], 0.8, 0.15, 3, '18 clubes: 2 caem e o 16º joga playoff. Segunda divisão com 20 (no jogo: 3 trocam).'),
  {
    id: 'SCO1', country: 'SCO', tier: 1, force: [60, 85], eco: 0.6, swap: 1, relegationBasis: 'final',
    tournaments: umTorneio('Liga Escocesa', 'Liga Escocesa', [
      { type: 'rr', name: 'Fase regular', groups: 1, legs: 3 },
      { type: 'rr', name: 'Split', groups: 2, legs: 1, grouping: 'ranges', rangeSizes: [6, 6], carry: true },
    ]),
    formatoReal: '12 clubes, 33 rodadas (3 turnos) e depois o "split": 6 de cima e 6 de baixo jogam mais 5 rodadas mantendo os pontos. O último cai.',
  },
  {
    id: 'SCO2', country: 'SCO', tier: 2, force: [40, 56], eco: 0.1, relegationBasis: 'final',
    tournaments: umTorneio('Liga Escocesa — 2ª Divisão', 'Escócia 2', pontosCorridos(4)),
    formatoReal: '10 clubes, 4 turnos (36 rodadas). Campeão sobe.',
  },
  ...europa('TUR', 'Liga Turca', 'Turquia', [62, 88], [48, 62], 1.0, 0.2, 3, 'Süper Lig com 18 clubes desde 2025-26; 3 caem.'),
  {
    id: 'GRE1', country: 'GRE', tier: 1, force: [60, 84], eco: 0.5, swap: 2, relegationBasis: 'final',
    tournaments: umTorneio('Liga Grega', 'Liga Grega', [
      { type: 'rr', name: 'Fase regular', groups: 1, legs: 2 },
      { type: 'rr', name: 'Playoffs / Playout', groups: 3, legs: 2, grouping: 'ranges', rangeSizes: [4, 4, 6], carry: true },
    ]),
    formatoReal: '14 clubes, 26 rodadas; depois playoff do título (top 4), playoff por vaga europeia (5º-8º) e playout (6 últimos). 2 caem.',
  },
  {
    id: 'GRE2', country: 'GRE', tier: 2, force: [40, 56], eco: 0.08, relegationBasis: 'final',
    tournaments: umTorneio('Liga Grega — 2ª Divisão', 'Grécia 2', pontosCorridos()),
    formatoReal: 'Simplificada em pontos corridos.',
  },
];

function europa(
  country: CountryCode, nome: string, _pais: string, f1: [number, number], f2: [number, number],
  eco1: number, eco2: number, swap: number, formatoReal: string,
): LeagueSeed[] {
  return [
    {
      id: `${country}1`, country, tier: 1, force: f1, eco: eco1, swap, relegationBasis: 'final',
      tournaments: umTorneio(nome, nome, pontosCorridos()), formatoReal,
    },
    {
      id: `${country}2`, country, tier: 2, force: f2, eco: eco2, relegationBasis: 'final',
      tournaments: umTorneio(`${nome} — 2ª Divisão`, `${nome} 2`, pontosCorridos()), formatoReal,
    },
  ];
}

export function leagueById(id: string): LeagueSeed {
  const l = LIGAS.find((x) => x.id === id);
  if (!l) throw new Error(`Liga desconhecida: ${id}`);
  return l;
}

export function lowerLeague(l: LeagueSeed): LeagueSeed | undefined {
  return LIGAS.find((x) => x.country === l.country && x.tier === l.tier + 1);
}

// Vagas continentais por país (formato simplificado de 32 clubes na fase de grupos).
export const VAGAS_CONMEBOL: Partial<Record<CountryCode, { lib: number; sud: number }>> = {
  BRA: { lib: 6, sud: 6 }, ARG: { lib: 6, sud: 6 },
  CHI: { lib: 3, sud: 3 }, COL: { lib: 3, sud: 3 }, ECU: { lib: 3, sud: 3 }, BOL: { lib: 3, sud: 3 },
  PAR: { lib: 2, sud: 2 }, PER: { lib: 2, sud: 2 }, URU: { lib: 2, sud: 2 }, VEN: { lib: 2, sud: 2 },
};

// Vagas UEFA (36 clubes em cada torneio, fase de liga no formato suíço).
export const VAGAS_UEFA: Partial<Record<CountryCode, { ucl: number; uel: number; uecl: number }>> = {
  ENG: { ucl: 5, uel: 3, uecl: 4 }, ESP: { ucl: 5, uel: 3, uecl: 4 }, GER: { ucl: 4, uel: 4, uecl: 4 },
  ITA: { ucl: 4, uel: 4, uecl: 4 }, FRA: { ucl: 4, uel: 4, uecl: 4 }, POR: { ucl: 3, uel: 4, uecl: 4 },
  NED: { ucl: 3, uel: 4, uecl: 4 }, TUR: { ucl: 3, uel: 4, uecl: 3 }, SCO: { ucl: 2, uel: 3, uecl: 2 },
  GRE: { ucl: 3, uel: 3, uecl: 3 },
};

// Copas nacionais.
export interface CupSeed {
  country: CountryCode;
  name: string;
  short: string;
  size: number;
  stages: StageDef[];
}

const koUnico: StageDef[] = [{ type: 'ko', name: 'Mata-mata', legs: 2, singleLegAbove: 4, finalSingle: true, finalNeutral: true }];

export const COPAS: CupSeed[] = [
  {
    country: 'BRA', name: 'Copa do Brasil', short: 'Copa do Brasil', size: 128,
    stages: [{ type: 'ko', name: 'Mata-mata', legs: 2, singleLegAbove: 16, finalSingle: true, finalNeutral: true }],
  },
  { country: 'ARG', name: 'Copa Argentina', short: 'Copa ARG', size: 64, stages: [{ type: 'ko', name: 'Mata-mata', legs: 1, finalNeutral: true }] },
  {
    country: 'CHI', name: 'Copa Chile', short: 'Copa Chile', size: 32,
    stages: [
      { type: 'rr', name: 'Grupos', groups: 8, legs: 2, grouping: 'draw', advance: 2 },
      { type: 'ko', name: 'Mata-mata', legs: 2, finalSingle: true, finalNeutral: true },
    ],
  },
  { country: 'COL', name: 'Copa Colombia', short: 'Copa COL', size: 36, stages: [{ type: 'ko', name: 'Mata-mata', legs: 2, singleLegAbove: 8 }] },
  { country: 'ECU', name: 'Copa Ecuador', short: 'Copa ECU', size: 26, stages: [{ type: 'ko', name: 'Mata-mata', legs: 1, finalNeutral: true }] },
  {
    country: 'BOL', name: 'Copa de la División Profesional', short: 'Copa BOL', size: 16,
    stages: [
      { type: 'rr', name: 'Grupos', groups: 4, legs: 2, grouping: 'draw', advance: 2 },
      { type: 'ko', name: 'Mata-mata', legs: 2 },
    ],
  },
  { country: 'ENG', name: 'Copa da Inglaterra', short: 'Copa ING', size: 44, stages: koUnico },
  { country: 'ESP', name: 'Copa do Rei', short: 'Copa do Rei', size: 42, stages: koUnico },
  { country: 'GER', name: 'Copa da Alemanha', short: 'Copa ALE', size: 36, stages: koUnico },
  { country: 'ITA', name: 'Copa da Itália', short: 'Copa ITA', size: 40, stages: koUnico },
  { country: 'FRA', name: 'Copa da França', short: 'Copa FRA', size: 36, stages: koUnico },
  { country: 'POR', name: 'Taça de Portugal', short: 'Taça POR', size: 36, stages: koUnico },
  { country: 'NED', name: 'Copa da Holanda', short: 'Copa HOL', size: 38, stages: koUnico },
  { country: 'SCO', name: 'Copa da Escócia', short: 'Copa ESC', size: 22, stages: koUnico },
  { country: 'TUR', name: 'Copa da Turquia', short: 'Copa TUR', size: 38, stages: koUnico },
  { country: 'GRE', name: 'Copa da Grécia', short: 'Copa GRE', size: 30, stages: koUnico },
];
