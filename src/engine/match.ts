// Motor de partida minuto a minuto. O mesmo motor roda as partidas ao vivo
// do usuário (um passo por "minuto" de relógio) e as partidas simuladas.
//
// Fatores considerados: força, estrelas, habilidades (com condições), estilo
// de jogo de cada jogador, tática do técnico (e quão bem ele a executa),
// fôlego, respeito pelo técnico, ritmo de jogo, adequação de posição, mando
// de campo/torcida, clima, altitude e o impacto de cada substituição.

import { ENERGIA_EXAUSTO, gastoPorMinuto } from './development';
import { ESTILOS, execucaoTatica, modsEfetivos, taticaById, type EstiloId, type TaticaId } from './data/estilos';
import { HABILIDADES, type CondicaoHabilidade, type EfeitoHabilidade } from './data/habilidades';
import { PAISES } from './data/paises';
import { esquemaMods, esquemaOf, type SlotFormacao } from './data/formacoes';
import { assignSlots, MAX_SUBS, positionFit, sideFit } from './lineup';
import { setorOf } from './players';
import { clamp, type Rng } from './rng';
import type { Club, Lineup, Player, Pos } from './types';
import { altitudeGap, weatherDrain, weatherTechnique, type MatchWeather } from './weather';

export interface TeamContext {
  club: Club;
  squad: Player[];
  lineup: Lineup;
  coachExperience: number;
  coachAge?: number;
  isUser: boolean;
  /** Jogadores que pediram para jogar ou receberam promessa (entram motivados). */
  eager?: Set<number>;
  /** Momento do time (-1 a 1), pelos últimos jogos. */
  form?: number;
  /** Clima com diretoria e torcida (-1 = pressão total, 1 = confiança total). Só para o usuário. */
  pressure?: number;
}

export interface MatchContext {
  home: TeamContext;
  away: TeamContext;
  venue: Club;
  neutral: boolean;
  weather: MatchWeather;
  /** 0-1: força da torcida mandante (lotação x humor). */
  crowd: number;
  rng: Rng;
  /** Mata-mata: gols de jogos anteriores do confronto (orientados para este jogo). */
  knockout?: { aggHome: number; aggAway: number };
  /** Jogo grande (mata-mata, continental, final): ativa habilidades "em jogos grandes". */
  bigGame?: boolean;
}

export type EventType =
  | 'gol' | 'amarelo' | 'vermelho' | 'lesao' | 'sub' | 'info' | 'chance' | 'defesa' | 'penaltis' | 'reclamacao' | 'estilo';

export interface MatchEvent {
  minute: string;
  side: 0 | 1 | -1;
  type: EventType;
  text: string;
  playerId?: number;
}

/** Índices numéricos dos efeitos (acesso rápido em arrays tipados). */
const EFEITOS: EfeitoHabilidade[] = [
  'gk', 'gkout', 'gkair', 'pen', 'penk', 'build', 'lead', 'def', 'head', 'pass', 'card',
  'stamina', 'cross', 'speed', 'shot', 'drib', 'press', 'assist', 'fk', 'hold',
];
const E = Object.fromEntries(EFEITOS.map((e, i) => [e, i])) as Record<EfeitoHabilidade, number>;

interface AbilityRef {
  ei: number;
  cond: CondicaoHabilidade;
}

export interface OnField {
  p: Player;
  pos: Pos;
  /** Vaga da formação (lado e profundidade). */
  slot: SlotFormacao;
  /** Encaixe do pé dominante com o lado da vaga. */
  sideF: number;
  /** Efeito da pressão da torcida sobre o jogador (≤ 1). */
  press: number;
  /** Impacto da substituição (-1 a 1). */
  mod: number;
  injured: boolean;
  yellow: number;
  enteredAt: number;
  ab: AbilityRef[];
  /** Multiplicadores das habilidades ativas na situação atual, por efeito. */
  mult: Float64Array;
}

type Mods = ReturnType<typeof modsEfetivos>;

export interface SideState {
  ctx: TeamContext;
  isHome: boolean;
  onField: OnField[];
  bench: Player[];
  out: Set<number>;
  sentOff: Set<number>;
  subsUsed: number;
  goals: number;
  shots: number;
  onTarget: number;
  posse: number;
  teamMult: number;
  drainMult: number;
  altGap: number;
  tactic: TaticaId;
  execucao: number;
  mods: Mods;
  favored: Set<EstiloId>;
  /** Bônus de liderança das habilidades ativas neste minuto. */
  leadMult: number;
  /** Jogadores em campo por estilo (recalculado a cada minuto). */
  styles: Map<EstiloId, OnField[]>;
  /** Quantidade de habilidades ativas por efeito. */
  counts: Float64Array;
  /** Situação (tempo, placar) para a qual o cache foi calculado; -1 = inválido. */
  cacheKey: number;
  /** Ajustes de respeito gerados durante o jogo (substituições, etc.). */
  respeitoDelta: Map<number, number>;
  subImpact: Map<number, number>;
  played: Set<number>;
  injuredIds: Set<number>;
  /** Amarelos recebidos na partida por jogador. */
  yellows: Map<number, number>;
  hotness: number;
  /** Modificadores do esquema (largura → cruzamentos, meio central → posse). */
  formMods: { cruzamentos: number; posse: number };
  /** Intensidade de pressão de torcida sentida neste momento (0 a ~1,25). */
  pressureLevel: number;
}

