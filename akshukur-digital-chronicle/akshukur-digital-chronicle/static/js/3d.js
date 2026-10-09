/* ============================================================
   3d.js — Three.js 3D viewer (қайта құрастырылған сахна)
   «Тарихи деректерге сүйенген болжамды 3D реконструкция»
   Сахна: жағалау ұштасқан құмды үстірт, Каспий теңізі (толқын
   анимациясы), жағалауға жақын құдық, шағын мешіт, ескі ағаш,
   түйе, шөптер, тастар, жұмсақ күн сәулесі мен көлеңке.
   static/models/mashyryq.glb болса — мешіт орнына оны жүктейді.
   CDN жүктелмесе — түсінікті қате хабарламасы көрсетіледі.
   ============================================================ */
(function () {
  'use strict';
  const container = document.getElementById('viewer3d');
  const fallback = document.getElementById('viewerFallback');
  const statusChip = document.getElementById('modelStatus');
  if (!container) return;

  if (typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined') {
    container.style.display = 'none';
    if (fallback) fallback.hidden = false;
    return;
  }

  /* ---------- Рендерер ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  /* ---------- Сцена мен аспан ---------- */
  const scene = new THREE.Scene();
  const SKY_TOP = 0x7fb0d8, SKY_BOT = 0xe8d5a8;
  const skyCv = document.createElement('canvas');
  skyCv.width = 4; skyCv.height = 256;
  const ctx = skyCv.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#6fa5cf');   // зеңгір аспан
  grad.addColorStop(0.62, '#c9cfce');
  grad.addColorStop(1, '#e8d5a8');   // күнбату құмы
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 4, 256);
  scene.background = new THREE.CanvasTexture(skyCv);
  scene.fog = new THREE.Fog(0xd8cdb2, 70, 170);

  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 500);
  const HOME_POS = new THREE.Vector3(24, 15, 28);
  camera.position.copy(HOME_POS);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 2, 4);
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.minDistance = 6;
  controls.maxDistance = 90;

  /* ---------- Жарық: жұмсақ күн ---------- */
  scene.add(new THREE.HemisphereLight(SKY_TOP, 0x8a6f45, 0.55));
  const sun = new THREE.DirectionalLight(0xffe3b3, 1.15);
  sun.position.set(-30, 34, -20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -45; sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45;
  sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xaFC4e8, 0.25);
  fill.position.set(20, 14, 30);
  scene.add(fill);

  /* ---------- Материалдар ---------- */
  const sandMat  = new THREE.MeshStandardMaterial({ color: 0xcbb083, roughness: 1 });
  const wetMat   = new THREE.MeshStandardMaterial({ color: 0xb59a6d, roughness: 1 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xcdb284, roughness: 0.9 });
  const darkMat  = new THREE.MeshStandardMaterial({ color: 0x8a6f45, roughness: 0.95 });
  const domeMat  = new THREE.MeshStandardMaterial({ color: 0x3e6f8e, roughness: 0.45, metalness: 0.15 });
  const goldMat  = new THREE.MeshStandardMaterial({ color: 0xd9b36c, roughness: 0.3, metalness: 0.6 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4630, roughness: 1 });
  const leafMat  = new THREE.MeshStandardMaterial({ color: 0x556b35, roughness: 1 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x7d8a4a, roughness: 1 });
  const rockMat  = new THREE.MeshStandardMaterial({ color: 0x9a8a72, roughness: 1 });
  const camelMat = new THREE.MeshStandardMaterial({ color: 0xb08755, roughness: 0.95 });
  const woodMat  = new THREE.MeshStandardMaterial({ color: 0x6e5233, roughness: 0.95 });

  function M(geo, mat, x, y, z, parent) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    (parent || scene).add(m);
    return m;
  }

  /* ---------- Жер: құмды үстірт (жағалауға дейін) ---------- */
  const SEA_EDGE = -26; // теңіз осы z-ден басталады
  const ground = M(new THREE.BoxGeometry(160, 2, 80), sandMat, 0, -1, 14);
  ground.castShadow = false;
  // Жағалау жазықтығы (сәл еңкейген, суға енетін бөлік)
  const beach = M(new THREE.BoxGeometry(160, 1.4, 10), wetMat, 0, -0.72, SEA_EDGE + 2.5);
  beach.castShadow = false;

  /* ---------- Каспий теңізі: толқынды жазықтық ---------- */
  const seaGeo = new THREE.PlaneGeometry(180, 90, 48, 24);
  const seaBase = seaGeo.attributes.position.array.slice(); // бастапқы z биіктіктері
  const seaMat = new THREE.MeshStandardMaterial({
    color: 0x2f6f8f, roughness: 0.35, metalness: 0.1,
    transparent: true, opacity: 0.92
  });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.15, SEA_EDGE - 42);
  sea.receiveShadow = true;
  scene.add(sea);

  /* ---------- Шағын мешіт (болжамды реконструкция) ---------- */
  const mosque = new THREE.Group();
  mosque.position.set(-12, 0, 12);
  scene.add(mosque);
  M(new THREE.BoxGeometry(7, 4, 6), stoneMat, 0, 2, 0, mosque);                    // негізгі зал
  M(new THREE.CylinderGeometry(2, 2, 0.6, 20), stoneMat, 0, 4.3, 0, mosque);       // күмбез табаны
  M(new THREE.SphereGeometry(2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeMat, 0, 4.6, 0, mosque); // күмбез
  M(new THREE.SphereGeometry(0.22, 10, 10), goldMat, 0, 6.85, 0, mosque);          // жиде
  M(new THREE.BoxGeometry(2.6, 5, 1.1), stoneMat, 0, 2.5, 3.4, mosque);            // пештак
  M(new THREE.BoxGeometry(1.3, 2.4, 0.3), darkMat, 0, 1.2, 3.98, mosque);          // есік
  const minaret = M(new THREE.CylinderGeometry(0.55, 0.7, 6.5, 14), stoneMat, 4.2, 3.25, 2.8, mosque);
  M(new THREE.ConeGeometry(0.75, 1.2, 14), domeMat, 4.2, 7.1, 2.8, mosque);        // мұнара қалпағы
  // Терезелер (қараңғы саңылаулар)
  [-2, 0, 2].forEach(x => M(new THREE.BoxGeometry(0.7, 1.2, 0.15), darkMat, x, 2.4, 3.05, mosque));

  /* ---------- GLB модельді талпынып жүктеу ---------- */
  if (typeof THREE.GLTFLoader !== 'undefined') {
    new THREE.GLTFLoader().load('/static/models/mashyryq.glb',
      gltf => {
        scene.remove(mosque);
        const model = gltf.scene;
        const bbox = new THREE.Box3().setFromObject(model);
        const size = bbox.getSize(new THREE.Vector3());
        model.scale.setScalar(7 / Math.max(size.x, size.y, size.z, 0.001));
        const b2 = new THREE.Box3().setFromObject(model);
        const c = b2.getCenter(new THREE.Vector3());
        model.position.set(-12 - c.x, -b2.min.y, 12 - c.z);
        model.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
        scene.add(model);
        if (statusChip) statusChip.textContent = 'Нақты модель жүктелді: static/models/mashyryq.glb';
      },
      undefined,
      () => { /* GLB жоқ — placeholder мешіт қалады */ });
  }

  /* ---------- Ескі ағаш (иеген дің, сирек тәлі) ---------- */
  const tree = new THREE.Group();
  tree.position.set(14, 0, 8);
  scene.add(tree);
  M(new THREE.CylinderGeometry(0.25, 0.5, 3.2, 10), trunkMat, 0, 1.6, 0, tree);
  const branch = M(new THREE.CylinderGeometry(0.1, 0.16, 2, 8), trunkMat, 0.8, 3.6, 0, tree);
  branch.rotation.z = -0.7;
  const crown1 = M(new THREE.SphereGeometry(1.5, 12, 10), leafMat, 0.2, 4.2, 0, tree);
  crown1.scale.set(1.3, 0.75, 1.2);
  M(new THREE.SphereGeometry(0.9, 10, 8), leafMat, 1.6, 4.6, 0.3, tree).scale.set(1, 0.7, 1);

  /* ---------- Жағалауға жақын құдық ---------- */
  const well = new THREE.Group();
  well.position.set(-2, 0, -18);
  scene.add(well);
  const wellWall = M(new THREE.CylinderGeometry(0.9, 1, 1, 14, 1, true), stoneMat, 0, 0.5, 0, well);
  wellWall.material = stoneMat.clone(); wellWall.material.side = THREE.DoubleSide;
  M(new THREE.CylinderGeometry(0.82, 0.82, 0.08, 14), new THREE.MeshStandardMaterial({ color: 0x1d3a4a }), 0, 0.45, 0, well); // су
  [-0.85, 0.85].forEach(x => M(new THREE.CylinderGeometry(0.07, 0.07, 1.9, 8), woodMat, x, 1, 0, well));
  const beam = M(new THREE.CylinderGeometry(0.06, 0.06, 1.9, 8), woodMat, 0, 1.85, 0, well);
  beam.rotation.z = Math.PI / 2;
  const roof = M(new THREE.ConeGeometry(1.3, 0.8, 4), woodMat, 0, 2.3, 0, well);
  roof.rotation.y = Math.PI / 4;

  /* ---------- Түйе (шөлге түсікті силуэт) ---------- */
  const camel = new THREE.Group();
  camel.position.set(7, 0, -4);
  camel.rotation.y = -0.6;
  scene.add(camel);
  const body = M(new THREE.SphereGeometry(1.1, 14, 10), camelMat, 0, 1.55, 0, camel);
  body.scale.set(1.5, 0.85, 0.8);
  M(new THREE.SphereGeometry(0.45, 10, 8), camelMat, -0.35, 2.35, 0, camel);       // өркеш
  const neck = M(new THREE.CylinderGeometry(0.16, 0.24, 1.5, 8), camelMat, 1.35, 2.2, 0, camel);
  neck.rotation.z = -0.45;
  M(new THREE.BoxGeometry(0.55, 0.3, 0.3), camelMat, 1.95, 2.85, 0, camel);        // бас
  M(new THREE.ConeGeometry(0.07, 0.2, 6), camelMat, 1.85, 3.1, 0.12, camel);       // құлақ
  M(new THREE.ConeGeometry(0.07, 0.2, 6), camelMat, 1.85, 3.1, -0.12, camel);
  [[0.9, 0.4], [0.9, -0.4], [-0.9, 0.4], [-0.9, -0.4]].forEach(([x, z]) => {
    const leg = M(new THREE.CylinderGeometry(0.09, 0.08, 1.5, 8), camelMat, x, 0.75, z, camel);
    leg.rotation.x = z > 0 ? 0.05 : -0.05;
  });
  const tail = M(new THREE.CylinderGeometry(0.04, 0.03, 0.9, 6), camelMat, -1.65, 1.5, 0, camel);
  tail.rotation.z = 0.5;

  /* ---------- Шөптер мен тастар (шашыраңқы) ---------- */
  const GRASS_SPOTS = [[-20, 6], [-16, 18], [-6, 10], [3, 14], [10, 2], [18, 16], [22, 6],
                       [-24, 14], [8, 20], [-10, 22], [26, 12], [-2, 4], [16, 22]];
  GRASS_SPOTS.forEach(([x, z], i) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = i * 1.3;
    scene.add(g);
    for (let k = 0; k < 3; k++) {
      const blade = M(new THREE.ConeGeometry(0.09, 0.9 + (k * 0.2), 5), grassMat,
        (k - 1) * 0.22, 0.45, (k % 2) * 0.15, g);
      blade.rotation.z = (k - 1) * 0.18;
      blade.castShadow = false;
    }
  });
  const ROCK_SPOTS = [[-8, -6, 0.7], [4, -12, 0.5], [19, -2, 0.9], [-18, -10, 0.6], [12, 12, 0.4]];
  ROCK_SPOTS.forEach(([x, z, r]) => {
    const rock = M(new THREE.DodecahedronGeometry(r, 0), rockMat, x, r * 0.55, z);
    rock.rotation.set(x, z, x * z);
  });

  /* ---------- Жергілікті белгілер (HUD емес, сахна іші таза) ---------- */

  /* ---------- Басқару батырмалары ---------- */
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;
  const btnRotate = document.getElementById('btnRotate');
  const btnReset = document.getElementById('btnReset');
  const btnWire = document.getElementById('btnWire');
  const btnFull = document.getElementById('btnFull');
  const frame = container.parentElement;

  if (btnRotate) {
    btnRotate.textContent = '⟳ Айналдыру: қосулы';
    btnRotate.addEventListener('click', () => {
      controls.autoRotate = !controls.autoRotate;
      btnRotate.textContent = controls.autoRotate ? '⟳ Айналдыру: қосулы' : '⟳ Айналдыру: өшірулі';
    });
  }
  if (btnReset) btnReset.addEventListener('click', () => {
    camera.position.copy(HOME_POS);
    controls.target.set(0, 2, 4);
    controls.update();
  });
  let wire = false;
  if (btnWire) btnWire.addEventListener('click', () => {
    wire = !wire;
    scene.traverse(o => { if (o.isMesh) o.material.wireframe = wire; });
  });
  if (btnFull) btnFull.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      (frame.requestFullscreen || frame.webkitRequestFullscreen || function () {}).call(frame);
    } else {
      document.exitFullscreen();
    }
  });
  document.addEventListener('fullscreenchange', onResize);

  /* ---------- Resize (компьютер + телефон) ---------- */
  function onResize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);
  onResize();

  /* ---------- Цикл: толқын анимациясы ---------- */
  const clock = new THREE.Clock();
  (function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const pos = seaGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = seaBase[i * 3], y = seaBase[i * 3 + 1];
      pos.array[i * 3 + 2] = Math.sin(x * 0.22 + t * 1.1) * 0.32
                           + Math.cos(y * 0.18 + t * 0.8) * 0.24;
    }
    pos.needsUpdate = true;
    seaGeo.computeVertexNormals();
    controls.update();
    renderer.render(scene, camera);
  })();
})();
