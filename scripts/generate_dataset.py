"""
Synthetic Retail Analytics Dataset Generator
Generates realistic multi-store, multi-product daily sales, inventory, and pricing data.
Stored in data/raw/retail_data.csv without database dependency.
"""

import os
import numpy as np
import pandas as pd

def generate_retail_dataset():
    np.random.seed(42)
    
    # Configuration
    dates = pd.date_range(start="2024-01-01", end="2025-12-31", freq="D")
    
    stores = [
        {"id": "STORE_01", "name": "Downtown Central", "location": "Central", "mult": 1.3},
        {"id": "STORE_02", "name": "Suburban Hub", "location": "North", "mult": 1.0},
        {"id": "STORE_03", "name": "Metro Square", "location": "East", "mult": 1.25},
        {"id": "STORE_04", "name": "Outlet Mall", "location": "West", "mult": 0.85},
        {"id": "STORE_05", "name": "Flagship Store", "location": "South", "mult": 1.4},
    ]
    
    products = [
        {"id": "PRD_001", "name": "Smartphone X1", "category": "Electronics", "cost": 400.0, "base_price": 599.0, "lead_time": 7, "base_demand": 25},
        {"id": "PRD_002", "name": "Wireless Headphones Pro", "category": "Electronics", "cost": 60.0, "base_price": 129.0, "lead_time": 5, "base_demand": 45},
        {"id": "PRD_003", "name": "4K Smart TV 55in", "category": "Electronics", "cost": 350.0, "base_price": 549.0, "lead_time": 10, "base_demand": 15},
        {"id": "PRD_004", "name": "Mens Casual Jacket", "category": "Apparel", "cost": 25.0, "base_price": 59.99, "lead_time": 4, "base_demand": 35},
        {"id": "PRD_005", "name": "Running Shoes Ultra", "category": "Apparel", "cost": 35.0, "base_price": 89.99, "lead_time": 5, "base_demand": 50},
        {"id": "PRD_006", "name": "Designer Denim Jeans", "category": "Apparel", "cost": 30.0, "base_price": 69.99, "lead_time": 4, "base_demand": 40},
        {"id": "PRD_007", "name": "Espresso Coffee Machine", "category": "Home & Kitchen", "cost": 90.0, "base_price": 189.0, "lead_time": 8, "base_demand": 20},
        {"id": "PRD_008", "name": "Non-Stick Cookware Set", "category": "Home & Kitchen", "cost": 45.0, "base_price": 99.0, "lead_time": 6, "base_demand": 30},
        {"id": "PRD_009", "name": "Organic Coffee Beans 1kg", "category": "Grocery", "cost": 8.0, "base_price": 19.99, "lead_time": 3, "base_demand": 80},
        {"id": "PRD_010", "name": "Premium Olive Oil 1L", "category": "Grocery", "cost": 6.5, "base_price": 14.99, "lead_time": 3, "base_demand": 65},
    ]
    
    records = []
    
    for store in stores:
        for product in products:
            # Maintain stateful stock tracker
            current_stock = int(product["base_demand"] * store["mult"] * np.random.uniform(7, 14))
            
            for date in dates:
                # 1. Day of week & Monthly seasonality
                day_of_week = date.dayofweek
                weekend_mult = 1.35 if day_of_week in [5, 6] else (1.15 if day_of_week == 4 else 0.9)
                
                month = date.month
                if month in [11, 12]:
                    month_mult = 1.55 # Holiday peak
                elif month in [6, 7]:
                    month_mult = 1.15 # Summer boost
                elif month in [1, 2]:
                    month_mult = 0.85 # Post-holiday dip
                else:
                    month_mult = 1.0
                
                # 2. Promotion & Discount simulation
                is_promo = 1 if np.random.rand() < 0.15 else 0
                if is_promo:
                    discount_pct = np.random.choice([10.0, 15.0, 20.0, 25.0, 30.0])
                else:
                    discount_pct = np.random.choice([0.0, 0.0, 0.0, 5.0])
                
                selling_price = round(product["base_price"] * (1.0 - discount_pct / 100.0), 2)
                
                # 3. Price elasticity factor
                price_ratio = selling_price / product["base_price"]
                # Elasticity factor: lower price -> higher demand
                elasticity_mult = (1.0 / price_ratio) ** 1.5
                promo_mult = 1.4 if is_promo else 1.0
                
                # 4. Expected demand calculation
                expected_demand = (
                    product["base_demand"]
                    * store["mult"]
                    * weekend_mult
                    * month_mult
                    * elasticity_mult
                    * promo_mult
                )
                
                # Add Poisson / Gaussian noise
                actual_demand = max(0, int(np.random.poisson(expected_demand)))
                
                # 5. Inventory constraints
                units_sold = min(actual_demand, current_stock)
                current_stock -= units_sold
                
                # Inventory replenishment simulation (reorder when stock <= 3 days of base demand)
                reorder_threshold = int(product["base_demand"] * store["mult"] * 3)
                if current_stock <= reorder_threshold:
                    replenishment = int(product["base_demand"] * store["mult"] * np.random.uniform(10, 15))
                    current_stock += replenishment
                
                records.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "store_id": store["id"],
                    "store_name": store["name"],
                    "store_location": store["location"],
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "category": product["category"],
                    "cost_price": product["cost"],
                    "selling_price": selling_price,
                    "discount_percent": discount_pct,
                    "is_promotion": is_promo,
                    "units_sold": units_sold,
                    "stock_on_hand": current_stock,
                    "supplier_lead_time_days": product["lead_time"]
                })

    df = pd.DataFrame(records)
    output_path = os.path.join("data", "raw", "retail_data.csv")
    df.to_csv(output_path, index=False)
    print(f"[SUCCESS] Dataset generated with {len(df)} rows across {len(stores)} stores and {len(products)} products.")
    print(f"Saved to: {output_path}")

if __name__ == "__main__":
    generate_retail_dataset()
