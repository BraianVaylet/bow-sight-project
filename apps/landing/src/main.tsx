import { ViteReactSSG } from 'vite-react-ssg';
import { routes } from './routes.js';
import './styles.css';

/**
 * `ViteReactSSG` hidrata en el navegador y prerenderiza en el build: el mismo
 * codigo produce HTML servible y una app interactiva.
 */
export const createRoot = ViteReactSSG({ routes });
