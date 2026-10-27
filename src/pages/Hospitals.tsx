import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { HospitalItem } from '../types/index.js';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Thermometer,
  Boxes,
  ShieldCheck,
  X,
  Edit,
} from 'lucide-react';

export const Hospitals: React.FC = () => {
  const [hospitals, setHospitals] = useState<HospitalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');

  // Add Hospital Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    name: 'Tirunelveli Medical College Hospital',
    code: 'HOSP-TNV-06',
    district: 'Tirunelveli',
    city: 'Palayamkottai',
    address: 'High Ground, Palayamkottai, Tirunelveli',
    type: 'GOVERNMENT_MEDICAL_COLLEGE' as const,
    inChargeName: 'Dr. P. Muthukumar',
    inChargePhone: '+91 94435 67812',
    inChargeEmail: 'tvmch.coldchain@tn.gov.in',
    coldStorageType: 'Dual Ice-Lined Refrigerator (ILR) 600L',
    coldStorageCapacityLitres: 600,
    currentTemperature: 4.5,
  });

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const res = await api.getHospitals({
        district: districtFilter !== 'ALL' ? districtFilter : undefined,
        search: search || undefined,
      });
      setHospitals(res.hospitals);
    } catch (err) {
      console.error('Error fetching hospitals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, [districtFilter]);

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.createHospital(formData);
      setSuccessMsg(res.message);
      await fetchHospitals();
      setTimeout(() => {
        setAddModalOpen(false);
        setSuccessMsg('');
      }, 1300);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error adding hospital');
    } finally {
      setSubmitting(false);
    }
  };

  const districts = ['ALL', ...Array.from(new Set(hospitals.map((h) => h.district)))];

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Hospital & Facility Directory</h1>
              <p className="text-xs text-slate-500">
                Manage hospitals, cold-chain storage facilities, and receiving medical centers (Use Case #4)
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
            <span>ADD HOSPITAL</span>
          </button>

          <button
            onClick={fetchHospitals}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchHospitals();
          }}
          className="w-full md:w-80 relative"
        >
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Hospital Name, Code, City..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-slate-50"
          />
        </form>

        <div className="flex items-center space-x-2 text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <span className="font-semibold text-slate-500">District:</span>
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="bg-transparent font-bold text-slate-800 focus:outline-hidden"
          >
            {districts.map((d) => (
              <option key={d} value={d}>
                {d === 'ALL' ? 'All Districts' : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hospital Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <span>Loading hospitals from database...</span>
        </div>
      ) : hospitals.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
          <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-bold text-slate-700">No hospitals matched your filter.</p>
          <button
            onClick={() => {
              setDistrictFilter('ALL');
              setSearch('');
            }}
            className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {hospitals.map((h) => {
            const isNormal = h.temperatureStatus === 'NORMAL';
            return (
              <div
                key={h._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {h.code}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 mt-1 leading-snug">{h.name}</h3>
                      <p className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>
                          {h.city}, {h.district}
                        </span>
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isNormal ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800 animate-pulse'
                      }`}
                    >
                      {h.temperatureStatus}
                    </span>
                  </div>

                  {/* Telemetry and Storage Stats */}
                  <div className="grid grid-cols-2 gap-2.5 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Cold Storage</span>
                      <span className="text-base font-black font-mono text-slate-900">{h.currentTemperature.toFixed(1)}°C</span>
                      <span className="text-[9px] text-slate-400 block">{h.coldStorageCapacityLitres}L capacity</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Vaccine Stock</span>
                      <span className="text-base font-black font-mono text-indigo-700">
                        {Number(h.activeVaccineDoses).toLocaleString()}
                      </span>
                      <span className="text-[9px] text-slate-400 block">Doses in repository</span>
                    </div>
                  </div>

                  {/* In-Charge Details */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">In-Charge Officer:</span>
                      <span className="font-semibold text-slate-800">{h.inChargeName}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>Phone:</span>
                      </span>
                      <span className="font-mono text-slate-700">{h.inChargePhone}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 font-mono">{h.coldStorageType}</span>
                  <span className="text-[11px] font-bold text-blue-600 hover:text-blue-800">
                    Active Hub ✓
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD HOSPITAL MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Certified Healthcare Facility</h3>
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

            {errorMsg && (
              <div className="mt-3 p-3 bg-red-50 text-red-800 text-xs rounded-xl font-semibold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateHospital} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Hospital Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full p-2.5 font-semibold text-slate-900 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Hospital Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="mt-1 w-full p-2.5 font-mono font-bold text-blue-700 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    District *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    City / Town *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Cold Storage Capacity (L)
                  </label>
                  <input
                    type="number"
                    value={formData.coldStorageCapacityLitres}
                    onChange={(e) => setFormData({ ...formData, coldStorageCapacityLitres: parseInt(e.target.value, 10) || 300 })}
                    className="mt-1 w-full p-2.5 font-mono border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Cold Storage Equipment Type
                </label>
                <input
                  type="text"
                  value={formData.coldStorageType}
                  onChange={(e) => setFormData({ ...formData, coldStorageType: e.target.value })}
                  placeholder="e.g. Ice-Lined Refrigerator (ILR) 300L"
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Hospital In-Charge Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.inChargeName}
                    onChange={(e) => setFormData({ ...formData, inChargeName: e.target.value })}
                    className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Phone Contact *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.inChargePhone}
                    onChange={(e) => setFormData({ ...formData, inChargePhone: e.target.value })}
                    className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl font-mono"
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
                  {submitting ? 'Adding...' : 'Register Hospital'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
