# ============================================================
#  Chat de EcoSort en la terminal (Ollama + MCP)
#  Usa el mismo agente que el chat de la página web (agente.py).
#
#  Uso (desde la raíz del proyecto, con Ollama abierto):
#      .venv\Scripts\python.exe mcp_server\chat_ollama.py
#      .venv\Scripts\python.exe mcp_server\chat_ollama.py --pregunta "¿Dónde boto esto? C:\fotos\pila.jpg"
# ============================================================
import argparse
import asyncio
import sys
from pathlib import Path

from mcp import ClientSession
from mcp.client.stdio import stdio_client

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from mcp_server.agente import (  # noqa: E402
    MODELO_OLLAMA, SISTEMA, crear_cliente_ollama, herramientas_para_ollama, parametros_servidor, responder,
)


def mostrar(uso):
    """Imprime cada herramienta que usa el modelo, para ver el MCP en acción."""
    if uso["bloqueada"]:
        print(f"  [MCP] bloqueado: ruta inventada por el modelo ({uso['argumentos']})", flush=True)
    else:
        print(f"  [MCP] usando la herramienta {uso['herramienta']}({uso['argumentos']})", flush=True)
        print(f"  [MCP] resultado: {uso['resultado']}", flush=True)


async def main(pregunta=None):
    async with stdio_client(parametros_servidor()) as (lectura, escritura):
        async with ClientSession(lectura, escritura) as sesion:
            await sesion.initialize()
            lista = await sesion.list_tools()
            herramientas = herramientas_para_ollama(lista)
            print("EcoSort + Ollama (" + MODELO_OLLAMA + ")")
            print("Herramientas MCP disponibles:", ", ".join(h.name for h in lista.tools))

            cliente = crear_cliente_ollama()
            mensajes = [{"role": "system", "content": SISTEMA}]

            async def turno(texto):
                mensajes.append({"role": "user", "content": texto})
                respuesta, _ = await responder(cliente, sesion, herramientas, mensajes, al_usar_herramienta=mostrar)
                return respuesta

            # Modo de una sola pregunta (útil para pruebas y demostraciones)
            if pregunta:
                print(f"\nTú: {pregunta}")
                print("EcoSort:", await turno(pregunta))
                return

            # Modo conversación: escribe "salir" para terminar
            print('Escribe tu pregunta (o "salir"). Ejemplo: ¿Dónde boto esto? C:\\fotos\\pila.jpg\n')
            while True:
                texto = input("Tú: ").strip()
                if texto.lower() in ("salir", "exit", "quit"):
                    break
                if texto:
                    print("EcoSort:", await turno(texto), "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Chat de EcoSort con Ollama y MCP")
    parser.add_argument("--pregunta", help="hace una sola pregunta y termina")
    asyncio.run(main(parser.parse_args().pregunta))
