// ============================================================
//  EcoSort · Canecas en 3D
//  Dibuja tres canecas (verde, blanca y negra) con Three.js.
//  - Mantener presionado y arrastrar: gira la caneca.
//  - Pasar el mouse por encima: la tapa se abre.
//  - Sin interacción: la caneca gira sola lentamente.
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Si el usuario pidió "reducir movimiento" en su sistema, no se gira automáticamente
const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Apariencia de cada caneca ----------
const CANECAS = {
  organic:        { cuerpo: 0x2f8f3a, tapa: 0x267a30, texto: '#ffffff', rotulo: ['ORGANIC'] },
  recyclable:     { cuerpo: 0xf2f4ef, tapa: 0xdfe3dc, texto: '#163300', rotulo: ['RECYCLABLE'] },
  non_recyclable: { cuerpo: 0x1d1f1b, tapa: 0x2a2c27, texto: '#ffffff', rotulo: ['NON-', 'RECYCLABLE'] },
};

// Medidas de la caneca (en unidades de la escena)
const ALTO = 2.2;           // altura del cuerpo
const RADIO_ABAJO = 0.78;   // radio en la base
const RADIO_ARRIBA = 0.95;  // radio en la boca (la caneca es más ancha arriba)
const radioEn = (y) => RADIO_ABAJO + (RADIO_ARRIBA - RADIO_ABAJO) * (y / ALTO); // radio a cierta altura

// ---------- Rótulo de texto (se dibuja en un canvas 2D y se usa como textura) ----------
function crearTexturaRotulo(lineas, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Ajusta el tamaño de letra para que la línea más larga quepa en el ancho
  let tamano = 200;
  ctx.font = `900 ${tamano}px Inter, Arial, sans-serif`;
  const masAncha = Math.max(...lineas.map((l) => ctx.measureText(l).width));
  tamano = Math.min(tamano, (tamano * 900) / masAncha);
  ctx.font = `900 ${tamano}px Inter, Arial, sans-serif`;

  // Dibuja cada línea centrada verticalmente
  const alto = tamano * 1.0;
  const inicio = canvas.height / 2 - ((lineas.length - 1) * alto) / 2;
  lineas.forEach((linea, i) => ctx.fillText(linea, canvas.width / 2, inicio + i * alto));

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 8;
  return textura;
}

// ---------- Modelo 3D de la caneca ----------
function crearCaneca(tipo) {
  const estilo = CANECAS[tipo];
  const caneca = new THREE.Group();

  // Material de plástico brillante (clearcoat da el reflejo tipo plástico)
  const plastico = (color) => new THREE.MeshPhysicalMaterial({
    color, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.35,
  });

  // 1. Cuerpo: perfil girado 360° (LatheGeometry) -> cilindro más ancho arriba con base redondeada
  const perfil = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(RADIO_ABAJO - 0.05, 0),
    new THREE.Vector2(RADIO_ABAJO, 0.05),
    new THREE.Vector2(RADIO_ARRIBA, ALTO),
  ];
  const cuerpo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 64), plastico(estilo.cuerpo));
  cuerpo.castShadow = true;
  caneca.add(cuerpo);

  // 2. Anillos decorativos (bordes en relieve) en la boca y cerca de la base
  [[ALTO - 0.02, 0.05], [0.35, 0.03]].forEach(([y, grosor]) => {
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(radioEn(y) + 0.01, grosor, 12, 64), plastico(estilo.tapa));
    anillo.rotation.x = Math.PI / 2;
    anillo.position.y = y;
    caneca.add(anillo);
  });

  // 3. Rótulo con el nombre: un pedazo de cilindro pegado al frente del cuerpo
  const yAbajo = 0.75, yArriba = 1.65, arco = 1.5; // altura y ancho (en radianes) del rótulo
  const rotulo = new THREE.Mesh(
    new THREE.CylinderGeometry(radioEn(yArriba) + 0.004, radioEn(yAbajo) + 0.004, yArriba - yAbajo, 48, 1, true, -arco / 2, arco),
    new THREE.MeshBasicMaterial({ map: crearTexturaRotulo(estilo.rotulo, estilo.texto), transparent: true }),
  );
  rotulo.position.y = (yAbajo + yArriba) / 2;
  caneca.add(rotulo);

  // 4. Agarraderas laterales
  [-1, 1].forEach((lado) => {
    const agarradera = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.12, 0.5, 4, 0.05), plastico(estilo.tapa));
    agarradera.position.set(lado * (radioEn(1.9) + 0.04), 1.9, 0);
    agarradera.castShadow = true;
    caneca.add(agarradera);
  });

  // 5. Tapa con bisagra atrás: el "pivote" se ubica en el borde trasero para que la tapa gire desde ahí
  const pivote = new THREE.Group();
  pivote.position.set(0, ALTO + 0.02, -RADIO_ARRIBA);
  caneca.add(pivote);

  const tapa = new THREE.Group();
  tapa.position.z = RADIO_ARRIBA; // compensa el pivote para que la tapa quede centrada
  pivote.add(tapa);

  // Tapa ligeramente abombada (otro perfil girado)
  const perfilTapa = [
    new THREE.Vector2(0, 0.2),
    new THREE.Vector2(0.6, 0.17),
    new THREE.Vector2(RADIO_ARRIBA + 0.05, 0.06),
    new THREE.Vector2(RADIO_ARRIBA + 0.06, 0),
    new THREE.Vector2(0, 0),
  ];
  const tapaMalla = new THREE.Mesh(new THREE.LatheGeometry(perfilTapa, 64), plastico(estilo.tapa));
  tapaMalla.castShadow = true;
  tapa.add(tapaMalla);

  // Manija de la tapa (medio aro)
  const manija = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 12, 32, Math.PI), plastico(estilo.cuerpo));
  manija.position.y = 0.19;
  tapa.add(manija);

  return { caneca, pivote };
}

