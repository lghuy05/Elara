import pinecone
import os
from concurrent.futures import ThreadPoolExecutor, TimeoutError


class PineconeService:
    def __init__(self):
        self.api_key = os.getenv("PINECONE_API_KEY")
        self.index_name = "medical-knowledge"
        self.query_timeout_seconds = int(os.getenv("PINECONE_QUERY_TIMEOUT", "8"))

        try:
            # Initialize Pinecone with the new SDK
            self.pc = pinecone.Pinecone(api_key=self.api_key)

            # Connect to your existing index
            self.index = self.pc.Index(self.index_name)
            print("✅ Pinecone initialized successfully")

        except Exception as e:
            print(f"❌ Pinecone initialization error: {e}")
            self.index = None

    def query_medical_knowledge(self, query: str, n_results: int = 5):
        """Query medical knowledge using Pinecone's integrated embeddings"""
        try:
            if not self.index:
                print("❌ Pinecone index not available")
                return {"documents": [[]], "metadatas": [[]], "distances": [[]]}

            print(f"🔍 Querying Pinecone for: {query}")

            def run_search():
                return self.index.search(
                    namespace="medical-namespace",
                    query={"inputs": {"text": query}, "top_k": n_results},
                    fields=["text"],  # Specify which metadata fields to return
                )

            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(run_search)
                try:
                    results = future.result(timeout=self.query_timeout_seconds)
                except TimeoutError:
                    print(
                        f"⚠️ Pinecone query timed out after {self.query_timeout_seconds}s"
                    )
                    return {"documents": [[]], "metadatas": [[]], "distances": [[]]}

            # Format results to match your existing structure
            documents = []
            metadatas = []
            distances = []

            for hit in results["result"]["hits"]:
                documents.append(hit["fields"].get("text", ""))
                metadatas.append(hit["fields"])
                distances.append(1 - hit["_score"])  # Convert similarity to distance

            print(f"✅ Found {len(documents)} results in Pinecone")
            return {
                "documents": [documents],
                "metadatas": [metadatas],
                "distances": [distances],
            }

        except Exception as e:
            print(f"❌ Pinecone query error: {e}")
            return {"documents": [[]], "metadatas": [[]], "distances": [[]]}

    def store_articles(self, articles):
        """Store PubMed articles in Pinecone using integrated embeddings"""
        try:
            if not self.index:
                print("❌ Pinecone index not available for storage")
                return False

            print(f"📝 Storing {len(articles)} PubMed articles in Pinecone")

            records = []
            for i, article in enumerate(articles):
                content = article.get("content", "")
                if not content or len(content.strip()) < 10:
                    continue

                # Format for upsert_records with integrated embedding
                record = {
                    "_id": f"pubmed_{article.get('pubmed_id', i)}",
                    "text": content,  # This field gets auto-embedded
                    "title": article.get("title", "No title"),
                    "year": article.get("year", "Unknown"),
                    "journal": article.get("journal", "Unknown"),
                    "pubmed_id": article.get("pubmed_id", "Unknown"),
                    "abstract": article.get("abstract", ""),
                    "keywords": ", ".join(article.get("keywords", [])),
                    "article_type": article.get("article_type", "research"),
                }
                records.append(record)

            if not records:
                print("❌ No valid articles to store")
                return False

            print(f"🚀 Upserting {len(records)} records to Pinecone...")

            # Use upsert_records for integrated embeddings
            self.index.upsert_records("medical-namespace", records)

            print(f"✅ Successfully stored {len(records)} articles in Pinecone")
            return True

        except Exception as e:
            print(f"❌ Pinecone storage error: {e}")
            return False


# Global instance
pinecone_service = PineconeService()
