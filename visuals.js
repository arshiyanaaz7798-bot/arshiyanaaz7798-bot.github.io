/* visuals.js: realistic 3D globe + satellite, real satellite-tile imagery with GIS overlays, tool icons */
(function () {
  'use strict';

  /* ---------- 1. Realistic Earth (NASA textures) + 3D satellite ---------- */
  function initGlobe() {
    const host = document.getElementById('globe');
    if (!host) return;
    if (!window.THREE) { host.classList.add('fallback'); return; }
    const T = THREE;
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); }
    catch (e) { host.classList.add('fallback'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    host.appendChild(renderer.domElement);

    const scene = new T.Scene();
    const cam = new T.PerspectiveCamera(32, 1, 0.1, 100);
    cam.position.set(0, 0, 11);

    const base = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/';
    const loader = new T.TextureLoader(); loader.crossOrigin = 'anonymous';
    const tex = f => { const t = loader.load(base + f, undefined, undefined, () => host.classList.add('fallback')); t.anisotropy = 8; return t; };

    // Earth: day map + night city lights, blended by a fixed sun direction (night side faces us, like the reference)
    const sun = new T.Vector3(-0.8, 0.3, -0.35).normalize();
    const earthMat = new T.ShaderMaterial({
      uniforms: { dayMap: { value: tex('earth_atmos_2048.jpg') }, nightMap: { value: tex('earth_lights_2048.png') }, sun: { value: sun } },
      vertexShader: 'varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform sampler2D dayMap,nightMap;uniform vec3 sun;varying vec2 vUv;varying vec3 vN;varying vec3 vV;' +
        'void main(){vec3 n=normalize(vN);float d=dot(n,sun);' +
        'vec3 dc=texture2D(dayMap,vUv).rgb;float l=texture2D(nightMap,vUv).r;' +
        'vec3 dayCol=dc*(0.18+1.25*max(d,0.));' +
        'vec3 nightCol=dc*vec3(.025,.05,.11)+vec3(1.,.72,.38)*pow(l,.8)*1.9;' +
        'vec3 col=mix(nightCol,dayCol,smoothstep(-.1,.3,d));' +
        'float f=pow(1.-max(dot(n,normalize(vV)),0.),3.);' +
        'col+=vec3(.12,.48,1.)*f*(.45+.6*max(d+.3,0.));gl_FragColor=vec4(col,1.);}'
    });
    const tilt = new T.Group(); tilt.rotation.set(0.25, 0, 0.2); scene.add(tilt);
    const earth = new T.Mesh(new T.SphereGeometry(2, 96, 96), earthMat); tilt.add(earth);
    const clouds = new T.Mesh(new T.SphereGeometry(2.025, 64, 64),
      new T.MeshLambertMaterial({ map: tex('earth_clouds_1024.png'), transparent: true, opacity: 0.4, depthWrite: false }));
    tilt.add(clouds);

    // Atmosphere glow
    scene.add(new T.Mesh(new T.SphereGeometry(2.3, 64, 64), new T.ShaderMaterial({
      vertexShader: 'varying vec3 n;void main(){n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec3 n;void main(){float i=pow(max(.68-dot(n,vec3(0.,0.,1.)),0.),3.);gl_FragColor=vec4(.22,.58,1.,1.)*i*.65;}',
      side: T.BackSide, blending: T.AdditiveBlending, transparent: true, depthWrite: false
    })));

    // Orbit lines (hidden naturally where they pass behind the planet)
    const orbit = (r, rx, rz, op) => {
      const pts = []; for (let i = 0; i <= 220; i++) { const a = i / 220 * Math.PI * 2; pts.push(new T.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
      const l = new T.LineLoop(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x4fb8ff, transparent: true, opacity: op }));
      l.rotation.set(rx, 0, rz); scene.add(l);
    };
    orbit(3.1, 0.35, -0.5, 0.4); orbit(3.5, 0.75, 0.95, 0.22);

    // Lights for the satellite
    scene.add(new T.AmbientLight(0x6f8fc4, 0.9));
    const key = new T.DirectionalLight(0xfff1dc, 2.4); key.position.set(-4, 5, 6); scene.add(key);
    const rim = new T.DirectionalLight(0x4fa8ff, 1.6); rim.position.set(6, -2, -3); scene.add(rim);

    // Satellite: gold foil body, solar arrays with cell grid, dish, antenna, signal waves
    const panelTex = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 256, 96); gr.addColorStop(0, '#12397a'); gr.addColorStop(1, '#0a2250');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 96); g.strokeStyle = 'rgba(140,190,255,.55)'; g.lineWidth = 1.5;
      for (let x = 0; x <= 256; x += 21.3) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 96); g.stroke(); }
      for (let y = 0; y <= 96; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
      const t = new T.CanvasTexture(c); t.anisotropy = 8; return t;
    })();
    const foil = new T.MeshStandardMaterial({ color: 0xdcae4a, metalness: 0.95, roughness: 0.3 });
    const steel = new T.MeshStandardMaterial({ color: 0xcfd6dd, metalness: 0.9, roughness: 0.35, side: T.DoubleSide });
    const panelMat = new T.MeshStandardMaterial({ map: panelTex, metalness: 0.7, roughness: 0.3, emissive: 0x0a2a66, emissiveIntensity: 0.4 });
    const sat = new T.Group();
    sat.add(new T.Mesh(new T.BoxGeometry(0.34, 0.34, 0.46), foil));
    [-1, 1].forEach(s => {
      const arm = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, 0.34, 8), steel); arm.rotation.z = Math.PI / 2; arm.position.x = s * 0.33; sat.add(arm);
      const p = new T.Mesh(new T.BoxGeometry(1, 0.014, 0.44), panelMat); p.position.x = s * 0.9; sat.add(p);
    });
    const dish = new T.Mesh(new T.SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), steel);
    dish.rotation.x = -Math.PI / 2; dish.position.z = 0.34; sat.add(dish);
    const horn = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.2, 8), steel); horn.rotation.x = Math.PI / 2; horn.position.z = 0.42; sat.add(horn);
    const mast = new T.Mesh(new T.CylinderGeometry(0.01, 0.01, 0.4, 8), steel); mast.position.set(0.08, 0.36, -0.08); sat.add(mast);
    const waves = [0, 1, 2].map(() => {
      const w = new T.Mesh(new T.RingGeometry(0.28, 0.296, 64), new T.MeshBasicMaterial({ color: 0x6fd0ff, transparent: true, side: T.DoubleSide, depthWrite: false }));
      sat.add(w); return w;
    });
    sat.scale.setScalar(0.8); scene.add(sat);
    const orbEuler = new T.Euler(0.35, 0, -0.5); let ang = 0.9;
    const place = () => { sat.position.set(Math.cos(ang) * 3.1, 0, Math.sin(ang) * 3.1).applyEuler(orbEuler); sat.lookAt(0, 0, 0); sat.rotateZ(0.45); };
    place();

    function resize() {
      const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(host); resize();

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    earth.rotation.y = 0.15; let t = 0;
    (function loop() {
      t += 0.016;
      if (!still) { earth.rotation.y += 0.0009; clouds.rotation.y += 0.0012; }
      if (!still) ang += 0.0045; place();
      waves.forEach((w, i) => {
        const s = still ? 0.4 : (t * 0.45 + i / 3) % 1;
        w.scale.setScalar(0.7 + s * 1.6); w.position.z = 0.5 + s * 1.3; w.material.opacity = (1 - s) * 0.55;
      });
      renderer.render(scene, cam); requestAnimationFrame(loop);
    })();
  }

  /* ---------- 2. Real satellite tiles (Esri World Imagery) + GIS-style overlays ---------- */
  function tileXY(lat, lon, z) {
    const n = Math.pow(2, z), r = lat * Math.PI / 180;
    return [(lon + 180) / 360 * n, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n];
  }
  function mosaic(el, lat, lon, z) {
    const xy = tileXY(lat, lon, z), x0 = Math.floor(xy[0] - 0.5), y0 = Math.floor(xy[1] - 0.5);
    const m = document.createElement('div'); m.className = 'mos';
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const im = new Image(); im.alt = ''; im.decoding = 'async'; im.referrerPolicy = 'no-referrer';
      im.src = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/' + z + '/' + (y0 + j) + '/' + (x0 + i);
      im.onerror = () => im.remove(); m.appendChild(im);
    }
    el.prepend(m); return m;
  }
  function fbmField(seed) {
    const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); };
    const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      return (h2(xi, yi) * (1 - u) + h2(xi + 1, yi) * u) * (1 - v) + (h2(xi, yi + 1) * (1 - u) + h2(xi + 1, yi + 1) * u) * v; };
    return (x, y) => { let a = 0.5, s = 0, f = 1; for (let o = 0; o < 5; o++) { s += a * vn(x * f, y * f); f *= 2; a *= 0.5; } return Math.min(1, Math.max(0, (s / 0.97 - 0.25) / 0.5)); };
  }
  const clamp = v => Math.max(0, Math.min(1, v));
  const ramp = (t, st) => { for (let i = 1; i < st.length; i++) if (t <= st[i][0]) { const a = st[i - 1], b = st[i], k = (t - a[0]) / (b[0] - a[0]); return a[1].map((c, j) => c + (b[1][j] - c) * k); } return st[st.length - 1][1]; };
  const MAPS = {
    jet: t => [255 * clamp(1.5 - Math.abs(4 * t - 3)), 255 * clamp(1.5 - Math.abs(4 * t - 2)), 255 * clamp(1.5 - Math.abs(4 * t - 1))],
    ndvi: t => ramp(t, [[0, [150, 95, 55]], [0.35, [225, 205, 95]], [0.6, [110, 190, 70]], [1, [8, 105, 40]]]),
    lulc: t => t < 0.2 ? [40, 110, 210] : t < 0.45 ? [30, 135, 55] : t < 0.65 ? [160, 205, 80] : t < 0.8 ? [215, 70, 60] : [205, 175, 110]
  };
  function overlay(mode, seed) {
    const c = document.createElement('canvas'), n = 140; c.width = c.height = n; c.className = 'ov';
    const g = c.getContext('2d'), img = g.createImageData(n, n), f = fbmField(seed), map = MAPS[mode] || MAPS.jet;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const col = map(f(x / n * 4, y / n * 4)), i = (y * n + x) * 4;
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); return c;
  }
  function initImagery() {
    document.querySelectorAll('.sat').forEach((el, k) => {
      const m = mosaic(el, +el.dataset.lat, +el.dataset.lon, +(el.dataset.z || 11));
      if (el.dataset.mode) m.appendChild(overlay(el.dataset.mode, k + 3));
    });
  }

  /* ---------- 3. Real tool logos (falls back to the existing glyph if a logo can't load) ---------- */
  function initIcons() {
    const icons = { qgis: 'qgis/589632', gee: 'googleearthengine/4285F4', arc: 'arcgis/2C7AC3', py: 'python/FFD43B', r: 'r/276DC3', ms: 'microsoftoffice/D83B01' };
    document.querySelectorAll('.skill-symbol').forEach(el => {
      const k = Array.from(el.classList).find(c => icons[c]); if (!k) return;
      const im = new Image(); im.alt = ''; im.width = im.height = 24;
      im.onload = () => { el.textContent = ''; el.appendChild(im); };
      im.src = 'https://cdn.simpleicons.org/' + icons[k];
    });
  }

  initGlobe(); initImagery(); initIcons();
})();
