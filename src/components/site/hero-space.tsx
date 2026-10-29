// @ts-nocheck
'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * WebGL particle field that lives through the WHOLE landing page.
 * Every chapter is an ORDERED, architectural formation — rings, lattices,
 * latitudes, spiral arms — so the cloud reads as designed structure, not
 * noise. Each landing chapter dispatches its index; the cloud glides
 * slowly into that chapter's signature formation (event-driven, never
 * scroll-jumpy).
 *
 *   01 hero         → concentric rings  (warm center → amber edges)
 *   02 product      → twin orbit rings  (dual-tone)
 *   03 features     → double helix      (vertical gradient)
 *   04 how-it-works → sine-wave lattice (height-mapped colour)
 *   05 pricing      → latitude sphere   (equator bloom)
 *   06 testimonials → twin rings        (warm ↔ cool)
 *   07 faq          → calm lattice      (breathing monochrome)
 *   08 blog/cta     → spiral galaxy     (core bright → arms dim)
 *   09 cta          → triple funnel     (suction glow)
 */

/* deterministic PRNG so the cloud is identical on every load */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gauss(rand: () => number) {
  return (rand() + rand() + rand() - 1.5) * 0.8
}

/* hex → [r,g,b] 0..1 */
const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export function HeroSpace() {
  const holderRef = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(pointer: fine)').matches) return
    setOn(true)
  }, [])

  useEffect(() => {
    if (!on) return
    const holder = holderRef.current
    if (!holder) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 80)
    camera.position.z = 14

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(window.innerWidth, window.innerHeight)
    holder.appendChild(renderer.domElement)

    /* ================================================================
       ordered formations — position + per-particle colour + size
       ================================================================ */
    const COUNT = 2200
    const TAU = Math.PI * 2
    const jit = (i: number, amp: number) => (frac(i * 0.6180339887) - 0.5) * 2 * amp
    function frac(x: number) {
      return x - Math.floor(x)
    }

    const F: Float32Array[] = []   // positions
    const FC: Float32Array[] = []  // colours (RGB)
    const FS: Float32Array[] = []  // size multipliers

    const put = (a: Float32Array, i: number, x: number, y: number, z: number, j = 0.14) => {
      a[i * 3] = x + jit(i * 3 + 1, j)
      a[i * 3 + 1] = y + jit(i * 3 + 2, j)
      a[i * 3 + 2] = z + jit(i * 3 + 3, j)
    }
    const putCol = (a: Float32Array, i: number, r: number, g: number, b: number) => {
      a[i * 3] = r
      a[i * 3 + 1] = g
      a[i * 3 + 2] = b
    }
    const lerp3 = (out: Float32Array, i: number, a: number[], b: number[], t: number) => {
      out[i * 3] = a[0] + (b[0] - a[0]) * t
      out[i * 3 + 1] = a[1] + (b[1] - a[1]) * t
      out[i * 3 + 2] = a[2] + (b[2] - a[2]) * t
    }

    const C = {
      warm1: hex('#c9b79c'), warm2: hex('#d3c2a4'), warm3: hex('#dcc9a8'),
      warm4: hex('#cfc0a2'), warm5: hex('#c2b394'), warm6: hex('#d9c9ab'),
      warm7: hex('#a89a80'), warm8: hex('#f0e6d2'), warm9: hex('#e8d5b5'),
      cool1: hex('#8a7d65'), cool2: hex('#b8a68a'),
    }

    const rand = mulberry32(20261023)

    // 01 — concentric rings (hero)  → warm centre → amber edges
    {
      const a = new Float32Array(COUNT * 3)
      const c = new Float32Array(COUNT * 3)
      const s = new Float32Array(COUNT)
      const radii = [4.5, 7, 9.5, 12, 14.5]
      const sum = radii.reduce((acc, r) => acc + r, 0)
      let i = 0
      radii.forEach((R, ring) => {
        const cnt = Math.floor((R / sum) * COUNT)
        const t = ring / (radii.length - 1) // 0..1 inner→outer
        for (let j = 0; j < cnt && i < COUNT; j++, i++) {
          const ang = (j / cnt) * TAU + ring * 0.5
          put(a, i, Math.cos(ang) * R, ring * 0.45 - 0.9, Math.sin(ang) * R, 0.16)
          lerp3(c, i, C.warm8, C.warm9, t)
          s[i] = 0.85 + t * 0.35 // outer rings bigger
        }
      })
      while (i < COUNT) {
        const ang = (i / COUNT) * TAU
        put(a, i, Math.cos(ang) * radii[0], -0.9, Math.sin(ang) * radii[0], 0.16)
        putCol(c, i, ...C.warm8)
        s[i] = 0.85
        i++
      }
      F.push(a); FC.push(c); FS.push(s)
    }
    // 02 — twin orbit rings  → dual-tone warm / cool
    {
      const a = new Float32Array(COUNT * 3)
      const c = new Float32Array(COUNT * 3)
      const s = new Float32Array(COUNT)
      for (let i = 0; i < COUNT; i++) {
        const half = i % 2
        const R = half ? 11.8 : 9.4
        const ang = (i / COUNT) * TAU + half * (Math.PI / 2)
        put(a, i, Math.cos(ang) * R, half ? 0.5 : -0.5, Math.sin(ang) * R, 0.12)
        putCol(c, i, ...(half ? C.cool2 : C.warm2))
        s[i] = half ? 1.15 : 0.95
      }
      F.push(a); FC.push(c); FS.push(s)
    }
    // 03 — double helix  → bottom warm → top cool
    {
      const a = new Float32Array(COUNT * 3)
      const c = new Float32Array(COUNT * 3)
      const s = new Float32Array(COUNT)
      const TURNS = 3
      for (let i = 0; i < COUNT; i++) {
        const bucket = i % 10
        if (bucket < 5) {
          const u = frac(i * 0.7919)
          const t = u * TURNS * TAU
          put(a, i, Math.cos(t) * 6.5, (u - 0.5) * 15, Math.sin(t) * 6.5, 0.1)
          lerp3(c, i, C.warm3, C.warm7, u)
          s[i] = 1.0
        } else if (bucket < 9) {
          const u = frac(i * 0.7919 + 0.5)
          const t = u * TURNS * TAU
          put(a, i, Math.cos(t + Math.PI) * 6.5, (u - 0.5) * 15, Math.sin(t + Math.PI) * 6.5, 0.1)
          lerp3(c, i, C.warm3, C.warm7, u)
          s[i] = 1.0
        } else {
          const steps = 22
          const k = Math.floor(frac(i * 0.3557) * steps)
          const u = k / steps
          const t = u * TURNS * TAU
          const p = frac(i * 0.618)
          const ax = Math.cos(t) * 6.5, az = Math.sin(t) * 6.5
          const bx = Math.cos(t + Math.PI) * 6.5, bz = Math.sin(t + Math.PI) * 6.5
          put(a, i, ax + (bx - ax) * p, (u - 0.5) * 15, az + (bz - az) * p, 0.06)
          lerp3(c, i, C.warm3, C.warm7, u)
          s[i] = 0.65
        }
      }
      F.push(a); FC.push(c); FS.push(s)
    }
    // 04 — sine-wave lattice  → height-mapped colour
    {
      const a = new Float32Array(COUNT * 3)
      const c = new Float32Array(COUNT * 3)
      const s = new Float32Array(COUNT)
      const cols = 50
      const rows = Math.ceil(COUNT / cols)
      for (let i = 0; i < COUNT; i++) {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = (col - (cols - 1) / 2) * 0.56
        const z = (row - (rows - 1) / 2) * 0.56
        const h = Math.sin(x * 0.5) * Math.cos(z * 0.42) * 1.6
        put(a, i, x, h, z, 0.05)
        const t = (h + 1.6) / 3.2 // normalise -1.6..1.6 → 0..1
        lerp3(c, i, C.cool1, C.warm4, t)
        s[i] = 0.75 + t * 0.45
      }
      F.push(a); FC.push(c); FS.push(s)
    }
    // 05 — latitude sphere  → equator bloom
    {
      const a = new Float32Array(COUNT * 3)
      const c = new Float32Array(COUNT * 3)
      const s = new Float32Array(COUNT)
      const R = 9.5
      const lats = 15
      let i = 0
      for (let l = 0; l < lats; l++) {
        const lat = (-60 + (120 * l) / (lats - 1)) * (Math.PI / 180)
        const ringR = R * Math.cos(lat)
        const y = R * Math.sin(lat)
        const cnt = Math.max(8, Math.floor(Math.cos(lat) * (COUNT / lats) * 1.9))
        const t = 1 - Math.abs(y / R) // 0 at poles, 1 at equator
        for (let j = 0; j < cnt && i < COUNT; j++, i++) {
          const ang = (j / cnt) * TAU + l * 0.35
          put(a, i, Math.cos(ang) * ringR, y, Math.sin(ang) * ringR, 0.12)
          lerp3(c, i, C.warm9, C.warm5, t)
          s[i] = 0.8 + t * 0.4
        }
      }
      while (i < COUNT) {
        put(a, i, Math.cos(i) * R * 0.35, R * 0.95, Math.sin(i) * R * 0.35, 0.12)
        putCol(c, i, ...C.warm9)
        s[i] = 1.0
        i++
      }
      F.push(a); FC.push(c); FS.push(s)
    }
    // 06 — twin vertical rings  → warm left / cool right
    {
      const a = new Float32Array(COUNT * 3)
      const c = new Float32Array(COUNT * 3)
      const s = new Float32Array(COUNT)
      for (let i = 0; i < COUNT; i++) {
        const side = i % 2 ? 1 : -1
        const ang = (i / COUNT) * TAU
        put(a, i, side * 6.2, Math.cos(ang) * 5.6, Math.sin(ang) * 5.6, 0.12)
        putCol(c, i, ...(side > 0 ? C.warm6 : C.warm7))
        s[i] = 1.0
      }
      F.push(a); FC.push(c); FS.push(s)
    }
    // 07 — calm lattice plane  → breathing monochrome
    {
      const a = new Float32Array(COUNT * 3)
      const c = new Float32Array(COUNT * 3)
      const s = new Float32Array(COUNT)
      const cols = 44
      const rows = 50
      for (let i = 0; i < COUNT; i++) {
        const col = i % cols
        const row = Math.floor(i / cols)
        put(a, i, (col - (cols - 1) / 2) * 0.88, 0, (row - (rows - 1) / 2) * 0.88, 0.05)
        const d = Math.sqrt(col * col + row * row) / Math.sqrt(cols * cols + rows * rows)
        lerp3(c, i, C.warm7, C.warm4, d)
        s[i] = 0.9 + d * 0.2
      }
      F.push(a); FC.push(c); FS.push(s)
    }
    // 08 — spiral galaxy  → core bright → arms dim
    {
      const a = new Float32Array(COUNT * 3)
      const c = new Float32Array(COUNT * 3)
      const s = new Float32Array(COUNT)
      const arms = 2
      const per = Math.floor(COUNT / arms)
      for (let i = 0; i < COUNT; i++) {
        const arm = i % arms
        const u = Math.floor(i / arms) / per
        const turns = 2.6
        const ang = u * turns * TAU + (arm * TAU) / arms
        const r = 1.2 + u * 11
        put(a, i, Math.cos(ang) * r, gauss(rand) * (1.6 - u), Math.sin(ang) * r, 0.08)
        lerp3(c, i, C.warm8, C.warm4, 1 - u)
        s[i] = 1.1 - u * 0.45
      }
      F.push(a); FC.push(c); FS.push(s)
    }
    // 09 — triple-spiral funnel  → centre glow
    {
      const a = new Float32Array(COUNT * 3)
      const c = new Float32Array(COUNT * 3)
      const s = new Float32Array(COUNT)
      const per = Math.floor(COUNT / 3)
      for (let i = 0; i < COUNT; i++) {
        const arm = i % 3
        const u = Math.floor(i / 3) / per
        const turns = 4.5
        const ang = u * turns * TAU + (arm * TAU) / 3
        const r = 1.6 + u * 13
        put(a, i, Math.cos(ang) * r, 1.2 - u * 3.2, Math.sin(ang) * r, 0.1)
        lerp3(c, i, C.warm8, C.cool1, u)
        s[i] = 1.15 - u * 0.5
      }
      F.push(a); FC.push(c); FS.push(s)
    }

    const CHAPTER_OPACITY = [0.8, 0.45, 0.4, 0.45, 0.38, 0.45, 0.35, 0.5, 0.85]
    const CHAPTER_COLOR = [
      new THREE.Color('#c9b79c'), new THREE.Color('#d3c2a4'), new THREE.Color('#dcc9a8'),
      new THREE.Color('#cfc0a2'), new THREE.Color('#c2b394'), new THREE.Color('#d9c9ab'),
      new THREE.Color('#a89a80'), new THREE.Color('#cfc0a2'), new THREE.Color('#f0e6d2'),
    ]

    /* ================================================================
       geometry — main cloud with vertex colours & sizes
       ================================================================ */
    const positions = new Float32Array(F[0])
    const colours = new Float32Array(FC[0])
    const sizes = new Float32Array(FS[0])

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colours, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: CHAPTER_OPACITY[0] },
        // 0 = dark theme (additive glow), 1 = light theme (solid, darker)
        uLight: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * 0.045 * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform float uLight;
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.15, d) * uOpacity;
          // in light mode the additive glow disappears on cream, so we
          // darken the particle colour and raise its alpha instead
          vec3 c = mix(vColor, vColor * 0.38, uLight);
          gl_FragColor = vec4(c, a * (1.0 + uLight * 0.45));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    })
    const points = new THREE.Points(geo, mat)
    scene.add(points)

    /* ================================================================
       ghost layer — trails behind the main cloud (slower blend)
       ================================================================ */
    const ghostPositions = new Float32Array(F[0])
    const ghostGeo = new THREE.BufferGeometry()
    ghostGeo.setAttribute('position', new THREE.BufferAttribute(ghostPositions, 3))
    const ghostMat = new THREE.PointsMaterial({
      color: new THREE.Color('#e8d5b5'),
      size: 0.025,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
    const ghost = new THREE.Points(ghostGeo, ghostMat)
    scene.add(ghost)

    /* ================================================================
       sacred-geometry wireframe — persistent icosahedron cage
       ================================================================ */
    const wireGeo = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(8.5, 1))
    const wireMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#c9b79c'),
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
    })
    const wireframe = new THREE.LineSegments(wireGeo, wireMat)
    scene.add(wireframe)

    // warm-white dust layer for depth
    const COUNT2 = 420
    const pos2 = new Float32Array(COUNT2 * 3)
    for (let i = 0; i < COUNT2 * 3; i++) pos2[i] = frac(i * 0.7548776662) * 48 - 24
    const geo2 = new THREE.BufferGeometry()
    geo2.setAttribute('position', new THREE.BufferAttribute(pos2, 3))
    const mat2 = new THREE.PointsMaterial({
      color: new THREE.Color('#f7f5f0'),
      size: 0.03,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const dust = new THREE.Points(geo2, mat2)
    scene.add(dust)

    /* ================================================================
       interaction + chapter-driven morph
       ================================================================ */
    let px = 0, py = 0, spx = 0, spy = 0
    let chapter = 0
    let blend = 0
    let ghostBlend = 0
    let visible = true
    let raf = 0

    const onChapter = (e: Event) => {
      const i = (e as CustomEvent<number>).detail
      if (typeof i === 'number' && i >= 0 && i < F.length) chapter = i
    }
    window.addEventListener('nexora:chapter', onChapter)
    const onMouse = (e: MouseEvent) => {
      px = (e.clientX / window.innerWidth) * 2 - 1
      py = (e.clientY / window.innerHeight) * 2 - 1
    }
    const onVis = () => { visible = !document.hidden }
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('mousemove', onMouse, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('resize', onResize)
    const clock = new THREE.Clock()
    const tmp = new THREE.Color()

    /* ---- theme-aware rendering -------------------------------------
       AdditiveBlending reads as light-on-dark; on a cream background it
       washes out completely. In light mode we switch every layer to
       normal blending and darken the palette so the same formations
       stay visible without touching any geometry. */
    let isLight = document.documentElement.classList.contains('light')

    const applyThemeToScene = (light: boolean) => {
      mat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending
      mat.uniforms.uLight.value = light ? 1 : 0
      mat.needsUpdate = true

      ghostMat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending
      ghostMat.color.set(light ? '#9c8a70' : '#e8d5b5')
      ghostMat.needsUpdate = true

      wireMat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending
      wireMat.color.set(light ? '#a6946f' : '#c9b79c')
      wireMat.needsUpdate = true

      mat2.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending
      mat2.color.set(light ? '#8a7d65' : '#f7f5f0')
      mat2.needsUpdate = true
    }

    applyThemeToScene(isLight)

    const themeObserver = new MutationObserver(() => {
      const light = document.documentElement.classList.contains('light')
      if (light !== isLight) {
        isLight = light
        applyThemeToScene(light)
      }
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!visible) return

      const t = clock.getElapsedTime()
      spx += (px - spx) * 0.04
      spy += (py - spy) * 0.04

      // main cloud glides toward active chapter
      blend += (chapter - blend) * 0.011
      // ghost trails behind (~3× slower)
      ghostBlend += (blend - ghostBlend) * 0.004

      const s = blend
      const i0 = Math.min(F.length - 1, Math.floor(s))
      const i1 = Math.min(F.length - 1, i0 + 1)
      const raw = Math.min(1, Math.max(0, s - i0))
      const f = raw * raw * (3 - 2 * raw)

      // lerp positions, colours, sizes
      const A = F[i0], B = F[i1]
      const AC = FC[i0], BC = FC[i1]
      const AS = FS[i0], BS = FS[i1]
      for (let i = 0; i < COUNT; i++) {
        const fi = f
        positions[i * 3] = A[i * 3] + (B[i * 3] - A[i * 3]) * fi
        positions[i * 3 + 1] = A[i * 3 + 1] + (B[i * 3 + 1] - A[i * 3 + 1]) * fi
        positions[i * 3 + 2] = A[i * 3 + 2] + (B[i * 3 + 2] - A[i * 3 + 2]) * fi

        colours[i * 3] = AC[i * 3] + (BC[i * 3] - AC[i * 3]) * fi
        colours[i * 3 + 1] = AC[i * 3 + 1] + (BC[i * 3 + 1] - AC[i * 3 + 1]) * fi
        colours[i * 3 + 2] = AC[i * 3 + 2] + (BC[i * 3 + 2] - AC[i * 3 + 2]) * fi

        sizes[i] = AS[i] + (BS[i] - AS[i]) * fi
      }
      geo.attributes.position.needsUpdate = true
      geo.attributes.color.needsUpdate = true
      geo.attributes.size.needsUpdate = true

      // ghost positions (follow main blend with lag)
      const gs = ghostBlend
      const gi0 = Math.min(F.length - 1, Math.floor(gs))
      const gi1 = Math.min(F.length - 1, gi0 + 1)
      const graw = Math.min(1, Math.max(0, gs - gi0))
      const gf = graw * graw * (3 - 2 * graw)
      const GA = F[gi0], GB = F[gi1]
      for (let i = 0; i < COUNT; i++) {
        ghostPositions[i * 3] = GA[i * 3] + (GB[i * 3] - GA[i * 3]) * gf
        ghostPositions[i * 3 + 1] = GA[i * 3 + 1] + (GB[i * 3 + 1] - GA[i * 3 + 1]) * gf
        ghostPositions[i * 3 + 2] = GA[i * 3 + 2] + (GB[i * 3 + 2] - GA[i * 3 + 2]) * gf
      }
      ghostGeo.attributes.position.needsUpdate = true

      const op = CHAPTER_OPACITY[i0] + (CHAPTER_OPACITY[i1] - CHAPTER_OPACITY[i0]) * f
      mat.uniforms.uOpacity.value = op

      // formation-specific sway speeds (each chapter has its own rhythm)
      const swaySpeeds = [0.05, 0.04, 0.035, 0.03, 0.025, 0.035, 0.02, 0.03, 0.04]
      const swayAmp = [0.18, 0.14, 0.12, 0.10, 0.09, 0.13, 0.08, 0.11, 0.15]
      const ss = swaySpeeds[i0] + (swaySpeeds[i1] - swaySpeeds[i0]) * f
      const sa = swayAmp[i0] + (swayAmp[i1] - swayAmp[i0]) * f

      points.rotation.y = Math.sin(t * ss) * sa + spx * 0.08
      points.rotation.x = Math.sin(t * ss * 0.8 + Math.PI / 2) * sa * 0.25 + spy * 0.055
      dust.rotation.y = Math.sin(t * ss + Math.PI) * sa * 1.4 + spx * 0.04

      ghost.rotation.y = points.rotation.y * 0.92
      ghost.rotation.x = points.rotation.x * 0.92
      ghostMat.opacity = (0.12 + 0.08 * op) * (1 + Math.sin(t * 0.18) * 0.08)

      // wireframe: slow independent rotation + chapter-matched pulse
      wireframe.rotation.y = t * 0.015 + blend * 0.4
      wireframe.rotation.x = Math.sin(t * 0.012) * 0.08
      const wireOpBase = [0.08, 0.05, 0.04, 0.03, 0.06, 0.04, 0.025, 0.04, 0.09]
      const wob = wireOpBase[i0] + (wireOpBase[i1] - wireOpBase[i0]) * f
      wireMat.opacity = wob * (1 + Math.sin(t * 0.25) * 0.2)
      const wireScale = 0.92 + Math.sin(t * 0.08) * 0.04 + f * 0.02
      wireframe.scale.set(wireScale, wireScale, wireScale)

      mat2.opacity = (0.18 + 0.16 * op) * (1 + Math.sin(t * 0.22) * 0.06)

      camera.position.y = -blend * 0.5
      camera.position.z = 14 + Math.sin(t * 0.03) * 0.35
      camera.lookAt(0, camera.position.y, 0)

      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(loop)

    if (process.env.NODE_ENV !== 'production') {
      ;(window as any).__heroSpace = {
        getOpacity: () => mat.uniforms.uOpacity.value,
        getBlend: () => +blend.toFixed(2),
        getSample: () => [0, 1, 2, 3, 4].map((i) => [Math.round(positions[i * 3] * 100) / 100, Math.round(positions[i * 3 + 1] * 100) / 100]),
      }
    }

    return () => {
      cancelAnimationFrame(raf)
      themeObserver.disconnect()
      window.removeEventListener('nexora:chapter', onChapter)
      window.removeEventListener('mousemove', onMouse)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('resize', onResize)
      geo.dispose()
      geo2.dispose()
      ghostGeo.dispose()
      wireGeo.dispose()
      mat.dispose()
      mat2.dispose()
      ghostMat.dispose()
      wireMat.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === holder) holder.removeChild(renderer.domElement)
    }
  }, [on])

  if (!on) return null

  return (
    <>
      <div
        ref={holderRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10"
        style={{ willChange: 'transform' }}
      />
    </>
  )
}
