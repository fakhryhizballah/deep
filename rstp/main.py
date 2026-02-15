import cv2
import os
import time

from insightface.app import FaceAnalysis
from sklearn.metrics.pairwise import cosine_similarity

# --- Load model SubCenter-ArcFace dari insightface ---
app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])  
# app = FaceAnalysis(name='buffalo_sc', providers=['CoreMLExecutionProvider', 'CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))
# Folder tempat menyimpan potongan wajah
face_dir = "faces"
os.makedirs(face_dir, exist_ok=True)
# Konfigurasi RTSP
rtsp_url = 'rtsp://admin:RSUD1987@10.11.0.24:554/Streaming/channels/101'

# Buat objek VideoCapture
cap = cv2.VideoCapture(rtsp_url)

# Periksa apakah objek VideoCapture berhasil dibuat
if not cap.isOpened():
    print("Gagal membuka stream RTSP")
    exit()

# Ambil frame
print("RSTP terhubung")
while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Simpan frame sebagai gambar
    # cv2.imwrite('frame.jpg', frame)
    print(int(time.time()*1000))
    img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    faces = app.get(img)
    for idx, face in enumerate(faces):
        # InsightFace: bbox = [x1, y1, x2, y2]
        x1, y1, x2, y2 = face.bbox.astype(int)

        # Gambar kotak di sekitar wajah (opsional)
        # cv2.rectangle(frame, (x1-10, y1-10), (x2+10, y2+10), (0, 255, 0), 3)

        # -------------------------- 3. Simpan potongan wajah --------------------------
        # Crop wajah dengan sedikit padding (opsional)
        # pad = 10
        # h, w, _ = frame.shape
        # x1p = max(x1 - pad, 0)
        # y1p = max(y1 - pad, 0)
        # x2p = min(x2 + pad, w)
        # y2p = min(y2 + pad, h)

        # face_img = frame[y1p:y2p, x1p:x2p]
        face_img = frame

        # Nama file unik: timestamp + indeks dalam frame + counter frame
        epoch_seconds = int(time.time())
        ts = int(epoch_seconds / 1000 * 1000)               # milidetik
        filename = f"face_{ts}_{idx}.jpg"
        cv2.imwrite(os.path.join(face_dir, filename), face_img)
    # Lakukan sesuatu dengan frame
    # ...

# Lepaskan objek VideoCapture
cap.release()