// Clima da partida: depende do país da sede, do mês e da altitude.

import { PAISES } from './data/paises';
import type { Rng } from './rng';
import type { Club, Clima } from './types';

export interface MatchWeather {
  clima: Clima;
  temperature: number;
}

export function generateWeather(rng: Rng, venue: Club, month: number): MatchWeather {
  const meta = PAISES[venue.country];
  const seasonal = meta.amp * Math.cos((2 * Math.PI * (month - meta.hotMonth)) / 12);
  // Jogos à noite e altitude derrubam a temperatura (~0,65 °C a cada 100 m).
  const temperature = Math.round(meta.temp + seasonal - venue.altitude / 155 - 2 + rng.normal(0, 3));
  let clima: Clima = 'normal';
  if (rng.chance(meta.rain)) clima = 'chuva';
  else if (temperature >= 29) clima = 'calor';
  else if (temperature <= 7) clima = 'frio';
  return { clima, temperature };
}

export const CLIMA_LABEL: Record<Clima, string> = {
  normal: 'Tempo bom',
  chuva: 'Chuva',
  frio: 'Frio',
  calor: 'Calor forte',
};

/** Multiplicador de desgaste físico pelo clima, considerando a adaptação do time. */
export function weatherDrain(clima: Clima, hotness: number): number {
  switch (clima) {
    case 'calor': return 1.2 + 0.3 * (1 - hotness);
    case 'chuva': return 1.08;
    case 'frio': return 0.92;
    default: return 1;
  }
}

/** Multiplicador técnico pelo clima. Times de clima quente sofrem no frio e vice-versa. */
export function weatherTechnique(clima: Clima, hotness: number): number {
  switch (clima) {
    case 'calor': return 1 - 0.045 * (1 - hotness);
    case 'frio': return 1 - 0.035 * hotness;
    case 'chuva': return 0.97;
    default: return 1;
  }
}

/** Diferença de altitude (km acima de 1000 m de diferença) que o visitante sente. */
export function altitudeGap(venueAltitude: number, teamHomeAltitude: number): number {
  return Math.max(0, (venueAltitude - teamHomeAltitude - 1000) / 1000);
}
