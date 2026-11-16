// ============================================================
//  Punto de entrada de Remotion: registra la composición
//  "EcoSort" (1920x1080, 30 fps) con todas las escenas en orden.
// ============================================================
import React from 'react';
import { Audio, Composition, registerRoot, Series, staticFile } from 'remotion';
import { S1Hook, S2Problem, S3Confusion, S4Hero, S5HowItWorks } from './scenes1';
import { S6Examples, S7UnderTheHood, S8Results, S9Mcp, S10Closing } from './scenes2';

const FPS = 30;

// Escenas y su duración en segundos (deben coincidir con el guion)
export const ESCENAS = [
  [S1Hook, 14],
  [S2Problem, 24],
  [S3Confusion, 20],
  [S4Hero, 14],
  [S5HowItWorks, 30],
  [S6Examples, 24],
  [S7UnderTheHood, 24],
  [S8Results, 20],
  [S9Mcp, 16],
  [S10Closing, 12],
];
const TOTAL = ESCENAS.reduce((s, [, seg]) => s + seg * FPS, 0);

// Volumen de la música: de fondo, para que la voz se escuche encima
const VOLUMEN_MUSICA = 0.45;

// Video completo: música de fondo + cada escena una detrás de otra
const Video = () => (
  <>
    {/* Pista original generada con musica/generar_musica.py (sin derechos de autor) */}
    <Audio src={staticFile('music.wav')} volume={VOLUMEN_MUSICA} />
    <Series>
      {ESCENAS.map(([Escena, seg], i) => (
        <Series.Sequence key={i} durationInFrames={seg * FPS}>
          <Escena dur={seg * FPS} />
        </Series.Sequence>
      ))}
    </Series>
  </>
);

const Root = () => (
  <Composition id="EcoSort" component={Video} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
);

registerRoot(Root);
