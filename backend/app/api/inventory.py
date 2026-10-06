"""
Inventory Optimization API Endpoints.
"""

from fastapi import APIRouter
from backend.app.services.inventory_service import InventoryService

router = APIRouter()

@router.get("/inventory")
def get_inventory_recommendations(store_id: str = "ALL", category: str = "ALL", status: str = "ALL"):
    return InventoryService.get_inventory_recommendations(store_id=store_id, category=category, status_filter=status)
