import type { Confed, CountryCode } from '../types';

export interface CountryMeta {
  name: string;
  confed: Confed;
  /** Temperatura média anual (°C) ao nível do mar. */
  temp: number;
  /** Amplitude sazonal (°C). */
  amp: number;
  /** Mês (0-11) mais quente. */
  hotMonth: number;
  rain: number;
  /** 0-1: quão adaptado ao calor o jogador/clube local é. */
  hotness: number;
  /** Cores da bandeira (faixas) para o mini-ícone da UI. */
  flag: string[];
}

export const PAISES: Record<CountryCode, CountryMeta> = {
  BRA: { name: 'Brasil', confed: 'CONMEBOL', temp: 25, amp: 3, hotMonth: 0, rain: 0.25, hotness: 0.85, flag: ['#1b8a3d', '#f2c200', '#1f3f99'] },
  ARG: { name: 'Argentina', confed: 'CONMEBOL', temp: 17, amp: 7, hotMonth: 0, rain: 0.18, hotness: 0.5, flag: ['#7ab8e8', '#ffffff', '#7ab8e8'] },
  CHI: { name: 'Chile', confed: 'CONMEBOL', temp: 14, amp: 6, hotMonth: 0, rain: 0.15, hotness: 0.35, flag: ['#ffffff', '#d0021b'] },
  COL: { name: 'Colômbia', confed: 'CONMEBOL', temp: 26, amp: 1, hotMonth: 2, rain: 0.32, hotness: 0.75, flag: ['#f2c200', '#1f3f99', '#d0021b'] },
  ECU: { name: 'Equador', confed: 'CONMEBOL', temp: 26, amp: 1, hotMonth: 2, rain: 0.28, hotness: 0.7, flag: ['#f2c200', '#1f3f99', '#d0021b'] },
  BOL: { name: 'Bolívia', confed: 'CONMEBOL', temp: 26, amp: 3, hotMonth: 10, rain: 0.2, hotness: 0.5, flag: ['#d0021b', '#f2c200', '#1b8a3d'] },
  PAR: { name: 'Paraguai', confed: 'CONMEBOL', temp: 24, amp: 6, hotMonth: 0, rain: 0.22, hotness: 0.8, flag: ['#d0021b', '#ffffff', '#1f3f99'] },
  PER: { name: 'Peru', confed: 'CONMEBOL', temp: 21, amp: 3, hotMonth: 1, rain: 0.1, hotness: 0.6, flag: ['#d0021b', '#ffffff', '#d0021b'] },
  URU: { name: 'Uruguai', confed: 'CONMEBOL', temp: 17, amp: 6, hotMonth: 0, rain: 0.2, hotness: 0.45, flag: ['#ffffff', '#7ab8e8', '#ffffff'] },
  VEN: { name: 'Venezuela', confed: 'CONMEBOL', temp: 27, amp: 1, hotMonth: 3, rain: 0.25, hotness: 0.9, flag: ['#f2c200', '#1f3f99', '#d0021b'] },
  ENG: { name: 'Inglaterra', confed: 'UEFA', temp: 11, amp: 7, hotMonth: 6, rain: 0.32, hotness: 0.15, flag: ['#ffffff', '#d0021b', '#ffffff'] },
  ESP: { name: 'Espanha', confed: 'UEFA', temp: 17, amp: 8, hotMonth: 6, rain: 0.15, hotness: 0.55, flag: ['#c4161c', '#f2c200', '#c4161c'] },
  GER: { name: 'Alemanha', confed: 'UEFA', temp: 10, amp: 9, hotMonth: 6, rain: 0.28, hotness: 0.25, flag: ['#111111', '#d0021b', '#f2c200'] },
  FRA: { name: 'França', confed: 'UEFA', temp: 13, amp: 8, hotMonth: 6, rain: 0.25, hotness: 0.35, flag: ['#1f3f99', '#ffffff', '#d0021b'] },
  ITA: { name: 'Itália', confed: 'UEFA', temp: 16, amp: 9, hotMonth: 6, rain: 0.18, hotness: 0.5, flag: ['#1b8a3d', '#ffffff', '#d0021b'] },
  POR: { name: 'Portugal', confed: 'UEFA', temp: 17, amp: 6, hotMonth: 7, rain: 0.2, hotness: 0.55, flag: ['#1b8a3d', '#d0021b', '#d0021b'] },
  NED: { name: 'Holanda', confed: 'UEFA', temp: 10, amp: 7, hotMonth: 6, rain: 0.32, hotness: 0.2, flag: ['#d0021b', '#ffffff', '#1f3f99'] },
  SCO: { name: 'Escócia', confed: 'UEFA', temp: 8, amp: 6, hotMonth: 6, rain: 0.42, hotness: 0.05, flag: ['#1f5fbf', '#ffffff', '#1f5fbf'] },
  TUR: { name: 'Turquia', confed: 'UEFA', temp: 15, amp: 10, hotMonth: 6, rain: 0.15, hotness: 0.55, flag: ['#d0021b', '#ffffff', '#d0021b'] },
  GRE: { name: 'Grécia', confed: 'UEFA', temp: 18, amp: 9, hotMonth: 6, rain: 0.12, hotness: 0.6, flag: ['#1f5fbf', '#ffffff', '#1f5fbf'] },
  KSA: { name: 'Arábia Saudita', confed: 'AFC', temp: 28, amp: 9, hotMonth: 6, rain: 0.03, hotness: 0.95, flag: ['#1b8a3d', '#ffffff'] },
  JPN: { name: 'Japão', confed: 'AFC', temp: 16, amp: 10, hotMonth: 7, rain: 0.28, hotness: 0.4, flag: ['#ffffff', '#d0021b', '#ffffff'] },
  KOR: { name: 'Coreia do Sul', confed: 'AFC', temp: 13, amp: 13, hotMonth: 7, rain: 0.25, hotness: 0.35, flag: ['#ffffff', '#1f3f99', '#d0021b'] },
  QAT: { name: 'Catar', confed: 'AFC', temp: 28, amp: 8, hotMonth: 7, rain: 0.02, hotness: 0.95, flag: ['#8a1538', '#ffffff'] },
  UAE: { name: 'Emirados Árabes', confed: 'AFC', temp: 28, amp: 8, hotMonth: 7, rain: 0.02, hotness: 0.95, flag: ['#1b8a3d', '#ffffff', '#111111'] },
  EGY: { name: 'Egito', confed: 'CAF', temp: 23, amp: 7, hotMonth: 7, rain: 0.02, hotness: 0.9, flag: ['#d0021b', '#ffffff', '#111111'] },
  MAR: { name: 'Marrocos', confed: 'CAF', temp: 19, amp: 5, hotMonth: 7, rain: 0.12, hotness: 0.7, flag: ['#c4161c', '#1b8a3d', '#c4161c'] },
  TUN: { name: 'Tunísia', confed: 'CAF', temp: 19, amp: 8, hotMonth: 7, rain: 0.1, hotness: 0.75, flag: ['#d0021b', '#ffffff', '#d0021b'] },
  RSA: { name: 'África do Sul', confed: 'CAF', temp: 17, amp: 5, hotMonth: 0, rain: 0.15, hotness: 0.6, flag: ['#1b8a3d', '#f2c200', '#1f3f99'] },
  ALG: { name: 'Argélia', confed: 'CAF', temp: 19, amp: 8, hotMonth: 7, rain: 0.1, hotness: 0.75, flag: ['#1b8a3d', '#ffffff'] },
  NGA: { name: 'Nigéria', confed: 'CAF', temp: 27, amp: 2, hotMonth: 2, rain: 0.3, hotness: 0.9, flag: ['#1b8a3d', '#ffffff', '#1b8a3d'] },
  MEX: { name: 'México', confed: 'CONCACAF', temp: 21, amp: 5, hotMonth: 5, rain: 0.22, hotness: 0.7, flag: ['#1b8a3d', '#ffffff', '#d0021b'] },
  USA: { name: 'Estados Unidos', confed: 'CONCACAF', temp: 15, amp: 10, hotMonth: 6, rain: 0.2, hotness: 0.45, flag: ['#1f3f99', '#ffffff', '#d0021b'] },
  CAN: { name: 'Canadá', confed: 'CONCACAF', temp: 8, amp: 14, hotMonth: 6, rain: 0.22, hotness: 0.15, flag: ['#d0021b', '#ffffff', '#d0021b'] },
  CRC: { name: 'Costa Rica', confed: 'CONCACAF', temp: 24, amp: 2, hotMonth: 3, rain: 0.35, hotness: 0.8, flag: ['#1f3f99', '#ffffff', '#d0021b'] },
  NZL: { name: 'Nova Zelândia', confed: 'OFC', temp: 14, amp: 5, hotMonth: 0, rain: 0.3, hotness: 0.3, flag: ['#1f3f99', '#d0021b', '#ffffff'] },
};

