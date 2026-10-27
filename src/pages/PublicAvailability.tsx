import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { PublicHospitalAvailability } from '../types/index.js';
import {
  Globe,
  Search,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Boxes,
  Thermometer,
  Calendar,
  Building2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const PublicAvailability: React.FC = () => {
  const [facilities, setFacilities] = useState<PublicHospitalAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchPublicStock = async () => {
    try {
      setLoading(true);
      const res = await api.getPublicVaccineAvailability({
        district: district !== 'ALL' ? district : undefined,
        search: search || undefined,
      });
      setFacilities(res.facilities);
    } catch (err) {
      console.error('Error fetching public availability:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicStock();
  }, [district]);

  const districts = ['ALL', ...Array.from(new Set(facilities.map((f) => f.district)))];

  return (
    <div className="space-y-6">
      
      {/* Hero Banner for Public Citizen Portal */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Globe className="w-64 h-64" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-400 text-cyan-950 inline-block uppercase tracking-wider">
            Public Citizen Portal (Use Case #9)
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Public Vaccine Availability &amp; Cold-Chain Verification
          </h1>
          <p className="text-xs sm:text-sm text-cyan-100/80 leading-relaxed">
            Search nearby certified government hospitals and medical centers for real-time vaccine availability. Every vial is monitored and certified under WHO 2°C–8°C cold-chain standards.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchPublicStock();
          }}
          className="w-full md:w-96 relative"
        >
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Hospital Name, City, or Landmark..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-slate-50"
          />
        </form>

        <div className="flex items-center space-x-2 text-xs bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
          <span className="font-semibold text-slate-500">District:</span>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
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

      {/* Facilities Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <span>Searching verified cold-chain hospital inventory...</span>
        </div>
      ) : facilities.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
          <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-bold text-slate-700">No medical centers matched your search query.</p>
          <button
            onClick={() => {
              setDistrict('ALL');
              setSearch('');
            }}
            className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg"
          >
            Reset Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {facilities.map((fac) => (
            <div
              key={fac.hospitalId}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-blue-300 transition space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {fac.code}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 mt-1">{fac.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{fac.address}</span>
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1 shrink-0">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>WHO CERTIFIED (2-8°C)</span>
                  </span>
                </div>

                {/* Storage & Stock Summary */}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Verified Storage Temp</span>
                    <span className="font-mono font-bold text-blue-700 text-sm">{fac.currentTemperature.toFixed(1)}°C</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Vials in Stock</span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      {fac.totalDosesAvailable.toLocaleString()} doses
                    </span>
                  </div>
                </div>

                {/* Vaccines List */}
                <div className="mt-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                    Available Vaccine Types at this Center:
                  </span>
                  
                  {fac.vaccines.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No batches registered.</span>
                  ) : (
                    <div className="space-y-1.5">
                      {fac.vaccines.map((v, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 border border-slate-100 text-xs"
                        >
                          <span className="font-medium text-slate-800">{v.vaccineName}</span>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-slate-700">{v.availableDoses} doses</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              v.status === 'IN_STOCK' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {v.status === 'IN_STOCK' ? 'Available' : 'Limited'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center space-x-1.5 font-medium">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Reception / In-Charge: {fac.contactPhone}</span>
                </span>
                <span className="text-emerald-700 font-bold text-[11px]">Free Public Immunization ✓</span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
