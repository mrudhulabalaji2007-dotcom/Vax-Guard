import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { ShipmentItem, TemperatureLogItem, PredictiveRiskResult } from '../types/index.js';
import {
  ThermometerSnowflake,
  Plus,
  TrendingUp,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Zap,
  Activity,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';

export const TemperatureMonitoring: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [selectedTrackingId, setSelectedTrackingId] = useState<string>('');
  const [selectedShipment, setSelectedShipment] = useState<ShipmentItem | null>(null);
  const [logs, setLogs] = useState<TemperatureLogItem[]>([]);
  const [risk, setRisk] = useState<PredictiveRiskResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Add Reading Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newTempInput, setNewTempInput] = useState<number>(5.5);
  const [locationInput, setLocationInput] = useState<string>('Highway Checkpoint');
  const [ambientInput, setAmbientInput] = useState<number>(33.0);
  const [modalFeedback, setModalFeedback] = useState<string>('');

  // Simulation step counter
  const [simStep, setSimStep] = useState(1);

  // Load all shipments
  useEffect(() => {
    async function loadShipmentsList() {
      try {
        const res = await api.getShipments();
        setShipments(res.shipments);
        
        const queryShipment = searchParams.get('shipment');
        if (queryShipment) {
          setSelectedTrackingId(queryShipment);
        } else if (res.shipments.length > 0) {
          // Default to TRK-VAX-1005 if present or first shipment
          const defaultShipment = res.shipments.find((s) => s.trackingId === 'TRK-VAX-1005') || res.shipments[0];
          setSelectedTrackingId(defaultShipment.trackingId);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadShipmentsList();
  }, []);

  // Fetch telemetry for selected shipment
  const fetchShipmentTelemetry = async (trackingId: string) => {
    if (!trackingId) return;
    try {
      setActionLoading(true);
      const res = await api.getShipmentById(trackingId);
      setSelectedShipment(res.shipment);
      setLogs(res.temperatureLogs);
      setRisk(res.riskAnalysis);
      setNewTempInput(res.shipment.currentTemperature);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTrackingId) {
      setSearchParams({ shipment: selectedTrackingId });
      fetchShipmentTelemetry(selectedTrackingId);
    }
  }, [selectedTrackingId]);

  // BUTTON ACTION 1: ADD TEMPERATURE READING
  const handleAddReadingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;
    try {
      setActionLoading(true);
      const res = await api.addTemperatureReading({
        shipmentId: selectedShipment._id,
        temperature: Number(newTempInput),
        ambientTemperature: Number(ambientInput),
        location: locationInput,
      });

      setSelectedShipment(res.shipment);
      setRisk(res.riskAnalysis);
      setModalFeedback('Reading recorded in MongoDB & risk recalculated!');
      await fetchShipmentTelemetry(selectedShipment.trackingId);

      setTimeout(() => {
        setAddModalOpen(false);
        setModalFeedback('');
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Error adding reading');
    } finally {
      setActionLoading(false);
    }
  };

  // BUTTON ACTION 2: SIMULATE TEMPERATURE RISE
  const handleSimulateRise = async () => {
    if (!selectedShipment) return;
    try {
      setActionLoading(true);
      const nextStep = simStep + 1;
      setSimStep(nextStep);
      
      const res = await api.simulateTemperatureRise({
        shipmentId: selectedShipment._id,
        delta: 0.85,
        step: nextStep,
      });

      setSelectedShipment(res.shipment);
      setRisk(res.riskAnalysis);
      await fetchShipmentTelemetry(selectedShipment.trackingId);
    } catch (err: any) {
      alert(err.message || 'Error running simulation');
    } finally {
      setActionLoading(false);
    }
  };

  // BUTTON ACTION 3: ANALYZE RISK (Rule-Based Engine)
  const handleAnalyzeRisk = async () => {
    if (!selectedShipment) return;
    try {
      setActionLoading(true);
      const res = await api.analyzeRisk({
        shipmentId: selectedShipment._id,
        currentTemperature: selectedShipment.currentTemperature,
        safeMinTemperature: selectedShipment.safeMinTemperature,
        safeMaxTemperature: selectedShipment.safeMaxTemperature,
        remainingTravelTime: selectedShipment.remainingTravelTime,
      });
      setRisk(res.analysis);
      if (res.shipment) {
        setSelectedShipment(res.shipment);
      }
    } catch (err: any) {
      alert(err.message || 'Error executing risk engine');
    } finally {
      setActionLoading(false);
    }
  };

  const chartData = logs.map((log) => ({
    time: new Date(log.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    temperature: log.temperature,
    ambient: log.ambientTemperature,
    location: log.location,
    source: log.source,
    safeMin: selectedShipment?.safeMinTemperature || 2.0,
    safeMax: selectedShipment?.safeMaxTemperature || 8.0,
  }));

  const isExcursion = selectedShipment
    ? selectedShipment.currentTemperature > selectedShipment.safeMaxTemperature || selectedShipment.currentTemperature < selectedShipment.safeMinTemperature
    : false;

  return (
    <div className="space-y-6">
      
      {/* Top Controls Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <ThermometerSnowflake className="w-6 h-6 text-cyan-600" />
            <span>Interactive Temperature Telemetry & Risk Monitor</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time thermal sensor stream, predictive excursion projection, and corrective action engine
          </p>
        </div>

        {/* Shipment Selector Dropdown */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0">
            Select Shipment:
          </label>
          <select
            value={selectedTrackingId}
            onChange={(e) => setSelectedTrackingId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
          >
            {shipments.map((s) => (
              <option key={s._id} value={s.trackingId}>
                {s.trackingId} — {s.vaccineName} ({s.currentTemperature}°C)
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedShipment && (
        <>
          {/* PRIMARY METRICS BAR */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Current Temp</div>
              <div className={`text-2xl font-black font-mono mt-1 ${isExcursion ? 'text-red-600' : 'text-blue-700'}`}>
                {selectedShipment.currentTemperature.toFixed(1)}°C
              </div>
              <div className="text-[10px] text-slate-500">Live IoT sensor</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Safe Min / Max</div>
              <div className="text-lg font-black font-mono text-emerald-700 mt-1">
                {selectedShipment.safeMinTemperature}°C – {selectedShipment.safeMaxTemperature}°C
              </div>
              <div className="text-[10px] text-emerald-600 font-medium">Standard WHO Band</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Thermal Trend</div>
              <div className="text-xs font-bold text-slate-800 font-mono mt-2 flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>{risk?.temperatureTrend?.replace('_', ' ') || 'STABLE'}</span>
              </div>
              <div className="text-[10px] text-slate-500">{risk?.rateOfChangePerHour || 0}°C / hr</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Remaining Travel</div>
              <div className="text-xl font-black font-mono text-slate-900 mt-1">
                {selectedShipment.remainingTravelTime} <span className="text-xs font-normal text-slate-500">hrs</span>
              </div>
              <div className="text-[10px] text-slate-400">{selectedShipment.origin} ➔ {selectedShipment.destination}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Recorded Logs</div>
              <div className="text-xl font-black font-mono text-slate-900 mt-1">
                {logs.length}
              </div>
              <div className="text-[10px] text-slate-400">Stored in MongoDB</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Status</div>
              <div className="text-xs font-bold mt-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${isExcursion ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                  {selectedShipment.status}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Carrier TC-500</div>
            </div>

          </div>

          {/* THREE MANDATORY INTERACTION BUTTONS */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
              <div>
                <span className="font-bold text-sm">Cold-Chain Control Actions</span>
                <span className="text-xs text-slate-400 block sm:inline sm:ml-2">Execute telemetry updates & predictive simulations</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Button 1: ADD TEMPERATURE READING */}
              <button
                onClick={() => setAddModalOpen(true)}
                disabled={actionLoading}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ADD TEMPERATURE READING</span>
              </button>

              {/* Button 2: SIMULATE TEMPERATURE RISE */}
              <button
                onClick={handleSimulateRise}
                disabled={actionLoading}
                className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>SIMULATE TEMPERATURE RISE</span>
              </button>

              {/* Button 3: ANALYZE RISK */}
              <button
                onClick={handleAnalyzeRisk}
                disabled={actionLoading}
                className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ANALYZE RISK</span>
              </button>

            </div>
          </div>

          {/* TWO-COLUMN GRID: RECHARTS LINE CHART & PREDICTIVE RISK CARD */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Interactive Recharts Line Chart with Safe 2-8°C Zone */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Live Temperature Curve — {selectedShipment.trackingId}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedShipment.vaccineName} ({selectedShipment.batchNumber})
                  </p>
                </div>
                <div className="flex items-center space-x-3 text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-xs bg-emerald-400/40 border border-emerald-500" />
                    <span className="text-slate-600 font-medium">Safe Zone (2°C – 8°C)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-1 bg-blue-600" />
                    <span className="text-slate-600 font-medium">Cargo Temp</span>
                  </div>
                </div>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 15, right: 30, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 11]} tick={{ fontSize: 10 }} unit="°C" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                              <div className="font-bold text-cyan-400">{data.time}</div>
                              <div>Cargo: <span className="font-mono font-bold">{data.temperature}°C</span></div>
                              <div>Ambient: <span className="font-mono text-slate-400">{data.ambient}°C</span></div>
                              <div className="text-[10px] text-slate-400">{data.location}</div>
                              <div className="text-[10px] text-blue-300 uppercase">Source: {data.source}</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    {/* Green Safe Zone 2°C - 8°C */}
                    <ReferenceArea y1={2.0} y2={8.0} fill="#10B981" fillOpacity={0.12} />
                    <ReferenceLine y={8.0} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Upper Limit: 8°C', fill: '#EF4444', fontSize: 10, position: 'insideTopRight' }} />
                    <ReferenceLine y={2.0} stroke="#3B82F6" strokeDasharray="3 3" label={{ value: 'Lower Limit: 2°C', fill: '#3B82F6', fontSize: 10, position: 'insideBottomRight' }} />

                    <Line
                      type="monotone"
                      dataKey="temperature"
                      stroke="#2563EB"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 2 }}
                      activeDot={{ r: 7 }}
                      name="Temperature"
                    />
                    <Line
                      type="monotone"
                      dataKey="ambient"
                      stroke="#94A3B8"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Ambient Temp"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Safe Range Visual Gauge */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono font-bold text-blue-700">2.0°C Safe Min</span>
                <div className="flex-1 mx-4 h-2 rounded-full bg-slate-100 overflow-hidden relative">
                  <div className="absolute inset-y-0 left-1/4 right-1/4 bg-emerald-400 rounded-full opacity-60"></div>
                  <div
                    className="absolute top-0 bottom-0 w-3 bg-blue-600 rounded-full shadow-xs -translate-x-1/2 transition-all"
                    style={{
                      left: `${Math.min(100, Math.max(0, ((selectedShipment.currentTemperature) / 10) * 100))}%`,
                    }}
                  />
                </div>
                <span className="font-mono font-bold text-red-600">8.0°C Safe Max</span>
              </div>
            </div>

            {/* Right Col: UNIQUE FEATURE #1 - PREDICTIVE COLD-CHAIN ANALYSIS CARD */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      PREDICTIVE COLD-CHAIN ANALYSIS
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Rule-Engine</span>
                </div>

                {/* Example UI Matching User Specification */}
                <div className="mt-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Shipment:</span>
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {selectedShipment.trackingId}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Current Temperature:</span>
                    <span className={`text-base font-black font-mono ${isExcursion ? 'text-red-600' : 'text-slate-900'}`}>
                      {selectedShipment.currentTemperature.toFixed(1)}°C
                    </span>
                  </div>

                  {/* Risk Score */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Risk Score</div>
                      <div className={`text-2xl font-black font-mono ${
                        (risk?.riskScore || 0) >= 81 ? 'text-red-600' :
                        (risk?.riskScore || 0) >= 61 ? 'text-amber-600' :
                        (risk?.riskScore || 0) >= 31 ? 'text-yellow-600' :
                        'text-emerald-600'
                      }`}>
                        {risk?.riskScore || selectedShipment.riskScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {risk?.riskLevel === 'CRITICAL' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 animate-pulse inline-block">
                          🔴 CRITICAL
                        </span>
                      ) : risk?.riskLevel === 'HIGH' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-block">
                          🟠 HIGH
                        </span>
                      ) : risk?.riskLevel === 'MODERATE' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200 inline-block">
                          🟡 MODERATE
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block">
                          🟢 LOW
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Predicted Excursion */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 text-xs">
                    <span className="text-slate-500 font-medium">Predicted excursion:</span>
                    <span className="font-mono font-black text-slate-900">
                      {isExcursion
                        ? '0 min (Active Excursion)'
                        : (risk?.predictedExcursionMinutes || 0) > 0
                        ? `${risk?.predictedExcursionMinutes} minutes`
                        : 'Safe (> 180 min)'}
                    </span>
                  </div>

                  {/* Recommended Action */}
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                    <div className="text-[11px] font-bold text-blue-950 uppercase tracking-wider flex items-center space-x-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
                      <span>Recommended Action:</span>
                    </div>
                    <p className="text-xs text-blue-900 font-semibold leading-relaxed">
                      {risk?.recommendedAction || selectedShipment.recommendedAction}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action trigger button */}
              <button
                onClick={() => navigate(`/routes?shipment=${selectedShipment.trackingId}`)}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition mt-4"
              >
                <span>Evaluate Cold-Chain Routes</span>
                <ArrowRight className="w-4 h-4 text-cyan-400" />
              </button>
            </div>

          </div>

          {/* TELEMETRY READINGS AUDIT LOG TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Telemetry Sensor Log History (MongoDB)</h3>
              <span className="text-xs text-slate-500">{logs.length} readings stored</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Location Waypoint</th>
                    <th className="py-2.5 px-3">Cargo Temp</th>
                    <th className="py-2.5 px-3">Ambient Temp</th>
                    <th className="py-2.5 px-3">Source</th>
                    <th className="py-2.5 px-3">Thermal Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.slice().reverse().map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-slate-600">
                        {new Date(log.recordedAt).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800">{log.location}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{log.temperature.toFixed(1)}°C</td>
                      <td className="py-2 px-3 font-mono text-slate-500">{log.ambientTemperature.toFixed(1)}°C</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700">
                          {log.source}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {log.isExcursion ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                            EXCURSION
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            SAFE (2-8°C)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ADD TEMPERATURE READING MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Sensor Temperature Reading</h3>
              <button onClick={() => setAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalFeedback && (
              <div className="mt-3 p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{modalFeedback}</span>
              </div>
            )}

            <form onSubmit={handleAddReadingSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Temperature (°C) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newTempInput}
                  onChange={(e) => setNewTempInput(parseFloat(e.target.value) || 0)}
                  placeholder="5.2"
                  className="mt-1 w-full p-2.5 font-mono font-bold text-lg text-blue-700 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Location / Waypoint *
                </label>
                <input
                  type="text"
                  required
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="e.g. Villupuram Cold Hub Gate (KM 160)"
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Ambient Outside Temp (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={ambientInput}
                  onChange={(e) => setAmbientInput(parseFloat(e.target.value) || 30)}
                  placeholder="33.0"
                  className="mt-1 w-full p-2.5 font-mono border border-slate-300 rounded-xl bg-white"
                />
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
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {actionLoading ? 'Saving...' : 'Save & Trigger Risk Engine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
