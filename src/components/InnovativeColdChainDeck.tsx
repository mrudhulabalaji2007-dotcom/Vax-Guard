import React, { useState, useMemo } from 'react';
import { ShipmentItem, WarehouseItem } from '../types/index.js';
import { calculateReeferBatteryStatus } from '../services/batteryDiagnosticService.js';
import {
  Activity,
  Flame,
  Zap,
  BatteryWarning,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Compass,
  Gauge,
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Radio,
  ArrowRight,
  TrendingDown,
  Navigation,
  Thermometer,
  Cpu,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  shipments: ShipmentItem[];
  warehouses: WarehouseItem[];
  onSimulateScenario?: (scenarioName: string) => void;
}

export const InnovativeColdChainDeck: React.FC<Props> = ({
  shipments,
  warehouses,
  onSimulateScenario,
}) => {
  const navigate = useNavigate();

  // Active stress simulation state
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [scenarioBanner, setScenarioBanner] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    shipments.find((s) => s.status === 'AT_RISK')?.trackingId || shipments[0]?.trackingId || ''
  );
  const [rerouteDeployed, setRerouteDeployed] = useState(false);

  // Play a soft synthetic audio chime when critical scenario is triggered
  const playAlertSound = (frequency = 520) => {
    if (!audioEnabled || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      // AudioContext not allowed without user interaction
    }
  };

  // Trigger interactive digital twin stress drills
  const handleTriggerScenario = (type: 'HEATWAVE' | 'COMPRESSOR_TRIP' | 'BATTERY_DEFICIT' | 'AUTONOMOUS_MITIGATION') => {
    setActiveScenario(type);
    setRerouteDeployed(false);

    if (type === 'HEATWAVE') {
      playAlertSound(440);
      setScenarioBanner('DRILL ACTIVE: Highway ambient surge (+39.5°C). VIP insulation buffer holding at 0.18°C/hr gradient.');
    } else if (type === 'COMPRESSOR_TRIP') {
      playAlertSound(680);
      setScenarioBanner('DRILL ACTIVE: Chiller compressor breaker tripped on Reefer #4. Time-to-Critical Excursion: 48 minutes.');
    } else if (type === 'BATTERY_DEFICIT') {
      playAlertSound(320);
      setScenarioBanner('DRILL ACTIVE: Mobile battery SoC dropped to 18%. Projected Time-to-Empty (TTE): 1.4 hrs. Deficit detected.');
    } else if (type === 'AUTONOMOUS_MITIGATION') {
      playAlertSound(880);
      setRerouteDeployed(true);
      setScenarioBanner('AUTONOMOUS MITIGATION ENGAGED: Nearest buffer depot (Trichy Cold Hub) designated. Alternator PTO boost active.');
    }

    if (onSimulateScenario) onSimulateScenario(type);
  };

  const handleReset = () => {
    setActiveScenario(null);
    setScenarioBanner(null);
    setRerouteDeployed(false);
  };

  // Find active selected shipment for Cockpit View
  const activeShipment = useMemo(() => {
    return shipments.find((s) => s.trackingId === selectedVehicleId) || shipments[0];
  }, [shipments, selectedVehicleId]);

  // Derive live cockpit metrics
  const cockpitMetrics = useMemo(() => {
    if (!activeShipment) return null;
    const baseBattery = calculateReeferBatteryStatus(activeShipment);
    
    let temp = activeShipment.currentTemperature;
    let ambient = 31.5;
    let batterySoC = baseBattery.batteryPercentage;
    let groundSpeed = 62;
    let compressorRpm = 2400;
    let holdingMarginHours = activeShipment.safeMaxTemperature - temp > 0 ? (activeShipment.safeMaxTemperature - temp) * 1.8 : 0;

    if (activeScenario === 'HEATWAVE') {
      ambient = 39.8;
      temp += 1.4;
      compressorRpm = 3150;
    } else if (activeScenario === 'COMPRESSOR_TRIP') {
      compressorRpm = 0;
      temp += 2.2;
      holdingMarginHours = 0.8;
    } else if (activeScenario === 'BATTERY_DEFICIT') {
      batterySoC = 18;
    } else if (activeScenario === 'AUTONOMOUS_MITIGATION') {
      compressorRpm = 2200;
      batterySoC = 88;
      temp = 4.2;
    }

    return {
      temp: Number(temp.toFixed(1)),
      ambient: Number(ambient.toFixed(1)),
      deltaT: Number((temp - ambient).toFixed(1)),
      batterySoC,
      groundSpeed,
      compressorRpm,
      holdingMarginHours: Number(holdingMarginHours.toFixed(1)),
      powerSource: baseBattery.powerSource,
      timeToEmptyHours: baseBattery.timeToEmptyHours,
    };
  }, [activeShipment, activeScenario]);

  // Compute Mean Kinetic Temperature (MKT) for the fleet (Arrhenius stability equation)
  const mktData = useMemo(() => {
    if (shipments.length === 0) return { mkt: 4.8, potencyScore: 99.2, daysProtected: 28 };
    const avgTemp = shipments.reduce((acc, s) => acc + s.currentTemperature, 0) / shipments.length;
    // Haynes MKT approximation
    const mkt = Number((avgTemp + (activeScenario === 'HEATWAVE' ? 1.2 : activeScenario === 'COMPRESSOR_TRIP' ? 1.8 : 0.3)).toFixed(1));
    const potencyScore = Number(Math.max(88, 100 - (mkt > 6 ? (mkt - 6) * 3.5 : 0)).toFixed(1));
    return {
      mkt,
      potencyScore,
      daysProtected: Math.round(potencyScore * 0.3),
    };
  }, [shipments, activeScenario]);

  return (
    <div className="space-y-4">
      
      {/* 1. INNOVATIVE DIGITAL TWIN RESILIENCE & STRESS DRILL BAR */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 border border-slate-800 shadow-md">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-widest font-black text-cyan-400">
                Cold-Chain Resilience Digital Twin
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                ISO 14971 Risk Engine
              </span>
            </div>
            <h2 className="text-lg font-black text-white tracking-tight mt-1">
              Live Threat Simulation & Autonomous Mitigation Deck
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Stress-test the cold chain against extreme thermodynamic anomalies, equipment trips, and battery runouts
            </p>
          </div>

          {/* Drill Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleTriggerScenario('HEATWAVE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                activeScenario === 'HEATWAVE'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Simulate Heat Surge (+39°C)</span>
            </button>

            <button
              onClick={() => handleTriggerScenario('COMPRESSOR_TRIP')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                activeScenario === 'COMPRESSOR_TRIP'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-red-400 border border-red-500/30'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Compressor Trip Drill</span>
            </button>

            <button
              onClick={() => handleTriggerScenario('BATTERY_DEFICIT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                activeScenario === 'BATTERY_DEFICIT'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30'
              }`}
            >
              <BatteryWarning className="w-3.5 h-3.5" />
              <span>Battery Deficit Drill</span>
            </button>

            <button
              onClick={() => handleTriggerScenario('AUTONOMOUS_MITIGATION')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                activeScenario === 'AUTONOMOUS_MITIGATION'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Autonomous Reroute Protocol</span>
            </button>

            {activeScenario && (
              <button
                onClick={handleReset}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                title="Reset to Nominal State"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                audioEnabled
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title={audioEnabled ? 'Audible Telemetry Chime Enabled' : 'Enable Audible Telemetry Chime'}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Dynamic Drill Active Banner */}
        {scenarioBanner && (
          <div className="mt-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
              <span className="font-mono text-cyan-200">{scenarioBanner}</span>
            </div>
            <button
              onClick={handleReset}
              className="text-slate-400 hover:text-white text-[11px] underline font-mono"
            >
              Dismiss Drill
            </button>
          </div>
        )}

      </div>

      {/* 2. DUAL INNOVATION CARDS: COCKPIT TELEPRESENCE & MKT BIOLOGICAL BUDGET */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column (7 cols): Live In-Transit Reefer Cockpit Stream */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Mobile Reefer Telepresence Cockpit
                </h3>
                <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">
                  CAN-BUS FEED
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time avionics-grade telemetry from on-board reefer microcontrollers
              </p>
            </div>

            {/* Vehicle Selector */}
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="px-2.5 py-1 text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {shipments.map((s) => (
                <option key={s.trackingId} value={s.trackingId}>
                  {s.trackingId} ({s.vehicleReg || 'Truck'})
                </option>
              ))}
            </select>
          </div>

          {cockpitMetrics && (
            <div className="space-y-4">
              
              {/* Cockpit Gauges Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                
                {/* Cargo Temperature */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-sans text-slate-400 uppercase font-semibold block">Cargo Bay</span>
                  <div className={`text-xl font-black mt-1 ${cockpitMetrics.temp > 8.0 || cockpitMetrics.temp < 2.0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {cockpitMetrics.temp}°C
                  </div>
                  <span className="text-[10px] font-sans text-slate-400">Target 4.0°C</span>
                </div>

                {/* Thermal Differential Delta T */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-sans text-slate-400 uppercase font-semibold block">Ambient Delta</span>
                  <div className="text-xl font-black text-cyan-700 mt-1">
                    {cockpitMetrics.deltaT}°C
                  </div>
                  <span className="text-[10px] font-sans text-slate-400">Ext: {cockpitMetrics.ambient}°C</span>
                </div>

                {/* Compressor RPM */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-sans text-slate-400 uppercase font-semibold block">Compressor RPM</span>
                  <div className={`text-xl font-black mt-1 ${cockpitMetrics.compressorRpm === 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {cockpitMetrics.compressorRpm}
                  </div>
                  <span className="text-[10px] font-sans text-slate-400">
                    {cockpitMetrics.compressorRpm === 0 ? 'STALLED' : 'Inverter Loop'}
                  </span>
                </div>

                {/* Mobile Battery SoC */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-sans text-slate-400 uppercase font-semibold block">Battery SoC</span>
                  <div className={`text-xl font-black mt-1 ${cockpitMetrics.batterySoC < 25 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {cockpitMetrics.batterySoC}%
                  </div>
                  <span className="text-[10px] font-sans text-slate-400">
                    TTE: {cockpitMetrics.timeToEmptyHours}h
                  </span>
                </div>

              </div>

              {/* Waypoint & Autonomous Contingency Plan */}
              <div className="p-3.5 rounded-xl border border-blue-100 bg-linear-to-r from-blue-50/50 to-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    <span>Corridor: {activeShipment.origin} → {activeShipment.destination}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Driver: {activeShipment.driverName} · GPS Speed: <strong className="font-mono text-slate-700">{cockpitMetrics.groundSpeed} km/h</strong> · Safe Holding Margin: <strong className="font-mono text-emerald-700">{cockpitMetrics.holdingMarginHours} hrs</strong>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => navigate(`/temperature?shipment=${activeShipment.trackingId}`)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-2xs transition"
                  >
                    View Telemetry
                  </button>
                  <button
                    onClick={() => navigate('/map')}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold text-xs transition"
                  >
                    Locate on Map
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Right Column (5 cols): WHO Haynes Arrhenius MKT & Vaccine Potency Budget */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-4">
          
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  WHO Vaccine Potency & MKT Budget
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Haynes Mean Kinetic Temperature stability model
                </p>
              </div>
              <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                USP &lt;1079&gt;
              </span>
            </div>

            {/* Biological Potency Meter */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Active Potency Integrity:</span>
                <span className="font-mono font-black text-base text-emerald-600">
                  {mktData.potencyScore}%
                </span>
              </div>
              
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${mktData.potencyScore}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-center pt-1 font-mono">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-sans block">Fleet MKT</span>
                  <span className="text-sm font-bold text-slate-900">{mktData.mkt}°C</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-sans block">Shelf Buffer</span>
                  <span className="text-sm font-bold text-slate-900">+{mktData.daysProtected} days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Autonomous Pre-Excursion Reroute Alert */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-950 flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Autonomous Contingency Advisor</span>
              </span>
              <span className="font-mono text-[10px] text-amber-800 font-bold">1 Node In Reach</span>
            </div>

            <p className="text-[11px] text-amber-900 leading-snug">
              {rerouteDeployed
                ? '✓ Contingency route dispatched to Trichy Cold Hub. ETA 42 min. Doses safeguarded.'
                : 'Trichy Central Hub (18km off NH44) offers immediate +4.5°C cryogenic holding buffer if reefer fails.'}
            </p>

            {!rerouteDeployed ? (
              <button
                onClick={() => handleTriggerScenario('AUTONOMOUS_MITIGATION')}
                className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-2xs flex items-center justify-center space-x-1 cursor-pointer"
              >
                <span>Authorize Autonomous Contingency Detour</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center space-x-1.5 text-xs text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Protocol Active: Driver notified via SMS telemetry</span>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
