"""
FastAPI Application Server Entrypoint.
Initializes REST routes, CORS middleware, and error handlers.
Database-free: reads and writes file artifacts directly.
"""

import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.core.config import settings
from backend.app.api import dashboard, forecast, pricing, inventory, metrics, explainability, data_management

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Database-Free Retail Analytics API using File-Based Persistence (CSV/Parquet/JSON/Joblib)",
    version="1.0.0"
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under /api
app.include_router(dashboard.router, prefix=settings.API_V1_STR, tags=["Dashboard"])
app.include_router(forecast.router, prefix=settings.API_V1_STR, tags=["Forecast"])
app.include_router(pricing.router, prefix=settings.API_V1_STR, tags=["Pricing"])
app.include_router(inventory.router, prefix=settings.API_V1_STR, tags=["Inventory"])
app.include_router(metrics.router, prefix=settings.API_V1_STR, tags=["Metrics"])
app.include_router(explainability.router, prefix=settings.API_V1_STR, tags=["Explainability"])
app.include_router(data_management.router, prefix=settings.API_V1_STR, tags=["Data Management"])

@app.get("/")
def root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "database": "NONE (File-Based Storage)",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
