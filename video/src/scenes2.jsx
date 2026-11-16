// ============================================================
//  Escenas 6 a 10: ejemplos, cómo funciona por dentro,
//  resultados, el chat con MCP + Ollama y el cierre.
// ============================================================
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import {
  C, Scene, Rise, Counter, Typewriter, usePop, progress, Battery, Bottle, Banana, Phone,
  GreenBin, WhiteBin, BlackBin, Logo, Pill, CheckIcon,
} from './components';

const big = { fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 0.92, textTransform: 'uppercase' };

// ---------- Escena 6: ejemplos (24 s) ----------
// Un residuo cae dentro de su caneca y aparece el resultado
const Example = ({ Item, B, start, name, label, bin, color }) => {
  const frame = useCurrentFrame();
  const appear = usePop(start);
  const fall = progress(frame, start + 50, start + 85);
  const lid = progress(frame, start + 35, start + 50) - progress(frame, start + 86, start + 100);
  const landed = frame > start + 86;
  const pCard = usePop(start + 90);
  return (
    <div style={{ width: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div style={{ height: 230, transform: `translateY(${fall * 330}px) scale(${appear * (1 - fall * 0.55)})`, opacity: landed ? 0 : 1, zIndex: 2 }}>
        <Item size={200} />
      </div>
      <B size={230} lid={lid} glow={landed ? 0.6 : 0} />
      <div style={{ marginTop: -20, textAlign: 'center', opacity: pCard, transform: `translateY(${(1 - pCard) * 30}px)` }}>
        <div style={{ fontSize: 34, color: C.slate, fontWeight: 500 }}>{name}</div>
        <div style={{ ...big, fontSize: 52, color, marginTop: 8 }}>{label}</div>
        <Pill bg={C.white} style={{ marginTop: 14, fontSize: 26 }}><CheckIcon size={30} /> {bin}</Pill>
      </div>
    </div>
  );
};

export const S6Examples = ({ dur }) => (
  <Scene bg={C.linen} dur={dur}>
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 70 }}>
      <Rise delay={5}><div style={{ ...big, fontSize: 84, color: C.forest, textAlign: 'center' }}>With what you throw away every day</div></Rise>
      <div style={{ display: 'flex', gap: 60, marginTop: 30 }}>
        <Example Item={Banana} B={GreenBin} start={40} name="Banana peel" label="Organic" bin="Green bin" color={C.green} />
        <Example Item={Bottle} B={WhiteBin} start={230} name="Plastic bottle" label="Recyclable" bin="White bin" color={C.blue} />
        <Example Item={Phone} B={BlackBin} start={420} name="Old phone" label="Non-recyclable" bin="Take-back point" color={C.obsidian} />
      </div>
    </AbsoluteFill>
  </Scene>
);

// ---------- Escena 7: cómo funciona por dentro (24 s) ----------
const Node = ({ delay, title, children, accent }) => {
  const p = usePop(delay);
  return (
    <div style={{ width: 280, height: 300, borderRadius: 32, background: accent ? C.lime : C.spruce, padding: 26, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transform: `scale(${p})`, opacity: p }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ? C.forest : '#fff', textAlign: 'center' }}>{title}</div>
    </div>
  );
};
const Arrow = ({ delay }) => {
  const frame = useCurrentFrame();
  const w = progress(frame, delay, delay + 20) * 60;
  return <div style={{ width: 60, display: 'flex', alignItems: 'center' }}><div style={{ width: w, height: 6, background: C.lime, borderRadius: 6 }} /></div>;
};

