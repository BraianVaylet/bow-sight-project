import type { Connection } from 'mongoose';
import { modelOn, ownedSchema, type OwnedDoc } from '../../../persistence/base.js';

export interface BowSetupDoc extends OwnedDoc {
  name: string;
  brand?: string;
  model?: string;
  drawWeightLb?: number;
  ataIn?: number;
  braceHeightIn?: number;
  drawLengthIn?: number;
  notes?: string;
}

export interface ArrowSetDoc extends OwnedDoc {
  name: string;
  spine?: number;
  pointGrains?: number;
  lengthIn?: number;
  vane?: string;
  nock?: string;
  totalGrains?: number;
  speedFps?: number;
  vaneColor?: string;
  notes?: string;
}

export function equipmentModels(connection: Connection) {
  const bowSetup = modelOn<BowSetupDoc>(
    connection,
    'bowSetup',
    ownedSchema('bowSetup', {
      name: { type: String, required: true },
      brand: String,
      model: String,
      drawWeightLb: Number,
      ataIn: Number,
      braceHeightIn: Number,
      drawLengthIn: Number,
      notes: String,
    }),
  );

  const arrowSet = modelOn<ArrowSetDoc>(
    connection,
    'arrowSet',
    ownedSchema('arrowSet', {
      name: { type: String, required: true },
      spine: Number,
      pointGrains: Number,
      lengthIn: Number,
      vane: String,
      nock: String,
      totalGrains: Number,
      speedFps: Number,
      vaneColor: String,
      notes: String,
    }),
  );

  return { bowSetup, arrowSet };
}
