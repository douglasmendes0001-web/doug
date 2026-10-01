// Motor de partida minuto a minuto. O mesmo motor roda as partidas ao vivo
// do usuário (um passo por "minuto" de relógio) e as partidas simuladas.
//
// Fatores considerados: força, fôlego, respeito pelo técnico, ritmo de jogo,
// adequação de posição, mando de campo/torcida, clima, altitude, experiência
// do técnico e o impacto (positivo ou negativo) de cada substituição.

import { PAISES } from './data/paises';
import { assignPositions, MAX_SUBS, positionFit } from './lineup';
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
}

export type EventType = 'gol' | 'amarelo' | 'vermelho' | 'lesao' | 'sub' | 'info' | 'chance' | 'defesa' | 'penaltis' | 'reclamacao';

export interface MatchEvent {
  minute: string;
  side: 0 | 1 | -1;
  type: EventType;
  text: string;
  playerId?: number;
}

export interface OnField {
  p: Player;
  pos: Pos;
  /** Impacto da substituição (-1 a 1). */
  mod: number;
  injured: boolean;
  yellow: number;
  enteredAt: number;
}

export interface SideState {
  ctx: TeamContext;
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
  /** Ajustes de respeito gerados durante o jogo (substituições, etc.). */
  respeitoDelta: Map<number, number>;
  subImpact: Map<number, number>;
  played: Set<number>;
  injuredIds: Set<number>;
  /** Amarelos recebidos na partida por jogador. */
  yellows: Map<number, number>;
  hotness: number;
}

const BASE_DRAIN = 0.42;
/** Teto assintótico da vantagem relativa (log). Evita placares absurdos entre divisões muito distantes. */
const RATIO_CAP = Math.log(2.2);

/** Comprime razões de força: 1,5 → ~1,45; 2 → ~1,74; 5 → ~2,14. */
export function softRatio(r: number): number {
  return Math.exp(RATIO_CAP * Math.tanh(Math.log(Math.max(1e-6, r)) / RATIO_CAP));
}
const CHANCE_BASE = 0.097;
const GOAL_BASE = 0.27;

