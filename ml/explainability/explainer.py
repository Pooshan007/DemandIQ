"""
Explainable AI (SHAP) Module.
Computes SHAP feature importance and instance-level SHAP values for model predictions.
Outputs explanation summaries to reports/feature_shap_summary.json.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
import shap

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

class ModelExplainer:
    def __init__(self, models_dir: str = "models", data_path: str = os.path.join("data", "processed", "engineered_features.parquet")):
        self.models_dir = models_dir
        self.data_path = data_path
        self.load_artifacts()

    def load_artifacts(self):
        config_path = os.path.join(self.models_dir, "ensemble_config.json")
        with open(config_path, "r") as f:
            self.config = json.load(f)
            
        xgb_path = os.path.join(self.models_dir, "xgboost.joblib")
        if not os.path.exists(xgb_path):
            rf_path = os.path.join(self.models_dir, "random_forest.joblib")
            self.model = joblib.load(rf_path)
        else:
            self.model = joblib.load(xgb_path)

    def explain_predictions(self, sample_size: int = 200) -> dict:
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Engineered dataset not found at {self.data_path}")
            
        df = pd.read_parquet(self.data_path)
        
        # Load label encoders if available
        le_path = os.path.join(self.models_dir, "label_encoders.joblib")
        label_encoders = joblib.load(le_path) if os.path.exists(le_path) else {}
        
        cat_cols = ["store_id", "product_id", "category", "store_location"]
        for col in cat_cols:
            enc_col = f"{col}_encoded"
            if enc_col not in df.columns and col in df.columns:
                if col in label_encoders:
                    le = label_encoders[col]
                    mapping = {val: idx for idx, val in enumerate(le.classes_)}
                    df[enc_col] = df[col].map(mapping).fillna(0).astype(int)
                else:
                    df[enc_col] = 0
                    
        feature_cols = self.config["features_used"]
        X_sample = df[feature_cols].tail(sample_size)
        
        # Initialize SHAP TreeExplainer
        explainer = shap.TreeExplainer(self.model)
        shap_values = explainer.shap_values(X_sample)
        
        mean_abs_shap = np.abs(shap_values).mean(axis=0)
        shap_importance = [
            {"feature": col, "mean_shap_value": round(float(val), 4)}
            for col, val in zip(feature_cols, mean_abs_shap)
        ]
        shap_importance = sorted(shap_importance, key=lambda x: x["mean_shap_value"], reverse=True)
        
        result = {
            "model_explained": self.model.__class__.__name__,
            "sample_size": sample_size,
            "feature_attributions": shap_importance[:15] # Top 15 features
        }
        
        os.makedirs("reports", exist_ok=True)
        out_path = os.path.join("reports", "feature_shap_summary.json")
        with open(out_path, "w") as f:
            json.dump(result, f, indent=4)
            
        print(f"[SHAP EXPLAINABILITY] Generated SHAP report saved to {out_path}")
        return result

if __name__ == "__main__":
    explainer = ModelExplainer()
    explainer.explain_predictions()
