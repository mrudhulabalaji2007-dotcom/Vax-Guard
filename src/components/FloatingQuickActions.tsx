import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { ShipmentItem, WarehouseItem, AlertItem } from '../types/index.js';
import {
  Plus,
  X,
  Truck,
  Wrench,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
  Send,
  Building2,
  Radio,
  FileSpreadsheet,
  ThermometerSnowflake,
  BatteryCharging,
  Zap,
  ChevronRight,
  RefreshCw,
  Info,
} from 'lucide-react';

interface FloatingQuickActionsProps {
  shipments: ShipmentItem[];
  warehouses: WarehouseItem[];
  onActionComplete: () => Promise<void> | void;
}

type ModalType = 'NONE' | 'ADD_SHIPMENT' | 'LOG_MAINTENANCE' | 'EMERGENCY_ALERT';

export const FloatingQuickActions: React.FC<FloatingQuickActionsProps> = ({
  shipments,
  warehouses,
  onActionComplete,
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>('NONE');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'alert' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close floating menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard shortcut listener (Shift + Q or Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeModal !== 'NONE') {
          setActiveModal('NONE');
        } else if (isOpen) {
          setIsOpen(false);
        }
      } else if ((e.key === 'q' || e.key === 'Q') && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeModal]);

  const showNotification = (message: string, type: 'success' | 'alert' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // ================= STATE FOR MODAL 1: ADD SHIPMENT =================
  const [newShipment, setNewShipment] = useState({
    trackingId: `TRK-VAX-${Math.floor(1020 + Math.random() * 8900)}`,
    vaccineName: 'Covishield (ChAdOx1-S)',
    batchNumber: `BATCH-2026-${Math.floor(100 + Math.random() * 900)}`,
    quantity: 1500,
    origin: 'Chennai Central Hub',
    destination: 'Madurai Southern Hub',
    currentTemperature: 4.8,
    safeMinTemperature: 2.0,
    safeMaxTemperature: 8.0,
    expectedTravelTime: 6.0,
    remainingTravelTime: 6.0,
    driverName: 'S. Ramanathan',
    driverPhone: '+91 94441 55221',
    vehicleReg: 'TN-09-BK-5520',
    storageUnit: 'Active Carrier TC-500 #7',
    currentRoute: 'Route B - Green Cold Corridor (NH-38)',
  });

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createShipment({
        ...newShipment,
        status: 'IN_TRANSIT',
        riskLevel: 'LOW',
        riskScore: 18,
        predictedExcursionMinutes: 0,
        recommendedAction: 'Consignment initiated in optimal thermal state (2.0°C - 8.0°C).',
        departureTime: new Date().toISOString(),
        eta: new Date(Date.now() + newShipment.expectedTravelTime * 3600000).toISOString(),
        receivedStatus: 'PENDING',
      });

      showNotification(`Shipment ${newShipment.trackingId} created and dispatched successfully!`, 'success');
      setActiveModal('NONE');
      setIsOpen(false);
      // Reset form with new tracking ID
      setNewShipment((prev) => ({
        ...prev,
        trackingId: `TRK-VAX-${Math.floor(1020 + Math.random() * 8900)}`,
        batchNumber: `BATCH-2026-${Math.floor(100 + Math.random() * 900)}`,
      }));
      await onActionComplete();
    } catch (err: any) {
      showNotification(err.message || 'Error creating shipment.', 'alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ================= STATE FOR MODAL 2: LOG MAINTENANCE =================
  const [maintenanceForm, setMaintenanceForm] = useState({
    targetType: 'REEFER' as 'REEFER' | 'WAREHOUSE',
    targetId: shipments[0]?.trackingId || 'TN-01-CV-9821',
    maintenanceType: 'Compressor Calibration & Coil De-icing',
    technicianName: user?.name || 'K. Balakrishnan (Senior Cold-Chain Tech)',
    postServiceTemp: 4.0,
    batteryHealthPercent: 96,
    refrigerantPressurePsi: 68,
    operationalStatus: 'NORMAL' as 'NORMAL' | 'MONITORING' | 'OVERHAULED',
    serviceNotes: 'Routine preventative service and NIST-traceable digital probe recalibration completed.',
    resolveExistingAlerts: true,
  });

  const handleLogMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // 1. If warehouse maintenance, update warehouse condition
      if (maintenanceForm.targetType === 'WAREHOUSE') {
        const wh = warehouses.find((w) => w._id === maintenanceForm.targetId || w.code === maintenanceForm.targetId);
        if (wh) {
          await api.restorePower(wh._id).catch(() => null);
        }
      }

      // 2. Broadcast resolution alert / audit entry
      await api.createAlert({
        type: 'Refrigeration Failure',
        severity: 'LOW',
        message: `Maintenance logged on ${maintenanceForm.targetId}: ${maintenanceForm.maintenanceType}`,
        details: `Technician: ${maintenanceForm.technicianName}. Notes: ${maintenanceForm.serviceNotes}. Verified Temp: ${maintenanceForm.postServiceTemp}°C. Battery: ${maintenanceForm.batteryHealthPercent}%.`,
        recommendedAction: 'Equipment cleared for continuous cold-chain duty. Next audit scheduled in 30 days.',
        relatedShipmentId: maintenanceForm.targetType === 'REEFER' ? maintenanceForm.targetId : undefined,
        relatedWarehouseId: maintenanceForm.targetType === 'WAREHOUSE' ? maintenanceForm.targetId : undefined,
      });

      showNotification(`Maintenance record logged for ${maintenanceForm.targetId}. Calibration verified.`, 'success');
      setActiveModal('NONE');
      setIsOpen(false);
      await onActionComplete();
    } catch (err: any) {
      showNotification(err.message || 'Error logging maintenance.', 'alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ================= STATE FOR MODAL 3: EMERGENCY ALERT =================
  const [emergencyForm, setEmergencyForm] = useState({
    emergencyCategory: 'Temperature Excursion' as
      | 'Temperature Excursion'
      | 'Predictive High Risk'
      | 'Refrigeration Failure'
      | 'Route Risk',
    severity: 'CRITICAL' as 'CRITICAL' | 'HIGH' | 'WARNING',
    affectedTarget: shipments.find((s) => s.status === 'AT_RISK')?.trackingId || shipments[0]?.trackingId || 'TRK-VAX-1008',
    observedTemp: 8.9,
    description: 'Compressor auxiliary cooling failed during transit. Internal chamber rising at +1.4°C/hr.',
    contingencyProtocol: 'Rendezvous at Madurai Bypass Cold Link for dry-ice thermal replenishment.',
    dispatchSms: true,
    notifyDirectorate: true,
  });

  const handleBroadcastEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createAlert({
        type: emergencyForm.emergencyCategory,
        severity: emergencyForm.severity,
        message: `EMERGENCY BROADCAST [${emergencyForm.affectedTarget}]: ${emergencyForm.description}`,
        details: `Reported by: ${user?.name || 'Cold Chain Officer'}. Observed Temp: ${emergencyForm.observedTemp}°C. Contingency Action: ${emergencyForm.contingencyProtocol}`,
        recommendedAction: emergencyForm.contingencyProtocol,
        relatedShipmentId: emergencyForm.affectedTarget,
      });

      showNotification(`EMERGENCY BROADCAST DISPATCHED: Alert active for ${emergencyForm.affectedTarget}`, 'alert');
      setActiveModal('NONE');
      setIsOpen(false);
      await onActionComplete();
    } catch (err: any) {
      showNotification(err.message || 'Failed to broadcast emergency alert.', 'alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick action options in the flyout menu
  const quickActionItems = [
    {
      id: 'ADD_SHIPMENT' as ModalType,
      title: 'Add New Shipment',
      subtitle: 'Dispatch vaccine consignment with live IoT telemetry',
      icon: Truck,
      color: 'bg-blue-600 text-white hover:bg-blue-700',
      tagColor: 'text-blue-700 bg-blue-50 border-blue-200',
      tagText: 'Dispatch Fleet',
    },
    {
      id: 'LOG_MAINTENANCE' as ModalType,
      title: 'Log Maintenance',
      subtitle: 'Record reefer compressor service, battery, or NIST probe check',
      icon: Wrench,
      color: 'bg-amber-600 text-white hover:bg-amber-700',
      tagColor: 'text-amber-700 bg-amber-50 border-amber-200',
      tagText: 'Asset Audit',
    },
    {
      id: 'EMERGENCY_ALERT' as ModalType,
      title: 'Emergency Alerts',
      subtitle: 'Broadcast critical thermal excursion or grid failover alert',
      icon: Flame,
      color: 'bg-red-600 text-white hover:bg-red-700',
      tagColor: 'text-red-700 bg-red-50 border-red-200',
      tagText: 'Immediate Action',
    },
  ];

  return (
    <>
      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed top-6 right-6 z-60 max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 ${
              notification.type === 'alert'
                ? 'bg-red-950 text-red-50 border-red-800'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {notification.type === 'alert' ? (
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="text-sm font-medium leading-relaxed">{notification.message}</div>
          </div>
        </div>
      )}

      {/* Floating Speed-Dial Button & Flyout Container */}
      <div ref={menuRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        
        {/* Expanded Speed-Dial Card */}
        {isOpen && (
          <div className="mb-3 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl p-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-6 duration-200 text-slate-800">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Quick Actions Menu
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Press [Q] or [Esc]
              </span>
            </div>

            {/* Actions List */}
            <div className="space-y-2">
              {quickActionItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveModal(item.id);
                      setIsOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80 transition-all flex items-start gap-3.5 group cursor-pointer"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105 ${item.color}`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {item.title}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${item.tagColor}`}>
                          {item.tagText}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">
                        {item.subtitle}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 shrink-0 self-center transition-transform group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>

            {/* Quick Audit / Simulation Footer Strip */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                Active Fleet: {shipments.length} | Depots: {warehouses.length}
              </span>
              <button
                onClick={async () => {
                  await onActionComplete();
                  showNotification('Synchronized latest cold-chain telemetry data.', 'success');
                  setIsOpen(false);
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Sync Telemetry
              </button>
            </div>
          </div>
        )}

        {/* The Primary Floating Trigger Button */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Toggle Quick Actions Menu"
          className={`h-13 px-5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center gap-3 border font-semibold text-sm cursor-pointer select-none focus:outline-none focus:ring-4 focus:ring-blue-500/30 ${
            isOpen
              ? 'bg-slate-900 text-white border-slate-700 hover:bg-slate-800'
              : 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white border-blue-500/50 hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0'
          }`}
        >
          {/* Animated Icon: rotates 45 deg or swaps */}
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-300 ${
              isOpen ? 'rotate-45 bg-slate-800 text-red-400' : 'bg-white/20 text-white'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </div>

          <span className="tracking-tight font-medium">Quick Actions</span>

          <span className="hidden sm:inline-block text-[11px] font-mono font-normal opacity-70 bg-black/20 px-1.5 py-0.5 rounded">
            [Q]
          </span>
        </button>
      </div>

      {/* ================= MODAL 1: ADD NEW SHIPMENT ================= */}
      {activeModal === 'ADD_SHIPMENT' && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add New Cold-Chain Shipment</h3>
                  <p className="text-xs text-slate-400">Dispatch vaccine batch with real-time temperature tracking</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal('NONE')}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateShipment} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tracking ID (Auto-Generated)</label>
                  <input
                    type="text"
                    required
                    value={newShipment.trackingId}
                    onChange={(e) => setNewShipment({ ...newShipment, trackingId: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vaccine Formulation</label>
                  <select
                    value={newShipment.vaccineName}
                    onChange={(e) => {
                      const v = e.target.value;
                      let min = 2.0;
                      let max = 8.0;
                      if (v.includes('Polio') || v.includes('bOPV')) {
                        min = -20.0;
                        max = 8.0;
                      }
                      setNewShipment({ ...newShipment, vaccineName: v, safeMinTemperature: min, safeMaxTemperature: max });
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Covishield (ChAdOx1-S)">Covishield (ChAdOx1-S) [2°C – 8°C]</option>
                    <option value="Rotavirus Vaccine (Live Attenuated)">Rotavirus Vaccine (Live Attenuated) [2°C – 8°C]</option>
                    <option value="bOPV (Bivalent Oral Polio Vaccine)">bOPV (Bivalent Oral Polio) [-20°C – 8°C]</option>
                    <option value="Pentavalent Vaccine (DTP-HepB-Hib)">Pentavalent Vaccine [2°C – 8°C]</option>
                    <option value="Measles-Rubella (MR) Vaccine">Measles-Rubella (MR) [2°C – 8°C]</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Number</label>
                  <input
                    type="text"
                    required
                    value={newShipment.batchNumber}
                    onChange={(e) => setNewShipment({ ...newShipment, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dose Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newShipment.quantity}
                    onChange={(e) => setNewShipment({ ...newShipment, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Origin Facility</label>
                  <select
                    value={newShipment.origin}
                    onChange={(e) => setNewShipment({ ...newShipment, origin: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Chennai Central Hub">Chennai Central Hub (Guindy)</option>
                    <option value="Coimbatore Regional Vaccine Depot">Coimbatore Regional Depot</option>
                    <option value="Madurai Southern Cold Hub">Madurai Southern Cold Hub</option>
                    <option value="Salem Regional Vaccine Depot">Salem Regional Depot</option>
                    <option value="Tiruchirappalli Central Link Storage">Trichy Link Storage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Facility</label>
                  <select
                    value={newShipment.destination}
                    onChange={(e) => setNewShipment({ ...newShipment, destination: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Nagercoil District Hospital">Nagercoil District Hospital</option>
                    <option value="Madurai Southern Hub">Madurai Southern Hub</option>
                    <option value="Salem District Depot">Salem District Depot</option>
                    <option value="Tiruchirappalli Distribution Point">Tiruchirappalli Point</option>
                    <option value="Coimbatore Depot">Coimbatore Depot</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Reefer Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newShipment.currentTemperature}
                    onChange={(e) => setNewShipment({ ...newShipment, currentTemperature: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Vehicle Reefer</label>
                  <input
                    type="text"
                    required
                    value={newShipment.vehicleReg}
                    onChange={(e) => setNewShipment({ ...newShipment, vehicleReg: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Driver Name & Contact</label>
                  <input
                    type="text"
                    required
                    value={newShipment.driverName}
                    onChange={(e) => setNewShipment({ ...newShipment, driverName: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Transit Time (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={newShipment.expectedTravelTime}
                    onChange={(e) => setNewShipment({ ...newShipment, expectedTravelTime: parseFloat(e.target.value) || 1, remainingTravelTime: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal('NONE')}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Dispatch Shipment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: LOG MAINTENANCE ================= */}
      {activeModal === 'LOG_MAINTENANCE' && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            
            {/* Header */}
            <div className="bg-amber-950 text-white p-5 flex items-center justify-between border-b border-amber-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Log Cold-Chain Equipment Maintenance</h3>
                  <p className="text-xs text-amber-200/80">Record calibration, refrigerant top-up, or battery pack replacement</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal('NONE')}
                className="text-amber-300 hover:text-white p-1 rounded-lg hover:bg-amber-900/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLogMaintenance} className="p-6 space-y-4">
              
              {/* Asset Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Asset Category</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMaintenanceForm({ ...maintenanceForm, targetType: 'REEFER' })}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      maintenanceForm.targetType === 'REEFER'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Truck className="w-4 h-4 text-amber-600" />
                    Mobile Reefer Unit (Fleet)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaintenanceForm({ ...maintenanceForm, targetType: 'WAREHOUSE' })}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      maintenanceForm.targetType === 'WAREHOUSE'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-amber-600" />
                    Cold Storage Warehouse
                  </button>
                </div>
              </div>

              {/* Target Equipment Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target {maintenanceForm.targetType === 'REEFER' ? 'Shipment / Reefer' : 'Storage Depot'}
                </label>
                <select
                  value={maintenanceForm.targetId}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, targetId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {maintenanceForm.targetType === 'REEFER' ? (
                    shipments.map((s) => (
                      <option key={s._id} value={s.trackingId}>
                        {s.trackingId} - {s.vaccineName} ({s.vehicleReg})
                      </option>
                    ))
                  ) : (
                    warehouses.map((w) => (
                      <option key={w._id} value={w.code}>
                        {w.code} - {w.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Maintenance Procedure */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Maintenance Procedure</label>
                <select
                  value={maintenanceForm.maintenanceType}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, maintenanceType: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Compressor Calibration & Coil De-icing">Compressor Calibration & Coil De-icing</option>
                  <option value="Refrigerant R404A Leak Test & Top-Up">Refrigerant R404A Leak Test & Top-Up</option>
                  <option value="Auxiliary Lithium Battery Pack Replacement">Auxiliary Lithium Battery Pack Replacement</option>
                  <option value="Thermal Door Gasket & Insulation Seal Audit">Thermal Door Gasket & Insulation Seal Audit</option>
                  <option value="NIST-Traceable Multi-Point Sensor Verification">NIST-Traceable Multi-Point Sensor Verification</option>
                  <option value="Standby Diesel Generator Load Bank Test">Standby Diesel Generator Load Bank Test</option>
                </select>
              </div>

              {/* Inspector Name & Post-Service Readings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Technician / Lead Inspector</label>
                  <input
                    type="text"
                    required
                    value={maintenanceForm.technicianName}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, technicianName: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Verified Core Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={maintenanceForm.postServiceTemp}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, postServiceTemp: parseFloat(e.target.value) || 4.0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Battery Health (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={maintenanceForm.batteryHealthPercent}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, batteryHealthPercent: parseInt(e.target.value) || 100 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Resulting Operational State</label>
                  <select
                    value={maintenanceForm.operationalStatus}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, operationalStatus: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="NORMAL">NORMAL - Cleared for Active Transit</option>
                    <option value="MONITORING">MONITORING - Keep on Watchlist</option>
                    <option value="OVERHAULED">OVERHAULED - Complete Overhaul Logged</option>
                  </select>
                </div>
              </div>

              {/* Maintenance Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Maintenance Findings & Work Done</label>
                <textarea
                  rows={2}
                  required
                  value={maintenanceForm.serviceNotes}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, serviceNotes: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal('NONE')}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Logging Record...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Save Maintenance Record
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: EMERGENCY ALERT ================= */}
      {activeModal === 'EMERGENCY_ALERT' && (
        <div className="fixed inset-0 z-60 bg-red-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            
            {/* Header */}
            <div className="bg-red-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Broadcast Cold-Chain Emergency Alert</h3>
                  <p className="text-xs text-red-100">Instantly flag thermal breaches and dispatch emergency contingency protocols</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal('NONE')}
                className="text-red-200 hover:text-white p-1 rounded-lg hover:bg-red-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleBroadcastEmergency} className="p-6 space-y-4">
              
              {/* Emergency Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Incident Type</label>
                <select
                  value={emergencyForm.emergencyCategory}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, emergencyCategory: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                >
                  <option value="Temperature Excursion">Critical Thermal Excursion (&gt; 8.0°C Breach)</option>
                  <option value="Refrigeration Failure">Refrigeration Failure &amp; Auxiliary Battery Depleted (&lt; 15%)</option>
                  <option value="Route Risk">Route Risk / Severe Transit Corridor Roadblock</option>
                  <option value="Predictive High Risk">Predictive Machine Learning Breach Forecast</option>
                </select>
              </div>

              {/* Severity & Affected Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alert Severity</label>
                  <select
                    value={emergencyForm.severity}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, severity: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-red-300 bg-red-50/50 text-red-900 font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="CRITICAL">🔴 CRITICAL - Immediate Intervention</option>
                    <option value="HIGH">🟠 HIGH - Intercept Required</option>
                    <option value="WARNING">🟡 WARNING - Active Thermal Watch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Affected Asset</label>
                  <select
                    value={emergencyForm.affectedTarget}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, affectedTarget: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <optgroup label="Active Shipments">
                      {shipments.map((s) => (
                        <option key={s._id} value={s.trackingId}>
                          {s.trackingId} ({s.vaccineName} - {s.currentTemperature}°C)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Cold Warehouses">
                      {warehouses.map((w) => (
                        <option key={w._id} value={w.code}>
                          {w.code} ({w.name})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Observed Temperature */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Excursion Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={emergencyForm.observedTemp}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, observedTemp: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono font-bold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Description / Observations</label>
                <textarea
                  rows={2}
                  required
                  value={emergencyForm.description}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Contingency Protocol */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contingency Action</label>
                <input
                  type="text"
                  required
                  value={emergencyForm.contingencyProtocol}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, contingencyProtocol: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900"
                />
              </div>

              {/* Broadcast Options Checkboxes */}
              <div className="bg-red-50 border border-red-200/80 rounded-xl p-3.5 space-y-2">
                <span className="text-xs font-bold text-red-900 block mb-1">Dispatch Channels</span>
                <label className="flex items-center gap-2.5 text-xs text-red-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emergencyForm.dispatchSms}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, dispatchSms: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Dispatch SMS alert to Assigned Driver & Escort Team (+91 94432 10987)</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-red-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emergencyForm.notifyDirectorate}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, notifyDirectorate: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Notify State Directorate Cold-Chain Crisis Management Unit</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal('NONE')}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Broadcasting...
                    </>
                  ) : (
                    <>
                      <Flame className="w-4 h-4" />
                      Broadcast Emergency Alert
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
