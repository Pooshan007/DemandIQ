"""
Pydantic Request & Response Schemas.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ForecastRequest(BaseModel):
    store_id: Optional[str] = "ALL"
    product_id: Optional[str] = "ALL"
    category: Optional[str] = "ALL"
    horizon_days: Optional[int] = 30

class PricingSimulateRequest(BaseModel):
    store_id: str = "STORE_01"
    product_id: str = "PRD_001"
    candidate_price: float

class ProductItem(BaseModel):
    product_id: str
    product_name: str
    category: str
    cost_price: float
    base_price: float

class StoreItem(BaseModel):
    store_id: str
    store_name: str
    store_location: str

class CategoryItem(BaseModel):
    category: str
    num_products: int
