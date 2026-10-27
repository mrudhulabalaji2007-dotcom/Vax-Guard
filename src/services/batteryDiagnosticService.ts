import { ShipmentItem, ReeferBatteryStatus } from '../types/index.js';

/**
 * Mobile Refrigeration Battery & Power Diagnostic Service
 * Computes real-time State-of-Charge (SoC), State-of-Health (SoH),
 * discharge current under thermal load, and precise Time-to-Empty (TTE) projections.
 */

export function calculateReeferBatteryStatus(
  shipment: ShipmentItem,
  simulatedOverrides?: Partial<ReeferBatteryStatus>
): ReeferBatteryStatus {
  // Hash seed from tracking ID for realistic consistency across shipments
  let seed = 0;
  for (let i = 0; i < shipment.trackingId.length; i++) {
    seed = (seed << 5) - seed + shipment.trackingId.charCodeAt(i);
    seed |= 0;
  }
  const positiveSeed = Math.abs(seed);

  // Default battery baseline based on shipment status & risk
  let batteryPercentage = 84;
  let powerSource: ReeferBatteryStatus['powerSource'] = 'VEHICLE_ALTERNATOR';
  let batteryVoltage = 25.8;
  let dischargeRateAmps = -11.5; // Negative = discharging
  let batteryHealthSoH = 94;
  let batteryTempCelsius = 27.4;

  // Specific baseline variations for realistic fleet diversity:
  if (shipment.trackingId === 'TRK-VAX-1008' || shipment.status === 'AT_RISK') {
    // Critical unit: high discharge, low battery, running on auxiliary battery alone
    batteryPercentage = 22;
    powerSource = 'AUX_BATTERY';
    batteryVoltage = 23.4;
    dischargeRateAmps = -19.8; // Heavy load trying to compensate for rising temperature
    batteryHealthSoH = 78;
    batteryTempCelsius = 34.2;
  } else if (shipment.trackingId === 'TRK-VAX-1005') {
    // Moderate warning unit
    batteryPercentage = 46;
    powerSource = 'AUX_BATTERY';
    batteryVoltage = 24.2;
    dischargeRateAmps = -14.2;
    batteryHealthSoH = 88;
    batteryTempCelsius = 29.8;
  } else if (shipment.trackingId === 'TRK-VAX-1001') {
    // Optimal solar hybrid
    batteryPercentage = 95;
    powerSource = 'SOLAR_HYBRID';
    batteryVoltage = 27.2;
    dischargeRateAmps = 4.5; // Positive = net charging!
    batteryHealthSoH = 98;
    batteryTempCelsius = 25.1;
  } else {
    // Dynamic based on hash
    const pctOptions = [88, 76, 62, 91, 54];
    batteryPercentage = pctOptions[positiveSeed % pctOptions.length];
    powerSource = batteryPercentage > 70 ? 'VEHICLE_ALTERNATOR' : 'AUX_BATTERY';
    batteryVoltage = Number((24.0 + (batteryPercentage / 100) * 3.0).toFixed(1));
    dischargeRateAmps = batteryPercentage > 85 ? Number((-6.5 + (positiveSeed % 3)).toFixed(1)) : Number((-13.0 - (positiveSeed % 5)).toFixed(1));
    batteryHealthSoH = 90 + (positiveSeed % 8);
    batteryTempCelsius = Number((26.0 + (positiveSeed % 5)).toFixed(1));
  }

  // Apply any simulation overrides
  if (simulatedOverrides) {
    if (simulatedOverrides.batteryPercentage !== undefined) batteryPercentage = simulatedOverrides.batteryPercentage;
    if (simulatedOverrides.powerSource !== undefined) powerSource = simulatedOverrides.powerSource;
    if (simulatedOverrides.batteryVoltage !== undefined) batteryVoltage = simulatedOverrides.batteryVoltage;
    if (simulatedOverrides.dischargeRateAmps !== undefined) dischargeRateAmps = simulatedOverrides.dischargeRateAmps;
  }

  // Nominal battery pack capacity = 200 Ah (Standard Reefer 24V Pack)
  const nominalCapacityAh = 200;
  const remainingCapacityAh = (batteryPercentage / 100) * nominalCapacityAh;

  // Time-to-Empty (TTE) calculation
  let timeToEmptyHours = 99; // Default indefinite if charging
  let timeToEmptyMinutes = 9999;

  if (dischargeRateAmps < 0) {
    const netCurrent = Math.abs(dischargeRateAmps);
    timeToEmptyHours = Number((remainingCapacityAh / netCurrent).toFixed(2));
    timeToEmptyMinutes = Math.round(timeToEmptyHours * 60);
  } else {
    // Charging - time to full instead or stable runtime
    timeToEmptyHours = 48.0;
    timeToEmptyMinutes = 2880;
  }

  const remainingTravelHours = shipment.remainingTravelTime || 3.5;
  const deficitHours = Number((remainingTravelHours - timeToEmptyHours).toFixed(2));

  // Determine Power Risk Level
  let powerRiskLevel: ReeferBatteryStatus['powerRiskLevel'] = 'NOMINAL';
  if (batteryPercentage < 25 || (deficitHours > 0 && dischargeRateAmps < 0)) {
    powerRiskLevel = 'CRITICAL_DEPLETION';
  } else if (batteryPercentage < 50 || deficitHours > -1.0) {
    powerRiskLevel = 'ELEVATED';
  }

  // Recommended Intervention
  let recommendedIntervention = 'Battery SoC nominal. Continuous alternator trickle engaged.';
  if (powerRiskLevel === 'CRITICAL_DEPLETION') {
    if (deficitHours > 0) {
      recommendedIntervention = `URGENT: Battery empties ${deficitHours} hrs before delivery arrival. Engage vehicle high-idle alternator PTO or divert to nearest charging waypoint immediately.`;
    } else {
      recommendedIntervention = `CRITICAL: Battery SoC is below 25%. Switch compressor to Eco-Pulse mode and connect auxiliary shore line.`;
    }
  } else if (powerRiskLevel === 'ELEVATED') {
    recommendedIntervention = `ADVISORY: Monitor auxiliary battery draw. Verify vehicle 12V/24V alternator DC-DC converter switch is set to CHARGE.`;
  }

  // Passive vacuum insulation holding time after complete battery exhaustion
  const estimatedSpoilageOnsetMinutes = Math.round(60 + (8.0 - Math.min(8.0, shipment.currentTemperature)) * 25);

  return {
    shipmentId: shipment._id,
    trackingId: shipment.trackingId,
    vaccineName: shipment.vaccineName,
    vehicleReg: shipment.vehicleReg || 'TN-01-BX-4921',
    storageUnit: shipment.storageUnit || 'Reefer Unit #4',
    origin: shipment.origin,
    destination: shipment.destination,
    currentTemperature: shipment.currentTemperature,
    batteryPercentage,
    batteryVoltage,
    dischargeRateAmps,
    powerSource,
    batteryHealthSoH,
    batteryTempCelsius,
    timeToEmptyMinutes,
    timeToEmptyHours,
    remainingTravelHours,
    deficitHours: Math.max(0, deficitHours),
    powerRiskLevel,
    recommendedIntervention,
    estimatedSpoilageOnsetMinutes,
  };
}

/**
 * Returns battery statuses for an entire array of active shipments
 */
export function calculateFleetBatteryOverview(shipments: ShipmentItem[]): {
  statuses: ReeferBatteryStatus[];
  criticalCount: number;
  elevatedCount: number;
  nominalCount: number;
  avgBatteryLevel: number;
} {
  const statuses = shipments.map((s) => calculateReeferBatteryStatus(s));
  const criticalCount = statuses.filter((b) => b.powerRiskLevel === 'CRITICAL_DEPLETION').length;
  const elevatedCount = statuses.filter((b) => b.powerRiskLevel === 'ELEVATED').length;
  const nominalCount = statuses.filter((b) => b.powerRiskLevel === 'NOMINAL').length;
  const avgBatteryLevel = statuses.length > 0
    ? Math.round(statuses.reduce((acc, b) => acc + b.batteryPercentage, 0) / statuses.length)
    : 100;

  return {
    statuses,
    criticalCount,
    elevatedCount,
    nominalCount,
    avgBatteryLevel,
  };
}
