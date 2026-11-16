# ============================================================
#  Clasificador de residuos
#  Carga el modelo entrenado (EfficientNet-B0, 3 clases) y decide:
#  Orgánico / Reciclable / No reciclable. Si el modelo no está
#  seguro (confianza bajo el umbral) se responde No reciclable.
# ============================================================
import json
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models

from backend.preprocesamiento import crear_transformacion, preparar_imagen

# Rutas de los archivos generados por el notebook de entrenamiento
CARPETA_MODELO = Path(__file__).parent / "modelo"
RUTA_PESOS = CARPETA_MODELO / "modelo_residuos_final.pth"
RUTA_CONFIG = CARPETA_MODELO / "modelo_residuos_config.json"

# Nombre que ve el usuario para cada categoría (la página está en inglés)
ETIQUETAS = {"organic": "Organic", "recyclable": "Recyclable", "non_recyclable": "Non-recyclable"}


class EfficientNetModel(nn.Module):
    """Misma arquitectura del notebook: EfficientNet-B0 con una cabeza de N clases."""

    def __init__(self, num_classes: int):
        super().__init__()
        # Se crea la red sin pesos de ImageNet porque luego se cargan los pesos entrenados
        self.base = models.efficientnet_b0(weights=None)
        # Se reemplaza el clasificador original (1000 clases) por uno con nuestras clases
        in_features = self.base.classifier[1].in_features
        self.base.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(in_features, num_classes),
        )

    def forward(self, x):
        return self.base(x)


class ClasificadorResiduos:
    """Envuelve el modelo: lo carga una sola vez y expone el método predecir()."""

    def __init__(self):
        # Lee la configuración guardada al entrenar (clases, umbral, tamaño, normalización, métricas)
        self.config = json.loads(RUTA_CONFIG.read_text(encoding="utf-8"))
        self.clases = self.config["classes"]                    # ['Norecyclable', 'organic', 'recyclable']
        self.categorias = self.config["categories"]             # identificador que usa el frontend
        # Nombres en inglés que se muestran en la página, según la categoría
        self.etiquetas = {c: ETIQUETAS[self.categorias[c]] for c in self.clases}
        self.clase_respaldo = self.config["fallback_class"]     # clase cuando el modelo duda
        self.umbral = self.config["threshold"]                  # confianza mínima

        # Usa la GPU si está disponible; si no, la CPU
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # Construye la red, carga los pesos entrenados y la pone en modo evaluación
        self.modelo = EfficientNetModel(num_classes=len(self.clases))
        self.modelo.load_state_dict(torch.load(RUTA_PESOS, map_location=self.device))
        self.modelo.to(self.device).eval()

        # Prepara las transformaciones de imagen con los mismos valores del entrenamiento
        self.transformacion = crear_transformacion(self.config)

    @torch.no_grad()  # desactiva el cálculo de gradientes: solo se predice, no se entrena
    def predecir(self, contenido: bytes) -> dict:
        # 1. Convierte la imagen al tensor que espera la red
        x = preparar_imagen(contenido, self.transformacion).to(self.device)

        # 2. Pasa la imagen por la red y convierte las salidas en probabilidades con softmax
        probabilidades = F.softmax(self.modelo(x), dim=1)[0].cpu()

        # 3. Toma la clase con mayor probabilidad y su confianza
        confianza, indice = probabilidades.max(dim=0)
        confianza = float(confianza)

        # 4. Regla del umbral: si el modelo duda, el residuo se trata como No reciclable
        seguro = confianza >= self.umbral
        clase = self.clases[int(indice)] if seguro else self.clase_respaldo

        # 5. Devuelve la respuesta que consume el frontend
        return {
            "categoria": self.categorias[clase],
            "etiqueta": self.etiquetas[clase],
            "confianza": round(confianza, 4),
            "umbral": round(self.umbral, 4),
            "seguro": seguro,
            "probabilidades": {
                self.etiquetas[c]: round(float(p), 4) for c, p in zip(self.clases, probabilidades)
            },
        }

    def informacion(self) -> dict:
        """Datos del modelo para mostrar en la página (métricas, umbral y dispositivo)."""
        return {
            "arquitectura": self.config["architecture"],
            "clases": [self.etiquetas[c] for c in self.clases],
            "umbral": round(self.umbral, 4),
            "metricas": self.config["test_metrics"],
            "dataset": self.config["dataset"],
            "dispositivo": self.device.type,
        }
