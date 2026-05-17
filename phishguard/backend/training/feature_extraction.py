"""
PhishGuard — Feature Extraction
================================
Stateless extractors for URLs and email text.
No ML imports, no side-effects — safe to import anywhere.
"""

import math
import re
import urllib.parse
from typing import Dict, Union


# ── URL feature extractor ────────────────────────────────────────────────────

class URLFeatureExtractor:
    """Extract numerical/boolean features from a single URL."""

    SUSPICIOUS_KEYWORDS = [
        'secure', 'account', 'webscr', 'login', 'ebayisapi', 'signin',
        'banking', 'confirm', 'paypal', 'verif', 'wallet', 'alert',
        'verify', 'update', 'security', 'authenticate',
        'password', 'credential', 'bank', 'credit', 'payment',
    ]

    SHORTENING_SERVICES = [
        'bit.ly', 'tinyurl', 't.co', 'goo.gl', 'ow.ly', 'buff.ly',
        'is.gd', 'shorte.st', 'adf.ly', 'bit.do', 'short.link',
    ]

    SUSPICIOUS_TLDS = [
        '.tk', '.ml', '.ga', '.cf', '.top', '.xyz', '.click', '.link',
    ]

    BRAND_NAMES = [
        'paypal', 'google', 'facebook', 'amazon', 'apple', 'microsoft', 'netflix',
    ]

    def __init__(self, url: str):
        self.url = url.lower()
        self.parsed = urllib.parse.urlparse(url)
        self.domain = self.parsed.netloc.lower()
        self.path = self.parsed.path.lower()

    # ── public API ──────────────────────────────────────────────────────────

    def extract_all_features(self) -> Dict[str, Union[int, float, bool]]:
        return {
            'url_length':               len(self.url),
            'domain_length':            len(self.domain),
            'path_length':              len(self.path),
            'has_https':                self.parsed.scheme == 'https',
            'num_dots':                 self.url.count('.'),
            'num_hyphens':              self.url.count('-'),
            'num_underscores':          self.url.count('_'),
            'num_slashes':              self.url.count('/'),
            'num_digits':               sum(c.isdigit() for c in self.url),
            'num_special_chars':        self._count_special_chars(),
            'has_ip_address':           self._has_ip_address(),
            'has_at_symbol':            '@' in self.url,
            'has_double_slash':         '//' in self.path,
            'suspicious_keywords_count': self._count_suspicious_keywords(),
            'is_shortened':             self._is_shortened(),
            'subdomain_count':          self._count_subdomains(),
            'has_suspicious_tld':       self._has_suspicious_tld(),
            'brand_in_subdomain':       self._brand_in_subdomain(),
            'entropy':                  self._entropy(),
        }

    # ── private helpers ──────────────────────────────────────────────────────

    def _count_special_chars(self) -> int:
        special = set('!@#$%^&*()+=[]{}|;:\'",<>?')
        return sum(1 for c in self.url if c in special)

    def _has_ip_address(self) -> bool:
        return bool(re.search(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', self.domain))

    def _count_suspicious_keywords(self) -> int:
        return sum(1 for kw in self.SUSPICIOUS_KEYWORDS if kw in self.url)

    def _is_shortened(self) -> bool:
        return any(svc in self.domain for svc in self.SHORTENING_SERVICES)

    def _count_subdomains(self) -> int:
        parts = self.domain.split('.')
        return max(0, len(parts) - 2) if self.domain else 0

    def _has_suspicious_tld(self) -> bool:
        return any(self.url.endswith(tld) for tld in self.SUSPICIOUS_TLDS)

    def _brand_in_subdomain(self) -> bool:
        subdomains = '.'.join(self.domain.split('.')[:-2])
        return any(brand in subdomains for brand in self.BRAND_NAMES)

    def _entropy(self) -> float:
        if not self.url:
            return 0.0
        probs = [self.url.count(c) / len(self.url) for c in set(self.url)]
        return -sum(p * math.log2(p) for p in probs)


# ── Email feature extractor ──────────────────────────────────────────────────

class EmailFeatureExtractor:
    """Extract numerical/boolean features from raw email text."""

    PHISHING_KEYWORDS = [
        'urgent', 'immediate', 'action required', 'verify', 'suspended',
        'limited', 'expire', 'click here', 'update your', 'confirm your',
        'account will be', 'security alert', 'unusual activity',
        'password expired', 'login attempt', 'verify identity',
        'bank account', 'credit card', 'social security', 'tax refund',
    ]

    SUSPICIOUS_PATTERNS = [
        r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',  # credit card
        r'\b\d{3}-\d{2}-\d{4}\b',                         # SSN
        r'password\s*[:=]\s*\S+',                          # inline password
        r'\$\d+[.,]?\d*',                                  # dollar amounts
    ]

    URGENCY_WORDS = [
        'now', 'today', 'immediately', 'urgent', 'asap', 'deadline', 'expires',
    ]

    COMMON_MISSPELLINGS = [
        'acount', 'verifiy', 'securty', 'updat', 'loggin',
    ]

    BRAND_NAMES = ['paypal', 'amazon', 'apple', 'google', 'microsoft']

    def __init__(self, email_text: str):
        self.raw = email_text
        self.text = email_text.lower()
        self.lines = email_text.split('\n')

    # ── public API ──────────────────────────────────────────────────────────

    def extract_all_features(self) -> Dict[str, Union[int, float, bool]]:
        return {
            'text_length':              len(self.text),
            'num_words':                len(self.text.split()),
            'num_lines':                len(self.lines),
            'num_exclamation':          self.text.count('!'),
            'num_question':             self.text.count('?'),
            'num_capitals':             sum(1 for c in self.raw if c.isupper()),
            'num_digits':               sum(c.isdigit() for c in self.text),
            'has_html':                 self._has_html(),
            'num_links':                self._count_links(),
            'num_attachments':          self._count_attachment_refs(),
            'phishing_keywords_count':  self._count_phishing_keywords(),
            'urgency_score':            self._urgency_score(),
            'has_suspicious_patterns':  self._has_suspicious_patterns(),
            'sender_mismatch':          self._sender_mismatch(),
            'reply_to_different':       'reply-to:' in self.text and 'from:' in self.text,
            'has_spelling_errors':      self._has_spelling_errors(),
            'grammar_score':            self._grammar_score(),
        }

    # ── private helpers ──────────────────────────────────────────────────────

    def _has_html(self) -> bool:
        tags = ['<html', '<body', '<div', '<span', '<a href', '<img', '<table']
        return any(tag in self.text for tag in tags)

    def _count_links(self) -> int:
        pattern = r'https?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        return len(re.findall(pattern, self.text))

    def _count_attachment_refs(self) -> int:
        words = ['attachment', 'attached', 'enclosed', 'file']
        return sum(self.text.count(w) for w in words)

    def _count_phishing_keywords(self) -> int:
        return sum(1 for kw in self.PHISHING_KEYWORDS if kw in self.text)

    def _urgency_score(self) -> int:
        return sum(self.text.count(w) for w in self.URGENCY_WORDS)

    def _has_suspicious_patterns(self) -> bool:
        return any(re.search(p, self.text) for p in self.SUSPICIOUS_PATTERNS)

    def _sender_mismatch(self) -> bool:
        matches = re.findall(r'from:\s*([^<\n]+)<?([^>\n]*)>?', self.text)
        if not matches:
            return False
        display, email = matches[0]
        return any(
            brand in display.lower() and brand not in email.lower()
            for brand in self.BRAND_NAMES
        )

    def _has_spelling_errors(self) -> bool:
        return any(w in self.text for w in self.COMMON_MISSPELLINGS)

    def _grammar_score(self) -> float:
        sentences = [s.strip() for s in re.split(r'[.!?]+', self.raw) if s.strip()]
        if not sentences:
            return 0.0
        return sum(1 for s in sentences if s[0].isupper()) / len(sentences)


# ── Unified entry point ──────────────────────────────────────────────────────

def extract_features(input_data: str, input_type: str = 'auto') -> Dict:
    """
    Extract features from a URL or email string.

    Parameters
    ----------
    input_data : str
        The raw URL or email body.
    input_type : str
        'url', 'email', or 'auto' (auto-detect from content).

    Returns
    -------
    dict
        Feature dict with an extra 'input_type' key ('url' or 'email').
    """
    if input_type == 'auto':
        first_token = input_data.split()[0] if input_data.split() else ''
        if input_data.startswith(('http://', 'https://', 'www.')) or '.' in first_token:
            input_type = 'url'
        else:
            input_type = 'email'

    if input_type == 'url':
        features = URLFeatureExtractor(input_data).extract_all_features()
    else:
        features = EmailFeatureExtractor(input_data).extract_all_features()

    features['input_type'] = input_type
    return features