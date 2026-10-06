"""
Demand Forecasting API Endpoints.
"""

from fastapi import APIRouter
from backend.app.schemas.schemas import ForecastRequest
from backend.app.services.forecast_service import ForecastService

router = APIRouter()
service = ForecastService()

@router.post("/forecast")
def generate_forecast(req: ForecastRequest):
    return service.get_forecast(
        store_id=req.store_id,
        product_id=req.product_id,
        category=req.category,
        horizon_days=req.horizon_days
    )

@router.get("/forecast/history")
def get_forecast_history(store_id: str = "ALL", product_id: str = "ALL", category: str = "ALL"):
    return service.get_forecast(store_id=store_id, product_id=product_id, category=category)