/** Ajuste geral do gasto de energia (o gasto de cada jogador vem de development.ts). */
const DRAIN_SCALE = 1;
/** Teto assintótico da vantagem relativa (log). Evita placares absurdos entre divisões muito distantes. */
const RATIO_CAP = Math.log(2.2);
const CHANCE_BASE = 0.104;
const GOAL_BASE = 0.27;
/** Multiplicador de rendimento por estrelas (índice = estrelas). 4-5 desequilibram; 6-7 são lendários. */
/** Peso das estrelas no rendimento: 5★ ou mais fazem diferença. */
const STAR_MULT = [1, 0.99, 1, 1.015, 1.04, 1.1, 1.16, 1.23];

/** Comprime razões de força: 1,5 → ~1,45; 2 → ~1,74; 5 → ~2,14. */
export function softRatio(r: number): number {
  return Math.exp(RATIO_CAP * Math.tanh(Math.log(Math.max(1e-6, r)) / RATIO_CAP));
}

/** Quanto a pressão da torcida afeta o jogador: jovens e temperamentais sentem mais; líderes e craques, menos. */
export function pressureSusceptibility(p: Player): number {
  let s = p.age < 23 ? 1.5 : p.age >= 30 ? 0.6 : 1;
  const pers: Record<string, number> = { lider: 0.5, tranquilo: 0.7, profissional: 0.85, ambicioso: 1, temperamental: 1.4 };
  s *= pers[p.personality] ?? 1;
  if (p.stars >= 5) s *= 0.6;
  return s;
}

/** Fator das probabilidades de estilo: 1★ = 0,8 … 7★ = 2,0. */
export function starFactor(stars: number): number {
  return 0.6 + 0.2 * stars;
}

function abilityRefs(p: Player): AbilityRef[] {
  return p.abilities.map((id) => HABILIDADES[id]).filter(Boolean).map((h) => ({ ei: E[h.efeito], cond: h.cond }));
}

export class MatchSim {
  readonly sides: [SideState, SideState];
  readonly events: MatchEvent[] = [];
  minute = 0;
  half: 1 | 2 = 1;
  finished = false;
  pens?: [number, number];
  scorers: { side: 0 | 1; playerId: number; minute: number; assistId?: number }[] = [];
  private stoppage: [number, number];
  private rng: Rng;

  constructor(readonly ctx: MatchContext) {
    this.rng = ctx.rng;
    this.stoppage = [this.rng.int(1, 3), this.rng.int(2, 6)];
    this.sides = [this.buildSide(ctx.home, true), this.buildSide(ctx.away, false)];
  }

  // ---------------- Montagem ----------------

  private buildSide(t: TeamContext, isHome: boolean): SideState {
    const byId = new Map(t.squad.map((p) => [p.id, p]));
    const starters = t.lineup.starters.map((id) => byId.get(id)).filter((p): p is Player => !!p);
    const esquema = esquemaOf(t.lineup);
    const slotIds = assignSlots(starters, esquema, t.lineup.slots);
    const hotness = PAISES[t.club.country].hotness;
    // Cada time sente a altitude da sede em relação à da própria cidade.
    const gap = altitudeGap(this.ctx.venue.altitude, t.club.altitude);
    const homeBoost = !this.ctx.neutral && isHome ? 1.045 + 0.05 * this.ctx.crowd : 1;
    const coachFactor = 0.96 + 0.08 * (t.coachExperience / 100);
    const tatica = taticaById(t.lineup.tactic);
    const execucao = execucaoTatica(tatica, t.coachExperience);
    const mods = modsEfetivos(tatica, execucao);
    // Momento do time e clima com diretoria/torcida: confiança rende, pressão trava.
    const form = clamp(t.form ?? 0, -1, 1);
    const pressure = clamp(t.pressure ?? 0, -1, 1);
    const momento = (1 + 0.025 * form) * (pressure >= 0 ? 1 + 0.015 * pressure : 1 + 0.03 * pressure);
    const teamMult = homeBoost * weatherTechnique(this.ctx.weather.clima, hotness) * (1 - 0.025 * gap) * coachFactor * mods.rendimento * momento;
    const drainMult = weatherDrain(this.ctx.weather.clima, hotness) * (1 + 0.3 * gap) * mods.desgaste;
    return {
      ctx: t,
      isHome,
      onField: slotIds.flatMap((id, i) => {
        const p = byId.get(id);
        if (!p) return [];
        const slot = esquema.slots[i];
        return [{ p, pos: slot.pos, slot, sideF: sideFit(p, slot), press: 1, mod: 0, injured: false, yellow: 0, enteredAt: 0, ab: abilityRefs(p), mult: new Float64Array(EFEITOS.length).fill(1) }];
      }),
      bench: t.lineup.bench.map((id) => byId.get(id)).filter((p): p is Player => !!p),
      out: new Set(),
      sentOff: new Set(),
      subsUsed: 0,
      goals: 0, shots: 0, onTarget: 0, posse: 0,
      teamMult, drainMult, altGap: gap,
      tactic: tatica.id, execucao, mods, favored: new Set(tatica.favorece), leadMult: 1, styles: new Map(), counts: new Float64Array(EFEITOS.length), cacheKey: -1,
      respeitoDelta: new Map(),
      subImpact: new Map(),
      played: new Set(starters.map((p) => p.id)),
      injuredIds: new Set(),
      yellows: new Map(),
      hotness,
      formMods: esquemaMods(esquema),
      pressureLevel: 0,
    };
  }

