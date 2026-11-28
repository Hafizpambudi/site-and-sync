---
title: "Realtime RAG feeder pipeline - ETL with Tmux,EC2, S3 and Qdrant"
slug: "realtime-rag-feeder-pipeline"
summary: "a guide to implement etl on aws"
date: "2025-05-02"
role: ""
tags:
featured: false
notionId: "1e7f2a12-adfd-8072-bb4d-c013a0df5d2c"
notionLastEdited: "2026-11-28T10:40:00.000Z"
---

# PROJECT OVERVIEW

We are developing an automated feeder system for a Retrieval-Augmented Generation (RAG) pipeline. The goal is to keep the RAG system continuously updated with the latest data. Our infrastructure leverages Amazon AWS, utilizing EC2 as the virtual machine environment and S3 as the data lake. We employ `tmux` to schedule and manage automated web crawlers efficiently.

The data pipeline follows an ETL (Extract, Transform, Load) approach: we extract data, identify and isolate only the newly updated content, transform it into a format optimized for the RAG system, and finally load it into the Qdrant vector store along with its associated metadata.

# Requirements to do this project

1. Aws EC2 and S3 that already have been setup before

[Setup AWS EC2 and Connect it to Vscode](https://app.notion.com/p/1e4f2a12adfd804a8289ea736c226954)

1. Vscode
2. Curiosity
3. Qdrant cloud

# Project Flow

![](/content/case-studies/realtime-rag-feeder-pipeline/c64c6b70f1af.jpg)

# **The Approach and Process**

## Install Dependencies

```
sudo apt update
sudo apt install python3 python3-pip -y
python3 -m venv venv
source venv/bin/activate

pip install tmuxp
pip install requests
pip install schedule
pip install awscli
pip install boto3
pip install qdrant-client
```

## Setup Tmux

```
1. tmux new -s <your_session_name> - you can run your automate script here
using bash command "source <your .py script command>
2. ctrl + b + d - command to detach from a session
3. tmux attach -t <your_session_name> - command for attach to a session
```

## The automation Script and data pipeline

the RAG system is about skincare products. so the fetched data will be about skincare product. **DISCLAIMER, I ALREADY SETUP S3 AS DATA LAKE FOR THE RAW DATA**. its filled with raw data of skincare products. we need  this raw data  loaded in the script to comparing with new fetched data that considered “new\_data”. that new data will be move to embedding process and also stored in s3.

### here’s example structure of my json data

```json
{'external_id': 'ebf26924-a237-464a-953a-8e75e28a38cd',
 'canon_slug': 'cetaphil-gentle-skin-cleanser-59-ml',
 'general_indication': 'Membantu melembapkan dan membersihkan kulit wajah.',
 'description': 'Cetaphil Gentle Skin Cleanser adalah sabun pembersih wajah yang diformulasikan sebagai pengganti sabun untuk kulit kering, normal, kombinasi dan berjerawat. Formula hypoallergenic yang lembut dan efektif mampu membersihkan sekaligus melembapkan kulit. Cetaphil Gentle Skin Cleanser teruji secara klinis efektif membantu melembapkan dan membersihkan kulit wajah. Cetaphil Gentle Skin Cleanser mengandung: propylene glycol yang bertujuan untuk membantu menjaga kelembapan kulit.',
 'composition': 'Aqua, Glycerin, Cetearyl Alcohol, Panthenol, Niacinamide, Pantolactone, Xanthan Gum, Sodium Cocoyl Isethionate, Sodium Benzoate,  Citric Acid.',
 'how_to_use': 'Penggunaan tanpa air: Usapkan secukupnya dan usapkan ke kulit. Bersihkan dengan kain lembut dan kulit akan terasa halus. \nPenggunaan dengan air: Tuangkan secukupnya dan usapkan ke kulit. Bilas dengan air bersih, usap dengan kain lembut dan kulit akan terasa halus.',
 'packaging': 'Botol @ 59 ml',
 'side_effects': '',
 'contraindication': '',
 'warning': '',
 /and many more
 }
```

here’s the flow of this script :

1. Crawling new product data.
2. Loading existing data from S3.
3. Filtering new entries.
4. Uploading new entries to S3.
5. Creating semantic chunks for new entries
6. Embedding with a model.
7. Pushing to **Qdrant**.

```python
import requests
import boto3
import json
from typing import List, Dict
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.http.models import PointStruct, VectorParams, Distance

class ProductCrawler:
    def __init__(self, headers, cookies, category_slug):
        self.headers = headers
        self.cookies = cookies
        self.category = category_slug

    def crawl(self) -> List[Dict]:
        index = 1
        all_products = []

        while True:
            url = f"https://magneto.xxxx.com/api/v1/buy-medicine/categories/{self.category}/products?page={index}&size=20"
            response = requests.get(url, headers=self.headers, cookies=self.cookies)
            if response.status_code != 200:
                break

            result = response.json().get('result', [])
            if not result:
                break

            for item in result:
                slug = item['slug']
                detail_url = f"https://magneto.api.xxxx.com/api/v1/buy-medicine/products/detail/{slug}"
                detail = requests.get(detail_url, headers=self.headers).json()
                all_products.append(detail)

            index += 1

        return [
            p for p in all_products
            if 'paket' not in p.get('description', '').lower() and p.get('base_price', 0) >= 1000
        ]

class S3Loader:
    def __init__(self, bucket, prefix):
        self.s3 = boto3.client('s3')
        self.bucket = bucket
        self.prefix = prefix

    def load_existing_data(self) -> List[Dict]:
        paginator = self.s3.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=self.bucket, Prefix=self.prefix)
        all_data = []

        for page in pages:
            for obj in page.get('Contents', []):
                if obj['Key'].endswith('.json'):
                    content = self.s3.get_object(Bucket=self.bucket, Key=obj['Key'])['Body'].read()
                    all_data.append(json.loads(content))

        return all_data

    def upload_json_objects(self, entries: List[Dict]):
        for item in entries:
            key = f"{self.prefix}{item['canon_slug']}.json"
            self.s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=json.dumps(item, ensure_ascii=False),
                ContentType='application/json'
            )
        print(f"✅ Uploaded {len(entries)} new files to s3://{self.bucket}/{self.prefix}")

class DataProcessor:
    @staticmethod
    def get_core_metadata(data: Dict) -> Dict:
        return {
            "nama_produk": data['name'],
            "harga": data['base_price'],
            "deskripsi": data.get('description', '')
        }

    @staticmethod
    def create_semantic_chunks(data: Dict) -> List[Dict]:
        sections = {
            "deskripsi": data.get('description', ''),
            "indikasi": data.get('general_indication', ''),
            "komposisi": data.get('composition', ''),
            "dosis": data.get('dosage', ''),
            "kontradiksi": data.get('contraindication', ''),
            "efek_samping": data.get('side_effects', ''),
            "warning": data.get('warning', '')
        }

        chunks = []
        for section, text in sections.items():
            if text.strip():
                chunks.append({
                    "text": f"{data['name']} - {section}: {text}",
                    "metadata": {
                        "section": section,
                        **DataProcessor.get_core_metadata(data)
                    }
                })
        return chunks

class EmbeddingService:
    def __init__(self, model_name='sentence-transformers/all-MiniLM-L6-v2'):
        self.model = SentenceTransformer(model_name)

    def embed_chunks(self, chunks: List[Dict]) -> List[Dict]:
        texts = [chunk['text'] for chunk in chunks]
        embeddings = self.model.encode(texts)
        return [
            {"id": f"{chunk['metadata']['nama_produk']}_{chunk['metadata']['section']}",
             "vector": vec,
             "payload": chunk['metadata']}
            for chunk, vec in zip(chunks, embeddings)
        ]

class QdrantUploader:
    def __init__(self, host="localhost", port=6333, collection="skincare-products"):
        self.client = QdrantClient(host=host, port=port)
        self.collection = collection
        self.ensure_collection_exists()

    def ensure_collection_exists(self):
        try:
            self.client.get_collection(self.collection)
        except:
            self.client.recreate_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE)
            )

    def upload_vectors(self, vector_data: List[Dict]):
        points = [
            PointStruct(id=entry["id"], vector=entry["vector"], payload=entry["payload"])
            for entry in vector_data
        ]
        self.client.upsert(collection_name=self.collection, points=points)
        print(f"✅ Pushed {len(points)} embedded chunks to Qdrant.")

class DataPipeline:
    def __init__(self, config):
        self.config = config
        self.crawler = ProductCrawler(config["headers"], config["cookies"], config["category"])
        self.s3_loader = S3Loader(config["s3_bucket"], config["s3_prefix"])
        self.processor = DataProcessor()
        self.embedder = EmbeddingService()
        self.qdrant = QdrantUploader(
            host=config["qdrant_host"],
            port=config["qdrant_port"],
            collection=config["qdrant_collection"]
        )

    def run(self):
        crawled_data = self.crawler.crawl()
        existing_data = self.s3_loader.load_existing_data()

        existing_ids = {item["external_id"] for item in existing_data}
        new_entries = [item for item in crawled_data if item["external_id"] not in existing_ids]
        print(f"✅ Found {len(new_entries)} new entries.")

        self.s3_loader.upload_json_objects(new_entries)

        all_chunks = []
        for item in new_entries:
            chunks = self.processor.create_semantic_chunks(item)
            all_chunks.extend(chunks)

        embedded_chunks = self.embedder.embed_chunks(all_chunks)
        self.qdrant.upload_vectors(embedded_chunks)

# --------------------------
# ✅ Usage Example
# --------------------------
if __name__ == "__main__":
    config = {
        "headers": {
            "accept": "application/json",
            "content-type": "application/json",
            "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "cache-control": "no-cache",
        },
        "cookies": {
            # your cookies here
        },
        "category": "kecantikan-dan-perawatan-diri",
        "s3_bucket": "skincare-data-lake",
        "s3_prefix": "raw-json/",
        "qdrant_host": "localhost",
        "qdrant_port": 6333,
        "qdrant_collection": "skincare-products"
    }

    pipeline = DataPipeline(config)
    pipeline.run()

```

that script will be schedulled with this code

```python
import schedule
schedule.every(4).days.at("00:40").do(pipeline.run())
try:
        print('============Program is waiting for the scheduled time============')
        while True:
            schedule.run_pending()
            time.sleep(1)  # Wait 1 second between schedule checks
    except KeyboardInterrupt:
        print("Program terminated by user.")
```

## How to setup the the scheduller

you have to attach to your tmux session using command $tmux attacht -t <your session name> amd run your .py automation. here’s mine

![](/content/case-studies/realtime-rag-feeder-pipeline/6a8b75b54eac.png)

## **when the pipeline got a new product : **

![](/content/case-studies/realtime-rag-feeder-pipeline/d292842cd21f.png)
