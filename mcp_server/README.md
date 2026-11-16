# EcoSort MCP server

The EcoSort classifier exposed as a **Model Context Protocol (MCP)** server, so that AI assistants can use it as a tool.

| Tool | What it does |
|---|---|
| `clasificar_residuo(ruta_imagen)` | Classifies the photo of a waste item and returns the bin (green, white or black), the confidence and a disposal tip |
| `guia_de_canecas()` | Returns the Colombian color code (Resolución 2184 de 2019) |
| `informacion_modelo()` | Returns the model metrics |

## Requirements

- Project virtual environment with `mcp` and `ollama` installed:
  `.venv\Scripts\python.exe -m pip install mcp ollama`
- [Ollama](https://ollama.com) running with a model that supports tool calling:
  `ollama pull qwen2.5:7b`

## Chat with Ollama (local model)

From the project root:

```bash
.venv\Scripts\python.exe mcp_server\chat_ollama.py
```

Example questions:

```
¿Dónde boto esto? C:\fotos\pila.jpg
¿En qué caneca van las cáscaras de banano?
¿Qué tan preciso es el modelo?
```

One-shot mode (useful for demos):

```bash
.venv\Scripts\python.exe mcp_server\chat_ollama.py --pregunta "¿Dónde boto esto? C:\fotos\pila.jpg"
```

The program starts the MCP server, gives its tools to the Ollama model (`qwen2.5:7b`) and, whenever the
model decides to use a tool, runs it on the MCP server and returns the result to the model. Lines that
start with `[MCP]` show each tool call.

## Use it from Claude Desktop (optional)

Add this to `claude_desktop_config.json` (adjust the paths):

```json
{
  "mcpServers": {
    "ecosort": {
      "command": "C:\\path\\to\\NNApp-main\\.venv\\Scripts\\python.exe",
      "args": ["C:\\path\\to\\NNApp-main\\mcp_server\\servidor_mcp.py"]
    }
  }
}
```
