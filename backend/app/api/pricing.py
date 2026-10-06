"""
Dynamic Pricing API Endpoints.
"""

from fastapi import APIRouter
from backend.app.schemas.schemas import PricingSimulateRequest
from backend.app.services.pricing_service import PricingService

router = APIRouter()

@router.get("/pricing")
def get_pricing_recommendations(store_id: str = "ALL", category: str = "ALL"):
    return PricingService.get_pricing_recommendations(store_id=store_id, category=category)

@router.post("/pricing/simulate")
def simulate_pricing(req: PricingSimulateRequest):
    return PricingService.simulate_price_curve(product_id=req.product_id, store_id=req.store_id)
