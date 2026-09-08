import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';
import * as matchers from 'vitest-axe/matchers';

expect.extend(matchers);

// Sin `globals: true`, Testing Library no registra su limpieza automatica y el
// DOM de un test sobrevive al siguiente: las consultas encuentran de a dos.
afterEach(cleanup);