  // ---------------- Habilidades e estilos ----------------

  private condActive(side: SideState, cond: CondicaoHabilidade): boolean {
    const opp = side === this.sides[0] ? this.sides[1] : this.sides[0];
    switch (cond) {
      case 'sempre': return true;
      case 'pressao': return side.goals < opp.goals;
      case 'vencendo': return side.goals > opp.goals;
      case 'fim': return this.half === 2 && this.minute >= 75;
      case 'primeiro': return this.half === 1;
      case 'grande': return !!this.ctx.bigGame;
      case 'casa': return side.isHome && !this.ctx.neutral;
      case 'fora': return !side.isHome && !this.ctx.neutral;
      case 'chuva': return this.ctx.weather.clima === 'chuva';
      case 'calor': return this.ctx.weather.clima === 'calor';
      case 'altitude': return this.ctx.venue.altitude >= 2000;
    }
  }

  /**
   * Recalcula habilidades ativas e jogadores por estilo. As condições só mudam
   * com o tempo de jogo, o placar ou mudanças em campo, então o cache só é
   * refeito quando essa situação muda.
   */
  private booed = false;

  private refreshMinute() {
    const H = this.sides[0];
    if (!this.booed && this.half === 2 && H.goals < this.sides[1].goals && this.crowdIntensity() >= 0.45) {
      this.booed = true;
      this.push(0, 'info', `Vaias no estádio! A torcida do ${H.ctx.club.short} perde a paciência e o time sente a pressão.`);
    }
    for (const side of this.sides) {
      const opp = side === this.sides[0] ? this.sides[1] : this.sides[0];
      const diff = side.goals - opp.goals;
      const key = (this.half === 2 ? 1 : 0) + (this.half === 2 && this.minute >= 75 ? 2 : 0) + (diff > 0 ? 4 : diff < 0 ? 8 : 0);
      if (key === side.cacheKey) continue;
      side.cacheKey = key;
      side.styles = new Map();
      side.counts.fill(0);
      for (const f of side.onField) {
        f.mult.fill(1);
        for (const a of f.ab) {
          if (!this.condActive(side, a.cond)) continue;
          f.mult[a.ei] += a.cond === 'sempre' ? 0.03 : 0.06;
          side.counts[a.ei]++;
        }
        const list = side.styles.get(f.p.style);
        if (list) list.push(f);
        else side.styles.set(f.p.style, [f]);
      }
      side.leadMult = 1 + 0.005 * Math.min(4, side.counts[E.lead]);
      // Pressão de torcida: o visitante sente a casa cheia; o mandante sente as vaias quando perde no 2º tempo.
      const intensity = this.crowdIntensity();
      side.pressureLevel = side.isHome ? (this.half === 2 && diff < 0 ? 0.5 * intensity : 0) : intensity;
      for (const f of side.onField) f.press = 1 - 0.03 * side.pressureLevel * pressureSusceptibility(f.p);
    }
  }

  /** Intensidade da torcida mandante (lotação x humor), maior em jogos grandes. */
  crowdIntensity(): number {
    if (this.ctx.neutral) return 0;
    return clamp(this.ctx.crowd * (this.ctx.bigGame ? 1.25 : 1), 0, 1.25);
  }

  /** Probabilidade de um estilo disparar: base x estrelas x fôlego x afinidade com a tática. */
  private styleP(side: SideState, f: OnField, base: number): number {
    const fav = side.favored.has(f.p.style) ? 1 + 0.35 * side.execucao : 1;
    return base * starFactor(f.p.stars) * (0.6 + 0.4 * f.p.energy / 100) * fav * (f.injured ? 0.4 : 1);
  }

  private withStyle(side: SideState, style: EstiloId): OnField[] {
    return side.styles.get(style) ?? [];
  }

  // ---------------- Avaliação ----------------

  eff(side: SideState, f: OnField): number {
    const p = f.p;
    // Abaixo de 30% de energia o jogador está exausto: o rendimento despenca.
    const fitness = (0.65 + 0.35 * (p.energy / 100)) * (p.energy < ENERGIA_EXAUSTO ? 0.85 : 1);
    const moral = 0.9 + 0.2 * (p.respeito / 100);
    const ritmo = 0.95 + 0.07 * (p.oportunidade / 100);
    const sub = 1 + 0.12 * f.mod;
    const inj = f.injured ? 0.6 : 1;
    return p.force * (STAR_MULT[p.stars] ?? 1) * fitness * moral * ritmo * positionFit(p.pos, f.pos) * f.sideF * f.press * side.teamMult * side.leadMult * sub * inj;
  }

