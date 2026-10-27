import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { RouteOption, ShipmentItem } from '../types/index.js';
import {
  Route as RouteIcon,
  Navigation,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Building2,
  Sparkles,
  Award,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Layers,
  Compass,
} from 'lucide-react';

export const RoutePlanner: React.FC = () => {
  const [searchParams] = useSearchParams();

  // Inputs
  const [origin, setOrigin] = useState('Chennai');
  const [destination, setDestination] = useState('Nagercoil');
  const [vaccineName, setVaccineName] = useState('Covishield (ChAdOx1-S)');
  const [currentTemp, setCurrentTemp] = useState(5.2);
  const [remainingTravelTime, setRemainingTravelTime] = useState(7.0);

  // Results
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [recommendedRoute, setRecommendedRoute] = useState<string>('Route B');
  const [summary, setSummary] = useState<string>('');
  const [evaluating, setEvaluating] = useState(false);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  // Pre-fill from query if coming from a shipment
  useEffect(() => {
    async function loadFromQuery() {
      const shipQuery = searchParams.get('shipment');
      if (shipQuery) {
        try {
          const res = await api.getShipmentById(shipQuery);
          if (res.shipment) {
            setOrigin(res.shipment.origin);
            setDestination(res.shipment.destination);
            setVaccineName(res.shipment.vaccineName);
            setCurrentTemp(res.shipment.currentTemperature);
            setRemainingTravelTime(res.shipment.remainingTravelTime);
            handleEvaluate(res.shipment.origin, res.shipment.destination, res.shipment.vaccineName, res.shipment.currentTemperature, res.shipment.remainingTravelTime, res.shipment._id);
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      // Default initial evaluation
      handleEvaluate(origin, destination, vaccineName, currentTemp, remainingTravelTime);
    }
    loadFromQuery();
  }, []);

  const handleEvaluate = async (
    org = origin,
    dest = destination,
    vac = vaccineName,
    temp = currentTemp,
    time = remainingTravelTime,
    shipmentId?: string
  ) => {
    setEvaluating(true);
    try {
      const res = await api.evaluateRoutes({
        origin: org,
        destination: dest,
        vaccineName: vac,
        currentTemperature: temp,
        remainingTravelTime: time,
        shipmentId,
      });

      setRoutes(res.evaluation.routes);
      setRecommendedRoute(res.evaluation.recommendedRoute);
      setSummary(res.evaluation.evaluationSummary);

      const recIndex = res.evaluation.routes.findIndex((r) => r.isRecommended);
      setSelectedRouteIndex(recIndex >= 0 ? recIndex : 0);
    } catch (err: any) {
      alert(err.message || 'Route evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">🔴 CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">🟠 HIGH RISK</span>;
      case 'MODERATE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">🟡 MODERATE</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">🟢 LOW RISK</span>;
    }
  };

  const currentActiveRoute = routes[selectedRouteIndex] || routes[0];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <RouteIcon className="w-6 h-6 text-blue-600" />
              <span>Temperature-Aware Route Planning Engine</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Multi-criteria cold corridor optimizer balancing distance, thermal exposure, and intermediate cold storage hubs
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 self-start md:self-auto">
            Unique Feature #2
          </span>
        </div>
      </div>

      {/* INPUTS FORM CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Navigation className="w-4 h-4 text-blue-600" />
          <span>Cold-Chain Transit Parameters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          
          <div>
            <label className="block font-bold text-slate-700 uppercase text-[10px]">Origin City</label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="mt-1 w-full p-2.5 font-semibold text-slate-900 border border-slate-300 rounded-xl bg-slate-50"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase text-[10px]">Destination City</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="mt-1 w-full p-2.5 font-semibold text-slate-900 border border-slate-300 rounded-xl bg-slate-50"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase text-[10px]">Vaccine Cargo</label>
            <input
              type="text"
              value={vaccineName}
              onChange={(e) => setVaccineName(e.target.value)}
              className="mt-1 w-full p-2.5 font-semibold text-slate-900 border border-slate-300 rounded-xl bg-slate-50"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase text-[10px]">Current Temp (°C)</label>
            <input
              type="number"
              step="0.1"
              value={currentTemp}
              onChange={(e) => setCurrentTemp(parseFloat(e.target.value) || 0)}
              className="mt-1 w-full p-2.5 font-mono font-bold text-blue-700 border border-slate-300 rounded-xl bg-slate-50"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase text-[10px]">Travel Time (hrs)</label>
            <input
              type="number"
              step="0.5"
              value={remainingTravelTime}
              onChange={(e) => setRemainingTravelTime(parseFloat(e.target.value) || 1)}
              className="mt-1 w-full p-2.5 font-mono text-slate-900 border border-slate-300 rounded-xl bg-slate-50"
            />
          </div>

        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => handleEvaluate(origin, destination, vaccineName, currentTemp, remainingTravelTime)}
            disabled={evaluating}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition flex items-center space-x-2"
          >
            <Compass className={`w-4 h-4 ${evaluating ? 'animate-spin' : ''}`} />
            <span>{evaluating ? 'Evaluating Multi-Criteria Vectors...' : 'FIND SAFEST ROUTE'}</span>
          </button>
        </div>
      </div>

      {/* RECOMMENDED ROUTE SPOTLIGHT CARD */}
      {routes.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-emerald-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Award className="w-48 h-48" />
          </div>

          <div className="relative z-10 space-y-3">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-400 text-emerald-950 flex items-center space-x-1 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>⭐ RECOMMENDED SAFEST ROUTE</span>
              </span>
              <span className="text-xs text-emerald-200 font-mono">
                Overall Safety Score: 94/100
              </span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  {routes.find((r) => r.isRecommended)?.name || 'Route B'} — {origin} ➔ {destination} (Green Cold Corridor)
                </h2>
                <p className="text-xs text-emerald-100/80 mt-1 max-w-3xl leading-relaxed">
                  {routes.find((r) => r.isRecommended)?.reason}
                </p>
              </div>

              <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10 shrink-0">
                <div className="text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-300">Distance</div>
                  <div className="text-lg font-black font-mono">{routes.find((r) => r.isRecommended)?.distanceKm} km</div>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div className="text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-300">Est. Time</div>
                  <div className="text-lg font-black font-mono">{routes.find((r) => r.isRecommended)?.estimatedTimeHours} hrs</div>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div className="text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-300">Cold-Hubs</div>
                  <div className="text-lg font-black font-mono">{routes.find((r) => r.isRecommended)?.coldStoragePoints} Depots</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* THREE COMPARATIVE ROUTE CARDS (Route A, Route B, Route C) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {routes.map((route, idx) => {
          const isSelected = selectedRouteIndex === idx;
          return (
            <div
              key={route.name}
              onClick={() => setSelectedRouteIndex(idx)}
              className={`rounded-2xl p-5 border transition cursor-pointer flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-lg text-slate-900 font-mono">{route.name}</span>
                    {route.isRecommended && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  {getRiskBadge(route.coldChainRisk)}
                </div>

                <div className="text-xs text-slate-500 font-medium mt-1">
                  {route.routeName}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-bold">Distance</div>
                    <div className="text-sm font-black font-mono text-slate-900">{route.distanceKm} km</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-bold">Travel Time</div>
                    <div className="text-sm font-black font-mono text-slate-900">{route.estimatedTimeHours} hrs</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-bold">Cold Hubs</div>
                    <div className="text-sm font-black font-mono text-blue-700">{route.coldStoragePoints} points</div>
                  </div>
                </div>

                {/* Score Bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Route Safety Score:</span>
                    <span className="font-bold text-slate-900 font-mono">{route.routeScore} / 100</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        route.routeScore >= 80 ? 'bg-emerald-500' : route.routeScore >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${route.routeScore}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                  {route.reason}
                </p>
              </div>

              {/* Waypoints preview */}
              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                <span className="font-bold text-slate-700 block mb-1">Cold Support Points along route:</span>
                <ul className="space-y-0.5 pl-3 list-disc">
                  {route.pointsDetails.map((pt, i) => (
                    <li key={i} className="text-slate-600">{pt}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* VISUAL MAP-STYLE ROUTE SIMULATION CANVAS */}
      {currentActiveRoute && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span>Visual Corridor Waypoint Map — {currentActiveRoute.name}</span>
              </h3>
              <p className="text-xs text-slate-500">
                Waypoints, certified ILR cold repositories, and regional transit checkpoint nodes
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Ambient Heat Index: {currentActiveRoute.avgAmbientTemp}°C
            </span>
          </div>

          {/* Map Waypoint Chain */}
          <div className="relative py-6 px-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl text-white overflow-x-auto">
            <div className="min-w-[650px] flex items-center justify-between relative z-10">
              {currentActiveRoute.waypoints.map((wp, i) => {
                const isFirst = i === 0;
                const isLast = i === currentActiveRoute.waypoints.length - 1;
                return (
                  <div key={i} className="flex flex-col items-center text-center px-2 relative group">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                        wp.isHub
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                          : 'bg-slate-700 text-slate-300 border border-slate-600'
                      }`}
                    >
                      {wp.isHub ? <Building2 className="w-6 h-6" /> : <MapPin className="w-5 h-5" />}
                    </div>
                    
                    <div className="mt-2.5 max-w-[120px]">
                      <div className="text-xs font-bold text-white line-clamp-1">{wp.name}</div>
                      <div className="text-[10px] text-cyan-300 font-mono mt-0.5">
                        {wp.isHub ? 'Certified Cold Hub' : 'Transit Node'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Connecting Track Line */}
            <div className="absolute top-[48px] left-12 right-12 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-full z-0 opacity-70" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Corridor Infrastructure</span>
              <span className="font-semibold text-slate-800">{currentActiveRoute.roadCondition}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Traffic Congestion</span>
              <span className="font-semibold text-slate-800">{currentActiveRoute.congestionLevel}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Thermal Risk Analysis</span>
              <span className="font-semibold text-slate-800">{currentActiveRoute.coldChainRisk} Risk Category</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
