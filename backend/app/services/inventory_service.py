"""
Inventory Service.
Retrieves stock replenishment recommendations, safety stock levels, and ROP metrics.
"""

import os
import pandas as pd
from backend.app.core.config import settings

class InventoryService:
    @staticmethod
    def get_inventory_recommendations(store_id: str = "ALL", category: str = "ALL", status_filter: str = "ALL") -> list:
        if not os.path.exists(settings.INVENTORY_PATH):
            from ml.inventory.inventory_engine import InventoryEngine
            ie = InventoryEngine(data_path=settings.DATA_ENGINEERED_PATH)
            rec_df = ie.optimize_inventory()
            ie.save_recommendations(rec_df)
        else:
            rec_df = pd.read_csv(settings.INVENTORY_PATH)
            
        if store_id and store_id != "ALL":
            rec_df = rec_df[rec_df["store_id"] == store_id]
        if category and category != "ALL":
            rec_df = rec_df[rec_df["category"] == category]
        if status_filter and status_filter != "ALL":
            rec_df = rec_df[rec_df["stock_status"] == status_filter]
            
        return rec_df.to_dict(orient="records")
