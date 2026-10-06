"""
Dynamic Pricing Service.
Provides optimal price recommendations and custom price simulation curves.
"""

import os
import pandas as pd
import numpy as np
from backend.app.core.config import settings

class PricingService:
    @staticmethod
    def get_pricing_recommendations(store_id: str = "ALL", category: str = "ALL") -> list:
        if not os.path.exists(settings.PRICING_PATH):
            from ml.pricing.pricing_engine import PricingEngine
            pe = PricingEngine(data_path=settings.DATA_ENGINEERED_PATH)
            rec_df = pe.optimize_prices()
            pe.save_recommendations(rec_df)
        else:
            rec_df = pd.read_csv(settings.PRICING_PATH)
            
        if store_id and store_id != "ALL":
            rec_df = rec_df[rec_df["store_id"] == store_id]
        if category and category != "ALL":
            rec_df = rec_df[rec_df["category"] == category]
            
        return rec_df.to_dict(orient="records")

    @staticmethod
    def simulate_price_curve(product_id: str, store_id: str = "STORE_01") -> dict:
        df = pd.read_parquet(settings.DATA_ENGINEERED_PATH)
        prod_row = df[(df["product_id"] == product_id) & (df["store_id"] == store_id)].iloc[-1]
        
        current_price = float(prod_row["selling_price"])
        cost_price = float(prod_row["cost_price"])
        base_demand = float(prod_row["units_sold"]) if prod_row["units_sold"] > 0 else 25.0
        
        points = []
        multipliers = [0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30]
        
        for m in multipliers:
            price = round(current_price * m, 2)
            if price < cost_price:
                price = round(cost_price * 1.05, 2)
                
            elasticity = 1.6
            ratio = price / current_price
            demand = round(max(5, base_demand * (1.0 / (ratio ** elasticity))), 1)
            revenue = round(price * demand, 2)
            profit = round((price - cost_price) * demand, 2)
            
            points.append({
                "price": price,
                "expected_demand": demand,
                "expected_revenue": revenue,
                "expected_profit": profit,
                "is_current": abs(price - current_price) < 0.01
            })
            
        return {
            "product_id": product_id,
            "product_name": prod_row["product_name"],
            "current_price": current_price,
            "cost_price": cost_price,
            "curve": points
        }