  private sector(side: SideState) {
    let def = 0, mid = 0, att = 0;
    let gk = 0;
    for (const f of side.onField) {
      const e = this.eff(side, f);
      const D = f.mult[E.def];
      const P = f.mult[E.pass] * f.mult[E.build];
      const A = f.mult[E.drib] * f.mult[E.speed] * f.mult[E.hold];
      switch (f.pos) {
        case 'G':
          gk = e * f.mult[E.gk];
          break;
        case 'ZG':
          def += e * D; mid += 0.05 * e * P;
          break;
        case 'LD':
        case 'LE':
          def += 0.8 * e * D; mid += 0.3 * e * P; att += 0.15 * e * A * f.mult[E.cross];
          break;
        case 'VOL':
          def += 0.5 * e * D; mid += 0.6 * e * P; att += 0.1 * e;
          break;
        case 'MEI': {
          // Meia avançado (camisa 10, falso 9) ataca mais; meia recuado ajuda a marcar.
          const y = f.slot.y;
          def += 0.15 * e * (y < 50 ? 2 : 1); mid += e * P; att += 0.6 * e * A * (y >= 66 ? 1.3 : y < 50 ? 0.75 : 1);
          break;
        }
        case 'ATA':
          mid += 0.25 * e * (f.p.style === 'ata_segundo' ? 1.4 : 1) * (f.slot.y < 82 ? 1.3 : 1); att += e * A;
          break;
      }
    }
    if (gk === 0) {
      // Sem goleiro (expulso e sem substituições): alguém de linha vai pro gol.
      const outfield = side.onField[0];
      gk = outfield ? this.eff(side, outfield) * 0.35 : 1;
    }
    return { def: def / 4.9, mid: mid / 4.3, att: att / 3.7, gk };
  }

  // ---------------- Relógio ----------------

  get displayMinute(): string {
    if (this.half === 1) return this.minute > 45 ? `45+${this.minute - 45}` : `${this.minute}`;
    return this.minute > 90 ? `90+${this.minute - 90}` : `${this.minute}`;
  }

  get score(): [number, number] {
    return [this.sides[0].goals, this.sides[1].goals];
  }

  private push(side: 0 | 1 | -1, type: EventType, text: string, playerId?: number) {
    this.events.push({ minute: this.displayMinute, side, type, text, playerId });
  }

  /** Avança um minuto. Retorna os eventos gerados neste minuto. */
  step(): MatchEvent[] {
    if (this.finished) return [];
    const before = this.events.length;
    if (this.minute === 0) {
      this.push(-1, 'info', 'Começa a partida!');
      const I = this.crowdIntensity();
      if (I >= 0.6) {
        this.push(0, 'info', `Caldeirão! A torcida do ${this.sides[0].ctx.club.short} não para de cantar e pressiona o ${this.sides[1].ctx.club.short}.`);
      }
    }
    this.minute++;
    this.refreshMinute();
    this.drain();
    this.playMinute();
    this.aiSubs();

    const endFirst = 45 + this.stoppage[0];
    const endSecond = 90 + this.stoppage[1];
    if (this.half === 1 && this.minute >= endFirst) {
      this.push(-1, 'info', `Fim do primeiro tempo: ${this.sides[0].ctx.club.short} ${this.sides[0].goals} x ${this.sides[1].goals} ${this.sides[1].ctx.club.short}`);
      this.half = 2;
      this.minute = 45;
      // Intervalo: recuperação leve de fôlego.
      for (const s of this.sides) for (const f of s.onField) f.p.energy = Math.min(100, f.p.energy + 4);
    } else if (this.half === 2 && this.minute >= endSecond) {
      this.finish();
    }
    return this.events.slice(before);
  }

  runToEnd(): void {
    let guard = 0;
    while (!this.finished && guard++ < 400) this.step();
  }

  get isHalfTime(): boolean {
    return this.half === 2 && this.minute === 45;
  }

  private finish() {
    const ko = this.ctx.knockout;
    if (ko) {
      const aggH = ko.aggHome + this.sides[0].goals;
      const aggA = ko.aggAway + this.sides[1].goals;
      if (aggH === aggA) this.penaltyShootout();
    }
    this.finished = true;
    const [h, a] = this.score;
    const pens = this.pens ? ` (pênaltis ${this.pens[0]} x ${this.pens[1]})` : '';
    this.push(-1, 'info', `Fim de jogo: ${this.sides[0].ctx.club.short} ${h} x ${a} ${this.sides[1].ctx.club.short}${pens}`);
  }

  // ---------------- Lances ----------------

  private drain() {
    for (const s of this.sides) {
      for (const f of s.onField) {
        const p = f.p;
        // Gasto calibrado pela idade e estrelas: quem "aguenta" chega ao fim
        // dos 90 minutos; os demais ficam exaustos antes (ver minutosDeFolego).
        let d = gastoPorMinuto(p) * DRAIN_SCALE * s.drainMult;
        d /= f.mult[E.stamina] * f.mult[E.stamina];
        d *= 1.15 - 0.3 * (p.treino / 100);
        if (f.pos === 'G') d *= 0.35;
        // A altitude cobra mais no segundo tempo.
        if (s.altGap > 0 && this.half === 2) d *= 1 + 0.15 * s.altGap;
        p.energy = Math.max(0, p.energy - d);
      }
    }
  }

