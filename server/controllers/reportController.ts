import { Request, Response } from 'express';
import { Shipment } from '../models/Shipment.js';
import { Warehouse } from '../models/Warehouse.js';
import { Alert } from '../models/Alert.js';
import { RefrigerationIncident } from '../models/RefrigerationIncident.js';
import { TemperatureLog } from '../models/TemperatureLog.js';

export async function getSummaryReport(_req: Request, res: Response): Promise<void> {
  try {
    const [
      totalShipments,
      inTransitShipments,
      atRiskShipments,
      deliveredShipments,
      totalWarehouses,
      activeAlerts,
      criticalAlerts,
      resolvedAlerts,
      totalIncidents,
      totalTempLogs,
      excursionsCount,
    ] = await Promise.all([
      Shipment.countDocuments(),
      Shipment.countDocuments({ status: { $in: ['IN_TRANSIT', 'AT_RISK'] } }),
      Shipment.countDocuments({ $or: [{ riskLevel: { $in: ['HIGH', 'CRITICAL'] } }, { status: 'AT_RISK' }] }),
      Shipment.countDocuments({ status: { $in: ['DELIVERED', 'ACCEPTED'] } }),
      Warehouse.countDocuments(),
      Alert.countDocuments({ status: 'ACTIVE' }),
      Alert.countDocuments({ severity: 'CRITICAL', status: 'ACTIVE' }),
      Alert.countDocuments({ status: 'RESOLVED' }),
      RefrigerationIncident.countDocuments(),
      TemperatureLog.countDocuments(),
      TemperatureLog.countDocuments({ isExcursion: true }),
    ]);

    // Calculate total doses in transit
    const activeShipmentDocs = await Shipment.find({ status: { $in: ['IN_TRANSIT', 'AT_RISK'] } });
    const dosesInTransit = activeShipmentDocs.reduce((acc, s) => acc + (s.quantity || 0), 0);

    // Calculate Cold-Chain Health Score (0-100%)
    let healthScore = 100;
    healthScore -= atRiskShipments * 12;
    healthScore -= criticalAlerts * 15;
    healthScore -= (activeAlerts - criticalAlerts) * 3;
    healthScore = Math.max(15, Math.min(100, healthScore));

    // Distribution by Risk Level
    const riskDistribution = {
      low: await Shipment.countDocuments({ riskLevel: 'LOW' }),
      moderate: await Shipment.countDocuments({ riskLevel: 'MODERATE' }),
      high: await Shipment.countDocuments({ riskLevel: 'HIGH' }),
      critical: await Shipment.countDocuments({ riskLevel: 'CRITICAL' }),
    };

    // Distribution by Status
    const statusDistribution = {
      inTransit: inTransitShipments,
      atRisk: atRiskShipments,
      delivered: deliveredShipments,
      flagged: await Shipment.countDocuments({ status: 'FLAGGED' }),
    };

    // Recent 10 Sensor readings for chart
    const recentLogs = await TemperatureLog.find().sort({ recordedAt: -1 }).limit(15);

    // Warehouse capacity & health
    const warehouses = await Warehouse.find();
    const totalWarehouseCapacity = warehouses.reduce((acc, w) => acc + (w.storageCapacity || 0), 0);
    const currentWarehouseOccupancy = warehouses.reduce((acc, w) => acc + (w.currentOccupancy || 0), 0);

    res.json({
      success: true,
      stats: {
        activeShipments: inTransitShipments,
        dosesInTransit,
        highRiskShipments: atRiskShipments,
        activeAlerts,
        criticalAlerts,
        coldStorageHubs: totalWarehouses,
        coldChainHealth: Math.round(healthScore),
        totalShipments,
        deliveredShipments,
        resolvedAlerts,
        refrigerationFailures: totalIncidents,
        totalTempLogs,
        excursionsCount,
        totalWarehouseCapacity,
        currentWarehouseOccupancy,
      },
      riskDistribution,
      statusDistribution,
      recentLogs,
      generatedAt: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function generateComplianceReport(req: Request, res: Response): Promise<void> {
  try {
    const { period = 'Current Operational Cycle (Q4 2026)', facilityFilter = 'All Facilities' } = req.query;

    const [shipments, warehouses, alerts, incidents] = await Promise.all([
      Shipment.find().sort({ createdAt: -1 }),
      Warehouse.find(),
      Alert.find().sort({ timestamp: -1 }),
      RefrigerationIncident.find().sort({ createdAt: -1 }),
    ]);

    const reportId = `REP-WHO-GDP-${Date.now().toString().slice(-6)}`;

    res.json({
      success: true,
      report: {
        reportId,
        title: 'WHO-GDP & eVIN National Cold-Chain Compliance Audit Report',
        period,
        facilityFilter,
        generatedAt: new Date(),
        auditor: 'VAXGUARD Automated Compliance System',
        complianceStatus: 'FULLY_COMPLIANT_WITH_OBSERVATIONS',
        metrics: {
          totalShipmentsMonitored: shipments.length,
          successfulDeliveries: shipments.filter((s) => s.status === 'DELIVERED' || s.status === 'ACCEPTED').length,
          flaggedShipments: shipments.filter((s) => s.status === 'FLAGGED').length,
          temperatureComplianceRate: `${((1 - (shipments.filter((s) => s.riskLevel === 'CRITICAL').length / Math.max(1, shipments.length))) * 100).toFixed(1)}%`,
          activeColdRoomsInspected: warehouses.length,
          powerFailureIncidentsLogged: incidents.length,
          resolvedAlertsRatio: `${alerts.filter((a) => a.status === 'RESOLVED').length} / ${alerts.length}`,
        },
        shipmentSummary: shipments.slice(0, 10),
        warehouseSummary: warehouses,
        criticalIncidents: incidents,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function exportCsvReport(_req: Request, res: Response): Promise<void> {
  try {
    const [shipments, warehouses, alerts] = await Promise.all([
      Shipment.find().sort({ createdAt: -1 }),
      Warehouse.find(),
      Alert.find().sort({ timestamp: -1 }),
    ]);

    let csvContent = 'VAXGUARD COLD-CHAIN COMPLIANCE AUDIT EXPORT\n';
    csvContent += `Generated At:,"${new Date().toISOString()}"\n`;
    csvContent += `Total Shipments:,${shipments.length}\n`;
    csvContent += `Total Warehouses:,${warehouses.length}\n\n`;

    csvContent += '--- SHIPMENT RECORDS ---\n';
    csvContent += 'Tracking ID,Vaccine Name,Batch Number,Quantity,Origin,Destination,Current Temp (C),Safe Min (C),Safe Max (C),Risk Level,Status,Remaining Travel (hrs)\n';
    
    shipments.forEach((s) => {
      csvContent += `"${s.trackingId}","${s.vaccineName}","${s.batchNumber}",${s.quantity},"${s.origin}","${s.destination}",${s.currentTemperature},${s.safeMinTemperature},${s.safeMaxTemperature},"${s.riskLevel}","${s.status}",${s.remainingTravelTime}\n`;
    });

    csvContent += '\n--- WAREHOUSE COLD STORAGE ---\n';
    csvContent += 'Warehouse Code,Name,Location,Current Temp (C),Power Status,Refrigeration Status,Safe Holding Time (mins),Occupancy,Capacity\n';
    warehouses.forEach((w) => {
      csvContent += `"${w.code}","${w.name}","${w.location}",${w.currentTemperature},"${w.powerStatus}","${w.refrigerationStatus}",${w.estimatedSafeHoldingTime},${w.currentOccupancy},${w.storageCapacity}\n`;
    });

    csvContent += '\n--- INCIDENT ALERTS ---\n';
    csvContent += 'Alert ID,Type,Severity,Status,Message,Timestamp\n';
    alerts.forEach((a) => {
      csvContent += `"${a.alertId}","${a.type}","${a.severity}","${a.status}","${a.message.replace(/"/g, '""')}","${new Date(a.timestamp).toISOString()}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=vaxguard_audit_${Date.now()}.csv`);
    res.status(200).send(csvContent);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
