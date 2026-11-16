// ============================================================
//  EcoSort · Chat con el asistente (Ollama + servidor MCP)
//  1. El usuario escribe una pregunta o adjunta una foto.
//  2. Se envía al backend (POST /api/chat) junto con el historial.
//  3. El backend habla con Ollama, que usa las herramientas del servidor MCP.
//  4. Se muestran las herramientas MCP usadas y la respuesta del asistente.
// ============================================================

(() => {
  // ---------- Referencias a los elementos del chat ----------
  const lista = document.getElementById('chat-messages');
  const formulario = document.getElementById('chat-form');
  const entrada = document.getElementById('chat-input');
  const botonEnviar = document.getElementById('chat-send');
  const archivoInput = document.getElementById('chat-file');
  const adjunto = document.getElementById('chat-attachment');
  const adjuntoImg = document.getElementById('chat-attachment-img');
  const adjuntoNombre = document.getElementById('chat-attachment-name');
  const quitarAdjunto = document.getElementById('chat-attachment-remove');
  const sugerencias = document.getElementById('chat-suggestions');

  // Historial que se envía al modelo en cada mensaje: [{ role, content }]
  const historial = [];
  let fotoAdjunta = null;
  let ocupado = false;

  // Nombre amigable de cada herramienta del servidor MCP
  const NOMBRES = {
    clasificar_residuo: 'classify_waste',
    guia_de_canecas: 'bin_guide',
    informacion_modelo: 'model_info',
  };

  // ---------- Utilidades para pintar mensajes ----------

  // Baja la vista al último mensaje
  const bajar = () => { lista.scrollTop = lista.scrollHeight; };

  // Convierte el texto del modelo en párrafos, respetando **negritas** (sin usar innerHTML con texto ajeno)
  function parrafos(texto) {
    const fragmento = document.createDocumentFragment();
    texto.split(/\n{1,}/).filter((l) => l.trim()).forEach((linea) => {
      const p = document.createElement('p');
      linea.split(/(\*\*[^*]+\*\*)/).forEach((parte) => {
        if (parte.startsWith('**') && parte.endsWith('**')) {
          const b = document.createElement('b');
          b.textContent = parte.slice(2, -2);
          p.appendChild(b);
        } else {
          p.appendChild(document.createTextNode(parte));
        }
      });
      fragmento.appendChild(p);
    });
    return fragmento;
  }

  // Agrega un mensaje del usuario (texto y miniatura de la foto, si hay)
  function mensajeUsuario(texto, urlFoto) {
    const div = document.createElement('div');
    div.className = 'msg msg--user';
    if (urlFoto) {
      const img = document.createElement('img');
      img.src = urlFoto;
      img.alt = 'Photo sent to the assistant';
      img.className = 'msg__photo';
      div.appendChild(img);
    }
    if (texto) div.appendChild(parrafos(texto));
    lista.appendChild(div);
    bajar();
  }

  // Agrega una respuesta del asistente
  function mensajeAsistente(texto, esError = false) {
    const div = document.createElement('div');
    div.className = 'msg msg--bot' + (esError ? ' msg--error' : '');
    div.appendChild(parrafos(texto));
    lista.appendChild(div);
    bajar();
  }

  // Resume en una línea lo que devolvió cada herramienta MCP
  function resumen(uso) {
    if (uso.bloqueada) return 'blocked: the model tried to use a photo that was never sent';
    try {
      const r = JSON.parse(uso.resultado);
      if (r.error) return r.error;
      if (uso.herramienta === 'clasificar_residuo') return `${r.categoria} · ${r.caneca} bin · ${r.confianza}`;
      if (uso.herramienta === 'guia_de_canecas') return 'Colombian bin color code';
      if (uso.herramienta === 'informacion_modelo') return `accuracy ${r.exactitud}`;
    } catch {
      // Si no es JSON, se muestra un texto genérico
    }
    return 'done';
  }

  // Agrega la etiqueta que muestra que el asistente usó una herramienta del servidor MCP
  function etiquetaHerramienta(uso) {
    const div = document.createElement('div');
    div.className = 'tool-call' + (uso.bloqueada ? ' tool-call--blocked' : '');
    div.innerHTML = '<svg class="icon"><use href="#i-tool"/></svg>';
    const texto = document.createElement('span');
    texto.textContent = `MCP · ${NOMBRES[uso.herramienta] || uso.herramienta} → ${resumen(uso)}`;
    div.appendChild(texto);
    lista.appendChild(div);
    bajar();
  }

  // Indicador de "escribiendo…" mientras responde el modelo
  function mostrarEscribiendo() {
    const div = document.createElement('div');
    div.className = 'msg msg--bot msg--typing';
    div.setAttribute('aria-label', 'The assistant is thinking');
    div.innerHTML = '<span></span><span></span><span></span>';
    lista.appendChild(div);
    bajar();
    return div;
  }

  // ---------- Foto adjunta ----------
  function limpiarAdjunto() {
    if (adjuntoImg.src) URL.revokeObjectURL(adjuntoImg.src);
    fotoAdjunta = null;
    archivoInput.value = '';
    adjunto.hidden = true;
  }

  archivoInput.addEventListener('change', () => {
    const archivo = archivoInput.files[0];
    if (!archivo) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
      mensajeAsistente('Please attach a JPG, PNG or WEBP image.', true);
      archivoInput.value = '';
      return;
    }
    fotoAdjunta = archivo;
    adjuntoImg.src = URL.createObjectURL(archivo);
    adjuntoNombre.textContent = archivo.name;
    adjunto.hidden = false;
    entrada.focus();
  });
  quitarAdjunto.addEventListener('click', limpiarAdjunto);

  // ---------- Envío del mensaje ----------
  async function enviar(texto) {
    if (ocupado || (!texto && !fotoAdjunta)) return;
    ocupado = true;
    botonEnviar.disabled = true;
    sugerencias.hidden = true;

    // Muestra el mensaje del usuario de inmediato
    const urlFoto = fotoAdjunta ? URL.createObjectURL(fotoAdjunta) : null;
    mensajeUsuario(texto, urlFoto);

    // Arma el formulario: mensaje, historial y foto opcional
    const datos = new FormData();
    datos.append('mensaje', texto);
    datos.append('historial', JSON.stringify(historial));
    if (fotoAdjunta) datos.append('imagen', fotoAdjunta);
    entrada.value = '';
    limpiarAdjunto();

    const escribiendo = mostrarEscribiendo();
    try {
      const respuesta = await fetch('/api/chat', { method: 'POST', body: datos });
      const json = await respuesta.json();
      escribiendo.remove();
      if (!respuesta.ok) throw new Error(json.detail || 'The assistant could not answer.');

      // Primero las herramientas MCP que usó el modelo, luego su respuesta
      json.herramientas.forEach(etiquetaHerramienta);
      mensajeAsistente(json.respuesta);

      // Guarda el turno en el historial (con la ruta de la foto, para que el modelo la recuerde)
      historial.push({ role: 'user', content: json.mensaje_usuario });
      historial.push({ role: 'assistant', content: json.respuesta });
    } catch (error) {
      escribiendo.remove();
      mensajeAsistente(error.message === 'Failed to fetch' ? 'Cannot reach the server. Is the backend running?' : error.message, true);
    } finally {
      ocupado = false;
      botonEnviar.disabled = false;
      entrada.focus();
    }
  }

  formulario.addEventListener('submit', (e) => {
    e.preventDefault();
    enviar(entrada.value.trim());
  });

  // Las preguntas sugeridas se envían con un clic
  sugerencias.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => enviar(chip.textContent));
  });
})();
