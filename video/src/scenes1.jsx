// ============================================================
//  Escenas 1 a 5: el problema, la confusión, la llegada de
//  EcoSort y cómo funciona la app.
// ============================================================
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import {
  C, Scene, Rise, Counter, usePop, progress, Battery, Bottle, Banana, Phone, Mask, Cup,
  GreenBin, WhiteBin, BlackBin, Logo, Pill, XIcon, CheckIcon,
} from './components';

const big = { fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 0.92, textTransform: 'uppercase' };

// Signo de pregunta que rebota
const Question = ({ delay = 0, color = C.lime, size = 90 }) => {
  const frame = useCurrentFrame();
  const p = usePop(delay);
  const bob = Math.sin((frame - delay) / 8) * 10;
  return <div style={{ fontSize: size, fontWeight: 900, color, transform: `scale(${p}) translateY(${bob}px)` }}>?</div>;
};

// ---------- Escena 1: "¿Y esto… dónde lo boto?" (14 s) ----------
export const S1Hook = ({ dur }) => {
  const frame = useCurrentFrame();
  const pBat = usePop(70);
  // La pila "duda" moviéndose de una caneca a otra
  const wander = frame > 240 ? Math.sin((frame - 240) / 22) * 480 : 0;
  const binsY = interpolate(frame, [170, 210], [500, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Scene bg={C.forest} dur={dur}>
      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 110 }}>
        <Rise delay={5}><div style={{ fontSize: 46, color: C.linen, fontWeight: 500 }}>You're holding something…</div></Rise>
        <Rise delay={110}><div style={{ ...big, fontSize: 130, color: C.lime, marginTop: 24, textAlign: 'center' }}>So… where does<br />this go?</div></Rise>
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 960 - 90 + wander, top: frame > 240 ? 520 : 470, transform: `scale(${pBat}) rotate(${Math.sin(frame / 6) * 8}deg)` }}>
        <Battery size={180} />
      </div>
      <div style={{ position: 'absolute', bottom: -40, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 220, transform: `translateY(${binsY}px)` }}>
        {[GreenBin, WhiteBin, BlackBin].map((B, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Question delay={230 + i * 12} />
            <B size={190} />
          </div>
        ))}
      </div>
    </Scene>
  );
};

// Caneca con su nombre que sube desde abajo
const BinCard = ({ B, t, s, delay }) => {
  const p = usePop(delay);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `translateY(${(1 - p) * 300}px)`, opacity: p }}>
      <B size={210} />
      <div style={{ fontSize: 44, fontWeight: 900, color: C.forest, marginTop: -30 }}>{t}</div>
      <div style={{ fontSize: 30, color: C.slate, marginTop: 6 }}>{s}</div>
    </div>
  );
};

// Residuo flotando con un signo de pregunta debajo
const FloatItem = ({ Item, i }) => {
  const frame = useCurrentFrame();
  const p = usePop(30 + i * 15);
  const x = 200 + i * 270, y = 290 + Math.sin(frame / 15 + i) * 18;   // fila centrada en la pantalla
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `scale(${p})`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Item size={170} />
      <div style={{ fontSize: 56, fontWeight: 900, color: C.slate }}>?</div>
    </div>
  );
};

