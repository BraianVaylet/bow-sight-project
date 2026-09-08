import type { ErrorCode } from '@bow-sight/types';

/** Codigos del modulo `EQUIP`, declarados en `docs/errors.md`. */
export const EQUIPMENT_ERRORS = {
  notFound: { code: 'BS-EQUIP-404-001', status: 404, messageKey: 'errors.equipment.notFound' },
  arrowSetInUse: {
    code: 'BS-EQUIP-409-002',
    status: 409,
    messageKey: 'errors.equipment.arrowSetInUse',
  },
  incompleteSpecs: {
    code: 'BS-EQUIP-400-003',
    status: 400,
    messageKey: 'errors.equipment.incompleteSpecs',
  },
} as const satisfies Record<string, { code: ErrorCode; status: number; messageKey: string }>;
