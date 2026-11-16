# ============================================================
#  Agente de EcoSort: conecta un modelo de Ollama con el
#  servidor MCP. Lo usan el chat de la terminal (chat_ollama.py)
#  y el chat de la página web (endpoint /api/chat del backend).
#
#  Funcionamiento:
#   1. Arranca el servidor MCP (servidor_mcp.py) como proceso hijo.
#   2. Le entrega sus herramientas al modelo de Ollama.
#   3. Cuando el modelo pide una herramienta, la ejecuta en el
#      servidor MCP y le devuelve el resultado.
# ============================================================
import asyncio
import json
import os
import sys
import threading
from pathlib import Path

import ollama
from mcp import ClientSession, StdioServerParameters, types
from mcp.client.stdio import stdio_client

RAIZ = Path(__file__).resolve().parent.parent

# Configuración de Ollama con variables de entorno (sirve igual en el PC y en Render):
#  - OLLAMA_MODEL: modelo que soporta herramientas (en el PC: qwen2.5:7b)
#  - OLLAMA_HOST: dirección de Ollama (en el PC no hace falta; en Render: https://ollama.com)
#  - OLLAMA_API_KEY: llave de Ollama Cloud (solo en Render)
MODELO_OLLAMA = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")


def crear_cliente_ollama():
    """Cliente de Ollama: local por defecto, o Ollama Cloud si hay OLLAMA_API_KEY."""
    llave = os.environ.get("OLLAMA_API_KEY")
    if llave:
        return ollama.AsyncClient(host=os.environ.get("OLLAMA_HOST", "https://ollama.com"),
                                  headers={"Authorization": f"Bearer {llave}"})
    return ollama.AsyncClient()

# Instrucciones para el modelo de lenguaje
SISTEMA = (
    "Eres EcoSort, un asistente que ayuda a separar residuos en Colombia con el código de colores: "
    "caneca verde (orgánicos), blanca (reciclables) y negra (no reciclables). "
    "Reglas: "
    "1) Usa clasificar_residuo SOLO si el usuario escribió la ruta de un archivo de imagen, y usa exactamente esa ruta. "
    "Nunca inventes rutas de archivos. "
    "2) Si el usuario pregunta por un objeto sin dar una imagen, usa guia_de_canecas y responde solo con lo que dice la guía. "
    "3) Las pilas, los celulares y los aparatos electrónicos NO van en ninguna caneca: van a un punto posconsumo. "
    "4) No inventes resultados. Responde en el mismo idioma en que te escribe el usuario, de forma breve y amable. "
    "Las herramientas responden en español: si el usuario escribe en inglés, traduce todo al inglés "
    "(caneca verde = green bin, caneca blanca = white bin, caneca negra = black bin, "
    "punto posconsumo = take-back point, orgánico = organic, reciclable = recyclable, no reciclable = non-recyclable)."
)


def herramientas_para_ollama(lista_mcp):
    """Convierte las herramientas del servidor MCP al formato que entiende Ollama."""
    return [{
        "type": "function",
        "function": {
            "name": h.name,
            "description": h.description or "",
            "parameters": h.input_schema if hasattr(h, "input_schema") else h.inputSchema,
        },
    } for h in lista_mcp.tools]


def texto_del_resultado(resultado):
    """Extrae el texto de la respuesta de una herramienta MCP."""
    if isinstance(resultado, types.CallToolResult):
        partes = [c.text for c in resultado.content if isinstance(c, types.TextContent)]
        if partes:
            return "\n".join(partes)
        estructurado = getattr(resultado, "structured_content", None) or getattr(resultado, "structuredContent", None)
        if estructurado:
            return json.dumps(estructurado, ensure_ascii=False)
    return str(resultado)


import re

# Palabras frecuentes de cada idioma para adivinar en qué idioma escribe el usuario
_PALABRAS_ES = {"donde", "dónde", "que", "qué", "como", "cómo", "esto", "esta", "este", "boto", "botar", "caneca",
                "canecas", "el", "la", "los", "las", "de", "del", "en", "es", "un", "una", "por", "para", "con",
                "hola", "va", "van", "pila", "celular", "basura", "residuo", "puedo", "tengo", "cual", "cuál"}
_PALABRAS_EN = {"where", "what", "how", "the", "this", "that", "does", "do", "is", "a", "an", "of", "in", "to",
                "for", "with", "hi", "hello", "goes", "go", "battery", "phone", "trash", "bin", "can", "should", "which"}


def detectar_idioma(texto):
    """Devuelve 'es' o 'en' según las palabras del mensaje (si hay signos ¿ ¡ o tildes, es español)."""
    if re.search(r"[¿¡ñáéíóú]", texto.lower()):
        return "es"
    palabras = re.findall(r"[a-záéíóúñ]+", texto.lower())
    es = sum(p in _PALABRAS_ES for p in palabras)
    en = sum(p in _PALABRAS_EN for p in palabras)
    return "es" if es > en else "en"


def _normalizar(ruta):
    return ruta.replace("/", "\\").lower()


