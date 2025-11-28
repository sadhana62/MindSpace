import os
import cloudscraper
from Bio import Entrez
from bs4 import BeautifulSoup
import time
import json
from sentence_transformers import SentenceTransformer, util

class RobustYouthFetcher:
    def __init__(self):
        self.scraper = cloudscraper.create_scraper()
        Entrez.email = "rajaryan0528@gmail.com"
        print("Loading AI Model (all-MiniLM-L6-v2)...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        print("Model Loaded.")
        
        # --- LAYER 3: THE GOLDEN BACKUPS ---
        # Fallback content if API returns 0 results
        self.golden_backups = {
            "student_somatic": {
                "title": "Manual Guide: Understanding Psychosomatic Pain in Students",
                "text": "### The Mind-Body Connection in Students\nMany students in India experience physical pain like stomach aches, headaches, or nausea before exams. This is often not a viral infection but 'Somatization'.\n\n### Mechanism\nWhen the brain is under high pressure (cortisol spike), it sends distress signals to the gut (enteric nervous system). This causes acidity, gas, or pain. It is a biological reaction to psychological stress.",
                "metadata": {"source": "Manual Fallback", "country": "India", "cluster": "student_somatic", "type": "Education"}
            },
            "student_academic": {
                 "title": "Manual Guide: Academic Stress and Coping",
                 "text": "### Academic Pressure in India\nStudents often face immense pressure from parents regarding NEET/JEE exams. This leads to burnout.\n### Coping\nRecognize that your worth is not your rank.",
                 "metadata": {"source": "Manual Fallback", "country": "India", "cluster": "student_academic", "type": "Education"}
            },
            "young_professional": {
                "title": "Manual Guide: Identifying Burnout",
                "text": "### Burnout vs Stress\nStress is 'too much' pressure. Burnout is 'not enough' energy. In Indian corporate culture, burnout often manifests as cynicism and detachment.",
                "metadata": {"source": "Manual Fallback", "country": "India", "cluster": "young_professional", "type": "Education"}
            },
            "digital_stress": {
                "title": "Manual Guide: Digital Detox",
                "text": "### FOMO and Social Media\nConstant comparison on Instagram leads to 'Fear of Missing Out'. Limit screen time to 30 mins before bed to improve sleep quality.",
                "metadata": {"source": "Manual Fallback", "country": "India", "cluster": "digital_stress", "type": "Education"}
            },
            "suicide_risk": {
                "title": "Manual Guide: Crisis Intervention",
                "text": "### Immediate Help\nIf you feel helpless, call Tele MANAS (14416). Suicide is often a temporary response to a temporary problem. Delay the decision.",
                "metadata": {"source": "Manual Fallback", "country": "India", "cluster": "suicide_risk", "type": "Crisis"}
            }
        }

    def get_youth_resources(self):
        strategies = [
            # 1. SOMATIC
            {
                "cluster": "student_somatic",
                "strict_query": '("Stomach ache" OR "Headache" OR "Fainting") AND ("Exam stress" OR "School refusal") AND India',
                "broad_query": '("Somatic symptoms" OR "Functional pain") AND ("Adolescent" OR "Student") AND India',
                "validation_prompt": "Physical symptoms like headache, stomach pain, or fatigue caused by psychological stress or anxiety in students.",
                "limit": 5
            },
            # 2. ACADEMIC
            {
                "cluster": "student_academic",
                "strict_query": '("Academic stress" OR "Exam anxiety" OR "Parental pressure") AND ("Adolescent" OR "Student") AND India',
                "broad_query": '("Educational stress" OR "Student mental health") AND India',
                "validation_prompt": "Research regarding academic pressure, exam anxiety, coaching centers, and parental expectations affecting Indian students.",
                "limit": 5
            },
            # 3. PROFESSIONAL
            {
                "cluster": "young_professional",
                "strict_query": '("Burnout" OR "Work-life balance" OR "Job insecurity") AND ("Young adult" OR "IT professionals") AND India',
                "broad_query": '("Occupational stress" OR "Workplace mental health") AND India',
                "validation_prompt": "Mental health issues like burnout, stress, and anxiety in young Indian professionals, IT sector, or corporate employees.",
                "limit": 5
            },
            # 4. DIGITAL
            {
                "cluster": "digital_stress",
                "strict_query": '("Internet addiction" OR "Social media" OR "Cyberbullying") AND ("Adolescent" OR "Young adult") AND India',
                "broad_query": '("Digital stress" OR "Smartphone addiction") AND India',
                "validation_prompt": "The impact of social media usage, internet addiction, cyberbullying, or body image issues on the mental health of Indian youth.",
                "limit": 5
            },
            # 5. CRISIS
            {
                "cluster": "suicide_risk",
                "strict_query": '("Suicide ideation" OR "Self-harm") AND ("Student" OR "Adolescent") AND India',
                "broad_query": '("Suicide prevention" OR "Crisis intervention") AND India',
                "validation_prompt": "Risk factors, early warning signs, and prevention strategies for suicide or self-harm among Indian youth.",
                "limit": 5
            }
        ]

        all_docs = []

        for strat in strategies:
            print(f"\nProcessing Cluster: {strat['cluster']}")
            
            # --- ATTEMPT 1: STRICT ---
            print("Attempting STRICT Search...")
            docs = self.fetch_and_validate(strat['strict_query'], strat['validation_prompt'], strat['limit'], strat['cluster'])
            
            # --- ATTEMPT 2: BROAD ---
            if len(docs) == 0:
                print("Strict search failed (0 results). Trying BROAD Search...")
                docs = self.fetch_and_validate(strat['broad_query'], strat['validation_prompt'], strat['limit'], strat['cluster'])
            
            # --- ATTEMPT 3: BACKUP ---
            if len(docs) == 0:
                print("Broad search failed! Injecting GOLDEN BACKUP.")
                backup_doc = self.golden_backups.get(strat['cluster'])
                if backup_doc:
                    all_docs.append(backup_doc)
            else:
                all_docs.extend(docs)

        return all_docs

    def fetch_and_validate(self, query, validation_prompt, limit, cluster_tag):
        raw_docs = self.fetch_pubmed_raw(query, limit) 
        valid_docs = []
        target_embedding = self.model.encode(validation_prompt, convert_to_tensor=True)

        for doc in raw_docs:
            # Check similarity between Prompt and (Title + Abstract)
            content_check = f"{doc['title']} {doc.get('abstract', '')}"
            doc_embedding = self.model.encode(content_check, convert_to_tensor=True)
            score = util.cos_sim(target_embedding, doc_embedding).item()

            if score > 0.25: # Threshold
                doc['metadata'] = {
                    "cluster": cluster_tag, 
                    "relevance_score": score,
                    "country": "India",
                    "source": "PubMed Central"
                }
                valid_docs.append(doc)
                print(f"Found: {doc['title'][:40]}... (Score: {score:.2f})")
            else:
                print(f"Dropped: {doc['title'][:40]}... (Score: {score:.2f})")
        
        return valid_docs

    def fetch_pubmed_raw(self, query, limit):
        """
        Connects to PubMed and parses XML into Text.
        """
        try:
            handle = Entrez.esearch(db="pmc", term=f"{query} AND open access[filter]", retmax=limit)
            record = Entrez.read(handle)
            handle.close()
            id_list = record['IdList']
            if not id_list: return []
            
            ids = ",".join(id_list)
            fetch_handle = Entrez.efetch(db="pmc", id=ids, rettype="xml", retmode="xml")
            xml_data = fetch_handle.read()
            fetch_handle.close()
            
            soup = BeautifulSoup(xml_data, "lxml-xml")
            parsed = []
            
            for article in soup.find_all("article"):
                # Title
                title = article.find("article-title").get_text(strip=True) if article.find("article-title") else "No Title"
                
                # Abstract
                abstract = article.find("abstract").get_text(strip=True) if article.find("abstract") else ""
                
                # Body Text Extraction
                body_text = ""
                body = article.find("body")
                if body:
                    for section in body.find_all("sec"):
                        sec_head = section.find("title").get_text(strip=True) if section.find("title") else ""
                        paras = [p.get_text(strip=True) for p in section.find_all("p")]
                        if paras:
                            body_text += f"### {sec_head}\n" + "\n".join(paras) + "\n\n"
                
                # Only add if we have some content
                if len(body_text) > 100 or len(abstract) > 50:
                    parsed.append({
                        "title": title, 
                        "text": body_text, 
                        "abstract": abstract
                    }) 
            
            return parsed
        except Exception as e:
            print(f"Error in raw fetch: {e}")
            return []

# --- EXECUTION & SAVING ---
if __name__ == "__main__":
    bot = RobustYouthFetcher()
    
    print("Starting Data Pipeline...")
    data = bot.get_youth_resources()
    
    print(f"\nPipeline Complete. Total Articles: {len(data)}")

    os.makedirs("../data/", exist_ok=True)
    
    # SAVE TO JSON
    filename = "../data/data_from_research.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
        
    print(f"Data successfully saved to '{filename}'")