  private playMinute() {
    const rng = this.rng;
    const [H, A] = this.sides;
    const sh = this.sector(H);
    const sa = this.sector(A);
    const veloz = (s: SideState) => 1 + this.withStyle(s, 'mei_veloz').reduce((acc, f) => acc + this.styleP(s, f, 0.04), 0);
    const mr = Math.pow(softRatio(sh.mid / Math.max(1, sa.mid)), 0.8) * (H.mods.posse * H.formMods.posse * veloz(H)) / (A.mods.posse * A.formMods.posse * veloz(A));
    const pHome = mr / (mr + 1);
    const attIdx: 0 | 1 = rng.next() < pHome ? 0 : 1;
    this.sides[attIdx].posse++;

    const att = this.sides[attIdx];
    const def = this.sides[1 - attIdx];
    const sAtt = attIdx === 0 ? sh : sa;
    const sDef = attIdx === 0 ? sa : sh;

    // Criação: estilos que constroem jogadas aumentam a chance de ataque.
    let criacao = 1;
    const criadores: [EstiloId, number][] = [
      ['mei_construtor', 0.06], ['vol_visionario', 0.04], ['zag_visionario', 0.03], ['ata_segundo', 0.03], ['ata_nato', 0.03], ['arm_abrecaminho', 0.03],
    ];
    for (const [st, b] of criadores) for (const f of this.withStyle(att, st)) criacao += this.styleP(att, f, b);
    const pressao = 1 - 0.015 * Math.min(4, def.counts[E.press]) - 0.01 * Math.min(2, def.counts[E.gkout]);

    let chanceP = CHANCE_BASE * Math.pow(softRatio(sAtt.att / Math.max(1, sDef.def)), 0.4) * att.mods.ataque * def.mods.defesa * criacao * pressao;
    // Time que perde no fim pressiona mais.
    const diff = att.goals - def.goals;
    if (this.half === 2 && this.minute >= 75 && diff < 0) chanceP *= 1.15;
    // A torcida da casa empurra o time no fim quando não está ganhando.
    if (att.isHome && this.half === 2 && this.minute >= 75 && diff <= 0) chanceP *= 1 + 0.12 * this.crowdIntensity();
    // Menos jogadores em campo = menos chances.
    chanceP *= att.onField.length / 11;
    chanceP = clamp(chanceP, 0.03, 0.25);

    if (rng.next() < chanceP) {
      if (!this.intercepted(attIdx, def)) this.chance(attIdx, att, def, sDef.gk, false);
    } else {
      this.crossAttempt(attIdx, att, def, sDef.gk);
    }
    this.freeKick(attIdx, att, sDef.gk);
    for (let i = 0; i < 2; i++) this.discipline(i as 0 | 1);
    for (let i = 0; i < 2; i++) this.injuryCheck(i as 0 | 1);
  }

  /** Volante caçador e goleiro líbero podem matar o ataque antes da finalização. */
  private intercepted(attIdx: 0 | 1, def: SideState): boolean {
    const defIdx = (1 - attIdx) as 0 | 1;
    for (const f of this.withStyle(def, 'vol_cacador')) {
      if (this.rng.next() < this.styleP(def, f, 0.05)) {
        if (this.rng.chance(0.4)) this.push(defIdx, 'estilo', `${f.p.name} (Caçador) rouba a bola no meio-campo.`, f.p.id);
        return true;
      }
    }
    for (const f of this.withStyle(def, 'libero')) {
      if (this.rng.next() < this.styleP(def, f, 0.02)) {
        if (this.rng.chance(0.4)) this.push(defIdx, 'estilo', `${f.p.name} (Líbero) sai da área e corta o lançamento.`, f.p.id);
        return true;
      }
    }
    return false;
  }

  /** Lateral visionário chega ao fundo e cruza: chance de cabeça. */
  private crossAttempt(attIdx: 0 | 1, att: SideState, def: SideState, gkEff: number) {
    // Jogadores abertos também cruzam; com o pé "certo" para o lado, cruzam mais.
    for (const f of att.onField) {
      if (f.slot.lado === 'C' || f.p.style === 'lat_visionario' || f.pos === 'G' || f.pos === 'ZG') continue;
      const p = 0.0035 * att.formMods.cruzamentos * att.mods.cruzamentos * f.mult[E.cross] * (f.sideF < 1 ? 0.6 : 1);
      if (this.rng.next() < p) {
        if (this.rng.chance(0.3)) this.push(attIdx, 'chance', `${f.p.name} cruza da ${f.slot.lado === 'E' ? 'esquerda' : 'direita'}!`, f.p.id);
        this.chance(attIdx, att, def, gkEff, true, f);
        return;
      }
    }
    for (const f of this.withStyle(att, 'lat_visionario')) {
      const p = this.styleP(att, f, 0.011) * att.mods.cruzamentos * att.formMods.cruzamentos * f.mult[E.cross] * (f.sideF < 1 ? 0.6 : 1);
      if (this.rng.next() < p) {
        if (this.rng.chance(0.5)) this.push(attIdx, 'estilo', `${f.p.name} (Visionário) chega ao fundo e cruza na área!`, f.p.id);
        this.chance(attIdx, att, def, gkEff, true, f);
        return;
      }
    }
  }

