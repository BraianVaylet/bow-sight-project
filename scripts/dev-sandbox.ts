import { startEphemeralApi, stopOnSignals } from './ephemeral-api.js';

/**
 * `pnpm dev:sandbox` — la API lista para probar la app, sin instalar nada.
 *
 * 🔴 Los datos viven mientras viva el proceso. Para trabajar sobre datos que
 * duren, hace falta un Mongo propio **con replica set** y `pnpm dev`.
 */
const api = await startEphemeralApi({ verbose: true });
stopOnSignals(api);

process.stdout.write(
  [
    '',
    `  API          ${api.url}`,
    `  Contrato     ${api.url}/api/v1/docs`,
    `  Buzon        ${api.mailboxUrl}   ← el enlace de verificacion sale de aca`,
    '',
    '  Base efimera en memoria: al cerrar esto, se borra todo.',
    '',
  ].join('\n'),
);
