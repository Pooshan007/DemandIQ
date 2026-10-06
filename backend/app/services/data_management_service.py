"""
Data Management Service.
Handles raw file uploads, automatic column mapping detection, dataset previews,
data validation checks, dataset switching, and triggering ML pipeline retraining.
"""

import os
import csv
import json
import shutil
import pandas as pd
import numpy as np
from datetime import datetime
from backend.app.core.config import settings
from backend.app.core.dataset_config import DatasetConfigManager, DEFAULT_MAPPING
from ml.preprocessing.cleaner import DataPreprocessor
from ml.features.engineer import FeatureEngineer
from ml.training.train import ModelTrainer
from ml.forecasting.forecast_engine import DemandForecaster
from ml.pricing.pricing_engine import PricingEngine
from ml.inventory.inventory_engine import InventoryEngine
from ml.explainability.explainer import ModelExplainer

# System Column Requirements Definition
REQUIRED_SYSTEM_COLS = {
    "date": "Date / Transaction Date",
    "product_id": "Product ID / SKU",
    "store_id": "Store ID / Branch / Location",
    "units_sold": "Sales Quantity / Units Sold"
}

OPTIONAL_SYSTEM_COLS = {
    "product_name": "Product Name / Title",
    "category": "Category / Department",
    "selling_price": "Selling Price ($)",
    "cost_price": "Cost Price ($)",
    "discount_percent": "Discount Percentage (%)",
    "is_promotion": "Promotion Flag (0/1)",
    "stock_on_hand": "Stock Inventory Level",
    "supplier_lead_time_days": "Supplier Lead Time (Days)"
}

COLUMN_SYNONYMS = {
    "date": ["date", "sale_date", "transaction_date", "timestamp", "day", "time"],
    "product_id": ["product_id", "product", "sku", "item_id", "item_code", "product_code", "productname", "product_name"],
    "product_name": ["product_name", "product_title", "item_name", "name", "title", "productname"],
    "category": ["category", "dept", "department", "group", "product_category", "gstsalestype_name"],
    "store_id": ["store_id", "store", "branch", "outlet", "location", "store_name", "account1_name", "account_name", "customer", "customer_name"],
    "units_sold": ["units_sold", "sales", "quantity", "qty", "units", "sales_quantity", "qty_sold"],
    "selling_price": ["selling_price", "price", "unit_price", "rate", "sale_price", "selling_rate"],
    "cost_price": ["cost_price", "cost", "unit_cost", "buy_price", "wholesale_price"],
    "discount_percent": ["discount_percent", "discount", "disc", "disc_pct", "discount_rate"],
    "is_promotion": ["is_promotion", "promo", "promotion", "ad_flag", "campaign"],
    "stock_on_hand": ["stock_on_hand", "stock", "inventory", "stock_level", "qty_on_hand"],
    "supplier_lead_time_days": ["supplier_lead_time_days", "lead_time", "fulfillment_days", "lead_days"]
}

