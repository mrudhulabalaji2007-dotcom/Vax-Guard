import mongoose from 'mongoose';
import { Shipment, IShipment } from '../models/Shipment.js';
import { Warehouse, IWarehouse } from '../models/Warehouse.js';
import { Hospital, IHospital } from '../models/Hospital.js';
import { Alert, IAlert } from '../models/Alert.js';
import { Inventory, IInventory } from '../models/Inventory.js';

/**
 * Safely finds a shipment either by MongoDB _id (if valid ObjectId) or by trackingId (e.g., 'TRK-VAX-1008').
 * Prevents Mongoose CastError when searching with non-ObjectId tracking strings.
 */
export async function findShipmentByIdOrTracking(identifier: string): Promise<IShipment | null> {
  if (!identifier) return null;
  const clean = String(identifier).trim();
  if (mongoose.isValidObjectId(clean)) {
    const found = await Shipment.findById(clean);
    if (found) return found;
  }
  return await Shipment.findOne({ trackingId: clean.toUpperCase() });
}

/**
 * Safely finds a warehouse either by MongoDB _id (if valid ObjectId) or by facility code (e.g., 'WH-MAA-01').
 */
export async function findWarehouseByIdOrCode(identifier: string): Promise<IWarehouse | null> {
  if (!identifier) return null;
  const clean = String(identifier).trim();
  if (mongoose.isValidObjectId(clean)) {
    const found = await Warehouse.findById(clean);
    if (found) return found;
  }
  return await Warehouse.findOne({ code: clean.toUpperCase() });
}

/**
 * Safely finds a hospital either by MongoDB _id or by code (e.g., 'HOSP-CHN-01').
 */
export async function findHospitalByIdOrCode(identifier: string): Promise<IHospital | null> {
  if (!identifier) return null;
  const clean = String(identifier).trim();
  if (mongoose.isValidObjectId(clean)) {
    const found = await Hospital.findById(clean);
    if (found) return found;
  }
  return await Hospital.findOne({ code: clean.toUpperCase() });
}

/**
 * Safely finds an alert either by MongoDB _id or by alertId (e.g., 'ALT-100234').
 */
export async function findAlertByIdOrAlertId(identifier: string): Promise<IAlert | null> {
  if (!identifier) return null;
  const clean = String(identifier).trim();
  if (mongoose.isValidObjectId(clean)) {
    const found = await Alert.findById(clean);
    if (found) return found;
  }
  return await Alert.findOne({ alertId: clean });
}

/**
 * Safely finds an inventory item by MongoDB _id or batch number.
 */
export async function findInventoryByIdOrBatch(identifier: string): Promise<IInventory | null> {
  if (!identifier) return null;
  const clean = String(identifier).trim();
  if (mongoose.isValidObjectId(clean)) {
    const found = await Inventory.findById(clean);
    if (found) return found;
  }
  return await Inventory.findOne({ batchNumber: clean });
}
