import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { alertSoundService } from '../services/alertSoundService.js';
import { AlertItem } from '../types/index.js';
import {
  BellRing,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  FileCheck,
  Send,
  Volume2,
  VolumeX,
  Volume1,
  Flame,
  Radio,
  Sliders,
  Play,
  ShieldAlert,
} from 'lucide-react';

export const Alerts: React.FC = () => {
  const { user } = useAuth();

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, critical: 0, acknowledged: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Sound Notification System State
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(alertSoundService.getIsMuted());
  const [volume, setVolume] = useState(alertSoundService.getVolume());
  const [silencedAlertIds, setSilencedAlertIds] = useState<Set<string>>(new Set());
  const [activeCriticalAlert, setActiveCriticalAlert] = useState<AlertItem | null>(null);
  const [simulatingSpike, setSimulatingSpike] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Resolve Alert Modal State
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedAlertForResolve, setSelectedAlertForResolve] = useState<AlertItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  // Subscribe to audio synthesizer state
  useEffect(() => {
    const unsubscribe = alertSoundService.subscribe((state) => {
      setIsAudioPlaying(state.isPlaying);
      setIsMuted(state.isMuted);
      setVolume(state.volume);
    });

    return () => {
      unsubscribe();
      alertSoundService.stopAlarm();
    };
  }, []);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const fetchAlerts = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await api.getAlerts({
        status: statusTab !== 'ALL' ? statusTab : undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
      });
      setAlerts(res.alerts);
      setCounts(res.counts);

      // Check for active critical temperature spikes
      const activeCriticalSpikes = res.alerts.filter(
        (a) =>
          a.status === 'ACTIVE' &&
          (a.severity === 'CRITICAL' ||
            (a.type === 'Temperature Excursion' && a.severity !== 'LOW') ||
            a.message.toLowerCase().includes('spike') ||
            a.message.toLowerCase().includes('excursion'))
      );

      if (activeCriticalSpikes.length > 0) {
        const topCritical = activeCriticalSpikes[0];
        setActiveCriticalAlert(topCritical);

        // If not explicitly silenced and sound is not muted, trigger browser alarm tone!
        if (!silencedAlertIds.has(topCritical._id) && !alertSoundService.getIsMuted()) {
          alertSoundService.startCriticalAlarm();
        }
      } else {
        setActiveCriticalAlert(null);
        alertSoundService.stopAlarm();
      }
    } catch (err) {
      console.warn('Notice: Background alerts sync deferred:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Background polling every 12 seconds for real-time monitoring
    const pollInterval = setInterval(() => {
      fetchAlerts(true);
    }, 12000);
    return () => clearInterval(pollInterval);
  }, [statusTab, severityFilter, typeFilter]);

  const handleToggleMute = () => {
    const next = !isMuted;
    alertSoundService.setMuted(next);
    setIsMuted(next);
    if (!next) {
      alertSoundService.playNoticeTone();
      showToast('Sound Notifications: Unmuted (Audio alerts active)');
    } else {
      showToast('Sound Notifications: Muted');
    }
  };

  const handleVolumeChange = (newVol: number) => {
    alertSoundService.setVolume(newVol);
    setVolume(newVol);
  };

  const handleTestTone = () => {
    alertSoundService.getAudioContext();
    alertSoundService.playCriticalSpikeTone();
    showToast('Playing sample critical temperature spike alarm tone (880Hz / 1175Hz / 1397Hz)');
  };

  const handleSilenceAlarm = () => {
    if (activeCriticalAlert) {
      setSilencedAlertIds((prev) => new Set(prev).add(activeCriticalAlert._id));
    }
    alertSoundService.stopAlarm();
    showToast('Critical temperature alert audio silenced for current incident.');
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await api.acknowledgeAlert(id, user?.name);
      setSilencedAlertIds((prev) => new Set(prev).add(id));
      alertSoundService.stopAlarm();
      alertSoundService.playNoticeTone();
      showToast('Alert acknowledged. Sound alarm silenced.');
      fetchAlerts();
    } catch (err) {
      console.warn('Error acknowledging alert:', err);
    }
  };

  const openResolveDialog = (alertItem: AlertItem) => {
    setSelectedAlertForResolve(alertItem);
    setResolutionNotes(`Thermal parameters restored to safe range (2.0°C - 8.0°C). Verified by ${user?.name || 'Cold Chain Officer'}.`);
    setResolveModalOpen(true);
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertForResolve) return;
    try {
      setResolving(true);
      await api.resolveAlert(selectedAlertForResolve._id, resolutionNotes, user?.name);
      setSilencedAlertIds((prev) => new Set(prev).add(selectedAlertForResolve._id));
      alertSoundService.stopAlarm();
      alertSoundService.playNoticeTone();
      setResolveModalOpen(false);
      showToast(`Alert ${selectedAlertForResolve.alertId} resolved and logged.`);
      fetchAlerts();
    } catch (err: any) {
      showToast(err.message || 'Error resolving alert');
    } finally {
      setResolving(false);
    }
  };

  // Immediate simulation of critical temperature spike
  const handleSimulateCriticalSpike = async () => {
    try {
      setSimulatingSpike(true);
      const spikeTemp = (8.8 + Math.random() * 2.4).toFixed(1);
      const res = await api.createAlert({
        type: 'Temperature Excursion',
        severity: 'CRITICAL',
        message: `CRITICAL TEMPERATURE SPIKE: Sensor TC-904 recorded ${spikeTemp}°C (Safe limit: 8.0°C breach)`,
        details: `Thermal breach detected in active transit corridor. Auxiliary cooling pack depleted. Immediate corrective action required to avoid vaccine spoilage.`,
        recommendedAction: 'Engage secondary refrigeration compressor or divert to nearest cold storage link immediately.',
        relatedShipmentId: 'TRK-VAX-1008',
      });

      showToast(`CRITICAL SPIKE SIMULATED: ${spikeTemp}°C breach recorded! Sound alarm triggered.`);
      // Ensure audio context is unlocked
      alertSoundService.getAudioContext();
      alertSoundService.startCriticalAlarm();
      await fetchAlerts();
    } catch (err: any) {
      showToast(err.message || 'Error simulating temperature spike');
    } finally {
      setSimulatingSpike(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-200 animate-pulse">🔴 CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">🟠 HIGH</span>;
      case 'WARNING':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">🟡 WARNING</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">🔵 LOW / INFO</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed top-6 right-6 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Volume2 className="w-5 h-5 text-blue-400 shrink-0" />
          <span className="text-xs font-medium leading-relaxed">{feedbackToast}</span>
        </div>
      )}

      {/* FLASHING CRITICAL TEMPERATURE SPIKE ALARM BANNER */}
      {isAudioPlaying && activeCriticalAlert && (
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-rose-700 text-white rounded-2xl p-5 shadow-2xl border-2 border-red-400/60 animate-in fade-in slide-in-from-top-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <Volume2 className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-red-700 uppercase tracking-wider">
                  AUDIO SIREN ACTIVE
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-1 bg-white animate-pulse h-3.5 rounded-full" />
                  <div className="w-1 bg-white animate-pulse h-5 rounded-full delay-75" />
                  <div className="w-1 bg-white animate-pulse h-3 rounded-full delay-150" />
                  <div className="w-1 bg-white animate-pulse h-6 rounded-full delay-100" />
                </div>
              </div>
              <h2 className="text-base font-black tracking-tight text-white mt-1">
                CRITICAL TEMPERATURE SPIKE DETECTED
              </h2>
              <p className="text-xs text-red-100 max-w-2xl mt-0.5">
                {activeCriticalAlert.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
            <button
              onClick={handleSilenceAlarm}
              className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <VolumeX className="w-4 h-4" />
              Silence Siren
            </button>
            <button
              onClick={() => handleAcknowledge(activeCriticalAlert._id)}
              className="px-4 py-2 rounded-xl bg-white text-red-700 hover:bg-red-50 text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Acknowledge &amp; Silence
            </button>
          </div>
        </div>
      )}

      {/* Header with Integrated Sound Notification Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <BellRing className="w-6 h-6 text-red-600" />
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Cold-Chain Incident &amp; Alert Center
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live thermal excursion notices, real-time Web Audio alarm system, and failure interventions
            </p>
          </div>

          {/* Quick Action Trigger & Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSimulateCriticalSpike}
              disabled={simulatingSpike}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Flame className="w-4 h-4 animate-pulse" />
              <span>{simulatingSpike ? 'Simulating Spike...' : 'Simulate Critical Spike (> 8.0°C)'}</span>
            </button>

            <button
              onClick={() => fetchAlerts()}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Refresh Alerts"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Audio Notification Bar */}
        <div className="pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleToggleMute}
              className={`px-3 py-1.5 rounded-lg border font-semibold text-xs flex items-center gap-2 transition cursor-pointer ${
                isMuted
                  ? 'bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/10'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
              <span>{isMuted ? 'Sound Notifications: Muted' : 'Sound Notifications: Active'}</span>
            </button>

            <button
              onClick={handleTestTone}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
              <span>Test Alert Tone</span>
            </button>

            {isAudioPlaying && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                Alert Tone Sounding...
              </span>
            )}
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2.5 text-xs text-slate-600">
            <Volume1 className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-500">Volume:</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              disabled={isMuted}
              className="w-24 accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer disabled:opacity-40"
            />
            <span className="font-mono text-[11px] text-slate-500 w-8 text-right font-bold">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* TABS & COUNTERS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusTab('ALL')}
          className={`p-3.5 rounded-xl border text-left transition ${
            statusTab === 'ALL' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/20' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-slate-400">Total Alerts</div>
          <div className="text-2xl font-black font-mono text-slate-900">{counts.total}</div>
        </button>

        <button
          onClick={() => setStatusTab('ACTIVE')}
          className={`p-3.5 rounded-xl border text-left transition ${
            statusTab === 'ACTIVE' ? 'bg-red-50 border-red-300 ring-2 ring-red-400/20' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-red-600">Active Unresolved</div>
          <div className="text-2xl font-black font-mono text-red-600">{counts.active}</div>
        </button>

        <button
          onClick={() => setStatusTab('ACKNOWLEDGED')}
          className={`p-3.5 rounded-xl border text-left transition ${
            statusTab === 'ACKNOWLEDGED' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-amber-600">Acknowledged</div>
          <div className="text-2xl font-black font-mono text-amber-700">{counts.acknowledged}</div>
        </button>

        <button
          onClick={() => setStatusTab('RESOLVED')}
          className={`p-3.5 rounded-xl border text-left transition ${
            statusTab === 'RESOLVED' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-emerald-600">Resolved Logs</div>
          <div className="text-2xl font-black font-mono text-emerald-700">{counts.resolved}</div>
        </button>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        
        {/* Severity Filter */}
        <div className="flex items-center space-x-2 text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <span className="font-semibold text-slate-500">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-transparent font-bold text-slate-800 focus:outline-hidden"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="WARNING">Warning</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Type Filter */}
        <div className="flex items-center space-x-2 text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <span className="font-semibold text-slate-500">Alert Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-transparent font-bold text-slate-800 focus:outline-hidden"
          >
            <option value="ALL">All Alert Types</option>
            <option value="Temperature Excursion">Temperature Excursion</option>
            <option value="Predictive High Risk">Predictive High Risk</option>
            <option value="Refrigeration Failure">Refrigeration Failure</option>
            <option value="Route Risk">Route Risk</option>
            <option value="Low Inventory">Low Inventory</option>
            <option value="Shipment Delay">Shipment Delay</option>
          </select>
        </div>

      </div>

      {/* ALERTS FEED */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <span>Loading alerts from MongoDB...</span>
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="font-bold text-slate-700">No alerts found in this view.</p>
          <p className="text-xs text-slate-400">All cold-chain parameters operating within safe specifications.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const isActive = alert.status === 'ACTIVE';
            const isAcknowledged = alert.status === 'ACKNOWLEDGED';
            const isResolved = alert.status === 'RESOLVED';

            return (
              <div
                key={alert._id}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  alert.severity === 'CRITICAL' && isActive
                    ? 'border-red-300 bg-red-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="space-y-1.5 max-w-3xl">
                  
                  {/* Alert Meta Tags */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-500">
                      {alert.alertId}
                    </span>
                    {getSeverityBadge(alert.severity)}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 font-semibold">
                      {alert.type}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                    </span>
                  </div>

                  {/* Message */}
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {alert.message}
                  </h3>

                  {/* Recommendation & Context */}
                  {alert.recommendedAction && (
                    <div className="text-xs text-blue-900 bg-blue-50/70 p-2 rounded-lg border border-blue-100 font-medium">
                      <span className="font-bold text-blue-950">Action: </span>
                      {alert.recommendedAction}
                    </div>
                  )}

                  {/* Audit Trail */}
                  {(isAcknowledged || isResolved) && (
                    <div className="text-[11px] text-slate-500 font-mono pt-1">
                      {isAcknowledged && (
                        <span>✓ Acknowledged by {alert.acknowledgedBy} at {new Date(alert.acknowledgedAt!).toLocaleTimeString()}</span>
                      )}
                      {isResolved && (
                        <span className="text-emerald-700">✓ Resolved by {alert.resolvedBy} • Notes: {alert.resolutionNotes}</span>
                      )}
                    </div>
                  )}

                </div>

                {/* Action Controls */}
                <div className="flex items-center space-x-2 shrink-0 self-end md:self-auto">
                  {isActive && (
                    <button
                      onClick={() => handleAcknowledge(alert._id)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
                    >
                      Acknowledge
                    </button>
                  )}

                  {!isResolved ? (
                    <button
                      onClick={() => openResolveDialog(alert)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs"
                    >
                      Resolve Alert
                    </button>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      RESOLVED
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* RESOLVE ALERT DIALOG MODAL */}
      {resolveModalOpen && selectedAlertForResolve && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Resolve Cold-Chain Alert</h3>
            <p className="text-xs text-slate-500 mt-1">
              Document resolution action taken for regulatory compliance audit
            </p>

            <form onSubmit={handleResolveSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Alert Reference
                </label>
                <div className="mt-1 p-2 bg-slate-50 rounded-lg border font-mono text-slate-800">
                  {selectedAlertForResolve.alertId} — {selectedAlertForResolve.type}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Resolution Notes &amp; Corrective Action Taken *
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResolveModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {resolving ? 'Recording...' : 'Mark Alert as Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
