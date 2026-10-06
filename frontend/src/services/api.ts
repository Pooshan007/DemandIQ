import type {
  DashboardOverview,
  Product,
  Store,
  Category,
  ForecastResponse,
  PricingRecommendation,
  InventoryRecommendation,
  MetricsResponse,
  ExplainabilityResponse,
  ActiveDatasetConfig,
  UploadPreviewResponse,
  ValidationResponse
} from '../types';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');

const parseApiError = async (res: Response, fallback: string): Promise<Error> => {
  try {
    const payload = await res.json();
    const detail = typeof payload?.detail === 'string' ? payload.detail : null;
    if (detail) return new Error(detail);
  } catch {
    // Response was not JSON; use the operation-specific fallback.
  }
  return new Error(`${fallback} (HTTP ${res.status})`);
};

export const fetchActiveDataset = async (): Promise<ActiveDatasetConfig> => {
  const res = await fetch(`${API_BASE}/data/active`);
  if (!res.ok) throw new Error('Failed to fetch active dataset config');
  return res.json();
};

export const uploadDatasetFile = async (file: File): Promise<UploadPreviewResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/data/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw await parseApiError(res, 'Failed to upload and preview dataset file');
  return res.json();
};

export const validateColumnMapping = async (
  columnMapping: Record<string, string>,
  filename: string
): Promise<ValidationResponse> => {
  const res = await fetch(`${API_BASE}/data/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, column_mapping: columnMapping }),
  });
  if (!res.ok) throw await parseApiError(res, 'Failed to validate dataset mapping');
  return res.json();
};

export const processAndTrainUserDataset = async (
  columnMapping: Record<string, string>,
  filename: string,
  displayName: string
) => {
  const res = await fetch(`${API_BASE}/data/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename,
      display_name: displayName,
      column_mapping: columnMapping,
    }),
  });
  if (!res.ok) throw await parseApiError(res, 'Failed to execute preprocessing and model retraining');
  return res.json();
};

export const switchToDemoDataset = async () => {
  const res = await fetch(`${API_BASE}/data/switch-demo`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to switch to Demo Dataset');
  return res.json();
};

export const fetchDashboardOverview = async (): Promise<DashboardOverview> => {
  const res = await fetch(`${API_BASE}/dashboard/overview`);
  if (!res.ok) throw new Error('Failed to fetch dashboard overview');
  return res.json();
};

export const fetchProducts = async (): Promise<Product[]> => {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
};

export const fetchStores = async (): Promise<Store[]> => {
  const res = await fetch(`${API_BASE}/stores`);
  if (!res.ok) throw new Error('Failed to fetch stores');
  return res.json();
};

export const fetchCategories = async (): Promise<Category[]> => {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
};

export const fetchForecast = async (
  storeId: string = 'ALL',
  productId: string = 'ALL',
  category: string = 'ALL',
  horizonDays: number = 30
): Promise<ForecastResponse> => {
  const res = await fetch(`${API_BASE}/forecast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      store_id: storeId,
      product_id: productId,
      category: category,
      horizon_days: horizonDays,
    }),
  });
  if (!res.ok) throw new Error('Failed to fetch forecast');
  return res.json();
};

export const fetchPricingRecommendations = async (
  storeId: string = 'ALL',
  category: string = 'ALL'
): Promise<PricingRecommendation[]> => {
  const res = await fetch(`${API_BASE}/pricing?store_id=${storeId}&category=${category}`);
  if (!res.ok) throw new Error('Failed to fetch pricing recommendations');
  return res.json();
};

export const simulatePricingCurve = async (productId: string, storeId: string = 'STORE_01') => {
  const res = await fetch(`${API_BASE}/pricing/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId, store_id: storeId, candidate_price: 0 }),
  });
  if (!res.ok) throw new Error('Failed to simulate pricing curve');
  return res.json();
};

export const fetchInventoryRecommendations = async (
  storeId: string = 'ALL',
  category: string = 'ALL',
  status: string = 'ALL'
): Promise<InventoryRecommendation[]> => {
  const res = await fetch(
    `${API_BASE}/inventory?store_id=${storeId}&category=${category}&status=${status}`
  );
  if (!res.ok) throw new Error('Failed to fetch inventory recommendations');
  return res.json();
};

export const fetchMetrics = async (): Promise<MetricsResponse> => {
  const res = await fetch(`${API_BASE}/metrics`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
};

export const fetchExplainability = async (): Promise<ExplainabilityResponse> => {
  const res = await fetch(`${API_BASE}/explainability`);
  if (!res.ok) throw new Error('Failed to fetch explainability report');
  return res.json();
};
