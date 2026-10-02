// Artes do jogo em SVG: logo "Futebol Visionário", troféus por tipo de
// competição, apresentação do técnico, celebração de título e homenagem.

import type { ReactNode } from 'react';
import type { Club, CompKind, Honra } from '../../engine/types';

// ---------------- Logo ----------------

export function GameLogo({ size = 280 }: { size?: number }) {
  return (
    <svg viewBox="0 0 300 300" width={size} height={size} overflow="visible" role="img" aria-label="Futebol Visionário: Modo Carreira" className="game-logo">
      <defs>
        <linearGradient id="lg-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe79a" />
          <stop offset="0.5" stopColor="#e6c35c" />
          <stop offset="1" stopColor="#a8822a" />
        </linearGradient>
        <radialGradient id="lg-iris" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#0b1611" />
          <stop offset="0.35" stopColor="#0b1611" />
          <stop offset="0.4" stopColor="#4ea35f" />
          <stop offset="0.85" stopColor="#1b5e2c" />
          <stop offset="1" stopColor="#e6c35c" />
        </radialGradient>
        <radialGradient id="lg-glow" cx="0.5" cy="0.45" r="0.55">
          <stop offset="0" stopColor="rgba(230,195,92,0.35)" />
          <stop offset="1" stopColor="rgba(230,195,92,0)" />
        </radialGradient>
      </defs>
      <circle cx="150" cy="140" r="138" fill="url(#lg-glow)" />
      {/* Escudo */}
      <path d="M150 18 L250 50 L244 150 C238 205 198 240 150 262 C102 240 62 205 56 150 L50 50 Z" fill="#0f2419" stroke="url(#lg-gold)" strokeWidth="6" />
      <path d="M150 34 L236 61 L231 149 C226 196 192 226 150 245 C108 226 74 196 69 149 L64 61 Z" fill="none" stroke="rgba(230,195,92,0.35)" strokeWidth="2" />
      {/* Estrelas */}
      {[-30, 0, 30].map((dx, i) => (
        <path key={i} transform={`translate(${150 + dx} ${i === 1 ? 52 : 58}) scale(${i === 1 ? 1.15 : 0.9})`}
          d="M0 -9 L2.6 -2.8 L9 -2.8 L3.9 1.2 L5.6 7.6 L0 3.9 L-5.6 7.6 L-3.9 1.2 L-9 -2.8 L-2.6 -2.8 Z" fill="url(#lg-gold)" />
      ))}
      {/* Bola com o "olho" visionário */}
      <circle cx="150" cy="138" r="56" fill="#f4f1e6" stroke="#0b1611" strokeWidth="3" />
      {[0, 72, 144, 216, 288].map((a) => (
        <g key={a} transform={`rotate(${a} 150 138)`}>
          <path d="M150 82 L160 98 L150 106 L140 98 Z" fill="#0b1611" />
          <line x1="150" y1="106" x2="150" y2="114" stroke="#0b1611" strokeWidth="2.5" />
        </g>
      ))}
      <path d="M108 138 C124 114 176 114 192 138 C176 162 124 162 108 138 Z" fill="#f4f1e6" stroke="#0b1611" strokeWidth="4" />
      <circle cx="150" cy="138" r="19" fill="url(#lg-iris)" />
      <circle cx="157" cy="131" r="4.5" fill="#fff" />
      {/* Faixa */}
      <path d="M38 196 L262 196 L250 214 L262 232 L38 232 L50 214 Z" fill="url(#lg-gold)" stroke="#6e5418" strokeWidth="2" />
      <text x="150" y="220" textAnchor="middle" fontFamily="Roboto, system-ui, sans-serif" fontWeight="900" fontSize="17" letterSpacing="4" fill="#1c1606">MODO CARREIRA</text>
    </svg>
  );
}

export function GameTitle() {
  return (
    <div className="game-title">
      <div className="game-title-1">FUTEBOL</div>
      <div className="game-title-2">VISIONÁRIO</div>
    </div>
  );
}

// ---------------- Troféus ----------------

