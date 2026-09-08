import type { RouteRecord } from 'vite-react-ssg';
import { Layout } from './Layout.js';
import { Home } from './pages/Home.js';
import { Privacidad, Terminos } from './pages/Legal.js';
import { Precios } from './pages/Precios.js';

/**
 * Las rutas que se prerenderizan.
 *
 * Cada hija lleva su `entry`: `vite-react-ssg` lo necesita para partir el bundle
 * por ruta.
 */
export const routes: RouteRecord[] = [
  {
    path: '/',
    element: <Layout />,
    entry: 'src/Layout.tsx',
    children: [
      { index: true, Component: Home, entry: 'src/pages/Home.tsx' },
      { path: 'precios', Component: Precios, entry: 'src/pages/Precios.tsx' },
      { path: 'terminos', Component: Terminos, entry: 'src/pages/Legal.tsx' },
      { path: 'privacidad', Component: Privacidad, entry: 'src/pages/Legal.tsx' },
    ],
  },
];
