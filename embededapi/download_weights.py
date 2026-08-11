import numpy as np
from deepface import DeepFace

# Trigger download untuk model recognition & detector backend
dummy_img = np.zeros((160, 160, 3), dtype=np.uint8)
DeepFace.represent(img_path=dummy_img, model_name="Facenet512", detector_backend="retinaface", enforce_detection=False)
print("Model Facenet512 & RetinaFace berhasil terunduh!")