// ---------- Escena completa para un contenedor ----------
function crearEscena(contenedor) {
  const tipo = contenedor.dataset.bin;
  const escena = new THREE.Scene();

  // Cámara en perspectiva mirando a la caneca desde arriba y de lado
  const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camara.position.set(4.3, 3.5, 6.8);

  // Renderizador WebGL con fondo transparente y sombras suaves
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  contenedor.appendChild(renderer.domElement);

  // Luces: ambiental (cielo/suelo) + una principal que proyecta sombra + una de relleno
  escena.add(new THREE.HemisphereLight(0xffffff, 0xdfe6d8, 1.6));
  const sol = new THREE.DirectionalLight(0xffffff, 2.2);
  sol.position.set(3, 6, 4);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  sol.shadow.radius = 6;
  escena.add(sol);
  const relleno = new THREE.DirectionalLight(0xe2f6d5, 0.8);
  relleno.position.set(-4, 2, -2);
  escena.add(relleno);

  // Piso invisible que solo muestra la sombra de la caneca
  const piso = new THREE.Mesh(new THREE.CircleGeometry(3, 48), new THREE.ShadowMaterial({ opacity: 0.18 }));
  piso.rotation.x = -Math.PI / 2;
  piso.receiveShadow = true;
  escena.add(piso);

  const { caneca, pivote } = crearCaneca(tipo);
  caneca.rotation.y = Math.atan2(camara.position.x, camara.position.z); // el rótulo empieza mirando a la cámara
  escena.add(caneca);

  // Controles: arrastrar para girar (sin zoom ni desplazamiento), con giro automático
  const controles = new OrbitControls(camara, renderer.domElement);
  controles.target.set(0, 1.3, 0);
  controles.enableZoom = false;
  controles.enablePan = false;
  controles.enableDamping = true;          // el giro frena suavemente al soltar
  controles.dampingFactor = 0.08;
  controles.minPolarAngle = 0.55;          // no deja mirar desde muy arriba...
  controles.maxPolarAngle = 1.45;          // ...ni desde debajo del piso
  controles.autoRotate = !reducirMovimiento;
  controles.autoRotateSpeed = 1.6;
  controles.update();

  // Al arrastrar se pausa el giro automático; se reanuda 2 s después de soltar
  let temporizador;
  controles.addEventListener('start', () => {
    clearTimeout(temporizador);
    controles.autoRotate = false;
    contenedor.classList.add('is-grabbing');
  });
  controles.addEventListener('end', () => {
    contenedor.classList.remove('is-grabbing');
    if (!reducirMovimiento) temporizador = setTimeout(() => { controles.autoRotate = true; }, 2000);
  });

  // La tapa se abre cuando el mouse está encima (o mientras se arrastra)
  let tapaObjetivo = 0;
  contenedor.addEventListener('pointerenter', () => { tapaObjetivo = 0.75; });
  contenedor.addEventListener('pointerleave', () => { tapaObjetivo = 0; });

  // Ajusta el tamaño del lienzo cuando cambia el tamaño de la tarjeta
  new ResizeObserver(() => {
    const { clientWidth: ancho, clientHeight: alto } = contenedor;
    renderer.setSize(ancho, alto);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
  }).observe(contenedor);

  // Función que dibuja un cuadro (frame) de la animación
  function dibujar() {
    // Interpolación suave del ángulo de la tapa hacia su objetivo (abierta o cerrada)
    pivote.rotation.x += (-tapaObjetivo - pivote.rotation.x) * (reducirMovimiento ? 1 : 0.12);
    controles.update();
    renderer.render(escena, camara);
  }

  // Ya cargó el 3D: se oculta el ícono de respaldo
  contenedor.classList.add('is-ready');
  return { contenedor, dibujar };
}

// ---------- Inicio ----------
// Espera a que cargue la fuente Inter para que el rótulo se dibuje con ella
await document.fonts.load('900 100px Inter').catch(() => {});
const escenas = [...document.querySelectorAll('.bin3d')].map(crearEscena);

// Solo se animan las canecas visibles en pantalla (ahorra GPU y batería)
const visibles = new Set();
const observador = new IntersectionObserver((entradas) => {
  entradas.forEach((e) => {
    const escena = escenas.find((s) => s.contenedor === e.target);
    if (e.isIntersecting) visibles.add(escena); else visibles.delete(escena);
  });
});
escenas.forEach((s) => observador.observe(s.contenedor));

// Bucle de animación: ~60 cuadros por segundo
function animar() {
  visibles.forEach((s) => s.dibujar());
  requestAnimationFrame(animar);
}
animar();
