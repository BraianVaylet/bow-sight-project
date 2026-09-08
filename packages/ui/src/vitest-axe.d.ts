/**
 * `vitest-axe` no publica la augmentation de sus matchers, asi que
 * `toHaveNoViolations` no existe para TypeScript hasta que se declara aca.
 */
import 'vitest';

declare module 'vitest' {
  interface Assertion<T = unknown> {
    toHaveNoViolations: () => T;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations: () => void;
  }
}
