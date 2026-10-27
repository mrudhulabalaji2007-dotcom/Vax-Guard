import mongoose, { Schema, Document } from 'mongoose';

export interface IVaccine extends Document {
  name: string;
  code: string;
  manufacturer: string;
  defaultSafeMinTemp: number;
  defaultSafeMaxTemp: number;
  shelfLifeMonths: number;
  sensitivity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  recommendedStorageType: string;
  description: string;
}

const VaccineSchema = new Schema<IVaccine>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true },
    manufacturer: { type: String, required: true },
    defaultSafeMinTemp: { type: Number, default: 2.0 },
    defaultSafeMaxTemp: { type: Number, default: 8.0 },
    shelfLifeMonths: { type: Number, default: 24 },
    sensitivity: { type: String, enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'], default: 'HIGH' },
    recommendedStorageType: { type: String, default: 'ILR (Ice-Lined Refrigerator)' },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Vaccine = mongoose.model<IVaccine>('Vaccine', VaccineSchema);
