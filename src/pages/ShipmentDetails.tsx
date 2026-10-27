import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { ShipmentItem, TemperatureLogItem, PredictiveRiskResult } from '../types/index.js';
import {
  Truck,
  ArrowLeft,
  Thermometer,
  ShieldAlert,
  Clock,
  MapPin,
  User,
  Phone,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  Route as RouteIcon,
  RefreshCw,
  Sparkles,
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
import { RealtimeShipmentMap } from '../components/RealtimeShipmentMap.js';

export const ShipmentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isHospitalReceiver, isAdmin } = useAuth();

  const [shipment, setShipment] = useState<ShipmentItem | null>(null);
  const [logs, setLogs] = useState<TemperatureLogItem[]>([]);
  const [risk, setRisk] = useState<PredictiveRiskResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Hospital Receiving Action Modal/State
  const [receivingModalOpen, setReceivingModalOpen] = useState(false);
  const [receiveAction, setReceiveAction] = useState<'ACCEPT' | 'FLAG'>('ACCEPT');
  const [receivingNotes, setReceivingNotes] = useState('');
  const [verifiedTemp, setVerifiedTemp] = useState<number>(5.2);
  const [processingReceive, setProcessingReceive] = useState(false);
  const [receiveFeedback, setReceiveFeedback] = useState('');

  const fetchDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.getShipmentById(id);
      setShipment(res.shipment);
      setLogs(res.temperatureLogs);
      setRisk(res.riskAnalysis);
      setVerifiedTemp(res.shipment.currentTemperature);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipment) return;
    setProcessingReceive(true);
    try {
      const res = await api.receiveShipment(shipment._id, {
        action: receiveAction,
        receivingOfficer: user?.name,
        receivingNotes,
        verifiedTemperature: verifiedTemp,
      });
      setReceiveFeedback(res.message);
      await fetchDetails();
      setTimeout(() => {
        setReceivingModalOpen(false);
        setReceiveFeedback('');
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Error updating receiving status.');
    } finally {
      setProcessingReceive(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
        <p>Loading shipment telemetry from MongoDB...</p>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
        <p className="text-slate-600 font-bold">Shipment record not found.</p>
        <button
          onClick={() => navigate('/shipments')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          Back to Shipments
        </button>
      </div>
    );
  }

  const chartData = logs.map((log, index) => ({
    time: new Date(log.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    temp: log.temperature,
    ambient: log.ambientTemperature,
    location: log.location,
    index: index + 1,
  }));

  const isExcursion = shipment.currentTemperature > shipment.safeMaxTemperature || shipment.currentTemperature < shipment.safeMinTemperature;

  return (
    <div className="space-y-6">
      
      {/* Back Button & Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/shipments')}
          className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shipments</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate(`/temperature?shipment=${shipment.trackingId}`)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold rounded-xl"
          >
            <Thermometer className="w-4 h-4 text-cyan-600" />
            <span>Interactive Telemetry</span>
          </button>
          <button
            onClick={() => navigate(`/routes?shipment=${shipment.trackingId}`)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-xl"
          >
            <RouteIcon className="w-4 h-4 text-blue-600" />
            <span>Route Evaluation</span>
          </button>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <span className="text-2xl font-black font-mono text-blue-700">{shipment.trackingId}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              shipment.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse' :
              shipment.riskLevel === 'HIGH' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
              shipment.riskLevel === 'MODERATE' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
              'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              {shipment.riskLevel} RISK
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
              {shipment.status}
            </span>
          </div>

          <h2 className="text-lg font-bold text-slate-900 mt-1">
            {shipment.vaccineName}
          </h2>
          <p className="text-xs text-slate-500 font-mono">
            Lot: {shipment.batchNumber} • Quantity: {shipment.quantity.toLocaleString()} doses
          </p>
        </div>

        {/* Hospital Receiving CTA (Hospital Role or Admin) */}
        {(isHospitalReceiver || isAdmin) && (
          <div className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <div className="text-xs font-bold text-slate-800">Hospital Receiving Gate</div>
              <div className="text-[11px] text-slate-500">
                Status: <span className="font-semibold">{shipment.receivedStatus || 'PENDING'}</span>
              </div>
            </div>
            <button
              onClick={() => setReceivingModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
            >
              <FileCheck className="w-4 h-4" />
              <span>Verify & Accept / Flag</span>
            </button>
          </div>
        )}
      </div>

      {/* METRICS & PREDICTIVE RISK GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Col: Core Telemetry Specs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Thermal Specifications
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-slate-400">Current Temp</div>
              <div className={`text-2xl font-black font-mono ${isExcursion ? 'text-red-600' : 'text-blue-700'}`}>
                {shipment.currentTemperature.toFixed(1)}°C
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-emerald-800">Safe Thermal Band</div>
              <div className="text-lg font-black font-mono text-emerald-900 mt-1">
                {shipment.safeMinTemperature}°C – {shipment.safeMaxTemperature}°C
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-600 pt-2">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Route Origin:</span>
              <span className="font-semibold text-slate-800">{shipment.origin}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Destination:</span>
              <span className="font-semibold text-slate-800">{shipment.destination}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Remaining Transit:</span>
              <span className="font-semibold text-slate-800">{shipment.remainingTravelTime} hours</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Vehicle Carrier:</span>
              <span className="font-semibold text-slate-800">{shipment.vehicleReg}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Driver Contact:</span>
              <span className="font-semibold text-slate-800">{shipment.driverName} ({shipment.driverPhone})</span>
            </div>
          </div>
        </div>

        {/* Center/Right 2 Cols: DYNAMIC PREDICTIVE RISK ENGINE CARD */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Predictive Vaccine Spoilage Risk Engine</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
              Rule-Based Mathematical Model
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Score Display */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center flex flex-col justify-center">
              <div className="text-xs font-bold text-slate-500 uppercase">Risk Score</div>
              <div className={`text-4xl font-black font-mono my-1 ${
                (risk?.riskScore || 0) >= 81 ? 'text-red-600' :
                (risk?.riskScore || 0) >= 61 ? 'text-amber-600' :
                (risk?.riskScore || 0) >= 31 ? 'text-yellow-600' :
                'text-emerald-600'
              }`}>
                {risk?.riskScore || shipment.riskScore} <span className="text-sm text-slate-400">/ 100</span>
              </div>
              <div className="text-[11px] font-bold uppercase text-slate-600">
                {risk?.riskLevel || shipment.riskLevel}
              </div>
            </div>

            {/* Excursion Forecast */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center flex flex-col justify-center">
              <div className="text-xs font-bold text-slate-500 uppercase">Predicted Excursion</div>
              <div className="text-2xl font-black font-mono text-slate-900 my-1">
                {(risk?.predictedExcursionMinutes || 0) > 0 ? `${risk?.predictedExcursionMinutes} min` : 'Nominal (0 min)'}
              </div>
              <div className="text-[11px] text-slate-500">
                Rate: <span className="font-mono font-bold text-slate-700">{risk?.rateOfChangePerHour || 0}°C / hr</span>
              </div>
            </div>

            {/* Trend status */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center flex flex-col justify-center">
              <div className="text-xs font-bold text-slate-500 uppercase">Thermal Gradient</div>
              <div className="text-base font-bold text-blue-700 my-1 font-mono">
                {risk?.temperatureTrend?.replace('_', ' ') || 'STABLE'}
              </div>
              <div className="text-[11px] text-slate-500">
                {risk?.isCurrentExcursion ? '⚠️ Actively Breached' : 'Within Tolerance'}
              </div>
            </div>

          </div>

          {/* Actionable Recommendation Box */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
            <div className="text-xs font-bold text-blue-950 flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Recommended Action:</span>
            </div>
            <p className="text-xs text-blue-900 font-medium leading-relaxed">
              {risk?.recommendedAction || shipment.recommendedAction}
            </p>
          </div>

        </div>

      </div>

      {/* LIVE GPS LEAFLET ROUTE TRACKING */}
      {shipment && (
        <RealtimeShipmentMap
          shipments={[shipment]}
          selectedShipmentId={shipment._id}
          singleShipmentMode={true}
          height="420px"
          showControls={true}
        />
      )}

      {/* INTERACTIVE TEMPERATURE LOGS CHART */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Historical Thermal Sensor Telemetry</h3>
            <p className="text-xs text-slate-500">Continuous in-transit data logger readings</p>
          </div>
          <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Safe Target: 2.0°C – 8.0°C
          </span>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} unit="°C" />
              <Tooltip />
              
              {/* Highlight Safe Zone (2°C - 8°C) */}
              <ReferenceArea y1={2.0} y2={8.0} fill="#10B981" fillOpacity={0.08} />
              <ReferenceLine y={8.0} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Safe Max (8°C)', fill: '#EF4444', fontSize: 10 }} />
              <ReferenceLine y={2.0} stroke="#3B82F6" strokeDasharray="3 3" label={{ value: 'Safe Min (2°C)', fill: '#3B82F6', fontSize: 10 }} />

              <Line type="monotone" dataKey="temp" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} name="Cargo Temp (°C)" />
              <Line type="monotone" dataKey="ambient" stroke="#94A3B8" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Ambient (°C)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* HOSPITAL RECEIVING MODAL */}
      {receivingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Hospital Receiving Verification</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirm physical receipt, inspect temperature integrity, and record clinical handoff
            </p>

            {receiveFeedback && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-semibold">
                {receiveFeedback}
              </div>
            )}

            <form onSubmit={handleReceiveSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Receiving Action *
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setReceiveAction('ACCEPT')}
                    className={`p-3 rounded-xl border text-center font-bold transition ${
                      receiveAction === 'ACCEPT'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    ✓ ACCEPT & STORE
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiveAction('FLAG')}
                    className={`p-3 rounded-xl border text-center font-bold transition ${
                      receiveAction === 'FLAG'
                        ? 'bg-red-50 border-red-500 text-red-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    ⚠️ FLAG FOR AUDIT
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Verified Dock Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={verifiedTemp}
                  onChange={(e) => setVerifiedTemp(parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full p-2.5 font-mono font-bold text-slate-900 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Receiving & Inspection Notes
                </label>
                <textarea
                  rows={3}
                  value={receivingNotes}
                  onChange={(e) => setReceivingNotes(e.target.value)}
                  placeholder="e.g., Physical vials intact. VVM (Vaccine Vial Monitor) stage 1 normal. Transferred to ILR Unit 3."
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReceivingModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingReceive}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {processingReceive ? 'Recording in MongoDB...' : 'Confirm Receiving'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