// ---------- Escena 2: el problema global y las tres canecas (24 s) ----------
export const S2Problem = ({ dur }) => {
  const frame = useCurrentFrame();
  const partA = frame < 330;
  const fadeA = interpolate(frame, [300, 330], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Scene bg={C.paper} dur={dur}>
      {partA && (
        <AbsoluteFill style={{ padding: 140, justifyContent: 'center', opacity: fadeA }}>
          <Rise delay={5}><div style={{ fontSize: 40, color: C.slate, fontWeight: 500 }}>Every year, the world generates</div></Rise>
          <div style={{ ...big, fontSize: 210, color: C.forest, marginTop: 10 }}>
            <Counter to={2.01} start={15} duration={80} decimals={2} /> <span style={{ fontSize: 90 }}>billion</span>
          </div>
          <Rise delay={40}><div style={{ fontSize: 52, color: C.forest, fontWeight: 700, marginTop: 10 }}>tonnes of waste.</div></Rise>
          <Rise delay={150}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginTop: 70 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 120, height: 120, borderRadius: 24, background: i === 2 ? C.red : C.fog, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {i === 2 ? <XIcon size={70} color="#fff" /> : <CheckIcon size={70} color={C.forest} />}
                </div>
              ))}
              <div style={{ fontSize: 48, color: C.charcoal, fontWeight: 500, maxWidth: 900 }}>
                <b style={{ color: C.red }}>1 in 3</b> tonnes is not managed safely.
              </div>
            </div>
          </Rise>
          <Rise delay={190}><div style={{ fontSize: 26, color: C.slate, marginTop: 40 }}>Source: World Bank, What a Waste 2.0</div></Rise>
        </AbsoluteFill>
      )}
      {!partA && (
        <AbsoluteFill style={{ alignItems: 'center', paddingTop: 100 }}>
          <Rise delay={335}><div style={{ fontSize: 44, color: C.slate, fontWeight: 500 }}>Since 2021, Colombia sorts waste into</div></Rise>
          <Rise delay={350}><div style={{ ...big, fontSize: 140, color: C.forest, marginTop: 14 }}>3 bins</div></Rise>
          <div style={{ display: 'flex', gap: 120, marginTop: 70 }}>
            {[
              { B: GreenBin, t: 'Organic', s: 'food scraps, peels' },
              { B: WhiteBin, t: 'Recyclable', s: 'plastic, glass, paper' },
              { B: BlackBin, t: 'Non-recyclable', s: 'napkins, face masks' },
            ].map(({ B, t, s }, i) => <BinCard key={t} B={B} t={t} s={s} delay={400 + i * 25} />)}
          </div>
          <Rise delay={520}><div style={{ fontSize: 26, color: C.slate, marginTop: 40 }}>Resolution 2184 of 2019</div></Rise>
        </AbsoluteFill>
      )}
    </Scene>
  );
};

// ---------- Escena 3: la confusión y el error que contamina (20 s) ----------
export const S3Confusion = ({ dur }) => {
  const frame = useCurrentFrame();
  const items = [Battery, Mask, Cup, Phone, Banana, Bottle];
  // La pila viaja en arco hasta la caneca blanca (error)
  const t = progress(frame, 300, 370);
  const batX = interpolate(t, [0, 1], [285, 960]);
  const batY = interpolate(t, [0, 1], [330, 760]) - Math.sin(t * Math.PI) * 220;
  const wrong = frame > 370;
  const shake = wrong && frame < 420 ? Math.sin(frame * 2.2) * 12 : 0;
  return (
    <Scene bg={C.fog} dur={dur}>
      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 70 }}>
        <Rise delay={5}><div style={{ ...big, fontSize: 96, color: C.forest }}>Where does each one go?</div></Rise>
      </AbsoluteFill>
      {items.map((Item, i) => (i === 0 && frame > 300 ? null : <FloatItem key={i} Item={Item} i={i} />))}
      {frame > 300 && frame < 372 && (
        // La pila desaparece al entrar en la caneca
        <div style={{ position: 'absolute', left: batX - 75, top: batY - 75, transform: `rotate(${t * 360}deg) scale(${1 - t * 0.4})` }}><Battery size={150} /></div>
      )}
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 200 }}>
        <GreenBin size={170} />
        <div style={{ transform: `translateX(${shake}px)` }}>
          <WhiteBin size={170} lid={progress(frame, 280, 300) - progress(frame, 372, 385)} tint={wrong ? '#F6C9CB' : undefined} glow={wrong ? 1 : 0} />
        </div>
        <BlackBin size={170} />
      </div>
      {wrong && (
        <div style={{ position: 'absolute', top: 560, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <Rise delay={380}>
            <Pill bg={C.red} color="#fff" style={{ fontSize: 40, padding: '20px 40px' }}><XIcon size={44} color="#fff" /> A battery in the white bin contaminates the recycling</Pill>
          </Rise>
        </div>
      )}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 190 }}>
        <Rise delay={470}><div style={{ fontSize: 40, color: C.charcoal, fontWeight: 500, background: C.paper, padding: '10px 26px', borderRadius: 16 }}>And it happens every day, in millions of homes.</div></Rise>
      </AbsoluteFill>
    </Scene>
  );
};

