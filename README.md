# EcoSort — Intelligent waste sorting for the Colombian three-bin system

Upload a photo of a piece of waste and the model (EfficientNet-B0 with transfer learning) classifies it as
**Organic**, **Recyclable** or **Non-recyclable**, following Colombia's bin color code (Resolución 2184 de 2019).
The page also includes an **AI assistant** (Ollama) that uses the classifier through an **MCP server**.

**Promotional video (3 min):** <https://www.youtube.com/watch?v=ixV6FhaOu5I>

## Project structure

```
NNApp-main/
├── backend/                  FastAPI server
│   ├── main.py               /api/classify, /api/info and /api/chat routes, serves the frontend
│   ├── clasificador.py       loads the model and applies the confidence threshold
│   ├── preprocesamiento.py   prepares the image (224x224 + normalization)
│   └── modelo/               model weights (.pth) and config (.json)
├── frontend/                 web page (HTML, CSS and JavaScript)
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── app.js            classifier logic
│       ├── chat.js           AI assistant chat
│       └── canecas3d.js      interactive 3D bins (Three.js)
├── mcp_server/               MCP server + Ollama agent (see mcp_server/README.md)
│   ├── servidor_mcp.py       tools: clasificar_residuo, guia_de_canecas, informacion_modelo
│   ├── agente.py             connects an Ollama model with the MCP server
│   └── chat_ollama.py        terminal chat
├── notebooks/
│   ├── EcoSort_Training.ipynb  model training
│   └── Model_Comparison.ipynb  comparison of 4 architectures
├── video/                    promotional video (Remotion) and voice-over script
├── render.yaml               Render deployment (Blueprint)
└── requirements-render.txt   dependencies for Render (CPU only)
```

## Setup

```bash
python -m venv .venv
.\.venv\Scripts\activate          # Windows
pip install -r requirements.txt
pip install mcp ollama
```

## Run the web page

From the project root:

```bash
.venv\Scripts\python.exe -m uvicorn backend.main:app --port 8000
```

(Using `python -m uvicorn` guarantees the project's `.venv` is used, even if the `uvicorn` command points somewhere else.)

Then open <http://localhost:8000>. For the AI assistant section, [Ollama](https://ollama.com) must be running with
`qwen2.5:7b` (`ollama pull qwen2.5:7b`).

## Deploy on Render

1. Push this folder to a GitHub repository (the `.gitignore` leaves out the datasets and other heavy files).
2. In Render: **New → Blueprint**, choose the repository. Render reads `render.yaml` and creates the `ecosort` web service.
3. Optional, for the AI assistant: create an API key at ollama.com (Settings → Keys) and paste it in Render as
   `OLLAMA_API_KEY`. Without it, the page works and only the chat says the assistant is not available.

Notes: the free plan has 512 MB of RAM and no GPU, so PyTorch is installed in its CPU version; the service sleeps after
15 minutes without visits and takes about a minute to wake up.

## Retrain the model

Run `notebooks/EcoSort_Training.ipynb`. It saves the model files to `backend/modelo/`. The training images are not in the
repository; download the datasets listed below into `datasets/waste_data/`.

## Datasets

The combined dataset used to train EcoSort (one folder per class: `Norecyclable`, `organic`, `recyclable`) is on
Google Drive: <https://drive.google.com/drive/folders/1v7R_sbWMUjD7KU4GaF-0x7TE9zGf1H_Y>. It was built from these
public datasets:

- Waste Classification Dataset (Kaggle)
- Garbage Classification — 12 classes (Kaggle, mostafaabla)
- TrashBox — N. V. Kumsetty et al., "TrashBox: Trash Detection and Classification using Quantum Transfer Learning", FRUCT 2022
- RealWaste — S. Single et al., UCI Machine Learning Repository, 2023 (CC BY 4.0)
- TrashNet — G. Thung and M. Yang, 2016 (MIT)
