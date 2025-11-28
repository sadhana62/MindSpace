from sentence_transformers import SentenceTransformer, util

class ContentValidator:
    def __init__(self):

        
        print("Loading Validation Model (all-MiniLM-L6-v2)...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        print("Model Loaded.")

    def is_relevant(self, article_text, target_topic, threshold=0.35):
        """
        Checks if the article text is semantically close to the target topic.
        Returns: (True/False, Score)
        """
        # 1. Encode the Target (e.g., "Academic stress and exam anxiety in Indian students")
        target_embedding = self.model.encode(target_topic, convert_to_tensor=True)

        # 2. Encode the Article (Title + Abstract is usually enough and faster)
        article_embedding = self.model.encode(article_text, convert_to_tensor=True)

        # 3. Calculate Cosine Similarity (0 = Not related, 1 = Identical)
        score = util.cos_sim(target_embedding, article_embedding).item()

        # 4. Decision
        is_pass = score >= threshold
        return score