// Evolução dos jogadores semana a semana: força, estrelas e fôlego.
//
// Força: cresce em direção ao potencial. Quanto mais novo, mais rápido; quem
// joga evolui mais do que quem fica no banco; treino e CT multiplicam. Depois
// dos 31 anos a força começa a cair (craques e lendas caem mais devagar).
// Estrelas: seguem a faixa de força (ver starsForForce). Ao cruzar uma faixa
// o jogador ganha (ou perde) uma estrela.
// Fôlego: até 28 anos todo jogador aguenta os 90 minutos; depois disso só os
// craques — 5★ até 35 anos, 6★ até 40 e 7★ até 53.

import { pushMessage } from './inbox';
import { FORCA_MINIMA_ESTRELAS, STAR_LABEL, abilityNames, starsForForce, syncAbilities } from './players';
import { clamp, type Rng } from './rng';
import type { GameState, Player } from './types';

// ---------------- Fôlego ----------------

/** Até que idade o jogador aguenta os dois tempos inteiros. */
export function idadeLimiteFolego(p: Player): number {
  if (p.stars >= 7 || p.legend) return 53;
  if (p.stars >= 6) return 40;
  if (p.stars >= 5) return 35;
  return 28;
}

export function aguentaJogoInteiro(p: Player): boolean {
  return p.age <= idadeLimiteFolego(p);
}

/** Energia em que o jogador fica exausto (rendimento despenca). */
export const ENERGIA_EXAUSTO = 30;

/**
 * Minutos que o jogador consegue jogar, saindo de 100% de energia, até ficar
 * exausto em condições normais. Quem aguenta o jogo todo passa dos 90; os
 * demais "quebram" mais cedo conforme passam da idade-limite.
 */
export function minutosDeFolego(p: Player): number {
  const limite = idadeLimiteFolego(p);
  if (p.age <= limite) return p.age <= 23 ? 125 : p.age <= 28 ? 115 : 105;
  return clamp(78 - 2.5 * (p.age - limite), 50, 78);
}

/** Gasto de energia por minuto (antes de clima, altitude, habilidades e treino). */
export function gastoPorMinuto(p: Player): number {
  return (100 - ENERGIA_EXAUSTO) / minutosDeFolego(p);
}

export function folegoLabel(p: Player): string {
  const m = Math.round(minutosDeFolego(p));
  return m >= 95 ? 'aguenta os 90 minutos' : `cansa por volta dos ${m} minutos`;
}

// ---------------- Força ----------------

/** Ritmo de evolução por idade (pontos por semana com o máximo de espaço até o potencial). */
export function taxaIdade(age: number): number {
  if (age <= 17) return 0.16;
  if (age <= 19) return 0.14;
  if (age <= 21) return 0.12;
  if (age <= 23) return 0.09;
  if (age <= 25) return 0.055;
  if (age <= 27) return 0.03;
  if (age <= 29) return 0.015;
  if (age <= 31) return 0.006;
  return 0;
}

/** Perda semanal de força pela idade (a partir dos 32). */
export function declinioIdade(p: Player): number {
  if (p.age < 32) return 0;
  const base = 0.02 + 0.012 * (p.age - 31);
  const resistencia = p.legend || p.stars >= 7 ? 0.3 : p.stars >= 6 ? 0.55 : p.stars >= 5 ? 0.8 : 1;
  return base * resistencia;
}

const TREINO_FATOR = { leve: 0.8, normal: 1, forte: 1.25 } as const;

export interface Evolucao {
  ganho: number;
  estrelas: number;
}

/**
 * Evolução de uma semana. `jogou`: entrou em campo na semana; `relacionado`:
 * estava na lista (titular/banco) sem jogar; `base`: está nas categorias de base.
 */
