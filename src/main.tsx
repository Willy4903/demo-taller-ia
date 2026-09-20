import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { salesConfig } from './appConfigs/sales';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('No se encontró el elemento #root');

createRoot(rootElement).render(
  <StrictMode>
    <App config={salesConfig} />
  </StrictMode>,
);
