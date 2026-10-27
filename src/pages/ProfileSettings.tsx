import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  Settings2,
  Database,
  Server,
  ShieldCheck,
  User,
  Sparkles,
  Route as RouteIcon,
  Zap,
  CheckCircle2,
  Cpu,
  Layers,
  BookOpen,
} from 'lucide-react';

export const ProfileSettings: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
          <Settings2 className="w-6 h-6 text-blue-600" />
          <span>System Settings &amp; Academic Architecture</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Full MERN stack overview, cold-chain regulatory parameters, and viva presentation documentation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* User Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center space-x-2">
            <User className="w-4 h-4 text-blue-600" />
            <span>Active Operator Profile</span>
          </h3>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">{user?.name}</div>
              <div className="text-xs text-slate-500">{user?.email}</div>
            </div>
          </div>

          <div className="space-y-2 text-xs pt-2">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400">Assigned Role:</span>
              <span className="font-mono font-bold text-blue-700 uppercase">{user?.role}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400">Department:</span>
              <span className="font-medium text-slate-800 text-right">{user?.department}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Auth Mechanism:</span>
              <span className="font-mono text-emerald-700 font-semibold">JWT + Bcrypt (Bearer)</span>
            </div>
          </div>
        </div>

        {/* Cold-Chain Compliance Parameters */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>WHO Cold-Chain Operational Standard Thresholds</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Standard Band</div>
              <div className="text-xl font-black font-mono text-emerald-700 mt-1">2.0°C – 8.0°C</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Permissible transit range</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Critical Excursion</div>
              <div className="text-xl font-black font-mono text-red-600 mt-1">&gt; 8.0°C / &lt; 2.0°C</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Instant alert trigger</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Thermal Hold Buffer</div>
              <div className="text-xl font-black font-mono text-blue-700 mt-1">180 – 240 min</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Passive thermal insulation</div>
            </div>
          </div>
        </div>

      </div>

      {/* ACADEMIC VIVA & ARCHITECTURE GUIDE CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">Academic Viva Demonstration Guide &amp; Architecture</h2>
        </div>

        {/* Architecture Data Flow Diagram */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 font-mono text-xs overflow-x-auto space-y-4">
          <div className="text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
            VAXGUARD MERN Architecture Flow
          </div>

          <pre className="text-slate-300 leading-relaxed">
{`                    VAXGUARD
                       |
                       v
                React Frontend (React Router + Recharts + Tailwind CSS)
                       |
                       v
              Express REST API (/api/shipments, /api/temperature, /api/risk, /api/warehouses)
                       |
                       v
                 Node.js Server (Port 3000)
                       |
                       v
                  MongoDB Mongoose
                       |
              +--------+--------+
              |        |        |
              v        v        v
          Shipments  Warehouses Alerts
              |
              v
       Risk Calculation (riskEngine.ts)
              |
       +------+------+
       |             |
       v             v
 Predictive Risk   Route Risk (routeService.ts)
       |
       v
Refrigeration Failure Detection (warehouseController.ts)`}
          </pre>
        </div>

        {/* 3 Unique Features Summary for Examiner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-xs text-blue-950">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>1. Predictive Spoilage Risk</span>
            </div>
            <p className="text-[11px] text-blue-900/90 leading-relaxed">
              Transparent rule-based risk engine (0-100) combining current temp, historical variance, rate of warming (°C/hr), and remaining travel time to project excursions in minutes before they occur.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-xs text-emerald-950">
              <RouteIcon className="w-4 h-4 text-emerald-600" />
              <span>2. Temperature-Aware Routes</span>
            </div>
            <p className="text-[11px] text-emerald-900/90 leading-relaxed">
              Multi-Criteria Decision Analysis evaluating 3 routes. Recommends the safest corridor (not just shortest) based on certified backup cold hubs and lower ambient heat profiles.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-xs text-amber-950">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>3. Refrigeration Failure Sim</span>
            </div>
            <p className="text-[11px] text-amber-900/90 leading-relaxed">
              Live power grid outage simulation tracking temperature rise (5.2°C ➔ 8.4°C). Dynamically generates critical incidents and alerts in MongoDB when exceeding 8.0°C.
            </p>
          </div>

        </div>

        {/* 22-Step Viva Demonstration Checklist */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Step-by-Step Viva Presentation Checklist:
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {[
              '1. Admin logs in with JWT credentials',
              '2. Admin opens Dashboard showing MongoDB values',
              '3. Admin creates shipment TRK-VAX-1005 (500 doses)',
              '4. Shipment appears dynamically in dashboard',
              '5. Admin opens Temperature Monitoring',
              '6. Admin adds temperature readings via form',
              '7. Temperature trend line rises on Recharts',
              '8. Admin clicks ANALYZE RISK button',
              '9. System calculates 0-100 predictive risk score',
              '10. System displays recommended action',
              '11. Admin opens Route Planner',
              '12. Enters Origin: Chennai & Destination: Nagercoil',
              '13. System compares 3 alternative corridors',
              '14. System recommends Route B based on cold hubs',
              '15. Admin opens Warehouses page',
              '16. Admin clicks SIMULATE POWER OUTAGE',
              '17. Temperature climbs past 8.0°C threshold',
              '18. Critical Refrigeration Failure detected',
              '19. Incident & Critical Alert stored in MongoDB',
              '20. Admin acknowledges & resolves alert',
              '21. Dashboard statistics update in real-time',
              '22. Admin generates audit compliance report',
            ].map((step, idx) => (
              <div key={idx} className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50 text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium text-[11px]">{step}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
