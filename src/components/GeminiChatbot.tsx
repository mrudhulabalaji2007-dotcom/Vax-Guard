import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  Sparkles,
  Send,
  Bot,
  User,
  X,
  Minimize2,
  Maximize2,
  Search,
  MapPin,
  ShieldAlert,
  Zap,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Globe,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  modelUsed?: string;
  groundingMetadata?: any;
}

export const GeminiChatbot: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Hello! I am your **VAXGUARD Cold-Chain Intelligence Copilot** powered by Gemini. How can I assist you with real-time temperature telemetry, route risk evaluations, or emergency refrigeration protocols today?',
      timestamp: new Date(),
      modelUsed: 'gemini-3.5-flash',
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [systemRole, setSystemRole] = useState<'general' | 'emergency_responder' | 'logistics_optimizer' | 'who_auditor'>('general');
  const [selectedModel, setSelectedModel] = useState<'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash');
  const [enableSearchGrounding, setEnableSearchGrounding] = useState(true);
  const [enableMapsGrounding, setEnableMapsGrounding] = useState(false);
  const [includeTelemetry, setIncludeTelemetry] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          systemRole,
          model: selectedModel,
          enableSearchGrounding,
          enableMapsGrounding,
          includeTelemetryContext: includeTelemetry,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || 'AI request failed');
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        modelUsed: data.modelUsed,
        groundingMetadata: data.groundingMetadata,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Error: ${err.message || 'Unable to connect to Gemini AI services.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    setInput(promptText);
  };

  return (
    <div
      className={`fixed z-50 transition-all duration-200 flex flex-col bg-white shadow-2xl border border-slate-200 rounded-2xl overflow-hidden ${
        isExpanded
          ? 'inset-4 md:inset-10'
          : 'bottom-4 right-4 w-[92vw] sm:w-[460px] h-[640px] max-h-[90vh]'
      }`}
    >
      {/* Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 flex items-center justify-between shadow-md select-none">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-sm tracking-tight">VAXGUARD Copilot</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 font-bold border border-cyan-400/30">
                Gemini
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Cold-Chain Intelligence & Grounded AI</p>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-slate-400">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:text-white rounded-lg hover:bg-white/10"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:text-white rounded-lg hover:bg-white/10"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Configuration & Grounding Controls Bar */}
      <div className="bg-slate-50 border-b border-slate-200 p-2.5 space-y-2 text-xs">
        
        {/* Role & Model Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Role:</span>
            <select
              value={systemRole}
              onChange={(e: any) => setSystemRole(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-800"
            >
              <option value="general">Cold-Chain Specialist</option>
              <option value="emergency_responder">Emergency Commander</option>
              <option value="logistics_optimizer">Logistics & Routes</option>
              <option value="who_auditor">WHO-GDP Auditor</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Model:</span>
            <select
              value={selectedModel}
              onChange={(e: any) => setSelectedModel(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-mono font-semibold text-blue-700"
            >
              <option value="gemini-3.5-flash">gemini-3.5-flash</option>
              <option value="gemini-3.1-pro-preview">gemini-3.1-pro</option>
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
            </select>
          </div>

        </div>

        {/* Feature Toggles (Google Search, Maps, Telemetry Context) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
          
          <label className="flex items-center space-x-1 text-[11px] text-slate-700 cursor-pointer bg-white px-2 py-0.5 rounded-md border border-slate-200">
            <input
              type="checkbox"
              checked={enableSearchGrounding}
              onChange={(e) => {
                setEnableSearchGrounding(e.target.checked);
                if (e.target.checked) setEnableMapsGrounding(false);
              }}
              className="rounded text-blue-600 focus:ring-0"
            />
            <Globe className="w-3 h-3 text-blue-600" />
            <span>Search Grounding</span>
          </label>

          <label className="flex items-center space-x-1 text-[11px] text-slate-700 cursor-pointer bg-white px-2 py-0.5 rounded-md border border-slate-200">
            <input
              type="checkbox"
              checked={enableMapsGrounding}
              onChange={(e) => {
                setEnableMapsGrounding(e.target.checked);
                if (e.target.checked) setEnableSearchGrounding(false);
              }}
              className="rounded text-emerald-600 focus:ring-0"
            />
            <MapPin className="w-3 h-3 text-emerald-600" />
            <span>Maps Grounding</span>
          </label>

          <label className="flex items-center space-x-1 text-[11px] text-slate-700 cursor-pointer bg-white px-2 py-0.5 rounded-md border border-slate-200">
            <input
              type="checkbox"
              checked={includeTelemetry}
              onChange={(e) => setIncludeTelemetry(e.target.checked)}
              className="rounded text-purple-600 focus:ring-0"
            />
            <Zap className="w-3 h-3 text-purple-600" />
            <span>Live DB Telemetry</span>
          </label>

        </div>

      </div>

      {/* Messages Thread */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs bg-slate-50/50">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex items-start space-x-2.5 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                  isUser ? 'bg-blue-600' : 'bg-slate-900'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-cyan-400" />}
              </div>

              <div
                className={`max-w-[82%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-blue-600 text-white shadow-xs rounded-tr-xs'
                    : 'bg-white text-slate-800 border border-slate-200/80 shadow-xs rounded-tl-xs'
                }`}
              >
                <div>{m.content}</div>

                {/* Grounding Citations */}
                {m.groundingMetadata?.groundingChunks && m.groundingMetadata.groundingChunks.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
                    <span className="font-bold flex items-center space-x-1 text-slate-700">
                      <Search className="w-3 h-3 text-blue-600" />
                      <span>Google Search Sources:</span>
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {m.groundingMetadata.groundingChunks.slice(0, 3).map((chunk: any, i: number) => (
                        <a
                          key={i}
                          href={chunk.web?.uri || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-slate-100 hover:bg-slate-200 text-blue-700 px-2 py-0.5 rounded flex items-center space-x-1"
                        >
                          <span className="truncate max-w-[140px]">{chunk.web?.title || 'Source ' + (i + 1)}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`text-[9px] mt-1.5 flex items-center justify-between ${isUser ? 'text-blue-200' : 'text-slate-400'}`}>
                  <span>{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {m.modelUsed && <span className="font-mono text-[9px]">{m.modelUsed}</span>}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs p-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span className="font-mono text-[11px]">Gemini is analyzing cold-chain telemetry...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center space-x-1.5 overflow-x-auto text-[11px] no-scrollbar">
        <button
          onClick={() => handleQuickPrompt('What is the emergency protocol if TRK-VAX-1005 temperature crosses 8°C?')}
          className="whitespace-nowrap px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700"
        >
          🚨 8°C Excursion SOP
        </button>
        <button
          onClick={() => handleQuickPrompt('Search live weather forecast and heatwave alerts along Chennai to Nagercoil route today.')}
          className="whitespace-nowrap px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700"
        >
          🌤️ Route Weather Alert
        </button>
        <button
          onClick={() => handleQuickPrompt('Explain the predictive thermal risk formula used in VAXGUARD for college viva presentation.')}
          className="whitespace-nowrap px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700"
        >
          🎓 Viva Risk Formula
        </button>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Gemini regarding cold-chain, route risks, or failure SOPs..."
          className="flex-1 px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-slate-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 transition shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
