"""
Active Dataset Configuration & State Management.
Handles switching between Demo Dataset and User Uploaded Datasets without database dependency.
"""

import os
import json
from datetime import datetime

DEFAULT_CONFIG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/active_dataset.json"))
BASE_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data"))

DEFAULT_MAPPING = {
    "date": "date",
    "product_id": "product_id",
    "product_name": "product_name",
    "category": "category",
    "store_id": "store_id",
    "store_name": "store_name",
    "store_location": "store_location",
    "units_sold": "units_sold",
    "selling_price": "selling_price",
    "cost_price": "cost_price",
    "discount_percent": "discount_percent",
    "is_promotion": "is_promotion",
    "stock_on_hand": "stock_on_hand",
    "supplier_lead_time_days": "supplier_lead_time_days"
}

class DatasetConfigManager:
    @staticmethod
    def get_active_config() -> dict:
        if not os.path.exists(DEFAULT_CONFIG_PATH):
            config = {
                "active_mode": "demo",
                "filename": "retail_data.csv",
                "display_name": "Demo Retail Dataset",
                "uploaded_at": datetime.now().isoformat(),
                "column_mapping": DEFAULT_MAPPING,
                "is_trained": True,
                "last_trained_at": datetime.now().isoformat()
            }
            DatasetConfigManager.save_config(config)
            return config
            
        with open(DEFAULT_CONFIG_PATH, "r") as f:
            return json.load(f)

    @staticmethod
    def save_config(config: dict):
        os.makedirs(os.path.dirname(DEFAULT_CONFIG_PATH), exist_ok=True)
        with open(DEFAULT_CONFIG_PATH, "w") as f:
            json.dump(config, f, indent=4)

    @staticmethod
    def set_active_mode(mode: str, filename: str = None, display_name: str = None, column_mapping: dict = None):
        config = DatasetConfigManager.get_active_config()
        config["active_mode"] = mode
        if filename:
            config["filename"] = filename
        if display_name:
            config["display_name"] = display_name
        if column_mapping:
            config["column_mapping"] = column_mapping
        config["updated_at"] = datetime.now().isoformat()
        DatasetConfigManager.save_config(config)
        return config

    @staticmethod
    def get_raw_data_path() -> str:
        config = DatasetConfigManager.get_active_config()
        if config["active_mode"] == "user":
            return os.path.join(BASE_DATA_DIR, "raw", config.get("filename", "user_retail_data.csv"))
        return os.path.join(BASE_DATA_DIR, "raw", "retail_data.csv")
