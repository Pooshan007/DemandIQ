"""
Master Inference Pipeline Script.
Executes demand forecasting, dynamic pricing optimization, inventory replenishment calculation, and SHAP explainability.
Saves outputs to file-based storage:
- data/forecasts/forecasts.csv
- data/pricing/pricing_recommendations.csv
- data/inventory/inventory_recommendations.csv
- reports/feature_shap_summary.json
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.forecasting.forecast_engine import DemandForecaster
from ml.pricing.pricing_engine import PricingEngine
from ml.inventory.inventory_engine import InventoryEngine
from ml.explainability.explainer import ModelExplainer

def run_inference_pipeline():
    print("==================================================")
    print("RETAIL ANALYTICS INFERENCE & OPTIMIZATION PIPELINE")
    print("==================================================")
    
    print("\n1. Generating Demand Forecasts...")
    forecaster = DemandForecaster()
    forecast_df = forecaster.generate_forecasts()
    forecast_path = forecaster.save_forecasts(forecast_df)
    
    print("\n2. Executing Dynamic Pricing Engine...")
    pricing_engine = PricingEngine()
    pricing_df = pricing_engine.optimize_prices()
    pricing_path = pricing_engine.save_recommendations(pricing_df)
    
    print("\n3. Executing Inventory Optimization Engine...")
    inventory_engine = InventoryEngine()
    inventory_df = inventory_engine.optimize_inventory()
    inventory_path = inventory_engine.save_recommendations(inventory_df)
    
    print("\n4. Running SHAP Explainability Engine...")
    explainer = ModelExplainer()
    explainer.explain_predictions()
    
    print("\n==================================================")
    print("[SUCCESS] All inference and optimization results saved to files.")
    print(f"  -> Forecasts: {forecast_path}")
    print(f"  -> Pricing:   {pricing_path}")
    print(f"  -> Inventory: {inventory_path}")
    print("==================================================")

if __name__ == "__main__":
    run_inference_pipeline()
