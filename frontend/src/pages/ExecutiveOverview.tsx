import React, { useEffect, useState } from 'react';
import { fetchDashboardOverview } from '../services/api';
import { DashboardOverview } from '../types';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Package,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ExecutiveOverviewProps {
  selectedStore: string;
  selectedCategory: string;
  selectedProduct: string;
  onSelectInventoryFilter?: (status: string) => void;
}

export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({
  selectedStore,
  selectedCategory,
  selectedProduct,
  onSelectInventoryFilter,
}) => {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchDashboardOverview()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedStore, selectedCategory, selectedProduct]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const statusColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'];
  const pieData = [
    { name: 'Critical', value: data.inventory_status_breakdown.critical, key: 'CRITICAL STOCK' },
    { name: 'Low Stock', value: data.inventory_status_breakdown.low, key: 'LOW STOCK' },
    { name: 'Optimal', value: data.inventory_status_breakdown.optimal, key: 'OPTIMAL' },
    { name: 'Overstocked', value: data.inventory_status_breakdown.overstocked, key: 'OVERSTOCKED' },
  ];

  return (
    <div className="space-y-6">
      {/* Primary KPI Cards (Top Row) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-medium text-slate-400 block">Total Revenue</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">${data.kpis.total_revenue.toLocaleString()}</span>
            <span className="text-xs text-emerald-400 font-medium">+14.2%</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Aggregated store sales</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-medium text-slate-400 block">Total Units Sold</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{data.kpis.total_units_sold.toLocaleString()}</span>
            <span className="text-xs text-indigo-400 font-medium">Volume</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Units processed</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-medium text-slate-400 block">Estimated Gross Profit</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">${data.kpis.total_profit.toLocaleString()}</span>
            <span className="text-xs text-emerald-400 font-medium">Margin</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Selling Price - Cost Price</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-medium text-slate-400 block">Forecast Accuracy (R²)</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-purple-400">{data.kpis.forecast_accuracy_pct}%</span>
            <span className="text-xs text-purple-300 font-medium">SLSQP Ensemble</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Validation accuracy</span>
        </div>
      </div>

      {/* Secondary KPI Strip (Inventory & Operational Status) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Inventory Holding Value</span>
            <span className="text-lg font-semibold text-white block mt-0.5">${data.kpis.inventory_value.toLocaleString()}</span>
          </div>
          <Package className="w-5 h-5 text-slate-500" />
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Low Stock / Critical SKUs</span>
            <span className="text-lg font-semibold text-amber-400 block mt-0.5">{data.kpis.low_stock_items} SKUs</span>
          </div>
          <AlertTriangle className="w-5 h-5 text-amber-500" />
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Overstocked SKUs</span>
            <span className="text-lg font-semibold text-blue-400 block mt-0.5">{data.kpis.overstock_items} SKUs</span>
          </div>
          <Package className="w-5 h-5 text-blue-500" />
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Profit Growth Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-base font-semibold text-white mb-4">Monthly Revenue & Profit Trends</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthly_trends}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Area type="monotone" dataKey="revenue" name="Revenue ($)" stroke="#6366f1" fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="profit" name="Profit ($)" stroke="#10b981" fillOpacity={1} fill="url(#colorProf)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Status Donut */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-base font-semibold text-white mb-2">Inventory Health Status</h2>
          <p className="text-xs text-slate-400 mb-4">Click any category to filter inventory optimization.</p>
          <div className="h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={statusColors[index % statusColors.length]}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => onSelectInventoryFilter && onSelectInventoryFilter(entry.key)}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            {pieData.map((entry, idx) => (
              <button
                key={entry.name}
                onClick={() => onSelectInventoryFilter && onSelectInventoryFilter(entry.key)}
                className="flex items-center space-x-2 p-1.5 rounded hover:bg-slate-800/60 transition-colors text-left"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors[idx] }}></span>
                <span className="text-slate-400">{entry.name}: <strong className="text-white">{entry.value}</strong></span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
