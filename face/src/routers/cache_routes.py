from fastapi import APIRouter
from connection.redis_conn import get_redis_connection
from connection import create_vector_index,add_face_to_index,identify_face_with_vector_search 

router = APIRouter(prefix="/api", tags=["api"], responses={404: {"description": "Not found"}})
r = get_redis_connection()
create_vector_index()

@router.post("/face/index/url")
def index_face_by_url(nameId: str, url: str):
    # r.set(nameId, value, ex=expire)
    add = add_face_to_index(nameId, url)
    if add:
        return {"message": f"Wajah dengan ID '{nameId}' disimpan"}
    else:
        return {"message": f"Wajah dengan ID '{nameId}' gagal disimpan"}

@router.get("/face/findID/url")
def find_face_by_url(url: str):
  result = identify_face_with_vector_search(url)
  if result:
    return {"message": f"Wajah terdeteksi! Mungkin adalah: {result}",
            "data": result}