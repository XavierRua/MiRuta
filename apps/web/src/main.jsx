import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SesionProvider } from './context/SesionContext';
import { ConfigProvider } from './context/ConfigContext';
import { ProgramacionProvider } from './context/ProgramacionContext';
import './theme/styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider>
      <SesionProvider>
        <ProgramacionProvider>
          <App />
        </ProgramacionProvider>
      </SesionProvider>
    </ConfigProvider>
  </StrictMode>,
);
