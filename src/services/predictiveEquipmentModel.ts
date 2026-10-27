import { ShipmentItem, WarehouseItem, EquipmentFailurePrediction, TemperatureLogItem } from '../types/index.js';

/**
 * Thermodynamic & Predictive Equipment Failure Engine
 * Models refrigeration compressor health, thermal runaway, insulation degradation,
 * and vaccine spoilage probability.
 */

export interface SimulationState {
  equipmentId: string;
  stressFactor: number; // 0 to 1
  driftMultiplier: number;
  simulatedFault?: 'COMPRESSOR_SEAL' | 'REFRIGERANT_LEAK' | 'POWER_INTERMITTENCY' | 'CONDENSER_CLOG';
}

/**
 * Calculates predictive equipment failure telemetry for a given shipment and its logs
 */
export function evaluateShipmentEquipment(
  shipment: ShipmentItem,
  logs: TemperatureLogItem[] = [],
  simulation?: SimulationState
): EquipmentFailurePrediction {
  const currentTemp = shipment.currentTemperature;
  const safeMin = shipment.safeMinTemperature || 2.0;
  const safeMax = shipment.safeMaxTemperature || 8.0;
  const safeSpan = safeMax - safeMin;
  const safeMid = (safeMin + safeMax) / 2;

  // Derive ambient temperature from logs or estimate
  const latestLog = logs[logs.length - 1];
  const ambientTemp = latestLog?.ambientTemperature ?? 29.5;

  // Calculate thermal gradient dT/dt (°C / hour)
  let thermalDriftPerHour = 0;
  if (logs.length >= 2) {
    const recent = [...logs].slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const timeDiffHours = Math.max(
      0.1,
      (new Date(last.recordedAt).getTime() - new Date(first.recordedAt).getTime()) / (1000 * 60 * 60)
    );
    thermalDriftPerHour = (last.temperature - first.temperature) / timeDiffHours;
  } else {
    // Default drift based on current temp relative to mid
    thermalDriftPerHour = currentTemp > safeMid ? (currentTemp - safeMid) * 0.22 : -0.05;
  }

  // Apply simulation stress if active for this unit
  if (simulation && simulation.equipmentId === shipment.trackingId) {
    thermalDriftPerHour += simulation.driftMultiplier;
  }

  // Compressor Duty Cycle Estimation:
  // Normal duty cycle is 40-60%. If temp is rising despite compressor running, duty cycle saturates at 90-100%
  const tempDeltaToMax = safeMax - currentTemp;
  let compressorDutyCycle = 52;
  if (thermalDriftPerHour > 0.4 || currentTemp > 6.5) {
    compressorDutyCycle = Math.min(99, Math.round(75 + (currentTemp - 5.0) * 8 + thermalDriftPerHour * 15));
  } else if (currentTemp < safeMin) {
    compressorDutyCycle = 15; // stuck cooling or frozen relay
  } else {
    compressorDutyCycle = Math.max(38, Math.min(68, Math.round(50 + (currentTemp - 4.5) * 5)));
  }

  // Metric simulations grounded in physical reefer systems (e.g. Thermo King / Carrier Transicold)
  let condenserPressurePsi = 210;
  let powerDrawAmps = 14.2;
  let vibrationIndex = 2.4; // scale 0-10
  let refrigerantLevelPct = 94;

  if (thermalDriftPerHour > 0.6 || currentTemp > 7.0 || simulation?.simulatedFault === 'COMPRESSOR_SEAL') {
    condenserPressurePsi = Math.round(280 + thermalDriftPerHour * 35);
    powerDrawAmps = Number((18.5 + thermalDriftPerHour * 2.2).toFixed(1));
    vibrationIndex = Number(Math.min(9.8, 6.2 + thermalDriftPerHour * 1.8).toFixed(1));
    refrigerantLevelPct = Math.max(48, Math.round(85 - thermalDriftPerHour * 20));
  } else if (simulation?.simulatedFault === 'REFRIGERANT_LEAK') {
    refrigerantLevelPct = 42;
    condenserPressurePsi = 145; // low pressure on leak
    powerDrawAmps = 21.0;
    vibrationIndex = 7.8;
  }

  // Equipment Health Score Calculation (0-100)
  let healthScore = 95;
  if (thermalDriftPerHour > 0.1) {
    healthScore -= thermalDriftPerHour * 28;
  }
  if (compressorDutyCycle > 80) {
    healthScore -= (compressorDutyCycle - 80) * 1.6;
  }
  if (vibrationIndex > 5) {
    healthScore -= (vibrationIndex - 5) * 6;
  }
  if (refrigerantLevelPct < 80) {
    healthScore -= (80 - refrigerantLevelPct) * 0.8;
  }
  if (currentTemp > safeMax || currentTemp < safeMin) {
    healthScore -= 30;
  }
  healthScore = Math.max(8, Math.min(100, Math.round(healthScore)));

  // Failure Probability (0-100%)
  let failureProbability = Math.max(2, Math.min(98, Math.round(100 - healthScore * 0.95)));
  if (shipment.status === 'AT_RISK' || shipment.riskLevel === 'CRITICAL') {
    failureProbability = Math.max(76, failureProbability);
  }

  // Spoilage Risk Score
  let spoilageRiskScore = shipment.riskScore || 20;
  if (failureProbability > 70) {
    spoilageRiskScore = Math.max(spoilageRiskScore, Math.round(failureProbability * 0.92));
  }

  // Time-to-Failure (MTTF) in hours
  let predictedTimeToFailureHours = 72; // default healthy
  if (healthScore < 40) {
    predictedTimeToFailureHours = Number((1.2 + (healthScore / 40) * 2.8).toFixed(1));
  } else if (healthScore < 70) {
    predictedTimeToFailureHours = Number((4.5 + ((healthScore - 40) / 30) * 12).toFixed(1));
  } else {
    predictedTimeToFailureHours = Number((24 + ((healthScore - 70) / 30) * 48).toFixed(1));
  }

  // Time to Critical Excursion in minutes
  let predictedTimeToCriticalExcursionMinutes = 0;
  if (currentTemp > safeMax) {
    predictedTimeToCriticalExcursionMinutes = 0; // already in excursion
  } else if (thermalDriftPerHour > 0.05) {
    const margin = safeMax - currentTemp;
    predictedTimeToCriticalExcursionMinutes = Math.max(5, Math.round((margin / thermalDriftPerHour) * 60));
  } else {
    predictedTimeToCriticalExcursionMinutes = 999; // safe indefinite under current trajectory
  }

  // Determine Failure Stage
  let failureStage: EquipmentFailurePrediction['failureStage'] = 'OPTIMAL';
  if (healthScore < 35 || currentTemp >= safeMax) {
    failureStage = 'CRITICAL_FAILURE';
  } else if (healthScore < 60 || failureProbability > 60) {
    failureStage = 'IMMINENT_FAILURE';
  } else if (healthScore < 82 || failureProbability > 25) {
    failureStage = 'DEGRADING';
  }

  // Root Cause Diagnosis & Actionable Insights
  let rootCause = 'Normal continuous inverter cycling within factory calibration';
  const diagnosticNotes: string[] = [];

  if (failureStage === 'CRITICAL_FAILURE' || failureStage === 'IMMINENT_FAILURE') {
    if (refrigerantLevelPct < 65) {
      rootCause = 'Refrigerant R-404A circuit depressurization & thermal runaway';
      diagnosticNotes.push('Suction pressure below 18 PSI threshold; evaporator coil icing detected.');
      diagnosticNotes.push('Compressor running 100% duty cycle unable to overcome solar ambient penetration.');
    } else if (vibrationIndex > 6.5) {
      rootCause = 'Mechanical compressor piston / bearing seizure & winding overheat';
      diagnosticNotes.push('Harmonic vibration exceeding 6.5 RMS; stator drawing excess inductive current.');
      diagnosticNotes.push('Thermal overload switch tripped twice in the last 90 minutes.');
    } else {
      rootCause = 'Condenser fan motor stall & degraded thermal insulation barrier';
      diagnosticNotes.push('Ambient heat influx delta +21.4°C exceeding heat dissipation capacity.');
      diagnosticNotes.push('Reefer compartment thermal leakage detected at rear door perimeter.');
    }
  } else if (failureStage === 'DEGRADING') {
    rootCause = 'Moderate compressor duty cycle saturation & initial thermal drift';
    diagnosticNotes.push('Thermal drift climbing at +' + thermalDriftPerHour.toFixed(2) + '°C/hr under ambient sun load.');
    diagnosticNotes.push('Recommend setpoint micro-adjustment and auxiliary ice pack verification.');
  } else {
    diagnosticNotes.push('Thermal inertia nominal; hermetic seal integrity 99.1%.');
    diagnosticNotes.push('Estimated autonomous holding time exceeds route duration by >6 hours.');
  }

  // Action recommendation
  let recommendedAction = 'Routine cold-chain monitoring. Telemetry nominal.';
  if (failureStage === 'CRITICAL_FAILURE') {
    recommendedAction = 'EMERGENCY: Immediate detour to nearest cold-storage hub or deploy secondary dry-ice pack. Contact driver immediately.';
  } else if (failureStage === 'IMMINENT_FAILURE') {
    recommendedAction = 'ACTION REQUIRED: Dispatch field maintenance to rendezvous at waypoint; switch reefer to auxiliary battery power backup.';
  } else if (failureStage === 'DEGRADING') {
    recommendedAction = 'PREVENTATIVE: Pre-cool cargo bay setpoint by -1.5°C; alert destination receiving dock for expedited offload.';
  }

  return {
    equipmentId: shipment.vehicleReg || shipment.storageUnit || `EQ-${shipment.trackingId.slice(-4)}`,
    equipmentName: `${shipment.storageUnit || 'Reefer Unit'} [${shipment.vehicleReg || 'Fleet Truck'}]`,
    equipmentType: 'REEFER_COMPRESSOR',
    relatedEntityId: shipment.trackingId,
    relatedEntityName: `${shipment.vaccineName} (${shipment.batchNumber})`,
    currentTemp: Number(currentTemp.toFixed(1)),
    safeMin,
    safeMax,
    ambientTemp: Number(ambientTemp.toFixed(1)),
    thermalDriftPerHour: Number(thermalDriftPerHour.toFixed(2)),
    compressorDutyCycle,
    equipmentHealthScore: healthScore,
    failureProbability,
    spoilageRiskScore,
    predictedTimeToFailureHours,
    predictedTimeToCriticalExcursionMinutes,
    failureStage,
    rootCause,
    diagnosticNotes,
    recommendedAction,
    preventiveDispatchRoute: `${shipment.origin} → [Safe Depot] → ${shipment.destination}`,
    lastServiceDate: '2026-09-14',
    metrics: {
      condenserPressurePsi,
      powerDrawAmps,
      vibrationIndex,
      refrigerantLevelPct,
    },
  };
}

