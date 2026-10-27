import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { WarehouseItem, AlertItem } from '../types/index.js';
import { WarehouseMaintenanceTab } from '../components/WarehouseMaintenanceTab.js';
import {
  Building2,
  Zap,
  ZapOff,
  AlertTriangle,
  Plus,
  ShieldCheck,
  Thermometer,
  Clock,
  CheckCircle2,
  RefreshCw,
  Power,
  RotateCcw,
  Sparkles,
  X,
  FileWarning,
  Wrench,
  Calendar,
  ArrowLeft,
  MapPin,
  User,
  Phone,
  Layers,
  Activity,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export const Warehouses: React.FC = () => {
  const navigate = useNavigate();
  const { id: urlParamId } = useParams<{ id?: string }>();

  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSimulationId, setActiveSimulationId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Active Tab in Warehouse Details Mode
  const [detailsTab, setDetailsTab] = useState<'MAINTENANCE' | 'OVERVIEW' | 'SIMULATION'>('MAINTENANCE');

  // Critical Incident Popup Modal State
  const [criticalModalOpen, setCriticalModalOpen] = useState(false);
  const [criticalIncidentData, setCriticalIncidentData] = useState<{
    warehouse: WarehouseItem;
    recommendedActions: string[];
    incident?: any;
    alert?: AlertItem;
  } | null>(null);

  // Add Warehouse Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Madurai Cold-Chain State Depot',
    code: 'WH-MDU-08',
    location: 'Anna Nagar Industrial Zone, Madurai',
    storageCapacity: 160000,
    currentOccupancy: 85000,
    safeMinTemperature: 2.0,
    safeMaxTemperature: 8.0,
    currentTemperature: 4.6,
    managerName: 'M. Senthilkumar',
    managerContact: '+91 94431 55667',
  });
  const [savingWarehouse, setSavingWarehouse] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await api.getWarehouses();
      setWarehouses(res.warehouses);
    } catch (err) {
      console.warn('Notice: Warehouse data sync deferred:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  // Determine if viewing a single warehouse detail
  const selectedWarehouse = urlParamId
    ? warehouses.find((w) => w._id === urlParamId || w.code === urlParamId.toUpperCase()) ||
      (warehouses.length > 0 && urlParamId.toLowerCase() === 'details' ? warehouses[0] : null)
    : null;

  // SIMULATE POWER OUTAGE ACTION
  const handleSimulateOutage = async (wh: WarehouseItem) => {
    try {
      setActiveSimulationId(wh._id);
      setSimulating(true);

      const res = await api.simulatePowerOutage(wh._id);
      await fetchWarehouses();

      if (res.isCriticalBreach) {
        setCriticalIncidentData({
          warehouse: res.warehouse,
          recommendedActions: res.recommendedActions,
          incident: res.criticalIncident,
          alert: res.alert,
        });
        setCriticalModalOpen(true);
      } else {
        showNotification(`Power outage simulated for ${wh.name}. Running on battery buffer.`);
      }
    } catch (err: any) {
      showNotification(err.message || 'Simulation error');
    } finally {
      setSimulating(false);
    }
  };

  // RESTORE POWER ACTION
  const handleRestorePower = async (whId: string) => {
    try {
      setSimulating(true);
      await api.restorePower(whId);
      await fetchWarehouses();
      setCriticalModalOpen(false);
      showNotification('Grid power restored. Cooling systems operating normally.');
    } catch (err: any) {
      showNotification(err.message || 'Error restoring power');
    } finally {
      setSimulating(false);
    }
  };

  // ADD WAREHOUSE SUBMISSION
  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWarehouse(true);
    try {
      const res = await api.createWarehouse(formData);
      setSuccessMsg(res.message);
      await fetchWarehouses();
      setTimeout(() => {
        setAddModalOpen(false);
        setSuccessMsg('');
      }, 1200);
    } catch (err: any) {
      showNotification(err.message || 'Error creating warehouse');
    } finally {
      setSavingWarehouse(false);
    }
  };

  // ================= VIEW A: WAREHOUSE DETAILS PAGE (WITH MAINTENANCE HISTORY TAB) =================
  if (selectedWarehouse) {
    const isPowerOff = selectedWarehouse.powerStatus === 'OFF';
    const isCritical =
      selectedWarehouse.currentTemperature > selectedWarehouse.safeMaxTemperature ||
      selectedWarehouse.refrigerationStatus === 'FAILURE';

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        
        {/* Toast */}
        {notification && (
          <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-medium">{notification}</span>
          </div>
        )}

        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/warehouses')}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Regional Warehouses Directory</span>
          </button>

          <button
            onClick={fetchWarehouses}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Warehouse Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>

        {/* Warehouse Hero Banner */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {selectedWarehouse.code}
                </span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                  isPowerOff ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  Power: {selectedWarehouse.powerStatus}
                </span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                  selectedWarehouse.refrigerationStatus === 'NORMAL' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                }`}>
                  Cooling: {selectedWarehouse.refrigerationStatus}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {selectedWarehouse.location}
                </span>
              </div>

              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                <span>{selectedWarehouse.name}</span>
              </h1>
            </div>

            {/* Core Live Readings */}
            <div className="flex items-center gap-4 shrink-0 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Core Chamber Temp</span>
                <span className={`text-2xl font-black font-mono ${isCritical ? 'text-red-600' : 'text-slate-900'}`}>
                  {selectedWarehouse.currentTemperature.toFixed(1)}°C
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Safe: {selectedWarehouse.safeMinTemperature}°C – {selectedWarehouse.safeMaxTemperature}°C
                </span>
              </div>

              <div className="h-8 w-px bg-slate-200" />

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Storage Stock</span>
                <span className="text-xl font-black font-mono text-blue-700">
                  {Number(selectedWarehouse.currentOccupancy).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  of {Number(selectedWarehouse.storageCapacity).toLocaleString()} doses
                </span>
              </div>
            </div>

          </div>

          {/* Quick Facility Contact Strip */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Manager: <strong className="text-slate-800">{selectedWarehouse.managerName}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {selectedWarehouse.managerContact}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">DG Generator ATS:</span>
              <span className="font-semibold text-slate-800">
                {selectedWarehouse.backupPowerAvailable ? '✓ Cummins 125 kVA (Standby Ready)' : '✗ Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
          
          {/* TAB 1: MAINTENANCE HISTORY (User explicit request) */}
          <button
            onClick={() => setDetailsTab('MAINTENANCE')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              detailsTab === 'MAINTENANCE'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-xl'
            }`}
          >
            <Wrench className="w-4 h-4 text-blue-600" />
            <span>Maintenance History &amp; Proactive Care</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Active Tab
            </span>
          </button>

          {/* TAB 2: OVERVIEW & ROOMS */}
          <button
            onClick={() => setDetailsTab('OVERVIEW')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              detailsTab === 'OVERVIEW'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-xl'
            }`}
          >
            <Building2 className="w-4 h-4 text-slate-600" />
            <span>Overview &amp; Cold Storage Rooms</span>
          </button>

          {/* TAB 3: POWER OUTAGE SIMULATOR */}
          <button
            onClick={() => setDetailsTab('SIMULATION')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              detailsTab === 'SIMULATION'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-xl'
            }`}
          >
            <ZapOff className="w-4 h-4 text-amber-600" />
            <span>Refrigeration &amp; Outage Engine</span>
          </button>

        </div>

        {/* TAB CONTENT 1: MAINTENANCE HISTORY */}
        {detailsTab === 'MAINTENANCE' && (
          <WarehouseMaintenanceTab
            warehouse={selectedWarehouse}
            onRefresh={fetchWarehouses}
          />
        )}

        {/* TAB CONTENT 2: COLD ROOM OVERVIEW */}
        {detailsTab === 'OVERVIEW' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <span>Cold-Chain Storage Rooms &amp; Thermal Telemetry</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Individual room environments monitored by multi-point NIST PT100 RTD sensor probes
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Room 1 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Cold Room 1 (Main Hub)</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">NORMAL</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-900">4.2°C</div>
                  <div className="text-[11px] text-slate-500">Target: 4.0°C | Capacity: 80,000 vials</div>
                  <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-100">
                    Dual Bitzer Compressor A (Active)
                  </div>
                </div>

                {/* Room 2 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Cold Room 2 (Buffer)</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">NORMAL</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-900">4.6°C</div>
                  <div className="text-[11px] text-slate-500">Target: 4.0°C | Capacity: 65,000 vials</div>
                  <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-100">
                    Carrier Transicold Loop (Active)
                  </div>
                </div>

                {/* Room 3 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Deep Freeze (-20°C bOPV)</span>
                    <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">SUB-ZERO</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-cyan-800">-19.4°C</div>
                  <div className="text-[11px] text-slate-500">Safe: -25°C to -15°C | Polio stocks</div>
                  <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-100">
                    Cryo-Chiller Unit #1 (Active)
                  </div>
                </div>

                {/* Room 4 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Room 4 (Quarantine / QA)</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">NORMAL</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-900">4.4°C</div>
                  <div className="text-[11px] text-slate-500">Target: 4.0°C | Pre-dispatch staging</div>
                  <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-100">
                    ILR Backup Cooling Loop
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT 3: OUTAGE & FAILURE SIMULATION */}
        {detailsTab === 'SIMULATION' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ZapOff className="w-5 h-5 text-red-600" />
                <span>Refrigeration &amp; Power Grid Failure Engine</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Stress-test cold storage resilience during simulated grid collapse, verify DG automatic transfer switch (ATS), and check safe holding buffer.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-amber-900 block">Simulate Utility Power Collapse</span>
                <span className="text-xs text-amber-800/80">
                  Cut grid AC feed to verify holding buffer decay ({selectedWarehouse.estimatedSafeHoldingTime} minutes safe limit)
                </span>
              </div>

              {isPowerOff ? (
                <button
                  onClick={() => handleRestorePower(selectedWarehouse._id)}
                  disabled={simulating}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0"
                >
                  Restore Power to Normal
                </button>
              ) : (
                <button
                  onClick={() => handleSimulateOutage(selectedWarehouse)}
                  disabled={simulating}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0"
                >
                  Trigger Grid Outage Simulation
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    );
  }

  // ================= VIEW B: WAREHOUSES DIRECTORY GRID =================
  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{notification}</span>
        </div>
      )}

      {/* Header & Add Warehouse Button */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            <span>Regional Cold-Storage Warehouses</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time power monitoring, proactive refrigeration repairs, and preventive service schedules
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ADD WAREHOUSE</span>
          </button>
          
          <button
            onClick={fetchWarehouses}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* PROACTIVE CARE & FAILOVER BANNER */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950">
              Proactive Equipment Care
            </span>
            <span className="text-xs font-bold text-slate-300">NABL Calibration &amp; Preventative Maintenance</span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Click into any regional depot below to review verified compressor overhauls, refrigerant pressure logs, and scheduled preventive maintenance milestones.
          </p>
        </div>

        <div className="text-xs font-mono text-cyan-300 bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 shrink-0">
          WHO PQS Range: 2.0°C – 8.0°C
        </div>
      </div>

      {/* WAREHOUSE CARDS GRID */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <span>Loading warehouses from MongoDB...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((wh) => {
            const isPowerOff = wh.powerStatus === 'OFF';
            const isCritical = wh.currentTemperature > wh.safeMaxTemperature || wh.refrigerationStatus === 'FAILURE';
            
            return (
              <div
                key={wh._id}
                className={`bg-white rounded-2xl border transition-all p-5 shadow-xs flex flex-col justify-between space-y-4 ${
                  isCritical
                    ? 'border-red-400 ring-2 ring-red-400/20 bg-red-50/10'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div>
                  
                  {/* Warehouse Title & Status Pills */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">{wh.code}</div>
                      <h3 className="font-bold text-base text-slate-900 mt-0.5">{wh.name}</h3>
                      <p className="text-xs text-slate-500">{wh.location}</p>
                    </div>

                    <div className="flex flex-col items-end space-y-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        wh.powerStatus === 'ON' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800 animate-pulse'
                      }`}>
                        Power: {wh.powerStatus}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        wh.refrigerationStatus === 'NORMAL' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800 font-bold'
                      }`}>
                        Cooling: {wh.refrigerationStatus}
                      </span>
                    </div>
                  </div>

                  {/* Temperature & Capacity Metrics */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    
                    <div className={`p-3 rounded-xl border ${isCritical ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Current Temp</div>
                      <div className={`text-2xl font-black font-mono mt-0.5 ${isCritical ? 'text-red-600' : 'text-slate-900'}`}>
                        {wh.currentTemperature.toFixed(1)}°C
                      </div>
                      <div className="text-[10px] text-slate-400">Safe: {wh.safeMinTemperature}–{wh.safeMaxTemperature}°C</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Storage Occupancy</div>
                      <div className="text-lg font-black font-mono text-blue-700 mt-1">
                        {Number(wh.currentOccupancy).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">of {Number(wh.storageCapacity).toLocaleString()} doses</div>
                    </div>

                  </div>

                  {/* Live Status Indicators */}
                  <div className="space-y-2 mt-4 text-xs text-slate-600">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400">Backup Generator:</span>
                      <span className="font-semibold text-slate-800">
                        {wh.backupPowerAvailable ? '✓ Available (Cummins Standby)' : '✗ Not Configured'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400">Est. Safe Holding Time:</span>
                      <span className={`font-mono font-bold ${isPowerOff ? 'text-red-600 animate-pulse' : 'text-slate-800'}`}>
                        {wh.estimatedSafeHoldingTime} minutes
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Manager:</span>
                      <span className="font-semibold text-slate-800">{wh.managerName}</span>
                    </div>
                  </div>

                </div>

                {/* Card Actions: View Details & Maintenance History + Simulation */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <button
                    onClick={() => navigate(`/warehouses/${wh.code}`)}
                    className="w-full flex items-center justify-between py-2.5 px-3.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-bold transition cursor-pointer border border-blue-200/80 group"
                  >
                    <span className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-blue-600" />
                      <span>View Details &amp; Maintenance History</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <div className="flex items-center justify-between gap-2">
                    {isPowerOff ? (
                      <button
                        onClick={() => handleRestorePower(wh._id)}
                        disabled={simulating}
                        className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>RESTORE POWER</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSimulateOutage(wh)}
                        disabled={simulating}
                        className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition"
                      >
                        <ZapOff className="w-3.5 h-3.5 text-red-600" />
                        <span>SIMULATE POWER OUTAGE</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CRITICAL REFRIGERATION FAILURE ALERT MODAL */}
      {criticalModalOpen && criticalIncidentData && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-red-300 animate-in zoom-in-95 space-y-4">
            
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-red-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-black font-mono text-red-600 uppercase tracking-wider">
                    EMERGENCY COLD-CHAIN INCIDENT
                  </span>
                  <h2 className="text-xl font-black text-slate-900">
                    CRITICAL REFRIGERATION FAILURE
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setCriticalModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warehouse Telemetry Spec Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-red-50/60 rounded-xl border border-red-200 text-center">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Temperature</div>
                <div className="text-xl font-black font-mono text-red-600">
                  {criticalIncidentData.warehouse.currentTemperature.toFixed(1)}°C
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Safe Limit</div>
                <div className="text-xl font-black font-mono text-slate-800">
                  {criticalIncidentData.warehouse.safeMaxTemperature.toFixed(1)}°C
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Power Status</div>
                <div className="text-sm font-black font-mono text-red-600 mt-1 uppercase">
                  {criticalIncidentData.warehouse.powerStatus}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Safe Holding Time</div>
                <div className="text-sm font-black font-mono text-amber-700 mt-1">
                  {criticalIncidentData.warehouse.estimatedSafeHoldingTime} min
                </div>
              </div>
            </div>

            {/* Recommended Actions List */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Recommended Emergency SOP Actions:
              </span>
              <div className="space-y-1.5 text-xs">
                {criticalIncidentData.recommendedActions.map((action, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-800 flex items-center space-x-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Incident Logged Notice */}
            <div className="p-3 rounded-xl bg-slate-100 text-[11px] text-slate-600 flex items-center justify-between font-mono">
              <span>Incident ID: {criticalIncidentData.incident?._id || 'REC-INC-2026'}</span>
              <span className="text-emerald-700 font-bold">Stored in MongoDB</span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => navigate('/alerts')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                View in Alert Center →
              </button>

              <button
                onClick={() => handleRestorePower(criticalIncidentData.warehouse._id)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                Activate Backup Generator &amp; Restore
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADD WAREHOUSE MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Cold-Storage Warehouse</h3>
              <button onClick={() => setAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {successMsg && (
              <div className="mt-3 p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl font-semibold">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleCreateWarehouse} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Warehouse Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl bg-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Warehouse Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="mt-1 w-full p-2.5 font-mono border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Storage Capacity (Doses) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.storageCapacity}
                    onChange={(e) => setFormData({ ...formData, storageCapacity: parseInt(e.target.value, 10) || 10000 })}
                    className="mt-1 w-full p-2.5 font-mono border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Location Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Manager Name
                  </label>
                  <input
                    type="text"
                    value={formData.managerName}
                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                    className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Manager Contact
                  </label>
                  <input
                    type="text"
                    value={formData.managerContact}
                    onChange={(e) => setFormData({ ...formData, managerContact: e.target.value })}
                    className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWarehouse}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {savingWarehouse ? 'Saving in MongoDB...' : 'Add Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
