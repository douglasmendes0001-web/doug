// Técnico: experiência inicial, prestígio e a relação inicial com o elenco.

import { clamp } from './rng';
import type { CarreiraJogador, Coach, CountryCode, Player } from './types';

export const IDADE_MIN = 20;
export const IDADE_MAX = 75;
export const IDADE_EX_JOGADOR = 30;

export interface CoachInput {
  name: string;
  age: number;
  nat?: CountryCode;
  exPlayer: boolean;
  career: CarreiraJogador | null;
  titulosCarreira: boolean;
}

/** Experiência inicial (0-100) a partir da idade e da história como jogador. */
export function initialExperience(c: CoachInput): number {
  let exp = clamp((c.age - IDADE_MIN) * 1.6, 0, 50);
  if (c.age >= IDADE_EX_JOGADOR && c.exPlayer) {
    exp += 10;
    if (c.career === 'variosClubes') exp += 6; // conhece muitos vestiários
    if (c.career === 'umClube') exp += 3; // identidade, liderança
    if (c.titulosCarreira) exp += 12;
  }
  return Math.round(clamp(exp, 0, 100));
}

/** Prestígio perante os jogadores — pesa mais para os veteranos. */
export function prestige(c: Coach): number {
  let p = c.experience * 0.6;
  if (c.exPlayer) p += 10;
  if (c.titulosCarreira) p += 12;
  p += Math.min(20, c.titles.length * 4);
  return clamp(p, 0, 100);
}

export function createCoach(input: CoachInput, clubId: number): Coach {
  const exPlayer = input.age >= IDADE_EX_JOGADOR && input.exPlayer;
  return {
    name: input.name.trim() || 'Técnico',
    age: clamp(Math.round(input.age), IDADE_MIN, IDADE_MAX),
    nat: input.nat ?? 'BRA',
    exPlayer,
    career: exPlayer ? input.career : null,
    titulosCarreira: exPlayer ? input.titulosCarreira : false,
    experience: initialExperience(input),
    clubId,
    games: 0, wins: 0, draws: 0, losses: 0,
    titles: [],
    confDiretoria: 60,
    confTorcida: 55,
    fired: false,
  };
}

/**
 * Respeito inicial de um jogador pelo técnico. Veteranos mais velhos que o
 * técnico desconfiam de quem tem pouca experiência; jovens se identificam.
 */
export function initialRespeito(coach: Coach, p: Player): number {
  let r = 60 + (prestige(coach) - 40) * 0.35;
  const gap = p.age - coach.age;
  if (gap > 0) r -= Math.min(32, gap * 2.6) * (1 - prestige(coach) / 130);
  if (p.age <= 23 && coach.age <= 32) r += 8;
  if (p.personality === 'profissional') r += 5;
  if (p.personality === 'temperamental') r -= 5;
  if (p.personality === 'lider' && gap > 0) r -= 4;
  if (coach.nat && p.nat === coach.nat) r += 5;
  return Math.round(clamp(r, 8, 95));
}

export function experienceLabel(exp: number): string {
  if (exp < 15) return 'Novato';
  if (exp < 35) return 'Pouca experiência';
  if (exp < 55) return 'Experiente';
  if (exp < 75) return 'Muito experiente';
  return 'Lenda do banco';
}

export function ageWarning(age: number): string {
  if (age < 26) {
    return 'Atenção: a idade do técnico influencia o jogo. Com ' + age + ' anos você começa praticamente sem experiência: ' +
      'substituições e ajustes táticos terão efeito menos previsível, a diretoria vai cobrar resultados rápidos e os jogadores ' +
      'veteranos vão desconfiar de você — será preciso ganhar o respeito deles com vitórias e boa gestão do elenco.';
  }
  if (age < 36) {
    return 'Atenção: a idade do técnico influencia o jogo. Um técnico jovem tem pouca bagagem — os veteranos do elenco podem ' +
      'resistir às suas decisões no começo.';
  }
  if (age < 55) {
    return 'A idade do técnico influencia o jogo: com essa idade você já tem experiência e os jogadores tendem a respeitar suas decisões.';
  }
  return 'A idade do técnico influencia o jogo: muita experiência e respeito do elenco, mas a torcida e a mídia vão cobrar resultados de quem já viveu tudo.';
}
