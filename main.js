import * as THREE from "three";

// Camera path
const CAMERA_KEYS = [
  [[0, 5.5, 15], [0, 1.8, 0], -0.14],
  [[-8, 4, 6], [0, 1.5, 0], 0.2],
  [[5, 4.5, -8], [12, 3, -32], 0],
  [[9, 5, -30], [14, 3, -40], -0.2],
  [[22, 3, -42], [14, 3, -40], 0],
  [[8, 2.5, -54], [6, 2, -80], 0.12],
  [[6, 2, -80], [6, 2, -110], 0],
  [[3, 3.5, -104], [-10, 4, -130], 0],
  [[-1, 9, -117], [-10, 4, -130], 0.2],
  [[-32, 9, -119], [-10, 4, -130], -0.24],
  [[-5, 4, -156], [0, 4, -170], -0.2],
  [[46, 120, -62], [-6, -3, -92], -0.08],
];

// Languages
const LANGUAGES = [
  "lua", "python", "javascript", "java", "c++", "c", "sql", "react",
  "html", "css", "bash", "node", "git", "supabase", "leaflet",
];

// Chapters
const CHAPTERS = [
  [0, "00 — Start"],
  [1, "01 — Baseplate"],
  [3, "02 — Discord bots"],
  [5, "03 — Exploring"],
  [8, "04 — University"],
  [9, "— Selected work"],
  [10, "05 — Now"],
];

// Colors
const C = {
  ink: 0x0d0c0a,
  paper: 0xece6da,
  stone: 0x34302a,
  stoneLight: 0x5c564b,
  accent: 0xff5b23,
};

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const smallScreen = matchMedia("(max-width: 720px)").matches;

// Scroll progress
const beats = [...document.querySelectorAll(".beat")];
let beatTops = [];

function measureBeats() {
  beatTops = beats.map((b) => b.offsetTop);
}

function scrollBeat() {
  const y = window.scrollY;
  const last = beatTops.length - 1;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (y >= maxScroll - 1) return last;
  for (let i = 0; i < last; i++) {
    if (y < beatTops[i + 1]) {
      const span = Math.min(beatTops[i + 1], maxScroll) - beatTops[i];
      return i + Math.min(1, Math.max(0, (y - beatTops[i]) / span));
    }
  }
  return last;
}

// HUD
const chapterLabel = document.getElementById("chapterLabel");
const progressBar = document.getElementById("progressBar");
document.getElementById("year").textContent = new Date().getFullYear();

let currentChapter = "";
function updateHud(beat) {
  const idx = Math.round(beat);
  let label = CHAPTERS[0][1];
  for (const [start, text] of CHAPTERS) if (idx >= start) label = text;
  if (label !== currentChapter) {
    currentChapter = label;
    chapterLabel.textContent = label;
    chapterLabel.classList.remove("swap");
    void chapterLabel.offsetWidth;
    chapterLabel.classList.add("swap");
  }
  progressBar.style.transform = `scaleX(${beat / (beats.length - 1)})`;
}