/**
 * Calculates predictive equipment failure telemetry for warehouse chillers
 */
export function evaluateWarehouseEquipment(
  warehouse: WarehouseItem,
  simulation?: SimulationState
): EquipmentFailurePrediction {
  const currentTemp = warehouse.currentTemperature;
  const safeMin = warehouse.safeMinTemperature || 2.0;
  const safeMax = warehouse.safeMaxTemperature || 8.0;
  const isPowerOff = warehouse.powerStatus === 'OFF';
  const ambientTemp = warehouse.ambientTemperature || 31.0;

  let thermalDriftPerHour = isPowerOff ? 0.85 : 0.05;
  if (warehouse.refrigerationStatus === 'FAILURE') thermalDriftPerHour = 1.4;
  else if (warehouse.refrigerationStatus === 'WARNING') thermalDriftPerHour = 0.45;

  if (simulation && simulation.equipmentId === warehouse.code) {
    thermalDriftPerHour += simulation.driftMultiplier;
  }

  let healthScore = isPowerOff ? 22 : 92;
  if (warehouse.refrigerationStatus === 'WARNING') healthScore = 55;
  if (warehouse.refrigerationStatus === 'FAILURE') healthScore = 18;

  let failureProbability = Math.max(4, Math.min(99, 100 - healthScore));
  let spoilageRiskScore = Math.max(5, Math.min(98, Math.round(failureProbability * 0.9)));

  const predictedTimeToFailureHours = isPowerOff ? 1.5 : healthScore > 75 ? 168 : 8.2;
  const margin = Math.max(0, safeMax - currentTemp);
  const predictedTimeToCriticalExcursionMinutes =
    currentTemp >= safeMax ? 0 : Math.max(10, Math.round((margin / Math.max(0.08, thermalDriftPerHour)) * 60));

  let failureStage: EquipmentFailurePrediction['failureStage'] = 'OPTIMAL';
  if (isPowerOff || healthScore < 30 || currentTemp >= safeMax) failureStage = 'CRITICAL_FAILURE';
  else if (healthScore < 60) failureStage = 'IMMINENT_FAILURE';
  else if (healthScore < 80) failureStage = 'DEGRADING';

  const diagnosticNotes: string[] = [
    `Primary chiller bank operating on ${warehouse.powerStatus === 'ON' ? 'Grid Power' : 'Backup Diesel Inactive'}`,
    `Thermal insulation holding buffer: ${warehouse.estimatedSafeHoldingTime || 4} hours remaining`,
  ];

  return {
    equipmentId: `CHILLER-${warehouse.code}`,
    equipmentName: `${warehouse.name} - Central Cold-Room Chiller Bank`,
    equipmentType: 'STORAGE_CHILLER',
    relatedEntityId: warehouse.code,
    relatedEntityName: `${warehouse.name} (${Number(warehouse.currentOccupancy).toLocaleString()} doses)`,
    currentTemp: Number(currentTemp.toFixed(1)),
    safeMin,
    safeMax,
    ambientTemp: Number(ambientTemp.toFixed(1)),
    thermalDriftPerHour: Number(thermalDriftPerHour.toFixed(2)),
    compressorDutyCycle: isPowerOff ? 0 : 78,
    equipmentHealthScore: healthScore,
    failureProbability,
    spoilageRiskScore,
    predictedTimeToFailureHours,
    predictedTimeToCriticalExcursionMinutes,
    failureStage,
    rootCause: isPowerOff
      ? 'Grid Main Transformer Trip - Chiller Compressor De-energized'
      : warehouse.refrigerationStatus === 'WARNING'
      ? 'Condenser Coil Fouling & High Head Pressure'
      : 'Optimal Closed-Loop Dual Chiller Redundancy Active',
    diagnosticNotes,
    recommendedAction: isPowerOff
      ? 'CRITICAL: Start secondary diesel generator immediately and verify transfer switch engagement.'
      : 'Standard automated thermal monitoring.',
    lastServiceDate: '2026-08-20',
    metrics: {
      condenserPressurePsi: isPowerOff ? 40 : 225,
      powerDrawAmps: isPowerOff ? 0 : 64.5,
      vibrationIndex: isPowerOff ? 0 : 2.1,
      refrigerantLevelPct: 96,
    },
  };
}
