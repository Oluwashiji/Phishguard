"""
Feature Extraction Module for Phishing Detection
Extracts features from URLs and email text for ML model input
"""

import re
import urllib.parse
from typing import Dict, List, Union


class URLFeatureExtractor:
    """Extract features from URLs for phishing detection"""
    
    # Suspicious keywords commonly found in phishing URLs
    SUSPICIOUS_KEYWORDS = [
        'secure', 'account', 'webscr', 'login', 'ebayisapi', 'signin',
        'banking', 'confirm', 'paypal', 'verif', 'wallet', 'alert',
        'login', 'signin', 'verify', 'update', 'security', 'authenticate',
        'password', 'credential', 'bank', 'credit', 'payment'
    ]
    
    # Shortening services
    SHORTENING_SERVICES = [
        'bit.ly', 'tinyurl', 't.co', 'goo.gl', 'ow.ly', 'buff.ly',
        'is.gd', 'shorte.st', 'adf.ly', 'bit.do', 'short.link'
    ]
    
    def __init__(self, url: str):
        self.url = url.lower()
        self.parsed = urllib.parse.urlparse(url)
        self.domain = self.parsed.netloc.lower()
        self.path = self.parsed.path.lower()
        
    def extract_all_features(self) -> Dict[str, Union[int, float, bool]]:
        """Extract all URL features and return as dictionary"""
        features = {
            'url_length': self.get_url_length(),
            'domain_length': self.get_domain_length(),
            'path_length': self.get_path_length(),
            'has_https': self.has_https(),
            'num_dots': self.count_dots(),
            'num_hyphens': self.count_hyphens(),
            'num_underscores': self.count_underscores(),
            'num_slashes': self.count_slashes(),
            'num_digits': self.count_digits(),
            'num_special_chars': self.count_special_chars(),
            'has_ip_address': self.has_ip_address(),
            'has_at_symbol': self.has_at_symbol(),
            'has_double_slash': self.has_double_slash(),
            'suspicious_keywords_count': self.count_suspicious_keywords(),
            'is_shortened': self.is_shortened_url(),
            'subdomain_count': self.count_subdomains(),
            'has_suspicious_tld': self.has_suspicious_tld(),
            'brand_in_subdomain': self.brand_in_subdomain(),
            'entropy': self.calculate_entropy(),
        }
        return features
    
    def get_url_length(self) -> int:
        """Length of the entire URL"""
        return len(self.url)
    
    def get_domain_length(self) -> int:
        """Length of the domain"""
        return len(self.domain)
    
    def get_path_length(self) -> int:
        """Length of the path"""
        return len(self.path)
    
    def has_https(self) -> bool:
        """Check if URL uses HTTPS"""
        return self.parsed.scheme == 'https'
    
    def count_dots(self) -> int:
        """Count number of dots in URL"""
        return self.url.count('.')
    
    def count_hyphens(self) -> int:
        """Count number of hyphens"""
        return self.url.count('-')
    
    def count_underscores(self) -> int:
        """Count number of underscores"""
        return self.url.count('_')
    
    def count_slashes(self) -> int:
        """Count number of slashes"""
        return self.url.count('/')
    
    def count_digits(self) -> int:
        """Count number of digits"""
        return sum(c.isdigit() for c in self.url)
    
    def count_special_chars(self) -> int:
        """Count special characters"""
        special = set('!@#$%^&*()+=[]{}|;:\'",<>?')
        return sum(1 for c in self.url if c in special)
    
    def has_ip_address(self) -> bool:
        """Check if URL contains IP address"""
        ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
        return bool(re.search(ip_pattern, self.domain))
    
    def has_at_symbol(self) -> bool:
        """Check if URL contains @ symbol"""
        return '@' in self.url
    
    def has_double_slash(self) -> bool:
        """Check for // in path (redirection trick)"""
        return '//' in self.path
    
    def count_suspicious_keywords(self) -> int:
        """Count suspicious keywords in URL"""
        return sum(1 for keyword in self.SUSPICIOUS_KEYWORDS if keyword in self.url)
    
    def is_shortened_url(self) -> bool:
        """Check if URL uses shortening service"""
        return any(service in self.domain for service in self.SHORTENING_SERVICES)
    
    def count_subdomains(self) -> int:
        """Count number of subdomains"""
        if not self.domain:
            return 0
        parts = self.domain.split('.')
        # Remove www and TLD
        if len(parts) > 2:
            return len(parts) - 2
        return 0
    
    def has_suspicious_tld(self) -> bool:
        """Check for suspicious top-level domains"""
        suspicious_tlds = ['.tk', '.ml', '.ga', '.cf', '.top', '.xyz', '.click', '.link']
        return any(self.url.endswith(tld) for tld in suspicious_tlds)
    
    def brand_in_subdomain(self) -> bool:
        """Check if brand name appears in subdomain (common phishing trick)"""
        brands = ['paypal', 'google', 'facebook', 'amazon', 'apple', 'microsoft', 'netflix']
        subdomains = self.domain.split('.')[:-2]  # Exclude domain and TLD
        return any(brand in '.'.join(subdomains) for brand in brands)
    
    def calculate_entropy(self) -> float:
        """Calculate Shannon entropy of URL (higher = more random/suspicious)"""
        import math
        if not self.url:
            return 0.0
        prob = [self.url.count(c) / len(self.url) for c in set(self.url)]
        return -sum(p * math.log2(p) for p in prob)


