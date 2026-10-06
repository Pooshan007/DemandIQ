"""
Dashboard & Metadata API Endpoints.
"""

from fastapi import APIRouter
from backend.app.services.dashboard_service import DashboardService

router = APIRouter()

@router.get("/dashboard/overview")
def get_dashboard_overview():
    return DashboardService.get_executive_overview()

@router.get("/products")
def get_products():
    return DashboardService.get_metadata()["products"]

@router.get("/categories")
def get_categories():
    return DashboardService.get_metadata()["categories"]

@router.get("/stores")
def get_stores():
    return DashboardService.get_metadata()["stores"]
