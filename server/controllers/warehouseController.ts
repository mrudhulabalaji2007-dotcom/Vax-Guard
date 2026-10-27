import { Request, Response } from 'express';
import { Warehouse } from '../models/Warehouse.js';
import { Alert } from '../models/Alert.js';
import { RefrigerationIncident } from '../models/RefrigerationIncident.js';
import { findWarehouseByIdOrCode } from '../utils/dbHelpers.js';

export async function getWarehouses(_req: Request, res: Response): Promise<void> {
  try {
    const warehouses = await Warehouse.find().sort({ name: 1 });
    
    // Attach live active alerts count
    const warehousesWithAlerts = await Promise.all(
      warehouses.map(async (wh) => {
        const activeAlerts = await Alert.countDocuments({
          relatedWarehouseId: String(wh._id),
          status: 'ACTIVE',
        });
        const obj = wh.toObject();
        obj.activeAlertsCount = activeAlerts;
        return obj;
      })
    );

    res.json({ success: true, count: warehousesWithAlerts.length, warehouses: warehousesWithAlerts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getWarehouseById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const warehouse = await findWarehouseByIdOrCode(id);

    if (!warehouse) {
      res.status(404).json({ success: false, message: 'Warehouse not found.' });
      return;
    }

    const activeAlerts = await Alert.find({
      relatedWarehouseId: String(warehouse._id),
      status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
    }).sort({ timestamp: -1 });

    const incidents = await RefrigerationIncident.find({
      warehouseId: String(warehouse._id),
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      warehouse,
      activeAlerts,
      incidents,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createWarehouse(req: Request, res: Response): Promise<void> {
  try {
    const {
      name,
      code,
      location,
      state = 'Tamil Nadu',
      storageCapacity,
      currentOccupancy = 0,
      safeMinTemperature = 2.0,
      safeMaxTemperature = 8.0,
      currentTemperature = 4.5,
      powerStatus = 'ON',
      backupPowerAvailable = true,
      managerName = 'Facility Cold-Chain Officer',
      managerContact = '+91 94440 00000',
    } = req.body;

    if (!name || !location || !storageCapacity) {
      res.status(400).json({
        success: false,
        message: 'Name, Location, and Storage Capacity are required.',
      });
      return;
    }

    const cleanCode = code ? String(code).toUpperCase() : `WH-${name.substring(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;

    const warehouse = await Warehouse.create({
      name,
      code: cleanCode,
      location,
      state,
      storageCapacity: Number(storageCapacity),
      currentOccupancy: Number(currentOccupancy),
      safeMinTemperature: Number(safeMinTemperature),
      safeMaxTemperature: Number(safeMaxTemperature),
      currentTemperature: Number(currentTemperature),
      targetTemperature: 4.0,
      powerStatus,
      refrigerationStatus: 'NORMAL',
      backupPowerAvailable: Boolean(backupPowerAvailable),
      backupPowerStatus: 'STANDBY',
      estimatedSafeHoldingTime: 240,
      managerName,
      managerContact,
    });

    res.status(201).json({
      success: true,
      message: 'Cold-chain storage facility registered successfully.',
      warehouse,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateWarehouse(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await findWarehouseByIdOrCode(id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Warehouse not found.' });
      return;
    }
    const warehouse = await Warehouse.findByIdAndUpdate(existing._id, req.body, { new: true });
    res.json({ success: true, warehouse });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * UNIQUE FEATURE #3: REFRIGERATION / POWER FAILURE DETECTION & SIMULATION
 */
export async function simulatePowerOutage(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { step = 1, temperatureOverride } = req.body;

    const warehouse = await findWarehouseByIdOrCode(id);
    if (!warehouse) {
      res.status(404).json({ success: false, message: 'Warehouse not found.' });
      return;
    }

    // Step-by-step failure ramp
    // 5.2°C -> 6.0°C -> 7.1°C -> 8.2°C -> 9.0°C
    let nextTemp = 0;
    if (temperatureOverride !== undefined) {
      nextTemp = Number(temperatureOverride);
    } else {
      const stepJumps = [6.0, 7.1, 8.4, 9.2, 10.5];
      const jumpIndex = Math.min(step - 1, stepJumps.length - 1);
      nextTemp = Number((warehouse.currentTemperature < 5.5 ? stepJumps[jumpIndex] : warehouse.currentTemperature + 1.2).toFixed(1));
    }

    warehouse.powerStatus = 'OFF';
    warehouse.refrigerationStatus = 'FAILURE';
    warehouse.currentTemperature = nextTemp;
    
    // Holding time diminishes as temp rises
    const holdingTimeLeft = Math.max(12, Math.round(180 - (nextTemp - 4.0) * 35));
    warehouse.estimatedSafeHoldingTime = holdingTimeLeft;

    await warehouse.save();

    let criticalIncident: any = null;
    let alertCreated: any = null;

    // Check if Safe Maximum Limit Breached
    const isCriticalBreach = nextTemp > warehouse.safeMaxTemperature;

    if (isCriticalBreach) {
      // Record compliance incident in MongoDB
      criticalIncident = await RefrigerationIncident.create({
        warehouseId: String(warehouse._id),
        warehouseName: warehouse.name,
        initialTemp: 4.8,
        peakTemp: nextTemp,
        safeLimit: warehouse.safeMaxTemperature,
        powerStatus: 'OFF',
        refrigerationStatus: 'FAILURE',
        durationMinutes: 42,
        affectedVaccineDoses: warehouse.currentOccupancy || 45000,
        estimatedLossValue: 650000,
        actionsTaken: [
          '1. Activate backup diesel generator or secondary refrigeration compressor',
          '2. Relocate high-sensitivity rotavirus and measles batches to insulated dry-ice transfer boxes',
          '3. Alert State Cold-Chain Logistics Officer & warehouse manager',
          '4. Log compliance deviation report into government central vaccine registry',
        ],
        resolved: false,
        incidentNotes: `Grid power outage triggered temperature rise past ${warehouse.safeMaxTemperature}°C threshold to ${nextTemp}°C. Emergency SOP initiated.`,
      });

      // Generate Critical Alert
      alertCreated = await Alert.create({
        alertId: `ALT-${Date.now().toString().slice(-6)}`,
        type: 'Refrigeration Failure',
        severity: 'CRITICAL',
        relatedWarehouseId: String(warehouse._id),
        relatedWarehouseName: warehouse.name,
        message: `CRITICAL REFRIGERATION FAILURE: ${warehouse.name} reached ${nextTemp}°C (Exceeds ${warehouse.safeMaxTemperature}°C safe limit). Power OFF.`,
        details: `Refrigeration compressor offline. Estimated safe thermal holding window remaining: ${holdingTimeLeft} minutes.`,
        recommendedAction: '1. Activate backup refrigeration immediately. 2. Move high-priority vaccines to secondary cold room. 3. Notify warehouse manager.',
        status: 'ACTIVE',
      });
    } else {
      // Warning Alert
      alertCreated = await Alert.create({
        alertId: `ALT-${Date.now().toString().slice(-6)}`,
        type: 'Refrigeration Failure',
        severity: 'HIGH',
        relatedWarehouseId: String(warehouse._id),
        relatedWarehouseName: warehouse.name,
        message: `POWER OUTAGE WARNING: ${warehouse.name} main power grid offline. Temperature warming at ${nextTemp}°C.`,
        details: `Refrigeration unit idling. Holding buffer: ${holdingTimeLeft} mins.`,
        recommendedAction: 'Engage backup generator or inspect main distribution board.',
        status: 'ACTIVE',
      });
    }

    res.json({
      success: true,
      message: isCriticalBreach ? 'CRITICAL REFRIGERATION FAILURE DETECTED' : 'Power outage simulated',
      warehouse,
      isCriticalBreach,
      criticalIncident,
      alert: alertCreated,
      recommendedActions: [
        '1. Activate backup refrigeration',
        '2. Move high-priority vaccines',
        '3. Notify warehouse manager',
        '4. Record compliance incident',
      ],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function restorePower(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const warehouse = await findWarehouseByIdOrCode(id);

    if (!warehouse) {
      res.status(404).json({ success: false, message: 'Warehouse not found.' });
      return;
    }

    warehouse.powerStatus = 'ON';
    warehouse.refrigerationStatus = 'NORMAL';
    warehouse.currentTemperature = 4.2;
    warehouse.estimatedSafeHoldingTime = 240;
    warehouse.backupPowerStatus = 'STANDBY';
    await warehouse.save();

    // Mark pending refrigeration incidents as resolved
    await RefrigerationIncident.updateMany(
      { warehouseId: String(warehouse._id), resolved: false },
      { resolved: true, resolvedAt: new Date() }
    );

    // Auto resolve active refrigeration alerts for this warehouse
    await Alert.updateMany(
      {
        relatedWarehouseId: String(warehouse._id),
        type: 'Refrigeration Failure',
        status: 'ACTIVE',
      },
      {
        status: 'RESOLVED',
        resolvedBy: 'System Auto-Recovery / Admin',
        resolvedAt: new Date(),
        resolutionNotes: 'Power restored and cooling compressor normalized back to 4.2°C.',
      }
    );

    res.json({
      success: true,
      message: `Power and refrigeration successfully restored for ${warehouse.name}. Temperature normalized to 4.2°C.`,
      warehouse,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
