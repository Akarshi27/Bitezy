import re
import numpy as np
import torch

class SemanticMatcher:
    """
    Hugging Face & Vector-based semantic matcher for customer intent and catalog items.
    Computes cosine similarity between customer query/intent and catalog item metadata.
    """
    def __init__(self):
        self.use_hf = False
        try:
            from transformers import AutoTokenizer, AutoModel
            self.tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
            self.model = AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
            self.use_hf = True
        except Exception:
            self.use_hf = False

    def _get_term_vector(self, text: str) -> np.ndarray:
        tokens = re.findall(r'\w+', str(text).lower())
        vocab = [
            "lunch", "dinner", "breakfast", "coffee", "tea", "cold", "hot", "snack",
            "dessert", "sweet", "spicy", "veg", "vegetarian", "nonveg", "bakery",
            "thali", "biryani", "drink", "beverage", "quick", "famished", "light",
            "meal", "toastie", "burger", "pizza", "noodle", "dosa", "idli", "paneer"
        ]
        vec = np.zeros(len(vocab), dtype=np.float32)
        for i, word in enumerate(vocab):
            if word in tokens or word in str(text).lower():
                vec[i] = 1.0
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec

    def compute_similarity(self, text1: str, text2: str) -> float:
        if not text1 or not text2:
            return 0.0

        if self.use_hf:
            try:
                inputs1 = self.tokenizer(text1, return_tensors="pt", padding=True, truncation=True)
                inputs2 = self.tokenizer(text2, return_tensors="pt", padding=True, truncation=True)
                with torch.no_grad():
                    emb1 = self.model(**inputs1).last_hidden_state.mean(dim=1)
                    emb2 = self.model(**inputs2).last_hidden_state.mean(dim=1)
                cos = torch.nn.functional.cosine_similarity(emb1, emb2)
                return float(cos[0])
            except Exception:
                pass

        v1 = torch.tensor(self._get_term_vector(text1))
        v2 = torch.tensor(self._get_term_vector(text2))
        dot = float(torch.dot(v1, v2))
        return round(dot, 4)

_matcher = None

def get_semantic_matcher():
    global _matcher
    if _matcher is None:
        _matcher = SemanticMatcher()
    return _matcher

def get_semantic_score(intent: str, preferences: str, item_title: str, item_tags: str, merchant_category: str) -> float:
    matcher = get_semantic_matcher()
    customer_query = f"{intent} {preferences}".strip()
    catalog_text = f"{item_title} {item_tags} {merchant_category}".strip()
    return matcher.compute_similarity(customer_query, catalog_text)
