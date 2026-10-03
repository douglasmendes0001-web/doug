// Arte de despedida do técnico: números da carreira, passagens pelos clubes
// (com escudo, anos e honrarias), parede de troféus e grandes momentos.

import { careerTotals, resumoCarreira } from '../../engine/career';
import type { CompKind, GameState, GrandeMomento, TipoMomento } from '../../engine/types';
import { ClubCrest, Trophy, trophyKind } from './Art';

interface Taca {
  nome: string;
  compId: string;
  kind: CompKind;
  anos: number[];
}

const ORDEM: Partial<Record<CompKind, number>> = { mundial: 0, continental: 1, liga: 2, copa: 3, estadual: 4 };

/** Agrupa os títulos do técnico por competição (com o tipo do troféu). */
export function tacasDoTecnico(state: GameState): Taca[] {
  const porNome = new Map<string, Taca>();
  const momentos = (state.coach.momentos ?? []).filter((m) => m.tipo === 'titulo');
  for (const t of state.coach.titles) {
    const m = /^(.*) (\d{4})$/.exec(t);
    const nome = m ? m[1] : t;
    const ano = m ? Number(m[2]) : 0;
    const mom = momentos.find((x) => x.compName === nome);
    const def = state.competitions.find((c) => c.def.name === nome)?.def;
    const taca = porNome.get(nome) ?? { nome, compId: mom?.compId ?? def?.id ?? nome, kind: mom?.kind ?? def?.kind ?? 'liga', anos: [] };
    if (ano) taca.anos.push(ano);
    porNome.set(nome, taca);
  }
  return [...porNome.values()].sort((a, b) => (ORDEM[a.kind] ?? 9) - (ORDEM[b.kind] ?? 9) || b.anos.length - a.anos.length);
}

const ICONE: Record<TipoMomento, string> = {
  estreia: '🎬', clube: '✍️', titulo: '🏆', goleada: '⚽', acesso: '⬆️', honra: '👑', marco: '⭐', adeus: '👋',
};

/** Os momentos mais marcantes primeiro na escolha, mostrados em ordem cronológica. */
function destaques(momentos: GrandeMomento[], max = 14): GrandeMomento[] {
  const peso: Record<TipoMomento, number> = { titulo: 0, honra: 1, acesso: 2, estreia: 3, adeus: 3, goleada: 4, marco: 5, clube: 6 };
  const escolhidos = momentos
    .map((m, i) => ({ m, i }))
    .sort((a, b) => peso[a.m.tipo] - peso[b.m.tipo] || (a.m.kind && b.m.kind ? (ORDEM[a.m.kind] ?? 9) - (ORDEM[b.m.kind] ?? 9) : 0) || a.i - b.i)
    .slice(0, max);
  return escolhidos.sort((a, b) => a.i - b.i).map((x) => x.m);
}

export function RetirementArt({ state }: { state: GameState }) {
  const c = state.coach;
  const r = resumoCarreira(c);
  const tacas = tacasDoTecnico(state);
  const historia = c.history ?? [];
  const momentos = destaques(c.momentos ?? []);
  const ultimo = state.clubs[historia[historia.length - 1]?.clubId ?? state.userClubId];
  const pc = c.playerCareer;
  const totaisJogador = pc ? careerTotals(pc) : undefined;

  return (
    <div className="art-card retire-art" style={{ ['--c1' as string]: ultimo?.colors[0] ?? '#1d5c3a', ['--c2' as string]: ultimo?.colors[1] ?? '#e6c35c' }}>
      <div className="title-rays" />
      <div className="retire-glow" />
      <div className="art-kicker">Fim de carreira · {r.inicio ?? state.year}–{r.fim ?? state.year}</div>
      <div className="art-big">OBRIGADO,</div>
      <div className="art-name retire-name">{c.name}</div>
      <div className="art-sub">
        {r.temporadas} temporada{r.temporadas === 1 ? '' : 's'} · {r.clubes} clube{r.clubes === 1 ? '' : 's'} · aposentado aos {c.age} anos
      </div>

      <div className="retire-stats">
        <div><b>{r.jogos}</b><span>jogos</span></div>
        <div><b>{c.wins}</b><span>vitórias</span></div>
        <div><b>{c.draws}</b><span>empates</span></div>
        <div><b>{c.losses}</b><span>derrotas</span></div>
        <div><b>{r.aproveitamento}%</b><span>aproveit.</span></div>
        <div className="gold-cell"><b>{r.titulos}</b><span>títulos</span></div>
      </div>

      {historia.length > 0 && (
        <>
          <div className="retire-h">Passagens como técnico</div>
          <div className="retire-stints">
            {historia.map((h, i) => {
              const club = state.clubs[h.clubId];
              return (
                <div key={i} className="retire-stint">
                  {club && <ClubCrest club={club} size={40} />}
                  <div className="grow">
                    <b>{h.clubName}</b> {h.honor && <span className={`honor-tag ${h.honor}`}>{h.honor === 'lenda' ? 'LENDA' : 'ÍDOLO'}</span>}
                    <div className="small">{h.fromYear}–{h.toYear ?? state.year} · {h.games} jogos · {h.wins} vitórias</div>
                  </div>
                  <span className="retire-titles">{h.titles.length > 0 ? `🏆 ${h.titles.length}` : ''}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tacas.length > 0 && (
        <>
          <div className="retire-h">Galeria de troféus</div>
          <div className="retire-trophies">
            {tacas.map((t, i) => (
              <div key={t.nome} className="retire-trophy">
                <Trophy kind={trophyKind(t.kind, t.compId)} size={54} id={`ret${i}`} />
                <b>{t.anos.length}x</b>
                <span>{t.nome}</span>
                <small>{t.anos.join(', ')}</small>
              </div>
            ))}
          </div>
        </>
      )}

      {momentos.length > 0 && (
        <>
          <div className="retire-h">Grandes momentos</div>
          <div className="retire-moments">
            {momentos.map((m, i) => (
              <div key={i} className={`retire-moment t-${m.tipo}`}>
                <span className="ico">{ICONE[m.tipo]}</span>
                <span className="yr">{m.year}</span>
                <span className="txt">{m.texto}{m.tipo !== 'clube' && m.tipo !== 'estreia' && m.clubName && !m.texto.includes(m.clubName) ? ` · ${m.clubName}` : ''}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {pc && totaisJogador && (
        <p className="small retire-player">
          Antes da prancheta, {pc.games} jogos, {pc.goals} gols e {totaisJogador.total} título{totaisJogador.total === 1 ? '' : 's'} como jogador.
        </p>
      )}
    </div>
  );
}
