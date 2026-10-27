import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { ShipmentItem, HistoricalTrendPoint } from '../types/index.js';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  Legend,
} from 'recharts';
import * as d3 from 'd3';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Sparkles,
  RefreshCw,
  Zap,
  Activity,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface Props {
  initialShipmentId?: string;
  onShipmentChange?: (shipmentId: string) => void;
}

export const HistoricalTempVsRiskChart: React.FC<Props> = ({ initialShipmentId, onShipmentChange }) => {
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [selectedTrackingId, setSelectedTrackingId] = useState<string>(initialShipmentId || '');
  const [activeShipment, setActiveShipment] = useState<Partial<ShipmentItem> | null>(null);
  const [timeSeries, setTimeSeries] = useState<HistoricalTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [showAmbient, setShowAmbient] = useState(true);
  const [showRiskArea, setShowRiskArea] = useState(true);

  // Fetch all shipments for selector
  useEffect(() => {
    async function loadShipments() {
      try {
        const res = await api.getShipments();
        setShipments(res.shipments);
        if (!selectedTrackingId && res.shipments.length > 0) {
          // Default to highest risk or TRK-VAX-1008 / TRK-VAX-1005
          const highRisk = res.shipments.find((s) => s.status === 'AT_RISK') || res.shipments[0];
          setSelectedTrackingId(highRisk.trackingId);
        }
      } catch (err) {
        console.error('Error loading shipments:', err);
      }
    }
    loadShipments();
  }, []);

  // Fetch trend data whenever shipment selection changes
  const fetchTrendData = async (trackingId: string) => {
    if (!trackingId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.getHistoricalTrends(trackingId);
      setActiveShipment(res.shipment);
      setTimeSeries(res.timeSeriesData || []);
    } catch (err: any) {
      console.error('Error fetching trend data:', err);
      setError(err?.message || 'Error loading trend telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTrackingId) {
      fetchTrendData(selectedTrackingId);
      if (onShipmentChange) onShipmentChange(selectedTrackingId);
    }
  }, [selectedTrackingId]);

  // Simulate instant thermal rise and re-render curve
  const handleSimulateRise = async () => {
    if (!selectedTrackingId) return;
    try {
      setSimulating(true);
      await api.simulateTemperatureRise({
        shipmentId: selectedTrackingId,
        delta: 0.8,
        step: 2,
      });
      await fetchTrendData(selectedTrackingId);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  // D3 Color Scale for Risk interpolation
  const d3RiskColor = (score: number) => {
    if (score >= 81) return '#EF4444'; // Critical Red
    if (score >= 61) return '#F97316'; // High Orange
    if (score >= 31) return '#FBBF24'; // Moderate Amber
    return '#10B981'; // Low Green
  };

  const latestPoint = timeSeries.length > 0 ? timeSeries[timeSeries.length - 1] : null;

  return (
    <div className="apple-liquid-glass-card rounded-3xl p-6 sm:p-7 space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Historical Temperature vs. Predicted Spoilage Risk</span>
                <span className="text-[10px] font-mono uppercase bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 font-bold">
                  D3 / Recharts Dual-Axis
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Continuous thermal sensor telemetry cross-referenced against predictive rule-based failure probability
              </p>
            </div>
          </div>
        </div>

        {/* Shipment Selector & Simulation Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1.5 bg-black/40 border border-white/[0.1] px-3 py-1.5 rounded-2xl text-xs font-mono">
            <span className="text-slate-400 font-semibold">Shipment:</span>
            <select
              value={selectedTrackingId}
              onChange={(e) => setSelectedTrackingId(e.target.value)}
              className="bg-transparent font-mono font-bold text-cyan-300 focus:outline-none cursor-pointer"
            >
              {shipments.map((s) => (
                <option key={s._id} value={s.trackingId} className="bg-slate-900 text-white">
                  {s.trackingId} — {s.vaccineName} ({s.currentTemperature.toFixed(1)}°C)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSimulateRise}
            disabled={simulating}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-2xl text-xs font-mono font-bold transition disabled:opacity-50 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
            title="Simulate heat exposure to see real-time risk surge"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-400 ${simulating ? 'animate-bounce' : ''}`} />
            <span>Simulate Thermal Surge</span>
          </button>

          <button
            onClick={() => fetchTrendData(selectedTrackingId)}
            className="p-2 rounded-2xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 transition"
            title="Refresh trend data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Status Strip for the selected shipment */}
      {latestPoint && activeShipment && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.08] font-mono">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Cargo Temp</span>
            <span className={`text-xl font-black ${latestPoint.isExcursion ? 'text-red-400 text-glow-cyan' : 'text-cyan-300'}`}>
              {latestPoint.temperature.toFixed(1)}°C
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Safe: 2.0°C – 8.0°C</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.08] font-mono">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Predicted Risk</span>
            <span
              className="text-xl font-black"
              style={{ color: d3RiskColor(latestPoint.predictedRiskScore) }}
            >
              {latestPoint.predictedRiskScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
            </span>
            <span className="text-[10px] font-bold uppercase block mt-0.5" style={{ color: d3RiskColor(latestPoint.predictedRiskScore) }}>
              {latestPoint.riskLevel} RISK
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.08] font-mono">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Warming Gradient</span>
            <span className="text-base font-bold text-slate-200">
              {latestPoint.rateOfChangePerHour > 0 ? `+${latestPoint.rateOfChangePerHour}` : latestPoint.rateOfChangePerHour}°C/hr
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Thermal velocity</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.08] font-mono">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Excursion Countdown</span>
            <span className={`text-base font-bold ${latestPoint.isExcursion ? 'text-red-400 font-black' : 'text-slate-200'}`}>
              {latestPoint.isExcursion
                ? 'EXCURSION ACTIVE'
                : latestPoint.predictedExcursionMinutes > 0
                ? `${latestPoint.predictedExcursionMinutes} min`
                : 'Safe (>180 min)'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Time to threshold</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.08] font-mono">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Ambient Outside</span>
            <span className="text-base font-bold text-slate-300">
              {latestPoint.ambientTemperature.toFixed(1)}°C
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Reefer insulation active</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.08] font-mono">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Consignment Route</span>
            <span className="text-xs font-bold text-white truncate block">
              {activeShipment.origin} ➔ {activeShipment.destination}
            </span>
            <span className="text-[10px] text-cyan-300/80 block mt-0.5 truncate">{activeShipment.vaccineName}</span>
          </div>

        </div>
      )}

      {/* Main Dual-Axis Recharts Chart */}
      <div className="h-80 w-full relative">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600 mr-2" />
            <span>Interpolating time-series telemetry from MongoDB...</span>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <span>{error}</span>
            <button
              onClick={() => fetchTrendData(selectedTrackingId)}
              className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 text-xs hover:bg-blue-100 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={timeSeries}
              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
            >
              <defs>
                {/* Temperature Gradient */}
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                </linearGradient>

                {/* Risk Gradient */}
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />

              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
              />

              {/* Left Y-Axis: Temperature (°C) */}
              <YAxis
                yAxisId="tempAxis"
                domain={[0, 12]}
                tick={{ fontSize: 10, fill: '#2563EB' }}
                unit="°C"
                axisLine={{ stroke: '#93C5FD' }}
                label={{
                  value: 'Temperature (°C)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#2563EB',
                  fontSize: 11,
                  fontWeight: 600,
                  offset: 0,
                }}
              />

              {/* Right Y-Axis: Predicted Risk Score (0 - 100) */}
              <YAxis
                yAxisId="riskAxis"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#DC2626' }}
                unit=""
                axisLine={{ stroke: '#FCA5A5' }}
                label={{
                  value: 'Predicted Risk Score (0-100)',
                  angle: 90,
                  position: 'insideRight',
                  fill: '#DC2626',
                  fontSize: 11,
                  fontWeight: 600,
                  offset: 0,
                }}
              />

              {/* Highlight Safe Thermal Range (2.0°C to 8.0°C) */}
              <ReferenceArea
                yAxisId="tempAxis"
                y1={2.0}
                y2={8.0}
                fill="#10B981"
                fillOpacity={0.08}
              />

              {/* Upper Safe Limit (8°C) */}
              <ReferenceLine
                yAxisId="tempAxis"
                y={8.0}
                stroke="#EF4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: 'Safe Max (8.0°C)',
                  fill: '#EF4444',
                  fontSize: 10,
                  position: 'insideTopLeft',
                  fontWeight: 700,
                }}
              />

              {/* Lower Safe Limit (2°C) */}
              <ReferenceLine
                yAxisId="tempAxis"
                y={2.0}
                stroke="#3B82F6"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: 'Safe Min (2.0°C)',
                  fill: '#3B82F6',
                  fontSize: 10,
                  position: 'insideBottomLeft',
                  fontWeight: 700,
                }}
              />

              {/* High Risk Threshold (60/100) */}
              <ReferenceLine
                yAxisId="riskAxis"
                y={60}
                stroke="#F97316"
                strokeDasharray="2 2"
                strokeWidth={1}
                label={{
                  value: 'High Risk Threshold (60)',
                  fill: '#F97316',
                  fontSize: 9,
                  position: 'insideTopRight',
                }}
              />

              {/* Custom Tooltip */}
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as HistoricalTrendPoint;
                    return (
                      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-2 max-w-xs">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                          <span className="font-bold text-cyan-400 font-mono">{data.time}</span>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                            style={{
                              backgroundColor: `${d3RiskColor(data.predictedRiskScore)}25`,
                              color: d3RiskColor(data.predictedRiskScore),
                            }}
                          >
                            {data.riskLevel} RISK
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Cargo Temperature:</span>
                            <span className={`font-mono font-bold ${data.isExcursion ? 'text-red-400 font-black' : 'text-white'}`}>
                              {data.temperature.toFixed(1)}°C
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-400">Predicted Spoilage Risk:</span>
                            <span className="font-mono font-bold" style={{ color: d3RiskColor(data.predictedRiskScore) }}>
                              {data.predictedRiskScore} / 100
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-400">Ambient Outside:</span>
                            <span className="font-mono text-slate-300">{data.ambientTemperature.toFixed(1)}°C</span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-400">Predicted Excursion:</span>
                            <span className="font-mono text-amber-300">
                              {data.isExcursion ? 'Breached (0 min)' : `${data.predictedExcursionMinutes} min`}
                            </span>
                          </div>
                        </div>

                        <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400">
                          <span className="text-slate-500 block">Waypoint: {data.location}</span>
                          <span className="text-cyan-300 block mt-0.5 font-medium leading-tight">
                            AI Action: {data.recommendation}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Area for Predicted Spoilage Risk */}
              {showRiskArea && (
                <Area
                  yAxisId="riskAxis"
                  type="monotone"
                  dataKey="predictedRiskScore"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fill="url(#riskGradient)"
                  name="Predicted Risk Score (0-100)"
                />
              )}

              {/* Area for Cargo Temperature */}
              <Area
                yAxisId="tempAxis"
                type="monotone"
                dataKey="temperature"
                stroke="#2563EB"
                strokeWidth={3}
                fill="url(#tempGradient)"
                dot={{ r: 4, strokeWidth: 2, stroke: '#FFFFFF', fill: '#2563EB' }}
                activeDot={{ r: 7 }}
                name="Cargo Temperature (°C)"
              />

              {/* Line for Ambient Outside Temp */}
              {showAmbient && (
                <Line
                  yAxisId="tempAxis"
                  type="monotone"
                  dataKey="ambientTemperature"
                  stroke="#94A3B8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Ambient Temp (°C)"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Interactive Legend & Risk Band Visualizer */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        
        {/* Visual Legend Toggles */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-1.5 rounded-full bg-blue-600 inline-block" />
            <span className="font-semibold text-slate-800">Cargo Temp (Left Axis)</span>
          </div>

          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showRiskArea}
              onChange={(e) => setShowRiskArea(e.target.checked)}
              className="rounded text-red-600 focus:ring-0"
            />
            <span className="w-3.5 h-1.5 rounded-full bg-red-500 inline-block" />
            <span className="font-semibold text-red-700">Predicted Risk 0-100 (Right Axis)</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showAmbient}
              onChange={(e) => setShowAmbient(e.target.checked)}
              className="rounded text-slate-400 focus:ring-0"
            />
            <span className="w-3.5 h-0.5 bg-slate-400 border-t border-dashed border-slate-500 inline-block" />
            <span>Ambient Exposure</span>
          </label>

          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
            <span>WHO Safe Band (2-8°C)</span>
          </div>
        </div>

        {/* Risk Categories Scale Bar */}
        <div className="flex items-center space-x-2 font-mono text-[10px]">
          <span className="text-slate-400 font-sans">Risk Scale:</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">0-30 LOW</span>
          <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 font-bold">31-60 MOD</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">61-80 HIGH</span>
          <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold">81-100 CRIT</span>
        </div>

      </div>

    </div>
  );
};
