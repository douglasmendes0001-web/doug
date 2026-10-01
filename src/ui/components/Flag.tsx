import { PAISES } from '../../engine/data/paises';
import type { CountryCode } from '../../engine/types';

export function Flag({ country }: { country: CountryCode }) {
  const colors = PAISES[country]?.flag ?? ['#888'];
  return (
    <span className="flag" title={PAISES[country]?.name}>
      {colors.map((c, i) => <span key={i} style={{ background: c }} />)}
    </span>
  );
}
