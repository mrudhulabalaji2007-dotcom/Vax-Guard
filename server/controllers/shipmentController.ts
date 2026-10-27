import { Request, Response } from 'express';
import { Shipment } from '../models/Shipment.js';
import { TemperatureLog } from '../models/TemperatureLog.js';
import { Alert } from '../models/Alert.js';
import { calculatePredictiveRisk } from '../services/riskEngine.js';
import { findShipmentByIdOrTracking } from '../utils/dbHelpers.js';

export async function getShipments(req: Request, res: Response): Promise<void> {
  try {
    const { status, riskLevel, search } = req.query;
    const query: any = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (riskLevel && riskLevel !== 'ALL') {
      query.riskLevel = riskLevel;
    }
    if (search) {
      query.$or = [
        { trackingId: { $regex: String(search), $options: 'i' } },
        { vaccineName: { $regex: String(search), $options: 'i' } },
        { batchNumber: { $regex: String(search), $options: 'i' } },
        { origin: { $regex: String(search), $options: 'i' } },
        { destination: { $regex: String(search), $options: 'i' } },
      ];
    }

    const shipments = await Shipment.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: shipments.length, shipments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getShipmentById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const shipment = await findShipmentByIdOrTracking(id);

    if (!shipment) {
      res.status(404).json({ success: false, message: 'Shipment not found.' });
      return;
    }

    const temperatureLogs = await TemperatureLog.find({
      $or: [{ shipmentId: shipment._id }, { trackingId: shipment.trackingId }],
    }).sort({ recordedAt: 1 });

    // Re-run dynamic risk analysis with latest telemetry
    const riskAnalysis = calculatePredictiveRisk({
      currentTemperature: shipment.currentTemperature,
      safeMinTemperature: shipment.safeMinTemperature,
      safeMaxTemperature: shipment.safeMaxTemperature,
      remainingTravelTime: shipment.remainingTravelTime,
      temperatureHistory: temperatureLogs.map((l) => ({
        temperature: l.temperature,
        recordedAt: l.recordedAt,
      })),
    });

    res.json({
      success: true,
      shipment,
      temperatureLogs,
      riskAnalysis,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createShipment(req: Request, res: Response): Promise<void> {
  try {
    const {
      trackingId,
      vaccineName,
      batchNumber,
      quantity,
      origin,
      destination,
      currentTemperature,
      safeMinTemperature = 2.0,
      safeMaxTemperature = 8.0,
      expectedTravelTime,
      driverName = 'K. Rajan',
      driverPhone = '+91 94432 10987',
      vehicleReg = 'TN-01-CV-9821 (Reefer Van)',
      currentRoute = 'Route B - Green Cold Corridor (NH-38)',
    } = req.body;

    // Validation
    if (!trackingId || !vaccineName || !batchNumber || !quantity || !origin || !destination) {
      res.status(400).json({
        success: false,
        message: 'Missing required shipment fields (Tracking ID, Vaccine, Batch, Quantity, Origin, Destination).',
      });
      return;
    }

    const cleanTrackingId = String(trackingId).trim().toUpperCase();
    const existing = await Shipment.findOne({ trackingId: cleanTrackingId });
    if (existing) {
      res.status(400).json({
        success: false,
        message: `Shipment with tracking ID '${cleanTrackingId}' already exists.`,
      });
      return;
    }

    const numTemp = Number(currentTemperature) || 5.0;
    const numExpectedTime = Number(expectedTravelTime) || 6.0;
    const numRemaining = numExpectedTime;
    const numSafeMin = Number(safeMinTemperature) || 2.0;
    const numSafeMax = Number(safeMaxTemperature) || 8.0;

    // Run initial risk calculation
    const risk = calculatePredictiveRisk({
      currentTemperature: numTemp,
      safeMinTemperature: numSafeMin,
      safeMaxTemperature: numSafeMax,
      remainingTravelTime: numRemaining,
      temperatureHistory: [{ temperature: numTemp, recordedAt: new Date() }],
    });

    const departureTime = new Date();
    const eta = new Date(departureTime.getTime() + numExpectedTime * 60 * 60 * 1000);

    const shipment = await Shipment.create({
      trackingId: cleanTrackingId,
      vaccineName,
      batchNumber,
      quantity: Number(quantity),
      origin,
      destination,
      currentTemperature: numTemp,
      safeMinTemperature: numSafeMin,
      safeMaxTemperature: numSafeMax,
      expectedTravelTime: numExpectedTime,
      remainingTravelTime: numRemaining,
      status: risk.riskLevel === 'CRITICAL' || risk.riskLevel === 'HIGH' ? 'AT_RISK' : 'IN_TRANSIT',
      departureTime,
      eta,
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
      predictedExcursionMinutes: risk.predictedExcursionMinutes,
      recommendedAction: risk.recommendedAction,
      currentRoute,
      driverName,
      driverPhone,
      vehicleReg,
    });

    // Create initial baseline sensor log
    await TemperatureLog.create({
      shipmentId: shipment._id,
      trackingId: shipment.trackingId,
      temperature: numTemp,
      ambientTemperature: 30.5,
      location: `${origin} Dispatch Dock`,
      recordedAt: new Date(),
      source: 'SENSOR_AUTOMATED',
      isExcursion: numTemp > numSafeMax || numTemp < numSafeMin,
    });

    // If initial temp is abnormal, generate alert
    if (numTemp > numSafeMax || numTemp < numSafeMin) {
      await Alert.create({
        alertId: `ALT-${Date.now().toString().slice(-6)}`,
        type: 'Temperature Excursion',
        severity: 'CRITICAL',
        relatedShipmentId: String(shipment._id),
        relatedShipmentTracking: shipment.trackingId,
        message: `Dispatch Warning: Shipment ${shipment.trackingId} initialized at out-of-spec temperature ${numTemp}°C.`,
        details: `Safe band is ${numSafeMin}°C - ${numSafeMax}°C. Thermal intervention required before transit departure.`,
        recommendedAction: 'Immediate ice pack replenishment or reefer pre-cooling.',
        status: 'ACTIVE',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Shipment created and registered in cold-chain network successfully.',
      shipment,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error creating shipment.' });
  }
}

export async function updateShipment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await findShipmentByIdOrTracking(id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Shipment not found.' });
      return;
    }
    const shipment = await Shipment.findByIdAndUpdate(existing._id, req.body, { new: true });
    res.json({ success: true, shipment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteShipment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await findShipmentByIdOrTracking(id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Shipment not found.' });
      return;
    }
    await Shipment.findByIdAndDelete(existing._id);
    await TemperatureLog.deleteMany({
      $or: [{ shipmentId: existing._id }, { trackingId: existing.trackingId }],
    });
    res.json({ success: true, message: 'Shipment and associated telemetry deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function receiveShipment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { action, receivingOfficer, receivingNotes, verifiedTemperature } = req.body;

    const shipment = await findShipmentByIdOrTracking(id);
    if (!shipment) {
      res.status(404).json({ success: false, message: 'Shipment not found.' });
      return;
    }

    const isAccepted = action === 'ACCEPT';
    shipment.receivedStatus = isAccepted ? 'ACCEPTED' : 'FLAGGED';
    shipment.status = isAccepted ? 'DELIVERED' : 'FLAGGED';
    shipment.remainingTravelTime = 0;
    shipment.receivedAt = new Date();
    shipment.receivedBy = receivingOfficer || 'Hospital Receiving In-Charge';
    shipment.receivingNotes = receivingNotes || (isAccepted ? 'Vaccine batch integrity verified. Placed in cold room.' : 'Flagged for thermal audit.');
    
    if (verifiedTemperature !== undefined) {
      shipment.currentTemperature = Number(verifiedTemperature);
    }

    await shipment.save();

    if (!isAccepted) {
      await Alert.create({
        alertId: `ALT-${Date.now().toString().slice(-6)}`,
        type: 'Temperature Excursion',
        severity: 'HIGH',
        relatedShipmentId: String(shipment._id),
        relatedShipmentTracking: shipment.trackingId,
        message: `Receiving Gate Flagged: Shipment ${shipment.trackingId} flagged upon arrival at ${shipment.destination}.`,
        details: shipment.receivingNotes,
        recommendedAction: 'Quarantine vaccine lot in backup cold room and initiate QA testing before clinical release.',
        status: 'ACTIVE',
      });
    }

    res.json({
      success: true,
      message: isAccepted ? 'Shipment accepted and added to hospital cold store.' : 'Shipment flagged and quarantined for compliance review.',
      shipment,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
