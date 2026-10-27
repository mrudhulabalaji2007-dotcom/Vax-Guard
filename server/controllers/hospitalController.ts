import { Request, Response } from 'express';
import { Hospital } from '../models/Hospital.js';
import { Inventory } from '../models/Inventory.js';
import { Alert } from '../models/Alert.js';
import { findHospitalByIdOrCode } from '../utils/dbHelpers.js';

export async function getHospitals(req: Request, res: Response): Promise<void> {
  try {
    const { district, status, search } = req.query;
    const filter: any = {};

    if (district && district !== 'ALL') {
      filter.district = district;
    }
    if (status && status !== 'ALL') {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: String(search), $options: 'i' } },
        { code: { $regex: String(search), $options: 'i' } },
        { district: { $regex: String(search), $options: 'i' } },
        { city: { $regex: String(search), $options: 'i' } },
      ];
    }

    const hospitals = await Hospital.find(filter).sort({ name: 1 });
    res.json({ success: true, count: hospitals.length, hospitals });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getHospitalById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const hospital = await findHospitalByIdOrCode(id);
    if (!hospital) {
      res.status(404).json({ success: false, message: 'Hospital not found.' });
      return;
    }

    const inventory = await Inventory.find({ facilityId: String(hospital._id) });
    const alerts = await Alert.find({
      $or: [{ relatedWarehouseId: String(hospital._id) }, { relatedShipmentTracking: hospital.code }],
    });

    res.json({ success: true, hospital, inventory, alerts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createHospital(req: Request, res: Response): Promise<void> {
  try {
    const {
      name,
      code,
      district,
      city,
      address,
      type = 'DISTRICT_HEADQUARTERS',
      inChargeName,
      inChargePhone,
      inChargeEmail,
      coldStorageType = 'Ice-Lined Refrigerator (ILR) 300L',
      coldStorageCapacityLitres = 300,
      currentTemperature = 4.5,
    } = req.body;

    if (!name || !code || !district || !city || !inChargeName) {
      res.status(400).json({ success: false, message: 'Name, Code, District, City, and In-Charge Name are required.' });
      return;
    }

    const existing = await Hospital.findOne({ code: String(code).toUpperCase() });
    if (existing) {
      res.status(400).json({ success: false, message: `Hospital code ${code} already exists.` });
      return;
    }

    const hospital = await Hospital.create({
      name,
      code: String(code).toUpperCase(),
      district,
      city,
      address: address || `${city}, ${district} District`,
      type,
      inChargeName,
      inChargePhone: inChargePhone || '+91 94432 00000',
      inChargeEmail: inChargeEmail || `${String(code).toLowerCase()}@health.gov.in`,
      coldStorageType,
      coldStorageCapacityLitres: Number(coldStorageCapacityLitres) || 300,
      currentTemperature: Number(currentTemperature) || 4.5,
    });

    res.status(201).json({ success: true, message: 'Hospital added successfully.', hospital });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateHospital(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await findHospitalByIdOrCode(id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Hospital not found.' });
      return;
    }
    const hospital = await Hospital.findByIdAndUpdate(existing._id, req.body, { new: true });
    res.json({ success: true, message: 'Hospital updated successfully.', hospital });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteHospital(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await findHospitalByIdOrCode(id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Hospital not found.' });
      return;
    }
    await Hospital.findByIdAndDelete(existing._id);
    res.json({ success: true, message: 'Hospital removed from registry.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Public Vaccine Availability Endpoint (Use Case #9)
export async function getPublicVaccineAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { district, vaccineName, search } = req.query;

    const hospitalQuery: any = { status: 'ACTIVE' };
    if (district && district !== 'ALL') {
      hospitalQuery.district = district;
    }
    if (search) {
      hospitalQuery.$or = [
        { name: { $regex: String(search), $options: 'i' } },
        { city: { $regex: String(search), $options: 'i' } },
        { district: { $regex: String(search), $options: 'i' } },
      ];
    }

    const hospitals = await Hospital.find(hospitalQuery);
    const hospitalIds = hospitals.map((h) => String(h._id));

    const invQuery: any = { facilityId: { $in: hospitalIds } };
    if (vaccineName && vaccineName !== 'ALL') {
      invQuery.vaccineName = { $regex: String(vaccineName), $options: 'i' };
    }

    const inventoryRecords = await Inventory.find(invQuery);

    const publicListing = hospitals.map((h) => {
      const facilityStock = inventoryRecords.filter((inv) => String(inv.facilityId) === String(h._id));
      const totalAvailable = facilityStock.reduce((acc, curr) => acc + curr.availableDoses, 0);

      return {
        hospitalId: h._id,
        name: h.name,
        code: h.code,
        district: h.district,
        city: h.city,
        address: h.address,
        coldStorageStatus: h.temperatureStatus,
        currentTemperature: h.currentTemperature,
        totalDosesAvailable: totalAvailable,
        vaccines: facilityStock.map((s) => ({
          vaccineName: s.vaccineName,
          availableDoses: s.availableDoses,
          status: s.status,
          expiryDate: s.expiryDate,
        })),
        contactPhone: h.inChargePhone,
      };
    });

    res.json({
      success: true,
      count: publicListing.length,
      facilities: publicListing,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