export type TrophyKind = 'liga' | 'copa' | 'estadual' | 'continental' | 'continental-maior' | 'mundial';

export function trophyKind(kind: CompKind, compId: string): TrophyKind {
  if (kind === 'mundial') return 'mundial';
  if (kind === 'continental') return compId === 'LIB' || compId === 'UCL' ? 'continental-maior' : 'continental';
  if (kind === 'estadual') return 'estadual';
  if (kind === 'copa') return 'copa';
  return 'liga';
}

export function Trophy({ kind, size = 120, id = 'tr' }: { kind: TrophyKind; size?: number; id?: string }) {
  const prata = kind === 'estadual';
  const g = `${id}-${kind}`;
  const metal = (
    <defs>
      <linearGradient id={g} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={prata ? '#8d969b' : '#a8822a'} />
        <stop offset="0.35" stopColor={prata ? '#eef2f4' : '#ffe79a'} />
        <stop offset="0.6" stopColor={prata ? '#c3cbcf' : '#e6c35c'} />
        <stop offset="1" stopColor={prata ? '#7b8488' : '#8c6a1f'} />
      </linearGradient>
    </defs>
  );
  const base = (
    <g>
      <rect x="38" y="140" width="44" height="10" rx="2" fill="#2b1d0e" />
      <rect x="32" y="148" width="56" height="10" rx="2" fill="#1c130a" />
    </g>
  );
  const fill = `url(#${g})`;
  let body: ReactNode;
  switch (kind) {
    case 'liga':
      // Taça alta com tampa (troféu de liga).
      body = (
        <g>
          <path d="M40 30 L80 30 L76 82 C74 96 66 104 60 106 C54 104 46 96 44 82 Z" fill={fill} />
          <path d="M38 24 L82 24 L80 32 L40 32 Z" fill={fill} />
          <circle cx="60" cy="16" r="7" fill={fill} />
          <path d="M44 40 C30 42 28 66 46 72" fill="none" stroke={fill} strokeWidth="5" />
          <path d="M76 40 C90 42 92 66 74 72" fill="none" stroke={fill} strokeWidth="5" />
          <rect x="55" y="104" width="10" height="20" fill={fill} />
          <path d="M44 124 L76 124 L80 140 L40 140 Z" fill={fill} />
          <path d="M52 50 L68 50 M54 62 L66 62" stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
        </g>
      );
      break;
    case 'copa':
    case 'estadual':
      // Copa clássica de duas alças.
      body = (
        <g transform={kind === 'estadual' ? 'translate(12 20) scale(0.8)' : undefined}>
          <path d="M32 26 L88 26 C88 70 76 92 60 96 C44 92 32 70 32 26 Z" fill={fill} />
          <path d="M34 34 C14 34 14 70 42 74" fill="none" stroke={fill} strokeWidth="6" />
          <path d="M86 34 C106 34 106 70 78 74" fill="none" stroke={fill} strokeWidth="6" />
          <rect x="54" y="94" width="12" height="26" fill={fill} />
          <path d="M42 120 L78 120 L82 140 L38 140 Z" fill={fill} />
          <path d="M44 40 C48 62 54 74 60 78" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="3" />
          {kind === 'estadual' && <path d="M50 120 L42 150 L52 146 L56 156 L60 130 Z" fill="#c4161c" />}
        </g>
      );
      break;
    case 'continental':
      body = (
        <g>
          <path d="M36 22 L84 22 C84 66 74 88 60 92 C46 88 36 66 36 22 Z" fill={fill} />
          <path d="M38 30 C18 26 12 62 44 70" fill="none" stroke={fill} strokeWidth="5" />
          <path d="M82 30 C102 26 108 62 76 70" fill="none" stroke={fill} strokeWidth="5" />
          <rect x="55" y="90" width="10" height="30" fill={fill} />
          <path d="M40 120 L80 120 L84 140 L36 140 Z" fill={fill} />
          <circle cx="60" cy="48" r="8" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
        </g>
      );
      break;
    case 'continental-maior':
      // "Orelhuda": alças enormes.
      body = (
        <g>
          <path d="M40 18 L80 18 C80 64 72 86 60 90 C48 86 40 64 40 18 Z" fill={fill} />
          <path d="M42 22 C2 14 2 92 48 76" fill="none" stroke={fill} strokeWidth="7" />
          <path d="M78 22 C118 14 118 92 72 76" fill="none" stroke={fill} strokeWidth="7" />
          <path d="M54 88 L66 88 L70 120 L50 120 Z" fill={fill} />
          <path d="M38 120 L82 120 L86 140 L34 140 Z" fill={fill} />
          <path d="M48 26 C50 52 54 70 60 76" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="3" />
        </g>
      );
      break;
    case 'mundial':
      // Globo sustentado por faixas em espiral.
      body = (
        <g>
          <circle cx="60" cy="40" r="26" fill={fill} />
          {/* Continentes e meridianos do globo */}
          <path d="M44 26 C50 22 58 24 60 30 C62 36 54 38 52 44 C50 50 44 48 42 42 C40 36 40 30 44 26 Z M66 22 C72 20 80 26 78 32 C76 36 70 34 68 30 Z M64 42 C70 40 78 44 76 52 C74 58 66 60 64 54 C62 50 62 46 64 42 Z" fill="rgba(90,62,12,0.55)" />
          <ellipse cx="60" cy="40" rx="11" ry="26" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1.2" />
          <ellipse cx="60" cy="40" rx="26" ry="9" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1.2" />
          <circle cx="60" cy="40" r="26" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
          <path d="M42 60 C30 80 50 96 46 120 M78 60 C90 80 70 96 74 120 M60 66 L60 120" fill="none" stroke={fill} strokeWidth="8" />
          <path d="M38 118 L82 118 L86 140 L34 140 Z" fill={fill} />
          <rect x="40" y="128" width="40" height="5" fill="#1b5e2c" />
        </g>
      );
      break;
  }
  return (
    <svg viewBox="0 0 120 160" width={size} height={(size * 160) / 120} className="trophy">
      {metal}
      {body}
      {base}
    </svg>
  );
}

