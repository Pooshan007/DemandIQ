import React, { useEffect, useState } from 'react';
import { fetchMetrics } from '../services/api';
import { MetricsResponse } from '../types';
import { Cpu, Award, Zap, Layers } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const ModelPerformance: React.FC = () => {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const ensembleWeights = Object.entries(data.ensemble_config.weights || {}).map(([name, weight]) => ({
    name,
    weight: Math.round(weight * 100),
  }));

  const pieColors = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Title & Architecture Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-400" /> Machine Learning Model Evaluation & Ensemble Weights
        </h1>
        <p className="text-xs text-slate-400">
          Chronological out-of-fold validation metrics across 5 base regressors and optimal SLSQP weighted ensemble.
        </p>
      </div>

      {/* Model Metrics Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-purple-400" /> Model Performance Comparison Matrix
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400">
              <tr>
                <th className="p-3">Model Architecture</th>
                <th className="p-3 text-right">MAE</th>
                <th className="p-3 text-right">RMSE</th>
                <th className="p-3 text-right">R² Score</th>
                <th className="p-3 text-right">MAPE (%)</th>
                <th className="p-3 text-right">WAPE (%)</th>
                <th className="p-3 text-right">SMAPE (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.metrics.map((row, idx) => {
                const isEnsemble = row.Model === 'Weighted Ensemble';
                return (
                  <tr
                    key={idx}
                    className={
                      isEnsemble
                        ? 'bg-purple-950/40 font-bold text-purple-200 border-l-4 border-l-purple-500'
                        : 'hover:bg-slate-800/40'
                    }
                  >
                    <td className="p-3 flex items-center gap-2">
                      {isEnsemble && <Zap className="w-4 h-4 text-purple-400" />}
                      <span>{row.Model}</span>
                      {isEnsemble && <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded-full border border-purple-500/40">Best</span>}
                    </td>
                    <td className="p-3 text-right font-mono">{row.MAE}</td>
                    <td className="p-3 text-right font-mono">{row.RMSE}</td>
                    <td className={`p-3 text-right font-mono font-bold ${isEnsemble ? 'text-emerald-400' : 'text-slate-200'}`}>{row.R2}</td>
                    <td className="p-3 text-right font-mono">{row.MAPE}%</td>
                    <td className="p-3 text-right font-mono">{row.WAPE}%</td>
                    <td className="p-3 text-right font-mono">{row.SMAPE}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ensemble Weights & Feature Importance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ensemble Weight Distribution */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" /> Optimal Ensemble Weight Allocation
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Weights computed via SLSQP optimization minimizing validation RMSE.
          </p>
          <div className="h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ensembleWeights} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="weight">
                  {ensembleWeights.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2 text-xs">
            {ensembleWeights.map((e, idx) => (
              <div key={e.name} className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pieColors[idx] }}></span>
                  {e.name}
                </span>
                <span className="font-mono font-bold text-white">{e.weight}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Importance Ranking */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-base font-semibold text-white mb-2">Top 10 Feature Importance Ranking</h2>
          <p className="text-xs text-slate-400 mb-4">Average relative feature importance across base decision trees.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.feature_importance.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis dataKey="Feature" type="category" stroke="#64748b" fontSize={11} width={140} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Bar dataKey="Importance" fill="#c084fc" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
