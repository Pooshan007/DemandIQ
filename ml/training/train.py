"""
Model Training & Ensemble Optimization Module.
Trains Random Forest, XGBoost, LightGBM, CatBoost, and Gradient Boosting regressors.
Uses chronological time-series splitting and optimizes weighted ensemble weights.
Saves joblib binaries, ensemble config JSON, and performance metrics CSV.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from catboost import CatBoostRegressor

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from ml.evaluation.metrics import calculate_metrics

class ModelTrainer:
    def __init__(self, data_path: str = os.path.join("data", "processed", "engineered_features.parquet")):
        self.data_path = data_path
        self.label_encoders = {}
        self.models = {}
        self.ensemble_weights = {}

    def prepare_data(self):
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Engineered dataset not found at {self.data_path}")
            
        df = pd.read_parquet(self.data_path)
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values(by="date").reset_index(drop=True)
        
        # Categorical Label Encoding
        cat_cols = ["store_id", "product_id", "category", "store_location"]
        for col in cat_cols:
            le = LabelEncoder()
            df[f"{col}_encoded"] = le.fit_transform(df[col])
            self.label_encoders[col] = le
            
        feature_cols = [
            "selling_price", "cost_price", "discount_percent", "is_promotion",
            "stock_on_hand", "supplier_lead_time_days", "year", "month", "day",
            "dayofweek", "quarter", "is_weekend", "weekofyear",
            "lag_1", "lag_7", "lag_14", "lag_28",
            "rolling_mean_7", "rolling_mean_14", "rolling_mean_28",
            "rolling_std_7", "rolling_std_14", "rolling_std_28",
            "price_margin", "price_margin_ratio", "price_change",
            "store_id_encoded", "product_id_encoded", "category_encoded", "store_location_encoded"
        ]
        
        target_col = "units_sold"
        
        # Chronological split. Preserve the original 2024–2025 boundaries when
        # they are applicable; otherwise derive boundaries from the uploaded
        # dataset so newer/older/custom date ranges remain trainable.
        date_min = df["date"].min()
        date_max = df["date"].max()
        fixed_masks = (
            date_min < pd.Timestamp("2025-09-01")
            and date_max >= pd.Timestamp("2025-11-01")
        )

        if fixed_masks:
            train_mask = df["date"] < "2025-09-01"
            val_mask = (df["date"] >= "2025-09-01") & (df["date"] < "2025-11-01")
            test_mask = df["date"] >= "2025-11-01"
        else:
            unique_dates = pd.Series(df["date"].drop_duplicates().sort_values().to_numpy())
            if len(unique_dates) < 3:
                raise ValueError(
                    "The uploaded dataset needs at least 3 distinct dates for "
                    "chronological train/validation/test splits."
                )
            train_end = unique_dates.iloc[max(0, int(len(unique_dates) * 0.70) - 1)]
            val_end = unique_dates.iloc[max(1, int(len(unique_dates) * 0.85) - 1)]
            train_mask = df["date"] <= train_end
            val_mask = (df["date"] > train_end) & (df["date"] <= val_end)
            test_mask = df["date"] > val_end

        if not train_mask.any() or not val_mask.any() or not test_mask.any():
            raise ValueError(
                "The uploaded dataset does not contain enough chronological data "
                "for non-empty train, validation, and test sets."
            )
        
        X_train, y_train = df.loc[train_mask, feature_cols], df.loc[train_mask, target_col].values
        X_val, y_val = df.loc[val_mask, feature_cols], df.loc[val_mask, target_col].values
        X_test, y_test = df.loc[test_mask, feature_cols], df.loc[test_mask, target_col].values
        
        return {
            "df": df,
            "feature_cols": feature_cols,
            "X_train": X_train, "y_train": y_train,
            "X_val": X_val, "y_val": y_val,
            "X_test": X_test, "y_test": y_test
        }

    def train_all_models(self, data: dict):
        X_train, y_train = data["X_train"], data["y_train"]
        X_val, y_val = data["X_val"], data["y_val"]
        X_test, y_test = data["X_test"], data["y_test"]
        
        print("[TRAINING] Training 5 Base Ensemble Regressors...")
        
        # 1. Random Forest
        print("  -> Training Random Forest...")
        rf = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
        rf.fit(X_train, y_train)
        self.models["Random Forest"] = rf
        
        # 2. XGBoost
        print("  -> Training XGBoost...")
        xgb = XGBRegressor(n_estimators=100, max_depth=6, learning_rate=0.08, random_state=42, n_jobs=-1)
        xgb.fit(X_train, y_train)
        self.models["XGBoost"] = xgb
        
        # 3. LightGBM
        print("  -> Training LightGBM...")
        lgb = LGBMRegressor(n_estimators=100, max_depth=6, learning_rate=0.08, random_state=42, verbose=-1, n_jobs=-1)
        lgb.fit(X_train, y_train)
        self.models["LightGBM"] = lgb
        
        # 4. CatBoost
        print("  -> Training CatBoost...")
        cb = CatBoostRegressor(iterations=100, depth=6, learning_rate=0.08, random_seed=42, verbose=0)
        cb.fit(X_train, y_train)
        self.models["CatBoost"] = cb
        
        # 5. Gradient Boosting
        print("  -> Training Gradient Boosting...")
        gb = GradientBoostingRegressor(n_estimators=100, max_depth=5, learning_rate=0.08, random_state=42)
        gb.fit(X_train, y_train)
        self.models["Gradient Boosting"] = gb
        
        # Validation Predictions for Ensemble Weighting
        val_preds = {}
        for name, model in self.models.items():
            val_preds[name] = model.predict(X_val)
            
        # Optimize Ensemble Weights minimizing validation RMSE
        model_names = list(self.models.keys())
        val_matrix = np.column_stack([val_preds[name] for name in model_names])
        
        def loss_func(weights):
            weights = np.array(weights)
            weights /= np.sum(weights) # Normalize
            pred = np.dot(val_matrix, weights)
            return np.sqrt(np.mean((y_val - pred) ** 2))
            
        init_weights = [1.0 / len(model_names)] * len(model_names)
        bounds = [(0, 1)] * len(model_names)
        constraints = ({'type': 'eq', 'fun': lambda w: 1.0 - sum(w)})
        
        opt_res = minimize(loss_func, init_weights, bounds=bounds, constraints=constraints, method='SLSQP')
        opt_w = opt_res.x / np.sum(opt_res.x)
        
        self.ensemble_weights = {name: round(float(w), 4) for name, w in zip(model_names, opt_w)}
        print(f"[ENSEMBLE WEIGHTS] {self.ensemble_weights}")
        
        # Test Set Evaluation
        metrics_list = []
        test_preds = {}
        
        for name, model in self.models.items():
            pred = model.predict(X_test)
            test_preds[name] = pred
            m = calculate_metrics(y_test, pred)
            m["Model"] = name
            metrics_list.append(m)
            
        # Compute Ensemble Predictions on Test Set
        test_matrix = np.column_stack([test_preds[name] for name in model_names])
        ensemble_pred = np.dot(test_matrix, opt_w)
        ens_m = calculate_metrics(y_test, ensemble_pred)
        ens_m["Model"] = "Weighted Ensemble"
        metrics_list.append(ens_m)
        
        metrics_df = pd.DataFrame(metrics_list)[["Model", "MAE", "RMSE", "R2", "MAPE", "WAPE", "SMAPE"]]
        
        # Save Metrics CSV
        os.makedirs("reports", exist_ok=True)
        metrics_path = os.path.join("reports", "model_metrics.csv")
        metrics_df.to_csv(metrics_path, index=False)
        print(f"[REPORTS] Model metrics saved to {metrics_path}")
        print("\n--- MODEL PERFORMANCE METRICS ---")
        print(metrics_df.to_string(index=False))
        
        # Feature Importance Analysis (Average across tree models)
        fi_dict = {col: 0.0 for col in data["feature_cols"]}
        for name, model in self.models.items():
            if hasattr(model, "feature_importances_"):
                imps = model.feature_importances_
                for col, imp in zip(data["feature_cols"], imps):
                    fi_dict[col] += imp / len(self.models)
                    
        fi_df = pd.DataFrame([{"Feature": k, "Importance": round(float(v), 6)} for k, v in fi_dict.items()])
        fi_df = fi_df.sort_values(by="Importance", ascending=False).reset_index(drop=True)
        fi_path = os.path.join("reports", "feature_importance.csv")
        fi_df.to_csv(fi_path, index=False)
        print(f"[REPORTS] Feature importance saved to {fi_path}")

    def save_artifacts(self):
        os.makedirs("models", exist_ok=True)
        
        # Save Joblib Binaries
        for name, model in self.models.items():
            fname = name.lower().replace(" ", "_") + ".joblib"
            path = os.path.join("models", fname)
            joblib.dump(model, path)
            print(f"[SAVED MODEL] {path}")
            
        # Save Label Encoders
        le_path = os.path.join("models", "label_encoders.joblib")
        joblib.dump(self.label_encoders, le_path)
        
        # Save Ensemble Config JSON
        config_path = os.path.join("models", "ensemble_config.json")
        config = {
            "model_names": list(self.models.keys()),
            "weights": self.ensemble_weights,
            "architecture": "Weighted Averaging Ensemble",
            "optimization_metric": "Validation RMSE",
            "features_used": [
                "selling_price", "cost_price", "discount_percent", "is_promotion",
                "stock_on_hand", "supplier_lead_time_days", "year", "month", "day",
                "dayofweek", "quarter", "is_weekend", "weekofyear",
                "lag_1", "lag_7", "lag_14", "lag_28",
                "rolling_mean_7", "rolling_mean_14", "rolling_mean_28",
                "rolling_std_7", "rolling_std_14", "rolling_std_28",
                "price_margin", "price_margin_ratio", "price_change",
                "store_id_encoded", "product_id_encoded", "category_encoded", "store_location_encoded"
            ]
        }
        with open(config_path, "w") as f:
            json.dump(config, f, indent=4)
        print(f"[SAVED CONFIG] {config_path}")

if __name__ == "__main__":
    trainer = ModelTrainer()
    data = trainer.prepare_data()
    trainer.train_all_models(data)
    trainer.save_artifacts()
