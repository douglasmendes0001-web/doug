// Ícones em SVG (traço simples) para a barra de navegação.

const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const IconBall = () => (
  <svg viewBox="0 0 32 32" {...common}>
    <circle cx="16" cy="16" r="12" />
    <path d="M16 9.5l5 3.6-1.9 5.9h-6.2L11 13.1z" fill="currentColor" stroke="none" />
    <path d="M16 4v5.5M21 13.1l6.2-2.6M19.1 19l3.8 5.2M12.9 19l-3.8 5.2M11 13.1l-6.2-2.6" />
  </svg>
);

export const IconCalendar = () => (
  <svg viewBox="0 0 32 32" {...common}>
    <rect x="5" y="7" width="22" height="20" rx="2" />
    <path d="M5 12h22M10 4v5M22 4v5" />
    <path d="M9.5 16h3M14.5 16h3M19.5 16h3M9.5 20.5h3M14.5 20.5h3M19.5 20.5h3" />
  </svg>
);

export const IconMail = () => (
  <svg viewBox="0 0 32 32" {...common}>
    <rect x="4" y="8" width="24" height="17" rx="2" />
    <path d="M4.5 9l11.5 9 11.5-9" />
  </svg>
);

export const IconTrophy = () => (
  <svg viewBox="0 0 32 32" {...common}>
    <path d="M10 5h12v7a6 6 0 01-12 0z" />
    <path d="M10 7H6a4 4 0 004 5M22 7h4a4 4 0 01-4 5M16 18v4M11 27h10M12.5 22h7v5h-7z" />
  </svg>
);

export const IconStadium = () => (
  <svg viewBox="0 0 32 32" {...common}>
    <ellipse cx="16" cy="12" rx="12" ry="5" />
    <path d="M4 12v8c0 2.8 5.4 5 12 5s12-2.2 12-5v-8" />
    <ellipse cx="16" cy="12" rx="6" ry="2.2" />
    <path d="M9 23.5v-4M16 25v-4M23 23.5v-4" />
  </svg>
);

export const IconShirt = () => (
  <svg viewBox="0 0 32 32" {...common}>
    <path d="M11 5l-6 4 3 5 3-1.5V27h10V12.5l3 1.5 3-5-6-4c-1 2-3 3-5 3s-4-1-5-3z" />
  </svg>
);

export const IconGear = () => (
  <svg viewBox="0 0 32 32" {...common}>
    <circle cx="16" cy="16" r="4" />
    <path d="M16 4v4M16 24v4M4 16h4M24 16h4M7.5 7.5l2.8 2.8M21.7 21.7l2.8 2.8M7.5 24.5l2.8-2.8M21.7 10.3l2.8-2.8" />
  </svg>
);
