import os
from fastapi import APIRouter
from connection.redis_conn import get_redis_connection,download_image
from connection import create_vector_index,add_face_to_index,identify_face_imread_with_vector_search,dump_index_face

router = APIRouter(prefix="/api", tags=["api"], responses={404: {"description": "Not found"}})
r = get_redis_connection()
create_vector_index()

@router.post("/face/index/url")
def index_face_by_url(url: str,nameId: str):
    # r.set(nameId, value, ex=expire)
    add = add_face_to_index(url, nameId)
    return add  
    
@router.post("/face/index/dump")
def index_face_by_url_imread( url: str):
    add = dump_index_face(url)
    return add

@router.get("/face/findID/url")
def find_face_by_url(url: str):
  image_path = download_image(url)
  result = identify_face_imread_with_vector_search(image_path)
  if os.path.exists(image_path):
       os.remove(image_path)

  return {
       "status": True,
       "message": "Wajah ditemukan",
       "data": result
       }