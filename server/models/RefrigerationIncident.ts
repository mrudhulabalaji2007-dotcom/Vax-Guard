import mongoose, { Schema, Document } from 'mongoose';

export interface IRefrigerationIncident extends Document {
  warehouseId: string;
  warehouseName: string;
  initialTemp: number;
  peakTemp: number;
  safeLimit: number;
  powerStatus: 'ON' | 'OFF';
  refrigerationStatus: 'NORMAL' | 'WARNING' | 'FAILURE';
  durationMinutes: number;
  affectedVaccineDoses: number;
  estimatedLossValue: number; // in INR
  actionsTaken: string[];
  resolved: boolean;
  resolvedAt?: Date;
  incidentNotes?: string;
  createdAt: Date;
}

const RefrigerationIncidentSchema = new Schema<IRefrigerationIncident>(
  {
    warehouseId: { type: String, required: true },
    warehouseName: { type: String, required: true },
    initialTemp: { type: Number, required: true },
    peakTemp: { type: Number, required: true },
    safeLimit: { type: Number, default: 8.0 },
    powerStatus: { type: String, enum: ['ON', 'OFF'], default: 'OFF' },
    refrigerationStatus: {
      type: String,
      enum: ['NORMAL', 'WARNING', 'FAILURE'],
      default: 'FAILURE',
    },
    durationMinutes: { type: Number, default: 45 },
    affectedVaccineDoses: { type: Number, default: 12000 },
    estimatedLossValue: { type: Number, default: 450000 },
    actionsTaken: [{ type: String }],
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    incidentNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const RefrigerationIncident = mongoose.model<IRefrigerationIncident>(
  'RefrigerationIncident',
  RefrigerationIncidentSchema
);
