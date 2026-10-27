import { Request, Response } from 'express';
import { Inventory } from '../models/Inventory.js';
import { Alert } from '../models/Alert.js';

export async function getInventory(req: Request, res: Response): Promise<void> {
  try {
    const { status, facilityId, vaccineName, search } = req.query;
    const filter: any = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }
    if (facilityId) {
      filter.facilityId = facilityId;
    }
    if (vaccineName && vaccineName !== 'ALL') {
      filter.vaccineName = { $regex: String(vaccineName), $options: 'i' };
    }
    if (search) {
      filter.$or = [
        { vaccineName: { $regex: String(search), $options: 'i' } },
        { batchNumber: { $regex: String(search), $options: 'i' } },
        { facilityName: { $regex: String(search), $options: 'i' } },
        { manufacturer: { $regex: String(search), $options: 'i' } },
      ];
    }

    const items = await Inventory.find(filter).sort({ availableDoses: 1 });

    const totalStock = items.reduce((acc, curr) => acc + curr.availableDoses, 0);
    const lowStockCount = items.filter((i) => i.isLowStock || i.status === 'LOW_STOCK').length;
    const criticalCount = items.filter((i) => i.status === 'CRITICAL_SHORTAGE').length;

    res.json({
      success: true,
      count: items.length,
      totalStock,
      lowStockCount,
      criticalCount,
      inventory: items,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function addInventoryItem(req: Request, res: Response): Promise<void> {
  try {
    const {
      vaccineName,
      batchNumber,
      manufacturer = 'Serum Institute of India',
      facilityType = 'HOSPITAL',
      facilityId,
      facilityName,
      availableDoses,
      reservedDoses = 0,
      lowStockThreshold = 100,
      safeMinTemperature = 2.0,
      safeMaxTemperature = 8.0,
      currentStorageTemperature = 4.8,
      expiryDate,
    } = req.body;

    if (!vaccineName || !batchNumber || !facilityId || !facilityName || availableDoses === undefined) {
      res.status(400).json({
        success: false,
        message: 'Vaccine Name, Batch Number, Facility ID, Facility Name, and Available Doses are required.',
      });
      return;
    }

    const doses = Number(availableDoses);
    const threshold = Number(lowStockThreshold);
    const isLow = doses <= threshold;

    let status: 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL_SHORTAGE' | 'EXPIRED' = 'IN_STOCK';
    if (doses <= 20) {
      status = 'CRITICAL_SHORTAGE';
    } else if (isLow) {
      status = 'LOW_STOCK';
    }

    const item = await Inventory.create({
      vaccineName,
      batchNumber,
      manufacturer,
      facilityType,
      facilityId,
      facilityName,
      availableDoses: doses,
      reservedDoses: Number(reservedDoses) || 0,
      lowStockThreshold: threshold,
      isLowStock: isLow,
      safeMinTemperature: Number(safeMinTemperature) || 2.0,
      safeMaxTemperature: Number(safeMaxTemperature) || 8.0,
      currentStorageTemperature: Number(currentStorageTemperature) || 4.8,
      expiryDate: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      status,
    });

    // Auto-create alert if low stock or critical shortage
    if (isLow) {
      await Alert.create({
        alertId: `ALT-STK-${Date.now().toString().slice(-6)}`,
        type: 'Low Inventory',
        severity: status === 'CRITICAL_SHORTAGE' ? 'CRITICAL' : 'WARNING',
        relatedWarehouseName: facilityName,
        message: `Low Stock Alert: ${facilityName} has only ${doses} doses remaining of ${vaccineName} (Batch: ${batchNumber}). Threshold: ${threshold}.`,
        details: `Immediate replenishment order recommended to prevent regional immunization disruption.`,
        recommendedAction: `Schedule vaccine replenishment shipment from State Central Depot immediately.`,
        status: 'ACTIVE',
      });
    }

    res.status(201).json({ success: true, message: 'Vaccine inventory record added.', item });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateInventoryStock(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { availableDoses, reservedDoses, currentStorageTemperature } = req.body;

    const item = await Inventory.findById(id);
    if (!item) {
      res.status(404).json({ success: false, message: 'Inventory item not found.' });
      return;
    }

    if (availableDoses !== undefined) {
      const doses = Number(availableDoses);
      item.availableDoses = doses;
      item.isLowStock = doses <= item.lowStockThreshold;

      if (doses <= 20) {
        item.status = 'CRITICAL_SHORTAGE';
      } else if (item.isLowStock) {
        item.status = 'LOW_STOCK';
      } else {
        item.status = 'IN_STOCK';
      }

      // Generate alert if newly fallen below threshold
      if (item.isLowStock) {
        await Alert.create({
          alertId: `ALT-STK-${Date.now().toString().slice(-6)}`,
          type: 'Low Inventory',
          severity: item.status === 'CRITICAL_SHORTAGE' ? 'CRITICAL' : 'WARNING',
          relatedWarehouseName: item.facilityName,
          message: `Stock Depletion Warning: ${item.facilityName} reported ${doses} doses of ${item.vaccineName}.`,
          details: `Current inventory level is below the minimum configured buffer threshold of ${item.lowStockThreshold} doses.`,
          recommendedAction: `Dispatch cold transit consignment to ${item.facilityName}.`,
          status: 'ACTIVE',
        });
      }
    }

    if (reservedDoses !== undefined) {
      item.reservedDoses = Number(reservedDoses);
    }
    if (currentStorageTemperature !== undefined) {
      item.currentStorageTemperature = Number(currentStorageTemperature);
    }

    item.lastAuditedAt = new Date();
    await item.save();

    res.json({ success: true, message: 'Stock quantity updated.', item });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteInventoryItem(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await Inventory.findByIdAndDelete(id);
    res.json({ success: true, message: 'Inventory record removed.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