  /** Cobradores de falta (habilidade) podem marcar de bola parada. */
  private freeKick(attIdx: 0 | 1, att: SideState, gkEff: number) {
    for (const f of att.onField) {
      const fk = f.mult[E.fk];
      if (fk <= 1 || this.rng.next() >= 0.06 * (fk - 1)) continue;
      att.shots++;
      const q = this.eff(att, f);
      const pGoal = clamp(0.22 * Math.pow(softRatio(q / Math.max(1, gkEff)), 0.4), 0.05, 0.4);
      if (this.rng.next() < pGoal) {
        att.goals++;
        att.onTarget++;
        this.scorers.push({ side: attIdx, playerId: f.p.id, minute: this.minute });
        this.push(attIdx, 'gol', `GOLAÇO DE FALTA do ${att.ctx.club.short}! ${f.p.name}`, f.p.id);
      } else {
        this.push(attIdx, 'chance', `${f.p.name} cobra falta com perigo!`, f.p.id);
      }
      return;
    }
  }

  private chance(attIdx: 0 | 1, att: SideState, def: SideState, gkEff: number, header: boolean, crosser?: OnField) {
    const rng = this.rng;
    const defIdx = (1 - attIdx) as 0 | 1;

    // Barreiras: zagueiros e laterais podem travar o lance; o armador "abre caminho" dribla.
    const blockers = [...this.withStyle(def, 'zag_barreira').map((f) => [f, 0.06] as const), ...this.withStyle(def, 'lat_barreira').map((f) => [f, header ? 0.06 : 0.035] as const)];
    for (const [f, b] of blockers) {
      if (rng.next() < this.styleP(def, f, b)) {
        const dribbler = this.withStyle(att, 'arm_abrecaminho').find((d) => rng.next() < this.styleP(att, d, 0.3));
        if (dribbler) {
          if (rng.chance(0.5)) this.push(attIdx, 'estilo', `${dribbler.p.name} (Abre caminho) dribla ${f.p.name} e segue!`, dribbler.p.id);
          break;
        }
        if (rng.chance(0.45)) this.push(defIdx, 'estilo', `${f.p.name} (Barreira) trava a jogada!`, f.p.id);
        return;
      }
    }

    // Quem finaliza.
    const weights: Record<Pos, number> = { ATA: 5, MEI: 3, LD: 1, LE: 1, VOL: 1, ZG: 0.6, G: 0 };
    const pool = crosser ? att.onField.filter((f) => f !== crosser) : att.onField;
    let shooter = rng.weighted(pool, (f) => {
      let w = weights[f.pos] * (0.5 + f.p.force / 100);
      if (f.p.style === 'ata_nato') w *= 1.5;
      if (header) w *= f.mult[E.head] * (f.p.style === 'ata_pivo' ? 1.6 : 1) * (f.pos === 'ZG' ? 2 : 1);
      return w;
    });
    if (!shooter) return;
    let assist: OnField | undefined = crosser;
    let bonus = 1;

    // Pivô segura e passa para quem chega melhor.
    if (!header && shooter.p.style === 'ata_pivo' && rng.next() < this.styleP(att, shooter, 0.3)) {
      const other = att.onField.filter((f) => f !== shooter && (f.pos === 'MEI' || f.pos === 'ATA'));
      if (other.length) {
        assist = shooter;
        shooter = rng.pick(other);
        bonus *= 1.12;
        if (rng.chance(0.4)) this.push(attIdx, 'estilo', `${assist.p.name} (Pivô) segura e rola para ${shooter.p.name}.`, assist.p.id);
      }
    }
    // Armador "Na medida": assistência perfeita.
    if (!assist) {
      const passer = this.withStyle(att, 'arm_namedida').find((f) => f !== shooter && rng.next() < this.styleP(att, f, 0.22));
      if (passer) {
        assist = passer;
        bonus *= 1.15;
      } else {
        const other = att.onField.find((f) => f !== shooter && f.mult[E.assist] > 1 && rng.chance(0.15));
        if (other) {
          assist = other;
          bonus *= 1.08;
        }
      }
    }

    let q = this.eff(att, shooter) * shooter.mult[E.shot] * (header ? shooter.mult[E.head] : 1);
    if (shooter.p.style === 'ata_nato') q *= 1 + 0.03 * starFactor(shooter.p.stars);
    const gkF = def.onField.find((f) => f.pos === 'G');
    let gk = gkEff;
    if (gkF) {
      if (header) gk *= gkF.mult[E.gkair];
      if (gkF.p.style === 'paredao') gk *= 1 + 0.03 * starFactor(gkF.p.stars);
    }
    let pGoal = GOAL_BASE * Math.pow(softRatio(q / Math.max(1, gk)), 0.4) * att.mods.conversao * bonus;
    if (this.ctx.weather.clima === 'chuva') pGoal = 0.75 * pGoal + 0.25 * GOAL_BASE + 0.01; // bola molhada: mais imprevisível
    pGoal = clamp(pGoal, 0.05, 0.6);
    att.shots++;
    if (rng.next() < pGoal) {
      att.goals++;
      att.onTarget++;
      // Sem assistência de estilo, a maioria dos gols ainda tem um passe final.
      if (!assist && rng.chance(0.55)) {
        const others = att.onField.filter((f) => f !== shooter && f.pos !== 'G');
        if (others.length) assist = rng.weighted(others, (f) => (f.pos === 'MEI' ? 3 : f.pos === 'ATA' ? 2 : 1) * f.mult[E.assist]);
      }
      this.scorers.push({ side: attIdx, playerId: shooter.p.id, minute: this.minute, assistId: assist?.p.id });
      const como = header ? ' de cabeça' : '';
      const ast = assist ? ` (assistência de ${assist.p.name})` : '';
      this.push(attIdx, 'gol', `GOL do ${att.ctx.club.short}! ${shooter.p.name}${como}${ast}`, shooter.p.id);
    } else if (rng.chance(0.45)) {
      att.onTarget++;
      const keeper = gkF ? `${gkF.p.name}${gkF.p.style === 'paredao' ? ' (Paredão)' : ''}` : 'a defesa';
      this.push(attIdx, 'defesa', `${shooter.p.name} finaliza${header ? ' de cabeça' : ''} e ${keeper} salva!`, shooter.p.id);
    } else if (rng.chance(0.3)) {
      this.push(attIdx, 'chance', `${shooter.p.name} arrisca e manda para fora.`, shooter.p.id);
    }
  }

