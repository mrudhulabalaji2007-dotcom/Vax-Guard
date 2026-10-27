import { Request, Response } from 'express';
import { calculatePredictiveRisk } from '../services/riskEngine.js';
import { Shipment } from '../models/Shipment.js';
import { TemperatureLog } from '../models/TemperatureLog.js';
import { findShipmentByIdOrTracking } from '../utils/dbHelpers.js';

export async function analyzeRisk(req: Request, res: Response): Promise<void> {
  try {
    const {
      shipmentId,
      currentTemperature,
      safeMinTemperature = 2.0,
      safeMaxTemperature = 8.0,
      remainingTravelTime = 4.0,
      temperatureHistory,
      vaccineSensitivity = 'HIGH',
    } = req.body;

    let effectiveTemp = currentTemperature;
    let effectiveHistory = temperatureHistory || [];
    let effectiveMin = safeMinTemperature;
    let effectiveMax = safeMaxTemperature;
    let effectiveRemaining = remainingTravelTime;
    let targetShipment: any = null;

    if (shipmentId) {
      targetShipment = await findShipmentByIdOrTracking(shipmentId);

      if (targetShipment) {
        effectiveTemp = targetShipment.currentTemperature;
        effectiveMin = targetShipment.safeMinTemperature;
        effectiveMax = targetShipment.safeMaxTemperature;
        effectiveRemaining = targetShipment.remainingTravelTime;

        if (!temperatureHistory || temperatureHistory.length === 0) {
          const logs = await TemperatureLog.find({
            $or: [{ shipmentId: targetShipment._id }, { trackingId: targetShipment.trackingId }],
          }).sort({ recordedAt: 1 });
          effectiveHistory = logs.map((l) => ({
            temperature: l.temperature,
            recordedAt: l.recordedAt,
          }));
        }
      }
    }

    if (effectiveTemp === undefined) {
      res.status(400).json({
        success: false,
        message: 'currentTemperature or a valid shipmentId is required for risk analysis.',
      });
      return;
    }

    const analysis = calculatePredictiveRisk({
      currentTemperature: Number(effectiveTemp),
      safeMinTemperature: Number(effectiveMin),
      safeMaxTemperature: Number(effectiveMax),
      remainingTravelTime: Number(effectiveRemaining),
      temperatureHistory: effectiveHistory,
      vaccineSensitivity,
    });

    // If linked to shipment, update its risk score in DB
    if (targetShipment) {
      targetShipment.riskScore = analysis.riskScore;
      targetShipment.riskLevel = analysis.riskLevel;
      targetShipment.predictedExcursionMinutes = analysis.predictedExcursionMinutes;
      targetShipment.recommendedAction = analysis.recommendedAction;
      await targetShipment.save();
    }

    res.json({
      success: true,
      shipment: targetShipment,
      analysis,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
