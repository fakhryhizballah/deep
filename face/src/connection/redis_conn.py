import face_recognition
import numpy as np
import redis
import os
import uuid
from dotenv import load_dotenv
from .download import download_image
load_dotenv()

VECTOR_DIM = 128
INDEX_NAME = "my_face_index"

# --- 1. Hubungkan ke Redis Stack ---
# Pastikan Redis Stack Anda berjalan di port 6379
try:
    r = redis.Redis(host=os.environ.get('REDIS_HOST'), port=6379, db=0, password=os.environ.get('REDIS_PASSWORD'))
    r.ping()
    print("Berhasil terhubung ke Redis Stack!")
except redis.exceptions.ConnectionError as e:
    print(f"Gagal terhubung ke Redis Stack: {e}")
    print("Pastikan Redis Stack Anda berjalan.")
    exit()

from redis.commands.search.field import TextField, VectorField
from redis.commands.search.query import Query # Pastikan ini juga diimpor untuk bagian query
from redis.commands.search.commands import IndexDefinition # <-- Tambahkan baris ini
from redis.commands.search.index_definition import IndexType

def get_redis_connection():
    return r
def create_vector_index():
    """
    Membuat indeks pencarian vektor di Redis jika belum ada.
    """
    try:
        r.ft(INDEX_NAME).info()
        print("Indeks sudah ada, menghapus...")
        r.ft(INDEX_NAME).dropindex()
    except redis.exceptions.ResponseError:
        pass  # Indeks tidak ada, tidak perlu dihapus

    print("Membuat indeks baru...")
    
    schema = (
        TextField("name"), 
        VectorField(
            "face_encoding",
            "FLAT",
            {
                "TYPE": "FLOAT32",
                "DIM": VECTOR_DIM,
                "DISTANCE_METRIC": "COSINE"
            }
        )
    )

    definition = IndexDefinition(
        prefix=["face:"],
        index_type=IndexType.HASH # <-- Perbaikan di sini! Gunakan Enum IndexType.HASH
    )

    r.ft(INDEX_NAME).create_index(fields=schema, definition=definition)
    print(f"Indeks '{INDEX_NAME}' berhasil dibuat.")
   

# --- 3. Fungsi untuk Menambahkan Wajah ke Indeks ---
def add_face_to_index(name, url):
    """
    Ekstrak embedding wajah dan simpan di indeks vektor Redis.
    """
    image_path = download_image(url)
    image = face_recognition.load_image_file(image_path)
    face_encodings = face_recognition.face_encodings(image)
    print(len(face_encodings))
    if len(face_encodings) > 1:
        print("Terdeteksi lebih dari satu wajah pada gambar uji.")
        return False
    
    if face_encodings:
        face_encoding = np.array(face_encodings[0], dtype=np.float32)
        
        # Simpan data sebagai hash di Redis
        # face_encoding diubah menjadi bytes
        imgID = uuid.uuid4().hex
        
        r.hset(
            f"face:{name}",
            mapping={
                "name": name,
                "url": url,
                "imgID": imgID,
                "face_encoding": face_encoding.tobytes()
            }
        )
        print(f"Wajah '{name}' berhasil disimpan di Redis.")
        if os.path.exists(image_path):
            os.remove(image_path)
            
        return True
    else:
        print(f"Tidak ada wajah yang terdeteksi di {image_path}. Gagal menyimpan.")
        return False

# --- 4. Fungsi untuk Mengidentifikasi Wajah dengan Pencarian Vektor ---
def identify_face_with_vector_search(url):
    """
    Muat wajah uji dan lakukan pencarian kesamaan vektor 1:N di Redis.
    """
    image_path = download_image(url)
    probe_image = face_recognition.load_image_file(image_path)
    probe_face_encodings = face_recognition.face_encodings(probe_image)
    
    
    if not probe_face_encodings:
        print("Tidak ada wajah yang terdeteksi pada gambar uji.")
        return None
    
    probe_face_encoding = np.array(probe_face_encodings[0], dtype=np.float32)
    
    k = 5 # Jumlah tetangga terdekat (nearest neighbors) yang ingin diambil
    query_vector = probe_face_encoding.tobytes()
    
    
    # --- Perbaikan: Gunakan Query yang sudah diimpor secara langsung ---
    query = (
        Query(
            f"*=>[KNN {k} @face_encoding $query_vector AS vector_score]"
        )
        .sort_by("vector_score")
        .return_fields("name", "vector_score")
        .dialect(2)
    )

    results = r.ft(INDEX_NAME).search(
        query, 
        query_params={
            "query_vector": query_vector
        }
    )
    print(results.total)

    if results.total == 0:
        print("Tidak ada hasil yang ditemukan.")
        return None
    # print(results)
    first_result = results.docs[0]
    name = first_result.name
    data = r.hgetall(f"face:{name}")
    print(data[b"name"].decode("utf-8"))
    if os.path.exists(image_path):
        os.remove(image_path)
    
    similarity_score = 1 - float(first_result.vector_score)
    
    if similarity_score > 0.8:
        print(f"Wajah terdeteksi! Mungkin adalah: {name} (Skor Kesamaan: {similarity_score:.2f})")
        results = {
            "nameId": name,
            "similarity_score": similarity_score,
            "url": data[b"url"].decode("utf-8"),
            "imgID": data[b"imgID"].decode("utf-8")
        }
        return results
    else:
        print(f"Wajah terdeteksi, tetapi tidak cocok dengan siapa pun di database. Skor terbaik: {similarity_score:.2f}")
        return None
