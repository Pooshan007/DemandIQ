"""
Demand Forecast Service.
Retrieves historical vs predicted forecasts and computes model performance comparison breakdowns.
"""

import os
import sys
import pandas as pd
import numpy as np
from backend.app.core.config import settings
from ml.forecasting.forecast_engine import DemandForecaster

class ForecastService:
    def __init__(self):
        self.forecaster = DemandForecaster(models_dir=settings.MODELS_DIR, data_path=settings.DATA_ENGINEERED_PATH)

    def get_forecast(self, store_id: str = "ALL", product_id: str = "ALL", category: str = "ALL", horizon_days: int = 30) -> dict:
        df = self.forecaster.generate_forecasts(store_id=store_id, product_id=product_id, category=category, horizon_days=horizon_days)
        
        # Aggregate daily demand time series for charts
        daily = df.groupby("date").agg(
            actual_demand=("units_sold", "sum"),
            forecasted_demand=("forecasted_demand", "sum"),
            pred_random_forest=("pred_random_forest", "sum"),
            pred_xgboost=("pred_xgboost", "sum"),
            pred_lightgbm=("pred_lightgbm", "sum"),
            pred_catboost=("pred_catboost", "sum"),
            pred_gradient_boosting=("pred_gradient_boosting", "sum")
        ).reset_index()
        
        daily["date"] = daily["date"].dt.strftime("%Y-%m-%d")
        
        # Separate Historical (up to latest date) and Future Projected Horizon
        history_records = daily.to_dict(orient="records")
        
        # Table preview records
        table_cols = ["date", "store_id", "product_name", "category", "units_sold", "forecasted_demand", "forecast_error"]
        table_records = df[table_cols].tail(100).to_dict(orient="records")
        
        return {
            "filters": {"store_id": store_id, "product_id": product_id, "category": category, "horizon_days": horizon_days},
            "timeline": history_records,
            "table": table_records
        }
