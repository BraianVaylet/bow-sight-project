import type { ErrorCode } from '@bow-sight/types';

/** Codigos del modulo `SIGHT`, declarados en `docs/errors.md`. */
export const SIGHT_ERRORS = {
  notFound: { code: 'BS-SIGHT-404-001', status: 404, messageKey: 'errors.sight.notFound' },
  badScaleRange: {
    code: 'BS-SIGHT-400-002',
    status: 400,
    messageKey: 'errors.sight.badScaleRange',
  },
  marksOutsideNewRange: {
    code: 'BS-SIGHT-409-003',
    status: 409,
    messageKey: 'errors.sight.marksOutsideNewRange',
  },
  locked: { code: 'BS-SIGHT-403-004', status: 403, messageKey: 'errors.sight.locked' },
  missingClickSize: {
    code: 'BS-SIGHT-400-005',
    status: 400,
    messageKey: 'errors.sight.missingClickSize',
  },
} as const satisfies Record<string, { code: ErrorCode; status: number; messageKey: string }>;
