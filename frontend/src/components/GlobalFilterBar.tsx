import React from 'react';
import { Filter, Store, Tag, ShoppingBag, Database, RefreshCw } from 'lucide-react';
import { Product, Store as StoreType, Category } from '../types';

interface GlobalFilterBarProps {
  stores: StoreType[];
  categories: Category[];
  products: Product[];
  selectedStore: string;
  setSelectedStore: (val: string) => void;
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  selectedProduct: string;
  setSelectedProduct: (val: string) => void;
  activeDatasetName: string;
  activeMode: 'demo' | 'user';
  onSwitchToDemo: () => void;
  onOpenDataManagement: () => void;
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  stores,
  categories,
  products,
  selectedStore,
  setSelectedStore,
  selectedCategory,
  setSelectedCategory,
  selectedProduct,
  setSelectedProduct,
  activeDatasetName,
  activeMode,
  onSwitchToDemo,
  onOpenDataManagement,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6 shadow-md backdrop-blur-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Global Filter Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider pr-2 border-r border-slate-800">
            <Filter className="w-3.5 h-3.5 text-indigo-400" /> Filters
          </div>

          {/* Store Selector */}
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Stores</option>
              {stores.map((s) => (
                <option key={s.store_id} value={s.store_id} className="bg-slate-900 text-white">
                  {s.store_name} ({s.store_location})
                </option>
              ))}
            </select>
          </div>

          {/* Category Selector */}
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Categories</option>
              {categories.map((c) => (
                <option key={c.category} value={c.category} className="bg-slate-900 text-white">
                  {c.category}
                </option>
              ))}
            </select>
          </div>

          {/* Product Selector */}
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 max-w-[200px]">
            <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none truncate cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Products</option>
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id} className="bg-slate-900 text-white">
                  {p.product_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dataset Controls & Mode Status */}
        <div className="flex items-center space-x-2">
          {activeMode === 'user' ? (
            <button
              onClick={onSwitchToDemo}
              className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
              title="Switch back to built-in Demo Retail Dataset"
            >
              <RefreshCw className="w-3 h-3 text-indigo-400" /> Use Demo Dataset
            </button>
          ) : (
            <button
              onClick={onOpenDataManagement}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
            >
              <Database className="w-3 h-3" /> Upload Custom Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
