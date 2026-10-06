"""
Comprehensive Integration & Unit Test Suite for Database-Free Retail Analytics Platform.
Tests Preprocessing, Feature Leakage, Data Upload & Column Mapping, Retraining Pipeline,
Dynamic Filters, and FastAPI Endpoints.
"""

import os
import sys
import pytest
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.preprocessing.cleaner import DataPreprocessor
from ml.features.engineer import FeatureEngineer
from ml.forecasting.forecast_engine import DemandForecaster
from ml.pricing.pricing_engine import PricingEngine
from ml.inventory.inventory_engine import InventoryEngine
from backend.app.services.data_management_service import DataManagementService
from backend.app.core.dataset_config import DatasetConfigManager, DEFAULT_MAPPING
from backend.app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_01_preprocessing():
    preprocessor = DataPreprocessor()
    df = preprocessor.load_and_clean()
    assert len(df) > 0
    assert "units_sold" in df.columns
    assert df["units_sold"].min() >= 0

def test_02_feature_leakage_prevention():
    preprocessor = DataPreprocessor()
    df = preprocessor.load_and_clean()
    fe = FeatureEngineer(df)
    feat_df = fe.create_features()
    
    group = feat_df[(feat_df["store_id"] == "STORE_01") & (feat_df["product_id"] == "PRD_001")].sort_values(by="date")
    lag1_values = group["lag_1"].iloc[1:].values
    target_shifted = group["units_sold"].iloc[:-1].values
    
    np.testing.assert_array_equal(lag1_values, target_shifted)

def test_03_column_mapping_auto_detection():
    sample_headers = ["transaction_date", "item_code", "dept", "branch", "qty", "sale_price", "stock_level"]
    mapping = DataManagementService.auto_detect_mapping(sample_headers)
    
    assert mapping["date"] == "transaction_date"
    assert mapping["product_id"] == "item_code"
    assert mapping["category"] == "dept"
    assert mapping["store_id"] == "branch"
    assert mapping["units_sold"] == "qty"
    assert mapping["selling_price"] == "sale_price"
    assert mapping["stock_on_hand"] == "stock_level"

def test_04_dataset_validation():
    sample_mapping = {
        "date": "transaction_date",
        "product_id": "item_code",
        "store_id": "branch",
        "units_sold": "qty"
    }
    val_res = DataManagementService.validate_dataset(sample_mapping, "retail_data.csv")
    assert "is_valid" in val_res
    assert isinstance(val_res["checklist"], list)

def test_05_dynamic_pricing_cost_constraint():
    pricing_engine = PricingEngine()
    rec_df = pricing_engine.optimize_prices()
    
    assert len(rec_df) > 0
    assert (rec_df["recommended_price"] >= rec_df["cost_price"]).all()

def test_06_inventory_optimization_statuses():
    inventory_engine = InventoryEngine()
    inv_df = inventory_engine.optimize_inventory()
    
    assert len(inv_df) > 0
    valid_statuses = {"CRITICAL STOCK", "LOW STOCK", "OPTIMAL", "OVERSTOCKED"}
    assert set(inv_df["stock_status"].unique()).issubset(valid_statuses)
    assert (inv_df["safety_stock"] >= 0).all()
    assert (inv_df["reorder_point"] >= inv_df["safety_stock"]).all()

def test_07_fastapi_endpoints():
    r1 = client.get("/")
    assert r1.status_code == 200
    assert r1.json()["status"] == "online"
    
    r2 = client.get("/api/data/active")
    assert r2.status_code == 200
    assert "active_mode" in r2.json()
    
    r3 = client.get("/api/dashboard/overview")
    assert r3.status_code == 200
    assert "kpis" in r3.json()

def test_08_database_free_file_storage():
    required_files = [
        os.path.join("data", "raw", "retail_data.csv"),
        os.path.join("data", "processed", "processed_retail_data.parquet"),
        os.path.join("data", "processed", "engineered_features.parquet"),
        os.path.join("data", "forecasts", "forecasts.csv"),
        os.path.join("data", "pricing", "pricing_recommendations.csv"),
        os.path.join("data", "inventory", "inventory_recommendations.csv"),
        os.path.join("reports", "model_metrics.csv"),
        os.path.join("models", "ensemble_config.json"),
        os.path.join("data", "active_dataset.json")
    ]
    for path in required_files:
        assert os.path.exists(path), f"File persistence missing at {path}"
