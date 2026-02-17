import os
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from connection.redis_conn import get_redis_connection, download_image
from connection.download import DecodingImage
from connection import create_vector_index, add_face_to_index, identify_face_imread_with_vector_search, dump_index_face, find_face_internal, add_face_to_index_base64
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api", tags=["api"], responses={404: {"description": "Not found"}})
r = get_redis_connection()
create_vector_index()

class FaceRequest(BaseModel):
    base64: str = Field(None, description="String base64 dari gambar wajah", json_schema_extra={"example": "data:image/jpeg;base64,..."})

class FaceIndex(BaseModel):
    base64: str = Field(None, description="String base64 dari gambar wajah", json_schema_extra={"example": "data:image/jpeg;base64,..."})
    filename: str = Field(None, description="filename dari gambar wajah", json_schema_extra={"example": "filename.jpg"})

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
@router.post("/face/index/base64")
async def index_face_by_base64_single(item: FaceIndex):
  base64_str = item.base64
  imgID = item.filename
  if not base64_str:
      return {
          "status": False,
          "message": "Data base64 tidak ditemukan",
          "data": None
      }
  image_path = DecodingImage(base64_str)
  result = add_face_to_index_base64(image_path,imgID)
  if os.path.exists(image_path):
     os.remove(image_path)
  return {
          "status": True,
          "message": "success",
          "data": result
          }


@router.post("/face/findID/base64")
async def find_face_by_base64_single(item: FaceRequest):
  base64_str = item.base64 or item.base46
  if not base64_str:
      return {
          "status": False,
          "message": "Data base64 tidak ditemukan",
          "data": None
      }
  image_path = DecodingImage(base64_str)
  result = identify_face_imread_with_vector_search(image_path)
  if os.path.exists(image_path):
     os.remove(image_path)
  return {
          "status": True,
          "message": "Wajah ditemukan",
          "data": result
          }


@router.get("/face/findID/internal")
def find_face_by_internal(path: str):
  image_path = os.environ.get('PATH_FILE')+"/"+path
  if not os.path.exists(image_path):
       return {
       "status": False,
       "message": "Wajah tidak ditemukan",
       "data": "Wajah tidak ditemukan"
       }
  result = find_face_internal(image_path)
  if os.path.exists(image_path):
       os.remove(image_path)
  if result == False:
       return {
          "status": False,
          "message": "Wajah tidak ditemukan",
          "data": "Wajah tidak ditemukan"
       }
  return {
       "status": True,
       "message": "Success",
       "data": image_path,
       "result": result
       }