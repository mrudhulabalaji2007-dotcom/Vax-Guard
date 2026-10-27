import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { InventoryItem, HospitalItem } from '../types/index.js';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Thermometer,
  Calendar,
  Building2,
  X,
  Edit2,
  ArrowUpDown,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';

export const Inventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [hospitals, setHospitals] = useState<HospitalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStock, setTotalStock] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Add Item Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Update Stock Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [updateDoses, setUpdateDoses] = useState<number>(0);

  const [formData, setFormData] = useState({
    vaccineName: 'Covishield (ChAdOx1-S)',
    batchNumber: 'BATCH-2026-105',
    manufacturer: 'Serum Institute of India',
    facilityType: 'HOSPITAL' as const,
    facilityId: '',
    facilityName: '',
    availableDoses: 800,
    reservedDoses: 50,
    lowStockThreshold: 200,
    safeMinTemperature: 2.0,
    safeMaxTemperature: 8.0,
    currentStorageTemperature: 4.5,
  });

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [invRes, hospRes] = await Promise.all([
        api.getInventory({
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: search || undefined,
        }),
        api.getHospitals(),
      ]);

      setItems(invRes.inventory);
      setTotalStock(invRes.totalStock);
      setLowStockCount(invRes.lowStockCount);
      setCriticalCount(invRes.criticalCount);
      setHospitals(hospRes.hospitals);

      if (hospRes.hospitals.length > 0 && !formData.facilityId) {
        setFormData((prev) => ({
          ...prev,
          facilityId: hospRes.hospitals[0]._id,
          facilityName: hospRes.hospitals[0].name,
        }));
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [statusFilter]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const targetHospital = hospitals.find((h) => h._id === formData.facilityId);
      const payload = {
        ...formData,
        facilityName: targetHospital ? targetHospital.name : formData.facilityName,
      };

      const res = await api.addInventoryItem(payload);
      setSuccessMsg(res.message);
      await fetchInventory();
      setTimeout(() => {
        setAddModalOpen(false);
        setSuccessMsg('');
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Error adding inventory');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      setSubmitting(true);
      await api.updateInventoryStock(selectedItem._id, {
        availableDoses: updateDoses,
      });
      setEditModalOpen(false);
      await fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Error updating stock');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setUpdateDoses(item.availableDoses);
    setEditModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CRITICAL_SHORTAGE':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 animate-pulse">CRITICAL SHORTAGE</span>;
      case 'LOW_STOCK':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">LOW STOCK</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">IN STOCK</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Vaccine Inventory & Stock Repository</h1>
              <p className="text-xs text-slate-500">
                Manage vaccine stock, monitor expiry dates, and mitigate regional shortage risks (Use Case #2)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>ADD STOCK BATCH</span>
          </button>

          <button
            onClick={fetchInventory}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Available Doses</span>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">
            {totalStock.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500">Across all hospitals & hubs</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-amber-500">Low-Stock Batches</span>
          <div className={`text-2xl font-black font-mono mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {lowStockCount}
          </div>
          <span className="text-[11px] text-amber-700 font-medium">Under threshold</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-red-500">Critical Shortages</span>
          <div className={`text-2xl font-black font-mono mt-1 ${criticalCount > 0 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
            {criticalCount}
          </div>
          <span className="text-[11px] text-red-600 font-semibold">Immediate supply required</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-600">Thermal Compliance</span>
          <div className="text-2xl font-black font-mono text-emerald-600 mt-1">100%</div>
          <span className="text-[11px] text-emerald-700 font-semibold">2.0°C – 8.0°C verified</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchInventory();
          }}
          className="w-full md:w-80 relative"
        >
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Vaccine, Batch, Hospital..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-slate-50"
          />
        </form>

        <div className="flex items-center space-x-2 text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <span className="font-semibold text-slate-500">Stock Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent font-bold text-slate-800 focus:outline-hidden"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="CRITICAL_SHORTAGE">Critical Shortage</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
            <span>Loading vaccine inventory from MongoDB...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <p className="font-bold text-sm">No inventory records found.</p>
            <button
              onClick={() => {
                setStatusFilter('ALL');
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
                  <th className="py-3.5 px-4">Vaccine & Lot</th>
                  <th className="py-3.5 px-4">Facility / Hospital</th>
                  <th className="py-3.5 px-4">Available Stock</th>
                  <th className="py-3.5 px-4">Threshold</th>
                  <th className="py-3.5 px-4">Storage Temp</th>
                  <th className="py-3.5 px-4">Expiry Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.vaccineName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {item.batchNumber} • {item.manufacturer}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{item.facilityName}</div>
                      <div className="text-[10px] text-slate-400 uppercase">{item.facilityType}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-sm text-slate-900">
                      {item.availableDoses.toLocaleString()} doses
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      Min {item.lowStockThreshold}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                      {item.currentStorageTemperature.toFixed(1)}°C
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {new Date(item.expiryDate).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(item.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openEditDialog(item)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold rounded-lg text-[11px] transition"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADJUST STOCK MODAL */}
      {editModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Adjust Hospital Vaccine Stock</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedItem.vaccineName} ({selectedItem.batchNumber}) at {selectedItem.facilityName}
            </p>

            <form onSubmit={handleUpdateStock} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Updated Available Doses (Vials)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={updateDoses}
                  onChange={(e) => setUpdateDoses(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 w-full p-2.5 font-mono font-bold text-lg text-blue-700 border border-slate-300 rounded-xl"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Configured Low-Stock Buffer: {selectedItem.lowStockThreshold} doses
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {submitting ? 'Updating...' : 'Save Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD INVENTORY ITEM MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Vaccine Stock Batch</h3>
              <button onClick={() => setAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {successMsg && (
              <div className="mt-3 p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Vaccine Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.vaccineName}
                  onChange={(e) => setFormData({ ...formData, vaccineName: e.target.value })}
                  className="mt-1 w-full p-2.5 font-semibold text-slate-900 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Batch Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value.toUpperCase() })}
                    className="mt-1 w-full p-2.5 font-mono border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Hospital / Storage Facility *
                </label>
                <select
                  value={formData.facilityId}
                  onChange={(e) => {
                    const hosp = hospitals.find((h) => h._id === e.target.value);
                    setFormData({
                      ...formData,
                      facilityId: e.target.value,
                      facilityName: hosp ? hosp.name : '',
                    });
                  }}
                  className="mt-1 w-full p-2.5 font-semibold border border-slate-300 rounded-xl bg-white"
                >
                  {hospitals.map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.name} ({h.district})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Available Doses *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.availableDoses}
                    onChange={(e) => setFormData({ ...formData, availableDoses: parseInt(e.target.value, 10) || 0 })}
                    className="mt-1 w-full p-2.5 font-mono font-bold text-blue-700 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Low-Stock Threshold
                  </label>
                  <input
                    type="number"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value, 10) || 100 })}
                    className="mt-1 w-full p-2.5 font-mono border border-slate-300 rounded-xl"
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
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {submitting ? 'Adding...' : 'Add Stock Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
