import React, { useEffect, useState } from 'react';
import { fetchForecast, fetchProducts, fetchStores, fetchCategories } from '../services/api';
import { ForecastResponse, Product, Store, Category } from '../types';
import { Filter, Calendar, TrendingUp } from 'lucide-react';
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

export const DemandForecasting: React.FC = () => {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [horizon, setHorizon] = useState(30);

  useEffect(() => {
    Promise.all([fetchProducts(), fetchStores(), fetchCategories()])
      .then(([p, s, c]) => {
        setProducts(p);
        setStores(s);
        setCategories(c);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchForecast(selectedStore, selectedProduct, selectedCategory, horizon)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedStore, selectedProduct, selectedCategory, horizon]);

  return (
    <div className="space-y-6">
      {/* Title & Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" /> Multi-Model Demand Forecasting Engine
            </h1>
            <p className="text-xs text-slate-400">
              Interactive temporal forecasts powered by 5 base ML models & weighted ensemble.
            </p>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Store</label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Stores</option>
                {stores.map((s) => (
                  <option key={s.store_id} value={s.store_id}>
                    {s.store_name} ({s.store_location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Product</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 max-w-[180px]"
              >
                <option value="ALL">All Products</option>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Horizon</label>
              <select
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-indigo-400 font-medium text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              >
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
                <option value={60}>60 Days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          {/* Main Chart: Actual vs Ensemble Forecast */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-base font-semibold text-white mb-2">Historical Demand vs Ensemble Forecast</h2>
            <p className="text-xs text-slate-400 mb-4">
              Comparing actual historical sales quantities against the weighted ensemble forecast.
            </p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Legend />
                  <Line type="monotone" dataKey="actual_demand" name="Actual Sales" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="forecasted_demand" name="Ensemble Forecast" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Base Models Comparison */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-base font-semibold text-white mb-2">Base Models Demand Prediction Comparison</h2>
            <p className="text-xs text-slate-400 mb-4">
              Overlay of predictions from Random Forest, XGBoost, LightGBM, CatBoost, and Gradient Boosting.
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.timeline.slice(-90)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Legend />
                  <Line type="monotone" dataKey="pred_random_forest" name="Random Forest" stroke="#f59e0b" dot={false} />
                  <Line type="monotone" dataKey="pred_xgboost" name="XGBoost" stroke="#10b981" dot={false} />
                  <Line type="monotone" dataKey="pred_lightgbm" name="LightGBM" stroke="#6366f1" dot={false} />
                  <Line type="monotone" dataKey="pred_catboost" name="CatBoost" stroke="#ec4899" dot={false} />
                  <Line type="monotone" dataKey="pred_gradient_boosting" name="Gradient Boosting" stroke="#06b6d4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Interactive Forecast Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-4">Detailed Prediction Log</h2>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 sticky top-0">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Store</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Actual Units</th>
                    <th className="p-3 text-right">Forecast Demand</th>
                    <th className="p-3 text-right">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.table.slice(-30).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono">{row.date}</td>
                      <td className="p-3">{row.store_id}</td>
                      <td className="p-3 font-medium text-white">{row.product_name}</td>
                      <td className="p-3">{row.category}</td>
                      <td className="p-3 text-right font-semibold">{row.units_sold}</td>
                      <td className="p-3 text-right text-indigo-400 font-semibold">{row.forecasted_demand}</td>
                      <td className={`p-3 text-right font-mono ${row.forecast_error >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {row.forecast_error > 0 ? `+${row.forecast_error}` : row.forecast_error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
