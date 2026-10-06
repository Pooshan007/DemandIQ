import io
import os
import sys
import pandas as pd
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app.main import app
from backend.app.core.config import settings


SAMPLE_CSV = """Date,Product_ID,Product_Name,Category,Store,Sales,Price,Cost_Price,Discount,Promotion,Inventory,Lead_Time
2025-01-01,P001,Smartphone X1,Electronics,Hyderabad Central,50,30000,24000,5,1,400,7
2025-01-02,P001,Smartphone X1,Electronics,Hyderabad Central,55,30000,24000,5,1,350,7
"""


def test_upload_csv_preview_and_mapping(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "BASE_DIR", str(tmp_path))
    client = TestClient(app)

    response = client.post(
        "/api/data/upload",
        files={"file": ("sample.csv", SAMPLE_CSV.encode("utf-8"), "text/csv")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["num_rows"] == 2
    assert payload["auto_mapped"]["date"] == "Date"
    assert payload["auto_mapped"]["units_sold"] == "Sales"
    assert payload["filename"] == "user_uploads/sample.csv"
    assert (tmp_path / "data" / "raw" / "user_uploads" / "sample.csv").exists()


def test_upload_xlsx_preview(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "BASE_DIR", str(tmp_path))
    client = TestClient(app)

    buffer = io.BytesIO()
    pd.DataFrame({
        "Date": ["2025-01-01"],
        "Product_ID": ["P001"],
        "Store": ["S1"],
        "Sales": [10],
    }).to_excel(buffer, index=False)

    response = client.post(
        "/api/data/upload",
        files={
            "file": (
                "sample.xlsx",
                buffer.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["num_rows"] == 1
    assert payload["filename"] == "user_uploads/sample.xlsx"


def test_missing_required_mapping_does_not_validate(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "BASE_DIR", str(tmp_path))
    client = TestClient(app)

    upload = client.post(
        "/api/data/upload",
        files={"file": ("sample.csv", SAMPLE_CSV.encode("utf-8"), "text/csv")},
    )
    payload = upload.json()
    mapping = payload["auto_mapped"]
    mapping["units_sold"] = ""

    response = client.post(
        "/api/data/validate",
        json={"filename": payload["filename"], "column_mapping": mapping},
    )

    assert response.status_code == 200
    assert response.json()["is_valid"] is False


def test_unsupported_file_type_is_rejected(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "BASE_DIR", str(tmp_path))
    client = TestClient(app)

    response = client.post(
        "/api/data/upload",
        files={"file": ("sample.txt", b"a,b\n1,2\n", "text/plain")},
    )

    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]
