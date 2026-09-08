import type { ErrorCode } from '@bow-sight/types';

/** Codigos del modulo `MARK`, declarados en `docs/errors.md`. */
export const MARK_ERRORS = {
  notFound: { code: 'BS-MARK-404-001', status: 404, messageKey: 'errors.mark.notFound' },
  outOfScale: { code: 'BS-MARK-409-002', status: 409, messageKey: 'errors.mark.outOfScale' },
  duplicateDistance: {
    code: 'BS-MARK-409-003',
    status: 409,
    messageKey: 'errors.mark.duplicateDistance',
  },
  notEnoughMarks: {
    code: 'BS-MARK-422-004',
    status: 422,
    messageKey: 'errors.mark.notEnoughMarks',
  },
  badDistance: { code: 'BS-MARK-400-005', status: 400, messageKey: 'errors.mark.badDistance' },
  staleWrite: { code: 'BS-MARK-409-006', status: 409, messageKey: 'errors.mark.staleWrite' },
  badAngle: { code: 'BS-MARK-400-007', status: 400, messageKey: 'errors.mark.badAngle' },
} as const satisfies Record<string, { code: ErrorCode; status: number; messageKey: string }>;
