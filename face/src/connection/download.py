import requests
import os
import base64

def download_image(url: str, filename: str = None):
    """
    Download gambar dari URL dan simpan dengan nama file yang diberikan.
    """
    # print(url)
    filename = url.split("/")[-1]
    filename = filename.split("?")[0]
    # print(filename)
    os.makedirs("./connection/cache", exist_ok=True)
    
    filepath = os.path.join("./connection/cache", filename)
    response = requests.get(url, stream=True)
    print(response.status_code)
    if response.status_code == 200:
        with open(filepath, "wb") as f:
            for chunk in response.iter_content(1024):
                f.write(chunk)
        return filepath
    else:
        raise Exception(f"Gagal download gambar. Status code: {response.status_code}")
    

def DecodingImage(base64_string):
    # 1. Ubah kembali string base64 menjadi bytes
    img_binary = base64.b64decode(base64_string)
    os.makedirs("./connection/cache", exist_ok=True)
    
    # 2. Simpan gambar dalam format PNG
    img_path = os.path.join("./connection/cache", "image-base64.jpg")
    with open(img_path, "wb") as f:
        f.write(img_binary)
    return img_path