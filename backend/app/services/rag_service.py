from app.services.vector_store import query_medical_knowledge
from app.services.pinecone_service import pinecone_service
import asyncio
from functools import wraps
import signal


def timeout(seconds=30):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                # For synchronous functions, we can't easily add timeouts
                # but we can add timeout to specific external calls
                return func(*args, **kwargs)
            except Exception as e:
                print(f"Timeout error in {func.__name__}: {e}")
                return {"error": f"Service timeout: {str(e)}", "articles": []}

        return wrapper

    return decorator


@timeout(30)
def get_medical_context(symptoms: str, min_results: int = 2):
    print(f"🔧 Pinecone index available: {pinecone_service.index is not None}")

    # First try Pinecone
    results = query_medical_knowledge(symptoms, n_results=min_results + 1)
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    documents_found = len(documents)
    print(f"Found {documents_found} documents in Pinecone")

    if documents_found >= min_results:
        formatted_articles = []
        for i in range(min_results):
            formatted_articles.append(
                {
                    "title": metadatas[i].get("title", "No title"),
                    "content": documents[i],
                    "year": metadatas[i].get("year", "Unknown"),
                    "journal": metadatas[i].get("journal", "Unknown"),
                    "pubmed_id": metadatas[i].get("pubmed_id", "Unknown"),
                    # Convert distance to similarity
                    "relevance_score": 1 - distances[i],
                }
            )

        return {"source": "pinecone", "articles": formatted_articles}

    return {"error": "Insufficient medical context found", "articles": []}


if __name__ == "__main__":
    # When run directly for quick local testing, run this block.
    # Prefer running as a package to keep imports predictable:
    #   python -m backend.app.services.rag_service
    context = get_medical_context("I have insomnia")
    print(context)
