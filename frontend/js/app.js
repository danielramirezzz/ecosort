// ============================================================
//  EcoSort · Lógica del frontend
//  1. El usuario elige o arrastra una imagen.
//  2. Se muestra la vista previa y se envía al backend (POST /api/clasificar).
//  3. Se pinta el resultado: categoría, caneca, confianza vs. umbral y probabilidades.
// ============================================================

// ---------- Referencias a los elementos de la página ----------
const fileInput = document.getElementById('file-input');
const dropzone = document.getElementById('dropzone');
const dropzoneEmpty = document.getElementById('dropzone-empty');
const preview = document.getElementById('preview');
const result = document.getElementById('result');
const resetBtn = document.getElementById('reset-btn');

// Los cuatro estados posibles del panel de resultado
const states = {
  idle: document.getElementById('state-idle'),
  loading: document.getElementById('state-loading'),
  error: document.getElementById('state-error'),
  done: document.getElementById('state-done'),
};

// Restricciones de archivo (las mismas que valida el backend)
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MB

// Información que se muestra según la categoría predicha
const CATEGORIAS = {
  organic: { icono: '#i-leaf', caneca: 'Put it in the green bin.' },
  recyclable: { icono: '#i-recycle', caneca: 'Put it in the white bin, clean and dry.' },
  non_recyclable: {
    icono: '#i-trash',
    caneca: 'Put it in the black bin. If it is a battery, a phone or another electronic device, take it to a take-back collection point.',
  },
};

// ---------- Utilidades ----------

// Muestra un único estado del panel de resultado y oculta los demás
function mostrarEstado(nombre) {
  Object.entries(states).forEach(([clave, el]) => { el.hidden = clave !== nombre; });
  // aria-busy le indica a los lectores de pantalla que el contenido se está cargando
  result.setAttribute('aria-busy', String(nombre === 'loading'));
}

// Convierte 0.9682 en "96.8%"
const porcentaje = (valor) => `${(valor * 100).toFixed(1)}%`;

// Muestra un mensaje de error en el panel
function mostrarError(mensaje) {
  document.getElementById('error-text').textContent = mensaje;
  mostrarEstado('error');
}

// ---------- Flujo principal ----------

// Valida el archivo, muestra la vista previa y lo envía al backend
async function procesarArchivo(archivo) {
  if (!archivo) return;

  // Validaciones en el navegador antes de enviar
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    mostrarError('Unsupported format. Please use a JPG, PNG or WEBP image.');
    return;
  }
  if (archivo.size > TAMANO_MAXIMO) {
    mostrarError('The image exceeds the 10 MB limit.');
    return;
  }

  // Vista previa: crea una URL temporal para mostrar la imagen sin subirla todavía
  if (preview.src) URL.revokeObjectURL(preview.src);
  preview.src = URL.createObjectURL(archivo);
  preview.hidden = false;
  dropzoneEmpty.hidden = true;
  dropzone.classList.add('has-image');

  // Muestra el esqueleto de carga mientras responde el servidor
  mostrarEstado('loading');

  // Arma el formulario con la imagen y lo envía a la API
  const formData = new FormData();
  formData.append('imagen', archivo);

  try {
    const respuesta = await fetch('/api/classify', { method: 'POST', body: formData });
    const datos = await respuesta.json();

    // Si el backend respondió con error, muestra su mensaje
    if (!respuesta.ok) throw new Error(datos.detail || 'Could not classify the image.');

    pintarResultado(datos);
  } catch (error) {
    mostrarError(error.message === 'Failed to fetch'
      ? 'Cannot reach the server. Is the backend running?'
      : error.message);
  }
}