  private discipline(idx: 0 | 1) {
    const rng = this.rng;
    const side = this.sides[idx];
    if (!side.onField.length) return;
    const temperamentais = side.onField.filter((f) => f.p.personality === 'temperamental').length / side.onField.length;
    let pFoul = 0.021 * (1 + 0.5 * temperamentais) * side.mods.cartoes;
    if (this.ctx.weather.clima === 'chuva') pFoul *= 1.15;
    if (rng.next() < pFoul) {
      const f = rng.weighted(side.onField, (x) =>
        (x.p.personality === 'temperamental' ? 2 : 1) * (setorOf(x.pos) === 'DEF' || x.pos === 'VOL' ? 1.4 : 1) * (x.pos === 'G' ? 0.2 : 1)
        * (x.p.style === 'vol_cacador' ? 1.3 : 1) / x.mult[E.card] / x.mult[E.card]);
      f.yellow++;
      side.yellows.set(f.p.id, f.yellow);
      if (f.yellow >= 2) {
        this.push(idx, 'vermelho', `Segundo amarelo: ${f.p.name} (${side.ctx.club.short}) está expulso!`, f.p.id);
        this.sendOff(side, f);
      } else {
        this.push(idx, 'amarelo', `Cartão amarelo para ${f.p.name} (${side.ctx.club.short}).`, f.p.id);
      }
    } else if (rng.next() < 0.0006) {
      const f = rng.pick(side.onField);
      this.push(idx, 'vermelho', `Vermelho direto! ${f.p.name} (${side.ctx.club.short}) é expulso.`, f.p.id);
      f.yellow = Math.max(f.yellow, 3); // marca vermelho direto
      this.sendOff(side, f);
    }
  }

  private sendOff(side: SideState, f: OnField) {
    side.onField = side.onField.filter((x) => x !== f);
    side.cacheKey = -1;
    side.sentOff.add(f.p.id);
    side.out.add(f.p.id);
    f.p.suspendedGames += f.yellow >= 3 ? 2 : 1;
  }

  private injuryCheck(idx: 0 | 1) {
    const rng = this.rng;
    const side = this.sides[idx];
    let p = 0.0011;
    if (this.ctx.weather.clima === 'frio') p *= 1.3;
    if (this.ctx.weather.clima === 'calor') p *= 1.1;
    p *= side.mods.desgaste;
    if (rng.next() >= p) return;
    const candidates = side.onField.filter((f) => !f.injured);
    if (!candidates.length) return;
    const f = rng.weighted(candidates, (x) => 1 + (100 - x.p.energy) / 25);
    f.injured = true;
    side.injuredIds.add(f.p.id);
    this.push(idx, 'lesao', `${f.p.name} (${side.ctx.club.short}) sente uma lesão!`, f.p.id);
    if (!side.ctx.isUser) this.autoReplace(idx, f);
  }

  // ---------------- Substituições ----------------

  /** Calcula o impacto esperado de um jogador entrando (-1 a 1). */
  substitutionImpact(side: SideState, p: Player): number {
    let r = 0.35 * ((p.oportunidade - 50) / 50) + 0.35 * ((p.treino - 50) / 50) + 0.3 * ((p.respeito - 50) / 50);
    if (side.ctx.eager?.has(p.id)) r += p.respeito >= 45 ? 0.2 : -0.15;
    if (p.respeito < 35) r -= 0.2;
    // Estilo que combina com a tática entra mais encaixado.
    if (side.favored.has(p.style)) r += 0.08;
    // Técnico inexperiente: efeito menos previsível.
    const sd = 0.25 * (1.2 - side.ctx.coachExperience / 100);
    r += this.rng.normal(0, sd);
    return clamp(r, -1, 1);
  }

