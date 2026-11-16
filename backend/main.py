# ============================================================
#  API del clasificador de residuos (FastAPI)
#  - POST /api/classify    -> recibe una imagen y devuelve la categoría
#  - GET  /api/info        -> devuelve métricas y datos del modelo
#  - POST /api/chat        -> chat con el asistente (Ollama + servidor MCP)
#  - GET  /                -> sirve la página web (carpeta frontend/)
#
#  Ejecutar desde la raíz del proyecto:
#      uvicorn backend.main:app --reload --port 8000
# ============================================================
import json
import logging
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles
from PIL import UnidentifiedImageError

from backend.clasificador import ClasificadorResiduos
from mcp_server.agente import AgenteMCP, detectar_idioma

# Configura los mensajes de log en la consola
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ecosort")

# Crea la aplicación web
app = FastAPI(title="EcoSort API", description="Waste classification with a CNN")

# Carga el modelo una sola vez al iniciar el servidor (no en cada petición)
clasificador = ClasificadorResiduos()
logger.info("Modelo cargado en %s con umbral %.3f", clasificador.device, clasificador.umbral)

# Restricciones para los archivos que se suben
TIPOS_PERMITIDOS = {"image/jpeg", "image/png", "image/webp"}
TAMANO_MAXIMO = 10 * 1024 * 1024  # 10 MB


@app.get("/api/info")
def info():
    """Devuelve la información del modelo (la página la usa para mostrar métricas)."""
    return clasificador.informacion()


@app.post("/api/classify")
async def clasificar(imagen: UploadFile = File(...)):
    """Recibe una imagen, la valida y devuelve la predicción del modelo."""
    # Valida el tipo de archivo
    if imagen.content_type not in TIPOS_PERMITIDOS:
        raise HTTPException(status_code=415, detail="Unsupported format. Please use JPG, PNG or WEBP.")

    # Lee el contenido y valida el tamaño
    contenido = await imagen.read()
    if len(contenido) > TAMANO_MAXIMO:
        raise HTTPException(status_code=413, detail="The image exceeds the 10 MB limit.")

    # Ejecuta la predicción; si el archivo no es una imagen válida, responde con error 400
    try:
        resultado = clasificador.predecir(contenido)
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="The image could not be read.")

    logger.info("%s -> %s (%.2f)", imagen.filename, resultado["etiqueta"], resultado["confianza"])
    return resultado


# ---------- Chat con el asistente (Ollama + servidor MCP) ----------
# El agente se conecta al servidor MCP la primera vez que alguien usa el chat
agente = AgenteMCP()
CARPETA_CHAT = Path(__file__).resolve().parent.parent / "uploads" / "chat"
EXTENSIONES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


@app.post("/api/chat")
def chat(
    mensaje: str = Form(""),
    historial: str = Form("[]"),
    imagen: UploadFile | None = File(None),
):
    """Recibe un mensaje (y opcionalmente una foto) y devuelve la respuesta del asistente.

    Es una función normal (no async) porque espera la respuesta de Ollama: FastAPI la
    ejecuta en otro hilo para no bloquear el resto de la página."""
    try:
        mensajes = json.loads(historial)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid chat history.")

    texto = mensaje.strip()
    if imagen is not None and imagen.filename:
        # Guarda la foto en el disco y agrega su ruta al mensaje, para que el modelo
        # pueda pasársela a la herramienta clasificar_residuo del servidor MCP
        if imagen.content_type not in EXTENSIONES:
            raise HTTPException(status_code=415, detail="Unsupported format. Please use JPG, PNG or WEBP.")
        contenido = imagen.file.read()
        if len(contenido) > TAMANO_MAXIMO:
            raise HTTPException(status_code=413, detail="The image exceeds the 10 MB limit.")
        CARPETA_CHAT.mkdir(parents=True, exist_ok=True)
        # Nombre corto: al modelo le cuesta copiar rutas largas sin equivocarse.
        # El servidor MCP busca este nombre en la carpeta uploads/chat.
        nombre = f"foto_{uuid.uuid4().hex[:8]}{EXTENSIONES[imagen.content_type]}"
        (CARPETA_CHAT / nombre).write_bytes(contenido)
        texto = f"{texto or 'Where does this go?'}\n[Attached image: {nombre}]"

    if not texto:
        raise HTTPException(status_code=400, detail="Write a message or attach a photo.")

    # Historial que entiende el modelo: solo mensajes de usuario y del asistente
    mensajes = [m for m in mensajes if m.get("role") in ("user", "assistant")][-10:]
    mensajes.append({"role": "user", "content": texto})

    try:
        # Responde en el idioma en que escribió el usuario (si solo envió una foto, en inglés como la página)
        idioma = detectar_idioma(mensaje) if mensaje.strip() else "en"
        respuesta, herramientas = agente.conversar(mensajes, idioma=idioma)
    except Exception as e:  # noqa: BLE001
        logger.warning("Chat no disponible: %s", e)
        raise HTTPException(status_code=503, detail="The AI assistant is not available. Is Ollama running?")

    logger.info("chat -> %s", [h["herramienta"] for h in herramientas])
    # mensaje_usuario: lo que se guarda en el historial (incluye la ruta de la foto, si la hay)
    return {"respuesta": respuesta, "herramientas": herramientas, "mensaje_usuario": texto}


# Sirve los archivos del frontend (HTML, CSS, JS) en la raíz del sitio.
# Se monta al final para que las rutas /api/... tengan prioridad.
CARPETA_FRONTEND = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/", StaticFiles(directory=CARPETA_FRONTEND, html=True), name="frontend")
