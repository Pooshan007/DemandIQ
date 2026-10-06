import React, { useEffect, useState } from 'react';
import { fetchInventoryRecommendations } from '../services/api';
import { InventoryRecommendation } from '../types';
import { Package, AlertOctagon, AlertTriangle, CheckCircle2, HelpCircle, X } from 'lucide-react';

interface InventoryOptimizationProps {
  selectedStore: string;
  selectedCategory: string;
  selectedProduct: string;
}

export const InventoryOptimization: React.FC<InventoryOptimizationProps> = ({
  selectedStore,
  selectedCategory,
  selectedProduct,
}) => {
  const [items, setItems] = useState<InventoryRecommendation[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [explainItem, setExplainItem] = useState<InventoryRecommendation | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchInventoryRecommendations(selectedStore, selectedCategory, statusFilter)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedStore, selectedCategory, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CRITICAL STOCK':
        return <span className="bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1"><AlertOctagon className="w-3 h-3" /> Critical</span>;
      case 'LOW STOCK':
        return <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Low Stock</span>;
      case 'OVERSTOCKED':
        return <span className="bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1"><Package className="w-3 h-3" /> Overstocked</span>;
      default:
        return <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Optimal</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Status Filter Sub-bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" /> Inventory Optimization & Safety Stock Schedule
            </h1>
            <p className="text-xs text-slate-400">
              Derives Safety Stock, Reorder Point (ROP), and Order Quantities (ROQ) from lead-time demand variance.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Stock Status Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-amber-400 font-medium text-xs rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="CRITICAL STOCK">Critical Stock</option>
              <option value="LOW STOCK">Low Stock</option>
              <option value="OPTIMAL">Optimal Stock</option>
              <option value="OVERSTOCKED">Overstocked</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 sticky top-0">
                <tr>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Product Name</th>
                  <th className="p-2.5">Store</th>
                  <th className="p-2.5 text-right">Current Stock</th>
                  <th className="p-2.5 text-right">30D Forecast</th>
                  <th className="p-2.5 text-right">Safety Stock</th>
                  <th className="p-2.5 text-right">ROP</th>
                  <th className="p-2.5 text-right">ROQ</th>
                  <th className="p-2.5 text-right">Risk %</th>
                  <th className="p-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-2.5">{getStatusBadge(item.stock_status)}</td>
                    <td className="p-2.5 font-bold text-white whitespace-nowrap">
                      {item.product_name}
                      <span className="text-[10px] font-normal text-slate-400 block">{item.category} • Lead: {item.supplier_lead_time_days}d</span>
                    </td>
                    <td className="p-2.5 text-slate-300 whitespace-nowrap">{item.store_name}</td>
                    <td className="p-2.5 text-right font-bold text-white">{item.current_stock}</td>
                    <td className="p-2.5 text-right text-indigo-400 font-semibold">{item.forecasted_30d_demand}</td>
                    <td className="p-2.5 text-right text-slate-400 font-mono">{item.safety_stock}</td>
                    <td className="p-2.5 text-right text-amber-400 font-mono font-semibold">{item.reorder_point}</td>
                    <td className="p-2.5 text-right font-bold text-emerald-400 font-mono">
                      {item.recommended_order_quantity > 0 ? `+${item.recommended_order_quantity}` : '0'}
                    </td>
                    <td className="p-2.5 text-right font-semibold">
                      <span className={item.stockout_risk_pct > 30 ? 'text-rose-400' : 'text-slate-400'}>
                        {item.stockout_risk_pct}%
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => setExplainItem(item)}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 hover:text-white px-2.5 py-1 rounded text-[11px] font-medium transition-all"
                      >
                        Explain
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Explanation Rationale Modal */}
      {explainItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full p-6 rounded-2xl shadow-2xl space-y-4 relative">
            <button
              onClick={() => setExplainItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 text-indigo-400">
              <HelpCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Inventory Recommendation Explanation</h3>
            </div>

            <div>
              <h4 className="text-sm font-bold text-indigo-300">{explainItem.product_name}</h4>
              <span className="text-xs text-slate-400">{explainItem.store_name} ({explainItem.category})</span>
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-800/80 pb-1">
                <span className="text-slate-400">Current Physical Stock:</span>
                <span className="font-bold text-white">{explainItem.current_stock} units</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1">
                <span className="text-slate-400">30-Day Forecast Demand:</span>
                <span className="font-bold text-indigo-400">{explainItem.forecasted_30d_demand} units</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1">
                <span className="text-slate-400">Supplier Lead Time:</span>
                <span className="text-slate-300">{explainItem.supplier_lead_time_days} days</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1">
                <span className="text-slate-400">Safety Stock (95% Service Level):</span>
                <span className="text-slate-300">{explainItem.safety_stock} units</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1">
                <span className="text-amber-400 font-bold">Reorder Point (ROP):</span>
                <span className="font-bold text-amber-400">{explainItem.reorder_point} units</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-emerald-400 font-bold">Recommended Order Qty (ROQ):</span>
                <span className="font-bold text-emerald-400">+{explainItem.recommended_order_quantity} units</span>
              </div>
            </div>

            {/* Mathematical Rationale Text */}
            <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-xl text-xs text-indigo-200 leading-relaxed">
              <strong className="block text-indigo-300 mb-1">Decision Rationale:</strong>
              {explainItem.current_stock <= explainItem.safety_stock ? (
                <>
                  Critical inventory replenishment is required immediately. Current stock (<strong>{explainItem.current_stock}</strong>) has fallen below Safety Stock (<strong>{explainItem.safety_stock}</strong>), resulting in a <strong>{explainItem.stockout_risk_pct}% stock-out risk</strong> during supplier lead time.
                </>
              ) : explainItem.current_stock <= explainItem.reorder_point ? (
                <>
                  Reorder is recommended because current inventory (<strong>{explainItem.current_stock}</strong>) is below the Reorder Point (<strong>{explainItem.reorder_point}</strong>), and forecast demand during supplier lead time exceeds available unreserved stock.
                </>
              ) : explainItem.current_stock > explainItem.reorder_point + (1.5 * explainItem.forecasted_30d_demand) ? (
                <>
                  Current stock level (<strong>{explainItem.current_stock}</strong>) exceeds projected 30-day demand and carrying threshold (<strong>{explainItem.reorder_point + Math.round(1.5 * explainItem.forecasted_30d_demand)}</strong>), creating an overstock risk of <strong>{explainItem.overstock_risk_pct}%</strong>.
                </>
              ) : (
                <>
                  Current stock level (<strong>{explainItem.current_stock}</strong>) is optimal. It exceeds Safety Stock and Reorder Point (<strong>{explainItem.reorder_point}</strong>) while remaining within carrying capacity bounds.
                </>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setExplainItem(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