  substitute(idx: 0 | 1, outId: number, inId: number): { ok: boolean; error?: string } {
    const side = this.sides[idx];
    if (this.finished) return { ok: false, error: 'A partida já terminou.' };
    if (side.subsUsed >= MAX_SUBS) return { ok: false, error: `Você já fez as ${MAX_SUBS} substituições.` };
    const out = side.onField.find((f) => f.p.id === outId);
    if (!out) return { ok: false, error: 'Esse jogador não está em campo.' };
    const inP = side.bench.find((p) => p.id === inId);
    if (!inP) return { ok: false, error: 'Esse jogador não está no banco.' };
    if (side.out.has(inId)) return { ok: false, error: 'Esse jogador já saiu do jogo.' };

    const mod = this.substitutionImpact(side, inP);
    side.onField = side.onField.map((f) => (f === out ? { p: inP, pos: out.pos, slot: out.slot, sideF: sideFit(inP, out.slot), press: out.press, mod, injured: false, yellow: 0, enteredAt: this.minute, ab: abilityRefs(inP), mult: new Float64Array(EFEITOS.length).fill(1) } : f));
    side.bench = side.bench.filter((p) => p.id !== inId);
    side.out.add(outId);
    side.subsUsed++;
    side.cacheKey = -1;
    side.played.add(inId);
    side.subImpact.set(inId, mod);

    let how = 'entra no lugar de';
    if (mod > 0.35) how = 'entra com tudo no lugar de';
    else if (mod < -0.3) how = 'entra desligado no lugar de';
    this.push(idx, 'sub', `${side.ctx.club.short}: ${inP.name} (${ESTILOS[inP.style].curto}) ${how} ${out.p.name}.`, inId);
    if (mod < -0.3 && side.ctx.isUser) {
      this.push(idx, 'info', `${inP.name} parece sem ritmo e sem confiança — pode atrapalhar.`, inId);
    }

    // Veterano tirado cedo por técnico bem mais novo: reclama.
    const coachAge = side.ctx.coachAge ?? 45;
    if (side.ctx.isUser && !out.injured && out.p.age >= 30 && out.p.age - coachAge >= 6 && this.minute < 70) {
      side.respeitoDelta.set(outId, (side.respeitoDelta.get(outId) ?? 0) - 3);
      this.push(idx, 'reclamacao', `${out.p.name} sai reclamando e nem cumprimenta o técnico.`, outId);
    }
    return { ok: true };
  }

  private autoReplace(idx: 0 | 1, out: OnField): boolean {
    const side = this.sides[idx];
    if (side.subsUsed >= MAX_SUBS || !side.bench.length) return false;
    const setor = setorOf(out.pos);
    const sameSector = side.bench.filter((p) => setorOf(p.pos) === setor);
    const pool = sameSector.length ? sameSector : side.bench.filter((p) => p.pos !== 'G');
    if (!pool.length) return false;
    const best = pool.reduce((a, b) => (b.force * (0.7 + 0.3 * b.energy / 100) > a.force * (0.7 + 0.3 * a.energy / 100) ? b : a));
    return this.substitute(idx, out.p.id, best.id).ok;
  }

  private aiSubs() {
    if (this.half !== 2) return;
    const windows = [58, 68, 78, 85];
    if (!windows.includes(this.minute)) return;
    this.sides.forEach((side, i) => {
      if (side.ctx.isUser) return;
      const tired = side.onField
        .filter((f) => f.pos !== 'G' && (f.injured || f.p.energy < 45) && f.enteredAt === 0)
        .sort((a, b) => a.p.energy - b.p.energy)
        .slice(0, 2);
      for (const f of tired) this.autoReplace(i as 0 | 1, f);
    });
  }

  // ---------------- Pênaltis ----------------

  private penaltyShootout() {
    const rng = this.rng;
    const takers = this.sides.map((s) =>
      [...s.onField].filter((f) => f.pos !== 'G').sort((a, b) => b.p.force * b.mult[E.penk] - a.p.force * a.mult[E.penk])
        .concat(s.onField.filter((f) => f.pos === 'G')));
    const keepers = this.sides.map((s) => s.onField.find((f) => f.pos === 'G'));
    const score: [number, number] = [0, 0];
    this.push(-1, 'penaltis', 'Empate no agregado: decisão por pênaltis!');
    const kick = (i: 0 | 1, n: number) => {
      const list = takers[i];
      if (!list.length) return;
      const t = list[n % list.length];
      const gk = keepers[1 - i];
      const side = this.sides[i];
      const other = this.sides[1 - i];
      const q = this.eff(side, t) * Math.pow(t.mult[E.penk], 2) * t.mult[E.shot];
      const g = gk ? this.eff(other, gk) * Math.pow(gk.mult[E.pen], 3) : q * 0.5;
      const p = clamp(0.76 + 0.12 * ((q - g) / (q + g)), 0.55, 0.92);
      const ok = rng.next() < p;
      if (ok) score[i]++;
      this.push(i, 'penaltis', `${t.p.name} ${ok ? 'converte' : 'perde'} (${score[0]} x ${score[1]})`, t.p.id);
    };
    for (let n = 0; n < 5; n++) {
      kick(0, n);
      kick(1, n);
      const left = 4 - n;
      if (score[0] > score[1] + left || score[1] > score[0] + left) break;
    }
    let n = 5;
    while (score[0] === score[1] && n < 30) {
      kick(0, n);
      kick(1, n);
      n++;
    }
    if (score[0] === score[1]) score[rng.chance(0.5) ? 0 : 1]++;
    this.pens = score;
  }

  /** Força média atual do time em campo (para a UI). */
  teamRating(idx: 0 | 1): number {
    const s = this.sides[idx];
    if (!s.onField.length) return 0;
    return s.onField.reduce((acc, f) => acc + this.eff(s, f), 0) / s.onField.length;
  }
}
