import React, { useState } from 'react';
import { ShipmentItem, ReeferBatteryStatus } from '../types/index.js';
import {
  calculateReeferBatteryStatus,
  calculateFleetBatteryOverview,
} from '../services/batteryDiagnosticService.js';
import {
  Battery,
  BatteryCharging,
  BatteryWarning,
  Zap,
  Clock,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  ChevronRight,
  Gauge,
  Sliders,
  RotateCcw,
  Sun,
  Truck,
  Flame,
  ArrowUpRight,
  Info,
} from 'lucide-react';

interface Props {
  shipments: ShipmentItem[];
  selectedShipmentId?: string;
  onSelectShipment?: (shipmentId: string) => void;
  onLocateOnMap?: (trackingId: string) => void;
}

export const ReeferBatteryDiagnosticPanel: React.FC<Props> = ({
  shipments,
  selectedShipmentId,
  onSelectShipment,
  onLocateOnMap,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'DISCHARGING'>('ALL');
  const [search, setSearch] = useState('');
  // Local simulated interventions map (e.g. trackingId -> boosted)
  const [boostedUnits, setBoostedUnits] = useState<Record<string, boolean>>({});

  const overview = calculateFleetBatteryOverview(shipments);

  // Compute live statuses taking into account user interactive boost
  const batteryStatuses: ReeferBatteryStatus[] = shipments.map((s) => {
    const isBoosted = boostedUnits[s.trackingId];
    if (isBoosted) {
      return calculateReeferBatteryStatus(s, {
        powerSource: 'VEHICLE_ALTERNATOR',
        dischargeRateAmps: 6.5, // Now actively charging!
        batteryPercentage: Math.min(100, (calculateReeferBatteryStatus(s).batteryPercentage + 15)),
      });
    }
    return calculateReeferBatteryStatus(s);
  });

  const filteredStatuses = batteryStatuses.filter((b) => {
    if (filter === 'CRITICAL' && b.powerRiskLevel !== 'CRITICAL_DEPLETION') return false;
    if (filter === 'DISCHARGING' && b.dischargeRateAmps >= 0) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        b.trackingId.toLowerCase().includes(q) ||
        b.vehicleReg.toLowerCase().includes(q) ||
        b.storageUnit.toLowerCase().includes(q) ||
        b.destination.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleToggleBoost = (trackingId: string) => {
    setBoostedUnits((prev) => ({
      ...prev,
      [trackingId]: !prev[trackingId],
    }));
  };

  const getPowerSourceIcon = (source: ReeferBatteryStatus['powerSource']) => {
    switch (source) {
      case 'SOLAR_HYBRID':
        return <Sun className="w-3.5 h-3.5 text-amber-500" />;
      case 'VEHICLE_ALTERNATOR':
        return <Zap className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <Battery className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-5">
      
      {/* Top Header: Title, Telemetry Summary & Filter Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-slate-900 text-cyan-400">
              <BatteryCharging className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Mobile Refrigeration Power & Battery Diagnostics
                </h3>
                <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Time-to-Empty Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time State-of-Charge (SoC), alternator draw, and route completion battery margins
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Pill Strip */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
            Avg SoC: <span className="font-bold text-slate-900">{overview.avgBatteryLevel}%</span>
          </div>
          <div className={`px-2.5 py-1 rounded-lg border font-bold ${
            overview.criticalCount > 0 ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {overview.criticalCount} At-Risk
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Units ({batteryStatuses.length})
          </button>
          <button
            onClick={() => setFilter('CRITICAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'CRITICAL'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
          >
            Critical & Deficit ({batteryStatuses.filter(b => b.powerRiskLevel === 'CRITICAL_DEPLETION').length})
          </button>
          <button
            onClick={() => setFilter('DISCHARGING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'DISCHARGING'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Active Discharge ({batteryStatuses.filter(b => b.dischargeRateAmps < 0).length})
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by ID, Reg, Destination..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-64"
        />
      </div>

      {/* High-Density Battery Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStatuses.map((unit) => {
          const isSelected = selectedShipmentId === unit.trackingId;
          const isBoosted = boostedUnits[unit.trackingId];
          const hasDeficit = unit.deficitHours > 0 && unit.dischargeRateAmps < 0;

          return (
            <div
              key={unit.trackingId}
              onClick={() => onSelectShipment && onSelectShipment(unit.trackingId)}
              className={`p-4 rounded-xl border transition cursor-pointer relative ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/40 shadow-xs ring-1 ring-blue-500'
                  : unit.powerRiskLevel === 'CRITICAL_DEPLETION'
                  ? 'border-red-200 bg-red-50/30 hover:border-red-300'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {/* Unit Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono font-bold text-xs text-blue-700">
                      {unit.trackingId}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {unit.vehicleReg}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 mt-0.5">
                    {unit.storageUnit}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                    <span>{unit.origin}</span>
                    <span>→</span>
                    <span className="font-medium text-slate-700">{unit.destination}</span>
                  </div>
                </div>

                {/* Battery % Chip */}
                <div className="text-right">
                  <div className="flex items-center justify-end space-x-1">
                    {unit.dischargeRateAmps >= 0 ? (
                      <BatteryCharging className="w-4 h-4 text-emerald-600 animate-pulse" />
                    ) : unit.batteryPercentage < 25 ? (
                      <BatteryWarning className="w-4 h-4 text-red-600 animate-pulse" />
                    ) : (
                      <Battery className="w-4 h-4 text-slate-600" />
                    )}
                    <span className={`text-base font-black font-mono ${
                      unit.batteryPercentage < 25 ? 'text-red-600' :
                      unit.batteryPercentage < 50 ? 'text-amber-600' : 'text-emerald-700'
                    }`}>
                      {unit.batteryPercentage}%
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {unit.batteryVoltage}V · {unit.batteryHealthSoH}% SoH
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    unit.batteryPercentage < 25 ? 'bg-red-500' :
                    unit.batteryPercentage < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${unit.batteryPercentage}%` }}
                />
              </div>

              {/* Time to Empty Projections Block */}
              <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2 text-xs">
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Projected Time-to-Empty (TTE):</span>
                  </span>
                  <span className={`font-mono font-bold ${
                    unit.timeToEmptyHours < 3 && unit.dischargeRateAmps < 0 ? 'text-red-600' : 'text-slate-900'
                  }`}>
                    {unit.dischargeRateAmps >= 0 ? (
                      <span className="text-emerald-600">Charging (Net +)</span>
                    ) : (
                      `${Math.floor(unit.timeToEmptyHours)}h ${Math.round((unit.timeToEmptyHours % 1) * 60)}m`
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Trip Travel Remaining:</span>
                  <span className="font-mono text-slate-700">{unit.remainingTravelHours} hrs</span>
                </div>

                {/* Deficit Alert Banner if battery runs out before delivery */}
                {hasDeficit && (
                  <div className="p-2 rounded-lg bg-red-100/80 border border-red-200 text-red-900 text-[11px] font-semibold flex items-start space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <span>
                      Critical Deficit: Battery depletes <strong className="font-mono text-red-700">~{unit.deficitHours} hrs</strong> prior to destination arrival!
                    </span>
                  </div>
                )}

                {/* Power draw and thermal impact info */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                  <span className="flex items-center space-x-1">
                    {getPowerSourceIcon(unit.powerSource)}
                    <span>{unit.powerSource.replace('_', ' ')}</span>
                  </span>
                  <span>
                    Draw: {unit.dischargeRateAmps > 0 ? `+${unit.dischargeRateAmps}` : unit.dischargeRateAmps} A
                  </span>
                </div>

              </div>

              {/* Action Buttons: Boost Alternator & Focus Map */}
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleBoost(unit.trackingId);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center space-x-1 ${
                    isBoosted
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>{isBoosted ? 'PTO Charging Active' : 'Boost Alternator'}</span>
                </button>

                {onLocateOnMap && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLocateOnMap(unit.trackingId);
                    }}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
                  >
                    <span>Locate Map</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
