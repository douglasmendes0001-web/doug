// Bandeiras desenhadas em SVG com as cores e os elementos principais das
// bandeiras reais (proporção 3:2), mostradas num círculo.

import type { ReactNode } from 'react';
import { PAISES } from '../../engine/data/paises';
import type { CountryCode } from '../../engine/types';

const W = 30;
const H = 20;

/** Faixas horizontais (de cima para baixo), com pesos opcionais. */
function horizontais(cores: string[], pesos = cores.map(() => 1)): ReactNode {
  const total = pesos.reduce((a, b) => a + b, 0);
  let y = 0;
  return cores.map((c, i) => {
    const h = (H * pesos[i]) / total;
    const el = <rect key={`h${i}`} x={0} y={y} width={W} height={h + 0.05} fill={c} />;
    y += h;
    return el;
  });
}

/** Faixas verticais (da esquerda para a direita). */
function verticais(cores: string[], pesos = cores.map(() => 1)): ReactNode {
  const total = pesos.reduce((a, b) => a + b, 0);
  let x = 0;
  return cores.map((c, i) => {
    const w = (W * pesos[i]) / total;
    const el = <rect key={`v${i}`} x={x} y={0} width={w + 0.05} height={H} fill={c} />;
    x += w;
    return el;
  });
}

function estrela(cx: number, cy: number, r: number, fill: string, key?: string): ReactNode {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.4;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return <polygon key={key} points={pts.join(' ')} fill={fill} />;
}

function listras(n: number, a: string, b: string): ReactNode {
  return Array.from({ length: n }, (_, i) => <rect key={`l${i}`} x={0} y={(H * i) / n} width={W} height={H / n + 0.05} fill={i % 2 === 0 ? a : b} />);
}

