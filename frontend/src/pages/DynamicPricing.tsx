import React, { useEffect, useState } from 'react';
import { fetchPricingRecommendations, simulatePricingCurve, fetchStores, fetchCategories } from '../services/api';
import { PricingRecommendation, Store, Category } from '../types';
import { DollarSign, TrendingUp, HelpCircle, ArrowUpRight, ArrowDownRight, Tag } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export const DynamicPricing: React.FC = () => {
  const [recommendations, setRecommendations] = useState<PricingRecommendation[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedItem, setSelectedItem] = useState<PricingRecommendation | null>(null);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStores(), fetchCategories()])
      .then(([s, c]) => {
        setStores(s);
        setCategories(c);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPricingRecommendations(selectedStore, selectedCategory)
      .then((recs) => {
        setRecommendations(recs);
        if (recs.length > 0) {
          setSelectedItem(recs[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedStore, selectedCategory]);

  useEffect(() => {
    if (selectedItem) {
      simulatePricingCurve(selectedItem.product_id, selectedItem.store_id)
        .then(setSimulationData)
        .catch(console.error);
    }
  }, [selectedItem]);

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" /> AI Dynamic Pricing Engine
            </h1>
            <p className="text-xs text-slate-400">
              Evaluates candidate price points subject to non-zero cost price constraints and demand elasticity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="ALL">All Stores</option>
              {stores.map((s) => (
                <option key={s.store_id} value={s.store_id}>{s.store_name}</option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.category} value={c.category}>{c.category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recommendation List */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[650px]">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" /> Optimized Price Recommendations ({recommendations.length})
            </h2>
            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {recommendations.map((item) => {
                const isSelected = selectedItem?.product_id === item.product_id && selectedItem?.store_id === item.store_id;
                const isPriceUp = item.price_change_pct > 0;
                const isPriceDown = item.price_change_pct < 0;

                return (
                  <div
                    key={`${item.store_id}-${item.product_id}`}
                    onClick={() => setSelectedItem(item)}
                    className={`p-4 rounded-xl cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-indigo-500/80 shadow-lg shadow-indigo-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-xs font-bold text-white">{item.product_name}</h3>
                        <span className="text-[10px] text-slate-400">{item.store_name} ({item.category})</span>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                          isPriceUp
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : isPriceDown
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isPriceUp && <ArrowUpRight className="w-3 h-3" />}
                        {isPriceDown && <ArrowDownRight className="w-3 h-3" />}
                        {item.price_change_pct > 0 ? `+${item.price_change_pct}%` : `${item.price_change_pct}%`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mt-3 pt-2 border-t border-slate-800/80">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Current Price</span>
                        <span className="font-semibold text-slate-300">${item.current_price}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Optimal Price</span>
                        <span className="font-bold text-emerald-400">${item.recommended_price}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details & Price Elasticity Curve */}
          <div className="lg:col-span-2 space-y-6">
            {selectedItem && (
              <>
                {/* Rationale & KPI Cards */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">{selectedItem.category}</span>
                      <h2 className="text-xl font-bold text-white">{selectedItem.product_name}</h2>
                      <span className="text-xs text-slate-400">{selectedItem.store_name} • Unit Cost: ${selectedItem.cost_price}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Recommended Price</span>
                      <span className="text-2xl font-black text-emerald-400">${selectedItem.recommended_price}</span>
                    </div>
                  </div>

                  {/* Recommendation Rationale */}
                  <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-xl mb-6">
                    <div className="flex items-start space-x-3">
                      <HelpCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-indigo-200">Pricing Rationale & Strategy</h4>
                        <p className="text-xs text-indigo-300/90 mt-1 leading-relaxed">
                          {selectedItem.recommendation_reason}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Profit & Demand KPI strip */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                      <span className="text-xs text-slate-400 block">Expected Daily Demand</span>
                      <span className="text-lg font-bold text-white mt-1 block">{selectedItem.expected_demand} units</span>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                      <span className="text-xs text-slate-400 block">Expected Daily Revenue</span>
                      <span className="text-lg font-bold text-indigo-400 mt-1 block">${selectedItem.expected_revenue.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                      <span className="text-xs text-slate-400 block">Expected Daily Profit</span>
                      <span className="text-lg font-bold text-emerald-400 mt-1 block">${selectedItem.expected_profit.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Interactive Simulation Curve */}
                {simulationData && (
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <h3 className="text-base font-semibold text-white mb-2">Price vs Expected Profit & Demand Curve</h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Simulated demand response across candidate selling price points.
                    </p>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={simulationData.curve}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="price" stroke="#64748b" fontSize={11} label={{ value: 'Price ($)', position: 'insideBottom', offset: -5, fill: '#64748b' }} />
                          <YAxis yAxisId="left" stroke="#10b981" fontSize={11} />
                          <YAxis yAxisId="right" orientation="right" stroke="#818cf8" fontSize={11} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="expected_profit" name="Expected Profit ($)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                          <Line yAxisId="right" type="monotone" dataKey="expected_demand" name="Expected Demand (Units)" stroke="#818cf8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
