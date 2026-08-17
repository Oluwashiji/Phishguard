"""
PhishGuard — Explainability Layer (XAI)
=========================================
Wraps the 4 trained models with SHAP explainers, all normalised to a
common unit: probability points toward the "Phishing" class.
"""

import os
import sys
from dataclasses import dataclass, field
from typing import Dict, List

import numpy as np
import pandas as pd
import shap

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TRAINING_DIR = os.path.join(BASE_DIR, 'training')

sys.path.insert(0, TRAINING_DIR)
from train import generate_dataset  # noqa: E402

BACKGROUND_SIZE = 200
KMEANS_SUMMARY_SIZE = 10
KERNEL_NSAMPLES = 100

BINARY_FEATURES = {
    'has_https', 'has_ip_address', 'has_at_symbol', 'has_double_slash',
    'is_shortened', 'has_suspicious_tld', 'brand_in_subdomain',
}

# Two label styles:
#  - binary features: fixed 'on'/'off' phrasing (direction depends on value)
#  - continuous features: a NEUTRAL factual template with the number baked
#    in — deliberately no "unusually high/long" judgment here, because the
#    same feature can push toward phishing OR legitimate depending on the
#    input (e.g. a short domain_length pushes legitimate; wording it as
#    "long" would contradict the direction). The sign/color in the UI is
#    what conveys good-vs-bad — the label is just the fact.
def _pluralize(count, singular: str, plural: str) -> str:
    n = int(count)
    return f'{n} {singular if n == 1 else plural}'
FEATURE_META = {
    'url_length':                {'phrase': lambda v: f'a URL that is {int(v)} characters long'},
    'domain_length':             {'phrase': lambda v: f'a domain name that is {int(v)} characters long'},
    'path_length':               {'phrase': lambda v: f'a URL path that is {int(v)} characters long'},
    'has_https':                 {'on': 'uses HTTPS', 'off': 'does not use HTTPS'},
    'num_dots':                  {'phrase': lambda v: f'{_pluralize(v, "dot", "dots")} in the URL'},
    'num_hyphens':               {'phrase': lambda v: f'{_pluralize(v, "hyphen", "hyphens")} in the URL'},
    'num_underscores':           {'phrase': lambda v: f'{_pluralize(v, "underscore", "underscores")} in the URL'},
    'num_slashes':               {'phrase': lambda v: f'{_pluralize(v, "slash", "slashes")} in the URL'},
    'num_digits':                {'phrase': lambda v: f'{_pluralize(v, "digit", "digits")} in the URL'},
    'num_special_chars':         {'phrase': lambda v: f'{_pluralize(v, "special character", "special characters")} in the URL'},
    'has_ip_address':            {'on': 'uses an IP address instead of a domain name',
                                   'off': 'uses a proper domain name rather than a raw IP address'},
    'has_at_symbol':             {'on': 'contains an @ symbol (a common credential-masking trick)',
                                   'off': 'contains no @ symbol'},
    'has_double_slash':          {'on': 'has a double slash in the path (a redirection trick)',
                                   'off': 'has no double slash in the path'},
    'suspicious_keywords_count': {'phrase': lambda v: f'{_pluralize(v, "suspicious keyword", "suspicious keywords")} found'},
    'is_shortened':               {'on': 'uses a URL shortening service', 'off': 'is not a shortened link'},
    'subdomain_count':           {'phrase': lambda v: _pluralize(v, "subdomain", "subdomains")},
    'has_suspicious_tld':        {'on': 'uses a suspicious top-level domain',
                                   'off': 'uses a common top-level domain'},
    'brand_in_subdomain':        {'on': 'has a brand name embedded in the subdomain (a spoofing tactic)',
                                   'off': 'has no brand name embedded in the subdomain'},
    'entropy':                   {'phrase': lambda v: f'a structural randomness (entropy) score of {float(v):.2f}'},
}


def _feature_label(feature: str, value) -> str:
    meta = FEATURE_META.get(feature)
    if meta is None:
        return feature
    if 'phrase' in meta:
        return meta['phrase'](value)
    return meta['on'] if value else meta['off']


@dataclass
class FeatureContribution:
    feature: str
    label: str
    value: float
    shap_value: float
    direction: str


@dataclass
class ExplanationResult:
    model_name: str
    base_value: float
    predicted_probability: float
    contributions: List[FeatureContribution] = field(default_factory=list)

    def top(self, n: int = 10) -> List[FeatureContribution]:
        return sorted(self.contributions, key=lambda c: abs(c.shap_value), reverse=True)[:n]


@dataclass
class WhatIfSuggestion:
    feature: str
    label: str
    original_value: float
    suggested_value: float
    original_probability: float
    new_probability: float
    would_flip: bool


