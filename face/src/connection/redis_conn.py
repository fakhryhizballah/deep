# import face_recognition
import numpy as np
import redis
import os
import uuid
from dotenv import load_dotenv
from .download import download_image

import cv2
from insightface.app import FaceAnalysis
from sklearn.metrics.pairwise import cosine_similarity
load_dotenv()

VECTOR_DIM = 128
dim = 512
INDEX_NAME = "my_face_index"
# --- Load model SubCenter-ArcFace dari insightface ---
app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])  
# app = FaceAnalysis(name='buffalo_sc', providers=['CoreMLExecutionProvider', 'CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))

# --- 1. Hubungkan ke Redis Stack ---
# Pastikan Redis Stack Anda berjalan di port 6379
try:
    r = redis.Redis(host=os.environ.get('REDIS_HOST'), port=6379, db=0,username=os.environ.get('REDIS_USERNAME', 'default'), password=os.environ.get('REDIS_PASSWORD'))
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
        TextField("url"),
        TextField("imgID"),
        VectorField(
            "face_encoding",
            "FLAT",
            {
                "TYPE": "FLOAT32",
                "DIM": VECTOR_DIM,
                "DISTANCE_METRIC": "COSINE"
            }
        ),
        VectorField("face_imread", "HNSW", {"TYPE": "FLOAT32", "DIM": dim, "DISTANCE_METRIC": "COSINE"})
    )

    definition = IndexDefinition(
        prefix=["face:"],
        index_type=IndexType.HASH # <-- Perbaikan di sini! Gunakan Enum IndexType.HASH
    )

    r.ft(INDEX_NAME).create_index(fields=schema, definition=definition)
    print(f"Indeks '{INDEX_NAME}' berhasil dibuat.")
   

# --- 3. Fungsi untuk Menambahkan Wajah ke Indeks ---
def add_face_to_index(url,nameId):
    """
    Ekstrak embedding wajah dan simpan di indeks vektor Redis.
    """
    image_path = download_image(url)
    # image = face_recognition.load_image_file(image_path)
    embedding = extract_embedding(image_path)
    # face_encodings = face_recognition.face_encodings(image)
    # print(len(face_encodings))
    # if len(face_encodings) > 1:
    #     print("Terdeteksi lebih dari satu wajah pada gambar uji.")
    #     return False
    trace = identify_face_imread_with_vector_search(image_path)
    if trace != False :
        if trace.docs[0].vector_score == "0":
            return False
    # if face_encodings:
        # Simpan data sebagai hash di Redis
    face_encoding = np.array(face_encodings[0], dtype=np.float32)   
        # face_encoding diubah menjadi bytes
    r.hset(
            f"face:{nameId}",
            mapping={
                "url": url,
                "imgID": nameId,
                "face_encoding": face_encoding.tobytes(),
                "face_imread": embedding.astype(np.float32).tobytes()
            }
        )
    print(f"Wajah '{nameId}' berhasil disimpan di Redis.")
    if os.path.exists(image_path):
            os.remove(image_path)
    return True
    # else:
    #     print(f"Tidak ada wajah yang terdeteksi di {image_path}. Gagal menyimpan.")
    #     return False

# --- 4. Fungsi untuk Mengidentifikasi Wajah dengan Pencarian Vektor ---
# def identify_face_with_vector_search(url):
#     """
#     Muat wajah uji dan lakukan pencarian kesamaan vektor 1:N di Redis.
#     """
#     image_path = download_image(url)
#     probe_image = face_recognition.load_image_file(image_path)
#     probe_face_encodings = face_recognition.face_encodings(probe_image)
    
    
#     if not probe_face_encodings:
#         print("Tidak ada wajah yang terdeteksi pada gambar uji.")
#         return None
    
#     probe_face_encoding = np.array(probe_face_encodings[0], dtype=np.float32)
    
#     k = 2 # Jumlah tetangga terdekat (nearest neighbors) yang ingin diambil
#     query_vector = probe_face_encoding.tobytes()
    
    
#     # --- Perbaikan: Gunakan Query yang sudah diimpor secara langsung ---
#     query = (
#         Query(
#             f"*=>[KNN {k} @face_encoding $query_vector AS vector_score]"
#         )
#         .sort_by("vector_score")
#         .return_fields("name", "vector_score")
#         .dialect(2)
#     )

#     results = r.ft(INDEX_NAME).search(
#         query, 
#         query_params={
#             "query_vector": query_vector
#         }
#     )
#     print(results.total)
#     return results
#     if results.total == 0:
#         print("Tidak ada hasil yang ditemukan.")
#         return False
#     print(results)
#     first_result = results.docs[0]
#     name = first_result.name
#     data = r.hgetall(f"face:{name}")
#     print(data[b"name"].decode("utf-8"))
#     if os.path.exists(image_path):
#         os.remove(image_path)
    
#     similarity_score = 1 - float(first_result.vector_score)
    
#     if similarity_score > 0.8:
#         print(f"Wajah terdeteksi! Mungkin adalah: {name} (Skor Kesamaan: {similarity_score:.2f})")
#         results = {
#             "nameId": name,
#             "similarity_score": similarity_score,
#             "url": data[b"url"].decode("utf-8"),
#             "imgID": data[b"imgID"].decode("utf-8"),
#             "results": results
#         }
#         return results
#     else:
#         print(f"Wajah terdeteksi, tetapi tidak cocok dengan siapa pun di database. Skor terbaik: {similarity_score:.2f}")
#         return False

