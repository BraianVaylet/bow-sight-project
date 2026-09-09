import { startEphemeralApi, stopOnSignals } from '../../scripts/ephemeral-api.js';

/**
 * La API de los E2E.
 *
 * El arnes vive en `scripts/ephemeral-api.ts` porque el sandbox local usa
 * exactamente el mismo: una base real, con transacciones, que no haya que
 * instalar. Aca va callado, para no ensuciar la salida de Playwright.
 */
stopOnSignals(await startEphemeralApi({ port: 3000 }));
