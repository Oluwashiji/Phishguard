const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface PredictionResult {
  result: string;
  is_phishing: boolean;
  confidence: number;
  model_used: string;
  input_type: string;
  features: Record<string, number | boolean>;
  suspicious_features: Array<{
    feature: string;
    description: string;
    severity: string;
  }>;
  timestamp: string;
}

export interface ModelMetrics {
  model_name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc?: number;
  cv_mean?: number;
  cv_std?: number;
  confusion_matrix?: number[][];
}

export interface AllModelsPrediction {
  individual_results: Array<{
    model: string;
    result: string;
    confidence: number;
    is_phishing: boolean;
  }>;
  consensus: string;
  consensus_confidence: number;
  agreement_ratio: string;
  timestamp: string;
}

class ApiService {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async healthCheck() {
    return this.fetch<{ status: string; models_loaded: string[]; timestamp: string }>('/health');
  }

  async getModels() {
    return this.fetch<{ models: Array<{ name: string; display_name: string; loaded: boolean }>; count: number }>('/models');
  }

  async predict(input: string, type: string = 'auto', model: string = 'random_forest'): Promise<PredictionResult> {
    return this.fetch<PredictionResult>('/predict', {
      method: 'POST',
      body: JSON.stringify({ input, type, model }),
    });
  }

  async predictAll(input: string, type: string = 'auto'): Promise<AllModelsPrediction> {
    return this.fetch<AllModelsPrediction>('/predict/all', {
      method: 'POST',
      body: JSON.stringify({ input, type }),
    });
  }

  async getMetrics(): Promise<{ metrics: ModelMetrics[] }> {
    return this.fetch<{ metrics: ModelMetrics[] }>('/metrics');
  }

  async getFeatureImportance(model: string = 'random_forest') {
    return this.fetch<{ model: string; feature_importance: Record<string, number> }>(`/features/importance?model=${model}`);
  }

  async analyze(input: string, type: string = 'auto') {
    return this.fetch<{
      input_type: string;
      features: Record<string, number | boolean>;
      suspicious_indicators: Array<{ feature: string; description: string; severity: string }>;
      risk_score: number;
    }>('/analyze', {
      method: 'POST',
      body: JSON.stringify({ input, type }),
    });
  }

  async retrainModels(nSamples: number = 3000) {
    return this.fetch<{ message: string; results: unknown; timestamp: string }>('/train', {
      method: 'POST',
      body: JSON.stringify({ n_samples: nSamples }),
    });
  }

  async getSampleUrls() {
    return this.fetch<{ legitimate: string[]; phishing: string[] }>('/sample/urls');
  }

  async getSampleEmails() {
    return this.fetch<{ legitimate: string[]; phishing: string[] }>('/sample/emails');
  }
}

export const api = new ApiService();
