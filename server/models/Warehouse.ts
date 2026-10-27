import mongoose, { Schema, Document } from 'mongoose';

export interface IWarehouse extends Document {
  name: string;
  code: string;
  location: string;
  state: string;
  storageCapacity: number; // in vials/doses
  currentOccupancy: number;
  safeMinTemperature: number;
  safeMaxTemperature: number;
  currentTemperature: number;
  targetTemperature: number;
  powerStatus: 'ON' | 'OFF';
  refrigerationStatus: 'NORMAL' | 'WARNING' | 'FAILURE';
  backupPowerAvailable: boolean;
  backupPowerStatus: 'STANDBY' | 'ACTIVE' | 'OFFLINE';
  estimatedSafeHoldingTime: number; // minutes
  activeAlertsCount: number;
  managerName: string;
  managerContact: string;
  roomCount: number;
  lastInspectionDate: Date;
  ambientTemperature: number;
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseSchema = new Schema<IWarehouse>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    location: { type: String, required: true },
    state: { type: String, default: 'Tamil Nadu' },
    storageCapacity: { type: Number, required: true },
    currentOccupancy: { type: Number, default: 0 },
    safeMinTemperature: { type: Number, default: 2.0 },
    safeMaxTemperature: { type: Number, default: 8.0 },
    currentTemperature: { type: Number, default: 4.5 },
    targetTemperature: { type: Number, default: 4.0 },
    powerStatus: { type: String, enum: ['ON', 'OFF'], default: 'ON' },
    refrigerationStatus: {
      type: String,
      enum: ['NORMAL', 'WARNING', 'FAILURE'],
      default: 'NORMAL',
    },
    backupPowerAvailable: { type: Boolean, default: true },
    backupPowerStatus: {
      type: String,
      enum: ['STANDBY', 'ACTIVE', 'OFFLINE'],
      default: 'STANDBY',
    },
    estimatedSafeHoldingTime: { type: Number, default: 180 }, // 3 hours initial holding buffer
    activeAlertsCount: { type: Number, default: 0 },
    managerName: { type: String, default: 'S. Ramanathan' },
    managerContact: { type: String, default: '+91 94441 23456' },
    roomCount: { type: Number, default: 4 },
    lastInspectionDate: { type: Date, default: Date.now },
    ambientTemperature: { type: Number, default: 32.0 },
  },
  { timestamps: true }
);

export const Warehouse = mongoose.model<IWarehouse>('Warehouse', WarehouseSchema);
