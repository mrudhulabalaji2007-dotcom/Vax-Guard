import mongoose, { Schema, Document } from 'mongoose';

export interface IRouteOption {
  name: string;
  routeName: string;
  distanceKm: number;
  estimatedTimeHours: number;
  coldStoragePoints: number;
  pointsDetails: string[];
  coldChainRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  routeScore: number; // 0-100 overall suitability
  isRecommended: boolean;
  reason: string;
  roadCondition: string;
  avgAmbientTemp: number;
  congestionLevel: string;
  waypoints: Array<{ name: string; lat: number; lng: number; isHub: boolean }>;
}

export interface IRouteEvaluation extends Document {
  origin: string;
  destination: string;
  vaccineName: string;
  currentTemperature: number;
  remainingTravelTime: number;
  routes: IRouteOption[];
  recommendedRoute: string;
  evaluationSummary: string;
  evaluatedAt: Date;
}

const RouteOptionSchema = new Schema<IRouteOption>({
  name: { type: String, required: true },
  routeName: { type: String, required: true },
  distanceKm: { type: Number, required: true },
  estimatedTimeHours: { type: Number, required: true },
  coldStoragePoints: { type: Number, required: true },
  pointsDetails: [{ type: String }],
  coldChainRisk: {
    type: String,
    enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
    required: true,
  },
  riskScore: { type: Number, required: true },
  routeScore: { type: Number, required: true },
  isRecommended: { type: Boolean, default: false },
  reason: { type: String, required: true },
  roadCondition: { type: String, default: 'Good 4-Lane Highway' },
  avgAmbientTemp: { type: Number, default: 30.5 },
  congestionLevel: { type: String, default: 'Low' },
  waypoints: [
    {
      name: { type: String },
      lat: { type: Number },
      lng: { type: Number },
      isHub: { type: Boolean, default: false },
    },
  ],
});

const RouteEvaluationSchema = new Schema<IRouteEvaluation>(
  {
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    vaccineName: { type: String, required: true },
    currentTemperature: { type: Number, required: true },
    remainingTravelTime: { type: Number, required: true },
    routes: [RouteOptionSchema],
    recommendedRoute: { type: String, required: true },
    evaluationSummary: { type: String, required: true },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const RouteEvaluation = mongoose.model<IRouteEvaluation>(
  'RouteEvaluation',
  RouteEvaluationSchema
);