// Llena el panel con la respuesta del modelo
function pintarResultado(datos) {
  const info = CATEGORIAS[datos.categoria];

  // Cambia la clase del panel para aplicar los colores de la categoría
  result.className = `result result--${datos.categoria}`;

  // Ícono, nombre de la categoría y caneca donde va
  document.querySelector('#result-icon use').setAttribute('href', info.icono);
  document.getElementById('result-label').textContent = datos.etiqueta;
  document.getElementById('result-bin').textContent = info.caneca;

  // Barra de confianza y marca roja del umbral
  document.getElementById('result-confidence').textContent = porcentaje(datos.confianza);
  document.getElementById('threshold-mark').style.left = porcentaje(datos.umbral);
  document.getElementById('threshold-note').textContent = datos.seguro
    ? `Above the ${porcentaje(datos.umbral)} threshold: the model is confident.`
    : `Below the ${porcentaje(datos.umbral)} threshold: the model is unsure, so to be safe it is treated as non-recyclable.`;

  // Lista de probabilidades de cada clase
  const lista = document.getElementById('probs');
  lista.innerHTML = '';
  Object.entries(datos.probabilidades).forEach(([clase, prob]) => {
    const item = document.createElement('li');
    item.innerHTML = `
      <div class="prob__row"><span>${clase}</span><strong>${porcentaje(prob)}</strong></div>
      <div class="prob__track"><div class="prob__fill"></div></div>`;
    lista.appendChild(item);
    // Se guarda el ancho final para animarlo después de mostrar el panel
    item.querySelector('.prob__fill').dataset.width = porcentaje(prob);
  });

  mostrarEstado('done');

  // Anima las barras desde 0 hasta su valor (en el siguiente frame para que se vea la transición)
  const fill = document.getElementById('confidence-fill');
  fill.style.width = '0';
  requestAnimationFrame(() => {
    fill.style.width = porcentaje(datos.confianza);
    lista.querySelectorAll('.prob__fill').forEach((barra) => { barra.style.width = barra.dataset.width; });
  });
}

// Deja la página lista para otra imagen
function reiniciar() {
  fileInput.value = '';
  if (preview.src) URL.revokeObjectURL(preview.src);
  preview.removeAttribute('src');
  preview.hidden = true;
  dropzoneEmpty.hidden = false;
  dropzone.classList.remove('has-image');
  result.className = 'result';
  mostrarEstado('idle');
  fileInput.focus(); // devuelve el foco a la zona de carga
}

// ---------- Eventos ----------

// Cuando se elige un archivo con el explorador (clic o teclado)
fileInput.addEventListener('change', () => procesarArchivo(fileInput.files[0]));

// Arrastrar y soltar: resalta la zona mientras el archivo está encima
['dragenter', 'dragover'].forEach((evento) => dropzone.addEventListener(evento, (e) => {
  e.preventDefault();
  dropzone.classList.add('is-dragover');
}));
['dragleave', 'drop'].forEach((evento) => dropzone.addEventListener(evento, (e) => {
  e.preventDefault();
  dropzone.classList.remove('is-dragover');
}));
dropzone.addEventListener('drop', (e) => procesarArchivo(e.dataTransfer.files[0]));

// Botón "Clasificar otra imagen"
resetBtn.addEventListener('click', reiniciar);

// ---------- Métricas del modelo ----------

// Al cargar la página, pide al backend las métricas y el umbral para mostrarlos en "Cómo funciona"
async function cargarInfoModelo() {
  try {
    const respuesta = await fetch('/api/info');
    if (!respuesta.ok) return;
    const info = await respuesta.json();
    document.getElementById('m-acc').textContent = porcentaje(info.metricas.accuracy);
    document.getElementById('m-bal').textContent = porcentaje(info.metricas.balanced_accuracy);
    document.getElementById('m-f1').textContent = porcentaje(info.metricas.macro_f1);
    document.getElementById('threshold-text').textContent = info.umbral.toFixed(2);
    // Cantidad de imágenes con separador de miles (ej. 40,123)
    document.getElementById('m-total').textContent = info.dataset.total.toLocaleString('en-US');
    document.getElementById('m-test').textContent = info.dataset.test.toLocaleString('en-US');
  } catch {
    // Si el backend no responde, se dejan los guiones por defecto
  }
}

cargarInfoModelo();