export class MatchSim {
  readonly sides: [SideState, SideState];
  readonly events: MatchEvent[] = [];
  minute = 0;
  half: 1 | 2 = 1;
  finished = false;
  pens?: [number, number];
  scorers: { side: 0 | 1; playerId: number; minute: number }[] = [];
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
    const posMap = assignPositions(starters, t.lineup.formation);
    const hotness = PAISES[t.club.country].hotness;
    // Cada time sente a altitude da sede em relação à da própria cidade.
    const gap = altitudeGap(this.ctx.venue.altitude, t.club.altitude);
    const homeBoost = !this.ctx.neutral && isHome ? 1.045 + 0.05 * this.ctx.crowd : 1;
    const coachFactor = 0.96 + 0.08 * (t.coachExperience / 100);
    const teamMult = homeBoost * weatherTechnique(this.ctx.weather.clima, hotness) * (1 - 0.025 * gap) * coachFactor;
    const drainMult = weatherDrain(this.ctx.weather.clima, hotness) * (1 + 0.3 * gap);
    return {
      ctx: t,
      onField: starters.map((p) => ({ p, pos: posMap.get(p.id) ?? p.pos, mod: 0, injured: false, yellow: 0, enteredAt: 0 })),
      bench: t.lineup.bench.map((id) => byId.get(id)).filter((p): p is Player => !!p),
      out: new Set(),
      sentOff: new Set(),
      subsUsed: 0,
      goals: 0, shots: 0, onTarget: 0, posse: 0,
      teamMult, drainMult, altGap: gap,
      respeitoDelta: new Map(),
      subImpact: new Map(),
      played: new Set(starters.map((p) => p.id)),
      injuredIds: new Set(),
      yellows: new Map(),
      hotness,
    };
  }

  // ---------------- Avaliação ----------------

  eff(side: SideState, f: OnField): number {
    const p = f.p;
    const fitness = 0.65 + 0.35 * (p.energy / 100);
    const moral = 0.9 + 0.2 * (p.respeito / 100);
    const ritmo = 0.95 + 0.07 * (p.oportunidade / 100);
    const sub = 1 + 0.12 * f.mod;
    const inj = f.injured ? 0.6 : 1;
    return p.force * fitness * moral * ritmo * positionFit(p.pos, f.pos) * side.teamMult * sub * inj;
  }

  private sector(side: SideState) {
    let def = 0, mid = 0, att = 0;
    let gk = 0;
    for (const f of side.onField) {
      const e = this.eff(side, f);
      const t = f.p.traits;
      const has = (x: string) => t[0] === x || t[1] === x;
      switch (f.pos) {
        case 'G':
          gk = e * (has('Reflexo') || has('Colocação') ? 1.05 : 1);
          break;
        case 'ZG':
          def += e * (has('Marcação') || has('Desarme') ? 1.04 : 1);
          break;
        case 'LD':
        case 'LE':
          def += 0.8 * e; mid += 0.3 * e; att += 0.15 * e * (has('Cruzamento') ? 1.15 : 1);
          break;
        case 'VOL':
          def += 0.5 * e * (has('Desarme') ? 1.04 : 1); mid += 0.6 * e * (has('Passe') ? 1.04 : 1); att += 0.1 * e;
          break;
        case 'MEI':
          def += 0.15 * e; mid += e * (has('Armação') || has('Passe') ? 1.04 : 1); att += 0.6 * e * (has('Drible') ? 1.03 : 1);
          break;
        case 'ATA':
          mid += 0.25 * e; att += e * (has('Velocidade') || has('Drible') ? 1.03 : 1);
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
    }
    this.minute++;
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
        let d = BASE_DRAIN * s.drainMult;
        if (p.age > 30) d *= 1 + (p.age - 30) * 0.02;
        if (p.traits.includes('Resistência')) d *= 0.85;
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
    const mr = Math.pow(softRatio(sh.mid / Math.max(1, sa.mid)), 0.8);
    const pHome = mr / (mr + 1);
    const attIdx: 0 | 1 = rng.next() < pHome ? 0 : 1;
    this.sides[attIdx].posse++;

    const att = this.sides[attIdx];
    const def = this.sides[1 - attIdx];
    const sAtt = attIdx === 0 ? sh : sa;
    const sDef = attIdx === 0 ? sa : sh;
    let chanceP = CHANCE_BASE * Math.pow(softRatio(sAtt.att / Math.max(1, sDef.def)), 0.4);
    // Time que perde no fim pressiona mais.
    const diff = att.goals - def.goals;
    if (this.half === 2 && this.minute >= 75 && diff < 0) chanceP *= 1.15;
    // Menos jogadores em campo = menos chances.
    chanceP *= att.onField.length / 11;
    chanceP = clamp(chanceP, 0.03, 0.22);

    if (rng.next() < chanceP) this.chance(attIdx, att, def, sDef.gk);
    for (let i = 0; i < 2; i++) this.discipline(i as 0 | 1);
    for (let i = 0; i < 2; i++) this.injuryCheck(i as 0 | 1);
  }

  private chance(attIdx: 0 | 1, att: SideState, def: SideState, gkEff: number) {
    const rng = this.rng;
    const weights: Record<Pos, number> = { ATA: 5, MEI: 3, LD: 1, LE: 1, VOL: 1, ZG: 0.6, G: 0 };
    const shooter = rng.weighted(att.onField, (f) => weights[f.pos] * (0.5 + f.p.force / 100));
    if (!shooter) return;
    let q = this.eff(att, shooter);
    const t = shooter.p.traits;
    if (t.includes('Finalização') || t.includes('Oportunismo')) q *= 1.08;
    if (t.includes('Cabeceio')) q *= 1.04;
    let pGoal = GOAL_BASE * Math.pow(softRatio(q / Math.max(1, gkEff)), 0.4);
    if (this.ctx.weather.clima === 'chuva') pGoal = 0.75 * pGoal + 0.25 * GOAL_BASE + 0.01; // bola molhada: mais imprevisível
    pGoal = clamp(pGoal, 0.05, 0.6);
    att.shots++;
    if (rng.next() < pGoal) {
      att.goals++;
      att.onTarget++;
      this.scorers.push({ side: attIdx, playerId: shooter.p.id, minute: this.minute });
      this.push(attIdx, 'gol', `GOL do ${att.ctx.club.short}! ${shooter.p.name}`, shooter.p.id);
    } else if (rng.chance(0.45)) {
      att.onTarget++;
      const gk = def.onField.find((f) => f.pos === 'G');
      this.push(attIdx, 'defesa', `${shooter.p.name} finaliza e ${gk ? gk.p.name : 'a defesa'} salva!`, shooter.p.id);
    } else if (rng.chance(0.3)) {
      this.push(attIdx, 'chance', `${shooter.p.name} arrisca e manda para fora.`, shooter.p.id);
    }
  }

  private discipline(idx: 0 | 1) {
    const rng = this.rng;
    const side = this.sides[idx];
    if (!side.onField.length) return;
    const temperamentais = side.onField.filter((f) => f.p.personality === 'temperamental').length / side.onField.length;
    let pFoul = 0.021 * (1 + 0.5 * temperamentais);
    if (this.ctx.weather.clima === 'chuva') pFoul *= 1.15;
    if (rng.next() < pFoul) {
      const f = rng.weighted(side.onField, (x) =>
        (x.p.personality === 'temperamental' ? 2 : 1) * (setorOf(x.pos) === 'DEF' || x.pos === 'VOL' ? 1.4 : 1) * (x.pos === 'G' ? 0.2 : 1));
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
    side.onField = side.onField.map((f) => (f === out ? { p: inP, pos: out.pos, mod, injured: false, yellow: 0, enteredAt: this.minute } : f));
    side.bench = side.bench.filter((p) => p.id !== inId);
    side.out.add(outId);
    side.subsUsed++;
    side.played.add(inId);
    side.subImpact.set(inId, mod);

    let how = 'entra no lugar de';
    if (mod > 0.35) how = 'entra com tudo no lugar de';
    else if (mod < -0.3) how = 'entra desligado no lugar de';
    this.push(idx, 'sub', `${side.ctx.club.short}: ${inP.name} ${how} ${out.p.name}.`, inId);
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
        .filter((f) => f.pos !== 'G' && (f.injured || f.p.energy < 62) && f.enteredAt === 0)
        .sort((a, b) => a.p.energy - b.p.energy)
        .slice(0, 2);
      for (const f of tired) this.autoReplace(i as 0 | 1, f);
    });
  }

  // ---------------- Pênaltis ----------------

  private penaltyShootout() {
    const rng = this.rng;
    const takers = this.sides.map((s) =>
      [...s.onField].filter((f) => f.pos !== 'G').sort((a, b) => b.p.force - a.p.force).concat(s.onField.filter((f) => f.pos === 'G')));
    const keepers = this.sides.map((s) => s.onField.find((f) => f.pos === 'G'));
    const score: [number, number] = [0, 0];
    this.push(-1, 'penaltis', 'Empate no agregado: decisão por pênaltis!');
    const kick = (i: 0 | 1, n: number) => {
      const list = takers[i];
      if (!list.length) return;
      const t = list[n % list.length];
      const gk = keepers[1 - i];
      const q = this.eff(this.sides[i], t) * (t.p.traits.includes('Finalização') ? 1.05 : 1);
      const g = gk ? this.eff(this.sides[1 - i], gk) * (gk.p.traits.includes('Pênaltis') ? 1.12 : 1) : q * 0.5;
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
