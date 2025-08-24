# from connection import create_vector_index,add_face_to_index,identify_face_with_vector_search 
from fastapi import FastAPI
from routers import cache_routes

app = FastAPI(title="Redis REST API")

# daftar router
app.include_router(cache_routes.router)

@app.get("/")
def root():
    return {"message": "Redis REST API aktif"}
# ambil koneksi
# r = create_vector_index()

# download gambar
# d = download_image("https://api.spairum.my.id/api/cdn/image/1752731583918-image-1000158646.webp?w=500&h=500")
# print(d)

# add_face_to_index("fakhry", "https://api.spairum.my.id/api/cdn/image/1752731583918-image-1000158646.webp?w=500&h=500")
# add_face_to_index("fakhry2", "https://api.rsudaa.singkawangkota.go.id/api/cdn/image/1716348802360-image-fakhry1x1.webp?w=500&h=500")
# identify_face_with_vector_search("https://api.rsudaa.singkawangkota.go.id/api/cdn/image/1755881802754-514-1668593873958-fakhry.webp?w=500&h=500")


