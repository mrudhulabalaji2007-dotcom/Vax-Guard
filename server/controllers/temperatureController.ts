import { Request, Response } from 'express';
import { TemperatureLog } from '../models/TemperatureLog.js';
import { Shipment } from '../models/Shipment.js';
import { Alert } from '../models/Alert.js';
import { calculatePredictiveRisk } from '../services/riskEngine.js';
import { findShipmentByIdOrTracking } from '../utils/dbHelpers.js';

export async function getLogsByShipment(req: Request, res: Response): Promise<void> {
  try {
    const { shipmentId } = req.params;
    const shipment = await findShipmentByIdOrTracking(shipmentId);
    const query = shipment
      ? { $or: [{ shipmentId: shipment._id }, { trackingId: shipment.trackingId }] }
      : { $or: [{ shipmentId }, { trackingId: shipmentId.toUpperCase() }] };

    const logs = await TemperatureLog.find(query).sort({ recordedAt: 1 });

    res.json({ success: true, count: logs.length, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function addTemperatureReading(req: Request, res: Response): Promise<void> {
  try {
    const {
      shipmentId,
      temperature,
      ambientTemperature = 32.0,
      location = 'Highway Sensor Waypoint',
      source = 'MANUAL_ENTRY',
      humidity = 58,
    } = req.body;

    if (!shipmentId || temperature === undefined) {
      res.status(400).json({ success: false, message: 'shipmentId and temperature are required.' });
      return;
    }

    const shipment = await findShipmentByIdOrTracking(shipmentId);

    if (!shipment) {
      res.status(404).json({ success: false, message: 'Shipment not found.' });
      return;
    }

    const numTemp = Number(temperature);
    const isExcursion = numTemp > shipment.safeMaxTemperature || numTemp < shipment.safeMinTemperature;

    // 1. Create Log
    const newLog = await TemperatureLog.create({
      shipmentId: shipment._id,
      trackingId: shipment.trackingId,
      temperature: numTemp,
      ambientTemperature: Number(ambientTemperature),
      location,
      recordedAt: new Date(),
      source,
      isExcursion,
      humidity: Number(humidity),
    });

    // 2. Fetch all historical logs for trend analysis
    const allLogs = await TemperatureLog.find({
      $or: [{ shipmentId: shipment._id }, { trackingId: shipment.trackingId }],
    }).sort({ recordedAt: 1 });

    // 3. Recalculate predictive risk dynamically
    const riskAnalysis = calculatePredictiveRisk({
      currentTemperature: numTemp,
      safeMinTemperature: shipment.safeMinTemperature,
      safeMaxTemperature: shipment.safeMaxTemperature,
      remainingTravelTime: shipment.remainingTravelTime,
      temperatureHistory: allLogs.map((l) => ({
        temperature: l.temperature,
        recordedAt: l.recordedAt,
      })),
    });

    // 4. Update shipment
    shipment.currentTemperature = numTemp;
    shipment.riskScore = riskAnalysis.riskScore;
    shipment.riskLevel = riskAnalysis.riskLevel;
    shipment.predictedExcursionMinutes = riskAnalysis.predictedExcursionMinutes;
    shipment.recommendedAction = riskAnalysis.recommendedAction;

    if (isExcursion || riskAnalysis.riskLevel === 'CRITICAL' || riskAnalysis.riskLevel === 'HIGH') {
      if (shipment.status !== 'FLAGGED' && shipment.status !== 'DELIVERED') {
        shipment.status = 'AT_RISK';
      }
    } else if (shipment.status === 'AT_RISK') {
      shipment.status = 'IN_TRANSIT';
    }

    await shipment.save();

    // 5. Trigger alert if high risk or critical excursion
    if (riskAnalysis.riskLevel === 'CRITICAL' || riskAnalysis.riskLevel === 'HIGH') {
      await Alert.create({
        alertId: `ALT-${Date.now().toString().slice(-6)}`,
        type: isExcursion ? 'Temperature Excursion' : 'Predictive High Risk',
        severity: riskAnalysis.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        relatedShipmentId: String(shipment._id),
        relatedShipmentTracking: shipment.trackingId,
        message: `${isExcursion ? 'EXCURSION BREACH' : 'PREDICTIVE WARNING'}: ${shipment.trackingId} recorded ${numTemp.toFixed(1)}°C (Safe: ${shipment.safeMinTemperature}°C-${shipment.safeMaxTemperature}°C). Risk Score: ${riskAnalysis.riskScore}/100.`,
        details: riskAnalysis.explanation,
        recommendedAction: riskAnalysis.recommendedAction,
        status: 'ACTIVE',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Temperature reading logged and cold-chain risk evaluated.',
      log: newLog,
      shipment,
      riskAnalysis,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function simulateTemperatureRise(req: Request, res: Response): Promise<void> {
  try {
    const { shipmentId, delta = 0.9, step = 1 } = req.body;

    const shipment = await findShipmentByIdOrTracking(shipmentId);

    if (!shipment) {
      res.status(404).json({ success: false, message: 'Shipment not found.' });
      return;
    }

    const newTemp = Number((shipment.currentTemperature + Number(delta)).toFixed(1));
    const locationNames = [
      'Highway Kilometre Marker 180 (Thermal Sun Exposure)',
      'Toll Plaza Congestion Zone (Reefer Fan Stalled)',
      'Midpoint Reefer Inverter Thermal Spike',
      'Highway Bypass Junction',
    ];
    const location = locationNames[step % locationNames.length];

    // Create simulation log
    const newLog = await TemperatureLog.create({
      shipmentId: shipment._id,
      trackingId: shipment.trackingId,
      temperature: newTemp,
      ambientTemperature: 37.5,
      location,
      recordedAt: new Date(),
      source: 'SIMULATION',
      isExcursion: newTemp > shipment.safeMaxTemperature || newTemp < shipment.safeMinTemperature,
    });

    const allLogs = await TemperatureLog.find({
      $or: [{ shipmentId: shipment._id }, { trackingId: shipment.trackingId }],
    }).sort({ recordedAt: 1 });

    const riskAnalysis = calculatePredictiveRisk({
      currentTemperature: newTemp,
      safeMinTemperature: shipment.safeMinTemperature,
      safeMaxTemperature: shipment.safeMaxTemperature,
      remainingTravelTime: Math.max(0.5, shipment.remainingTravelTime - 0.2),
      temperatureHistory: allLogs.map((l) => ({
        temperature: l.temperature,
        recordedAt: l.recordedAt,
      })),
    });

    shipment.currentTemperature = newTemp;
    shipment.riskScore = riskAnalysis.riskScore;
    shipment.riskLevel = riskAnalysis.riskLevel;
    shipment.predictedExcursionMinutes = riskAnalysis.predictedExcursionMinutes;
    shipment.recommendedAction = riskAnalysis.recommendedAction;
    if (newTemp > shipment.safeMaxTemperature || riskAnalysis.riskLevel === 'CRITICAL') {
      shipment.status = 'AT_RISK';
    } else if (newTemp <= shipment.safeMaxTemperature && newTemp >= shipment.safeMinTemperature && shipment.status === 'AT_RISK') {
      shipment.status = 'IN_TRANSIT';
    }
    await shipment.save();

    if (riskAnalysis.riskLevel === 'CRITICAL' || riskAnalysis.riskLevel === 'HIGH') {
      await Alert.create({
        alertId: `ALT-${Date.now().toString().slice(-6)}`,
        type: newTemp > shipment.safeMaxTemperature ? 'Temperature Excursion' : 'Predictive High Risk',
        severity: riskAnalysis.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        relatedShipmentId: String(shipment._id),
        relatedShipmentTracking: shipment.trackingId,
        message: `Simulation Triggered: ${shipment.trackingId} temperature elevated to ${newTemp}°C. Projected risk: ${riskAnalysis.riskScore}/100.`,
        details: riskAnalysis.explanation,
        recommendedAction: riskAnalysis.recommendedAction,
        status: 'ACTIVE',
      });
    }

    res.json({
      success: true,
      message: `Simulated temperature rise to ${newTemp}°C executed.`,
      newLog,
      shipment,
      riskAnalysis,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getHistoricalTrends(req: Request, res: Response): Promise<void> {
  try {
    const { shipmentId } = req.params;
    let shipment: any = null;

    if (shipmentId && shipmentId !== 'all') {
      shipment = await findShipmentByIdOrTracking(shipmentId);
    }

    if (!shipment) {
      // Default to highest risk or active shipment
      shipment = await Shipment.findOne({ status: 'AT_RISK' });
      if (!shipment) {
        shipment = await Shipment.findOne({ trackingId: 'TRK-VAX-1005' });
      }
      if (!shipment) {
        shipment = await Shipment.findOne({});
      }
    }

    if (!shipment) {
      res.status(404).json({ success: false, message: 'No shipments available for trend analysis.' });
      return;
    }

    // Fetch existing logs from MongoDB
    const logs = await TemperatureLog.find({
      $or: [{ shipmentId: shipment._id }, { trackingId: shipment.trackingId }],
    }).sort({ recordedAt: 1 });

    const safeMin = shipment.safeMinTemperature || 2.0;
    const safeMax = shipment.safeMaxTemperature || 8.0;

    let timeSeriesData: any[] = [];

    if (logs.length >= 3) {
      // Build curve from real MongoDB logs
      timeSeriesData = logs.map((log, index) => {
        const histSlice = logs.slice(0, index + 1).map((l) => ({
          temperature: l.temperature,
          recordedAt: l.recordedAt,
        }));

        const pointRisk = calculatePredictiveRisk({
          currentTemperature: log.temperature,
          safeMinTemperature: safeMin,
          safeMaxTemperature: safeMax,
          remainingTravelTime: Math.max(0.5, shipment.remainingTravelTime - index * 0.4),
          temperatureHistory: histSlice,
        });

        const dateObj = new Date(log.recordedAt);
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return {
          id: String(log._id),
          time: timeStr,
          timestamp: log.recordedAt,
          temperature: log.temperature,
          ambientTemperature: log.ambientTemperature || 32.5,
          predictedRiskScore: pointRisk.riskScore,
          riskLevel: pointRisk.riskLevel,
          safeMin,
          safeMax,
          isExcursion: log.isExcursion,
          rateOfChangePerHour: pointRisk.rateOfChangePerHour,
          predictedExcursionMinutes: pointRisk.predictedExcursionMinutes,
          location: log.location || `Waypoint ${index + 1}`,
          recommendation: pointRisk.recommendedAction,
        };
      });
    } else {
      // Generate rich simulated historical curve leading to current reading
      const now = Date.now();
      const pointsCount = 8;
      const initialTemp = Math.max(2.5, shipment.currentTemperature - 2.8);
      const targetTemp = shipment.currentTemperature;
      const tempStep = (targetTemp - initialTemp) / (pointsCount - 1);

      const locations = [
        'Central Depository Gate',
        'NH-38 Highway Entry (KM 40)',
        'Villupuram Transit Waypoint (KM 160)',
        'Perambalur Rest Stop (KM 270)',
        'Trichy Bypass Corridor (KM 330)',
        'Madurai Transit Cold Depot (KM 450)',
        'Virudhunagar Checkpoint (KM 520)',
        'Current Sensor Telemetry Marker',
      ];

      for (let i = 0; i < pointsCount; i++) {
        const pointTime = new Date(now - (pointsCount - 1 - i) * 45 * 60 * 1000);
        const currentT = Number((initialTemp + tempStep * i + (Math.sin(i) * 0.2)).toFixed(1));
        const ambientT = Number((29.0 + (i * 1.1) + Math.cos(i) * 0.5).toFixed(1));

        const hist = [];
        for (let j = 0; j <= i; j++) {
          hist.push({
            temperature: Number((initialTemp + tempStep * j).toFixed(1)),
            recordedAt: new Date(now - (pointsCount - 1 - j) * 45 * 60 * 1000),
          });
        }

        const pointRisk = calculatePredictiveRisk({
          currentTemperature: currentT,
          safeMinTemperature: safeMin,
          safeMaxTemperature: safeMax,
          remainingTravelTime: Math.max(0.5, shipment.remainingTravelTime + (pointsCount - 1 - i) * 0.6),
          temperatureHistory: hist,
        });

        timeSeriesData.push({
          id: `pt-${i}`,
          time: pointTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: pointTime.toISOString(),
          temperature: currentT,
          ambientTemperature: ambientT,
          predictedRiskScore: pointRisk.riskScore,
          riskLevel: pointRisk.riskLevel,
          safeMin,
          safeMax,
          isExcursion: currentT > safeMax || currentT < safeMin,
          rateOfChangePerHour: pointRisk.rateOfChangePerHour,
          predictedExcursionMinutes: pointRisk.predictedExcursionMinutes,
          location: locations[i % locations.length],
          recommendation: pointRisk.recommendedAction,
        });
      }
    }

    res.json({
      success: true,
      shipment: {
        _id: shipment._id,
        trackingId: shipment.trackingId,
        vaccineName: shipment.vaccineName,
        batchNumber: shipment.batchNumber,
        currentTemperature: shipment.currentTemperature,
        safeMinTemperature: safeMin,
        safeMaxTemperature: safeMax,
        currentRiskScore: shipment.riskScore,
        currentRiskLevel: shipment.riskLevel,
        status: shipment.status,
        origin: shipment.origin,
        destination: shipment.destination,
      },
      timeSeriesData,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