class EmailFeatureExtractor:
    """Extract features from email text for phishing detection"""
    
    # Phishing-related keywords
    PHISHING_KEYWORDS = [
        'urgent', 'immediate', 'action required', 'verify', 'suspended',
        'limited', 'expire', 'click here', 'update your', 'confirm your',
        'account will be', 'security alert', 'unusual activity',
        'password expired', 'login attempt', 'verify identity',
        'bank account', 'credit card', 'social security', 'tax refund'
    ]
    
    # Suspicious patterns
    SUSPICIOUS_PATTERNS = [
        r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',  # Credit card
        r'\b\d{3}-\d{2}-\d{4}\b',  # SSN
        r'password\s*[:=]\s*\S+',  # Password in plain text
        r'\$\d+[.,]?\d*',  # Dollar amounts
    ]
    
    def __init__(self, email_text: str):
        self.text = email_text.lower()
        self.lines = email_text.split('\n')
        
    def extract_all_features(self) -> Dict[str, Union[int, float, bool]]:
        """Extract all email features"""
        features = {
            'text_length': len(self.text),
            'num_words': len(self.text.split()),
            'num_lines': len(self.lines),
            'num_exclamation': self.text.count('!'),
            'num_question': self.text.count('?'),
            'num_capitals': sum(1 for c in self.text if c.isupper()),
            'num_digits': sum(c.isdigit() for c in self.text),
            'has_html': self.has_html(),
            'num_links': self.count_links(),
            'num_attachments': self.count_attachments(),
            'phishing_keywords_count': self.count_phishing_keywords(),
            'urgency_score': self.calculate_urgency_score(),
            'has_suspicious_patterns': self.has_suspicious_patterns(),
            'sender_mismatch': self.check_sender_mismatch(),
            'reply_to_different': self.check_reply_to_different(),
            'has_spelling_errors': self.has_spelling_errors(),
            'grammar_score': self.grammar_score(),
        }
        return features
    
    def has_html(self) -> bool:
        """Check if email contains HTML"""
        html_tags = ['<html', '<body', '<div', '<span', '<a href', '<img', '<table']
        return any(tag in self.text for tag in html_tags)
    
    def count_links(self) -> int:
        """Count number of links in email"""
        url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        return len(re.findall(url_pattern, self.text))
    
    def count_attachments(self) -> int:
        """Count attachment references"""
        attachment_words = ['attachment', 'attached', 'enclosed', 'file']
        return sum(self.text.count(word) for word in attachment_words)
    
    def count_phishing_keywords(self) -> int:
        """Count phishing-related keywords"""
        return sum(1 for keyword in self.PHISHING_KEYWORDS if keyword in self.text)
    
    def calculate_urgency_score(self) -> int:
        """Calculate urgency score based on time-related words"""
        urgency_words = ['now', 'today', 'immediately', 'urgent', 'asap', 'deadline', 'expires']
        return sum(self.text.count(word) for word in urgency_words)
    
    def has_suspicious_patterns(self) -> bool:
        """Check for suspicious patterns like credit cards, SSNs"""
        return any(re.search(pattern, self.text) for pattern in self.SUSPICIOUS_PATTERNS)
    
    def check_sender_mismatch(self) -> bool:
        """Check if display name doesn't match email address"""
        # Simplified check - would need full email headers in practice
        from_pattern = r'from:\s*([^<\n]+)<?([^>\n]*)>?'
        matches = re.findall(from_pattern, self.text)
        if matches:
            display_name, email = matches[0]
            # Check if display name contains known brand but email doesn't match
            brands = ['paypal', 'amazon', 'apple', 'google', 'microsoft']
            display_lower = display_name.lower()
            email_lower = email.lower()
            for brand in brands:
                if brand in display_lower and brand not in email_lower:
                    return True
        return False
    
    def check_reply_to_different(self) -> bool:
        """Check if reply-to address differs from sender"""
        # Simplified - would need full headers
        return 'reply-to:' in self.text and 'from:' in self.text
    
    def has_spelling_errors(self) -> bool:
        """Check for common spelling errors (simplified)"""
        common_misspellings = ['acount', 'verifiy', 'securty', 'updat', 'loggin']
        return any(word in self.text for word in common_misspellings)
    
    def grammar_score(self) -> float:
        """Simple grammar score (0-1, higher is better)"""
        # Simplified metric based on capitalization and punctuation
        sentences = [s.strip() for s in re.split(r'[.!?]+', self.text) if s.strip()]
        if not sentences:
            return 0.0
        
        score = 0
        for sentence in sentences:
            # Check if sentence starts with capital
            if sentence[0].isupper():
                score += 1
        
        return score / len(sentences)


def extract_features(input_data: str, input_type: str = 'auto') -> Dict:
    """
    Main function to extract features from input
    
    Args:
        input_data: URL or email text
        input_type: 'url', 'email', or 'auto' (auto-detect)
    
    Returns:
        Dictionary of extracted features
    """
    if input_type == 'auto':
        # Auto-detect based on content
        if input_data.startswith(('http://', 'https://', 'www.')) or '.' in input_data.split()[0]:
            input_type = 'url'
        else:
            input_type = 'email'
    
    if input_type == 'url':
        extractor = URLFeatureExtractor(input_data)
        features = extractor.extract_all_features()
        features['input_type'] = 'url'
        return features
    else:
        extractor = EmailFeatureExtractor(input_data)
        features = extractor.extract_all_features()
        features['input_type'] = 'email'
        return features
