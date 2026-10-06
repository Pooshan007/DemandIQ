"""
Dynamic Pricing Recommendation Engine.
Evaluates candidate price points around current selling price using demand forecasting model predictions.
Calculates expected revenue and profit while enforcing cost bounds (Price >= Cost).
Outputs pricing recommendations to data/pricing/pricing_recommendations.csv.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from ml.forecasting.forecast_engine import DemandForecaster

class PricingEngine:
    def __init__(self, data_path: str = os.path.join("data", "processed", "engineered_features.parquet")):
        self.data_path = data_path
        self.forecaster = DemandForecaster()

    def optimize_prices(self) -> pd.DataFrame:
        """
        Evaluates pricing strategy across latest store & product records.
        """
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Processed dataset not found at {self.data_path}")
            
        df = pd.read_parquet(self.data_path)
        df["date"] = pd.to_datetime(df["date"])
        
        # Take latest record per (store_id, product_id)
        latest_df = df.sort_values(by="date").groupby(["store_id", "product_id"]).last().reset_index()
        
        # Ensure categorical encodings exist
        cat_cols = ["store_id", "product_id", "category", "store_location"]
        for col in cat_cols:
            enc_col = f"{col}_encoded"
            if enc_col not in latest_df.columns and col in latest_df.columns:
                if col in self.forecaster.label_encoders:
                    le = self.forecaster.label_encoders[col]
                    mapping = {val: idx for idx, val in enumerate(le.classes_)}
                    latest_df[enc_col] = latest_df[col].map(mapping).fillna(0).astype(int)
                else:
                    latest_df[enc_col] = 0
        
        recommendations = []
        feature_cols = self.forecaster.ensemble_config["features_used"]
        weights = self.forecaster.ensemble_config["weights"]
        
        # Price multiplier candidates (-20% to +25%)
        multipliers = [0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20, 1.25]
        
        for idx, row in latest_df.iterrows():
            current_price = float(row["selling_price"])
            cost_price = float(row["cost_price"])
            stock = int(row["stock_on_hand"])
            
            best_price = current_price
            best_profit = -1e9
            best_demand = 0
            best_revenue = 0
            
            candidate_results = []
            
            for m in multipliers:
                cand_price = round(current_price * m, 2)
                # Constraint: Price cannot be below cost price
                if cand_price < cost_price:
                    cand_price = round(cost_price * 1.05, 2)
                    
                row_copy = row.copy()
                row_copy["selling_price"] = cand_price
                row_copy["price_margin"] = cand_price - cost_price
                row_copy["price_margin_ratio"] = (cand_price - cost_price) / cost_price
                
                # Predict expected demand
                X_cand = pd.DataFrame([row_copy[feature_cols]])
                
                cand_demand = 0.0
                for name, model in self.forecaster.models.items():
                    w = weights.get(name, 0.0)
                    if w > 0:
                        p = model.predict(X_cand)[0]
                        cand_demand += w * max(0, p)
                        
                cand_demand = round(float(cand_demand), 2)
                revenue = round(cand_price * cand_demand, 2)
                profit = round((cand_price - cost_price) * cand_demand, 2)
                
                candidate_results.append({
                    "price": cand_price,
                    "demand": cand_demand,
                    "revenue": revenue,
                    "profit": profit
                })
                
                if profit > best_profit:
                    best_profit = profit
                    best_price = cand_price
                    best_demand = cand_demand
                    best_revenue = revenue
                    
            price_change_pct = round(((best_price - current_price) / current_price) * 100, 2)
            
            # Recommendation rationale
            if price_change_pct > 2.0:
                reason = f"High demand inelasticity detected. Increasing price by {price_change_pct}% maximizes expected daily profit to ${best_profit:,.2f}."
            elif price_change_pct < -2.0:
                reason = f"High price sensitivity. Discounting price by {abs(price_change_pct)}% stimulates volume and increases total daily profit to ${best_profit:,.2f}."
            else:
                reason = f"Current price is at the optimal profit-maximizing point of ${current_price:,.2f}."
                
            recommendations.append({
                "store_id": row["store_id"],
                "store_name": row["store_name"],
                "product_id": row["product_id"],
                "product_name": row["product_name"],
                "category": row["category"],
                "cost_price": cost_price,
                "current_price": current_price,
                "recommended_price": best_price,
                "price_change_pct": price_change_pct,
                "expected_demand": best_demand,
                "expected_revenue": best_revenue,
                "expected_profit": best_profit,
                "stock_on_hand": stock,
                "recommendation_reason": reason
            })
            
        rec_df = pd.DataFrame(recommendations)
        return rec_df

    def save_recommendations(self, rec_df: pd.DataFrame, output_path: str = os.path.join("data", "pricing", "pricing_recommendations.csv")) -> str:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        rec_df.to_csv(output_path, index=False)
        print(f"[DYNAMIC PRICING] Generated & saved pricing recommendations ({len(rec_df)} items) to {output_path}")
        return output_path

if __name__ == "__main__":
    engine = PricingEngine()
    df_rec = engine.optimize_prices()
    engine.save_recommendations(df_rec)
