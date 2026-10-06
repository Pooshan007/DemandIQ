"""
Inventory Optimization Engine.
Computes Safety Stock, Reorder Point (ROP), Recommended Reorder Quantity (ROQ),
and Stock Statuses based on lead-time demand variability and forecasted 30-day demand.
Outputs recommendations to data/inventory/inventory_recommendations.csv.
"""

import os
import sys
import numpy as np
import pandas as pd
from scipy.stats import norm

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from ml.forecasting.forecast_engine import DemandForecaster

class InventoryEngine:
    def __init__(self, data_path: str = os.path.join("data", "processed", "engineered_features.parquet")):
        self.data_path = data_path
        self.forecaster = DemandForecaster()

    def optimize_inventory(self, service_level: float = 0.95) -> pd.DataFrame:
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Processed dataset not found at {self.data_path}")
            
        df = pd.read_parquet(self.data_path)
        df["date"] = pd.to_datetime(df["date"])
        
        # Z-score for service level (e.g. Z = 1.645 for 95%)
        z_score = norm.ppf(service_level)
        
        # Generate full forecasts across dataset
        forecast_df = self.forecaster.generate_forecasts()
        
        recommendations = []
        
        # Group by store_id and product_id
        grouped = forecast_df.groupby(["store_id", "product_id"])
        
        for (store_id, product_id), group in grouped:
            latest = group.sort_values(by="date").iloc[-1]
            
            # Historical daily demand stats over recent 60 days
            recent = group.tail(60)
            avg_daily_demand = max(0.1, float(recent["forecasted_demand"].mean()))
            std_daily_demand = max(0.1, float(recent["forecasted_demand"].std()))
            
            current_stock = int(latest["stock_on_hand"])
            lead_time = int(latest.get("supplier_lead_time_days", 5))
            
            # 30-Day Forecast Demand
            forecasted_30d_demand = round(avg_daily_demand * 30, 2)
            
            # Safety Stock: SS = Z * std_D * sqrt(L)
            safety_stock = int(np.ceil(z_score * std_daily_demand * np.sqrt(lead_time)))
            
            # Reorder Point: ROP = (Avg Daily Demand * Lead Time) + Safety Stock
            lead_time_demand = avg_daily_demand * lead_time
            reorder_point = int(np.ceil(lead_time_demand + safety_stock))
            
            # Recommended Order Quantity (ROQ)
            recommended_reorder_qty = int(max(0, np.ceil(reorder_point + forecasted_30d_demand - current_stock)))
            
            # Risk Probabilities
            # Stock-out risk: Probability that demand during lead time exceeds current stock
            lead_time_std = std_daily_demand * np.sqrt(lead_time)
            if lead_time_std > 0:
                stockout_risk_pct = round(float(1.0 - norm.cdf(current_stock, loc=lead_time_demand, scale=lead_time_std)) * 100, 2)
            else:
                stockout_risk_pct = 0.0 if current_stock >= lead_time_demand else 100.0
                
            stockout_risk_pct = float(np.clip(stockout_risk_pct, 0.0, 100.0))
            overstock_threshold = reorder_point + (1.5 * forecasted_30d_demand)
            overstock_risk_pct = round(float(norm.cdf(current_stock - overstock_threshold, loc=0, scale=max(1, std_daily_demand * 5))) * 100, 2)
            overstock_risk_pct = float(np.clip(overstock_risk_pct, 0.0, 100.0))
            
            # Deterministic Stock Status
            if current_stock <= safety_stock:
                status = "CRITICAL STOCK"
            elif current_stock <= reorder_point:
                status = "LOW STOCK"
            elif current_stock > overstock_threshold:
                status = "OVERSTOCKED"
            else:
                status = "OPTIMAL"
                
            recommendations.append({
                "store_id": store_id,
                "store_name": latest["store_name"],
                "product_id": product_id,
                "product_name": latest["product_name"],
                "category": latest["category"],
                "current_stock": current_stock,
                "supplier_lead_time_days": lead_time,
                "avg_daily_demand": round(avg_daily_demand, 2),
                "forecasted_30d_demand": forecasted_30d_demand,
                "safety_stock": safety_stock,
                "reorder_point": reorder_point,
                "recommended_order_quantity": recommended_reorder_qty,
                "stockout_risk_pct": stockout_risk_pct,
                "overstock_risk_pct": overstock_risk_pct,
                "stock_status": status
            })
            
        rec_df = pd.DataFrame(recommendations)
        return rec_df

    def save_recommendations(self, rec_df: pd.DataFrame, output_path: str = os.path.join("data", "inventory", "inventory_recommendations.csv")) -> str:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        rec_df.to_csv(output_path, index=False)
        print(f"[INVENTORY OPTIMIZATION] Generated & saved inventory recommendations ({len(rec_df)} items) to {output_path}")
        return output_path

if __name__ == "__main__":
    engine = InventoryEngine()
    df_rec = engine.optimize_inventory()
    engine.save_recommendations(df_rec)
