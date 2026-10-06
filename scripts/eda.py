"""
Exploratory Data Analysis (EDA) Script for Retail Analytics Platform.
Calculates statistical distributions, data quality checks, and business metrics.
Outputs results to reports/eda_summary.json and reports/eda_metrics.csv.
"""

import os
import json
import pandas as pd
import numpy as np

def run_eda():
    raw_path = os.path.join("data", "raw", "retail_data.csv")
    if not os.path.exists(raw_path):
        raise FileNotFoundError(f"Raw dataset not found at {raw_path}")
        
    df = pd.read_csv(raw_path)
    
    df["date"] = pd.to_datetime(df["date"])
    df["revenue"] = df["units_sold"] * df["selling_price"]
    df["total_cost"] = df["units_sold"] * df["cost_price"]
    df["profit"] = df["revenue"] - df["total_cost"]
    
    summary = {
        "dataset_name": "retail_data.csv",
        "num_rows": int(len(df)),
        "num_columns": int(len(df.columns)),
        "column_names": list(df.columns),
        "data_types": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "missing_values": {col: int(val) for col, val in df.isnull().sum().items()},
        "duplicate_rows": int(df.duplicated().sum()),
        "date_range": {
            "start": df["date"].min().strftime("%Y-%m-%d"),
            "end": df["date"].max().strftime("%Y-%m-%d"),
            "total_days": int((df["date"].max() - df["date"].min()).days + 1)
        },
        "business_overview": {
            "num_stores": int(df["store_id"].nunique()),
            "num_products": int(df["product_id"].nunique()),
            "num_categories": int(df["category"].nunique()),
            "total_units_sold": int(df["units_sold"].sum()),
            "total_revenue": round(float(df["revenue"].sum()), 2),
            "total_profit": round(float(df["profit"].sum()), 2),
            "average_selling_price": round(float(df["selling_price"].mean()), 2),
            "average_discount": round(float(df["discount_percent"].mean()), 2),
            "promotional_records": int(df["is_promotion"].sum())
        }
    }
    
    # Save JSON report
    report_json_path = os.path.join("reports", "eda_summary.json")
    with open(report_json_path, "w") as f:
        json.dump(summary, f, indent=4)
        
    # Save category summary CSV
    cat_df = df.groupby("category").agg(
        units_sold=("units_sold", "sum"),
        total_revenue=("revenue", "sum"),
        avg_price=("selling_price", "mean")
    ).reset_index()
    cat_df["total_revenue"] = cat_df["total_revenue"].round(2)
    cat_df["avg_price"] = cat_df["avg_price"].round(2)
    
    cat_df.to_csv(os.path.join("reports", "eda_metrics.csv"), index=False)
    
    print("[SUCCESS] EDA Completed successfully.")
    print(f"Total Rows: {summary['num_rows']}")
    print(f"Date Range: {summary['date_range']['start']} to {summary['date_range']['end']}")
    print(f"Total Revenue: ${summary['business_overview']['total_revenue']:,.2f}")
    print(f"Report saved to: {report_json_path}")

if __name__ == "__main__":
    run_eda()
