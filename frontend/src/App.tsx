import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { GlobalFilterBar } from './components/GlobalFilterBar';
import { ExecutiveOverview } from './pages/ExecutiveOverview';
import { DemandForecasting } from './pages/DemandForecasting';
import { DynamicPricing } from './pages/DynamicPricing';
import { InventoryOptimization } from './pages/InventoryOptimization';
import { ModelPerformance } from './pages/ModelPerformance';
import { ProductInsights } from './pages/ProductInsights';
import { DataManagement } from './pages/DataManagement';

import {
  fetchStores,
  fetchCategories,
  fetchProducts,
  fetchActiveDataset,
  switchToDemoDataset
} from './services/api';
import { Store, Category, Product, ActiveDatasetConfig } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState('overview');

  // Metadata & Filters
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState('ALL');
  
  // Active Dataset Configuration
  const [activeConfig, setActiveConfig] = useState<ActiveDatasetConfig | null>(null);

  useEffect(() => {
    loadMetadata();
    loadActiveConfig();
  }, [activeTab]);

  const loadMetadata = () => {
    Promise.all([fetchStores(), fetchCategories(), fetchProducts()])
      .then(([s, c, p]) => {
        setStores(s);
        setCategories(c);
        setProducts(p);
      })
      .catch(console.error);
  };

  const loadActiveConfig = () => {
    fetchActiveDataset()
      .then(setActiveConfig)
      .catch(console.error);
  };

  const handleSwitchToDemo = async () => {
    try {
      await switchToDemoDataset();
      loadMetadata();
      loadActiveConfig();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectInventoryFilter = (statusKey: string) => {
    setActiveTab('inventory');
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <ExecutiveOverview
            selectedStore={selectedStore}
            selectedCategory={selectedCategory}
            selectedProduct={selectedProduct}
            onSelectInventoryFilter={handleSelectInventoryFilter}
          />
        );
      case 'forecasting':
        return (
          <DemandForecasting />
        );
      case 'pricing':
        return (
          <DynamicPricing />
        );
      case 'inventory':
        return (
          <InventoryOptimization
            selectedStore={selectedStore}
            selectedCategory={selectedCategory}
            selectedProduct={selectedProduct}
          />
        );
      case 'performance':
        return <ModelPerformance />;
      case 'insights':
        return <ProductInsights />;
      case 'management':
        return <DataManagement />;
      default:
        return (
          <ExecutiveOverview
            selectedStore={selectedStore}
            selectedCategory={selectedCategory}
            selectedProduct={selectedProduct}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeDatasetName={activeConfig?.display_name || 'Demo Dataset'}
        activeMode={activeConfig?.active_mode || 'demo'}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Render Global Filter Bar on analytical pages */}
        {activeTab !== 'management' && (
          <GlobalFilterBar
            stores={stores}
            categories={categories}
            products={products}
            selectedStore={selectedStore}
            setSelectedStore={setSelectedStore}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
            activeDatasetName={activeConfig?.display_name || 'Demo Dataset'}
            activeMode={activeConfig?.active_mode || 'demo'}
            onSwitchToDemo={handleSwitchToDemo}
            onOpenDataManagement={() => setActiveTab('management')}
          />
        )}

        {renderActivePage()}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        DemandIQ Retail Analytics Platform • Database-Free File Storage Architecture (`CSV` / `Parquet` / `JSON` / `Joblib`)
      </footer>
    </div>
  );
}

export default App;
