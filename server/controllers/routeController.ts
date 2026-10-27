import { Request, Response } from 'express';
import { RouteEvaluation } from '../models/RouteEvaluation.js';
import { Shipment } from '../models/Shipment.js';
import { evaluateColdChainRoutes } from '../services/routeService.js';
import { findShipmentByIdOrTracking } from '../utils/dbHelpers.js';

export async function evaluateRoute(req: Request, res: Response): Promise<void> {
  try {
    const {
      origin,
      destination,
      vaccineName = 'Covishield (ChAdOx1-S)',
      currentTemperature = 5.2,
      remainingTravelTime = 7.0,
      shipmentId,
    } = req.body;

    if (!origin || !destination) {
      res.status(400).json({ success: false, message: 'Origin and Destination are required.' });
      return;
    }

    const evalResult = evaluateColdChainRoutes({
      origin,
      destination,
      vaccineName,
      currentTemperature: Number(currentTemperature),
      remainingTravelTime: Number(remainingTravelTime),
    });

    const routeRecord = await RouteEvaluation.create({
      origin,
      destination,
      vaccineName,
      currentTemperature: Number(currentTemperature),
      remainingTravelTime: Number(remainingTravelTime),
      routes: evalResult.routes,
      recommendedRoute: evalResult.recommendedRoute,
      evaluationSummary: evalResult.evaluationSummary,
    });

    // If linked to shipment, update its route recommendation
    if (shipmentId) {
      const rec = evalResult.routes.find((r) => r.isRecommended);
      if (rec) {
        const linkedShipment = await findShipmentByIdOrTracking(shipmentId);
        if (linkedShipment) {
          linkedShipment.currentRoute = rec.routeName;
          await linkedShipment.save();
        }
      }
    }

    res.json({
      success: true,
      evaluation: routeRecord,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getRouteEvaluations(_req: Request, res: Response): Promise<void> {
  try {
    const evaluations = await RouteEvaluation.find().sort({ evaluatedAt: -1 }).limit(10);
    res.json({ success: true, count: evaluations.length, evaluations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getRouteByShipmentId(req: Request, res: Response): Promise<void> {
  try {
    const { shipmentId } = req.params;
    const shipment = await findShipmentByIdOrTracking(shipmentId);

    if (!shipment) {
      res.status(404).json({ success: false, message: 'Shipment not found.' });
      return;
    }

    const evalResult = evaluateColdChainRoutes({
      origin: shipment.origin,
      destination: shipment.destination,
      vaccineName: shipment.vaccineName,
      currentTemperature: shipment.currentTemperature,
      remainingTravelTime: shipment.remainingTravelTime,
    });

    res.json({
      success: true,
      shipment,
      routes: evalResult.routes,
      recommendedRoute: evalResult.recommendedRoute,
      evaluationSummary: evalResult.evaluationSummary,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
