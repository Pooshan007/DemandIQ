"""
Model Performance & Metrics API Endpoints.
"""

import os
import json
import pandas as pd
from fastapi import APIRouter
from backend.app.core.config import settings

router = APIRouter()

@router.get("/metrics")
def get_model_metrics():
    if not os.path.exists(settings.METRICS_PATH):
        return {"metrics": [], "ensemble_config": {}}
        
    metrics_df = pd.read_csv(settings.METRICS_PATH)
    fi_df = pd.read_csv(settings.FEATURE_IMPORTANCE_PATH) if os.path.exists(settings.FEATURE_IMPORTANCE_PATH) else pd.DataFrame()
    
    with open(settings.ENSEMBLE_CONFIG_PATH, "r") as f:
        ensemble_config = json.load(f)
        
    return {
        "metrics": metrics_df.to_dict(orient="records"),
        "feature_importance": fi_df.head(15).to_dict(orient="records"),
        "ensemble_config": ensemble_config
    }
