import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  ShipmentItem,
  AlertItem,
  WarehouseItem,
  DashboardStats,
} from '../types/index.js';
import {
  Truck,
  Boxes,
  AlertTriangle,
  BellRing,
  Building2,
  HeartPulse,
  Plus,
  ThermometerSnowflake,
  Route as RouteIcon,
  Zap,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  ArrowDownUp,
  Search,
  Activity,
  Layers,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { HistoricalTempVsRiskChart } from '../components/HistoricalTempVsRiskChart.js';
import { RealtimeShipmentMap } from '../components/RealtimeShipmentMap.js';
import { PredictiveEquipmentRiskCard } from '../components/PredictiveEquipmentRiskCard.js';
import { InnovativeColdChainDeck } from '../components/InnovativeColdChainDeck.js';
import { FloatingQuickActions } from '../components/FloatingQuickActions.js';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterRiskOnly, setFilterRiskOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframe, setTimeframe] = useState<'1H' | '24H' | '1W' | '1M' | 'ALL'>('24H');
  
  // Rapid Cold-Chain Intervention Swap State
  const [swapShipmentId, setSwapShipmentId] = useState<string>('');
  const [swapTargetWarehouse, setSwapTargetWarehouse] = useState<string>('');
  const [swapInterventionType, setSwapInterventionType] = useState<string>('REROUTE_DEPOT');
  const [swapSuccessMessage, setSwapSuccessMessage] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [summaryRes, shipmentsRes, warehousesRes, alertsRes] = await Promise.all([
        api.getSummaryReport(),
        api.getShipments(),
        api.getWarehouses(),
        api.getAlerts({ status: 'ACTIVE' }),
      ]);

      setStats(summaryRes.stats);
      setShipments(shipmentsRes.shipments);
      setWarehouses(warehousesRes.warehouses);
      setAlerts(alertsRes.alerts);

      // Pre-select first at-risk or first shipment for swap tool
      if (shipmentsRes.shipments.length > 0) {
        const atRisk = shipmentsRes.shipments.find(s => s.status === 'AT_RISK' || s.riskLevel === 'HIGH' || s.riskLevel === 'CRITICAL');
        setSwapShipmentId(atRisk ? atRisk.trackingId : shipmentsRes.shipments[0].trackingId);
      }
      if (warehousesRes.warehouses.length > 0) {
        setSwapTargetWarehouse(warehousesRes.warehouses[0].name);
      }
    } catch (err) {
      console.warn('Notice: Dashboard data sync notice:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAcknowledgeAlert = async (id: string) => {
    try {
      await api.acknowledgeAlert(id, user?.name);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveAlert = async (id: string) => {
    try {
      await api.resolveAlert(id, 'Resolved via Liquid Glass Terminal by ' + user?.name, user?.name);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteInterventionSwap = async () => {
    if (!swapShipmentId) return;
    setIsSwapping(true);
    setSwapSuccessMessage(null);
    try {
      // Simulate real intervention execution
      await new Promise(resolve => setTimeout(resolve, 800));
      setSwapSuccessMessage(`Intervention dispatched for ${swapShipmentId}! Transferred routing to ${swapTargetWarehouse || 'Chennai Hub'}. Re-cooling protocol activated.`);
      setTimeout(() => setSwapSuccessMessage(null), 7000);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSwapping(false);
    }
  };

  // Liquid neon chart series for the Cold-Chain Portfolio
  const portfolioChartData = [
    { time: '02:00', temp: 4.1, dosesSafeguarded: 172000, integrity: 99.2 },
    { time: '06:00', temp: 4.4, dosesSafeguarded: 178500, integrity: 99.4 },
    { time: '10:00', temp: 5.2, dosesSafeguarded: 181200, integrity: 98.8 },
    { time: '14:00', temp: 5.8, dosesSafeguarded: 185420, integrity: 99.1 },
    { time: '18:00', temp: 4.9, dosesSafeguarded: 185420, integrity: 99.5 },
    { time: '22:00', temp: 4.3, dosesSafeguarded: 185420, integrity: 99.7 },
  ];

  const RISK_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#7F1D1D'];
  const riskPieData = stats
    ? [
        { name: 'Low Risk', value: Math.max(1, shipments.filter((s) => s.riskLevel === 'LOW').length) },
        { name: 'Moderate', value: shipments.filter((s) => s.riskLevel === 'MODERATE').length },
        { name: 'High Risk', value: shipments.filter((s) => s.riskLevel === 'HIGH').length },
        { name: 'Critical', value: shipments.filter((s) => s.riskLevel === 'CRITICAL').length },
      ].filter((d) => d.value > 0)
    : [];

  const tempChartData = [
    { time: '08:00', temp: 4.2, safeMin: 2.0, safeMax: 8.0 },
    { time: '10:00', temp: 4.6, safeMin: 2.0, safeMax: 8.0 },
    { time: '12:00', temp: 5.1, safeMin: 2.0, safeMax: 8.0 },
    { time: '14:00', temp: 5.8, safeMin: 2.0, safeMax: 8.0 },
    { time: '16:00', temp: 5.2, safeMin: 2.0, safeMax: 8.0 },
    { time: '18:00', temp: 4.9, safeMin: 2.0, safeMax: 8.0 },
  ];

  const renderRiskIndicator = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold text-red-300 bg-red-500/15 px-2.5 py-1 rounded-full border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.3)]">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-full border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            HIGH RISK
          </span>
        );
      case 'MODERATE':
        return (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold text-yellow-300 bg-yellow-500/15 px-2.5 py-1 rounded-full border border-yellow-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            MODERATE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            SAFE
          </span>
        );
    }
  };

  const renderStatusIndicator = (status: string) => {
    switch (status) {
      case 'IN_TRANSIT':
        return (
          <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/15 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
            IN TRANSIT
          </span>
        );
      case 'AT_RISK':
        return (
          <span className="text-[10px] font-mono font-bold text-red-300 bg-red-500/20 px-2.5 py-0.5 rounded-full border border-red-500/50 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)]">
            AT RISK
          </span>
        );
      case 'DELIVERED':
      case 'ACCEPTED':
        return (
          <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            ACCEPTED
          </span>
        );
      case 'FLAGGED':
        return (
          <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
            FLAGGED
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono text-slate-300 bg-white/[0.06] px-2.5 py-0.5 rounded-full border border-white/10">
            {status}
          </span>
        );
    }
  };

  const filteredShipments = shipments.filter((s) => {
    const matchesRisk = filterRiskOnly ? (s.status === 'AT_RISK' || s.riskLevel === 'HIGH' || s.riskLevel === 'CRITICAL') : true;
    const matchesSearch = searchQuery === '' || 
      s.trackingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.vaccineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.destination.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRisk && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. CONTINUOUS CRYPTO-STYLE TELEMETRY TICKER TAPE (Apple Liquid Glass) */}
      <div className="relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] py-2.5">
        <div className="animate-ticker space-x-6 text-xs font-mono">
          {/* Loop items */}
          {[1, 2].map((loopIdx) => (
            <React.Fragment key={loopIdx}>
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                <span className="text-cyan-400 font-bold">COV-2</span>
                <span className="text-slate-300">Covishield</span>
                <span className="font-bold text-emerald-400">4.8°C</span>
                <span className="text-emerald-400 text-[10px]">▲+0.2°C</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">NOMINAL</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                <span className="text-amber-400 font-bold">ROTA-1</span>
                <span className="text-slate-300">Rotavirus</span>
                <span className="font-bold text-amber-400">7.4°C</span>
                <span className="text-red-400 text-[10px]">▲+0.8°C</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 animate-pulse">PRE-EXCURSION</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                <span className="text-indigo-400 font-bold">bOPV-3</span>
                <span className="text-slate-300">Polio Oral</span>
                <span className="font-bold text-cyan-300">-19.2°C</span>
                <span className="text-cyan-400 text-[10px]">▼-0.1°C</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">CRYOPRESERVED</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                <span className="text-purple-400 font-bold">BCG-22</span>
                <span className="text-slate-300">Tuberculosis</span>
                <span className="font-bold text-emerald-400">3.4°C</span>
                <span className="text-slate-400 text-[10px]">0.0°C</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">STABLE</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                <span className="text-emerald-400 font-bold">WH-DEL</span>
                <span className="text-slate-300">Delhi Central Hub</span>
                <span className="font-bold text-white">4.2°C</span>
                <span className="text-emerald-400 text-[10px]">⚡ 100% GRID</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                <span className="text-blue-400 font-bold">WH-MAA</span>
                <span className="text-slate-300">Chennai State Hub</span>
                <span className="font-bold text-white">4.9°C</span>
                <span className="text-emerald-400 text-[10px]">⚡ 100% SOLAR</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 2. TOP MISSION HEADER WITH SPECULAR RIM & ACTION CONTROLS */}
      <div className="apple-liquid-glass rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        {/* Ambient interior light flare */}
        <div className="absolute top-0 right-1/4 w-80 h-32 bg-cyan-500/10 blur-[50px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Cold-Chain Command Terminal
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)] uppercase tracking-wider">
              Apple Liquid Glass
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-2 flex flex-wrap items-center gap-2">
            <span>Terminal Operator:</span>
            <span className="font-semibold text-slate-200">{user?.name}</span>
            <span className="text-slate-600">·</span>
            <span className="text-cyan-400 font-mono">{user?.department || 'Cold Logistics'}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400 font-mono">STATION: DEL-CORRIDOR-HQ</span>
            <span className="text-slate-600">·</span>
            <span className="text-emerald-400 font-mono font-semibold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" />
              Mesh Active (2s Sync)
            </span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            onClick={() => navigate('/shipments')}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-2xl shadow-[0_0_24px_rgba(6,182,212,0.4)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)] transition duration-200 transform hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>New Consignment</span>
          </button>
          
          <button
            onClick={() => navigate('/temperature')}
            className="flex items-center space-x-2 px-3.5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-xs font-bold rounded-2xl border border-white/[0.12] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] transition backdrop-blur-xl"
          >
            <ThermometerSnowflake className="w-4 h-4 text-cyan-400" />
            <span>Telemetry Analyzer</span>
          </button>

          <button
            onClick={() => navigate('/routes')}
            className="flex items-center space-x-2 px-3.5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-xs font-bold rounded-2xl border border-white/[0.12] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] transition backdrop-blur-xl"
          >
            <RouteIcon className="w-4 h-4 text-indigo-400" />
            <span>Optimal Corridors</span>
          </button>

          <button
            onClick={fetchDashboardData}
            title="Refresh Live Data"
            className="p-2.5 rounded-2xl border border-white/[0.12] bg-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.1] transition backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. HERO CRYPTO-TRADING PORTFOLIO & INTERVENTION SWAP SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Glowing Portfolio Graph (Doses Safeguarded & Thermal Stability Curve) */}
        <div className="lg:col-span-2 apple-liquid-glass-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6 relative overflow-hidden">
          {/* Subtle radiant background glow behind chart */}
          <div className="absolute top-1/2 left-1/3 w-96 h-64 bg-cyan-500/10 blur-[90px] pointer-events-none" />

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  TOTAL PROTECTED VACCINE PORTFOLIO
                </span>
                <div className="flex items-baseline space-x-3 mt-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white text-glow-cyan">
                    {stats ? Number(stats.dosesInTransit).toLocaleString() : '185,420'}
                  </span>
                  <span className="text-sm font-mono text-cyan-300 font-bold">DOSES</span>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="inline-flex items-center text-xs font-mono font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    ▲ +2.4% 24h Stability
                  </span>
                  <span className="text-xs text-slate-400">
                    Valued at <span className="text-slate-200 font-semibold font-mono">₹4.25 Crore</span>
                  </span>
                </div>
              </div>

              {/* Timeframe pill selector */}
              <div className="flex items-center space-x-1 p-1 rounded-2xl bg-black/40 border border-white/[0.08] backdrop-blur-md self-start sm:self-auto">
                {(['1H', '24H', '1W', '1M', 'ALL'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xl transition duration-150 ${
                      timeframe === t
                        ? 'bg-gradient-to-r from-cyan-500/40 to-blue-500/30 text-white border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.3)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Glowing Recharts Area Graph */}
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioChartData}>
                <defs>
                  <linearGradient id="liquidCyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.45} />
                    <stop offset="60%" stopColor="#3b82f6" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#080d1a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  stroke="#475569" 
                  tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }} 
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#475569" 
                  domain={[3.5, 6.5]} 
                  tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }} 
                  unit="°C"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(12, 19, 36, 0.92)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                    color: '#f8fafc',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${value}°C`, 'Mean Thermal Reading']}
                />
                <Area 
                  type="monotone" 
                  dataKey="temp" 
                  stroke="#38bdf8" 
                  strokeWidth={3} 
                  fill="url(#liquidCyanGrad)"
                  dot={{ r: 4, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Live Quick Metrics Footnote Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/[0.08] text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 uppercase">Current Temp Avg</span>
              <div className="text-sm font-bold text-cyan-300">4.6°C</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase">Peak 24h Reading</span>
              <div className="text-sm font-bold text-amber-300">5.8°C</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase">SLA Cold Integrity</span>
              <div className="text-sm font-bold text-emerald-400">99.7%</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase">Active IoT Mesh</span>
              <div className="text-sm font-bold text-white">48 Transponders</div>
            </div>
          </div>
        </div>

        {/* Right Col: Apple Liquid Glass "INTERVENTION SWAP" Widget (Crypto Swap Homage) */}
        <div className="apple-liquid-glass-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-4 relative">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]">
                <ArrowDownUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Rapid Cold Swap</h3>
                <p className="text-[10px] font-mono text-slate-400">Emergency Divert & Stabilizer</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              SLIPPAGE: ±0.3°C
            </span>
          </div>

          {/* Success Banner */}
          {swapSuccessMessage && (
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-mono animate-in fade-in">
              <div className="flex items-center space-x-2 font-bold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Intervention Executed!</span>
              </div>
              <p className="text-[11px] leading-relaxed">{swapSuccessMessage}</p>
            </div>
          )}

          {/* From Consignment Box */}
          <div className="rounded-2xl bg-black/40 border border-white/[0.08] p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>SOURCE CONSIGNMENT</span>
              <span className="text-cyan-400 font-bold">Select Active</span>
            </div>
            <select
              value={swapShipmentId}
              onChange={(e) => setSwapShipmentId(e.target.value)}
              className="w-full bg-transparent text-white font-mono font-bold text-sm focus:outline-none cursor-pointer"
            >
              {shipments.map((s) => (
                <option key={s._id} value={s.trackingId} className="bg-slate-900 text-white">
                  {s.trackingId} — {s.vaccineName} ({s.currentTemperature.toFixed(1)}°C {s.riskLevel})
                </option>
              ))}
            </select>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
              <span>Corridor: {shipments.find(s => s.trackingId === swapShipmentId)?.origin || 'Delhi'} ➔ {shipments.find(s => s.trackingId === swapShipmentId)?.destination || 'Jaipur'}</span>
              <span className="text-amber-400 font-semibold">{shipments.find(s => s.trackingId === swapShipmentId)?.quantity || 24000} doses</span>
            </div>
          </div>

          {/* Swap Divider Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white border-2 border-[#070a13] shadow-[0_0_16px_rgba(6,182,212,0.5)]">
              <ArrowDownUp className="w-4 h-4" />
            </div>
          </div>

          {/* To Depot / Alternate Hub */}
          <div className="rounded-2xl bg-black/40 border border-white/[0.08] p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>DIVERT TARGET / REEFER DEPOT</span>
              <span className="text-emerald-400 font-bold">Target Node</span>
            </div>
            <select
              value={swapTargetWarehouse}
              onChange={(e) => setSwapTargetWarehouse(e.target.value)}
              className="w-full bg-transparent text-white font-mono font-bold text-sm focus:outline-none cursor-pointer"
            >
              {warehouses.map((wh) => (
                <option key={wh._id} value={wh.name} className="bg-slate-900 text-white">
                  {wh.name} ({wh.currentTemperature.toFixed(1)}°C • {wh.location.split(',')[0]})
                </option>
              ))}
            </select>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
              <span>Holding Buffer: +4.2 hrs</span>
              <span className="text-emerald-400">100% Available</span>
            </div>
          </div>

          {/* Protocol Strategy */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Intervention Protocol
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono font-semibold">
              <button
                type="button"
                onClick={() => setSwapInterventionType('REROUTE_DEPOT')}
                className={`py-2 px-1 rounded-xl border text-center transition ${
                  swapInterventionType === 'REROUTE_DEPOT'
                    ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white'
                }`}
              >
                Divert Hub
              </button>
              <button
                type="button"
                onClick={() => setSwapInterventionType('ICE_PACK')}
                className={`py-2 px-1 rounded-xl border text-center transition ${
                  swapInterventionType === 'ICE_PACK'
                    ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white'
                }`}
              >
                Ice Reload
              </button>
              <button
                type="button"
                onClick={() => setSwapInterventionType('REEFER_RESET')}
                className={`py-2 px-1 rounded-xl border text-center transition ${
                  swapInterventionType === 'REEFER_RESET'
                    ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white'
                }`}
              >
                Aux Compressor
              </button>
            </div>
          </div>

          {/* Execution Button */}
          <button
            type="button"
            disabled={isSwapping}
            onClick={handleExecuteInterventionSwap}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-mono font-bold text-xs shadow-[0_0_24px_rgba(6,182,212,0.4)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)] transition duration-200 disabled:opacity-50"
          >
            {isSwapping ? 'Dispatching Cold Intervention...' : 'Execute Emergency Cold Swap'}
          </button>
        </div>

      </div>

      {/* 4. LIQUID GLASS METRIC TILES GRID (6 CARDS WITH SPECULAR HIGHLIGHTS) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* 1. Active Shipments */}
        <div className="apple-liquid-glass-card apple-liquid-glass-card-hover p-4 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Active Fleet</span>
            <div className="p-2 rounded-2xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {stats ? stats.activeShipments : '...'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            <span className="text-emerald-400 font-bold">{stats?.totalShipments || 0}</span> registered
          </div>
        </div>

        {/* 2. Doses in Transit */}
        <div className="apple-liquid-glass-card apple-liquid-glass-card-hover p-4 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Protected Doses</span>
            <div className="p-2 rounded-2xl bg-blue-500/15 text-blue-300 border border-blue-500/30">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-300 font-mono">
            {stats ? Number(stats.dosesInTransit).toLocaleString() : '...'}
          </div>
          <div className="text-[11px] text-cyan-400/90 font-mono">
            Vaccine vials in transit
          </div>
        </div>

        {/* 3. High-Risk Shipments */}
        <div className="apple-liquid-glass-card apple-liquid-glass-card-hover p-4 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Pre-Excursion</span>
            <div className={`p-2 rounded-2xl ${(stats?.highRiskShipments || 0) > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]' : 'bg-white/[0.05] text-slate-400'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${(stats?.highRiskShipments || 0) > 0 ? 'text-amber-400' : 'text-white'}`}>
            {stats ? stats.highRiskShipments : '...'}
          </div>
          <div className="text-[11px] text-amber-400/90 font-mono">
            Active thermal drift
          </div>
        </div>

        {/* 4. Active Alerts */}
        <div className="apple-liquid-glass-card apple-liquid-glass-card-hover p-4 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Critical Alerts</span>
            <div className={`p-2 rounded-2xl ${(stats?.activeAlerts || 0) > 0 ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse' : 'bg-white/[0.05] text-slate-400'}`}>
              <BellRing className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${(stats?.activeAlerts || 0) > 0 ? 'text-red-400' : 'text-white'}`}>
            {stats ? stats.activeAlerts : '...'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            <span className="text-red-400 font-bold">{stats?.criticalAlerts || 0}</span> immediate action
          </div>
        </div>

        {/* 5. Cold-Storage Hubs */}
        <div className="apple-liquid-glass-card apple-liquid-glass-card-hover p-4 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Cold Hubs</span>
            <div className="p-2 rounded-2xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {stats ? stats.coldStorageHubs : '...'}
          </div>
          <div className="text-[11px] text-indigo-300 font-mono">
            100% Repositories Online
          </div>
        </div>

        {/* 6. Fleet Integrity Health Index */}
        <div className="apple-liquid-glass-card apple-liquid-glass-card-hover p-4 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Integrity SLA</span>
            <div className="p-2 rounded-2xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono text-glow-emerald">
            {stats ? `${stats.coldChainHealth}%` : '...'}
          </div>
          <div className="text-[11px] text-emerald-400/90 font-mono">
            {stats && stats.coldChainHealth >= 80 ? 'Optimal Integrity' : 'Degraded State'}
          </div>
        </div>

      </div>

      {/* 5. ACTIVE CRITICAL ALERTS BANNER (Liquid Glass Red/Amber Banner) */}
      {alerts.length > 0 && (
        <div className="rounded-3xl bg-red-500/10 backdrop-blur-2xl border border-red-500/30 p-5 shadow-[0_10px_30px_rgba(239,68,68,0.2)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-red-300 font-bold text-sm font-mono">
              <AlertCircle className="w-5 h-5 text-red-400 animate-pulse" />
              <span>ACTIVE COLD-CHAIN TELEMETRY ALERTS ({alerts.length})</span>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              className="text-xs font-mono font-bold text-red-300 hover:text-white flex items-center space-x-1"
            >
              <span>View All Alerts</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {alerts.slice(0, 3).map((alert) => (
              <div
                key={alert._id}
                className="rounded-2xl bg-black/40 backdrop-blur-md p-3.5 border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start space-x-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {alert.severity}
                  </span>
                  <div>
                    <span className="font-semibold text-white">{alert.message}</span>
                    {alert.recommendedAction && (
                      <p className="text-slate-400 text-[11px] mt-0.5 font-mono">{alert.recommendedAction}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto font-mono">
                  <button
                    onClick={() => handleAcknowledgeAlert(alert._id)}
                    className="px-3 py-1.5 rounded-xl border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 font-medium text-[11px] transition"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => handleResolveAlert(alert._id)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-[11px] shadow-[0_0_15px_rgba(16,185,129,0.3)] transition"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. INNOVATIVE DIGITAL TWIN RESILIENCE & TELEMETRY DECK */}
      <InnovativeColdChainDeck
        shipments={shipments}
        warehouses={warehouses}
      />

      {/* 7. PREDICTIVE EQUIPMENT RISK FORECASTER */}
      <PredictiveEquipmentRiskCard
        shipments={shipments}
        warehouses={warehouses}
        onActionTriggered={fetchDashboardData}
      />

      {/* 8. FUTURISTIC LIQUID GLASS LEAFLET MAP RADAR */}
      <div className="apple-liquid-glass-card rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/[0.08] gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <Radio className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Live Geographic Fleet Radar & Telemetry Mesh</h2>
              <p className="text-xs text-slate-400 font-mono">Real-time GPS transponders and thermal geo-zones</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded-full border border-cyan-500/30">
              {shipments.length} Active Nodes
            </span>
            <button
              onClick={() => navigate('/map')}
              className="text-xs font-mono font-bold text-cyan-400 hover:text-white flex items-center space-x-1"
            >
              <span>Full Screen Radar</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-white/[0.1] shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
          <RealtimeShipmentMap
            shipments={shipments}
            warehouses={warehouses}
            height="500px"
            showControls={true}
          />
        </div>
      </div>

      {/* 9. ORDER-BOOK STYLED CONSIGNMENT LEDGER & REGIONAL COLD HUBS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Order-Book Styled Active Consignments */}
        <div className="lg:col-span-2 apple-liquid-glass-card rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.08] gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Live Consignment Ledger</h2>
                <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/15 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                  {filteredShipments.length} Active
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">High-frequency IoT sensor telemetry & risk scoring</p>
            </div>

            <div className="flex items-center space-x-2">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter consignment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Filter at-risk toggle */}
              <button
                onClick={() => setFilterRiskOnly(!filterRiskOnly)}
                className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xl border transition flex items-center space-x-1.5 ${
                  filterRiskOnly
                    ? 'bg-amber-500/25 text-amber-200 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-white/[0.04] text-slate-400 border-white/[0.1] hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{filterRiskOnly ? 'At-Risk Only' : 'All States'}</span>
              </button>

              <button
                onClick={() => navigate('/shipments')}
                className="text-xs font-mono font-bold text-cyan-400 hover:text-white flex items-center space-x-1 pl-1"
              >
                <span>Ledger</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="text-slate-400 font-mono font-bold uppercase tracking-wider text-[10px] border-b border-white/[0.06]">
                <tr>
                  <th className="py-3 px-3">Tracking ID</th>
                  <th className="py-3 px-3">Vaccine Token</th>
                  <th className="py-3 px-3">Corridor & ETA</th>
                  <th className="py-3 px-3">Core Temp</th>
                  <th className="py-3 px-3">Risk Level</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredShipments.slice(0, 6).map((s) => {
                  const isExcursion = s.currentTemperature > s.safeMaxTemperature || s.currentTemperature < s.safeMinTemperature;
                  return (
                    <tr key={s._id} className="hover:bg-white/[0.04] transition">
                      <td className="py-3.5 px-3 font-mono font-bold text-cyan-300">
                        {s.trackingId}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-white">{s.vaccineName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {s.batchNumber} <span className="text-slate-600">·</span> {Number(s.quantity).toLocaleString()} doses
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-300">
                        <div className="font-medium text-xs">{s.origin} → {s.destination}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{s.remainingTravelTime}h transit left</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className={`font-mono font-bold text-sm ${isExcursion ? 'text-red-400 text-glow-cyan font-black' : 'text-slate-100'}`}>
                          {s.currentTemperature.toFixed(1)}°C
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">Safe: {s.safeMinTemperature}–{s.safeMaxTemperature}°C</div>
                      </td>
                      <td className="py-3.5 px-3">
                        {renderRiskIndicator(s.riskLevel)}
                      </td>
                      <td className="py-3.5 px-3">
                        {renderStatusIndicator(s.status)}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => navigate(`/temperature?shipment=${s.trackingId}`)}
                          className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-cyan-500/20 text-cyan-300 border border-white/[0.1] hover:border-cyan-400/40 font-mono font-bold text-[11px] transition shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                        >
                          Telemetry
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Regional Cold Hubs & Grid Outage Simulation */}
        <div className="apple-liquid-glass-card rounded-3xl p-6 space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h2 className="text-base font-bold text-white">Cold-Storage Hubs</h2>
                <p className="text-xs text-slate-400 font-mono">Grid Power & Reefer Capacity</p>
              </div>
              <button
                onClick={() => navigate('/warehouses')}
                className="text-xs font-mono font-bold text-cyan-400 hover:text-white flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {warehouses.slice(0, 4).map((wh) => (
                <div
                  key={wh._id}
                  className="p-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-white">{wh.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-1.5 mt-0.5">
                      <span>{wh.location.split(',')[0]}</span>
                      <span className="text-slate-600">·</span>
                      <span>{Number(wh.currentOccupancy).toLocaleString()} / {Number(wh.storageCapacity).toLocaleString()} doses</span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-sm font-bold text-cyan-300">
                      {wh.currentTemperature.toFixed(1)}°C
                    </div>
                    <div className="flex items-center space-x-1.5 justify-end mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${wh.powerStatus === 'ON' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-red-400 shadow-[0_0_8px_#f87171] animate-pulse'}`} />
                      <span className="text-[10px] font-bold text-slate-300 uppercase">
                        PWR: {wh.powerStatus}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Simulation Trigger Widget */}
          <div className="p-4 rounded-2xl bg-black/50 border border-white/[0.1] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Warehouse Power Outage Drill</span>
              </div>
              <button
                onClick={() => navigate('/warehouses')}
                className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-mono font-bold rounded-xl text-xs shadow-[0_0_15px_rgba(245,158,11,0.3)] transition"
              >
                Launch Drill
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
              Evaluates thermal loss rate and triggers automated switchover to secondary diesel generator and ice banks.
            </p>
          </div>

        </div>

      </div>

      {/* 10. HISTORICAL TEMPERATURE TRENDS VS PREDICTED SPOILAGE RISK D3/RECHARTS */}
      <HistoricalTempVsRiskChart />

      {/* 11. RISK DISTRIBUTION & WHO ENVELOPE (LIQUID GLASS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Risk Distribution Chart */}
        <div className="apple-liquid-glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Fleet Cold-Chain Risk Breakdown</h3>
            <span className="text-xs text-cyan-400 font-mono">Real-time Rule Engine</span>
          </div>

          <div className="h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(12, 19, 36, 0.9)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontFamily: 'monospace',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/[0.08] text-center font-mono">
            <div>
              <div className="text-sm font-bold text-emerald-400">{shipments.filter(s => s.riskLevel === 'LOW').length}</div>
              <div className="text-[10px] text-slate-400">LOW</div>
            </div>
            <div>
              <div className="text-sm font-bold text-amber-400">{shipments.filter(s => s.riskLevel === 'MODERATE').length}</div>
              <div className="text-[10px] text-slate-400">MODERATE</div>
            </div>
            <div>
              <div className="text-sm font-bold text-red-400">{shipments.filter(s => s.riskLevel === 'HIGH').length}</div>
              <div className="text-[10px] text-slate-400">HIGH</div>
            </div>
            <div>
              <div className="text-sm font-bold text-red-500">{shipments.filter(s => s.riskLevel === 'CRITICAL').length}</div>
              <div className="text-[10px] text-slate-400">CRITICAL</div>
            </div>
          </div>
        </div>

        {/* Safe Range Reference Chart */}
        <div className="apple-liquid-glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">WHO Thermal Envelope</h3>
            <span className="text-xs font-mono text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Safe Standard: 2.0°C – 8.0°C
            </span>
          </div>

          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tempChartData}>
                <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }} />
                <YAxis domain={[0, 10]} stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }} unit="°C" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(12, 19, 36, 0.9)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontFamily: 'monospace',
                  }}
                />
                <Area type="monotone" dataKey="temp" stroke="#06b6d4" strokeWidth={2} fill="#06b6d4" fillOpacity={0.25} name="Temp (°C)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/[0.08] font-mono">
            <span>WHO PQS Standard: 100%</span>
            <button
              onClick={() => navigate('/temperature')}
              className="font-bold text-cyan-400 hover:text-white flex items-center space-x-1"
            >
              <span>Live Telemetry Analyzer →</span>
            </button>
          </div>
        </div>

      </div>

      {/* 12. FLOATING QUICK ACTIONS BUTTON (STREAMLINED ADMINISTRATIVE WORKFLOWS) */}
      <FloatingQuickActions
        shipments={shipments}
        warehouses={warehouses}
        onActionComplete={fetchDashboardData}
      />

    </div>
  );
};
