"""
Demand Forecasting Inference Engine.
Loads saved models and ensemble configuration to generate historical and future demand forecasts.
Outputs predictions without retraining.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

class DemandForecaster:
    def __init__(self, models_dir: str = "models", data_path: str = os.path.join("data", "processed", "engineered_features.parquet")):
        self.models_dir = models_dir
        self.data_path = data_path
        self.models = {}
        self.label_encoders = {}
        self.ensemble_config = {}
        self.load_artifacts()

    def load_artifacts(self):
        config_path = os.path.join(self.models_dir, "ensemble_config.json")
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Ensemble config not found at {config_path}")
            
        with open(config_path, "r") as f:
            self.ensemble_config = json.load(f)
            
        for model_name in self.ensemble_config["model_names"]:
            fname = model_name.lower().replace(" ", "_") + ".joblib"
            path = os.path.join(self.models_dir, fname)
            if os.path.exists(path):
                self.models[model_name] = joblib.load(path)
                
        le_path = os.path.join(self.models_dir, "label_encoders.joblib")
        if os.path.exists(le_path):
            self.label_encoders = joblib.load(le_path)

    def generate_forecasts(self, store_id: str = None, product_id: str = None, category: str = None, horizon_days: int = 30) -> pd.DataFrame:
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Engineered data not found at {self.data_path}")
            
        df = pd.read_parquet(self.data_path)
        df["date"] = pd.to_datetime(df["date"])
        
        # Filtering
        if store_id and store_id != "ALL":
            df = df[df["store_id"] == store_id]
        if product_id and product_id != "ALL":
            df = df[df["product_id"] == product_id]
        if category and category != "ALL":
            df = df[df["category"] == category]
            
        # Ensure categorical encodings exist
        cat_cols = ["store_id", "product_id", "category", "store_location"]
        for col in cat_cols:
            enc_col = f"{col}_encoded"
            if enc_col not in df.columns and col in df.columns:
                if col in self.label_encoders:
                    # Transform using fitted label encoder, handling unseen classes
                    le = self.label_encoders[col]
                    mapping = {val: idx for idx, val in enumerate(le.classes_)}
                    df[enc_col] = df[col].map(mapping).fillna(0).astype(int)
                else:
                    df[enc_col] = 0

        feature_cols = self.ensemble_config["features_used"]
        X = df[feature_cols]
        
        # Generate individual model predictions
        preds = {}
        for name, model in self.models.items():
            preds[name] = np.clip(model.predict(X), 0, None)
            df[f"pred_{name.lower().replace(' ', '_')}"] = preds[name].round(2)
            
        # Ensemble Prediction
        weights = self.ensemble_config["weights"]
        ensemble_pred = np.zeros(len(df))
        for name, weight in weights.items():
            if name in preds:
                ensemble_pred += weight * preds[name]
                
        df["forecasted_demand"] = np.clip(ensemble_pred, 0, None).round(2)
        df["forecast_error"] = (df["units_sold"] - df["forecasted_demand"]).round(2)
        df["abs_error"] = np.abs(df["forecast_error"]).round(2)
        
        return df

    def save_forecasts(self, df: pd.DataFrame, output_path: str = os.path.join("data", "forecasts", "forecasts.csv")) -> str:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        cols_to_export = [
            "date", "store_id", "store_name", "product_id", "product_name", "category",
            "selling_price", "units_sold", "forecasted_demand", "forecast_error"
        ]
        export_df = df[cols_to_export].copy()
        export_df.to_csv(output_path, index=False)
        print(f"[FORECAST] Generated & saved forecasts ({len(export_df)} rows) to {output_path}")
        return output_path

if __name__ == "__main__":
    forecaster = DemandForecaster()
    forecast_df = forecaster.generate_forecasts()
    forecaster.save_forecasts(forecast_df)
