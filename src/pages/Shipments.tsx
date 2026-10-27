import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { ShipmentItem } from '../types/index.js';
import {
  Truck,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Thermometer,
  Route as RouteIcon,
  X,
  ExternalLink,
  Trash2,
  RefreshCw,
  PackageCheck,
  Map as MapIcon,
  LayoutList,
} from 'lucide-react';
import { RealtimeShipmentMap } from '../components/RealtimeShipmentMap.js';

export const Shipments: React.FC = () => {
  const navigate = useNavigate();

  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  
  // Add Shipment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form Fields (Initialized with example prompt values for instant demo)
  const [formData, setFormData] = useState({
    trackingId: 'TRK-VAX-1005',
    vaccineName: 'Covishield (ChAdOx1-S)',
    batchNumber: 'BATCH-2026-001',
    quantity: 500,
    origin: 'Chennai',
    destination: 'Nagercoil',
    currentTemperature: 5.2,
    safeMinTemperature: 2.0,
    safeMaxTemperature: 8.0,
    expectedTravelTime: 7.0,
    driverName: 'K. Rajan',
    driverPhone: '+91 94432 10987',
    vehicleReg: 'TN-01-CV-9821 (Reefer Van)',
  });

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const res = await api.getShipments({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        riskLevel: riskFilter !== 'ALL' ? riskFilter : undefined,
        search: search ? search : undefined,
      });
      setShipments(res.shipments);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [statusFilter, riskFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchShipments();
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await api.createShipment(formData);
      setSuccessMessage(res.message || 'Shipment created and registered in MongoDB successfully!');
      
      // Auto-generate random new tracking ID for next creation
      const nextNum = Math.floor(1006 + Math.random() * 8990);
      setFormData((prev) => ({
        ...prev,
        trackingId: `TRK-VAX-${nextNum}`,
        batchNumber: `BATCH-2026-${Math.floor(100 + Math.random() * 900)}`,
      }));

      await fetchShipments();
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMessage('');
      }, 1400);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating shipment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this shipment and its telemetry logs from MongoDB?')) {
      try {
        await api.deleteShipment(id);
        fetchShipments();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getRiskChip = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200 animate-pulse">🔴 CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">🟠 HIGH RISK</span>;
      case 'MODERATE':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">🟡 MODERATE</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">🟢 LOW RISK</span>;
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'IN_TRANSIT':
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-800">IN TRANSIT</span>;
      case 'AT_RISK':
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-red-100 text-red-800">AT RISK</span>;
      case 'DELIVERED':
      case 'ACCEPTED':
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800">ACCEPTED</span>;
      case 'FLAGGED':
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800">FLAGGED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & New Shipment Trigger */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Truck className="w-6 h-6 text-blue-600" />
            <span>Vaccine Shipment Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, track, and audit active refrigerated vaccine consignments
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE SHIPMENT</span>
          </button>

          <button
            onClick={fetchShipments}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="w-full md:w-80 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Tracking ID, Vaccine, Route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-slate-50"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          
          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-bold focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="AT_RISK">At Risk</option>
              <option value="ACCEPTED">Delivered / Accepted</option>
              <option value="FLAGGED">Flagged</option>
            </select>
          </div>

          {/* Risk Filter */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="font-semibold text-slate-500">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-transparent font-bold focus:outline-hidden"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="LOW">Low Risk</option>
              <option value="MODERATE">Moderate</option>
              <option value="HIGH">High Risk</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'map' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Live Map</span>
            </button>
          </div>

        </div>
      </div>

      {/* Conditionally Render Map or Table */}
      {viewMode === 'map' ? (
        <RealtimeShipmentMap shipments={shipments} height="660px" showControls={true} />
      ) : (
        /* Shipments List / Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              <span>Loading shipments from MongoDB...</span>
            </div>
        ) : shipments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <p className="font-medium text-sm">No shipments match your search filter.</p>
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setRiskFilter('ALL');
                setSearch('');
              }}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Tracking ID</th>
                  <th className="py-3.5 px-4">Vaccine & Lot</th>
                  <th className="py-3.5 px-4">Quantity</th>
                  <th className="py-3.5 px-4">Origin ➔ Destination</th>
                  <th className="py-3.5 px-4">Live Temp</th>
                  <th className="py-3.5 px-4">Predictive Risk</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipments.map((s) => {
                  const isExcursion = s.currentTemperature > s.safeMaxTemperature || s.currentTemperature < s.safeMinTemperature;
                  return (
                    <tr
                      key={s._id}
                      onClick={() => navigate(`/shipments/${s.trackingId}`)}
                      className="hover:bg-blue-50/40 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                        {s.trackingId}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{s.vaccineName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{s.batchNumber}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 font-mono">
                        {s.quantity.toLocaleString()} doses
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{s.origin} → {s.destination}</div>
                        <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{s.remainingTravelTime}h remaining</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className={`font-mono font-black text-sm ${isExcursion ? 'text-red-600' : 'text-slate-900'}`}>
                          {s.currentTemperature.toFixed(1)}°C
                        </div>
                        <div className="text-[10px] text-slate-400">
                          [{s.safeMinTemperature}°C – {s.safeMaxTemperature}°C]
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {getRiskChip(s.riskLevel)}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusChip(s.status)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/temperature?shipment=${s.trackingId}`)}
                            title="Monitor Live Temperature"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-cyan-50 text-slate-600 hover:text-cyan-700 transition"
                          >
                            <Thermometer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/routes?shipment=${s.trackingId}`)}
                            title="Evaluate Routes"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition"
                          >
                            <RouteIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(s._id, e)}
                            title="Delete Record"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* CREATE SHIPMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Add New Vaccine Shipment</h2>
                  <p className="text-xs text-slate-500">Registers shipment in MongoDB & initializes thermal telemetry</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {successMessage && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateShipment} className="mt-4 space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Tracking ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.trackingId}
                    onChange={(e) => setFormData({ ...formData, trackingId: e.target.value.toUpperCase() })}
                    placeholder="TRK-VAX-1005"
                    className="mt-1 w-full p-2.5 font-mono font-bold text-blue-700 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Vaccine Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.vaccineName}
                    onChange={(e) => setFormData({ ...formData, vaccineName: e.target.value })}
                    placeholder="Covishield (ChAdOx1-S)"
                    className="mt-1 w-full p-2.5 font-semibold text-slate-900 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Batch Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    placeholder="BATCH-2026-001"
                    className="mt-1 w-full p-2.5 font-mono border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Quantity (Doses) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
                    placeholder="500"
                    className="mt-1 w-full p-2.5 font-mono border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Origin Hub *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    placeholder="Chennai"
                    className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Destination Facility *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="Nagercoil"
                    className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Temperature Range & Current */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-600 text-[10px] uppercase">
                    Initial Temp (°C) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.currentTemperature}
                    onChange={(e) => setFormData({ ...formData, currentTemperature: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full p-2 font-mono font-bold text-slate-900 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 text-[10px] uppercase">
                    Safe Min (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.safeMinTemperature}
                    onChange={(e) => setFormData({ ...formData, safeMinTemperature: parseFloat(e.target.value) || 2 })}
                    className="mt-1 w-full p-2 font-mono text-slate-700 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 text-[10px] uppercase">
                    Safe Max (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.safeMaxTemperature}
                    onChange={(e) => setFormData({ ...formData, safeMaxTemperature: parseFloat(e.target.value) || 8 })}
                    className="mt-1 w-full p-2 font-mono text-slate-700 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Expected Travel Time (Hours) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  min="0.5"
                  value={formData.expectedTravelTime}
                  onChange={(e) => setFormData({ ...formData, expectedTravelTime: parseFloat(e.target.value) || 1 })}
                  placeholder="7 hours"
                  className="mt-1 w-full p-2.5 font-mono border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition"
                >
                  {submitting ? 'Registering in MongoDB...' : 'CREATE SHIPMENT'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
