import mongoose, { Schema, Document } from 'mongoose';

export interface IInventory extends Document {
  vaccineName: string;
  batchNumber: string;
  manufacturer: string;
  facilityType: 'HOSPITAL' | 'REGIONAL_WAREHOUSE';
  facilityId: string;
  facilityName: string;
  availableDoses: number;
  reservedDoses: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  safeMinTemperature: number;
  safeMaxTemperature: number;
  currentStorageTemperature: number;
  expiryDate: Date;
  lastAuditedAt: Date;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL_SHORTAGE' | 'EXPIRED';
}

const InventorySchema = new Schema<IInventory>(
  {
    vaccineName: { type: String, required: true },
    batchNumber: { type: String, required: true },
    manufacturer: { type: String, required: true },
    facilityType: { type: String, enum: ['HOSPITAL', 'REGIONAL_WAREHOUSE'], default: 'HOSPITAL' },
    facilityId: { type: String, required: true },
    facilityName: { type: String, required: true },
    availableDoses: { type: Number, required: true, default: 500 },
    reservedDoses: { type: Number, default: 50 },
    lowStockThreshold: { type: Number, default: 150 },
    isLowStock: { type: Boolean, default: false },
    safeMinTemperature: { type: Number, default: 2.0 },
    safeMaxTemperature: { type: Number, default: 8.0 },
    currentStorageTemperature: { type: Number, default: 4.8 },
    expiryDate: { type: Date, required: true },
    lastAuditedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['IN_STOCK', 'LOW_STOCK', 'CRITICAL_SHORTAGE', 'EXPIRED'],
      default: 'IN_STOCK',
    },
  },
  { timestamps: true }
);

export const Inventory = mongoose.models.Inventory || mongoose.model<IInventory>('Inventory', InventorySchema);
