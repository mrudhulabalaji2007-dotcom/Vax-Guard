import mongoose, { Schema, Document } from 'mongoose';

export interface ITemperatureLog extends Document {
  shipmentId: mongoose.Types.ObjectId | string;
  trackingId: string;
  temperature: number;
  ambientTemperature: number;
  location: string;
  recordedAt: Date;
  source: 'SENSOR_AUTOMATED' | 'MANUAL_ENTRY' | 'SIMULATION';
  isExcursion: boolean;
  batteryLevel?: number;
  humidity?: number;
}

const TemperatureLogSchema = new Schema<ITemperatureLog>(
  {
    shipmentId: { type: Schema.Types.Mixed, required: true },
    trackingId: { type: String, required: true },
    temperature: { type: Number, required: true },
    ambientTemperature: { type: Number, default: 28.5 },
    location: { type: String, default: 'Transit Checkpoint' },
    recordedAt: { type: Date, default: Date.now },
    source: {
      type: String,
      enum: ['SENSOR_AUTOMATED', 'MANUAL_ENTRY', 'SIMULATION'],
      default: 'SENSOR_AUTOMATED',
    },
    isExcursion: { type: Boolean, default: false },
    batteryLevel: { type: Number, default: 92 },
    humidity: { type: Number, default: 55 },
  },
  { timestamps: true }
);

export const TemperatureLog = mongoose.model<ITemperatureLog>('TemperatureLog', TemperatureLogSchema);
