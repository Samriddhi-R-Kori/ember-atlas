import { useEffect, useRef, useState } from 'react'
import { flameParams, type FlameInputs, type FlameParams } from './flameModel'

// GPU fragment-shader flame. One full-screen triangle; all structure is procedural (value-noise fbm), so no
// imagery is bundled. Shape/colour rules come from flameModel.ts; this file only draws them.
const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`
const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;uniform float uT,uPh,uAdv,uFade;uniform float uBuoy,uForced,uTilt,uElong,uRound,uFlHz,uFlA,uTurb,uSoot,uBlue,uBright,uSize,uRegime;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
vec3 soot(float T){vec3 c=mix(vec3(.45,.05,.01),vec3(1.,.42,.06),smoothstep(.05,.45,T));return mix(c,vec3(1.,.86,.5),smoothstep(.55,.95,T));}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*uRes)/min(uRes.x,uRes.y)*2.;
 float vig=1.-.55*length(uv*vec2(.8,.7));
 vec3 bg=mix(vec3(0.),vec3(.03,.045,.085),clamp(vig,0.,1.));
 float R=(uRegime==1.?.2:.29)*uSize;
 vec2 src=vec2(-.42*sin(uTilt),mix(-.02,-.5,uBuoy)-.12*sin(uTilt)*(1.-uBuoy));
 if(uRegime==1.)src=vec2(0.,mix(-.42,-.62,uBuoy));
 vec2 p=uv-src;
 vec2 ax=vec2(sin(uTilt),cos(uTilt)),pr=vec2(ax.y,-ax.x);
 float x=dot(p,pr),y=dot(p,ax);
 float t=uT;
 float ph=uPh; // flicker phase integrated on the CPU: continuous when the frequency changes
 float el=uElong*(1.+.16*uFlA*sin(ph));
 float yn=y/(R*(y>0.?el:.92));
 // edge wrinkling advected along the flame axis (buoyant rise / forced flow)
 vec2 np=vec2(x*3.2,y*2.4-uAdv); // advection offset integrated on the CPU: no jump when the rise speed changes
 float n=fbm(np)-.5,n2=fbm(np*1.9+3.1)-.5;
 float up=clamp(yn,0.,1.4);
 x+=(n*.75+n2*.35)*uTurb*R*(.25+up*1.3);
 yn+=n2*uTurb*.25*up;
 float neck=1.+uFlA*.22*sin(ph-7.*up)*smoothstep(.0,.9,up);
 float wTip=mix(pow(max(1.-yn,0.),.8)*(1.+.85*yn),sqrt(max(1.-yn*yn,0.)),uRound);
 // radial metric: an exact circle when round, a teardrop when buoyant; symmetric about the source
 float cc=sqrt(max(1.-yn*yn,1e-3));
 float w0=max((yn>=0.?wTip:cc)*neck/cc,.05);
 float d=length(vec2(x/(R*w0),yn))+pow(max(yn-.88,0.),2.)*9.*(1.-.9*uRound);
 vec3 col=vec3(0.);
 if(uRegime<3.5){
  // blue reaction-zone sheet; at the base only when the plume is sooty and buoyant
  float sheet=exp(-pow((d-.93)/.13,2.))*smoothstep(1.35,.6,yn);
  float baseMask=mix(1.,smoothstep(.7,-.25,yn),clamp(uSoot*uBuoy*1.4,0.,1.));
  col+=vec3(.18,.36,1.)*sheet*uBlue*baseMask*1.25;
  // translucent blue body (chemiluminescent interior) and soft halo
  col+=vec3(.08,.18,.7)*smoothstep(1.05,.15,d)*smoothstep(1.2,.3,yn)*.42*uBlue*baseMask;
  col+=mix(vec3(.15,.28,.95),vec3(1.,.48,.12),uSoot)*exp(-max(d-.95,0.)*3.2)*exp(-max(yn-.9,0.)*2.2)*.13;
  col+=vec3(.25,.12,.55)*exp(-pow((d-1.08)/.28,2.))*.22*uBlue*smoothstep(1.4,.4,yn);
  // luminous soot: shell inside the blue envelope in orbit, rising plume region under buoyancy (FLEX p.22)
  float ring=exp(-pow((d-.66)/.2,2.))*smoothstep(1.,.2,abs(yn));
  float plume=smoothstep(-.25,.3,yn)*(1.-smoothstep(.75,1.15,yn))*smoothstep(.98,.4,d);
  float sw=mix(ring,plume,clamp(max(uBuoy,uForced)*1.25,0.,1.));
  float T=clamp(1.-.55*clamp(yn,0.,1.)-.25*d+.15*n,0.,1.);
  col+=soot(T)*sw*uSoot*(1.9+.35*n);
  col+=vec3(1.,.93,.75)*pow(sw,3.)*uSoot*smoothstep(.55,.9,T)*.8;
  // dark fuel-rich core near the source of buoyant sooting flames
  col*=1.-.55*uSoot*uBuoy*exp(-pow(d/.38,2.))*smoothstep(.45,-.1,yn);
 }
 col*=uBright*1.6*uFade;
 float px=2./min(uRes.x,uRes.y);
 // fuel source geometry
 vec2 q=uv-src;
 if(uRegime<.5){float r=length(q);col=mix(col,vec3(.03,.035,.05),smoothstep(.034,.03,r));col+=vec3(.3,.35,.45)*exp(-pow((r-.034)/.004,2.))*.4;}
 else if(uRegime<1.5){float tube=smoothstep(.022+px,.022-px,abs(q.x))*smoothstep(-.005+px,-.005-px,q.y);col=mix(col,vec3(.16,.17,.2),tube);}
 else if(uRegime<2.5||uRegime>3.5){float rod=smoothstep(.022+px,.022-px,abs(q.y))*smoothstep(px,-px,q.x);col=mix(col,vec3(.2,.17,.15),rod*.95);
  if(uRegime>3.5){float glow=exp(-dot(q,q)/.003);col+=vec3(.55,.12,.03)*glow*.6;
   vec2 sp=vec2(q.x*2.-uAdv*.06,q.y*2.6-uAdv*.3);float sm=fbm(sp*2.)*smoothstep(.02,.12,q.y+q.x*.4*uForced)*exp(-length(q)*2.2);
   col+=vec3(.35,.36,.4)*sm*.55;}}
 else {float wick=smoothstep(.006+px,.006-px,abs(q.x))*smoothstep(.03+px,.03-px,q.y)*smoothstep(-.12-px,-.12+px,q.y);col=mix(col,vec3(.08,.07,.07),wick);}
 col=1.-exp(-col*1.35);
 col=pow(col,vec3(.92));
 gl_FragColor=vec4(bg+col+(h21(gl_FragCoord.xy+fract(t))-.5)/255.,1.); // dither against banding
}`

