import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { toast } from 'sonner';
import { DEFAULT_SONNER_OPTIONS } from './utils/general.ts';
import { QueryError } from './utils/query.ts';
import { scan } from 'react-scan';

const rootElem = document.getElementById('root');
if (!rootElem) {
  throw new Error('Root element not found');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof QueryError) {
        toast.error(error.message, DEFAULT_SONNER_OPTIONS);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error instanceof QueryError) {
        toast.error(error.message, DEFAULT_SONNER_OPTIONS);
      }
    },
  }),
});

// Be careful with this, it makes hmr significantly slower
// scan({
//   enabled: true,
// });
ReactDOM.createRoot(rootElem).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
