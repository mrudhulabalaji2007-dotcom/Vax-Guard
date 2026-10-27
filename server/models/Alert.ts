import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  alertId: string;
  type:
    | 'Temperature Excursion'
    | 'Predictive High Risk'
    | 'Refrigeration Failure'
    | 'Route Risk'
    | 'Low Inventory'
    | 'Shipment Delay';
  severity: 'LOW' | 'WARNING' | 'HIGH' | 'CRITICAL';
  relatedShipmentId?: string;
  relatedShipmentTracking?: string;
  relatedWarehouseId?: string;
  relatedWarehouseName?: string;
  message: string;
  details: string;
  recommendedAction: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  timestamp: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
}

const AlertSchema = new Schema<IAlert>(
  {
    alertId: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: [
        'Temperature Excursion',
        'Predictive High Risk',
        'Refrigeration Failure',
        'Route Risk',
        'Low Inventory',
        'Shipment Delay',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'WARNING', 'HIGH', 'CRITICAL'],
      default: 'WARNING',
    },
    relatedShipmentId: { type: String },
    relatedShipmentTracking: { type: String },
    relatedWarehouseId: { type: String },
    relatedWarehouseName: { type: String },
    message: { type: String, required: true },
    details: { type: String, default: '' },
    recommendedAction: { type: String, default: '' },
    status: {
      type: String,
      enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'],
      default: 'ACTIVE',
    },
    timestamp: { type: Date, default: Date.now },
    acknowledgedBy: { type: String },
    acknowledgedAt: { type: Date },
    resolvedBy: { type: String },
    resolvedAt: { type: Date },
    resolutionNotes: { type: String },
  },
  { timestamps: true }
);

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);
