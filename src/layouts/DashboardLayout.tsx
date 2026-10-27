import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { GeminiChatbot } from '../components/GeminiChatbot.js';
import {
  ShieldAlert,
  LayoutDashboard,
  Truck,
  ThermometerSnowflake,
  Route as RouteIcon,
  Building2,
  BellRing,
  FileBarChart2,
  Settings2,
  LogOut,
  UserCheck,
  Activity,
  Menu,
  X,
  Server,
  Database,
  Sparkles,
  Bot,
  Navigation,
  Radio,
  ChevronDown,
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, logout, loginAsDemoRole } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [geminiChatOpen, setGeminiChatOpen] = useState(false);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin / Cold-Chain Officer', pill: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' };
      case 'warehouse_manager':
        return { label: 'Warehouse Manager', pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'logistics_manager':
        return { label: 'Logistics Manager', pill: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' };
      case 'hospital_receiver':
        return { label: 'Hospital Receiving Staff', pill: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      default:
        return { label: 'Cold-Chain Operator', pill: 'bg-slate-700/30 text-slate-300 border-white/10' };
    }
  };

  const currentRole = getRoleBadge(user?.role);

  const navItems = [
    { to: '/dashboard', label: 'Terminal', icon: LayoutDashboard },
    { to: '/map', label: 'Live Fleet Radar', icon: Navigation },
    { to: '/shipments', label: 'Consignments', icon: Truck },
    { to: '/temperature', label: 'Thermal Telemetry', icon: ThermometerSnowflake },
    { to: '/routes', label: 'Corridor Routing', icon: RouteIcon },
    { to: '/warehouses', label: 'Cold Hubs', icon: Building2 },
    { to: '/alerts', label: 'Alert Center', icon: BellRing },
    { to: '/reports', label: 'Audits & Ledger', icon: FileBarChart2 },
    { to: '/settings', label: 'Node Settings', icon: Settings2 },
  ];

  const handleRoleChange = async (role: any) => {
    await loginAsDemoRole(role);
    setRoleSwitcherOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col antialiased relative selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Ambient background radiant liquid glow orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full bg-cyan-500/12 blur-[140px] pointer-events-none z-0" />
      <div className="fixed top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/15 blur-[160px] pointer-events-none z-0" />
      <div className="fixed bottom-[-15%] left-[25%] w-[650px] h-[650px] rounded-full bg-purple-600/10 blur-[170px] pointer-events-none z-0" />

      {/* Floating Apple Liquid Glass Top Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-[#080d1a]/70 border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo & System Status */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] focus:outline-hidden transition"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              
              <div 
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-3 cursor-pointer select-none group"
              >
                <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_24px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_32px_rgba(6,182,212,0.6)] transition duration-300">
                  <div className="absolute inset-0 rounded-2xl border border-white/30" />
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-lg tracking-wider text-white font-mono bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                      VAXGUARD
                    </span>
                    <span className="text-[10px] font-mono font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                      LIQUID 2.0
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Autonomous Cold-Chain Mesh</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Liquid Glass Controls & Switcher */}
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              
              {/* Telemetry Node Pill */}
              <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl text-xs font-mono text-slate-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-slate-400">NODE:</span>
                <span className="font-semibold text-cyan-300">DEL-REGION-1</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">LATENCY:</span>
                <span className="font-bold text-emerald-400">14ms</span>
              </div>

              {/* Role Switcher Pill */}
              <div className="relative">
                <button
                  onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                  className={`flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-full border backdrop-blur-xl transition duration-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] ${currentRole.pill}`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{currentRole.label}</span>
                  <span className="sm:hidden font-mono uppercase">{user?.role?.slice(0, 5)}</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>

                {/* Role Switcher Modal Dropdown */}
                {roleSwitcherOpen && (
                  <div className="absolute right-0 mt-2.5 w-72 rounded-2xl bg-[#0c1324]/95 backdrop-blur-2xl border border-white/[0.12] p-2 z-50 shadow-[0_20px_50px_rgba(0,0,0,0.8)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]">
                    <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-white/[0.06]">
                      Access Role (Viva & Admin Presentation)
                    </div>
                    <div className="mt-1 space-y-1">
                      <button
                        onClick={() => handleRoleChange('admin')}
                        className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition ${
                          user?.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold' : 'text-slate-300 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-white">Dr. Anandhi Natarajan</div>
                          <div className="text-[10px] text-slate-400">Admin / Cold-Chain Officer</div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">ADMIN</span>
                      </button>

                      <button
                        onClick={() => handleRoleChange('warehouse_manager')}
                        className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition ${
                          user?.role === 'warehouse_manager' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold' : 'text-slate-300 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-white">G. Sundarraj</div>
                          <div className="text-[10px] text-slate-400">Chennai State Vaccine Hub</div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">HUB</span>
                      </button>

                      <button
                        onClick={() => handleRoleChange('logistics_manager')}
                        className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition ${
                          user?.role === 'logistics_manager' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold' : 'text-slate-300 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-white">K. Balakrishnan</div>
                          <div className="text-[10px] text-slate-400">Cold Corridor Fleet Transit</div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">TRANSIT</span>
                      </button>

                      <button
                        onClick={() => handleRoleChange('hospital_receiver')}
                        className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition ${
                          user?.role === 'hospital_receiver' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold' : 'text-slate-300 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-white">Dr. Meena Swaminathan</div>
                          <div className="text-[10px] text-slate-400">Nagercoil Govt Hospital</div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">RECEIVER</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar & Logout */}
              <div className="flex items-center space-x-2 pl-2 border-l border-white/[0.1]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-[0_0_12px_rgba(6,182,212,0.4)] border border-white/20">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-1.5 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* Main Container with Apple Liquid Glass Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6 relative z-10">
        
        {/* Desktop Liquid Glass Sidebar */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky top-24 rounded-3xl bg-[#0c1324]/60 backdrop-blur-2xl border border-white/[0.08] p-3 shadow-[0_12px_40px_rgba(0,0,0,0.5)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] space-y-1.5">
            
            <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
              MISSION TERMINAL
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/20 text-cyan-200 border border-cyan-400/40 shadow-[0_0_18px_rgba(6,182,212,0.25)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)]'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            {/* AI Assistant Quick Trigger Sidebar Block */}
            <div className="pt-2 px-1">
              <button
                onClick={() => setGeminiChatOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-cyan-500/15 border border-indigo-400/30 text-left hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.25)] transition duration-300 group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <span>Gemini Copilot</span>
                      <Sparkles className="w-3 h-3 text-cyan-300 animate-pulse" />
                    </div>
                    <div className="text-[10px] text-cyan-400/90 font-mono">Grounded Cold AI</div>
                  </div>
                </div>
              </button>
            </div>

            {/* Telemetry Status Glass Widget */}
            <div className="mt-3 pt-3 border-t border-white/[0.06] px-2">
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-300 font-bold">
                  <div className="flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span>WHO Thermal Band</span>
                  </div>
                  <span className="font-mono text-emerald-400 text-[10px]">ACTIVE</span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between font-mono pt-1">
                  <span>Safe Range:</span>
                  <span className="text-cyan-300 font-semibold">+2.0°C to +8.0°C</span>
                </div>
                <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full w-[94%]" />
                </div>
              </div>
            </div>

          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex">
            <div className="w-72 bg-[#0c1324] h-full p-5 space-y-4 shadow-2xl flex flex-col justify-between border-r border-white/10 animate-in slide-in-from-left">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <span className="font-black text-lg font-mono text-white tracking-wider">VAXGUARD</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-1.5 mt-4">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                            isActive
                              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30'
                              : 'text-slate-400 hover:bg-white/[0.05]'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 text-xs text-red-400 bg-red-500/10 rounded-xl font-medium border border-red-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main Workspace Content Area */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>

      </div>

      {/* Floating Gemini Chatbot Toggle Button */}
      {!geminiChatOpen && (
        <button
          onClick={() => setGeminiChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-cyan-500/80 via-blue-600/80 to-indigo-600/80 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-full shadow-[0_0_30px_rgba(6,182,212,0.4)] backdrop-blur-xl border border-white/25 font-bold text-xs transition duration-300 transform hover:scale-105"
        >
          <Sparkles className="w-4 h-4 text-cyan-200 animate-pulse" />
          <span>Ask Gemini AI</span>
        </button>
      )}

      {/* Gemini Chatbot Modal / Drawer */}
      <GeminiChatbot isOpen={geminiChatOpen} onClose={() => setGeminiChatOpen(false)} />

      {/* Academic / Enterprise Dark Glass Footer */}
      <footer className="mt-auto backdrop-blur-xl bg-[#080d1a]/50 border-t border-white/[0.06] py-4 text-xs text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-300 font-mono">VAXGUARD</span>
            <span>— Mission-Critical Cold-Chain Orchestration & Predictive Telemetry</span>
          </div>
          <div className="flex items-center space-x-3 font-mono text-[11px] text-slate-400">
            <span>WHO PQS Compliant</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Telemetry Grid
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
