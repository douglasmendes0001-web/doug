import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { installBackButton } from './ui/back';
import './ui/styles.css';

installBackButton();

createRoot(document.getElementById('root')!).render(<App />);
