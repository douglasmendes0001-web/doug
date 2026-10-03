import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.douglas.futebolmanager',
  appName: 'Futebol Visionário',
  webDir: 'dist',
  android: { backgroundColor: '#0d1f17' },
  plugins: {
    // Ícones claros na barra de status (o fundo do jogo é escuro) e áreas
    // seguras repassadas ao CSS (--safe-area-inset-*).
    SystemBars: { style: 'DARK', insetsHandling: 'css' },
  },
};

export default config;
