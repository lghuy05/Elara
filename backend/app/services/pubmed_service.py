# pubmed flow
import requests
import time
from starlette.requests import cookie_parser
from bs4 import BeautifulSoup

# try call api
PUBMED_BASE_URL_SEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
PUBMED_BASE_URL_FETCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"

# process it
common_symptoms = [
    "fever",
    "headache",
    "cough",
    "chest pain",
    "abdominal pain",
    "fatigue",
    "dizziness",
    "nausea",
    "shortness of breath",
    "back pain",
    "joint pain",
    "rash",
    "sore throat",
]


def get_article_from_pubmed(common_symptoms: list[str]):
    all_article_ids = []
    for i, symptom in enumerate(common_symptoms):
        param = {
            "db": "pubmed",
            "term": f"{symptom} treatment",
            "retmax": 50,
            "retmode": "json",
            "sort": "relevance",
            "mindate": "2022",
            "datetype": "pdat",
        }
        try:
            responses = requests.get(
                PUBMED_BASE_URL_SEARCH, params=param, timeout=10
            )

            print(f"StatusfCode: {responses.status_code}")
            print(f"URL: {responses.url}")

            data = responses.json()

            articles_id = data["esearchresult"]["idlist"]
            all_article_ids.extend(articles_id)

            if i < len(common_symptoms) - 1:
                print("Waiting for one second before next request .. ")
                time.sleep(1)

        except Exception as e:
            print(f"Error {e}")
            continue
    processed_article = fetch_article_from_ids(all_article_ids)
    return processed_article


def parse_articles(responses):
    soup = BeautifulSoup(responses, "xml")
    articles = []
    for article in soup.find_all("PubmedArticle"):
        try:
            article_id = article.find("PMID").text
            title = article.find("ArticleTitle").text

            abstract_parts = []
            for abstract_elem in article.find_all("AbstractText"):
                label = abstract_elem.get("Label", "")
                text = abstract_elem.text
                abstract_parts.append(f"{label}: {text}" if label else text)

            abstract = " ".join(abstract_parts) if abstract_parts else "No abstract"

            pub_date = article.find("PubDate")
            year = (
                pub_date.find("Year").text
                if pub_date and pub_date.find("Year")
                else "Unknown"
            )

            journal_elem = article.find("Journal")

            journal_title = (
                journal_elem.find("Title").text
                if journal_elem and journal_elem.find("Title")
                else "Unknown"
            )

            keywords = [kw.text for kw in article.find_all("Keyword")]
            articles.append(
                {
                    "pubmed_id": article_id,
                    "title": title,
                    "abstract": abstract,
                    "content": f"{title}. {abstract}",
                    "year": year,
                    "journal": journal_title,
                    "keywords": keywords,
                    "article_type": "research",
                }
            )
        except Exception as e:
            print(f"Error {e}")
            continue

    return articles


def fetch_article_from_ids(all_article_ids):
    batch_size = 200
    articles = []
    for i in range(0, len(all_article_ids), batch_size):
        batch_ids = all_article_ids[i : i + batch_size]
        params = {
            "db": "pubmed",
            "id": ",".join(batch_ids),
            "retmode": "xml",
            "rettype": "abstract",
        }
        try:
            responses = requests.get(
                PUBMED_BASE_URL_FETCH, params=params, timeout=10
            )

            if responses.status_code == 200:
                article = parse_articles(responses.text)
                articles.extend(article)

        except Exception as e:
            print(f"Error {e}")
            continue
    return articles
