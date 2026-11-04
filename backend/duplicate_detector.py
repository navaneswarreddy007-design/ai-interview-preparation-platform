import re
import difflib
from typing import Set, Tuple, List, Optional

# Domain-specific technical and behavioral synonym & acronym expansions
ACRONYMS_AND_SYNONYMS = {
    r'\bml\b': 'machine learning',
    r'\bai\b': 'artificial intelligence',
    r'\bjs\b': 'javascript',
    r'\bts\b': 'typescript',
    r'\bdb\b|\bdatabases\b': 'database',
    r'\bk8s\b': 'kubernetes',
    r'\bci\/cd\b': 'continuous integration deployment',
    r'\bapi\b|\bapis\b': 'api',
    r'\bsql\b': 'sql query',
    r'\bnosql\b': 'nonrelational database',
    r'\bdl\b': 'deep learning',
    r'\bnlp\b': 'natural language processing',
    r'\bfe\b': 'frontend',
    r'\bbe\b': 'backend',
    r'\bfs\b': 'fullstack',
    r'\bpr\b|\bprs\b': 'pull request',
    r'\boverfit\b|\boverfitting\b': 'overfitting',
    r'\bunderfit\b|\bunderfitting\b': 'underfitting',
    r'\bindex\b|\bindexes\b|\bindexing\b': 'indexing',
    r'\bcache\b|\bcaching\b': 'caching',
    r'\boptimize\b|\boptimizing\b|\boptimization\b': 'optimization',
    r'\bscale\b|\bscaling\b|\bscalability\b': 'scaling',
    r'\bconcurrency\b|\bconcurrent\b|\bmultithreading\b': 'concurrency',
    r'\bcolleague\b|\bcoworker\b|\bpeer\b|\bteam member\b|\bteammate\b': 'teammate',
    r'\bconflict\b|\bdisagree\b|\bdisagreement\b|\bfriction\b': 'conflict',
    r'\bdeadline\b|\btight timeline\b|\bpressure\b': 'deadline',
}

# Common boilerplate question openings
BOILERPLATE_PATTERNS = [
    r'^(?:can you\s+)?explain\b',
    r'^(?:can you\s+)?describe\b',
    r'^(?:can you\s+)?walk me through\b',
    r'^(?:can you\s+)?tell me about\b',
    r'^(?:can you\s+)?discuss\b',
    r'^(?:can you\s+)?how do you\b',
    r'^(?:can you\s+)?how would you\b',
    r'^(?:can you\s+)?how does\b',
    r'^what is\b',
    r'^what are\b',
    r'^what was\b',
    r'^what were\b',
    r'^give an example of\b',
    r'^in your experience(?: with)?\b',
    r'^suppose you\b',
    r'^reflecting on your experience\b',
]

STOPWORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
    'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
    'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
    'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
    'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
    'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
    'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn', 'we', 'were',
    'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your',
    'yours', 'yourself', 'yourselves'
}

def normalize_text(text: str) -> str:
    """
    Normalizes a question by lowercasing, stripping punctuation, expanding acronyms,
    and trimming extraneous whitespace.
    """
    if not text:
        return ""
    
    # 1. Lowercase
    cleaned = text.lower().strip()
    
    # 2. Expand acronyms and canonical terms
    for pattern, replacement in ACRONYMS_AND_SYNONYMS.items():
        cleaned = re.sub(pattern, replacement, cleaned)
        
    # 3. Strip non-alphanumeric (keep spaces)
    cleaned = re.sub(r'[^a-z0-9\s]', ' ', cleaned)
    
    # 4. Collapse whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def extract_concept_tokens(text: str) -> Set[str]:
    """
    Extracts the core semantic keyword tokens from a question after stripping
    boilerplate prefixes ('Explain...', 'What is...') and standard stopwords.
    """
    norm = normalize_text(text)
    
    # Strip common boilerplate openings
    for bp in BOILERPLATE_PATTERNS:
        norm = re.sub(bp, '', norm).strip()
        
    words = norm.split()
    # Filter stopwords and short numbers/chars
    tokens = {w for w in words if w not in STOPWORDS and len(w) > 1}
    return tokens

def calculate_similarity(q1: str, q2: str) -> float:
    """
    Computes a hybrid similarity score between two questions using:
    1. Exact normalized text match (1.0)
    2. Jaccard similarity on core concept tokens
    3. Token containment (overlap relative to the shorter question)
    4. SequenceMatcher ratio on normalized strings
    """
    norm1 = normalize_text(q1)
    norm2 = normalize_text(q2)
    
    # Exact match
    if norm1 == norm2:
        return 1.0
        
    tokens1 = extract_concept_tokens(q1)
    tokens2 = extract_concept_tokens(q2)
    
    # Token Jaccard similarity
    if tokens1 and tokens2:
        intersection = tokens1.intersection(tokens2)
        union = tokens1.union(tokens2)
        jaccard = len(intersection) / len(union) if union else 0.0
        
        # Containment: ratio of overlap to the smaller token set
        min_len = min(len(tokens1), len(tokens2))
        containment = (len(intersection) / min_len) if min_len > 0 else 0.0
    else:
        jaccard = 0.0
        containment = 0.0

    # Sequence string similarity
    seq_ratio = difflib.SequenceMatcher(None, norm1, norm2).ratio()
    
    # High containment on significant sets indicates the same question asked with extra wording
    if containment >= 0.85 and min(len(tokens1), len(tokens2)) >= 2:
        composite = max(jaccard, containment * 0.9, seq_ratio)
    else:
        composite = max(jaccard, (jaccard * 0.6 + seq_ratio * 0.4), seq_ratio)
        
    return round(composite, 3)

def is_near_duplicate(
    candidate_q: str,
    target_q: str,
    threshold: float = 0.65
) -> bool:
    """
    Returns True if candidate_q is deemed too similar to target_q.
    """
    return calculate_similarity(candidate_q, target_q) >= threshold

def find_duplicate(
    candidate_q: str,
    existing_questions: List[str],
    threshold: float = 0.65
) -> Tuple[bool, float, Optional[str]]:
    """
    Checks candidate_q against a list of existing question strings.
    Returns (is_dup, max_similarity, matching_existing_q).
    """
    if not existing_questions:
        return False, 0.0, None
        
    max_sim = 0.0
    best_match = None
    
    for eq in existing_questions:
        sim = calculate_similarity(candidate_q, eq)
        if sim > max_sim:
            max_sim = sim
            best_match = eq
            if max_sim >= 0.95: # Early exit on near-exact match
                break
                
    if max_sim >= threshold:
        return True, max_sim, best_match
    return False, max_sim, None