// Reveal on scroll
const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const e of entries) if (e.isIntersecting) e.target.classList.add("in");
  },
  { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// Helpers
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

// Seeded random
let seed = 7;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const range = (a, b) => a + rand() * (b - a);

// Scene
function initScene() {
  const canvas = document.getElementById("scene");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch {
    document.documentElement.classList.add("no-webgl");
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, smallScreen ? 1.5 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.ink);
  scene.fog = new THREE.Fog(C.ink, 14, 62);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 400);

  scene.add(new THREE.HemisphereLight(0xf5ecdc, 0x15120e, 1.1));
  const sun = new THREE.DirectionalLight(0xffe6cc, 1.6);
  sun.position.set(6, 12, 8);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xff8a5c, 0.5);
  rim.position.set(-8, 3, -10);
  scene.add(rim);

  const mat = {
    paper: new THREE.MeshStandardMaterial({ color: C.paper, roughness: 0.85, flatShading: true }),
    stone: new THREE.MeshStandardMaterial({ color: C.stone, roughness: 0.95, flatShading: true }),
    stoneLight: new THREE.MeshStandardMaterial({ color: C.stoneLight, roughness: 0.9, flatShading: true }),
    accent: new THREE.MeshStandardMaterial({
      color: C.accent, emissive: C.accent, emissiveIntensity: 0.35, roughness: 0.6, flatShading: true,
    }),
    accentFlat: new THREE.MeshBasicMaterial({ color: C.accent }),
    ink: new THREE.MeshBasicMaterial({ color: C.ink }),
  };

  const updaters = [];

  // Floor and trail
  const grid = new THREE.GridHelper(420, 140, C.stone, C.stone);
  grid.position.set(0, -3, -80);
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  scene.add(grid);

  const trailCurve = new THREE.CatmullRomCurve3(
    [
      [0, 8], [1, -8], [12, -28], [15, -46], [7, -60], [6, -102],
      [-8, -118], [-12, -142], [-2, -160], [0, -176],
    ].map(([x, z]) => new THREE.Vector3(x, -2.94, z)),
    false, "centripetal"
  );
  const trailGeo = new THREE.TubeGeometry(trailCurve, 700, 0.07, 6, false);
  const trailIndexCount = trailGeo.index.count;
  const trail = new THREE.Mesh(trailGeo, mat.accentFlat);
  scene.add(trail);

  // Dust
  {
    const n = smallScreen ? 700 : 1400;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = range(-40, 40);
      pos[i * 3 + 1] = range(-2.5, 20);
      pos[i * 3 + 2] = range(20, -195);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: C.paper, size: 0.07, transparent: true, opacity: 0.55, depthWrite: false })
    );
    scene.add(dust);
    updaters.push((t) => { dust.position.y = Math.sin(t * 0.2) * 0.3; });
  }

  // Baseplate
  {
    const g = new THREE.Group();
    scene.add(g);

    const size = 12;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(size, 0.4, size), mat.stone);
    plate.position.y = -0.2;
    g.add(plate);

    const studs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 10), mat.stone, size * size);
    const m = new THREE.Matrix4();
    let k = 0;
    for (let i = 0; i < size; i++)
      for (let j = 0; j < size; j++) {
        m.makeTranslation(-size / 2 + 0.5 + i, 0.07, -size / 2 + 0.5 + j);
        studs.setMatrixAt(k++, m);
      }
    g.add(studs);

    // Blocks
    const blockDefs = [
      [-3.5, 0.5, -3, 2, 1, 2, "stoneLight"],
      [-3.5, 1.5, -3, 2, 1, 2, "paper"],
      [-3.5, 2.5, -3, 1, 1, 1, "accent"],
      [3.5, 0.5, -2.5, 3, 1, 1, "paper"],
      [4, 1.5, -2.5, 2, 1, 1, "stoneLight"],
      [4.5, 0.5, 2.5, 1, 1, 1, "accent"],
      [-4, 0.25, 3.5, 3, 0.5, 2, "stoneLight"],
      [-1.5, 0.5, -4.5, 1, 1, 1, "paper"],
      [0, 0.1, 0.5, 2.4, 0.2, 2.4, "paper"],
    ];
    const blocks = blockDefs.map(([x, y, z, w, h, d, mt], i) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat[mt]);
      mesh.position.set(x, y, z);
      mesh.userData = { y, delay: 0.25 + i * 0.09 };
      g.add(mesh);
      return mesh;
    });

    // Character
    const fig = new THREE.Group();
    fig.position.set(0, 0.2, 0.5);
    const box = (w, h, d, material, x, y, z) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      b.position.set(x, y, z);
      return b;
    };
    fig.add(box(0.48, 1, 0.5, mat.stoneLight, -0.25, 0.5, 0));
    fig.add(box(0.48, 1, 0.5, mat.stoneLight, 0.25, 0.5, 0));
    fig.add(box(1, 1, 0.5, mat.accent, 0, 1.5, 0));
    fig.add(box(0.62, 0.62, 0.62, mat.paper, 0, 2.32, 0));
    fig.add(box(0.08, 0.12, 0.02, mat.ink, -0.13, 2.38, 0.315));
    fig.add(box(0.08, 0.12, 0.02, mat.ink, 0.13, 2.38, 0.315));
    const arm = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.75, 2, 0);
      pivot.add(box(0.48, 1, 0.5, mat.paper, 0, -0.5, 0));
      fig.add(pivot);
      return pivot;
    };
    arm(-1);
    const waveArm = arm(1);
    g.add(fig);
    fig.userData = { y: 0.2, delay: 1.15 };
    blocks.push(fig);

    // Intro drop and wave
    const introStart = performance.now() / 1000;
    updaters.push((t, beat) => {
      const since = performance.now() / 1000 - introStart;
      for (const b of blocks) {
        const k = reduceMotion ? 1 : clamp01((since - b.userData.delay) / 0.9);
        b.position.y = b.userData.y + (1 - easeOutBack(k)) * 14;
      }
      const waving = 1 - smoothstep(0.6, 1.4, beat);
      waveArm.rotation.z = waving * (2.4 + Math.sin(t * 6) * 0.35);
      fig.rotation.y = Math.sin(t * 0.5) * 0.15;
    });
  }

  // Bot
  {
    const g = new THREE.Group();
    g.position.set(14, 3, -40);
    scene.add(g);

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0), mat.paper);
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.95, 1),
      new THREE.MeshBasicMaterial({ color: C.accent, wireframe: true, transparent: true, opacity: 0.4 })
    );
    g.add(core, shell);

    // Servers
    const SERVERS = 10;
    const serverGeo = new THREE.OctahedronGeometry(0.34, 0);
    const servers = [];
    for (let i = 0; i < SERVERS; i++) {
      const mesh = new THREE.Mesh(serverGeo, i % 4 === 0 ? mat.accent : i % 2 ? mat.paper : mat.stoneLight);
      mesh.userData = {
        r: range(3.4, 6),
        speed: range(0.12, 0.3) * (rand() > 0.5 ? 1 : -1),
        phase: rand() * Math.PI * 2,
        tilt: new THREE.Quaternion().setFromEuler(new THREE.Euler(range(-0.9, 0.9), 0, range(-0.9, 0.9))),
      };
      g.add(mesh);
      servers.push(mesh);
    }

    const linePos = new Float32Array(SERVERS * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    g.add(new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ color: C.stoneLight, transparent: true, opacity: 0.8 })
    ));

    const packets = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), mat.accentFlat, SERVERS);
    g.add(packets);

    // Messages
    const messages = [];
    const MSGS = 6;
    for (let i = 0; i < MSGS; i++) {
      const msg = new THREE.Group();
      const isBot = i % 2 === 0;
      msg.add(box(2.7, 0.78, 0.06, mat.stone, 0, 0, 0));
      const avatar = new THREE.Mesh(new THREE.CircleGeometry(0.17, 16), isBot ? mat.accentFlat : mat.paper);
      avatar.position.set(-1.05, 0.12, 0.04);
      msg.add(avatar);
      msg.add(box(range(0.6, 1), 0.08, 0.02, mat.paper, -0.3, 0.17, 0.04));
      const w2 = range(1, 1.6);
      msg.add(box(w2, 0.07, 0.02, mat.stoneLight, -0.78 + w2 / 2, -0.12, 0.04));
      msg.position.set(5.2, 0, -2.5);
      msg.rotation.y = -0.35;
      msg.userData.offset = i / MSGS;
      g.add(msg);
      messages.push(msg);
    }

    function box(w, h, d, material, x, y, z) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      b.position.set(x, y, z);
      return b;
    }

    const v = new THREE.Vector3();
    const m = new THREE.Matrix4();
    updaters.push((t) => {
      core.rotation.set(t * 0.3, t * 0.45, 0);
      shell.rotation.set(-t * 0.12, -t * 0.2, 0);
      servers.forEach((s, i) => {
        const { r, speed, phase, tilt } = s.userData;
        const a = phase + t * speed;
        s.position.set(Math.cos(a) * r, 0, Math.sin(a) * r).applyQuaternion(tilt);
        s.rotation.y = t + i;
        linePos.set([0, 0, 0, s.position.x, s.position.y, s.position.z], i * 6);
        const f = (t * 0.55 + i * 0.37) % 1;
        const along = f < 0.5 ? f * 2 : 2 - f * 2;
        v.copy(s.position).multiplyScalar(along);
        m.makeTranslation(v.x, v.y, v.z);
        packets.setMatrixAt(i, m);
      });
      lineGeo.attributes.position.needsUpdate = true;
      packets.instanceMatrix.needsUpdate = true;

      for (const msg of messages) {
        const f = (t * 0.07 + msg.userData.offset) % 1;
        msg.position.y = -3.4 + f * 7.8;
        const s = Math.min(smoothstep(0, 0.12, f), 1 - smoothstep(0.85, 1, f));
        msg.scale.setScalar(Math.max(0.001, s));
      }
    });
  }

  // Tunnel
  {
    const g = new THREE.Group();
    g.position.set(6, 2, 0);
    scene.add(g);

    const Z_START = -58;
    const Z_END = -106;

    for (let z = Z_START, i = 0; z > Z_END; z -= 4, i++) {
      const arc = range(Math.PI * 0.9, Math.PI * 1.6);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(range(6, 7.5), 0.035, 6, 96, arc),
        i % 3 === 0 ? mat.accentFlat : new THREE.MeshBasicMaterial({ color: C.stoneLight })
      );
      ring.position.z = z;
      ring.rotation.z = rand() * Math.PI * 2;
      ring.userData.spin = range(-0.15, 0.15);
      g.add(ring);
    }

    const tokens = new THREE.Group();
    g.add(tokens);
    updaters.push((t) => {
      tokens.rotation.z = t * 0.04;
      for (const ring of g.children) if (ring.userData.spin) ring.rotation.z += ring.userData.spin * 0.01;
    });

    // Language tokens
    const makeToken = (text, color) => {
      const fontPx = 96;
      const c = document.createElement("canvas");
      const ctx = c.getContext("2d");
      const font = `600 ${fontPx}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.font = font;
      const w = Math.ceil(ctx.measureText(text).width) + 24;
      c.width = w;
      c.height = fontPx * 1.4;
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textBaseline = "middle";
      ctx.fillText(text, 12, c.height / 2);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const h = 0.62;
      return new THREE.Mesh(
        new THREE.PlaneGeometry((h * c.width) / c.height, h),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
      );
    };

    const build = () => {
      const count = smallScreen ? 34 : 52;
      for (let i = 0; i < count; i++) {
        const word = LANGUAGES[i % LANGUAGES.length];
        const color = i % LANGUAGES.length === 0 || rand() < 0.12 ? "#ff5b23" : "#ece6da";
        const tok = makeToken(word, color);
        const a = rand() * Math.PI * 2;
        const r = range(2.4, 5.4);
        tok.position.set(Math.cos(a) * r, Math.sin(a) * r, Z_START - 2 - (i / count) * (Z_START - Z_END - 4));
        tok.rotation.z = range(-0.08, 0.08);
        tokens.add(tok);
      }
    };
    document.fonts.load('600 96px "JetBrains Mono"').then(build, build);
  }

  let assemble = () => {};
  // University structure
  {
    const center = new THREE.Vector3(-10, 1.2, -130);
    const NX = 7, NY = 7, NZ = 7, GAP = 1.05;
    const cells = [];
    for (let x = 0; x < NX; x++)
      for (let y = 0; y < NY; y++)
        for (let z = 0; z < NZ; z++) {
          const cx = Math.abs(x - 3), cz = Math.abs(z - 3);
          if (y >= 3 && (cx > 2 || cz > 2)) continue;
          if (y >= 5 && (cx > 1 || cz > 1)) continue;
          if (y < 3 && cx < 1 && cz < 1 && y > 0) continue;
          if (rand() < 0.14) continue;
          cells.push([x, y, z]);
        }

    const geo = new THREE.BoxGeometry(0.92, 0.92, 0.92);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
    const inst = new THREE.InstancedMesh(geo, material, cells.length);
    const palette = [new THREE.Color(C.stone), new THREE.Color(C.stoneLight), new THREE.Color(C.paper)];
    const accent = new THREE.Color(C.accent);

    const data = cells.map(([x, y, z], i) => {
      const home = new THREE.Vector3((x - 3) * GAP, y * GAP, (z - 3) * GAP).add(center);
      const away = new THREE.Vector3(range(-16, 16), range(-4, 14), range(-10, 16)).add(center);
      const spin = new THREE.Euler(range(-3, 3), range(-3, 3), range(-3, 3));
      const color = rand() < 0.08 ? accent : palette[(x + y * 2 + z) % 3 === 0 ? 2 : y % 2];
      inst.setColorAt(i, color);
      return { home, away, spin, delay: rand() * 0.45 + (y / NY) * 0.2 };
    });
    scene.add(inst);

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    let last = -1;
    // Assemble
    assemble = (beat, t) => {
      const a = smoothstep(6.3, 8.1, beat);
      const drift = a < 1 ? t : 0;
      if (a === last && a === 1) return;
      last = a;
      data.forEach((d, i) => {
        const k = easeOutCubic(clamp01((a - d.delay) / 0.55));
        p.lerpVectors(d.away, d.home, k);
        if (k < 1) p.y += Math.sin(drift * 0.6 + i) * 0.3 * (1 - k);
        e.set(d.spin.x * (1 - k), d.spin.y * (1 - k) + (1 - k) * drift * 0.2, d.spin.z * (1 - k));
        q.setFromEuler(e);
        m.compose(p, q, one);
        inst.setMatrixAt(i, m);
      });
      inst.instanceMatrix.needsUpdate = true;
    };
  }

  // Gate
  {
    const g = new THREE.Group();
    g.position.set(0, 4.5, -170);
    scene.add(g);

    const gate = new THREE.Mesh(new THREE.TorusGeometry(5, 0.07, 8, 160), mat.accentFlat);
    g.add(gate);
    const inner = [];
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(
        new THREE.TorusGeometry(3.9 - i * 0.9, 0.025, 6, 120, Math.PI * range(0.6, 1.4)),
        new THREE.MeshBasicMaterial({ color: i === 1 ? C.accent : C.paper, transparent: true, opacity: 0.7 })
      );
      g.add(r);
      inner.push(r);
    }
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.3, 48), mat.stone);
    pad.position.y = -7.3;
    g.add(pad);

    updaters.push((t) => {
      inner.forEach((r, i) => { r.rotation.z = t * (0.25 + i * 0.12) * (i % 2 ? -1 : 1); });
      gate.rotation.y = Math.sin(t * 0.3) * 0.12;
    });
  }

  // Camera
  const posCurve = new THREE.CatmullRomCurve3(CAMERA_KEYS.map(([p]) => new THREE.Vector3(...p)), false, "centripetal");
  const lookCurve = new THREE.CatmullRomCurve3(CAMERA_KEYS.map(([, l]) => new THREE.Vector3(...l)), false, "centripetal");

  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // Resize
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 68 : 50;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  resize();

  const lastIndex = CAMERA_KEYS.length - 1;
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  // Frame
  function frame(beat, t) {
    const u = Math.min(1, beat / lastIndex);
    posCurve.getPoint(u, camPos);
    lookCurve.getPoint(u, camLook);

    pointer.sx += (pointer.x - pointer.sx) * 0.05;
    pointer.sy += (pointer.y - pointer.sy) * 0.05;
    forward.subVectors(camLook, camPos).normalize();
    right.crossVectors(forward, up).normalize();
    const sway = reduceMotion ? 0 : 1;
    camPos.addScaledVector(right, (pointer.sx * 0.6 + Math.sin(t * 0.4) * 0.15) * sway);
    camPos.y += (-pointer.sy * 0.35 + Math.sin(t * 0.55) * 0.1) * sway;

    camera.position.copy(camPos);
    camera.lookAt(camLook);

    const i0 = Math.floor(beat), i1 = Math.min(lastIndex, i0 + 1);
    const shift = THREE.MathUtils.lerp(CAMERA_KEYS[i0][2], CAMERA_KEYS[i1][2], smoothstep(0, 1, beat - i0));
    camera.filmOffset = camera.aspect < 0.8 ? 0 : shift * camera.getFilmWidth();
    camera.updateProjectionMatrix();

    const reveal = smoothstep(lastIndex - 1, lastIndex, beat);
    scene.fog.near = 14 + reveal * 60;
    scene.fog.far = 62 + reveal * 250;

    const drawn = Math.max(0.02, smoothstep(0, lastIndex - 1.2, beat));
    trailGeo.setDrawRange(0, Math.floor((trailIndexCount * drawn) / 3) * 3);

    assemble(beat, t);
    for (const fn of updaters) fn(t, beat);

    renderer.render(scene, camera);
  }

  return { frame, resize };
}

// Loop
const world = initScene();

measureBeats();
let smoothBeat = scrollBeat();
let last = performance.now();

window.addEventListener("resize", () => {
  measureBeats();
  world?.resize();
});
window.addEventListener("load", measureBeats);
document.fonts?.ready.then(measureBeats);

function tick(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const target = scrollBeat();
  smoothBeat += (target - smoothBeat) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 4.5));
  if (Math.abs(target - smoothBeat) < 0.0005) smoothBeat = target;

  updateHud(target);
  world?.frame(smoothBeat, now / 1000);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