export const S7UnderTheHood = ({ dur }) => {
  const frame = useCurrentFrame();
  const bars = [0.999, 0.0, 0.001];
  return (
    <Scene bg={C.forest} dur={dur}>
      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 80 }}>
        <Rise delay={5}><div style={{ ...big, fontSize: 110, color: C.lime }}>How does it work?</div></Rise>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 70 }}>
          <Node delay={40} title="Your photo"><Battery size={150} /></Node>
          <Arrow delay={70} />
          <Node delay={85} title="224 × 224 pixels">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 22px)', gap: 4 }}>
              {Array.from({ length: 36 }).map((_, i) => <div key={i} style={{ width: 22, height: 22, borderRadius: 4, background: `hsl(${90 + (i * 37) % 60}, 40%, ${30 + (i * 13) % 40}%)` }} />)}
            </div>
          </Node>
          <Arrow delay={115} />
          <Node delay={130} title="Neural network (transfer learning)">
            <svg width="190" height="150" viewBox="0 0 190 150">
              {[[20, [30, 75, 120]], [95, [15, 55, 95, 135]], [170, [45, 105]]].map(([x, ys], l, arr) => ys.map((y) => (
                <g key={`${x}-${y}`}>
                  {l < 2 && arr[l + 1][1].map((y2) => <line key={y2} x1={x} y1={y} x2={arr[l + 1][0]} y2={y2} stroke={C.lime} strokeOpacity={0.3 + 0.7 * ((Math.sin(frame / 6 + y + y2) + 1) / 2)} strokeWidth="2" />)}
                  <circle cx={x} cy={y} r="10" fill={C.lime} />
                </g>
              )))}
            </svg>
          </Node>
          <Arrow delay={160} />
          <Node delay={175} title="Probabilities">
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['Non-recycl.', 'Organic', 'Recyclable'].map((n, i) => (
                <div key={n}>
                  <div style={{ fontSize: 20, color: '#fff' }}>{n}</div>
                  <div style={{ height: 14, borderRadius: 14, background: 'rgba(255,255,255,0.15)' }}>
                    <div style={{ width: `${progress(frame, 200, 260) * Math.max(bars[i], 0.02) * 100}%`, height: '100%', borderRadius: 14, background: C.lime }} />
                  </div>
                </div>
              ))}
            </div>
          </Node>
          <Arrow delay={270} />
          <Node delay={285} title="Black bin" accent><BlackBin size={120} /></Node>
        </div>
        <div style={{ display: 'flex', gap: 90, marginTop: 80 }}>
          {[
            [39978, 'training images', 0],
            [5, 'public datasets', 0],
            [3, 'categories', 0],
            [20, 'minutes on a GPU', 0],
          ].map(([n, l], i) => (
            <Rise key={l} delay={380 + i * 20}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...big, fontSize: 84, color: '#fff' }}><Counter to={n} start={380 + i * 20} duration={60} /></div>
                <div style={{ fontSize: 28, color: C.linen, marginTop: 8 }}>{l}</div>
              </div>
            </Rise>
          ))}
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

// ---------- Escena 8: resultados (20 s) ----------
const Bar = ({ name, value, delay, best }) => {
  const frame = useCurrentFrame();
  const h = progress(frame, delay, delay + 50) * ((value - 60) / 40) * 520;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 640, width: 150 }}>
      <div style={{ fontSize: 36, fontWeight: 900, color: best ? C.forest : C.charcoal, marginBottom: 10, opacity: progress(frame, delay + 40, delay + 55) }}>{value.toFixed(1)}%</div>
      <div style={{ width: 120, height: h, borderRadius: '18px 18px 0 0', background: best ? C.lime : C.forest, border: best ? `4px solid ${C.forest}` : 'none' }} />
      <div style={{ fontSize: 24, fontWeight: 700, color: C.forest, marginTop: 14, textAlign: 'center', height: 60 }}>{name}</div>
    </div>
  );
};

