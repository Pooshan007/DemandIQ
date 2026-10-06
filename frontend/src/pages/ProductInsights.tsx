import React, { useEffect, useState } from 'react';
import { fetchProducts, fetchExplainability, fetchPricingRecommendations, fetchInventoryRecommendations, fetchForecast } from '../services/api';
import { Product, ExplainabilityResponse, PricingRecommendation, InventoryRecommendation } from '../types';
import { Sparkles, DollarSign, Package, TrendingUp, HelpCircle, CheckCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

export const ProductInsights: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [xaiData, setXaiData] = useState<ExplainabilityResponse | null>(null);
  const [pricingData, setPricingData] = useState<PricingRecommendation | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryRecommendation | null>(null);
  const [forecastTimeline, setForecastTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts()
      .then((prods) => {
        setProducts(prods);
        if (prods.length > 0) {
          setSelectedProductId(prods[0].product_id);
        }
      })
      .catch(console.error);

    fetchExplainability()
      .then(setXaiData)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedProductId) return;

    setLoading(true);
    Promise.all([
      fetchPricingRecommendations('ALL', 'ALL'),
      fetchInventoryRecommendations('ALL', 'ALL', 'ALL'),
      fetchForecast('ALL', selectedProductId, 'ALL', 30)
    ])
      .then(([prList, invList, fcData]) => {
        const pMatch = prList.find((p) => p.product_id === selectedProductId) || prList[0];
        const iMatch = invList.find((i) => i.product_id === selectedProductId) || invList[0];

        setPricingData(pMatch);
        setInventoryData(iMatch);
        setForecastTimeline(fcData.timeline.slice(-60));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedProductId]);

  const selectedProduct = products.find((p) => p.product_id === selectedProductId);

  return (
    <div className="space-y-6">
      {/* Title & Product Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" /> Unified Product Insights & Explainable AI (SHAP)
            </h1>
            <p className="text-xs text-slate-400">
              Deep dive single SKU analytics combining demand, pricing, inventory, and tree SHAP feature attributions.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Select SKU Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-indigo-300 font-bold text-xs rounded-xl px-4 py-2 focus:outline-none min-w-[220px]"
            >
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name} ({p.category})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading || !selectedProduct ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          {/* SKU Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 block">Current Selling Price</span>
              <span className="text-2xl font-bold text-white mt-1 block">${selectedProduct.selling_price}</span>
              <span className="text-[11px] text-slate-400 mt-1 block">Cost Price: ${selectedProduct.cost_price}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 block">Recommended Price</span>
              <span className="text-2xl font-bold text-emerald-400 mt-1 block">${pricingData?.recommended_price || selectedProduct.selling_price}</span>
              <span className="text-[11px] text-emerald-400 mt-1 block font-semibold">
                Expected Profit: ${pricingData?.expected_profit || 0}/day
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 block">Current Inventory Stock</span>
              <span className="text-2xl font-bold text-white mt-1 block">{inventoryData?.current_stock || 0} units</span>
              <span className="text-[11px] text-slate-400 mt-1 block">Safety Stock: {inventoryData?.safety_stock || 0}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 block">Recommended Reorder</span>
              <span className="text-2xl font-bold text-amber-400 mt-1 block">+{inventoryData?.recommended_order_quantity || 0} units</span>
              <span className="text-[11px] text-amber-400 mt-1 block font-semibold">Reorder Point: {inventoryData?.reorder_point || 0}</span>
            </div>
          </div>

          {/* SKU Demand Chart */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-base font-semibold text-white mb-2">{selectedProduct.product_name} - Demand Forecast Timeline</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Line type="monotone" dataKey="actual_demand" name="Historical Sales" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="forecasted_demand" name="Ensemble Forecast" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SHAP Explainability Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SHAP Feature Attributions Bar Chart */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> SHAP Feature Impact Attributions
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Mean absolute SHAP value contributions explaining model predictions.
              </p>
              {xaiData && (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={xaiData.feature_attributions.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" stroke="#64748b" fontSize={11} />
                      <YAxis dataKey="feature" type="category" stroke="#64748b" fontSize={11} width={130} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="mean_shap_value" fill="#818cf8" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Viva & Academic Explainability Q&A Cards */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" /> Academic Explainable AI Rationale
              </h2>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h4 className="text-xs font-bold text-indigo-300">What factors influenced the demand forecast?</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                   SHAP feature importance reveals that historical 7-day rolling sales (<code className="text-indigo-400">rolling_mean_7</code>), selling price discount (<code className="text-indigo-400">discount_percent</code>), and weekend indicators (<code className="text-indigo-400">is_weekend</code>) exert the highest marginal effect on predicted sales volume.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h4 className="text-xs font-bold text-emerald-300">What factors influenced the pricing recommendation?</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  The pricing engine simulates sales across candidate multipliers around current selling price, evaluating price elasticity. Recommended price <span className="text-emerald-400 font-bold">${pricingData?.recommended_price}</span> maximizes net margin <code className="text-emerald-400">(Price - Cost) × Forecasted Demand</code> while enforcing the strict constraint that selling price never falls below cost price (${selectedProduct.cost_price}).
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h4 className="text-xs font-bold text-amber-300">What factors influenced the inventory recommendation?</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Safety stock (<code className="text-amber-400">{inventoryData?.safety_stock}</code> units) is computed using lead-time demand variability for a 95% service level factor. Reorder Point (ROP = {inventoryData?.reorder_point}) triggers order quantity (+{inventoryData?.recommended_order_quantity} units) whenever current stock drops below lead-time demand.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
