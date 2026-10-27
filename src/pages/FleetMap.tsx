import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { RealtimeShipmentMap } from '../components/RealtimeShipmentMap.js';
import { ReeferBatteryDiagnosticPanel } from '../components/ReeferBatteryDiagnosticPanel.js';
import { calculateFleetBatteryOverview } from '../services/batteryDiagnosticService.js';
import { ShipmentItem, WarehouseItem } from '../types/index.js';
import {
  Navigation,
  Truck,
  RotateCw,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Radio,
  Layers,
  ThermometerSnowflake,
  BatteryCharging,
  BatteryWarning,
  Zap,
  MapPin,
  Clock,
  Split,
  Eye,
} from 'lucide-react';

import { FALLBACK_SHIPMENTS, FALLBACK_WAREHOUSES } from '../services/fallbackData.js';

export const FleetMap: React.FC = () => {
  const [shipments, setShipments] = useState<ShipmentItem[]>(FALLBACK_SHIPMENTS);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>(FALLBACK_WAREHOUSES);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'SPLIT' | 'MAP_ONLY' | 'DIAGNOSTIC_ONLY'>('SPLIT');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | undefined>('TRK-VAX-1008');

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [shipRes, whRes] = await Promise.all([
        api.getShipments(),
        api.getWarehouses(),
      ]);
      if (shipRes?.shipments && shipRes.shipments.length > 0) {
        setShipments(shipRes.shipments);
      }
      if (whRes?.warehouses && whRes.warehouses.length > 0) {
        setWarehouses(whRes.warehouses);
      }
      if (shipRes?.shipments && shipRes.shipments.length > 0 && !selectedShipmentId) {
        // Default select at risk or first
        const atRisk = shipRes.shipments.find((s) => s.status === 'AT_RISK') || shipRes.shipments[0];
        setSelectedShipmentId(atRisk.trackingId);
      }
    } catch (err) {
      console.warn('Notice: Fleet map data refresh deferred:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const batteryOverview = calculateFleetBatteryOverview(shipments);

  const handleLocateOnMap = (trackingId: string) => {
    setSelectedShipmentId(trackingId);
    if (viewMode === 'DIAGNOSTIC_ONLY') {
      setViewMode('SPLIT');
    }
    // Smooth scroll to map
    const mapElement = document.getElementById('fleet-map-container');
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & View Mode Switcher */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight font-sans">
                  Live Fleet & Cold-Chain Telemetry Map
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-cyan-300 uppercase tracking-widest">
                  GPS + IoT MESH
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time active cargo tracking, mobile reefer battery diagnostics, and time-to-empty projections
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Controls & Sync */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('SPLIT')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                viewMode === 'SPLIT'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
            <button
              onClick={() => setViewMode('MAP_ONLY')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                viewMode === 'MAP_ONLY'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Map Only</span>
            </button>
            <button
              onClick={() => setViewMode('DIAGNOSTIC_ONLY')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                viewMode === 'DIAGNOSTIC_ONLY'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BatteryCharging className="w-3.5 h-3.5 text-cyan-600" />
              <span>Battery Diagnostics</span>
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Sync Fleet</span>
          </button>
        </div>
      </div>

      {/* Reefer Power & Battery Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fleet Average SoC</div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-black font-mono text-slate-900">
              {batteryOverview.avgBatteryLevel}%
            </span>
            <span className="text-xs font-semibold text-emerald-600">Active Buffer</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${batteryOverview.avgBatteryLevel}%` }} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Critical Battery Deficit</div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className={`text-2xl font-black font-mono ${batteryOverview.criticalCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {batteryOverview.criticalCount}
            </span>
            <span className="text-xs font-medium text-slate-500">units &lt; 25% or runout</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 font-mono">
            {batteryOverview.criticalCount > 0 ? '⚠️ Intervention required' : '✓ No route runouts projected'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Auxiliary Draw Status</div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-black font-mono text-slate-900">
              {batteryOverview.elevatedCount + batteryOverview.criticalCount}
            </span>
            <span className="text-xs font-medium text-amber-600">on battery loop</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 font-mono">
            Normal: Alternator PTO / Hybrid
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monitored Reefer Units</div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-black font-mono text-blue-600">
              {shipments.length}
            </span>
            <span className="text-xs font-medium text-slate-500">mobile compressors</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 font-mono">
            100% telemetry telemetry ping
          </div>
        </div>

      </div>

      {/* Main Map Component (Rendered when in SPLIT or MAP_ONLY) */}
      {(viewMode === 'SPLIT' || viewMode === 'MAP_ONLY') && (
        <div id="fleet-map-container" className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1.5">
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              <span>Real-Time Vehicle Route Telemetry</span>
            </span>
            {selectedShipmentId && (
              <span className="text-[11px] font-mono text-slate-500">
                Focus: <strong className="text-blue-700">{selectedShipmentId}</strong>
              </span>
            )}
          </div>
          <RealtimeShipmentMap
            shipments={shipments}
            warehouses={warehouses}
            selectedShipmentId={selectedShipmentId}
            onSelectShipment={(s) => setSelectedShipmentId(s.trackingId)}
            height={viewMode === 'MAP_ONLY' ? '760px' : '560px'}
            showControls={true}
          />
        </div>
      )}

      {/* Dedicated Battery & Power Diagnostics View (Rendered when in SPLIT or DIAGNOSTIC_ONLY) */}
      {(viewMode === 'SPLIT' || viewMode === 'DIAGNOSTIC_ONLY') && (
        <ReeferBatteryDiagnosticPanel
          shipments={shipments}
          selectedShipmentId={selectedShipmentId}
          onSelectShipment={(id) => setSelectedShipmentId(id)}
          onLocateOnMap={handleLocateOnMap}
        />
      )}

    </div>
  );
};
