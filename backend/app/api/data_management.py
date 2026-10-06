"""
Data Management & Import API Endpoints.
"""

from fastapi import APIRouter, UploadFile, File, Response, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from backend.app.services.data_management_service import DataManagementService

router = APIRouter()

class MapValidateRequest(BaseModel):
    filename: str = "user_retail_data.csv"
    column_mapping: Dict[str, str]

class ProcessTrainRequest(BaseModel):
    filename: str = "user_retail_data.csv"
    display_name: str = "User Uploaded Dataset"
    column_mapping: Dict[str, str]

@router.get("/data/active")
def get_active_dataset():
    return DataManagementService.get_active_info()

@router.post("/data/upload")
async def upload_dataset(file: UploadFile = File(...)):
    try:
        content = await file.read()
        return DataManagementService.save_upload_and_preview(content, file.filename or "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        print(f"[UPLOAD ERROR] {type(exc).__name__}: {exc}")
        raise HTTPException(status_code=500, detail="Dataset processing failed. Check the backend logs.") from exc

@router.post("/data/validate")
def validate_dataset(req: MapValidateRequest):
    try:
        return DataManagementService.validate_dataset(req.column_mapping, req.filename)
    except (ValueError, FileNotFoundError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        print(f"[VALIDATION ERROR] {type(exc).__name__}: {exc}")
        raise HTTPException(status_code=500, detail="Dataset validation failed. Check the backend logs.") from exc

@router.post("/data/train")
def train_user_dataset(req: ProcessTrainRequest):
    return DataManagementService.process_and_train_pipeline(
        column_mapping=req.column_mapping,
        filename=req.filename,
        display_name=req.display_name
    )

@router.post("/data/switch-demo")
def switch_to_demo():
    return DataManagementService.switch_to_demo()

@router.get("/data/sample-csv")
def download_sample_csv():
    sample_csv = (
        "date,store_id,store_name,product_id,product_name,category,selling_price,cost_price,discount_percent,is_promotion,units_sold,stock_on_hand,supplier_lead_time_days\n"
        "2025-01-01,STORE_01,Downtown,PRD_001,Smartphone X1,Electronics,599.00,400.00,0,0,25,120,7\n"
        "2025-01-01,STORE_01,Downtown,PRD_002,Wireless Headphones,Electronics,129.00,60.00,10,1,45,210,5\n"
        "2025-01-01,STORE_02,Suburban,PRD_004,Mens Casual Jacket,Apparel,59.99,25.00,0,0,32,85,4\n"
        "2025-01-01,STORE_02,Suburban,PRD_009,Organic Coffee Beans,Grocery,19.99,8.00,0,0,78,300,3\n"
    )
    return Response(
        content=sample_csv,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=retail_data_template.csv"}
    )
