import { Request, Response } from 'express';
import { Alert } from '../models/Alert.js';
import { AuthRequest } from '../middleware/auth.js';
import { findAlertByIdOrAlertId } from '../utils/dbHelpers.js';

export async function getAlerts(req: Request, res: Response): Promise<void> {
  try {
    const { status, severity, type } = req.query;
    const query: any = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (severity && severity !== 'ALL') {
      query.severity = severity;
    }
    if (type && type !== 'ALL') {
      query.type = type;
    }

    const alerts = await Alert.find(query).sort({ timestamp: -1 });
    const counts = {
      total: await Alert.countDocuments(),
      active: await Alert.countDocuments({ status: 'ACTIVE' }),
      critical: await Alert.countDocuments({ severity: 'CRITICAL', status: 'ACTIVE' }),
      acknowledged: await Alert.countDocuments({ status: 'ACKNOWLEDGED' }),
      resolved: await Alert.countDocuments({ status: 'RESOLVED' }),
    };

    res.json({ success: true, counts, count: alerts.length, alerts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function acknowledgeAlert(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { acknowledgedBy } = req.body;

    const officer = req.user?.name || acknowledgedBy || 'Cold-Chain Duty Officer';

    const existing = await findAlertByIdOrAlertId(id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Alert not found.' });
      return;
    }

    const alert = await Alert.findByIdAndUpdate(
      existing._id,
      {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: officer,
        acknowledgedAt: new Date(),
      },
      { new: true }
    );

    res.json({ success: true, message: 'Alert acknowledged.', alert });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function resolveAlert(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { resolvedBy, resolutionNotes } = req.body;

    const officer = req.user?.name || resolvedBy || 'Cold-Chain Administrator';

    const existing = await findAlertByIdOrAlertId(id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Alert not found.' });
      return;
    }

    const alert = await Alert.findByIdAndUpdate(
      existing._id,
      {
        status: 'RESOLVED',
        resolvedBy: officer,
        resolvedAt: new Date(),
        resolutionNotes: resolutionNotes || 'Thermal corrective action completed and sensor verified.',
      },
      { new: true }
    );

    res.json({ success: true, message: 'Alert resolved successfully.', alert });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createAlert(req: Request, res: Response): Promise<void> {
  try {
    const { type, severity, message, details, recommendedAction, relatedShipmentId, relatedWarehouseId } = req.body;

    const alert = await Alert.create({
      alertId: `ALT-${Date.now().toString().slice(-6)}`,
      type: type || 'Temperature Excursion',
      severity: severity || 'WARNING',
      message,
      details: details || '',
      recommendedAction: recommendedAction || '',
      relatedShipmentId,
      relatedWarehouseId,
      status: 'ACTIVE',
      timestamp: new Date(),
    });

    res.status(201).json({ success: true, alert });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
