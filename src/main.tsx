// @ts-ignore
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'
import { registerServiceWorker } from './utils/pwa';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);

// Register service worker for PWA functionality
registerServiceWorker();