async def responder(cliente, sesion, herramientas, mensajes, al_usar_herramienta=None):
    """Habla con el modelo; si pide herramientas, las ejecuta en el servidor MCP y vuelve a preguntarle.

    Devuelve (respuesta_final, lista_de_herramientas_usadas)."""
    usadas = []
    for _ in range(6):   # máximo de rondas de herramientas, para no quedar en un ciclo infinito
        respuesta = await cliente.chat(model=MODELO_OLLAMA, messages=mensajes, tools=herramientas)
        mensaje = respuesta.message
        mensajes.append(mensaje)

        # Si el modelo no pidió ninguna herramienta, esa es la respuesta final
        if not mensaje.tool_calls:
            return mensaje.content, usadas

        # Último mensaje escrito por el usuario (para verificar que la ruta de la imagen no sea inventada)
        ultimo_usuario = next(m["content"] for m in reversed(mensajes) if isinstance(m, dict) and m.get("role") == "user")

        # Ejecuta cada herramienta que pidió el modelo y le devuelve el resultado
        for llamada in mensaje.tool_calls:
            nombre = llamada.function.name
            argumentos = dict(llamada.function.arguments or {})
            ruta = str(argumentos.get("ruta_imagen", "")).strip().strip('"').strip("'")
            if nombre == "clasificar_residuo" and _normalizar(ruta) not in _normalizar(ultimo_usuario):
                # Protección: el modelo inventó una ruta que el usuario nunca escribió
                texto = ("El usuario no envió ninguna imagen con esa ruta. No clasifiques imágenes inventadas: "
                         "usa guia_de_canecas para responder.")
                usadas.append({"herramienta": nombre, "argumentos": argumentos, "resultado": None, "bloqueada": True})
            else:
                resultado = await sesion.call_tool(nombre, argumentos)
                texto = texto_del_resultado(resultado)
                usadas.append({"herramienta": nombre, "argumentos": argumentos, "resultado": texto, "bloqueada": False})
            if al_usar_herramienta:
                al_usar_herramienta(usadas[-1])
            mensajes.append({"role": "tool", "content": texto, "tool_name": nombre})
    return "Lo siento, no pude completar la respuesta.", usadas


def parametros_servidor():
    """Parámetros para lanzar el servidor MCP como un proceso hijo que habla por stdio."""
    entorno = dict(os.environ)
    # En Render (existe la variable PORT) el servidor MCP le pregunta al backend por HTTP
    # en vez de cargar su propia copia del modelo: el plan gratis solo tiene 512 MB de RAM.
    if os.environ.get("PORT"):
        entorno["ECOSORT_API_URL"] = f"http://127.0.0.1:{os.environ['PORT']}"
    return StdioServerParameters(
        command=sys.executable,
        args=[str(RAIZ / "mcp_server" / "servidor_mcp.py")],
        cwd=str(RAIZ),
        env=entorno,
    )


class AgenteMCP:
    """Mantiene abierta la conexión con el servidor MCP en un hilo propio.

    El backend web (FastAPI) llama a conversar() desde cualquier hilo; la conexión
    MCP vive en un event loop separado, así no depende del loop de uvicorn."""

    def __init__(self):
        self._listo = threading.Event()
        self._error = None
        self._loop = None
        self._sesion = None
        self._herramientas = None
        self._cliente = None
        self._candado = threading.Lock()

    def iniciar(self, espera=90):
        """Arranca el hilo con la conexión MCP (la primera vez, o de nuevo si la anterior falló)."""
        with self._candado:
            if self._error:
                # El intento anterior falló: se limpia el estado para volver a intentarlo
                self._error, self._loop = None, None
                self._listo.clear()
            if self._loop is None:
                self._loop = "iniciando"
                threading.Thread(target=self._hilo, daemon=True).start()
        if not self._listo.wait(espera):
            raise RuntimeError("the MCP server did not start in time")
        if self._error:
            raise RuntimeError(f"the MCP server could not start: {self._error}")

    def _hilo(self):
        # En Windows se necesita un ProactorEventLoop para lanzar procesos hijos
        self._loop = asyncio.ProactorEventLoop() if sys.platform == "win32" else asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        self._loop.run_until_complete(self._mantener_conexion())

    async def _mantener_conexion(self):
        try:
            async with stdio_client(parametros_servidor()) as (lectura, escritura):
                async with ClientSession(lectura, escritura) as sesion:
                    await sesion.initialize()
                    self._sesion = sesion
                    self._herramientas = herramientas_para_ollama(await sesion.list_tools())
                    self._cliente = crear_cliente_ollama()
                    self._listo.set()
                    await asyncio.Event().wait()   # se queda abierta mientras viva el servidor web
        except Exception as e:  # noqa: BLE001
            self._error = str(e)
            self._listo.set()

    def conversar(self, historial, idioma=None, timeout=240):
        """Recibe el historial [{role, content}, ...] y devuelve (respuesta, herramientas_usadas).

        idioma: "es" o "en". Si no se da, se detecta a partir del último mensaje del usuario."""
        self.iniciar()
        if idioma is None:
            idioma = detectar_idioma(historial[-1]["content"])
        sistema = SISTEMA
        if idioma == "en":
            sistema += (" IMPORTANT: the user wrote in English. Answer ONLY in English, "
                        "translating the Spanish results of the tools. Never answer in Spanish.")
        else:
            sistema += (" IMPORTANTE: el usuario escribió en español. Responde SOLO en español de Colombia, "
                        "tratando al usuario de 'tú' (nunca 'vosotros' ni 'debéis').")
        mensajes = [{"role": "system", "content": sistema}] + historial
        futuro = asyncio.run_coroutine_threadsafe(
            responder(self._cliente, self._sesion, self._herramientas, mensajes), self._loop)
        return futuro.result(timeout)
