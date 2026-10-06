"""
Master Model Training Script.
Triggers pre-processing, feature engineering, base model training, ensemble optimization, and artifact serialization.
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.preprocessing.cleaner import DataPreprocessor
from ml.features.engineer import FeatureEngineer
from ml.training.train import ModelTrainer

def main():
    print("==================================================")
    print("RETAIL ANALYTICS MODEL TRAINING & ENSEMBLE PIPELINE")
    print("==================================================")
    
    print("\n1. Data Preprocessing...")
    preprocessor = DataPreprocessor()
    clean_df = preprocessor.load_and_clean()
    preprocessor.save_processed(clean_df)
    
    print("\n2. Feature Engineering...")
    engineer = FeatureEngineer(clean_df)
    feat_df = engineer.create_features()
    engineer.save_features(feat_df)
    
    print("\n3. Base Models Training & Ensemble Optimization...")
    trainer = ModelTrainer()
    data = trainer.prepare_data()
    trainer.train_all_models(data)
    trainer.save_artifacts()
    
    print("\n==================================================")
    print("[SUCCESS] All 5 models + Ensemble trained and saved.")
    print("==================================================")

if __name__ == "__main__":
    main()