// ---------------- Escudo genérico do clube ----------------

export function ClubCrest({ club, size = 110 }: { club: Club; size?: number }) {
  const [c1, c2] = club.colors;
  return (
    <svg viewBox="0 0 100 120" width={size} height={size * 1.2}>
      <path d="M50 4 L94 18 L90 66 C87 92 70 108 50 116 C30 108 13 92 10 66 L6 18 Z" fill={c1} stroke="#e6c35c" strokeWidth="4" />
      <path d="M50 4 L50 116 C70 108 87 92 90 66 L94 18 Z" fill={c2} opacity="0.85" />
      <rect x="18" y="46" width="64" height="24" rx="4" fill="rgba(0,0,0,0.55)" />
      <text x="50" y="64" textAnchor="middle" fontFamily="Roboto, system-ui, sans-serif" fontWeight="900" fontSize="17" fill="#fff">{club.short}</text>
    </svg>
  );
}

// ---------------- Telas de arte ----------------

function sobrenome(n: string) {
  const parts = n.trim().split(' ');
  return (parts[parts.length - 1] || n).toUpperCase();
}

export function WelcomeArt({ club, coach, year, honor }: { club: Club; coach: string; year: number; honor?: Honra }) {
  const [c1, c2] = club.colors;
  const titulo = honor === 'lenda' ? 'O RETORNO DA LENDA' : honor === 'idolo' ? 'O RETORNO DO ÍDOLO' : 'BEM-VINDO';
  return (
    <div className="art-card welcome-art" style={{ ['--c1' as string]: c1, ['--c2' as string]: c2 }}>
      <div className="welcome-stripes" />
      <div className="welcome-lights" />
      <div className="art-kicker">Apresentação oficial · Temporada {year}</div>
      <div className="art-big">{titulo}</div>
      <ClubCrest club={club} size={96} />
      <svg viewBox="0 0 200 170" className="welcome-shirt">
        <path d="M60 10 L30 26 L8 60 L34 74 L46 56 L46 160 L154 160 L154 56 L166 74 L192 60 L170 26 L140 10 C132 24 116 30 100 30 C84 30 68 24 60 10 Z" fill={c1} stroke="rgba(255,255,255,0.6)" strokeWidth="3" />
        <path d="M60 10 C68 24 84 30 100 30 C116 30 132 24 140 10" fill="none" stroke={c2} strokeWidth="6" />
        <text x="100" y="72" textAnchor="middle" fontFamily="Roboto, system-ui, sans-serif" fontWeight="900" fontSize="20" fill={c2} stroke="rgba(0,0,0,0.35)" strokeWidth="0.6">{sobrenome(coach).slice(0, 12)}</text>
        <text x="100" y="134" textAnchor="middle" fontFamily="Roboto, system-ui, sans-serif" fontWeight="900" fontSize="54" fill={c2} stroke="rgba(0,0,0,0.35)" strokeWidth="0.8">{String(year).slice(2)}</text>
      </svg>
      <div className="art-name">{coach}</div>
      <div className="art-sub">{honor ? `de volta ao ${club.name}` : `é o novo técnico do ${club.name}`}</div>
    </div>
  );
}

