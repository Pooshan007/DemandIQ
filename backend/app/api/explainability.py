"""
Explainable AI (SHAP) API Endpoints.
"""

import os
import json
from fastapi import APIRouter
from backend.app.core.config import settings

router = APIRouter()

@router.get("/explainability")
def get_explainability_report():
    if not os.path.exists(settings.SHAP_SUMMARY_PATH):
        from ml.explainability.explainer import ModelExplainer
        explainer = ModelExplainer(models_dir=settings.MODELS_DIR, data_path=settings.DATA_ENGINEERED_PATH)
        return explainer.explain_predictions()
        
    with open(settings.SHAP_SUMMARY_PATH, "r") as f:
        data = json.load(f)
    return data
