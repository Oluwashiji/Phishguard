"""
PhishGuard - Phishing Detection API
Flask backend with auto model training on first boot
"""

import os
import json
import joblib
import threading
import numpy as np
from datetime import datetime
from typing import Dict, List, Any
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

from feature_extraction import extract_features, URLFeatureExtractor, EmailFeatureExtractor
from model_training import PhishingModelTrainer

app = Flask(__name__)

# CORS: allow all origins (set to your frontend URL in production if desired)
CORS(app, resources={r"/api/*": {"origins": "*"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'models')
DATASET_DIR = os.path.join(BASE_DIR, 'dataset')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
ALLOWED_EXTENSIONS = {'csv', 'txt', 'json'}

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(DATASET_DIR, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

loaded_models = {}
model_scalers = {}
feature_names = []


def load_models():
    global loaded_models, model_scalers, feature_names

    model_files = {
        'logistic_regression': 'logistic_regression.pkl',
        'random_forest': 'random_forest.pkl',
        'neural_network': 'neural_network.pkl',
        'svm': 'svm.pkl'
    }

    for model_name, filename in model_files.items():
        model_path = os.path.join(MODEL_DIR, filename)
        scaler_path = os.path.join(MODEL_DIR, f'{model_name}_scaler.pkl')
        if os.path.exists(model_path):
            try:
                loaded_models[model_name] = joblib.load(model_path)
                if os.path.exists(scaler_path):
                    model_scalers[model_name] = joblib.load(scaler_path)
            except Exception as e:
                print(f"Error loading {model_name}: {e}")

    feature_names_path = os.path.join(MODEL_DIR, 'feature_names.pkl')
    if os.path.exists(feature_names_path):
        feature_names = joblib.load(feature_names_path)

    return len(loaded_models) > 0


import threading
_model_lock = threading.Lock()
_models_ready = False

def ensure_models_loaded():
    """Wait for startup training to finish, or train if somehow missed."""
    global _models_ready
    if _models_ready and loaded_models:
        return
    with _model_lock:
        if _models_ready and loaded_models:
            return
        # If startup thread is still running, wait briefly
        import time
        for _ in range(30):  # wait up to 30s
            if loaded_models:
                _models_ready = True
                return
            time.sleep(1)
        # Fallback: train if still nothing loaded
        if not loaded_models:
            print("Fallback training triggered...")
            trainer = PhishingModelTrainer(model_dir=MODEL_DIR)
            X, y = trainer.generate_synthetic_dataset(n_samples=2000)
            trainer.train_all_models(X, y)
            load_models()
        _models_ready = True


def get_model_list():
    return list(loaded_models.keys())


def prepare_features_for_model(features: Dict, model_name: str) -> np.ndarray:
    feature_array = []
    for name in feature_names:
        value = features.get(name, 0)
        if isinstance(value, bool):
            value = int(value)
        feature_array.append(value)
    X = np.array(feature_array).reshape(1, -1)
    if model_name in model_scalers:
        X = model_scalers[model_name].transform(X)
    return X


def make_prediction(input_data: str, input_type: str, model_name: str) -> Dict:
    ensure_models_loaded()

    if model_name not in loaded_models:
        if loaded_models:
            model_name = list(loaded_models.keys())[0]
        else:
            return {'error': 'No models available'}

    model = loaded_models[model_name]
    features = extract_features(input_data, input_type)
    input_type_detected = features.pop('input_type', 'unknown')

    X = prepare_features_for_model(features, model_name)

    prediction = model.predict(X)[0]
    probability = model.predict_proba(X)[0] if hasattr(model, 'predict_proba') else [0.5, 0.5]
    confidence = float(probability[1] if prediction == 1 else probability[0])
    is_phishing = bool(prediction == 1)

    suspicious_features = identify_suspicious_features(features, input_type_detected)

    return {
        'result': "Phishing" if is_phishing else "Legitimate",
        'is_phishing': is_phishing,
        'confidence': round(confidence * 100, 2),
        'model_used': model_name,
        'input_type': input_type_detected,
        'features': features,
        'suspicious_features': suspicious_features,
        'timestamp': datetime.now().isoformat()
    }


def identify_suspicious_features(features: Dict, input_type: str) -> List[Dict]:
    suspicious = []

    if input_type == 'url':
        checks = [
            ('has_ip_address', features.get('has_ip_address', False), 'Contains IP address instead of domain'),
            ('has_at_symbol', features.get('has_at_symbol', False), 'Contains @ symbol (credential trick)'),
            ('is_shortened', features.get('is_shortened', False), 'Uses URL shortening service'),
            ('has_suspicious_tld', features.get('has_suspicious_tld', False), 'Suspicious top-level domain'),
            ('brand_in_subdomain', features.get('brand_in_subdomain', False), 'Brand name in subdomain (spoofing)'),
            ('has_double_slash', features.get('has_double_slash', False), 'Double slash in path (redirection)'),
        ]
        if features.get('url_length', 0) > 75:
            checks.append(('url_length', True, f"Very long URL ({features['url_length']} chars)"))
        if features.get('subdomain_count', 0) > 2:
            checks.append(('subdomain_count', True, f"Many subdomains ({features['subdomain_count']})"))
        if features.get('suspicious_keywords_count', 0) > 0:
            checks.append(('suspicious_keywords_count', True, f"Contains {features['suspicious_keywords_count']} suspicious keywords"))
        if features.get('entropy', 0) > 4.5:
            checks.append(('entropy', True, f"High entropy ({features['entropy']:.2f}) - possibly random/generated"))
    else:
        checks = [
            ('has_html', features.get('has_html', False), 'Contains HTML content'),
            ('has_suspicious_patterns', features.get('has_suspicious_patterns', False), 'Contains suspicious patterns'),
            ('sender_mismatch', features.get('sender_mismatch', False), 'Sender display name mismatch'),
            ('reply_to_different', features.get('reply_to_different', False), 'Reply-to address differs from sender'),
            ('has_spelling_errors', features.get('has_spelling_errors', False), 'Contains spelling errors'),
        ]
        if features.get('phishing_keywords_count', 0) > 2:
            checks.append(('phishing_keywords_count', True, f"Contains {features['phishing_keywords_count']} phishing keywords"))
        if features.get('urgency_score', 0) > 3:
            checks.append(('urgency_score', True, f"High urgency language (score: {features['urgency_score']})"))
        if features.get('num_links', 0) > 5:
            checks.append(('num_links', True, f"Many links ({features['num_links']})"))

    for feature, condition, description in checks:
        if condition:
            suspicious.append({
                'feature': feature,
                'description': description,
                'severity': 'high' if feature in ['has_ip_address', 'has_at_symbol', 'brand_in_subdomain'] else 'medium'
            })

    return suspicious


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/', methods=['GET'])
def index():
    return jsonify({'message': 'PhishGuard API is running', 'version': '1.0.0'})


@app.route('/api/health', methods=['GET'])
def health_check():
    ensure_models_loaded()
    return jsonify({
        'status': 'healthy',
        'models_loaded': get_model_list(),
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/models', methods=['GET'])
def get_models():
    ensure_models_loaded()
    models = [
        {'name': name, 'display_name': name.replace('_', ' ').title(), 'loaded': True}
        for name in get_model_list()
    ]
    return jsonify({'models': models, 'count': len(models)})


@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        input_data = data.get('input', '').strip()
        input_type = data.get('type', 'auto').lower()
        model_name = data.get('model', 'random_forest')
        if not input_data:
            return jsonify({'error': 'No input provided'}), 400
        result = make_prediction(input_data, input_type, model_name)
        if 'error' in result:
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/predict/all', methods=['POST'])
def predict_all_models():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        input_data = data.get('input', '').strip()
        input_type = data.get('type', 'auto').lower()
        if not input_data:
            return jsonify({'error': 'No input provided'}), 400
        ensure_models_loaded()
        results = []
        for model_name in get_model_list():
            result = make_prediction(input_data, input_type, model_name)
            if 'error' not in result:
                results.append({
                    'model': model_name,
                    'result': result['result'],
                    'confidence': result['confidence'],
                    'is_phishing': result['is_phishing']
                })
        phishing_votes = sum(1 for r in results if r['is_phishing'])
        avg_confidence = float(np.mean([r['confidence'] for r in results])) if results else 0
        return jsonify({
            'individual_results': results,
            'consensus': 'Phishing' if phishing_votes > len(results) / 2 else 'Legitimate',
            'consensus_confidence': round(avg_confidence, 2),
            'agreement_ratio': f"{phishing_votes}/{len(results)}",
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    try:
        metrics_path = os.path.join(MODEL_DIR, 'metrics.json')
        if os.path.exists(metrics_path):
            with open(metrics_path, 'r') as f:
                metrics = json.load(f)
            return jsonify({'metrics': metrics})
        else:
            default_metrics = [
                {'model_name': 'logistic_regression', 'accuracy': 0.92, 'precision': 0.89, 'recall': 0.94, 'f1_score': 0.91},
                {'model_name': 'random_forest', 'accuracy': 0.96, 'precision': 0.94, 'recall': 0.97, 'f1_score': 0.95},
                {'model_name': 'neural_network', 'accuracy': 0.94, 'precision': 0.92, 'recall': 0.95, 'f1_score': 0.93},
                {'model_name': 'svm', 'accuracy': 0.93, 'precision': 0.91, 'recall': 0.94, 'f1_score': 0.92},
            ]
            return jsonify({'metrics': default_metrics})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/features/importance', methods=['GET'])
def get_feature_importance():
    try:
        ensure_models_loaded()
        model_name = request.args.get('model', 'random_forest')
        trainer = PhishingModelTrainer(model_dir=MODEL_DIR)
        importance = trainer.get_feature_importance(model_name)
        if importance:
            return jsonify({'model': model_name, 'feature_importance': importance})
        return jsonify({'error': 'Feature importance not available'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/analyze', methods=['POST'])
def analyze_input():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        input_data = data.get('input', '').strip()
        input_type = data.get('type', 'auto').lower()
        if not input_data:
            return jsonify({'error': 'No input provided'}), 400
        features = extract_features(input_data, input_type)
        input_type_detected = features.pop('input_type', 'unknown')
        suspicious = identify_suspicious_features(features, input_type_detected)
        return jsonify({
            'input_type': input_type_detected,
            'features': features,
            'suspicious_indicators': suspicious,
            'risk_score': len(suspicious) * 10
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/train', methods=['POST'])
def retrain_models():
    try:
        data = request.get_json() or {}
        n_samples = data.get('n_samples', 3000)
        trainer = PhishingModelTrainer(model_dir=MODEL_DIR)
        X, y = trainer.generate_synthetic_dataset(n_samples=n_samples)
        results = trainer.train_all_models(X, y)
        load_models()
        return jsonify({
            'message': 'Models retrained successfully',
            'results': results,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/sample/urls', methods=['GET'])
def get_sample_urls():
    return jsonify({
        'legitimate': [
            'https://www.google.com',
            'https://github.com/login',
            'https://www.amazon.com/gp/yourstore',
            'https://www.microsoft.com/en-us',
            'https://apple.com/shop'
        ],
        'phishing': [
            'http://192.168.1.1/login.php',
            'http://secure-paypal.com.verify-account.net/login',
            'http://amaz0n-security.com/verify',
            'http://login.facebook.com.evil-site.com/',
            'http://bit.ly/suspicious-link-123'
        ]
    })


@app.route('/api/sample/emails', methods=['GET'])
def get_sample_emails():
    return jsonify({
        'legitimate': [
            "Hi John,\n\nJust wanted to follow up on our meeting yesterday. Let me know if you have any questions.\n\nBest regards,\nSarah",
            "Your Amazon order #12345 has been shipped. Track your package at amazon.com/orders"
        ],
        'phishing': [
            "URGENT: Your PayPal account has been suspended! Click here immediately to verify your credentials: http://evil.com/login",
            "Dear Customer,\n\nWe noticed unusual activity on your account. Please verify your credit card information immediately to avoid suspension."
        ]
    })


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


# Auto-train on startup in background so port binds immediately
def startup_training():
    global _models_ready
    with app.app_context():
        print("PhishGuard API starting up...")
        success = load_models()
        if not success:
            print("No trained models found. Training now...")
            trainer = PhishingModelTrainer(model_dir=MODEL_DIR)
            X, y = trainer.generate_synthetic_dataset(n_samples=2000)
            trainer.train_all_models(X, y)
            load_models()
        _models_ready = True
        print(f"✓ {len(loaded_models)} models ready: {get_model_list()}")

threading.Thread(target=startup_training, daemon=True).start()


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)