import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import NodapErrorBoundary from './components/NodapErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NodapErrorBoundary>
      <App />
    </NodapErrorBoundary>
  </StrictMode>,
);
