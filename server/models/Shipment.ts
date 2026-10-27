import mongoose, { Schema, Document } from 'mongoose';

export interface IShipment extends Document {
  trackingId: string;
  vaccineName: string;
  batchNumber: string;
  quantity: number;
  origin: string;
  destination: string;
  currentTemperature: number;
  safeMinTemperature: number;
  safeMaxTemperature: number;
  expectedTravelTime: number; // hours
  remainingTravelTime: number; // hours
  status: 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED' | 'FLAGGED' | 'ACCEPTED' | 'AT_RISK';
  departureTime: Date;
  eta: Date;
  riskScore: number; // 0 - 100
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  predictedExcursionMinutes: number; // estimated minutes until breach or 0
  recommendedAction: string;
  currentRoute: string;
  driverName: string;
  driverPhone: string;
  vehicleReg: string;
  storageUnit: string;
  receivedStatus?: 'PENDING' | 'ACCEPTED' | 'FLAGGED';
  receivedAt?: Date;
  receivedBy?: string;
  receivingNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShipmentSchema = new Schema<IShipment>(
  {
    trackingId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    vaccineName: { type: String, required: true, trim: true },
    batchNumber: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    origin: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    currentTemperature: { type: Number, required: true },
    safeMinTemperature: { type: Number, default: 2.0 },
    safeMaxTemperature: { type: Number, default: 8.0 },
    expectedTravelTime: { type: Number, required: true, min: 0.1 },
    remainingTravelTime: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['IN_TRANSIT', 'DELIVERED', 'DELAYED', 'FLAGGED', 'ACCEPTED', 'AT_RISK'],
      default: 'IN_TRANSIT',
    },
    departureTime: { type: Date, default: Date.now },
    eta: { type: Date, required: true },
    riskScore: { type: Number, default: 15, min: 0, max: 100 },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
      default: 'LOW',
    },
    predictedExcursionMinutes: { type: Number, default: 0 },
    recommendedAction: { type: String, default: 'Maintain current transport conditions.' },
    currentRoute: { type: String, default: 'National Cold Corridor Highway' },
    driverName: { type: String, default: 'K. Rajan' },
    driverPhone: { type: String, default: '+91 94432 10987' },
    vehicleReg: { type: String, default: 'TN-01-CV-9821 (Reefer Van)' },
    storageUnit: { type: String, default: 'Active Carrier TC-500' },
    receivedStatus: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'FLAGGED'],
      default: 'PENDING',
    },
    receivedAt: { type: Date },
    receivedBy: { type: String },
    receivingNotes: { type: String },
  },
  { timestamps: true }
);

export const Shipment = mongoose.model<IShipment>('Shipment', ShipmentSchema);
