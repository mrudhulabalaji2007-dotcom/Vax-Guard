import React, { useState, useMemo } from 'react';
import {
  ShipmentItem,
  WarehouseItem,
  EquipmentFailurePrediction,
} from '../types/index.js';
import {
  evaluateShipmentEquipment,
  evaluateWarehouseEquipment,
  SimulationState,
} from '../services/predictiveEquipmentModel.js';
import {
  AlertTriangle,
  Zap,
  Gauge,
  Activity,
  Wrench,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Radio,
  Flame,
  ArrowRight,
  Sparkles,
  ThermometerSnowflake,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  shipments: ShipmentItem[];
  warehouses: WarehouseItem[];
  onActionTriggered?: () => void;
}

export const PredictiveEquipmentRiskCard: React.FC<Props> = ({
  shipments,
  warehouses,
  onActionTriggered,
}) => {
  const navigate = useNavigate();

  // Active selected asset
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  // Local interactive simulation state for what-if stress testing
  const [simulation, setSimulation] = useState<SimulationState | null>(null);
  const [maintenanceSuccess, setMaintenanceSuccess] = useState<string | null>(null);

  // Set default asset to TRK-VAX-1008 (the at-risk shipment) or first shipment
  const defaultId = useMemo(() => {
    const atRisk = shipments.find((s) => s.status === 'AT_RISK' || s.riskLevel === 'HIGH' || s.riskLevel === 'CRITICAL');
    return atRisk?.trackingId || shipments[0]?.trackingId || warehouses[0]?.code || '';
  }, [shipments, warehouses]);

  const activeId = selectedAssetId || defaultId;

  // Find the selected entity
  const activeShipment = shipments.find((s) => s.trackingId === activeId);
  const activeWarehouse = !activeShipment ? warehouses.find((w) => w.code === activeId) : null;

  // Calculate prediction for the active asset
  const prediction: EquipmentFailurePrediction = useMemo(() => {
    if (activeShipment) {
      return evaluateShipmentEquipment(activeShipment, [], simulation || undefined);
    }
    if (activeWarehouse) {
      return evaluateWarehouseEquipment(activeWarehouse, simulation || undefined);
    }
    // Fallback default
    return {
      equipmentId: 'REEFER-SYS-01',
      equipmentName: 'Reefer Compressor Unit #1',
      equipmentType: 'REEFER_COMPRESSOR',
      relatedEntityId: 'TRK-001',
      relatedEntityName: 'Standard Payload',
      currentTemp: 4.8,
      safeMin: 2.0,
      safeMax: 8.0,
      ambientTemp: 30.2,
      thermalDriftPerHour: 0.12,
      compressorDutyCycle: 58,
      equipmentHealthScore: 88,
      failureProbability: 12,
      spoilageRiskScore: 15,
      predictedTimeToFailureHours: 48,
      predictedTimeToCriticalExcursionMinutes: 180,
      failureStage: 'OPTIMAL',
      rootCause: 'Normal closed-loop refrigeration cycling',
      diagnosticNotes: ['System operating within nominal parameters'],
      recommendedAction: 'Maintain current setpoint and continuous monitoring',
      metrics: {
        condenserPressurePsi: 215,
        powerDrawAmps: 14.5,
        vibrationIndex: 2.2,
        refrigerantLevelPct: 95,
      },
    };
  }, [activeShipment, activeWarehouse, simulation, activeId]);

  // Handler for simulating equipment stress / compressor leak
  const handleTriggerStress = (faultType: 'COMPRESSOR_SEAL' | 'REFRIGERANT_LEAK') => {
    setSimulation({
      equipmentId: activeId,
      stressFactor: 0.85,
      driftMultiplier: 1.15,
      simulatedFault: faultType,
    });
    setMaintenanceSuccess(null);
  };

  // Handler for reset / apply preventive recalibration
  const handleApplyMaintenance = () => {
    setSimulation(null);
    setMaintenanceSuccess('Applied emergency compressor recalibration & auxiliary cooling pack deployment.');
    setTimeout(() => setMaintenanceSuccess(null), 5000);
    if (onActionTriggered) onActionTriggered();
  };

  // Stage styles & badge rendering
  const getStageDisplay = (stage: EquipmentFailurePrediction['failureStage']) => {
    switch (stage) {
      case 'CRITICAL_FAILURE':
        return {
          textColor: 'text-red-700',
          dotColor: 'bg-red-600',
          borderColor: 'border-red-200',
          bgTint: 'bg-red-50/60',
          label: 'CRITICAL FAILURE IMMINENT',
        };
      case 'IMMINENT_FAILURE':
        return {
          textColor: 'text-amber-700',
          dotColor: 'bg-amber-600',
          borderColor: 'border-amber-200',
          bgTint: 'bg-amber-50/60',
          label: 'IMMINENT BREAKDOWN DETECTED',
        };
      case 'DEGRADING':
        return {
          textColor: 'text-yellow-800',
          dotColor: 'bg-yellow-500',
          borderColor: 'border-yellow-200',
          bgTint: 'bg-yellow-50/60',
          label: 'THERMAL EFFICIENCY DEGRADING',
        };
      default:
        return {
          textColor: 'text-emerald-700',
          dotColor: 'bg-emerald-600',
          borderColor: 'border-emerald-200',
          bgTint: 'bg-emerald-50/40',
          label: 'EQUIPMENT INTEGRITY NOMINAL',
        };
    }
  };

  const stageDisplay = getStageDisplay(prediction.failureStage);

  return (
    <div className="apple-liquid-glass-card rounded-3xl p-6 sm:p-7 space-y-6">
      
      {/* Header bar: Title, Domain Description & Asset Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white rounded-xl flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Predictive Spoilage & Equipment Failure Forecaster
                </h2>
                <span className="font-mono text-[10px] tracking-widest font-bold uppercase text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  AI Thermodynamic Model
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Analyzes multi-point temperature velocity (dT/dt), compressor duty cycles, and ambient load to forecast breakdown before spoilage
              </p>
            </div>
          </div>
        </div>

        {/* Asset Selector Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 lg:pb-0">
          <span className="text-[11px] font-semibold text-slate-400 font-mono uppercase tracking-wider mr-1">
            Asset:
          </span>
          {shipments.slice(0, 4).map((s) => (
            <button
              key={s.trackingId}
              onClick={() => {
                setSelectedAssetId(s.trackingId);
                setSimulation(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition whitespace-nowrap ${
                activeId === s.trackingId
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.08]'
              }`}
            >
              {s.trackingId}
              {s.status === 'AT_RISK' && <span className="ml-1 text-red-400 animate-pulse">●</span>}
            </button>
          ))}
          {warehouses.slice(0, 2).map((w) => (
            <button
              key={w.code}
              onClick={() => {
                setSelectedAssetId(w.code);
                setSimulation(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition whitespace-nowrap ${
                activeId === w.code
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.08]'
              }`}
            >
              {w.code}
            </button>
          ))}
        </div>
      </div>

      {/* Success Notification if Maintenance Action Dispatched */}
      {maintenanceSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{maintenanceSuccess}</span>
          </div>
          <button
            onClick={() => setMaintenanceSuccess(null)}
            className="text-emerald-700 hover:text-emerald-950 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Forecast Core Gauges & Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Column 1 (5 cols): Failure Probability & Equipment Health Index */}
        <div className="lg:col-span-5 bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Unit Monitored
              </span>
              <div className="font-bold text-sm text-slate-900 mt-0.5">
                {prediction.equipmentName}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Payload: {prediction.relatedEntityName}
              </div>
            </div>

            <div className={`px-2.5 py-1 rounded-md border text-xs font-bold flex items-center space-x-1.5 ${stageDisplay.bgTint} ${stageDisplay.borderColor} ${stageDisplay.textColor}`}>
              <span className={`w-2 h-2 rounded-full ${stageDisplay.dotColor} ${prediction.failureStage !== 'OPTIMAL' ? 'animate-pulse' : ''}`} />
              <span className="text-[11px]">{stageDisplay.label}</span>
            </div>
          </div>

          {/* Primary High-Density Gauges */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Equipment Health Meter */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Health Index</span>
                <ShieldCheck className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 flex items-baseline space-x-1">
                <span className={`text-3xl font-black font-mono ${
                  prediction.equipmentHealthScore < 40 ? 'text-red-600' :
                  prediction.equipmentHealthScore < 75 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {prediction.equipmentHealthScore}
                </span>
                <span className="text-slate-400 font-bold text-sm">/100</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    prediction.equipmentHealthScore < 40 ? 'bg-red-500' :
                    prediction.equipmentHealthScore < 75 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${prediction.equipmentHealthScore}%` }}
                />
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                {prediction.equipmentHealthScore >= 80 ? 'Normal mechanical wear' : 'Bearing & seal fatigue'}
              </div>
            </div>

            {/* Failure Probability Forecast */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Failure Risk</span>
                <AlertTriangle className={`w-4 h-4 ${prediction.failureProbability > 50 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
              </div>
              <div className="mt-2 flex items-baseline space-x-1">
                <span className={`text-3xl font-black font-mono ${
                  prediction.failureProbability > 60 ? 'text-red-600' :
                  prediction.failureProbability > 30 ? 'text-amber-600' : 'text-slate-800'
                }`}>
                  {prediction.failureProbability}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    prediction.failureProbability > 60 ? 'bg-red-500' :
                    prediction.failureProbability > 30 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${prediction.failureProbability}%` }}
                />
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                Vaccine Spoilage Risk: <span className="font-bold text-slate-800">{prediction.spoilageRiskScore}%</span>
              </div>
            </div>

          </div>

          {/* Time to Critical Event Countdown Strip */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-semibold flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Forecasted Mean Time to Failure (MTTF):</span>
              </span>
              <span className={`font-mono font-bold text-sm ${prediction.predictedTimeToFailureHours < 5 ? 'text-red-600' : 'text-slate-900'}`}>
                {prediction.predictedTimeToFailureHours < 72 ? `${prediction.predictedTimeToFailureHours} hours` : '> 72 hours (Nominal)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-slate-600 font-semibold flex items-center space-x-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Minutes to Safe Boundary Excursion:</span>
              </span>
              <span className={`font-mono font-bold text-sm ${prediction.predictedTimeToCriticalExcursionMinutes < 60 ? 'text-red-600' : 'text-emerald-700'}`}>
                {prediction.predictedTimeToCriticalExcursionMinutes === 0
                  ? 'Excursion Active'
                  : prediction.predictedTimeToCriticalExcursionMinutes < 999
                  ? `${prediction.predictedTimeToCriticalExcursionMinutes} min`
                  : 'Stable / No drift'}
              </span>
            </div>
          </div>

          {/* Thermal Velocity & Ambient Load Metrics */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
              <div className="text-[10px] text-slate-400 uppercase font-sans">Current Temp</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">{prediction.currentTemp}°C</div>
              <div className="text-[9px] text-slate-400 font-sans">Safe {prediction.safeMin}-{prediction.safeMax}°C</div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
              <div className="text-[10px] text-slate-400 uppercase font-sans">Thermal Drift</div>
              <div className={`text-sm font-bold mt-0.5 ${prediction.thermalDriftPerHour > 0.4 ? 'text-red-600' : 'text-slate-900'}`}>
                {prediction.thermalDriftPerHour > 0 ? `+${prediction.thermalDriftPerHour}` : prediction.thermalDriftPerHour}°C/h
              </div>
              <div className="text-[9px] text-slate-400 font-sans">dT/dt gradient</div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
              <div className="text-[10px] text-slate-400 uppercase font-sans">Duty Cycle</div>
              <div className={`text-sm font-bold mt-0.5 ${prediction.compressorDutyCycle > 85 ? 'text-amber-600' : 'text-slate-900'}`}>
                {prediction.compressorDutyCycle}%
              </div>
              <div className="text-[9px] text-slate-400 font-sans">Compressor load</div>
            </div>
          </div>

        </div>

        {/* Column 2 (7 cols): Mechanical Diagnostics, Root Cause & Preventive Dispatch */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
          
          {/* Mechanical IoT Telemetry Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Refrigeration Mechanical Telemetry
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Telemetry Protocol: ISO 14971 Cold-Chain Rig
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Head Pressure</div>
                <div className="text-base font-mono font-bold text-slate-900 mt-1">
                  {prediction.metrics.condenserPressurePsi} <span className="text-xs text-slate-500 font-normal">PSI</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Norm: 180-240</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Current Draw</div>
                <div className="text-base font-mono font-bold text-slate-900 mt-1">
                  {prediction.metrics.powerDrawAmps} <span className="text-xs text-slate-500 font-normal">A</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Norm: 12-16 A</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Vibration Index</div>
                <div className="text-base font-mono font-bold text-slate-900 mt-1">
                  {prediction.metrics.vibrationIndex} <span className="text-xs text-slate-500 font-normal">RMS</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Trip limit: 6.0</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Refrigerant (R-404)</div>
                <div className="text-base font-mono font-bold text-slate-900 mt-1">
                  {prediction.metrics.refrigerantLevelPct}%
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Min req: 75%</div>
              </div>

            </div>
          </div>

          {/* Root-Cause Diagnosis Box */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono tracking-wider font-bold uppercase text-cyan-400 flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Algorithmic Root-Cause Diagnostic</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Confidence: 94.6%
              </span>
            </div>

            <div className="font-semibold text-xs text-white">
              {prediction.rootCause}
            </div>

            <div className="space-y-1 text-[11px] text-slate-300">
              {prediction.diagnosticNotes.map((note, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <span className="text-cyan-400 font-bold mt-0.5">›</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Preventive Intervention & Execution */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900">
                  Prescribed Preventive Action
                </span>
                <p className="text-xs text-blue-950 font-medium mt-0.5">
                  {prediction.recommendedAction}
                </p>
              </div>
            </div>

            {/* Interactive Simulation & Quick Controls */}
            <div className="pt-2 border-t border-blue-200/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold text-slate-600">Simulate Anomaly:</span>
                <button
                  onClick={() => handleTriggerStress('COMPRESSOR_SEAL')}
                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition"
                >
                  Compressor Seal Stress
                </button>
                <button
                  onClick={() => handleTriggerStress('REFRIGERANT_LEAK')}
                  className="px-2.5 py-1 text-[11px] font-bold bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition"
                >
                  Refrigerant Leak
                </button>
              </div>

              <div className="flex items-center space-x-2">
                {simulation && (
                  <button
                    onClick={() => setSimulation(null)}
                    className="px-2.5 py-1 text-[11px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Anomaly</span>
                  </button>
                )}

                <button
                  onClick={handleApplyMaintenance}
                  className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition flex items-center space-x-1.5"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Dispatch Intervention</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