const CANAL_NOME = { torcida: 'Torcida', midia: 'Mídia', diretoria: 'Diretoria', jogador: 'Jogadores' } as const;

export function TitleArt({ club, coach, year, compName, kind, compId, quotes }: {
  club: Club; coach: string; year: number; compName: string; kind: CompKind; compId: string;
  quotes: { channel: keyof typeof CANAL_NOME; text: string }[];
}) {
  const tk = trophyKind(kind, compId);
  return (
    <div className={`art-card title-art ${tk === 'mundial' || tk.startsWith('continental') ? 'internacional' : ''}`}>
      <div className="title-rays" />
      <div className="confetti">{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * 0.35}s`, background: i % 3 === 0 ? club.colors[0] : i % 3 === 1 ? '#e6c35c' : club.colors[1] }} />)}</div>
      <div className="art-kicker">{tk === 'mundial' ? 'Campeão do mundo' : tk.startsWith('continental') ? 'Campeão continental' : 'Campeão'} · {year}</div>
      <Trophy kind={tk} size={150} id="title" />
      <div className="art-big">CAMPEÃO!</div>
      <div className="art-name">{compName}</div>
      <div className="art-sub">{club.name} · técnico {coach}</div>
      <div className="art-quotes">
        {quotes.map((q) => (
          <div key={q.channel} className="art-quote"><b>{CANAL_NOME[q.channel]}</b>{q.text}</div>
        ))}
      </div>
    </div>
  );
}

export function LegendArt({ club, coach, honor, seasons, titles, year }: { club: Club; coach: string; honor: Honra; seasons: number; titles: number; year: number }) {
  return (
    <div className="art-card legend-art">
      <div className="title-rays" />
      <svg viewBox="0 0 220 160" className="laurel">
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i}>
            <ellipse cx={70 - i * 3} cy={140 - i * 15} rx="12" ry="5" transform={`rotate(${-50 + i * 7} ${70 - i * 3} ${140 - i * 15})`} fill="#e6c35c" />
            <ellipse cx={150 + i * 3} cy={140 - i * 15} rx="12" ry="5" transform={`rotate(${50 - i * 7} ${150 + i * 3} ${140 - i * 15})`} fill="#e6c35c" />
          </g>
        ))}
      </svg>
      <div className="legend-crest"><ClubCrest club={club} size={90} /></div>
      <div className="art-kicker">Homenagem eterna · {year}</div>
      <div className="art-big">{honor === 'lenda' ? 'LENDA' : 'ÍDOLO'}</div>
      <div className="art-name">{coach}</div>
      <div className="art-sub">{honor === 'lenda' ? 'Lenda' : 'Ídolo'} do {club.name} · {seasons} temporadas · {titles} título(s)</div>
      <p className="small" style={{ opacity: 0.85, position: 'relative' }}>Seu nome fica para sempre na galeria do clube, mesmo que um dia você saia.</p>
    </div>
  );
}
