import mongoose, { Schema, Document } from 'mongoose';

export interface IHospital extends Document {
  name: string;
  code: string;
  district: string;
  city: string;
  address: string;
  type: 'GOVERNMENT_MEDICAL_COLLEGE' | 'DISTRICT_HEADQUARTERS' | 'PRIMARY_HEALTH_CENTRE' | 'COMMUNITY_HEALTH_CENTRE' | 'TERTIARY_HOSPITAL';
  inChargeName: string;
  inChargePhone: string;
  inChargeEmail: string;
  coldStorageType: string;
  coldStorageCapacityLitres: number;
  currentTemperature: number;
  temperatureStatus: 'NORMAL' | 'WARNING' | 'EXCURSION';
  activeVaccineDoses: number;
  lastStockUpdate: Date;
  status: 'ACTIVE' | 'MAINTENANCE' | 'ALERT';
}

const HospitalSchema = new Schema<IHospital>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    district: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String, required: true },
    type: {
      type: String,
      enum: ['GOVERNMENT_MEDICAL_COLLEGE', 'DISTRICT_HEADQUARTERS', 'PRIMARY_HEALTH_CENTRE', 'COMMUNITY_HEALTH_CENTRE', 'TERTIARY_HOSPITAL'],
      default: 'DISTRICT_HEADQUARTERS',
    },
    inChargeName: { type: String, required: true },
    inChargePhone: { type: String, required: true },
    inChargeEmail: { type: String, required: true },
    coldStorageType: { type: String, default: 'Ice-Lined Refrigerator (ILR) 300L' },
    coldStorageCapacityLitres: { type: Number, default: 300 },
    currentTemperature: { type: Number, default: 4.5 },
    temperatureStatus: { type: String, enum: ['NORMAL', 'WARNING', 'EXCURSION'], default: 'NORMAL' },
    activeVaccineDoses: { type: Number, default: 4500 },
    lastStockUpdate: { type: Date, default: Date.now },
    status: { type: String, enum: ['ACTIVE', 'MAINTENANCE', 'ALERT'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const Hospital = mongoose.models.Hospital || mongoose.model<IHospital>('Hospital', HospitalSchema);
