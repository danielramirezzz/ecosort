"""
Genera la música de fondo del video de EcoSort (pista original, libre de derechos).

Estructura (sincronizada con las escenas del video, 198 s a 100 BPM):
  0-38 s    intro suave: acordes de fondo (el problema)
  38-58 s   tensión: entra un bajo pulsante (la confusión)
  56-58 s   subida de ruido antes de la revelación
  58-186 s  ritmo completo: bombo, platillo, arpegio y bajo (llega EcoSort)
  186-198 s cierre: solo acordes que se desvanecen

Uso:  python generar_musica.py ../public/music.wav
"""
import sys
import wave
import numpy as np

SR = 44100            # muestras por segundo
DUR = 198.0           # duración total (igual que el video)
BPM = 100
BEAT = 60 / BPM       # duración de un tiempo (0.6 s)
BAR = 4 * BEAT        # un compás = 4 tiempos
N = int(SR * DUR)
rng = np.random.default_rng(7)

def midi(n):
    """Convierte una nota MIDI a frecuencia en Hz."""
    return 440.0 * 2 ** ((n - 69) / 12)

def add(buf, start, sig):
    """Suma una señal al buffer a partir de un tiempo en segundos."""
    i = int(start * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    buf[i:i + len(sig)] += sig

def env_ad(n, attack, decay):
    """Envolvente de ataque rápido y caída exponencial."""
    t = np.arange(n) / SR
    return np.minimum(t / attack, 1.0) * np.exp(-t / decay)

# Progresión de acordes (La menor, Fa, Do, Sol), un acorde por compás
ACORDES = [
    [57, 60, 64],   # Am
    [53, 57, 60],   # F
    [48, 52, 55],   # C
    [55, 59, 62],   # G
]

def nivel(t):
    """Intensidad de cada capa según la parte del video."""
    return {
        'pad': 1.0,
        # 57.6 s es el inicio del compás 24: el ritmo entra justo con la aparición de EcoSort (58 s)
        'bajo': 0.0 if t < 38 else (0.7 if t < 57.5 else 1.0) if t < 186 else 0.0,
        'ritmo': 1.0 if 57.5 <= t < 186 else 0.0,
        'arpegio': 1.0 if 57.5 <= t < 186 else (0.35 if 14 <= t < 38 else 0.0),
    }

pad = np.zeros(N); bajo = np.zeros(N); arp = np.zeros(N); drums = np.zeros(N)

n_bars = int(np.ceil(DUR / BAR))
for b in range(n_bars):
    t0 = b * BAR
    acorde = ACORDES[b % 4]
    lv = nivel(t0)

    # --- Acordes de fondo (pad): senos levemente desafinados con ataque y caída lentos ---
    n = int(BAR * SR) + SR
    t = np.arange(n) / SR
    env = np.minimum(t / 0.8, 1.0) * np.clip((BAR + 0.8 - t) / 0.8, 0, 1)
    s = np.zeros(n)
    for nota in acorde:
        f = midi(nota)
        for det in (-0.12, 0.12):
            s += np.sin(2 * np.pi * f * (1 + det / 100) * t) + 0.15 * np.sin(2 * np.pi * 2 * f * t)
    add(pad, t0, s * env * 0.05 * lv['pad'])

    # --- Bajo: nota raíz una octava abajo, en cada tiempo (en la tensión, en corcheas) ---
    if lv['bajo'] > 0:
        paso = BEAT / 2 if t0 < 57.5 else BEAT
        for k in range(int(BAR / paso)):
            nb = int(paso * SR)
            tb = np.arange(nb) / SR
            f = midi(acorde[0] - 12)
            sb = (np.sin(2 * np.pi * f * tb) + 0.3 * np.sin(2 * np.pi * 2 * f * tb)) * env_ad(nb, 0.005, paso * 0.6)
            add(bajo, t0 + k * paso, sb * 0.22 * lv['bajo'])

    # --- Arpegio: notas del acorde una octava arriba, en corcheas, tipo "pluck" ---
    if lv['arpegio'] > 0:
        patron = [0, 1, 2, 1, 0, 2, 1, 2]
        for k, idx in enumerate(patron):
            na = int(BEAT * SR)
            ta = np.arange(na) / SR
            f = midi(acorde[idx] + 12)
            sa = (np.sin(2 * np.pi * f * ta) + 0.25 * np.sin(2 * np.pi * 3 * f * ta)) * env_ad(na, 0.004, 0.18)
            add(arp, t0 + k * BEAT / 2, sa * 0.07 * lv['arpegio'])

    # --- Batería: bombo en 1 y 3, platillo cerrado en corcheas, palmada en 2 y 4 ---
    if lv['ritmo'] > 0:
        for k in range(4):
            if k in (0, 2):
                nk = int(0.35 * SR)
                tk = np.arange(nk) / SR
                freq = 50 + 110 * np.exp(-tk / 0.04)          # tono que baja: sonido de bombo
                kick = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-tk / 0.12)
                add(drums, t0 + k * BEAT, kick * 0.45)
            if k in (1, 3):
                nc = int(0.18 * SR)
                clap = rng.standard_normal(nc) * env_ad(nc, 0.002, 0.05)
                clap = np.convolve(clap, np.ones(6) / 6, mode='same')
                add(drums, t0 + k * BEAT, clap * 0.12)
            for h in range(2):
                nh = int(0.06 * SR)
                hat = np.diff(rng.standard_normal(nh + 1)) * env_ad(nh, 0.001, 0.015)
                add(drums, t0 + k * BEAT + h * BEAT / 2, hat * 0.05)

# --- Subida de ruido antes de la revelación de EcoSort (56-58 s) ---
nr = int(2.0 * SR)
tr = np.arange(nr) / SR
riser = np.diff(rng.standard_normal(nr + 1)) * (tr / 2.0) ** 2 * 0.12
add(drums, 55.6, riser)

# Mezcla, saturación suave, fundido de entrada y salida
mix = pad + bajo + arp + drums
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
t = np.arange(N) / SR
mix *= np.clip(t / 2.0, 0, 1) * np.clip((DUR - t) / 6.0, 0, 1)
mix /= np.max(np.abs(mix)) * 1.05

# Estéreo: el arpegio un poco a la derecha y los acordes un poco a la izquierda
left = mix + 0.15 * (pad - arp) / (np.max(np.abs(mix)) + 1e-9)
right = mix - 0.15 * (pad - arp) / (np.max(np.abs(mix)) + 1e-9)
stereo = np.stack([left, right], axis=1)
stereo /= np.max(np.abs(stereo)) * 1.02

with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((stereo * 32767).astype('<i2').tobytes())
print('ok', sys.argv[1], f'{DUR:.0f} s')