def identify_face_imread_with_vector_search(image_path):
    emb_query = extract_embedding(image_path)
    if emb_query is False:
        return False
    emb_query = emb_query.astype(np.float32).tobytes()
    q = Query(f"*=>[KNN {5} @face_imread $vec as vector_score]") \
        .sort_by("vector_score") \
        .return_fields("user_id", "vector_score") \
        .dialect(2)

    results = r.ft(INDEX_NAME).search(q, query_params={"vec": emb_query})
    # first_result = results.docs[0]
    # name = first_result.name
    if results.total == 0:
        print("Tidak ada hasil yang ditemukan.")
        return False
    return results

def extract_embedding(image_path):
    """Ekstrak embedding wajah dari gambar"""
    img = cv2.imread(image_path)
    faces = app.get(img)

    if len(faces) == 0:
        return False
    # Ambil wajah pertama
    # return None
    # Simpan wajah yang terdeteksi
        # h_img, w_img = img.shape[:2]
        # i = 0
    # for face in faces :
    #     x1, y1, x2, y2 = map(int, face.bbox)

    #     # Hitung margin (misalnya 10% dari ukuran wajah)
    #     w = x2 - x1
    #     h = y2 - y1
    #     margin_x = int(1 * w)
    #     margin_y = int(1 * h)
    #     # Tambahkan margin
    #     x1 = max(0, x1 - margin_x)
    #     y1 = max(0, y1 - margin_y)
    #     x2 = min(w_img, x2 + margin_x)
    #     y2 = min(h_img, y2 + margin_y)

    #     # Crop ulang dengan margin
    #     crop_face = img[y1:y2, x1:x2]
        
    #     cv2.imwrite(f"{image_path}.crop{i}.jpg", crop_face)
    #     i += 1

    return faces[0].normed_embedding


def dump_index_face(url):
    image_path = download_image(url)
    img = cv2.imread(image_path)
    faces = app.get(img)
    if len(faces) == 0:
        return False
    h_img, w_img = img.shape[:2]
    i = 0
    uuid4 = str(uuid.uuid4())
    data =[]
    for face in faces :
        x1, y1, x2, y2 = map(int, face.bbox)

        # Hitung margin (misalnya 10% dari ukuran wajah)
        w = x2 - x1
        h = y2 - y1
        margin_x = int(0.5 * w)
        margin_y = int(0.5 * h)
        # Tambahkan margin
        x1 = max(0, x1 - margin_x)
        y1 = max(0, y1 - margin_y)
        x2 = min(w_img, x2 + margin_x)
        y2 = min(h_img, y2 + margin_y)

        # Crop ulang dengan margin
        crop_face = img[y1:y2, x1:x2]
        
        cv2.imwrite(f"./connection/data/{uuid4}-crop{i}.jpg", crop_face)
        r.hset(
            f"face:{uuid4}-crop{i}",
            mapping={
                "url": url,
                "imgID": f"{uuid4}-crop{i}.jpg",
                "face_imread": face.normed_embedding.astype(np.float32).tobytes()
            }
        )
        data.append(
            {
                "id": f"face:{uuid4}-crop{i}",
                "url": url,
                "imgID": f"{uuid4}-crop{i}.jpg"
            }
        )
        i += 1
    print(data)
    if os.path.exists(image_path):
       os.remove(image_path)
    return data

def find_face_internal(path: str):
    img = cv2.imread(path)
    faces = app.get(img)
    if len(faces) == 0:
        return False
    
    dataFace = [];
    state = False
    uuid4 = str(uuid.uuid4())
    i = 0
    h_img, w_img = img.shape[:2]
    cv2.imwrite(f"./connection/data/{uuid4}.jpg", img)
    print(f"./connection/data/{uuid4}.jpg")
    for face in faces :
        emb_query = face.normed_embedding.astype(np.float32).tobytes()
        q = Query(f"*=>[KNN {5} @face_imread $vec as vector_score]") \
            .sort_by("vector_score") \
            .return_fields("user_id", "vector_score") \
            .dialect(2)

        results = r.ft(INDEX_NAME).search(q, query_params={"vec": emb_query})
        # first_result = results.docs[0]
        # name = first_result.name
        
        if results.total == 0:
            print("Tidak ada hasil yang ditemukan.")
            continue 
        similarity_score = 1 - float(results.docs[0].vector_score)
        if similarity_score < 0.5:
            x1, y1, x2, y2 = map(int, face.bbox)
            # Hitung margin (misalnya 10% dari ukuran wajah)
            w = x2 - x1
            h = y2 - y1
            margin_x = int(0.5 * w)
            margin_y = int(0.5 * h)
            # Tambahkan margin
            x1 = max(0, x1 - margin_x)
            y1 = max(0, y1 - margin_y)
            x2 = min(w_img, x2 + margin_x)
            y2 = min(h_img, y2 + margin_y)

            # Crop ulang dengan margin
            crop_face = img[y1:y2, x1:x2]
            
            cv2.imwrite(f"./connection/data/{uuid4}-crop{i}.jpg", crop_face)
            r.hset(
                f"face:{uuid4}-crop{i}",
                mapping={
                    "url": f"{uuid4}.jpg",
                    "imgID": f"{uuid4}-crop{i}.jpg",
                    "face_imread": face.normed_embedding.astype(np.float32).tobytes()
                }
            )
            dataFace.append(
                {
                    "id": f"face:{uuid4}-crop{i}",
                    "url": f"{uuid4}.jpg",
                    "imgID": f"{uuid4}-crop{i}.jpg",
                    "state": True
                }
            )
            i += 1
            state = True
            continue
        dataFace.append(
            {
                "id": results.docs[0].id,
                "vector_score": results.docs[0].vector_score,
                "state": False
            }
        )
    if (state == False):
        if os.path.exists("./connection/data/"+uuid4+".jpg"):
            os.remove("./connection/data/"+uuid4+".jpg")
    
    return {
        'total': len(faces),
        'state': state,
        'img' : uuid4+".jpg",
        'data' :dataFace

    }