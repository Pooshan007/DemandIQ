"""
Feature Engineering Engine for Time-Series Retail Forecasting.
Computes lag features, rolling statistics, calendar indicators, and business price metrics.
Includes strict leakage prevention: rolling windows use shift(1) of past observations.
"""

import os
import pandas as pd
import numpy as np

class FeatureEngineer:
    def __init__(self, data: pd.DataFrame):
        self.df = data.copy()

    def create_features(self) -> pd.DataFrame:
        """
        Generates temporal, lag, rolling, and business pricing features.
        """
        df = self.df.sort_values(by=["store_id", "product_id", "date"]).reset_index(drop=True)
        
        # 1. Date & Calendar Features
        df["year"] = df["date"].dt.year
        df["month"] = df["date"].dt.month
        df["day"] = df["date"].dt.day
        df["dayofweek"] = df["date"].dt.dayofweek
        df["quarter"] = df["date"].dt.quarter
        df["is_weekend"] = df["dayofweek"].apply(lambda x: 1 if x >= 5 else 0)
        df["weekofyear"] = df["date"].dt.isocalendar().week.astype(int)
        
        # 2. Grouped Lag & Rolling Features (Preventing Data Leakage)
        grouped = df.groupby(["store_id", "product_id"])
        
        # Shift target by 1 day first to ensure features only look at past data
        target_shifted = grouped["units_sold"].shift(1)
        
        # Lag Features
        df["lag_1"] = target_shifted
        df["lag_7"] = grouped["units_sold"].shift(7)
        df["lag_14"] = grouped["units_sold"].shift(14)
        df["lag_28"] = grouped["units_sold"].shift(28)
        
        # Rolling Features (computed on target_shifted to prevent target leakage)
        for w in [7, 14, 28]:
            df[f"rolling_mean_{w}"] = grouped["units_sold"].transform(
                lambda s: s.shift(1).rolling(window=w, min_periods=1).mean()
            )
            df[f"rolling_std_{w}"] = grouped["units_sold"].transform(
                lambda s: s.shift(1).rolling(window=w, min_periods=1).std()
            ).fillna(0.0)
            
        # 3. Business Pricing & Margin Features
        df["price_margin"] = df["selling_price"] - df["cost_price"]
        df["price_margin_ratio"] = (df["price_margin"] / df["cost_price"]).round(4)
        
        # Price change vs previous day
        df["lag_1_price"] = grouped["selling_price"].shift(1)
        df["price_change"] = df["selling_price"] - df["lag_1_price"]
        df["price_change"] = df["price_change"].fillna(0.0)
        df.drop(columns=["lag_1_price"], inplace=True)
        
        # Fill initial shift NaNs with reasonable defaults
        df["lag_1"] = df["lag_1"].fillna(df["units_sold"].median())
        df["lag_7"] = df["lag_7"].fillna(df["units_sold"].median())
        df["lag_14"] = df["lag_14"].fillna(df["units_sold"].median())
        df["lag_28"] = df["lag_28"].fillna(df["units_sold"].median())
        
        for w in [7, 14, 28]:
            df[f"rolling_mean_{w}"] = df[f"rolling_mean_{w}"].fillna(df["units_sold"].median())
            df[f"rolling_std_{w}"] = df[f"rolling_std_{w}"].fillna(0.0)
            
        return df

    def save_features(self, df: pd.DataFrame, output_path: str = None) -> str:
        if output_path is None:
            project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
            output_path = os.path.join(project_root, "data", "processed", "engineered_features.parquet")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df.to_parquet(output_path, index=False)
        print(f"[FEATURE ENGINEERING] Saved engineered dataset ({len(df)} rows, {len(df.columns)} cols) to {output_path}")
        return output_path

if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
    from ml.preprocessing.cleaner import DataPreprocessor
    preprocessor = DataPreprocessor()
    clean_df = preprocessor.load_and_clean()
    fe = FeatureEngineer(clean_df)
    feat_df = fe.create_features()
    fe.save_features(feat_df)
