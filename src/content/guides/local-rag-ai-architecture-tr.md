---
title: "Rehber: Yerel RAG (Retrieval-Augmented Generation) ve Vektör Veritabanı Mimarisi"
description: "Hassas verileri üçüncü taraf API'lere göndermeden, yerel GPU donanımlarında yüksek başarımlı RAG boru hatları kurma rehberi."
category: "AI & ML"
date: 2026-08-05
readTime: "8 dk okuma"
featured: true
lang: "tr"
---

Büyük Dil Modellerinin (LLM) kurumsal veya kişisel sistemlere entegrasyonunda en kritik iki kısıt: **Veri Gizliliği** ve **Halüsinasyon (Hallucination)** problemleridir.

Hassas dokümanları OpenAI veya Anthropic gibi bulut API'lerine göndermek veri ihlallerine yol açabileceği gibi, LLM'lerin eğitildikleri tarih dışındaki güncel verilere doğrudan erişimi yoktur. 

Bu rehberde, tamamen yerel donanımlar üzerinde çalışan **RAG (Retrieval-Augmented Generation)** mimarisini ve vektör veritabanı entegrasyonunu inceliyoruz.

---

## RAG Mimarisi Nasıl Çalışır?

RAG, bir dil modelinin parametrik hafızasına (eğitildiği ağırlıklara) bağımlı kalmak yerine, sorulan soruyla ilgili doküman parçalarını harici bir veritabanından bulup **bağlam (context)** olarak modele sunma tekniğidir.

```text
[Dokümanlar (PDF/MD)] -> Chunking -> Vector Embedding (SentenceTransformers) -> [Vektör Veritabanı]
                                                                                     |
[Kullanıcı Sorgusu]   -> Embedding -> Vektör Arama (Cosine Similarity) ---------> Top-K Bağlam -> [Yerel LLM (Ollama/PyTorch)] -> Yanıt
```

### İş Akışı Adımları:

1. **Document Ingestion & Chunking:** Ham dokümanlar (PDF, Markdown, TXT) anlamsal bütünlüğü korunarak 500-1000 karakterlik parçalara (chunks) bölünür.
2. **Vector Embedding:** Her metin parçası, açık kaynaklı bir embedding modeli (ör. `all-MiniLM-L6-v2` veya `bge-small-en-v1.5`) aracılığıyla yüksek boyutlu sayısal vektörlere dönüştürülür.
3. **Indexing:** Vektörler ve ilişkili metin parçaları yerel bir Vektör Veritabanına (ChromaDB, FAISS veya Qdrant) kaydedilir.
4. **Retrieval (Getirme):** Kullanıcı bir soru sorduğunda, sorunun vektörü ile veritabanındaki vektörler arasındaki **Kosinüs Benzerliği (Cosine Similarity)** hesaplanarak en alakalı `K` adet parça getirilir.
5. **Generation (Üretim):** Getirilen parçalar ve kullanıcı sorusu birleştirilerek yerel LLM'e (`Llama 3`, `Mistral` veya `Qwen`) yönlendirilir.

---

## Python ve ChromaDB ile Yerel RAG Kurulumu

Aşağıdaki basit Python örneği, hiçbir bulut API'si kullanmadan tamamen yerel çalışan bir RAG hattını gösterir:

```python
import chromadb
from chromadb.utils import embedding_functions

# 1. Yerel Vektör Veritabanı İstemcisi
client = chromadb.PersistentClient(path="./local_vector_db")

# 2. Açık Kaynak Embedding Fonksiyonu
sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

# 3. Koleksiyon Oluşturma
collection = client.get_or_create_collection(
    name="tech_documentation",
    embedding_function=sentence_transformer_ef
)

# 4. Doküman Ekleme
documents = [
    "AWS Amplify, statik ve sunucusuz uygulamaları dağıtmak için kullanılan bir cloud servisidir.",
    "Astro v5, varsayılan olarak sıfır JavaScript gönderen adam mimarisi kullanır."
]

collection.add(
    documents=documents,
    ids=["doc1", "doc2"]
)

# 5. Anlamsal Arama (Query)
results = collection.query(
    query_texts=["Astro performans mimarisi nasıl çalışır?"],
    n_results=1
)

print("Getirilen Bağlam:", results["documents"][0])
```

---

## VRAM Optimizasyonu ve Yerel LLM Çalıştırma

Tüketici sınıfı GPU'larda (örneğin 6GB veya 8GB VRAM) RAG mimarisini akıcı şekilde çalıştırmak için:

* **GGML / GGUF Kuantizasyonu:** 16-bit hassasiyetteki modelleri 4-bit (`Q4_K_M`) seviyesine sıkıştırarak bellek kullanımını %70 azaltın.
* **Ollama veya vLLM Kullanımı:** Çıkarım motoru olarak C++ tabanlı `llama.cpp` altyapısını kullanan **Ollama** entegrasyonu sağlayın.

Bu mimari sayesinde şirket içi teknik dokümanlarınızı ve kişisel notlarınızı tamamen sıfır maliyet ve tam gizlilikle akıllı bir asistan haline getirebilirsiniz!