class XAIEngine:
    """Builds and caches one SHAP explainer per model, in probability units."""

    def __init__(self, models: Dict, scalers: Dict, feature_names: List[str]):
        self.models = models
        self.scalers = scalers
        self.feature_names = feature_names
        self._explainers: Dict[str, object] = {}
        self._legit_medians: Dict[str, float] = {}
        self._build_explainers()

    def _build_explainers(self) -> None:
        X_bg, y_bg = generate_dataset(BACKGROUND_SIZE)
        X_bg = X_bg[self.feature_names]

        self._legit_medians = X_bg[y_bg == 0].median().to_dict()

        for name, model in self.models.items():
            scaler = self.scalers.get(name)
            bg_scaled = pd.DataFrame(
                scaler.transform(X_bg) if scaler else X_bg.values,
                columns=self.feature_names,
            )

            if name == 'random_forest':
                self._explainers[name] = shap.TreeExplainer(
                    model, data=bg_scaled, model_output='probability',
                )
            else:
                summary = shap.kmeans(bg_scaled, KMEANS_SUMMARY_SIZE)
                self._explainers[name] = shap.KernelExplainer(
                    model.predict_proba, summary,
                )

        print(f"[xai] Built {len(self._explainers)} explainers: {list(self._explainers)}")

    def _vectorise(self, features: Dict, model_name: str) -> pd.DataFrame:
        row = [features.get(f, 0) for f in self.feature_names]
        row = [int(v) if isinstance(v, bool) else v for v in row]
        X = pd.DataFrame([row], columns=self.feature_names, dtype=float)

        scaler = self.scalers.get(model_name)
        if scaler is not None:
            X = pd.DataFrame(scaler.transform(X), columns=self.feature_names)
        return X

    def _predict_proba_phishing(self, model_name: str, features: Dict) -> float:
        X = self._vectorise(features, model_name)
        return float(self.models[model_name].predict_proba(X)[0, 1])

    def explain(self, model_name: str, features: Dict) -> ExplanationResult:
        if model_name not in self._explainers:
            raise ValueError(f"No explainer for model '{model_name}'")

        explainer = self._explainers[model_name]
        X = self._vectorise(features, model_name)

        if model_name == 'random_forest':
            raw = explainer.shap_values(X, check_additivity=False)
        else:
            raw = explainer.shap_values(X, nsamples=KERNEL_NSAMPLES, silent=True)

        shap_row = np.array(raw)[0, :, 1]
        base = float(np.array(explainer.expected_value)[1])

        contributions = [
            FeatureContribution(
                feature=fname,
                label=_feature_label(fname, features.get(fname, 0)),
                value=features.get(fname, 0),
                shap_value=float(sv),
                direction='phishing' if sv > 0 else 'legitimate',
            )
            for fname, sv in zip(self.feature_names, shap_row)
        ]

        model = self.models[model_name]
        predicted_probability = float(model.predict_proba(X)[0, 1])

        return ExplanationResult(
            model_name=model_name,
            base_value=base,
            predicted_probability=predicted_probability,
            contributions=contributions,
        )

    def what_if(self, model_name: str, features: Dict, top_n: int = 5) -> List[WhatIfSuggestion]:
        """
        Single-feature counterfactuals: for each of the top-N features
        currently pushing toward "phishing", try changing just that one
        feature to what a typical legitimate input looks like, and see
        whether the prediction flips.

        Greedy, one-feature-at-a-time — tells you *a* change that would
        likely flip the result, not necessarily the smallest possible one.
        """
        explanation = self.explain(model_name, features)
        original_probability = explanation.predicted_probability

        if original_probability < 0.5:
            return []  # already legitimate — "what would flip this" doesn't apply

        phishing_pushers = [c for c in explanation.contributions if c.shap_value > 0]
        phishing_pushers.sort(key=lambda c: c.shap_value, reverse=True)

        suggestions = []
        for c in phishing_pushers[:top_n]:
            if c.feature in BINARY_FEATURES:
                if not c.value:
                    continue
                suggested_value = 0
            else:
                suggested_value = self._legit_medians.get(c.feature, c.value)
                if suggested_value == c.value:
                    continue

            trial_features = dict(features)
            trial_features[c.feature] = suggested_value
            new_probability = self._predict_proba_phishing(model_name, trial_features)

            suggestions.append(WhatIfSuggestion(
                feature=c.feature,
                label=c.label,
                original_value=c.value,
                suggested_value=suggested_value,
                original_probability=original_probability,
                new_probability=new_probability,
                would_flip=(original_probability >= 0.5) and (new_probability < 0.5),
            ))

        suggestions.sort(key=lambda s: (not s.would_flip, s.new_probability))
        return suggestions


def summarize(explanation: ExplanationResult, top_n: int = 3) -> str:
    """Plain-English, one-paragraph summary of the top contributing features."""
    verdict = 'phishing' if explanation.predicted_probability >= 0.5 else 'legitimate'
    top = [c for c in explanation.top(top_n) if abs(c.shap_value) > 0.01]

    if not top:
        return f"This input was classified as {verdict}, but no single feature stood out strongly."

    want_direction = 'phishing' if verdict == 'phishing' else 'legitimate'
    reasons = [c.label for c in top if c.direction == want_direction] or [c.label for c in top]

    if len(reasons) == 1:
        reason_text = reasons[0]
    elif len(reasons) == 2:
        reason_text = f"{reasons[0]} and {reasons[1]}"
    else:
        reason_text = f"{', '.join(reasons[:-1])}, and {reasons[-1]}"

    confidence_pct = round(
        (explanation.predicted_probability if verdict == 'phishing'
         else 1 - explanation.predicted_probability) * 100, 1
    )

    return (
        f"This input was flagged as {verdict} ({confidence_pct}% confidence), "
        f"primarily driven by: {reason_text}."
    )