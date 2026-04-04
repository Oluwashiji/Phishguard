"""
Machine Learning Model Training for Phishing Detection
Trains and evaluates multiple ML models for URL and email classification
"""

import numpy as np
import pandas as pd
import joblib
import json
import os
from typing import Dict, List, Tuple, Any
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report, roc_auc_score, roc_curve
)

from feature_extraction import URLFeatureExtractor, EmailFeatureExtractor


class PhishingModelTrainer:
    """Train and manage multiple ML models for phishing detection"""
    
    def __init__(self, model_dir: str = 'models'):
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        self.models = {}
        self.scalers = {}
        self.metrics = {}
        
    def generate_synthetic_dataset(self, n_samples: int = 5000) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Generate synthetic dataset for demonstration
        In production, use real phishing datasets like:
        - PhishTank (phishtank.org)
        - URLhaus (urlhaus.abuse.ch)
        - Enron dataset for emails
        """
        np.random.seed(42)
        
        data = []
        labels = []
        
        # Generate legitimate URLs
        n_legit = n_samples // 2
        for i in range(n_legit):
            url = self._generate_legitimate_url()
            features = URLFeatureExtractor(url).extract_all_features()
            data.append(features)
            labels.append(0)  # 0 = legitimate
            
        # Generate phishing URLs
        n_phish = n_samples - n_legit
        for i in range(n_phish):
            url = self._generate_phishing_url()
            features = URLFeatureExtractor(url).extract_all_features()
            data.append(features)
            labels.append(1)  # 1 = phishing
        
        df = pd.DataFrame(data)
        # Convert boolean to int
        for col in df.columns:
            if df[col].dtype == bool:
                df[col] = df[col].astype(int)
                
        return df, pd.Series(labels)
    
    def _generate_legitimate_url(self) -> str:
        """Generate a synthetic legitimate URL"""
        domains = [
            'google.com', 'facebook.com', 'amazon.com', 'microsoft.com',
            'apple.com', 'github.com', 'linkedin.com', 'twitter.com',
            'youtube.com', 'wikipedia.org', 'reddit.com', 'netflix.com'
        ]
        protocols = ['https://', 'http://']
        paths = ['', '/login', '/products', '/about', '/contact', '/home', '/dashboard']
        
        protocol = np.random.choice(protocols, p=[0.8, 0.2])
        domain = np.random.choice(domains)
        path = np.random.choice(paths, p=[0.4, 0.15, 0.15, 0.1, 0.1, 0.05, 0.05])
        
        return f"{protocol}{domain}{path}"
    
    def _generate_phishing_url(self) -> str:
        """Generate a synthetic phishing URL with suspicious characteristics"""
        # Suspicious patterns
        patterns = [
            # IP-based URLs
            lambda: f"http://{np.random.randint(1, 256)}.{np.random.randint(1, 256)}.{np.random.randint(1, 256)}.{np.random.randint(1, 256)}/login",
            # Long URLs with many subdomains
            lambda: f"http://{'sub'.join([str(i) + '.' for i in range(np.random.randint(3, 6))])}paypal.com.signin-verify.net/secure/login",
            # URLs with @ symbol
            lambda: f"http://legitimate-looking-url@{np.random.choice(['evil.com', 'phish.net', 'scam.org'])}/login",
            # URLs with suspicious TLDs
            lambda: f"http://{np.random.choice(['secure-bank', 'verify-account', 'login-paypal'])}.{np.random.choice(['tk', 'ml', 'ga', 'cf', 'xyz'])}/",
            # Typosquatting
            lambda: f"http://{np.random.choice(['paypa1', 'amaz0n', 'g00gle', 'faceb00k'])}.com/login",
            # URLs with excessive dots
            lambda: f"http://secure.login.account.verify.{'user' + str(np.random.randint(1000, 9999))}.com/",
        ]
        
        return np.random.choice(patterns)()
    
    def prepare_data(self, X: pd.DataFrame, y: pd.Series, test_size: float = 0.2) -> Tuple:
        """Split and scale data"""
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        return X_train_scaled, X_test_scaled, y_train, y_test, scaler
    
    def train_logistic_regression(self, X_train: np.ndarray, y_train: np.ndarray) -> LogisticRegression:
        """Train Logistic Regression model"""
        model = LogisticRegression(
            max_iter=1000,
            random_state=42,
            class_weight='balanced'
        )
        model.fit(X_train, y_train)
        return model
    
    def train_random_forest(self, X_train: np.ndarray, y_train: np.ndarray) -> RandomForestClassifier:
        """Train Random Forest model"""
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42,
            class_weight='balanced'
        )
        model.fit(X_train, y_train)
        return model
    
    def train_neural_network(self, X_train: np.ndarray, y_train: np.ndarray) -> MLPClassifier:
        """Train Neural Network (MLP) model"""
        model = MLPClassifier(
            hidden_layer_sizes=(128, 64, 32),
            activation='relu',
            solver='adam',
            max_iter=500,
            random_state=42,
            early_stopping=True,
            validation_fraction=0.1
        )
        model.fit(X_train, y_train)
        return model
    
    def train_svm(self, X_train: np.ndarray, y_train: np.ndarray) -> SVC:
        """Train Support Vector Machine model"""
        model = SVC(
            kernel='rbf',
            probability=True,
            random_state=42,
            class_weight='balanced'
        )
        model.fit(X_train, y_train)
        return model
    
    def evaluate_model(self, model: Any, X_test: np.ndarray, y_test: np.ndarray, model_name: str) -> Dict:
        """Evaluate model performance"""
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else None
        
        metrics = {
            'model_name': model_name,
            'accuracy': float(accuracy_score(y_test, y_pred)),
            'precision': float(precision_score(y_test, y_pred, zero_division=0)),
            'recall': float(recall_score(y_test, y_pred, zero_division=0)),
            'f1_score': float(f1_score(y_test, y_pred, zero_division=0)),
            'confusion_matrix': confusion_matrix(y_test, y_pred).tolist(),
        }
        
        if y_prob is not None:
            metrics['roc_auc'] = float(roc_auc_score(y_test, y_prob))
            fpr, tpr, _ = roc_curve(y_test, y_prob)
            metrics['roc_curve'] = {
                'fpr': fpr.tolist(),
                'tpr': tpr.tolist()
            }
        
        # Cross-validation scores
        cv_scores = cross_val_score(model, X_test, y_test, cv=5)
        metrics['cv_mean'] = float(cv_scores.mean())
        metrics['cv_std'] = float(cv_scores.std())
        
        return metrics
    
    def train_all_models(self, X: pd.DataFrame, y: pd.Series) -> Dict:
        """Train all models and return metrics"""
        print("Preparing data...")
        X_train, X_test, y_train, y_test, scaler = self.prepare_data(X, y)
        
        # Save feature names
        self.feature_names = X.columns.tolist()
        joblib.dump(self.feature_names, os.path.join(self.model_dir, 'feature_names.pkl'))
        
        models_config = {
            'logistic_regression': self.train_logistic_regression,
            'random_forest': self.train_random_forest,
            'neural_network': self.train_neural_network,
            'svm': self.train_svm
        }
        
        all_metrics = []
        
        for model_name, train_func in models_config.items():
            print(f"\nTraining {model_name}...")
            model = train_func(X_train, y_train)
            
            # Save model and scaler
            joblib.dump(model, os.path.join(self.model_dir, f'{model_name}.pkl'))
            joblib.dump(scaler, os.path.join(self.model_dir, f'{model_name}_scaler.pkl'))
            
            # Evaluate
            metrics = self.evaluate_model(model, X_test, y_test, model_name)
            self.metrics[model_name] = metrics
            all_metrics.append(metrics)
            
            print(f"Accuracy: {metrics['accuracy']:.4f}")
            print(f"F1 Score: {metrics['f1_score']:.4f}")
        
        # Save metrics
        with open(os.path.join(self.model_dir, 'metrics.json'), 'w') as f:
            json.dump(all_metrics, f, indent=2)
        
        # Determine best model
        best_model = max(all_metrics, key=lambda x: x['f1_score'])
        print(f"\nBest model: {best_model['model_name']} (F1: {best_model['f1_score']:.4f})")
        
        return {
            'metrics': all_metrics,
            'best_model': best_model['model_name']
        }
    
    def get_feature_importance(self, model_name: str = 'random_forest') -> Dict:
        """Get feature importance for tree-based models"""
        model_path = os.path.join(self.model_dir, f'{model_name}.pkl')
        if not os.path.exists(model_path):
            return {}
        
        model = joblib.load(model_path)
        feature_names = joblib.load(os.path.join(self.model_dir, 'feature_names.pkl'))
        
        if hasattr(model, 'feature_importances_'):
            importance = model.feature_importances_
            return dict(sorted(
                zip(feature_names, importance),
                key=lambda x: x[1],
                reverse=True
            ))
        elif hasattr(model, 'coef_'):
            # For linear models
            importance = np.abs(model.coef_[0])
            return dict(sorted(
                zip(feature_names, importance),
                key=lambda x: x[1],
                reverse=True
            ))
        
        return {}


def train_models():
    """Main training function"""
    trainer = PhishingModelTrainer(model_dir='models')
    
    print("Generating synthetic dataset...")
    X, y = trainer.generate_synthetic_dataset(n_samples=5000)
    
    print(f"Dataset shape: {X.shape}")
    print(f"Phishing samples: {y.sum()}")
    print(f"Legitimate samples: {len(y) - y.sum()}")
    
    results = trainer.train_all_models(X, y)
    
    # Print feature importance from Random Forest
    print("\nTop 10 Important Features (Random Forest):")
    importance = trainer.get_feature_importance('random_forest')
    for feature, score in list(importance.items())[:10]:
        print(f"  {feature}: {score:.4f}")
    
    return results


if __name__ == '__main__':
    train_models()