export const S8Results = ({ dur }) => (
  <Scene bg={C.paper} dur={dur}>
    <AbsoluteFill style={{ padding: '100px 140px', flexDirection: 'row', justifyContent: 'space-between' }}>
      <div style={{ width: 760 }}>
        <Rise delay={5}><div style={{ fontSize: 40, color: C.slate, fontWeight: 500 }}>Tested on 5,997 images it had never seen</div></Rise>
        <div style={{ ...big, fontSize: 260, color: C.forest, marginTop: 20 }}><Counter to={94.5} start={20} duration={70} decimals={1} suffix="%" /></div>
        <Rise delay={60}><div style={{ fontSize: 46, fontWeight: 700, color: C.forest }}>accuracy</div></Rise>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginTop: 60 }}>
          <Rise delay={110}><Pill bg={C.lime}><b>100%</b>&nbsp;of phones</Pill></Rise>
          <Rise delay={130}><Pill><b>94%</b>&nbsp;of batteries</Pill></Rise>
          <Rise delay={150}><Pill><b>93%</b>&nbsp;of face masks</Pill></Rise>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Rise delay={200}><div style={{ fontSize: 40, fontWeight: 900, color: C.forest }}>We compared 4 models</div></Rise>
        <div style={{ display: 'flex', gap: 30, alignItems: 'flex-end' }}>
          <Bar name="CNN from scratch" value={76.6} delay={230} />
          <Bar name="MobileNetV3" value={94.9} delay={250} />
          <Bar name="ResNet-50" value={95.4} delay={270} best />
          <Bar name="EfficientNet-B0" value={94.5} delay={290} />
        </div>
        <Rise delay={380}><Pill bg={C.forest} color={C.lime} style={{ marginTop: 10 }}>Best: ResNet-50</Pill></Rise>
      </div>
    </AbsoluteFill>
  </Scene>
);

// ---------- Escena 9: MCP + Ollama (16 s) ----------
const Bubble = ({ me, delay, children }) => {
  const p = usePop(delay, 16);
  return (
    <div style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: 1000, padding: '24px 32px', borderRadius: 32, background: me ? C.lime : '#24261F', color: me ? C.forest : '#fff', fontSize: 36, lineHeight: 1.35, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>{children}</div>
  );
};

export const S9Mcp = ({ dur }) => {
  const frame = useCurrentFrame();
  const spinning = frame > 120 && frame < 190;
  return (
    <Scene bg={C.obsidian} dur={dur}>
      <AbsoluteFill style={{ padding: '80px 200px' }}>
        <Rise delay={5}><div style={{ ...big, fontSize: 84, color: C.lime }}>Also in your AI assistant</div></Rise>
        <Rise delay={20}><div style={{ fontSize: 34, color: C.linen, marginTop: 14 }}>EcoSort MCP server + Ollama (local model qwen2.5)</div></Rise>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30, marginTop: 60 }}>
          <Bubble me delay={45}><Typewriter text="Where do I throw this? battery.jpg" start={50} speed={1.2} /></Bubble>
          {frame > 110 && (
            <Rise delay={110}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 18, padding: '16px 26px', borderRadius: 18, border: `2px solid ${C.lime}`, color: C.lime, fontSize: 30, fontFamily: 'monospace' }}>
                <div style={{ width: 26, height: 26, borderRadius: 26, border: `4px solid ${C.lime}`, borderTopColor: 'transparent', transform: `rotate(${frame * 12}deg)`, opacity: spinning ? 1 : 0 }} />
                MCP · clasificar_residuo("battery.jpg")  {frame > 190 ? '→ Non-recyclable · 99.9%' : ''}
              </div>
            </Rise>
          )}
          {frame > 210 && (
            <Bubble delay={210}>
              <Typewriter text="It goes in the black bin, but since it's a battery, the best option is a take-back point. Thanks for sorting right!" start={215} speed={1.6} />
            </Bubble>
          )}
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

// ---------- Escena 10: cierre (12 s) ----------
export const S10Closing = ({ dur }) => {
  const frame = useCurrentFrame();
  const fadeBlack = interpolate(frame, [dur - 40, dur - 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Scene bg={C.forest} dur={dur}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Rise delay={5}><div style={{ ...big, fontSize: 130, color: C.lime, textAlign: 'center' }}>Sorting right<br />is easy.</div></Rise>
        <Rise delay={50}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 60 }}>
            <Logo size={90} />
            <div style={{ fontSize: 80, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>EcoSort</div>
          </div>
        </Rise>
        <Rise delay={100}><div style={{ fontSize: 30, color: C.linen, marginTop: 60, textAlign: 'center', lineHeight: 1.5 }}>
          Daniel Felipe Ramírez Murillo · Cristopher Alejandro Santana Lugo · Juan Pablo Prada Chavarro<br />
          Universidad de Ibagué · Intelligent Systems · 2026
        </div></Rise>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: '#000', opacity: fadeBlack }} />
    </Scene>
  );
};
