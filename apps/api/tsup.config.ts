import { defineConfig } from 'tsup';

/**
 * Empaqueta la API en un solo archivo, con los paquetes del workspace adentro.
 *
 * Por que bundle y no `tsc` a secas: `@bow-sight/*` publica **TypeScript
 * crudo** (`main` apunta a `src/index.ts`). Eso anda bajo `tsx` y bajo Vitest,
 * que transpilan al vuelo, pero `node dist/index.js` no puede cargar un `.ts` y
 * el proceso muere al arrancar. Se descubrio corriendo el build, no leyendolo.
 *
 * La alternativa —darle un paso de build a cada paquete compartido— son seis
 * builds mas y un orden de compilacion que mantener. Aca el unico que necesita
 * salida ejecutable es la API.
 */
export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  // Los paquetes del workspace se inlinean; las dependencias de npm no.
  noExternal: [/^@bow-sight\//],
  sourcemap: true,
  clean: true,
});
