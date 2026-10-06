"""
Core Backend Configuration Settings.
Defines file-based data paths and dynamic dataset resolution without external DB dependencies.
"""

import os
from backend.app.core.dataset_config import DatasetConfigManager

class Settings:
    PROJECT_NAME: str = "AI-Driven Intelligent Retail Analytics Platform"
    API_V1_STR: str = "/api"
    
    BASE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
    
    @property
    def DATA_RAW_PATH(self) -> str:
        return DatasetConfigManager.get_raw_data_path()
        
    DATA_PROCESSED_PATH: str = os.path.join(BASE_DIR, "data", "processed", "processed_retail_data.parquet")
    DATA_ENGINEERED_PATH: str = os.path.join(BASE_DIR, "data", "processed", "engineered_features.parquet")
    
    FORECASTS_PATH: str = os.path.join(BASE_DIR, "data", "forecasts", "forecasts.csv")
    PRICING_PATH: str = os.path.join(BASE_DIR, "data", "pricing", "pricing_recommendations.csv")
    INVENTORY_PATH: str = os.path.join(BASE_DIR, "data", "inventory", "inventory_recommendations.csv")
    
    METRICS_PATH: str = os.path.join(BASE_DIR, "reports", "model_metrics.csv")
    FEATURE_IMPORTANCE_PATH: str = os.path.join(BASE_DIR, "reports", "feature_importance.csv")
    EDA_SUMMARY_PATH: str = os.path.join(BASE_DIR, "reports", "eda_summary.json")
    SHAP_SUMMARY_PATH: str = os.path.join(BASE_DIR, "reports", "feature_shap_summary.json")
    
    MODELS_DIR: str = os.path.join(BASE_DIR, "models")
    ENSEMBLE_CONFIG_PATH: str = os.path.join(BASE_DIR, "models", "ensemble_config.json")

settings = Settings()
