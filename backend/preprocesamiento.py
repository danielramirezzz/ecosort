# ============================================================
#  Preprocesamiento de imágenes
#  Convierte la imagen que sube el usuario al mismo formato
#  que se usó durante el entrenamiento (notebooks/EcoSort_Training.ipynb).
# ============================================================
import io

import torch
from PIL import Image
from torchvision import transforms


def crear_transformacion(config: dict) -> transforms.Compose:
    """Arma la cadena de transformaciones con los valores guardados en el JSON del modelo."""
    return transforms.Compose([
        # Redimensiona la imagen a 224x224, el tamaño de entrada de EfficientNet-B0
        transforms.Resize(tuple(config["img_size"])),
        # Convierte la imagen a tensor con valores entre 0 y 1
        transforms.ToTensor(),
        # Normaliza con la media y desviación estándar de ImageNet
        transforms.Normalize(config["mean"], config["std"]),
    ])


def preparar_imagen(contenido: bytes, transformacion: transforms.Compose) -> torch.Tensor:
    """Recibe los bytes del archivo y devuelve un tensor de forma (1, 3, 224, 224)."""
    # Abre la imagen desde memoria y la fuerza a RGB (por si viene en PNG con transparencia o en escala de grises)
    imagen = Image.open(io.BytesIO(contenido)).convert("RGB")
    # Aplica las transformaciones y agrega la dimensión del lote (batch) con unsqueeze(0)
    return transformacion(imagen).unsqueeze(0)