export function evoluirSemana(p: Player, ctx: { ct: number; treino?: keyof typeof TREINO_FATOR; jogou: boolean; relacionado?: boolean; base?: number }): number {
  const ctMult = 0.8 + 0.1 * ctx.ct;
  const treino = TREINO_FATOR[ctx.treino ?? 'normal'];
  const ritmo = ctx.base !== undefined ? 0.55 + 0.08 * ctx.base : ctx.jogou ? 1 : ctx.relacionado ? 0.45 : 0.3;
  let delta = 0;
  const espaco = p.potential - p.force;
  const taxa = taxaIdade(p.age);
  if (espaco > 0 && taxa > 0) {
    delta += taxa * clamp(espaco / 15, 0.15, 1.3) * ritmo * ctMult * treino * (p.legend ? 1.5 : 1);
    delta = Math.min(delta, espaco);
  }
  // Quem joga e treina segura melhor a idade.
  const dec = declinioIdade(p);
  if (dec > 0) delta -= dec * (ctx.jogou ? 0.9 : 1) * (treino > 1 ? 0.85 : 1);
  p.force = clamp(p.force + delta, 1, 135);
  return delta;
}

/** Atualiza as estrelas pela faixa de força. Retorna a variação (+1, -1 ou 0). */
export function syncStars(rng: Rng, p: Player): number {
  let novas = starsForForce(p.force);
  // Folga para perder estrela: evita "ganha/perde" quando a força oscila na fronteira.
  if (novas < p.stars && p.force >= FORCA_MINIMA_ESTRELAS[p.stars] - 1.5) novas = p.stars;
  if (novas === p.stars) return 0;
  const antes = p.stars;
  p.stars = novas;
  p.starCap = Math.max(p.starCap, novas);
  syncAbilities(rng, p);
  return novas - antes;
}

/**
 * Semana de evolução de todos os jogadores do mundo. No clube do técnico a
 * evolução considera o treino escolhido e quem foi relacionado; as mudanças de
 * estrela viram mensagens.
 */
export function weeklyDevelopment(state: GameState, rng: Rng) {
  const user = state.clubs[state.userClubId];
  const listados = new Set([...state.lineup.starters, ...state.lineup.bench]);
  for (const club of state.clubs) {
    const isUser = club === user;
    const grupos: [number[], boolean][] = [[club.playerIds, false]];
    if (isUser) grupos.push([club.youthIds, true]);
    for (const [ids, base] of grupos) {
      for (const id of ids) {
        const p = state.players[id];
        if (!p || p.retired) continue;
        const jogos = p.seasonGames - (p.devGames ?? 0);
        p.devGames = p.seasonGames;
        evoluirSemana(p, {
          ct: club.ct,
          treino: isUser ? state.treino : 'normal',
          jogou: jogos > 0,
          relacionado: isUser ? listados.has(id) : true,
          base: base ? club.baseLevel : undefined,
        });
        const d = syncStars(rng, p);
        if (d === 0 || !isUser) continue;
        if (d > 0) {
          const nova = abilityNames(p).slice(-1)[0];
          pushMessage(state, 'jogador', `Parabéns, ${p.name}!`,
            `${p.name} (${p.pos}, ${p.age} anos) ganhou uma estrela! Chegou a força ${Math.round(p.force)} e agora é ${p.stars}★ — ${STAR_LABEL[p.stars]}.` +
            (nova ? ` Nova habilidade: ${nova}.` : '') +
            (p.stars >= 5 ? ' Jogador de 5 estrelas ou mais faz diferença em campo.' : ''));
        } else {
          pushMessage(state, 'midia', `${p.name} perde uma estrela`,
            `Aos ${p.age} anos, ${p.name} caiu para força ${Math.round(p.force)} e agora é ${p.stars}★. O tempo cobra o seu preço.`);
        }
      }
    }
  }
}

/** Recuperação diária de energia: jovens se recuperam mais rápido. */
export function recuperacao(p: Player, ct: number): number {
  const idade = p.age <= 23 ? 4 : p.age <= 28 ? 2 : p.age <= 31 ? 0 : -Math.min(6, 1 + (p.age - 32) * 0.5);
  const craque = p.age > 31 && p.stars >= 6 ? 2 : 0;
  return 14 + ct * 2 + idade + craque;
}
