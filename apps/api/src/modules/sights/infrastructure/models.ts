import { SCALE_UNITS, SIGHT_STATUSES, DISTANCE_UNITS } from '@bow-sight/types';
import type { Connection } from 'mongoose';
import { modelOn, ownedSchema, type OwnedDoc } from '../../../persistence/base.js';

export interface SightDoc extends OwnedDoc {
  name: string;
  /** 🔴 Canonico en milimetros. La unidad de abajo es solo para mostrar. */
  scaleMinMm: number;
  scaleMaxMm: number;
  scaleUnit: (typeof SCALE_UNITS)[number];
  clickSizeMm?: number | null;
  distanceUnit?: (typeof DISTANCE_UNITS)[number] | null;
  bowSetupId?: string | null;
  defaultArrowSetId?: string | null;
  status: (typeof SIGHT_STATUSES)[number];
}

export function sightModel(connection: Connection) {
  return modelOn<SightDoc>(
    connection,
    'sight',
    ownedSchema('sight', {
      name: { type: String, required: true },
      scaleMinMm: { type: Number, required: true },
      scaleMaxMm: { type: Number, required: true },
      scaleUnit: { type: String, enum: SCALE_UNITS, default: 'cm' },
      clickSizeMm: { type: Number, default: null },
      distanceUnit: { type: String, enum: [...DISTANCE_UNITS, null], default: null },
      bowSetupId: { type: String, default: null },
      defaultArrowSetId: { type: String, default: null },
      // `locked` es a donde caen las miras que exceden el limite del plan:
      // legibles e imprimibles, no editables (ADR-003).
      status: { type: String, enum: SIGHT_STATUSES, default: 'active' },
    }),
  );
}