// ---------- Escena 4: llega EcoSort (14 s) ----------
export const S4Hero = ({ dur }) => {
  const frame = useCurrentFrame();
  const burst = interpolate(frame, [0, 40], [0, 2600], { extrapolateRight: 'clamp' });
  const pLogo = usePop(30, 10);
  const word = 'EcoSort';
  return (
    <Scene bg={C.forest} dur={dur}>
      <div style={{ position: 'absolute', left: 960 - burst / 2, top: 540 - burst / 2, width: burst, height: burst, borderRadius: '50%', background: C.spruce, opacity: interpolate(frame, [0, 60], [1, 0.35], { extrapolateRight: 'clamp' }) }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 40, color: C.linen, fontWeight: 500, opacity: progress(frame, 10, 30), marginBottom: 30 }}>Until now…</div>
        <div style={{ transform: `scale(${pLogo}) rotate(${(1 - pLogo) * -90}deg)` }}><Logo size={190} /></div>
        <div style={{ ...big, fontSize: 210, color: C.lime, marginTop: 40, display: 'flex' }}>
          {word.split('').map((ch, i) => {
            const p = usePop(60 + i * 5, 14);
            return <span key={i} style={{ display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * 80}px)` }}>{ch}</span>;
          })}
        </div>
        <Rise delay={130}><div style={{ fontSize: 52, color: '#fff', fontWeight: 500, marginTop: 20 }}>Sort your waste in one click.</div></Rise>
        <Rise delay={200}>
          <div style={{ display: 'flex', gap: 24, marginTop: 50 }}>
            <Pill bg={C.lime}>Artificial intelligence</Pill>
            <Pill bg={C.spruce} color={C.lime}>Just one photo</Pill>
            <Pill bg={C.spruce} color={C.lime}>Free, on the web</Pill>
          </div>
        </Rise>
      </AbsoluteFill>
    </Scene>
  );
};

// ---------- Escena 5: cómo funciona (30 s) ----------
const PhoneFrame = ({ children }) => (
  <div style={{ width: 470, height: 900, borderRadius: 64, background: C.obsidian, padding: 18, boxShadow: '0 40px 80px rgba(0,0,0,0.25)' }}>
    <div style={{ width: '100%', height: '100%', borderRadius: 48, background: C.paper, overflow: 'hidden', position: 'relative' }}>{children}</div>
  </div>
);

export const S5HowItWorks = ({ dur }) => {
  const frame = useCurrentFrame();
  const step = frame < 200 ? 0 : frame < 420 ? 1 : 2;
  const steps = ['Take a photo of the item', 'Artificial intelligence analyzes it', 'It tells you the right bin'];
  const flash = interpolate(frame, [150, 158, 175], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scan = ((frame - 200) % 70) / 70;
  const conf = progress(frame, 470, 560) * 99.9;
  return (
    <Scene bg={C.paper} dur={dur}>
      <AbsoluteFill style={{ padding: '120px 140px', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 900 }}>
          <Rise delay={5}><div style={{ ...big, fontSize: 100, color: C.forest }}>It's that easy</div></Rise>
          <div style={{ marginTop: 60, display: 'flex', flexDirection: 'column', gap: 30 }}>
            {steps.map((s, i) => {
              const active = step === i;
              const p = usePop(30 + i * 20);
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 30, opacity: p * (active ? 1 : 0.45), transform: `translateX(${(1 - p) * -60}px)` }}>
                  <div style={{ width: 96, height: 96, borderRadius: 96, background: active ? C.lime : C.fog, color: C.forest, fontSize: 48, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                  <div style={{ fontSize: 50, fontWeight: active ? 900 : 500, color: C.forest }}>{s}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ transform: `translateY(${(1 - usePop(20)) * 600}px)` }}>
          <PhoneFrame>
            {step === 0 && (
              <AbsoluteFill style={{ background: '#C9CEC4', alignItems: 'center', justifyContent: 'center' }}>
                <Battery size={300} />
                {[[40, 40, 0], [390, 40, 90], [390, 800, 180], [40, 800, 270]].map(([x, y, r], i) => (
                  <div key={i} style={{ position: 'absolute', left: x - 20, top: y - 20, width: 70, height: 70, borderTop: '8px solid #fff', borderLeft: '8px solid #fff', transform: `rotate(${r}deg)` }} />
                ))}
                <div style={{ position: 'absolute', bottom: 60, width: 110, height: 110, borderRadius: 110, border: '10px solid #fff', background: frame > 140 && frame < 160 ? C.lime : 'transparent' }} />
                <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: flash }} />
              </AbsoluteFill>
            )}
            {step === 1 && (
              <AbsoluteFill style={{ padding: 40, alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '100%', height: 340, borderRadius: 28, background: '#C9CEC4', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <Battery size={220} />
                  <div style={{ position: 'absolute', left: 0, right: 0, top: scan * 340, height: 6, background: C.lime, boxShadow: `0 0 30px ${C.lime}` }} />
                </div>
                {[0.9, 0.7, 0.8].map((w, i) => (
                  <div key={i} style={{ width: `${w * 100}%`, height: 34, borderRadius: 12, background: C.fog, marginTop: 40, opacity: 0.5 + 0.5 * Math.sin((frame + i * 10) / 8) }} />
                ))}
                <div style={{ marginTop: 50, fontSize: 32, color: C.slate, fontWeight: 500 }}>Analyzing the image…</div>
              </AbsoluteFill>
            )}
            {step === 2 && (
              <AbsoluteFill style={{ padding: 40 }}>
                <Rise delay={425}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                    <div style={{ width: 96, height: 96, borderRadius: 96, background: C.obsidian, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 22, color: C.slate, fontWeight: 700, letterSpacing: 3 }}>RESULT</div>
                      <div style={{ ...big, fontSize: 42, color: C.obsidian }}>Non-recyclable</div>
                    </div>
                  </div>
                </Rise>
                <Rise delay={445}><div style={{ marginTop: 34, background: C.fog, borderRadius: 18, padding: 22, fontSize: 28, color: C.charcoal }}>Black bin. If it's a battery or a phone, take it to a <b>take-back point</b>.</div></Rise>
                <Rise delay={465}>
                  <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', fontSize: 28, color: C.forest }}>
                    <span>Model confidence</span><b>{conf.toFixed(1)}%</b>
                  </div>
                  <div style={{ position: 'relative', height: 22, borderRadius: 22, background: C.fog, marginTop: 12 }}>
                    <div style={{ width: `${conf}%`, height: '100%', borderRadius: 22, background: C.forest }} />
                    <div style={{ position: 'absolute', left: '61%', top: -8, width: 4, height: 38, background: C.red }} />
                  </div>
                  <div style={{ fontSize: 22, color: C.slate, marginTop: 10 }}>Above the safety threshold (61%)</div>
                </Rise>
                <Rise delay={560}>
                  <div style={{ marginTop: 50, display: 'flex', justifyContent: 'center' }}><BlackBin size={170} lid={progress(frame, 600, 640)} /></div>
                </Rise>
              </AbsoluteFill>
            )}
          </PhoneFrame>
        </div>
      </AbsoluteFill>
    </Scene>
  );
};
