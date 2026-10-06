"""
Master Preprocessing & Feature Engineering Pipeline Script.
Executes cleaner and feature engineer sequentially.
"""

import os
import sys

# Ensure root workspace is on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.preprocessing.cleaner import DataPreprocessor
from ml.features.engineer import FeatureEngineer

def run_pipeline():
    print("[PIPELINE] Starting Data Cleaning...")
    preprocessor = DataPreprocessor()
    clean_df = preprocessor.load_and_clean()
    processed_path = preprocessor.save_processed(clean_df)
    
    print("[PIPELINE] Starting Feature Engineering...")
    engineer = FeatureEngineer(clean_df)
    feat_df = engineer.create_features()
    features_path = engineer.save_features(feat_df)
    
    print(f"[PIPELINE SUCCESS] Processed data -> {processed_path}")
    print(f"[PIPELINE SUCCESS] Engineered features -> {features_path}")

if __name__ == "__main__":
    run_pipeline()