type Uniforms = Record<string, WebGLUniformLocation | null>
const KEYS = ['uRes', 'uT', 'uPh', 'uAdv', 'uFade', 'uBuoy', 'uForced', 'uTilt', 'uElong', 'uRound', 'uFlHz', 'uFlA', 'uTurb', 'uSoot', 'uBlue', 'uBright', 'uSize', 'uRegime']
const NUM: (keyof FlameParams)[] = ['buoyancy', 'forced', 'tilt', 'elongation', 'roundness', 'flickerHz', 'flickerAmp', 'turbulence', 'soot', 'blue', 'brightness', 'size']
const REGIME = { droplet: 0, jet: 1, solid: 2, generic: 3, non_flaming: 4 } as const

function initGL(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false })
  if (!gl) return null
  const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader'); return s }
  const prog = gl.createProgram()!
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link')
  gl.useProgram(prog)
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const u: Uniforms = Object.fromEntries(KEYS.map(k => [k, gl.getUniformLocation(prog, k)]))
  return { gl, u }
}

// Minimal 2D fallback for browsers without WebGL: same parameters, static gradients.
function draw2d(ctx: CanvasRenderingContext2D, W: number, H: number, f: FlameParams) {
  ctx.fillStyle = '#05070b'; ctx.fillRect(0, 0, W, H)
  if (f.regime === 'non_flaming') return
  const s = Math.min(W, H), R = s * 0.12 * f.size, cx = W / 2 - Math.sin(f.tilt) * R, cy = H * (0.5 + 0.2 * f.buoyancy)
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(f.tilt); ctx.globalCompositeOperation = 'lighter'
  const L = R * f.elongation
  const g1 = ctx.createRadialGradient(0, -L * 0.35, 0, 0, -L * 0.35, L)
  g1.addColorStop(0, `rgba(255,${180 + 50 * (1 - f.soot) | 0},90,${0.9 * f.soot})`); g1.addColorStop(1, 'rgba(255,80,10,0)')
  ctx.fillStyle = g1; ctx.beginPath(); ctx.ellipse(0, -L * 0.35, R, L * 0.7, 0, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = `rgba(70,110,255,${0.6 * f.blue})`; ctx.lineWidth = R * 0.12
  ctx.beginPath(); ctx.ellipse(0, -L * 0.3, R * 1.02, L * 0.72, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
}

export default function FlameCanvas(props: FlameInputs) {
  const ref = useRef<HTMLCanvasElement>(null)
  const target = useRef(flameParams(props)); target.current = flameParams(props)
  const [mode, setMode] = useState<'webgl' | '2d'>('webgl')
  useEffect(() => {
    const canvas = ref.current!
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let ctx: ReturnType<typeof initGL> = null
    try { ctx = mode === 'webgl' ? initGL(canvas) : null } catch { ctx = null }
    if (mode === 'webgl' && !ctx) { setMode('2d'); return }
    const c2d = ctx ? null : canvas.getContext('2d')
    const cur: FlameParams = { ...target.current }
    let raf = 0, visible = true, last = performance.now(), clock = 1.3, phase = 0, adv = 0, fade = 1, shown = target.current.regime
    const resize = () => {
      const r = canvas.getBoundingClientRect(); let dpr = Math.min(1.5, window.devicePixelRatio || 1)
      const px = r.width * r.height * dpr * dpr; if (px > 900_000) dpr *= Math.sqrt(900_000 / px)   // cap shaded pixels
      canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr))
      if (ctx) ctx.gl.viewport(0, 0, canvas.width, canvas.height)
      if (reduce) frame(performance.now())
    }
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      if (!reduce) clock += dt
      const tg = target.current; const k = reduce ? 1 : 1 - Math.exp(-dt * 6)   // smooth slider response
      for (const key of NUM) (cur as Record<string, unknown>)[key] = (cur[key] as number) + ((tg[key] as number) - (cur[key] as number)) * k
      // Material/regime change: fade the flame out, switch geometry while invisible, fade back in (no popping).
      if (tg.regime !== shown) { fade = reduce ? 0 : Math.max(0, fade - dt / 0.18); if (fade === 0) shown = tg.regime }
      else fade = reduce ? 1 : Math.min(1, fade + dt / 0.25)
      cur.regime = shown
      if (!reduce) {
        phase = (phase + 2 * Math.PI * cur.flickerHz * dt) % (2 * Math.PI)
        adv = (adv + (0.6 + 2.2 * cur.buoyancy + 1.6 * cur.forced) * dt) % 10000
      }
      if (ctx) {
        const { gl, u } = ctx
        gl.uniform2f(u.uRes, canvas.width, canvas.height); gl.uniform1f(u.uT, clock % 1000); gl.uniform1f(u.uPh, phase); gl.uniform1f(u.uAdv, adv); gl.uniform1f(u.uFade, fade)
        gl.uniform1f(u.uBuoy, cur.buoyancy); gl.uniform1f(u.uForced, cur.forced); gl.uniform1f(u.uTilt, cur.tilt); gl.uniform1f(u.uElong, cur.elongation)
        gl.uniform1f(u.uRound, cur.roundness); gl.uniform1f(u.uFlHz, cur.flickerHz); gl.uniform1f(u.uFlA, cur.flickerAmp); gl.uniform1f(u.uTurb, cur.turbulence)
        gl.uniform1f(u.uSoot, cur.soot); gl.uniform1f(u.uBlue, cur.blue); gl.uniform1f(u.uBright, cur.brightness); gl.uniform1f(u.uSize, cur.size)
        gl.uniform1f(u.uRegime, REGIME[cur.regime]); gl.drawArrays(gl.TRIANGLES, 0, 3)
      } else if (c2d) draw2d(c2d, canvas.width, canvas.height, cur)
    }
    const loop = (now: number) => { if (visible && !document.hidden) frame(now); raf = requestAnimationFrame(loop) }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; ro?.observe(canvas); resize()
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(e => { visible = e[0]?.isIntersecting ?? true }) : null; io?.observe(canvas)
    const lost = (e: Event) => { e.preventDefault(); setMode('2d') }
    canvas.addEventListener('webglcontextlost', lost)
    let poll: ReturnType<typeof setInterval> | undefined
    if (reduce) { frame(performance.now()); poll = setInterval(() => frame(performance.now()), 250) }   // re-render on control changes only
    else raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); if (poll) clearInterval(poll); ro?.disconnect(); io?.disconnect(); canvas.removeEventListener('webglcontextlost', lost) }
  }, [mode])
  return <canvas key={mode} ref={ref} role="img" data-renderer={mode} data-testid="flame-canvas"
    aria-label={`Illustrative flame rendering for the current gravity, airflow, oxygen, pressure and material settings`} />
}
