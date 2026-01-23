/**
 * SystemBeautiful.tsx
 * 
 * Page système avec monitoring temps réel et visualisations spectaculaires
 */

import { useState, useEffect } from 'react';
import {
  Cpu, Wifi, Activity, Server,
  Thermometer, Zap, Clock, RefreshCw, AlertTriangle,
  CheckCircle2, XCircle, ArrowUp, ArrowDown
} from 'lucide-react';
import { AuroraBackground } from '../components/ui/AnimatedBackground';
import { GlowingCard, GlowingStatCard } from '../components/ui/GlowingCard';

interface SystemMetric {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
  trend: 'up' | 'down' | 'stable';
}

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'warning';
  uptime: string;
  memory: string;
  cpu: string;
}

export default function SystemBeautiful() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [metrics, setMetrics] = useState<SystemMetric[]>([
    { label: 'CPU', value: 45, max: 100, unit: '%', color: 'blue', trend: 'up' },
    { label: 'RAM', value: 62, max: 100, unit: '%', color: 'purple', trend: 'stable' },
    { label: 'GPU', value: 28, max: 100, unit: '%', color: 'cyan', trend: 'down' },
    { label: 'Disque', value: 71, max: 100, unit: '%', color: 'amber', trend: 'up' },
  ]);

  const [services] = useState<ServiceStatus[]>([
    { name: 'Vision Service', status: 'running', uptime: '7d 14h', memory: '256 MB', cpu: '12%' },
    { name: 'Audio Processor', status: 'running', uptime: '7d 14h', memory: '128 MB', cpu: '8%' },
    { name: 'AI Engine', status: 'running', uptime: '7d 14h', memory: '512 MB', cpu: '25%' },
    { name: 'Database', status: 'running', uptime: '30d 2h', memory: '384 MB', cpu: '5%' },
    { name: 'WebSocket Server', status: 'running', uptime: '7d 14h', memory: '64 MB', cpu: '2%' },
    { name: 'Background Jobs', status: 'warning', uptime: '2d 6h', memory: '96 MB', cpu: '15%' },
  ]);

  const [networkStats] = useState({
    download: 12.5,
    upload: 3.2,
    latency: 24,
    packets: { sent: 124567, received: 234891 },
  });

  useEffect(() => {
    setIsLoaded(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Simulate metric updates
    const metricsTimer = setInterval(() => {
      setMetrics(prev => prev.map(m => ({
        ...m,
        value: Math.min(m.max, Math.max(0, m.value + (Math.random() - 0.5) * 10)),
        trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
      })));
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(metricsTimer);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default: return <XCircle className="w-4 h-4 text-rose-400" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUp className="w-3 h-3 text-rose-400" />;
      case 'down': return <ArrowDown className="w-3 h-3 text-emerald-400" />;
      default: return <span className="w-3 h-3 text-slate-400">—</span>;
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; bar: string }> = {
      blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', bar: 'bg-blue-500' },
      purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', bar: 'bg-purple-500' },
      cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', bar: 'bg-cyan-500' },
      amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', bar: 'bg-amber-500' },
      emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', bar: 'bg-emerald-500' },
      rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', bar: 'bg-rose-500' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen relative">
      <AuroraBackground intensity="subtle" />

      <div className="relative z-10 p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className={`mb-8 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                <span className="animate-gradient-text">Système</span>
              </h1>
              <p className="text-slate-400">
                Monitoring en temps réel et état des services
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-mono text-white">
                  {currentTime.toLocaleTimeString('fr-FR')}
                </span>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-colors">
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </button>
            </div>
          </div>
        </header>

        {/* Quick Stats */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <GlowingStatCard label="Uptime" value="99.9%" icon={Activity} color="emerald" />
          <GlowingStatCard label="Services" value={`${services.filter(s => s.status === 'running').length}/${services.length}`} icon={Server} color="blue" />
          <GlowingStatCard label="Température" value="42°C" icon={Thermometer} color="amber" />
          <GlowingStatCard label="Consommation" value="125W" icon={Zap} color="purple" />
        </div>

        {/* Main Content */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Resource Usage */}
          <GlowingCard glowColor="blue" className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Cpu className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Utilisation des ressources</h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {metrics.map((metric) => {
                const colors = getColorClasses(metric.color);
                return (
                  <div key={metric.label} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{metric.label}</span>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(metric.trend)}
                        <span className={`font-mono font-bold ${colors.text}`}>
                          {Math.round(metric.value)}{metric.unit}
                        </span>
                      </div>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                        style={{ width: `${(metric.value / metric.max) * 100}%` }}
                      />
                    </div>
                    {/* Mini graph placeholder */}
                    <div className="flex items-end gap-0.5 h-8">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 ${colors.bar} rounded-t opacity-60`}
                          style={{ height: `${20 + Math.random() * 80}%` }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlowingCard>

          {/* Network Stats */}
          <GlowingCard glowColor="cyan">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Wifi className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Réseau</h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-800/40 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 flex items-center gap-2">
                    <ArrowDown className="w-4 h-4 text-emerald-400" />
                    Download
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {networkStats.download} MB/s
                  </span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-3/4" />
                </div>
              </div>

              <div className="p-4 bg-slate-800/40 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 flex items-center gap-2">
                    <ArrowUp className="w-4 h-4 text-blue-400" />
                    Upload
                  </span>
                  <span className="font-mono font-bold text-blue-400">
                    {networkStats.upload} MB/s
                  </span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-1/4" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/40 rounded-xl text-center">
                  <p className="text-xs text-slate-400 mb-1">Latence</p>
                  <p className="font-mono font-bold text-cyan-400">{networkStats.latency}ms</p>
                </div>
                <div className="p-3 bg-slate-800/40 rounded-xl text-center">
                  <p className="text-xs text-slate-400 mb-1">Paquets</p>
                  <p className="font-mono font-bold text-white">{(networkStats.packets.sent / 1000).toFixed(0)}K</p>
                </div>
              </div>
            </div>
          </GlowingCard>
        </div>

        {/* Services Status */}
        <div className={`mt-6 transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <GlowingCard glowColor="purple">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Server className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Services</h2>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                  {services.filter(s => s.status === 'running').length} Running
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 bg-amber-500 rounded-full" />
                  {services.filter(s => s.status === 'warning').length} Warning
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-400 border-b border-slate-700/50">
                    <th className="pb-3 font-medium">Service</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Uptime</th>
                    <th className="pb-3 font-medium">Memory</th>
                    <th className="pb-3 font-medium">CPU</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {services.map((service) => (
                    <tr key={service.name} className="group">
                      <td className="py-4">
                        <span className="font-medium text-white group-hover:text-blue-400 transition-colors">
                          {service.name}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                          service.status === 'running' ? 'bg-emerald-500/10 text-emerald-400' :
                          service.status === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-rose-500/10 text-rose-400'
                        }`}>
                          {getStatusIcon(service.status)}
                          {service.status}
                        </span>
                      </td>
                      <td className="py-4 text-slate-300">{service.uptime}</td>
                      <td className="py-4 font-mono text-slate-300">{service.memory}</td>
                      <td className="py-4 font-mono text-slate-300">{service.cpu}</td>
                      <td className="py-4">
                        <button className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlowingCard>
        </div>
      </div>
    </div>
  );
}
