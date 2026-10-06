"""
Evaluation Metrics Module for Time-Series Regression Models.
Computes MAE, RMSE, R2, MAPE, WAPE, and SMAPE.
"""

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    """
    Computes all standard regression and percentage error metrics.
    """
    y_true = np.array(y_true, dtype=float)
    y_pred = np.array(y_pred, dtype=float)
    
    # Clip predictions to non-negative sales
    y_pred = np.clip(y_pred, 0, None)
    
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred))
    
    # MAPE (Handling zero targets)
    non_zero = y_true != 0
    if np.sum(non_zero) > 0:
        mape = float(np.mean(np.abs((y_true[non_zero] - y_pred[non_zero]) / y_true[non_zero])) * 100)
    else:
        mape = 0.0
        
    # WAPE (Weighted Absolute Percentage Error)
    sum_true = np.sum(y_true)
    if sum_true > 0:
        wape = float((np.sum(np.abs(y_true - y_pred)) / sum_true) * 100)
    else:
        wape = 0.0
        
    # SMAPE (Symmetric MAPE)
    denom = (np.abs(y_true) + np.abs(y_pred)) / 2.0
    non_zero_denom = denom != 0
    if np.sum(non_zero_denom) > 0:
        smape = float(np.mean(np.abs(y_true[non_zero_denom] - y_pred[non_zero_denom]) / denom[non_zero_denom]) * 100)
    else:
        smape = 0.0
        
    return {
        "MAE": round(mae, 4),
        "RMSE": round(rmse, 4),
        "R2": round(r2, 4),
        "MAPE": round(mape, 2),
        "WAPE": round(wape, 2),
        "SMAPE": round(smape, 2)
    }
