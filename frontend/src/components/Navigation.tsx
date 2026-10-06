import React from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Cpu,
  Sparkles,
  Database,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeDatasetName?: string;
  activeMode?: 'demo' | 'user';
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  activeDatasetName = 'Demo Dataset',
  activeMode = 'demo',
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'forecasting', label: 'Forecasting', icon: TrendingUp },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'performance', label: 'Models', icon: Cpu },
    { id: 'insights', label: 'Insights & XAI', icon: Sparkles },
    { id: 'management', label: 'Data', icon: FileSpreadsheet },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Subtle Badge */}
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600/20 border border-indigo-500/40 p-2 rounded-xl text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">DemandIQ</span>
                <span className="text-xs text-slate-400 hidden sm:inline">• Intelligent Retail Analytics</span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 text-slate-400">
                  <Database className="w-3 h-3 text-emerald-400" /> Database-Free
                </span>
                <span>•</span>
                <span
                  className={`font-medium px-2 py-0.5 rounded ${
                    activeMode === 'user'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Active: {activeDatasetName}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border border-indigo-500/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