class DataManagementService:
    """File-backed dataset ingestion, validation, and model-pipeline orchestration."""

    MAX_UPLOAD_BYTES = 50 * 1024 * 1024
    UPLOAD_DIR_NAME = "user_uploads"
    SUPPORTED_EXTENSIONS = {".csv", ".xlsx", ".xls"}

    @staticmethod
    def get_active_info() -> dict:
        return DatasetConfigManager.get_active_config()

    @staticmethod
    def _safe_filename(filename: str) -> str:
        """Return a basename-only filename and reject unsupported/empty names."""
        original = (filename or "").strip()
        if not original:
            raise ValueError("The uploaded file has no filename.")
        safe_name = os.path.basename(original.replace("\\", "/"))
        suffix = os.path.splitext(safe_name)[1].lower()
        if suffix not in DataManagementService.SUPPORTED_EXTENSIONS:
            raise ValueError("Unsupported file type. Please upload CSV or Excel.")
        if safe_name in {".", ".."} or not os.path.splitext(safe_name)[0]:
            raise ValueError("The uploaded file has an invalid filename.")
        return safe_name

    @staticmethod
    def _raw_upload_path(filename: str) -> str:
        """Resolve a user-upload filename relative to the configured data root."""
        safe_name = DataManagementService._safe_filename(filename)
        raw_dir = os.path.join(settings.BASE_DIR, "data", "raw", DataManagementService.UPLOAD_DIR_NAME)
        return os.path.join(raw_dir, safe_name)

    @staticmethod
    def _read_dataframe(path: str, filename: str) -> pd.DataFrame:
        """Read CSV/XLS/XLSX using the actual file type, with useful errors."""
        suffix = os.path.splitext(filename)[1].lower()
        if suffix in {".xlsx", ".xls"}:
            try:
                return pd.read_excel(path)
            except ImportError as exc:
                engine = "openpyxl" if suffix == ".xlsx" else "xlrd"
                raise RuntimeError(
                    f"Excel support is not installed. Install the {engine} package."
                ) from exc
            except Exception as exc:
                raise ValueError(f"Could not parse the Excel file: {exc}") from exc

        def read_csv(encoding: str) -> pd.DataFrame:
            # sep=None + Python's CSV sniffer supports comma, tab, and semicolon
            # delimited files while preserving normal quoted CSV behaviour.
            return pd.read_csv(path, encoding=encoding, sep=None, engine="python")

        try:
            return read_csv("utf-8-sig")
        except UnicodeDecodeError:
            try:
                return read_csv("utf-8")
            except Exception as exc:
                raise ValueError(f"Could not parse the CSV. Please check the file encoding and format: {exc}") from exc
        except pd.errors.EmptyDataError as exc:
            raise ValueError("The uploaded file is empty.") from exc
        except pd.errors.ParserError as exc:
            raise ValueError(f"Could not parse the CSV. Please check the file format: {exc}") from exc

    @staticmethod
    def auto_detect_mapping(user_headers: list) -> dict:
        """Auto-detect probable column mappings from uploaded headers."""
        detected = {}
        # Normalize both sides so "Product ID", "product-id", and "product_id"
        # can be matched without requiring a particular naming convention.
        normalized_headers = {}
        for header in user_headers:
            key = str(header).strip().lower()
            key = key.replace("-", "_").replace(" ", "_")
            normalized_headers[key] = header

        for sys_col, synonyms in COLUMN_SYNONYMS.items():
            found = None
            for syn in synonyms:
                key = syn.lower().replace("-", "_").replace(" ", "_")
                if key in normalized_headers:
                    found = normalized_headers[key]
                    break
            detected[sys_col] = found or ""

        # Real-world retail exports often have no separate SKU/store ID.
        # In that case, use stable business identifiers already present in
        # the file rather than inventing a new value.
        if not detected["product_id"] and detected["product_name"]:
            detected["product_id"] = detected["product_name"]
        if not detected["product_name"] and detected["product_id"]:
            detected["product_name"] = detected["product_id"]
        return detected

    @staticmethod
    def _parse_dates(series: pd.Series) -> pd.Series:
        values = series.astype(str).str.strip()
        sample = values[values.ne("")].head(20)
        ddmmyyyy = bool(sample.str.match(r"^\\d{1,2}[-/]\\d{1,2}[-/]\\d{4}$").all()) if len(sample) else False
        return pd.to_datetime(series, errors="coerce", dayfirst=ddmmyyyy)

    @staticmethod
    def save_upload_and_preview(file_content: bytes, filename: str) -> dict:
        """Persist an uploaded file using its real extension and return a preview."""
        if not file_content:
            raise ValueError("The uploaded file is empty.")
        if len(file_content) > DataManagementService.MAX_UPLOAD_BYTES:
            raise ValueError("File exceeds the 50 MB upload limit.")

        safe_name = DataManagementService._safe_filename(filename)
        raw_dir = os.path.join(settings.BASE_DIR, "data", "raw", DataManagementService.UPLOAD_DIR_NAME)
        os.makedirs(raw_dir, exist_ok=True)
        raw_user_path = os.path.join(raw_dir, safe_name)

        with open(raw_user_path, "wb") as f:
            f.write(file_content)

        try:
            df = DataManagementService._read_dataframe(raw_user_path, safe_name)
        except Exception:
            # Do not leave a corrupt/unparseable upload pretending to be usable.
            try:
                os.remove(raw_user_path)
            except OSError:
                pass
            raise

        if df.empty or len(df.columns) == 0:
            raise ValueError("The uploaded file is empty.")

        auto_mapped = DataManagementService.auto_detect_mapping(list(df.columns))
        num_rows = len(df)
        num_cols = len(df.columns)
        missing_total = int(df.isnull().sum().sum())
        duplicate_rows = int(df.duplicated().sum())
        preview_records = df.head(15).fillna("").to_dict(orient="records")

        return {
            "filename": f"{DataManagementService.UPLOAD_DIR_NAME}/{safe_name}",
            "display_filename": safe_name,
            "saved_path": raw_user_path,
            "num_rows": num_rows,
            "num_cols": num_cols,
            "user_headers": [str(c) for c in df.columns],
            "auto_mapped": auto_mapped,
            "missing_total": missing_total,
            "duplicate_rows": duplicate_rows,
            "preview_records": preview_records,
            "required_cols_spec": REQUIRED_SYSTEM_COLS,
            "optional_cols_spec": OPTIONAL_SYSTEM_COLS
        }

    @staticmethod
    def validate_dataset(column_mapping: dict, filename: str = "user_retail_data.csv") -> dict:
        """Validate the exact uploaded dataset selected by the user."""
        if filename == "retail_data.csv":
            raw_user_path = os.path.join(settings.BASE_DIR, "data", "raw", "retail_data.csv")
        else:
            raw_user_path = DataManagementService._raw_upload_path(filename)

        if not os.path.exists(raw_user_path):
            raise FileNotFoundError(f"Uploaded dataset not found at {raw_user_path}")

        actual_name = os.path.basename(raw_user_path)
        df_raw = DataManagementService._read_dataframe(raw_user_path, actual_name)

        rename_dict = {}
        for sys_col, user_col in column_mapping.items():
            if not user_col or user_col not in df_raw.columns:
                continue
            # A single uploaded field may be useful for multiple system roles
            # (for example ProductName can serve as both product ID and name).
            # Rename it once, then derive the secondary role below.
            if user_col not in rename_dict:
                rename_dict[user_col] = sys_col
            elif sys_col == "product_id" and rename_dict[user_col] == "product_name":
                continue

        df = df_raw.rename(columns=rename_dict)
        if "product_id" not in df.columns and "product_name" in df.columns:
            df["product_id"] = df["product_name"]

        checklist = []
        is_valid = True

        for req_col, label in REQUIRED_SYSTEM_COLS.items():
            if req_col in df.columns:
                checklist.append({
                    "item": f"Required: {label}",
                    "status": "PASS",
                    "message": f"Mapped to '{column_mapping.get(req_col)}'"
                })
            else:
                is_valid = False
                checklist.append({
                    "item": f"Required: {label}",
                    "status": "FAIL",
                    "message": f"Missing mapping for {req_col}"
                })

        if "date" in df.columns:
            parsed_dates = DataManagementService._parse_dates(df["date"])
            null_dates = int(parsed_dates.isnull().sum())
            if null_dates > 0:
                checklist.append({
                    "item": "Date Formatting",
                    "status": "WARN",
                    "message": f"{null_dates} rows have unparseable dates and will be dropped."
                })
            else:
                date_min = parsed_dates.min().strftime("%Y-%m-%d")
                date_max = parsed_dates.max().strftime("%Y-%m-%d")
                checklist.append({
                    "item": "Date Formatting",
                    "status": "PASS",
                    "message": f"Valid dates from {date_min} to {date_max}"
                })

        if "units_sold" in df.columns:
            sales = pd.to_numeric(df["units_sold"], errors="coerce")
            invalid_sales = int(sales.isna().sum())
            neg_sales = int((sales < 0).sum())
            if invalid_sales > 0:
                checklist.append({
                    "item": "Sales Values",
                    "status": "WARN",
                    "message": f"{invalid_sales} rows contain non-numeric sales values and will be cleaned."
                })
            elif neg_sales > 0:
                checklist.append({
                    "item": "Sales Values",
                    "status": "WARN",
                    "message": f"{neg_sales} rows contain negative sales and will be clipped to 0."
                })
            else:
                checklist.append({
                    "item": "Sales Values",
                    "status": "PASS",
                    "message": "All sales quantities are non-negative."
                })

        for opt_col, label in OPTIONAL_SYSTEM_COLS.items():
            if opt_col in df.columns:
                null_cnt = int(df[opt_col].isnull().sum())
                if null_cnt > 0:
                    checklist.append({
                        "item": f"Optional: {label}",
                        "status": "WARN",
                        "message": f"Present with {null_cnt} missing values."
                    })
                else:
                    checklist.append({
                        "item": f"Optional: {label}",
                        "status": "PASS",
                        "message": f"Mapped to '{column_mapping.get(opt_col)}'"
                    })
            else:
                checklist.append({
                    "item": f"Optional: {label}",
                    "status": "INFO",
                    "message": "Not provided in uploaded dataset."
                })

        return {
            "is_valid": is_valid,
            "checklist": checklist,
            "total_rows": len(df),
            "total_stores": int(df["store_id"].nunique()) if "store_id" in df.columns else 0,
            "total_products": int(df["product_id"].nunique()) if "product_id" in df.columns else 0
        }

    @staticmethod
    def process_and_train_pipeline(column_mapping: dict, filename: str = "user_retail_data.csv", display_name: str = "User Uploaded Dataset") -> dict:
        """Execute preprocessing, training, and downstream artifact generation."""
        print(f"[PIPELINE START] Processing dataset: {display_name}")

        DatasetConfigManager.set_active_mode(
            mode="user" if filename != "retail_data.csv" else "demo",
            filename=filename,
            display_name=display_name,
            column_mapping=column_mapping
        )

        preprocessor = DataPreprocessor(column_mapping=column_mapping)
        clean_df = preprocessor.load_and_clean()
        processed_path = preprocessor.save_processed(clean_df)

        engineer = FeatureEngineer(clean_df)
        feat_df = engineer.create_features()
        features_path = engineer.save_features(feat_df)

        trainer = ModelTrainer(data_path=features_path)
        data = trainer.prepare_data()
        trainer.train_all_models(data)
        trainer.save_artifacts()

        forecaster = DemandForecaster(data_path=features_path)
        fc_df = forecaster.generate_forecasts()
        forecaster.save_forecasts(fc_df)

        pricing_engine = PricingEngine(data_path=features_path)
        pr_df = pricing_engine.optimize_prices()
        pricing_engine.save_recommendations(pr_df)

        inventory_engine = InventoryEngine(data_path=features_path)
        inv_df = inventory_engine.optimize_inventory()
        inventory_engine.save_recommendations(inv_df)

        explainer = ModelExplainer(data_path=features_path)
        explainer.explain_predictions()

        config = DatasetConfigManager.get_active_config()
        config["is_trained"] = True
        config["last_trained_at"] = datetime.now().isoformat()
        DatasetConfigManager.save_config(config)

        print("[PIPELINE COMPLETE] Retraining and prediction updates succeeded.")

        return {
            "status": "success",
            "active_dataset": display_name,
            "processed_rows": len(clean_df),
            "trained_at": config["last_trained_at"]
        }

    @staticmethod
    def switch_to_demo() -> dict:
        DatasetConfigManager.set_active_mode(
            mode="demo",
            filename="retail_data.csv",
            display_name="Demo Retail Dataset",
            column_mapping=DEFAULT_MAPPING
        )

        return DataManagementService.process_and_train_pipeline(
            column_mapping=DEFAULT_MAPPING,
            filename="retail_data.csv",
            display_name="Demo Retail Dataset"
        )
