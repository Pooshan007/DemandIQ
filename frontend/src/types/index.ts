export interface Product {
  product_id: string;
  product_name: string;
  category: string;
  cost_price: number;
  selling_price: number;
}

export interface Store {
  store_id: string;
  store_name: string;
  store_location: string;
}

export interface Category {
  category: string;
  num_products: number;
}

export interface ActiveDatasetConfig {
  active_mode: 'demo' | 'user';
  filename: string;
  display_name: string;
  uploaded_at: string;
  column_mapping: Record<string, string>;
  is_trained: boolean;
  last_trained_at: string;
}

export interface UploadPreviewResponse {
  filename: string;
  saved_path: string;
  num_rows: number;
  num_cols: number;
  user_headers: string[];
  auto_mapped: Record<string, string>;
  missing_total: number;
  duplicate_rows: number;
  preview_records: Record<string, any>[];
  required_cols_spec: Record<string, string>;
  optional_cols_spec: Record<string, string>;
}

export interface ValidationItem {
  item: string;
  status: 'PASS' | 'WARN' | 'FAIL' | 'INFO';
  message: string;
}

export interface ValidationResponse {
  is_valid: boolean;
  checklist: ValidationItem[];
  total_rows: number;
  total_stores: number;
  total_products: number;
}

export interface DashboardOverview {
  kpis: {
    total_revenue: number;
    total_units_sold: number;
    total_profit: number;
    inventory_value: number;
    low_stock_items: number;
    overstock_items: number;
    forecast_accuracy_pct: number;
  };
  monthly_trends: Array<{
    date: string;
    revenue: number;
    units_sold: number;
    profit: number;
  }>;
  top_products: Array<{
    product_id: string;
    product_name: string;
    revenue: number;
    units_sold: number;
  }>;
  top_categories: Array<{
    category: string;
    revenue: number;
    units_sold: number;
  }>;
  inventory_status_breakdown: {
    critical: number;
    low: number;
    optimal: number;
    overstocked: number;
  };
}

export interface ForecastResponse {
  filters: {
    store_id: string;
    product_id: string;
    category: string;
    horizon_days: number;
  };
  timeline: Array<{
    date: string;
    actual_demand: number;
    forecasted_demand: number;
    pred_random_forest: number;
    pred_xgboost: number;
    pred_lightgbm: number;
    pred_catboost: number;
    pred_gradient_boosting: number;
  }>;
  table: Array<{
    date: string;
    store_id: string;
    product_name: string;
    category: string;
    units_sold: number;
    forecasted_demand: number;
    forecast_error: number;
  }>;
}

export interface PricingRecommendation {
  store_id: string;
  store_name: string;
  product_id: string;
  product_name: string;
  category: string;
  cost_price: number;
  current_price: number;
  recommended_price: number;
  price_change_pct: number;
  expected_demand: number;
  expected_revenue: number;
  expected_profit: number;
  stock_on_hand: number;
  recommendation_reason: string;
}

export interface InventoryRecommendation {
  store_id: string;
  store_name: string;
  product_id: string;
  product_name: string;
  category: string;
  current_stock: number;
  supplier_lead_time_days: number;
  avg_daily_demand: number;
  forecasted_30d_demand: number;
  safety_stock: number;
  reorder_point: number;
  recommended_order_quantity: number;
  stockout_risk_pct: number;
  overstock_risk_pct: number;
  stock_status: 'CRITICAL STOCK' | 'LOW STOCK' | 'OPTIMAL' | 'OVERSTOCKED';
}

export interface ModelMetric {
  Model: string;
  MAE: number;
  RMSE: number;
  R2: number;
  MAPE: number;
  WAPE: number;
  SMAPE: number;
}

export interface MetricsResponse {
  metrics: ModelMetric[];
  feature_importance: Array<{
    Feature: string;
    Importance: number;
  }>;
  ensemble_config: {
    model_names: string[];
    weights: Record<string, number>;
    architecture: string;
    optimization_metric: string;
  };
}

export interface ExplainabilityResponse {
  model_explained: string;
  sample_size: number;
  feature_attributions: Array<{
    feature: string;
    mean_shap_value: number;
  }>;
}