const DESENHOS: Partial<Record<CountryCode, () => ReactNode>> = {
  BRA: () => (
    <>
      <rect width={W} height={H} fill="#009c3b" />
      <polygon points="3,10 15,2 27,10 15,18" fill="#ffdf00" />
      <circle cx={15} cy={10} r={4.6} fill="#002776" />
      <path d="M10.6 9.2 Q15 7.8 19.4 10.6" stroke="#fff" strokeWidth={0.8} fill="none" />
    </>
  ),
  ARG: () => (<>{horizontais(['#74acdf', '#ffffff', '#74acdf'])}<circle cx={15} cy={10} r={2.2} fill="#f6b40e" /></>),
  CHI: () => (<><rect width={W} height={H} fill="#d52b1e" /><rect width={W} height={10} fill="#fff" /><rect width={10} height={10} fill="#0039a6" />{estrela(5, 5, 2.6, '#fff')}</>),
  COL: () => horizontais(['#fcd116', '#003893', '#ce1126'], [2, 1, 1]),
  ECU: () => (<>{horizontais(['#ffdd00', '#034ea2', '#ed1c24'], [2, 1, 1])}<ellipse cx={15} cy={9.5} rx={2.4} ry={3} fill="#7d5a2b" /></>),
  BOL: () => horizontais(['#d52b1e', '#f9e300', '#007934']),
  PAR: () => (<>{horizontais(['#d52b1e', '#ffffff', '#0038a8'])}<circle cx={15} cy={10} r={2} fill="none" stroke="#1b5e20" strokeWidth={0.7} /></>),
  PER: () => verticais(['#d91023', '#ffffff', '#d91023']),
  URU: () => (<>{listras(9, '#ffffff', '#0038a8')}<rect width={11} height={11.1} fill="#fff" /><circle cx={5.5} cy={5.5} r={3} fill="#fcd116" /></>),
  VEN: () => (
    <>
      {horizontais(['#ffcc00', '#00247d', '#cf142b'])}
      {Array.from({ length: 8 }, (_, i) => {
        const a = Math.PI * (0.9 - i * 0.114);
        return <circle key={i} cx={15 + 5 * Math.cos(a)} cy={11.5 - 4 * Math.sin(a)} r={0.55} fill="#fff" />;
      })}
    </>
  ),
  ENG: () => (<><rect width={W} height={H} fill="#fff" /><rect x={13} width={4} height={H} fill="#ce1124" /><rect y={8} width={W} height={4} fill="#ce1124" /></>),
  ESP: () => horizontais(['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1]),
  GER: () => horizontais(['#000000', '#dd0000', '#ffce00']),
  FRA: () => verticais(['#0055a4', '#ffffff', '#ef4135']),
  ITA: () => verticais(['#009246', '#ffffff', '#ce2b37']),
  POR: () => (<>{verticais(['#006600', '#ff0000'], [2, 3])}<circle cx={12} cy={10} r={3.6} fill="#ffcc00" /><circle cx={12} cy={10} r={2} fill="#fff" stroke="#ff0000" strokeWidth={0.6} /></>),
  NED: () => horizontais(['#ae1c28', '#ffffff', '#21468b']),
  SCO: () => (<><rect width={W} height={H} fill="#005eb8" /><path d="M0 0 L30 20 M30 0 L0 20" stroke="#fff" strokeWidth={3.4} /></>),
  TUR: () => (<><rect width={W} height={H} fill="#e30a17" /><circle cx={11} cy={10} r={5} fill="#fff" /><circle cx={12.3} cy={10} r={4} fill="#e30a17" />{estrela(18, 10, 2.4, '#fff')}</>),
  GRE: () => (<>{listras(9, '#0d5eaf', '#ffffff')}<rect width={11.1} height={11.1} fill="#0d5eaf" /><rect x={4.45} width={2.2} height={11.1} fill="#fff" /><rect y={4.45} width={11.1} height={2.2} fill="#fff" /></>),
  KSA: () => (<><rect width={W} height={H} fill="#006c35" /><rect x={7} y={6} width={16} height={4} rx={1} fill="#fff" opacity={0.9} /><rect x={8} y={13} width={14} height={1.2} fill="#fff" /></>),
  JPN: () => (<><rect width={W} height={H} fill="#fff" /><circle cx={15} cy={10} r={6} fill="#bc002d" /></>),
  KOR: () => (
    <>
      <rect width={W} height={H} fill="#fff" />
      <path d="M10 10 A5 5 0 0 1 20 10 Z" fill="#cd2e3a" />
      <path d="M10 10 A5 5 0 0 0 20 10 Z" fill="#0047a0" />
      {[[5, 4], [25, 4], [5, 16], [25, 16]].map(([x, y], i) => <rect key={i} x={x - 2} y={y - 1.5} width={4} height={3} fill="#000" transform={`rotate(${i === 0 || i === 3 ? 34 : -34} ${x} ${y})`} />)}
    </>
  ),
  QAT: () => (<><rect width={W} height={H} fill="#8a1538" /><polygon points={`0,0 8,0 ${Array.from({ length: 9 }, (_, i) => `${i % 2 === 0 ? 11 : 8},${(i + 1) * (20 / 9)}`).join(' ')} 0,20`} fill="#fff" /></>),
  UAE: () => (<>{horizontais(['#00732f', '#ffffff', '#000000'])}<rect width={8} height={H} fill="#ff0000" /></>),
  EGY: () => (<>{horizontais(['#ce1126', '#ffffff', '#000000'])}<circle cx={15} cy={10} r={1.8} fill="#c09300" /></>),
  MAR: () => (<><rect width={W} height={H} fill="#c1272d" /><polygon points="15,5 16.2,8.9 20.2,8.9 17,11.3 18.2,15.2 15,12.8 11.8,15.2 13,11.3 9.8,8.9 13.8,8.9" fill="none" stroke="#006233" strokeWidth={0.9} /></>),
  TUN: () => (<><rect width={W} height={H} fill="#e70013" /><circle cx={15} cy={10} r={5} fill="#fff" /><circle cx={14.4} cy={10} r={3.4} fill="#e70013" /><circle cx={15.4} cy={10} r={2.8} fill="#fff" />{estrela(16, 10, 1.8, '#e70013')}</>),
  RSA: () => (
    <>
      <rect width={W} height={10} fill="#e03c31" />
      <rect y={10} width={W} height={10} fill="#001489" />
      <path d="M0 0 L13 10 L0 20 M13 10 L30 10" stroke="#fff" strokeWidth={6} fill="none" />
      <path d="M0 0 L13 10 L0 20 M13 10 L30 10" stroke="#007749" strokeWidth={3.6} fill="none" />
      <polygon points="0,3 9,10 0,17" fill="#ffb612" />
      <polygon points="0,4.8 6.8,10 0,15.2" fill="#000" />
    </>
  ),
  ALG: () => (<>{verticais(['#006233', '#ffffff'])}<circle cx={15} cy={10} r={4.2} fill="#d21034" /><circle cx={16.2} cy={10} r={3.4} fill={'#fff'} />{estrela(17.4, 10, 1.8, '#d21034')}</>),
  NGA: () => verticais(['#008751', '#ffffff', '#008751']),
  MEX: () => (<>{verticais(['#006847', '#ffffff', '#ce1126'])}<circle cx={15} cy={10} r={2.3} fill="#8c6239" /><path d="M12.8 11.6 Q15 13.6 17.2 11.6" stroke="#2e7d32" strokeWidth={0.7} fill="none" /></>),
  USA: () => (
    <>
      {listras(13, '#b22234', '#ffffff')}
      <rect width={12} height={10.8} fill="#3c3b6e" />
      {Array.from({ length: 20 }, (_, i) => <circle key={i} cx={1.4 + (i % 5) * 2.3} cy={1.4 + Math.floor(i / 5) * 2.6} r={0.5} fill="#fff" />)}
    </>
  ),
  CAN: () => (
    <>
      {verticais(['#d80621', '#ffffff', '#d80621'], [1, 2, 1])}
      <polygon points="15,3.5 16.2,6 17.8,5.5 17.2,8.6 19.4,7.4 19,9 20.4,9.6 18.4,11.4 18.8,12.8 15.6,12.4 15.6,15.4 14.4,15.4 14.4,12.4 11.2,12.8 11.6,11.4 9.6,9.6 11,9 10.6,7.4 12.8,8.6 12.2,5.5 13.8,6" fill="#d80621" />
    </>
  ),
  CRC: () => horizontais(['#002b7f', '#ffffff', '#ce1126', '#ffffff', '#002b7f'], [1, 1, 2, 1, 1]),
  HON: () => (<>{horizontais(['#0073cf', '#ffffff', '#0073cf'])}{[[15, 10], [12, 8.6], [18, 8.6], [12, 11.4], [18, 11.4]].map(([x, y], i) => estrela(x, y, 0.9, '#0073cf', `e${i}`))}</>),
  GUA: () => (<>{verticais(['#4997d0', '#ffffff', '#4997d0'])}<circle cx={15} cy={10} r={2.2} fill="none" stroke="#4caf50" strokeWidth={0.8} /></>),
  SLV: () => (<>{horizontais(['#0f47af', '#ffffff', '#0f47af'])}<circle cx={15} cy={10} r={1.8} fill="none" stroke="#c9a227" strokeWidth={0.6} /></>),
  PAN: () => (
    <>
      <rect width={W} height={H} fill="#fff" />
      <rect x={15} width={15} height={10} fill="#da121a" />
      <rect y={10} width={15} height={10} fill="#072357" />
      {estrela(7.5, 5, 2.4, '#072357')}
      {estrela(22.5, 15, 2.4, '#da121a')}
    </>
  ),
  JAM: () => (
    <>
      <rect width={W} height={H} fill="#009b3a" />
      <polygon points="0,0 15,10 0,20" fill="#000" />
      <polygon points="30,0 15,10 30,20" fill="#000" />
      <path d="M0 0 L30 20 M30 0 L0 20" stroke="#fed100" strokeWidth={3} />
    </>
  ),
  NZL: () => (
    <>
      <rect width={W} height={H} fill="#00247d" />
      <path d="M0 0 L15 10 M15 0 L0 10" stroke="#fff" strokeWidth={2} />
      <path d="M0 0 L15 10 M15 0 L0 10" stroke="#cc142b" strokeWidth={0.8} />
      <rect x={6} width={3} height={10} fill="#fff" /><rect y={3.5} width={15} height={3} fill="#fff" />
      <rect x={6.75} width={1.5} height={10} fill="#cc142b" /><rect y={4.25} width={15} height={1.5} fill="#cc142b" />
      {[[23, 4], [20, 9], [26, 8], [23, 16]].map(([x, y], i) => estrela(x, y, 1.3, '#cc142b', `n${i}`))}
    </>
  ),
};

export function FlagSvg({ country }: { country: CountryCode }) {
  const desenho = DESENHOS[country];
  const cores = PAISES[country]?.flag ?? ['#888'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true">
      {desenho ? desenho() : verticais(cores)}
    </svg>
  );
}

export function Flag({ country }: { country: CountryCode }) {
  return (
    <span className="flag" title={PAISES[country]?.name}>
      <FlagSvg country={country} />
    </span>
  );
}
