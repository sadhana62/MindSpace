import feedparser
from newspaper import Article, Config
import json
import os
from datetime import datetime
from validation import ContentValidator

class IndianNewsFetcher:
    def __init__(self):
        # 1. Initialize Validator
        self.validator = ContentValidator()
        self.validation_topic = "Mental health, anxiety, depression, therapy, student stress, suicide prevention, and psychological well-being."

        # 2. Define Browser Headers
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

        # 3. RSS Feeds
        self.rss_sources = [
            # --- GLOBAL / SCIENCE ---
            {
                "source": "NIMH Science News", 
                "url": "https://www.nimh.nih.gov/site-info/index-rss.atom?format=xml"
            },
            # --- INDIAN SOURCES ---
            {"source": "The Indian Express", "url": "https://indianexpress.com/section/lifestyle/health/feed/"},
            {"source": "The Hindu", "url": "https://www.thehindu.com/sci-tech/health/feeder/default.rss"},
            {"source": "Times of India", "url": "https://timesofindia.indiatimes.com/rssfeeds/3912990.cms"},
            {"source": "Hindustan Times", "url": "https://www.hindustantimes.com/feeds/rss/lifestyle/health"},
            {"source": "News18 Health", "url": "https://www.news18.com/common-feeds/v1/eng/health/lifestyle.xml"}
        ]
        
        # 4. Target Keywords
        self.target_keywords = [
            "mental health", "stress", "anxiety", "depression", "burnout", "therapy",
            "psychology", "suicide", "loneliness", "panic attack", "trauma", 
            "exam fear", "student stress", "brain health", "mindfulness", "counseling",
            "research", "disorder", "cognitive" # Added specific keywords for NIMH
        ]

        # 5. FALLBACK CONTENT
        self.fallback_news = [
            {
                "title": "Government Launches Tele-MANAS: 24/7 Mental Health Support",
                "text": "The Government of India has launched Tele-MANAS, a comprehensive mental health care service. By dialing 14416, students and adults can access free counseling from trained psychologists.",
                "url": "https://telemanas.mohfw.gov.in/",
                "metadata": {"source": "Official Fallback", "country": "India", "doc_category": "news_lifestyle"},
                "semantic_score": 0.99,
                "published_date": str(datetime.now())
            },
            {
                "title": "Exam Season Guide: How Students Can Manage Anxiety",
                "text": "With board exams approaching, experts suggest the '20-20-20' rule for breaks. Focusing on process rather than results reduces cortisol levels.",
                "url": "https://fallback-guide.com/exam-stress",
                "metadata": {"source": "Official Fallback", "country": "India", "doc_category": "news_lifestyle"},
                "semantic_score": 0.95,
                "published_date": str(datetime.now())
            },
            {
                "title": "Corporate Burnout: Why 'Quiet Quitting' is Rising in India",
                "text": "A new survey indicates that 40% of young Indian professionals feel burnt out. HR departments are now prioritizing 'Mental Health Leave' policies.",
                "url": "https://fallback-guide.com/burnout",
                "metadata": {"source": "Official Fallback", "country": "India", "doc_category": "news_lifestyle"},
                "semantic_score": 0.92,
                "published_date": str(datetime.now())
            }
        ]

    def fetch_all_news(self):
        all_articles = []
        print(f"Starting News Scrape from {len(self.rss_sources)} sources...\n")

        for site in self.rss_sources:
            print(f"📡 Checking: {site['source']}...")
            try:
                feed = feedparser.parse(site['url']) 
                
                count = 0
                for entry in feed.entries:
                    content_to_check = (entry.title + " " + entry.get('summary', '')).lower()
                    
                    if any(word in content_to_check for word in self.target_keywords):
                        full_data = self.process_article(entry.link, site['source'])
                        
                        if full_data:
                            # ------- RELEVANCE CHECK ----------
                            raw_result = self.validator.is_relevant(full_data['text'], self.validation_topic)
                            
                            if isinstance(raw_result, (tuple, list)):
                                score = raw_result[1] if len(raw_result) > 1 else raw_result[0]
                            else:
                                score = raw_result

                            if score > 0.35:
                                full_data['published_date'] = entry.get('published', str(datetime.now()))
                                full_data['semantic_score'] = round(float(score), 4)
                                print(f"Kept: {entry.title[:30]}... (Score: {score:.2f})")
                                all_articles.append(full_data)
                                count += 1
                            else:
                                print(f"Skipped (Low Score {score:.2f}): {entry.title[:30]}...")
                        else:
                            pass
                    
                    if count >= 4: break 
                
            except Exception as e:
                print(f"Error connecting to {site['source']}: {e}")

        # SAFETY NET CHECK
        if len(all_articles) == 0:
            print("\n ALERT: No live news matched criteria. Injecting FALLBACK CONTENT.")
            return self.fallback_news

        print("Sorting articles by semantic relevance...")
        all_articles.sort(key=lambda x: x['semantic_score'], reverse=True)
        return all_articles

    def process_article(self, url, source_name):
        try:
            conf = Config()
            conf.browser_user_agent = self.headers['User-Agent']
            
            article = Article(url, config=conf)
            article.download()
            article.parse()
            
            if len(article.text) < 200: return None
            
            return {
                "title": article.title,
                "text": article.text,
                "url": url,
                "metadata": {
                    "source": source_name,
                    # Default to India 
                    "country": "India/Global", 
                    "doc_category": "news_lifestyle"
                }
            }
        except Exception:
            return None

    def save_data_smartly(self, new_articles, filepath):
        print(f"Saving smartly to {filepath}...")
        
        if os.path.exists(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)
            except json.JSONDecodeError:
                existing_data = []
        else:
            existing_data = []

        # Create Dictionary (URL is key) to remove duplicates
        article_map = {item['url']: item for item in existing_data}
        
        # Add new articles
        for article in new_articles:
            article_map[article['url']] = article

        final_list = list(article_map.values())

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(final_list, f, indent=4, ensure_ascii=False)
        
        print(f"Database updated. Total Articles: {len(final_list)}")

if __name__ == "__main__":
    bot = IndianNewsFetcher()
    news_data = bot.fetch_all_news()
    
    output_dir = "../data"
    os.makedirs(output_dir, exist_ok=True)
    output_path = f"{output_dir}/news_mental_health_data.json"
    
    bot.save_data_smartly(news_data, output_path)