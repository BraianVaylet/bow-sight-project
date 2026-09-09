import { createQueryClient } from '@bow-sight/client';
import { ThemeProvider } from '@bow-sight/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './app/ErrorBoundary.js';
import { AppRoutes } from './app/routes.js';
import { UpdatePrompt } from './app/UpdatePrompt.js';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('falta #root en index.html');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={createQueryClient()}>
        <ThemeProvider>
          <BrowserRouter>
            <AppRoutes />
            <UpdatePrompt />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
