import express from 'express';
import {
  login,
  register,
  getMe,
  getDemoAccounts,
} from '../controllers/authController.js';
import {
  getShipments,
  getShipmentById,
  createShipment,
  updateShipment,
  deleteShipment,
  receiveShipment,
} from '../controllers/shipmentController.js';
import {
  getLogsByShipment,
  addTemperatureReading,
  simulateTemperatureRise,
  getHistoricalTrends,
} from '../controllers/temperatureController.js';
import {
  getHospitals,
  getHospitalById,
  createHospital,
  updateHospital,
  deleteHospital,
  getPublicVaccineAvailability,
} from '../controllers/hospitalController.js';
import {
  getInventory,
  addInventoryItem,
  updateInventoryStock,
  deleteInventoryItem,
} from '../controllers/inventoryController.js';
import { analyzeRisk } from '../controllers/riskController.js';
import {
  evaluateRoute,
  getRouteEvaluations,
  getRouteByShipmentId,
} from '../controllers/routeController.js';
import {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  simulatePowerOutage,
  restorePower,
} from '../controllers/warehouseController.js';
import {
  getAlerts,
  createAlert,
  acknowledgeAlert,
  resolveAlert,
} from '../controllers/alertController.js';
import {
  getSummaryReport,
  generateComplianceReport,
  exportCsvReport,
} from '../controllers/reportController.js';
import {
  handleGeminiChat,
  getLiveSearchIntelligence,
} from '../controllers/geminiController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ================= AUTHENTICATION =================
router.post('/auth/login', login);
router.post('/auth/register', register);
router.get('/auth/me', protect, getMe);
router.get('/auth/demo-accounts', getDemoAccounts);

// ================= SHIPMENTS =================
router.get('/shipments', getShipments);
router.post('/shipments', createShipment);
router.get('/shipments/:id', getShipmentById);
router.put('/shipments/:id', updateShipment);
router.delete('/shipments/:id', deleteShipment);
router.post('/shipments/:id/receive', receiveShipment);

// ================= TEMPERATURE MONITORING & HISTORICAL TRENDS =================
router.get('/temperature/trends/:shipmentId?', getHistoricalTrends);
router.get('/temperature/:shipmentId', getLogsByShipment);
router.post('/temperature', addTemperatureReading);
router.post('/temperature/simulate-rise', simulateTemperatureRise);

// ================= HOSPITALS (USE CASE #4 & #9) =================
router.get('/hospitals', getHospitals);
router.post('/hospitals', createHospital);
router.get('/hospitals/:id', getHospitalById);
router.put('/hospitals/:id', updateHospital);
router.delete('/hospitals/:id', deleteHospital);
router.get('/public/vaccine-availability', getPublicVaccineAvailability);

// ================= VACCINE INVENTORY (USE CASE #2) =================
router.get('/inventory', getInventory);
router.post('/inventory', addInventoryItem);
router.put('/inventory/:id', updateInventoryStock);
router.delete('/inventory/:id', deleteInventoryItem);

// ================= PREDICTIVE RISK =================
router.post('/risk/analyze', analyzeRisk);

// ================= TEMPERATURE-AWARE ROUTE PLANNING =================
router.post('/routes/evaluate', evaluateRoute);
router.get('/routes/evaluations', getRouteEvaluations);
router.get('/routes/:shipmentId', getRouteByShipmentId);

// ================= WAREHOUSES & REFRIGERATION =================
router.get('/warehouses', getWarehouses);
router.post('/warehouses', createWarehouse);
router.get('/warehouses/:id', getWarehouseById);
router.put('/warehouses/:id', updateWarehouse);
router.post('/warehouses/:id/simulate-outage', simulatePowerOutage);
router.post('/warehouses/:id/restore-power', restorePower);

// ================= ALERTS =================
router.get('/alerts', getAlerts);
router.post('/alerts', createAlert);
router.put('/alerts/:id/acknowledge', acknowledgeAlert);
router.put('/alerts/:id/resolve', resolveAlert);

// ================= REPORTS =================
router.get('/reports/summary', getSummaryReport);
router.get('/reports/compliance', generateComplianceReport);
router.get('/reports/export-csv', exportCsvReport);

// ================= GEMINI AI & GROUNDING =================
router.post('/gemini/chat', handleGeminiChat);
router.post('/gemini/search-intelligence', getLiveSearchIntelligence);

export default router;