/** Países de onde costumam vir estrangeiros para cada mercado. */
export const ESTRANGEIROS: Partial<Record<CountryCode, CountryCode[]>> = {
  BRA: ['ARG', 'URU', 'COL', 'PAR', 'ECU', 'CHI', 'VEN', 'POR'],
  ARG: ['URU', 'PAR', 'COL', 'CHI', 'BRA'],
  CHI: ['ARG', 'URU', 'COL', 'PAR', 'VEN'],
  COL: ['ARG', 'VEN', 'ECU', 'URU'],
  ECU: ['COL', 'ARG', 'URU', 'VEN'],
  BOL: ['ARG', 'BRA', 'COL', 'PAR', 'URU'],
  ENG: ['BRA', 'FRA', 'ESP', 'POR', 'NED', 'GER', 'ARG', 'NGA', 'SCO'],
  ESP: ['BRA', 'ARG', 'FRA', 'POR', 'URU', 'COL', 'MAR'],
  GER: ['FRA', 'NED', 'BRA', 'TUR', 'ESP', 'KOR', 'JPN'],
  ITA: ['BRA', 'ARG', 'FRA', 'ESP', 'POR', 'NED', 'URU'],
  FRA: ['BRA', 'ALG', 'MAR', 'POR', 'NGA', 'TUN', 'ESP'],
  POR: ['BRA', 'ARG', 'URU', 'COL', 'ESP', 'FRA'],
  NED: ['BRA', 'GER', 'FRA', 'MAR', 'JPN', 'ESP'],
  SCO: ['ENG', 'NED', 'JPN', 'KOR', 'FRA'],
  TUR: ['BRA', 'POR', 'NED', 'FRA', 'GER', 'NGA'],
  GRE: ['POR', 'ESP', 'BRA', 'ARG', 'FRA'],
};
