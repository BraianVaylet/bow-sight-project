import { checkEnv, type Env } from './env.schema.js';

/**
 * Carga el entorno y **corta el proceso** si algo falta.
 *
 * Es deliberado: es preferible que el deploy no levante a que levante y explote
 * a las 3 de la mañana con un `undefined`. El mensaje lista todo lo que falta,
 * no la primera variable que fallo.
 */
export function loadEnv(raw: Record<string, string | undefined> = process.env): Env {
  const { env, problems } = checkEnv(raw);
  if (!env) {
    const detail = problems.map((p) => `  - ${p.variable}: ${p.reason}`).join('\n');
    // Todavia no hay logger: si el entorno esta mal, el logger tampoco arranca.
    console.error(`No se puede arrancar. Problemas de configuracion:\n${detail}`);
    process.exit(1);
  }
  return env;
}

export type { Env } from './env.schema.js';
