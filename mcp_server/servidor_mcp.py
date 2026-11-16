# ============================================================
#  Servidor MCP de EcoSort
#  Expone el clasificador de residuos como herramientas que
#  cualquier asistente de IA compatible con MCP puede usar
#  (Ollama con chat_ollama.py, Claude Desktop, etc.).
#
#  Herramientas:
#   - clasificar_residuo(ruta_imagen): dice a qué caneca va un residuo
#   - guia_de_canecas(): explica el código de colores de Colombia
#   - informacion_modelo(): métricas y datos del modelo
#
#  Se comunica por stdio (entrada/salida estándar), por eso
#  NUNCA se debe imprimir nada con print() en este archivo.
# ============================================================
import os
import sys
from pathlib import Path

import httpx

# Agrega la raíz del proyecto al path para poder importar el paquete backend/
RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from mcp.server.mcpserver import MCPServer  # noqa: E402

# Crea el servidor MCP con un nombre y unas instrucciones para el asistente
servidor = MCPServer(
    name="EcoSort",
    instructions=(
        "EcoSort clasifica residuos según el código de colores de Colombia (Resolución 2184 de 2019). "
        "Cuando el usuario dé la ruta de una imagen de un residuo, usa la herramienta clasificar_residuo. "
        "Para preguntas generales sobre qué va en cada caneca, usa guia_de_canecas."
    ),
)

# Información en español de cada categoría que devuelve el modelo
CATEGORIAS = {
    "organic": {
        "etiqueta": "Orgánico",
        "caneca": "verde",
        "consejo": "Deposítalo en la caneca verde.",
    },
    "recyclable": {
        "etiqueta": "Reciclable",
        "caneca": "blanca",
        "consejo": "Deposítalo limpio y seco en la caneca blanca.",
    },
    "non_recyclable": {
        "etiqueta": "No reciclable",
        "caneca": "negra",
        "consejo": ("Deposítalo en la caneca negra. Si es una pila, un celular u otro aparato "
                    "electrónico, llévalo a un punto posconsumo."),
    },
}

# Carpeta donde el backend guarda las fotos enviadas desde el chat de la página
CARPETA_FOTOS_CHAT = RAIZ / "uploads" / "chat"

NOMBRES_ES = {"Organic": "Orgánico", "Recyclable": "Reciclable", "Non-recyclable": "No reciclable"}

# Si existe ECOSORT_API_URL (en Render), se usa el modelo del backend por HTTP
# en vez de cargar otra copia del modelo en memoria
API_URL = os.environ.get("ECOSORT_API_URL")
TIPOS = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}

# El modelo se carga la primera vez que se usa (así el servidor arranca rápido)
_clasificador = None

def obtener_clasificador():
    global _clasificador
    if _clasificador is None:
        from backend.clasificador import ClasificadorResiduos
        _clasificador = ClasificadorResiduos()
    return _clasificador


def predecir(ruta):
    """Clasifica la imagen con el modelo local o, en Render, con el endpoint /api/classify del backend."""
    if API_URL:
        tipo = TIPOS.get(ruta.suffix.lower(), "image/jpeg")
        r = httpx.post(f"{API_URL}/api/classify", files={"imagen": (ruta.name, ruta.read_bytes(), tipo)}, timeout=60)
        r.raise_for_status()
        return r.json()
    return obtener_clasificador().predecir(ruta.read_bytes())


def info_del_modelo():
    """Métricas del modelo, del clasificador local o del endpoint /api/info del backend."""
    if API_URL:
        r = httpx.get(f"{API_URL}/api/info", timeout=30)
        r.raise_for_status()
        return r.json()
    return obtener_clasificador().informacion()


@servidor.tool()
def clasificar_residuo(ruta_imagen: str) -> dict:
    """Clasifica la fotografía de un residuo y dice en qué caneca va (verde, blanca o negra).
    Úsala solo cuando el usuario dé la ruta exacta de un archivo de imagen. No inventes rutas.

    Args:
        ruta_imagen: ruta del archivo de imagen en el computador (JPG, PNG o WEBP), tal como la escribió el usuario.
    """
    # Limpia comillas o espacios que el asistente pueda agregar a la ruta
    ruta = Path(ruta_imagen.strip().strip('"').strip("'"))
    # Las fotos que se suben desde el chat de la página llegan solo con su nombre (foto_xxxx.jpg)
    if not ruta.is_file() and (CARPETA_FOTOS_CHAT / ruta.name).is_file():
        ruta = CARPETA_FOTOS_CHAT / ruta.name
    if not ruta.is_file():
        return {"error": f"No encontré la imagen en la ruta: {ruta}"}

    # Ejecuta el modelo (mismo clasificador que usa la página web)
    resultado = predecir(ruta)
    info = CATEGORIAS[resultado["categoria"]]

    # Respuesta en español, con la confianza en porcentaje
    return {
        "archivo": ruta.name,
        "categoria": info["etiqueta"],
        "caneca": info["caneca"],
        "consejo": info["consejo"],
        "confianza": f"{resultado['confianza'] * 100:.1f}%",
        "modelo_seguro": resultado["seguro"],
        # El clasificador devuelve los nombres en inglés (los de la página web); aquí se traducen
        "probabilidades": {
            NOMBRES_ES[nombre]: f"{p * 100:.1f}%" for nombre, p in resultado["probabilidades"].items()
        },
    }


@servidor.tool()
def guia_de_canecas() -> dict:
    """Explica el código de colores de Colombia y qué va en cada caneca.
    Úsala cuando el usuario pregunte dónde va un objeto y NO haya enviado una imagen."""
    return {
        "norma": "Resolución 2184 de 2019 (obligatoria desde enero de 2021)",
        "caneca_verde": "Orgánicos: restos de comida, cáscaras de frutas y verduras, residuos de jardín.",
        "caneca_blanca": "Reciclables: plástico, vidrio, metal, papel y cartón limpios y secos.",
        "caneca_negra": "No reciclables: papel higiénico, servilletas usadas, tapabocas, colillas, ropa desgastada.",
        "punto_posconsumo": "Pilas, celulares, aparatos electrónicos y medicamentos.",
    }


@servidor.tool()
def informacion_modelo() -> dict:
    """Devuelve las métricas y los datos del modelo de clasificación de EcoSort."""
    info = info_del_modelo()
    metricas = info["metricas"]
    return {
        "arquitectura": info["arquitectura"],
        "clases": ["Orgánico", "Reciclable", "No reciclable"],
        "exactitud": f"{metricas['accuracy'] * 100:.1f}%",
        "exactitud_balanceada": f"{metricas['balanced_accuracy'] * 100:.1f}%",
        "macro_f1": f"{metricas['macro_f1'] * 100:.1f}%",
        "imagenes_entrenamiento": info["dataset"]["train"],
        "imagenes_prueba": info["dataset"]["test"],
        "umbral_confianza": info["umbral"],
    }


if __name__ == "__main__":
    # Arranca el servidor usando stdio (lo lanza el cliente, por ejemplo chat_ollama.py)
    servidor.run(transport="stdio")
