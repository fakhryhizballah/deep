from fastapi import FastAPI, File, UploadFile, HTTPException
from deepface import DeepFace
import numpy as np
from PIL import Image
import io
import os
import base64
app = FastAPI(
    title="Face Embedding API",
    description="Local service for generating 512/128-dimensional face embeddings using local DeepFace models.",
    version="1.0"
)

# Pilih model lokal: 'Facenet', 'Facenet512', 'VGG-Face', 'ArcFace', 'Swin'
MODEL_NAME = "Facenet512"

@app.on_event("startup")
async def preload_model():
    """
    Memuat model ke dalam memori saat aplikasi pertama kali berjalan.
    """
    print(f"Preloading model {MODEL_NAME}...")
    try:
        # Inisialisasi awal agar bobot model terunduh & termuat
        dummy_img = np.zeros((160, 160, 3), dtype=np.uint8)
        DeepFace.represent(img_path=dummy_img, model_name=MODEL_NAME, enforce_detection=False)
        print("Model berhasil dimuat ke memori.")
    except Exception as e:
        print(f"Gagal memuat model: {e}")

@app.post("/embed", summary="Ekstraksi Face Embedding")
async def extract_embedding(file: UploadFile = File(...)):
    # Validasi tipe file
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File yang diunggah harus berupa gambar.")

    try:
        # Membaca file gambar ke format numpy array
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        img_np = np.array(image)

        # Generasi embedding menggunakan model lokal
        embeddings_data = DeepFace.represent(
            img_path=img_np,
            model_name=MODEL_NAME,
            enforce_detection=True,  # Lempar error jika tidak ada wajah yang terdeteksi
            detector_backend="retinaface" # Pilihan detector: 'opencv', 'retinaface', 'mtcnn', 'yolov8'
        )
        

        results = []
        for face in embeddings_data:
            margin_ratio = 0.5
            area = face["facial_area"]
            x, y, w, h = area["x"], area["y"], area["w"], area["h"]
            img_w, img_h = image.size

            # Hitung piksel margin
            margin_x = int(w * margin_ratio)
            margin_y = int(h * margin_ratio)

            # Koordinat baru dengan clamping (0 s/d ukuran maksimal gambar)
            x1 = max(0, x - margin_x)
            y1 = max(0, y - margin_y)
            x2 = min(img_w, x + w + margin_x)
            y2 = min(img_h, y + h + margin_y)

            cropped_face = image.crop((x1, y1, x2, y2))

            # Encode hasil crop ke format Base64 (JPEG)
            buffered = io.BytesIO()
            cropped_face.save(buffered, format="JPEG")
            cropped_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

            results.append({
                "embedding": face["embedding"],
                "facial_area": area,
                "confidence": face.get("face_confidence", 1.0),
                "cropped_image_base64": f"data:image/jpeg;base64,{cropped_b64}"
            })
            # results.append({
            #     "embedding": face["embedding"],
            #     "facial_area": face["facial_area"],
            #     "confidence": face.get("face_confidence", 1.0)
            # })

        return {
            "status": "success",
            "model_used": MODEL_NAME,
            "faces_detected": len(results),
            "data": results
        }

    except ValueError as ve:
        # Menangani kondisi ketika wajah tidak ditemukan oleh detector
        raise HTTPException(status_code=400, detail=f"Wajah tidak terdeteksi: {str(ve)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan pemrosesan internal: {str(e)}")

@app.post("/reembed", summary="Re-ekstraksi Face Embedding")
async def extract_reembedding(file: UploadFile = File(...)):
    # Validasi tipe file
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File yang diunggah harus berupa gambar.")

    try:
        # Membaca file gambar ke format numpy array
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        img_np = np.array(image)

        # Generasi embedding menggunakan model lokal
        embeddings_data = DeepFace.represent(
            img_path=img_np,
            model_name=MODEL_NAME,
            enforce_detection=True,  # Lempar error jika tidak ada wajah yang terdeteksi
            detector_backend="retinaface" # Pilihan detector: 'opencv', 'retinaface', 'mtcnn', 'yolov8'
        )
        

        results = []
        if len(embeddings_data) != 1:
            return {
                "status": "success",
                "model_used": MODEL_NAME,
                "faces_detected": len(results),
                "data": results
            }
        for face in embeddings_data:
            area = face["facial_area"]
            results.append({
                "embedding": face["embedding"],
                "facial_area": area,
                "confidence": face.get("face_confidence", 1.0),
            })

        return {
            "status": "success",
            "model_used": MODEL_NAME,
            "faces_detected": len(results),
            "data": results
        }

    except ValueError as ve:
        # Menangani kondisi ketika wajah tidak ditemukan oleh detector
        raise HTTPException(status_code=400, detail=f"Wajah tidak terdeteksi: {str(ve)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan pemrosesan internal: {str(e)}")
@app.get("/health", summary="Cek Status Service")
async def health_check():
    
    return {"status": "online", "model": MODEL_NAME}