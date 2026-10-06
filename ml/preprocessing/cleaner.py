"""
Data Preprocessing Pipeline for Retail Data.
Supports dynamic column mapping, optional field imputation, cleaning missing values,
and saving standardized datasets to Parquet/CSV.
"""

import os
import sys
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from backend.app.core.dataset_config import DatasetConfigManager

class DataPreprocessor:
    def __init__(self, raw_data_path: str = None, column_mapping: dict = None):
        self.raw_data_path = raw_data_path or DatasetConfigManager.get_raw_data_path()
        config = DatasetConfigManager.get_active_config()
        self.column_mapping = column_mapping or config.get("column_mapping", {})

    def load_and_clean(self) -> pd.DataFrame:
        """
        Loads raw dataset (CSV or XLSX), maps user columns to system columns,
        handles missing/invalid records, and imputes optional field defaults.
        """
        if not os.path.exists(self.raw_data_path):
            raise FileNotFoundError(f"Raw data file not found at {self.raw_data_path}")
            
        if self.raw_data_path.endswith(".xlsx") or self.raw_data_path.endswith(".xls"):
            df_raw = pd.read_excel(self.raw_data_path)
        else:
            df_raw = pd.read_csv(self.raw_data_path, encoding="utf-8-sig", sep=None, engine="python")
            
        # Reverse mapping: user_col -> system_col
        # column_mapping structure: { "system_col": "user_col" }
        rename_dict = {}
        for sys_col, user_col in self.column_mapping.items():
            if not user_col or user_col not in df_raw.columns:
                continue
            if user_col not in rename_dict:
                rename_dict[user_col] = sys_col
            elif sys_col == "product_id" and rename_dict[user_col] == "product_name":
                continue

        df = df_raw.rename(columns=rename_dict).copy()
        if "product_id" not in df.columns and "product_name" in df.columns:
            df["product_id"] = df["product_name"]

        # 1. Deduplication
        initial_count = len(df)
        df = df.drop_duplicates()
        dedup_count = len(df)
        if initial_count != dedup_count:
            print(f"[PREPROCESSING] Dropped {initial_count - dedup_count} duplicate rows.")
            
        # 2. Date Parsing & Chronological Sorting
        if "date" not in df.columns:
            raise KeyError("Required column 'date' is missing after column mapping.")
            
        date_values = df["date"].astype(str).str.strip()
        sample = date_values[date_values.ne("")].head(20)
        ddmmyyyy = bool(sample.str.match(r"^\d{1,2}[-/]\d{1,2}[-/]\d{4}$").all()) if len(sample) else False
        df["date"] = pd.to_datetime(df["date"], errors="coerce", dayfirst=ddmmyyyy)
        df = df.dropna(subset=["date"])
        
        # Ensure Required Identifiers
        if "store_id" not in df.columns:
            df["store_id"] = "STORE_01"
        if "product_id" not in df.columns:
            raise KeyError("Required column 'product_id' is missing after column mapping.")
            
        df["store_id"] = df["store_id"].astype(str)
        df["product_id"] = df["product_id"].astype(str)
        
        df = df.sort_values(by=["store_id", "product_id", "date"]).reset_index(drop=True)
        
        # 3. Numeric Conversions & Optional Column Imputation Defaults
        if "units_sold" not in df.columns:
            raise KeyError("Required column 'units_sold' is missing after column mapping.")
            
        df["units_sold"] = pd.to_numeric(df["units_sold"], errors="coerce").fillna(0).clip(lower=0).astype(int)
        
        # Selling price
        if "selling_price" in df.columns:
            df["selling_price"] = pd.to_numeric(df["selling_price"], errors="coerce").fillna(10.0).clip(lower=0.01)
        else:
            df["selling_price"] = 19.99
            
        # Cost price (Default to 70% of selling price if missing)
        if "cost_price" in df.columns:
            df["cost_price"] = pd.to_numeric(df["cost_price"], errors="coerce").fillna(df["selling_price"] * 0.70).clip(lower=0.01)
        else:
            df["cost_price"] = (df["selling_price"] * 0.70).round(2)
            
        # Discount percent
        if "discount_percent" in df.columns:
            df["discount_percent"] = pd.to_numeric(df["discount_percent"], errors="coerce").fillna(0.0).clip(lower=0.0, upper=100.0)
        else:
            df["discount_percent"] = 0.0
            
        # Is promotion
        if "is_promotion" in df.columns:
            df["is_promotion"] = pd.to_numeric(df["is_promotion"], errors="coerce").fillna(0).astype(int)
        else:
            df["is_promotion"] = 0
            
        # Stock on hand
        if "stock_on_hand" in df.columns:
            df["stock_on_hand"] = pd.to_numeric(df["stock_on_hand"], errors="coerce").fillna(50).clip(lower=0).astype(int)
        else:
            df["stock_on_hand"] = df["units_sold"].apply(lambda u: max(30, int(u * 5)))
            
        # Lead time
        if "supplier_lead_time_days" in df.columns:
            df["supplier_lead_time_days"] = pd.to_numeric(df["supplier_lead_time_days"], errors="coerce").fillna(5).clip(lower=1).astype(int)
        else:
            df["supplier_lead_time_days"] = 5
            
        # Descriptive Labels Defaults
        if "product_name" not in df.columns:
            df["product_name"] = df["product_id"]
        if "category" not in df.columns:
            df["category"] = "General"
        if "store_name" not in df.columns:
            df["store_name"] = df["store_id"]
        if "store_location" not in df.columns:
            df["store_location"] = "Main Location"
            
        # Derived business columns
        df["revenue"] = (df["units_sold"] * df["selling_price"]).round(2)
        df["total_cost"] = (df["units_sold"] * df["cost_price"]).round(2)
        df["profit"] = (df["revenue"] - df["total_cost"]).round(2)
        
        return df

    def save_processed(self, df: pd.DataFrame, output_dir: str = None) -> str:
        if output_dir is None:
            project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
            output_dir = os.path.join(project_root, "data", "processed")
        os.makedirs(output_dir, exist_ok=True)
        parquet_path = os.path.join(output_dir, "processed_retail_data.parquet")
        df.to_parquet(parquet_path, index=False)
        print(f"[PREPROCESSING] Saved clean data ({len(df)} rows) to {parquet_path}")
        return parquet_path

if __name__ == "__main__":
    preprocessor = DataPreprocessor()
    df_clean = preprocessor.load_and_clean()
    preprocessor.save_processed(df_clean)
