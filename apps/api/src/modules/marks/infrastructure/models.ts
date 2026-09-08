import { MARK_ORIGINS } from '@bow-sight/types';
import type { Connection } from 'mongoose';
import { modelOn, ownedSchema, type OwnedDoc } from '../../../persistence/base.js';

export interface MarkDoc extends OwnedDoc {
  sightId: string;
  arrowSetId: string;
  /** 🔴 Canonico: metros. */
  distanceM: number;
  /** 🔴 Canonico: milimetros. */
  scaleValueMm: number;
  origin: (typeof MARK_ORIGINS)[number];
  conditions?: { tempC?: number; altitudeM?: number };
  notes?: string;
}

export function markModel(connection: Connection) {
  return modelOn<MarkDoc>(
    connection,
    'mark',
    ownedSchema('mark', {
      sightId: { type: String, required: true },
      arrowSetId: { type: String, required: true },
      distanceM: { type: Number, required: true },
      scaleValueMm: { type: Number, required: true },
      // Solo `measured` se guarda: `computed` se calcula al vuelo y `seeded` lo
      // hara la balistica, ninguna se persiste como si el arquero la hubiera tirado.
      origin: { type: String, enum: MARK_ORIGINS, default: 'measured' },
      conditions: {
        type: { tempC: Number, altitudeM: Number },
        default: undefined,
        _id: false,
      },
      notes: String,
    }),
  );
}
