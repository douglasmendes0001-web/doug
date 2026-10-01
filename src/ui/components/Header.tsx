import { useLoadedGame } from '../game';
import { compOf, nextUserFixture } from '../../engine/season';
import { fixtureRoundLabel, positionIn, userLeagueComp } from '../../engine/standings';
import { confClass, dateOf, formatMoney } from '../format';

function ConfBar({ label, value }: { label: string; value: number }) {
  return (
    <>
      <div className="bar-label">{label}</div>
      <div className="conf-bar">
        <div className="conf-track"><div className={`conf-fill ${confClass(value)}`} style={{ width: `${value}%` }} /></div>
        <span>{Math.round(value)}%</span>
      </div>
    </>
  );
}

export function Header() {
  const { state } = useLoadedGame();
  const club = state.clubs[state.userClubId];
  const league = userLeagueComp(state);
  const pos = league && (league.aggregate[club.id]?.p ?? 0) > 0 ? positionIn(league, club.id) : undefined;
  const fx = nextUserFixture(state);
  let nextLines: string[] = ['Sem jogos marcados nesta temporada'];
  if (fx) {
    const comp = compOf(state, fx);
    const home = fx.home === club.id;
    const oppId = home ? fx.away : fx.home;
    const opp = state.clubs[oppId];
    const oppPos = positionIn(comp, oppId);
    const where = fx.neutral ? 'N' : home ? 'C' : 'F';
    nextLines = [
      `${comp.def.short} - ${fixtureRoundLabel(state, fx)}`,
      `${where} - ${opp.name}${oppPos && comp.def.stages[fx.stageIdx].type !== 'ko' ? ` (${oppPos}º)` : ''} · ${dateOf(state, fx.slot)}`,
    ];
  }
  return (
    <div className="club-header" style={{ ['--club-c2' as string]: club.colors[0] }}>
      <div style={{ minWidth: 0 }}>
        <div className="club-bar">{club.name}{pos ? ` (${pos}º)` : ''}</div>
        <div className="coach-name">{state.coach.name}</div>
        <div className="next-title">Próximo Jogo</div>
        {nextLines.map((l, i) => <div className="next-line" key={i}>{l}</div>)}
      </div>
      <div className="header-right">
        <div className="header-date">{dateOf(state, Math.min(state.slot, 103))}</div>
        <ConfBar label="Confiança Diretoria" value={state.coach.confDiretoria} />
        <ConfBar label="Confiança Torcida" value={state.coach.confTorcida} />
        <div className="money">{formatMoney(club.money)}</div>
      </div>
    </div>
  );
}
