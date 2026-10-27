import React, { useState } from 'react';
import { WarehouseItem, WarehouseMaintenanceRecord, UpcomingServiceSchedule } from '../types/index.js';
import { warehouseMaintenanceService } from '../services/warehouseMaintenanceService.js';
import {
  Wrench,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  ShieldCheck,
  FileCheck,
  Download,
  Search,
  Filter,
  Flame,
  Zap,
  Building2,
  SlidersHorizontal,
  ChevronRight,
  Info,
  X,
  Send,
  ThermometerSnowflake,
} from 'lucide-react';

interface WarehouseMaintenanceTabProps {
  warehouse: WarehouseItem;
  onRefresh?: () => void;
}

export const WarehouseMaintenanceTab: React.FC<WarehouseMaintenanceTabProps> = ({
  warehouse,
  onRefresh,
}) => {
  const [repairs, setRepairs] = useState<WarehouseMaintenanceRecord[]>(() =>
    warehouseMaintenanceService.getMaintenanceHistory(warehouse.code || warehouse._id)
  );
  const [upcoming, setUpcoming] = useState<UpcomingServiceSchedule[]>(() =>
    warehouseMaintenanceService.getUpcomingServices(warehouse.code || warehouse._id)
  );

  const [activeSubView, setActiveSubView] = useState<'ALL' | 'PAST_REPAIRS' | 'UPCOMING_DATES'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Modal 1: Log Past Repair State
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logForm, setLogForm] = useState({
    assetName: 'Bitzer Semi-Hermetic Compressor #2 (Room B)',
    serviceType: 'COMPRESSOR_REPAIR' as WarehouseMaintenanceRecord['serviceType'],
    serviceDate: new Date().toISOString().slice(0, 10),
    technicianName: 'K. Balakrishnan',
    technicianOrg: 'Carrier Transicold Industrial HVAC',
    costInr: 35000,
    partsReplaced: 'Discharge reed valve, POE synthetic lubricant',
    findings: 'Cleaned suction strainer, replaced reed valves, and performed helium pressure test.',
    postServiceTemp: 4.0,
    complianceCertificate: `CERT-HVAC-${warehouse.code}-${Date.now().toString().slice(-4)}`,
  });

  // Modal 2: Schedule Upcoming Service State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    assetName: 'Evaporator Defrost Heaters & Drain Lines',
    serviceTitle: 'Preventive Defrost Resistance Check & Bio-wash',
    targetDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    priority: 'MEDIUM' as UpcomingServiceSchedule['priority'],
    assignedTechnician: 'HVAC Maintenance Cell',
    scopeSummary: 'Inspect defrost element resistance and flush condensation lines with biocide.',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddRepairSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = logForm.partsReplaced
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const newRecord = warehouseMaintenanceService.addMaintenanceRecord(warehouse.code || warehouse._id, {
      warehouseId: warehouse.code,
      assetName: logForm.assetName,
      serviceType: logForm.serviceType,
      serviceDate: new Date(logForm.serviceDate).toISOString(),
      technicianName: logForm.technicianName,
      technicianOrg: logForm.technicianOrg,
      costInr: Number(logForm.costInr) || 0,
      partsReplaced: parts,
      findings: logForm.findings,
      postServiceTemp: Number(logForm.postServiceTemp) || 4.0,
      status: 'COMPLETED',
      complianceCertificate: logForm.complianceCertificate,
      nextScheduledDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    });

    setRepairs([newRecord, ...repairs]);
    setLogModalOpen(false);
    showToast(`Maintenance repair record logged for ${logForm.assetName}!`);
    onRefresh?.();
  };

  const handleScheduleServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newService = warehouseMaintenanceService.scheduleUpcomingService(warehouse.code || warehouse._id, {
      warehouseId: warehouse.code,
      assetName: scheduleForm.assetName,
      serviceTitle: scheduleForm.serviceTitle,
      targetDate: new Date(scheduleForm.targetDate).toISOString(),
      priority: scheduleForm.priority,
      assignedTechnician: scheduleForm.assignedTechnician,
      scopeSummary: scheduleForm.scopeSummary,
      status: 'SCHEDULED',
    });

    setUpcoming([newService, ...upcoming].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()));
    setScheduleModalOpen(false);
    showToast(`Upcoming proactive service scheduled for ${scheduleForm.targetDate}!`);
    onRefresh?.();
  };

  const handleExportCsv = () => {
    const headers = ['Record ID', 'Asset Name', 'Service Type', 'Date', 'Technician', 'Org', 'Cost (INR)', 'Post Temp (°C)', 'Findings'];
    const rows = repairs.map((r) => [
      r.id,
      `"${r.assetName.replace(/"/g, '""')}"`,
      r.serviceType,
      new Date(r.serviceDate).toLocaleDateString(),
      `"${r.technicianName}"`,
      `"${r.technicianOrg || ''}"`,
      r.costInr || 0,
      r.postServiceTemp,
      `"${r.findings.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${warehouse.code}_refrigeration_maintenance_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported maintenance audit records to CSV.');
  };

  // Filtered past repairs
  const filteredRepairs = repairs.filter((r) => {
    const matchesSearch =
      r.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.technicianName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.findings.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || r.serviceType === filterType;
    return matchesSearch && matchesType;
  });

  const getServiceTypeBadge = (type: WarehouseMaintenanceRecord['serviceType']) => {
    switch (type) {
      case 'COMPRESSOR_REPAIR':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Compressor Overhaul</span>;
      case 'REFRIGERANT_LEAK':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">Refrigerant R404A</span>;
      case 'BACKUP_DG_LOAD':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">DG Generator ATS</span>;
      case 'SENSOR_CALIBRATION':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">NIST Calibration</span>;
      case 'DOOR_INSULATION':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Insulation &amp; Gasket</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">Preventive Audit</span>;
    }
  };

  const getPriorityBadge = (priority: UpcomingServiceSchedule['priority']) => {
    switch (priority) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800 border border-red-200 animate-pulse">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">HIGH PRIORITY</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">PLANNED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">PROACTIVE CARE</span>;
    }
  };

  const totalCost = repairs.reduce((acc, r) => acc + (r.costInr || 0), 0);
  const nextService = upcoming[0];

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* PROACTIVE CARE METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Readiness */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Refrigeration Health</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">98.4%</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Dual compressors nominal</div>
        </div>

        {/* Metric 2: Past Repairs */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Historical Repairs</span>
            <Wrench className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">{repairs.length}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Total Inv: ₹{totalCost.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Metric 3: Next Service */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Next Service Date</span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black font-mono text-amber-700 mt-1">
            {nextService ? `Due in ${nextService.daysRemaining}d` : 'None Scheduled'}
          </div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            {nextService ? nextService.serviceTitle : 'Up to date'}
          </div>
        </div>

        {/* Metric 4: Compliance */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">WHO Metrology Status</span>
            <FileCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-sm font-black text-purple-900 mt-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            NABL Valid
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">PT100 Probes calibrated</div>
        </div>

      </div>

      {/* CONTROLS HEADER & ACTIONS */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Segmented View Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveSubView('ALL')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeSubView === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Maintenance (Past &amp; Upcoming)
          </button>
          <button
            onClick={() => setActiveSubView('PAST_REPAIRS')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeSubView === 'PAST_REPAIRS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Past Repairs ({repairs.length})
          </button>
          <button
            onClick={() => setActiveSubView('UPCOMING_DATES')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeSubView === 'UPCOMING_DATES' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming Service Dates ({upcoming.length})
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setScheduleModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Schedule Upcoming Service</span>
          </button>

          <button
            onClick={() => setLogModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Past Repair</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            title="Export Maintenance History to CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* UPCOMING PROACTIVE SERVICE DATES SECTION */}
      {(activeSubView === 'ALL' || activeSubView === 'UPCOMING_DATES') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Upcoming Proactive Service Schedule</h3>
                <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {upcoming.length} Scheduled Preventative Audits
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Proactive equipment maintenance prevents unplanned thermal excursions and extends compressor lifecycle
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((srv) => (
              <div
                key={srv.id}
                className="bg-amber-50/30 rounded-xl border border-amber-200/70 p-4 flex flex-col justify-between space-y-3 hover:border-amber-300 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    {getPriorityBadge(srv.priority)}
                    <span className="font-mono text-xs font-bold text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200">
                      In {srv.daysRemaining} days
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-2 leading-snug">
                    {srv.serviceTitle}
                  </h4>
                  <div className="text-[11px] font-mono text-slate-500 mt-1">
                    Asset: {srv.assetName}
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {srv.scopeSummary}
                  </p>
                </div>

                <div className="pt-2 border-t border-amber-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-slate-700">Team: {srv.assignedTechnician}</span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {new Date(srv.targetDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PAST REPAIRS & SERVICING HISTORY SECTION */}
      {(activeSubView === 'ALL' || activeSubView === 'PAST_REPAIRS') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Historical Refrigeration Repairs &amp; Overhauls</h3>
                <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {filteredRepairs.length} Logged Entries
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                NABL certified repair logs, component replacements, verified post-repair temperatures, and audit certificates
              </p>
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter repairs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="COMPRESSOR_REPAIR">Compressors</option>
                <option value="REFRIGERANT_LEAK">Refrigerant</option>
                <option value="BACKUP_DG_LOAD">DG Generators</option>
                <option value="SENSOR_CALIBRATION">Sensors</option>
                <option value="DOOR_INSULATION">Insulation</option>
              </select>
            </div>
          </div>

          {/* Repairs Timeline / Table */}
          <div className="space-y-3">
            {filteredRepairs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No past maintenance records matching current search.
              </div>
            ) : (
              filteredRepairs.map((record) => (
                <div
                  key={record.id}
                  className="rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-all bg-slate-50/40 hover:bg-white space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {new Date(record.serviceDate).toLocaleDateString()}
                      </span>
                      {getServiceTypeBadge(record.serviceType)}
                      <span className="text-xs font-bold text-slate-900">
                        {record.assetName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Verified Core: {record.postServiceTemp}°C
                      </span>
                      {record.complianceCertificate && (
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {record.complianceCertificate}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-sans">
                    {record.findings}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>Technician: <strong className="text-slate-800">{record.technicianName}</strong></span>
                      {record.technicianOrg && (
                        <span>Org: <span className="text-slate-600">{record.technicianOrg}</span></span>
                      )}
                    </div>

                    {record.partsReplaced && record.partsReplaced.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-slate-400">Parts:</span>
                        {record.partsReplaced.map((part, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                            {part}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* ================= MODAL: LOG PAST REPAIR ================= */}
      {logModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="bg-blue-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-700/50 flex items-center justify-center text-blue-200">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Log Refrigeration Repair / Servicing</h3>
                  <p className="text-xs text-blue-200">{warehouse.name} ({warehouse.code})</p>
                </div>
              </div>
              <button onClick={() => setLogModalOpen(false)} className="text-blue-300 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRepairSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Equipment / Asset Serviced</label>
                <input
                  type="text"
                  required
                  value={logForm.assetName}
                  onChange={(e) => setLogForm({ ...logForm, assetName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Service Classification</label>
                  <select
                    value={logForm.serviceType}
                    onChange={(e) => setLogForm({ ...logForm, serviceType: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="COMPRESSOR_REPAIR">Compressor Overhaul</option>
                    <option value="REFRIGERANT_LEAK">Refrigerant R404A Service</option>
                    <option value="BACKUP_DG_LOAD">DG Generator ATS Test</option>
                    <option value="SENSOR_CALIBRATION">NIST Sensor Calibration</option>
                    <option value="DOOR_INSULATION">Insulation &amp; Seals</option>
                    <option value="PREVENTATIVE_AUDIT">Preventative Audit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Service Date</label>
                  <input
                    type="date"
                    required
                    value={logForm.serviceDate}
                    onChange={(e) => setLogForm({ ...logForm, serviceDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Technician</label>
                  <input
                    type="text"
                    required
                    value={logForm.technicianName}
                    onChange={(e) => setLogForm({ ...logForm, technicianName: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Service Organization</label>
                  <input
                    type="text"
                    required
                    value={logForm.technicianOrg}
                    onChange={(e) => setLogForm({ ...logForm, technicianOrg: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Verified Post-Repair Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={logForm.postServiceTemp}
                    onChange={(e) => setLogForm({ ...logForm, postServiceTemp: parseFloat(e.target.value) || 4.0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Repair Cost (INR)</label>
                  <input
                    type="number"
                    min="0"
                    value={logForm.costInr}
                    onChange={(e) => setLogForm({ ...logForm, costInr: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Components / Parts Replaced (comma separated)</label>
                <input
                  type="text"
                  value={logForm.partsReplaced}
                  onChange={(e) => setLogForm({ ...logForm, partsReplaced: e.target.value })}
                  placeholder="e.g. Suction valve plate, POE-32 oil, flare nut"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Findings &amp; Corrective Engineering Actions Taken</label>
                <textarea
                  rows={2}
                  required
                  value={logForm.findings}
                  onChange={(e) => setLogForm({ ...logForm, findings: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLogModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                >
                  Save Maintenance Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SCHEDULE UPCOMING SERVICE ================= */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="bg-amber-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-700/50 flex items-center justify-center text-amber-200">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Schedule Proactive Upcoming Service</h3>
                  <p className="text-xs text-amber-200">{warehouse.name} ({warehouse.code})</p>
                </div>
              </div>
              <button onClick={() => setScheduleModalOpen(false)} className="text-amber-300 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleServiceSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Title / Milestone</label>
                <input
                  type="text"
                  required
                  value={scheduleForm.serviceTitle}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, serviceTitle: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Equipment Unit / Asset</label>
                <input
                  type="text"
                  required
                  value={scheduleForm.assetName}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, assetName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Due Date</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.targetDate}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, targetDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Level</label>
                  <select
                    value={scheduleForm.priority}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="CRITICAL">Critical (Immediate SLA)</option>
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium / Routine</option>
                    <option value="PROACTIVE">Proactive Care</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Technician or Contractor</label>
                <input
                  type="text"
                  required
                  value={scheduleForm.assignedTechnician}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, assignedTechnician: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Scope of Work &amp; Preventive Checklist</label>
                <textarea
                  rows={2}
                  required
                  value={scheduleForm.scopeSummary}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scopeSummary: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
                >
                  Schedule Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
