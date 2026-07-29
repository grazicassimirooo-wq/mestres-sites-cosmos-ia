import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.getElementById("cosmos-canvas");
if (canvas) {
  const container = canvas.parentElement;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0.35, 5.6);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 3.2;
  controls.maxDistance = 9;
  controls.target.set(0, 0.15, 0);

  // Luzes
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(2.5, 3, 4);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0x8b7bff, 5, 14);
  rimLight.position.set(-2.5, 0.5, -3);
  scene.add(rimLight);

  // Materiais
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf2c6a8, roughness: 0.55 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.35, metalness: 0.1 });
  const blazerMat = new THREE.MeshStandardMaterial({ color: 0x5b7a45, roughness: 0.6 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.6 });
  const jeansMat = new THREE.MeshStandardMaterial({ color: 0x3d6094, roughness: 0.7 });
  const cuffMat = new THREE.MeshStandardMaterial({ color: 0x7ea0c9, roughness: 0.7 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.4 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a938, roughness: 0.3, metalness: 0.7 });
  const blushMat = new THREE.MeshStandardMaterial({ color: 0xd99a77, roughness: 0.6 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0xb96a55, roughness: 0.5 });
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // ── Personagem: a dev do cosmos ────────────────────────────────
  const chara = new THREE.Group();
  scene.add(chara);

  // Cabeça (segue o mouse)
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.55;
  chara.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.8, 48, 48), skinMat);
  head.scale.set(1, 0.95, 0.9);
  headGroup.add(head);

  // Cabelo: "capacete" recuado (deixa o rosto livre) + laterais longas + volume atrás
  const hairMain = new THREE.Mesh(new THREE.SphereGeometry(0.85, 48, 48), hairMat);
  hairMain.scale.set(1.05, 1.05, 1);
  hairMain.position.set(0, 0.15, -0.22);
  headGroup.add(hairMain);

  const hairSideGeo = new THREE.SphereGeometry(0.3, 32, 32);
  const hairLeft = new THREE.Mesh(hairSideGeo, hairMat);
  hairLeft.scale.set(1, 2.6, 1);
  hairLeft.position.set(-0.72, -0.5, -0.08);
  headGroup.add(hairLeft);
  const hairRight = new THREE.Mesh(hairSideGeo, hairMat);
  hairRight.scale.set(1, 2.6, 1);
  hairRight.position.set(0.72, -0.5, -0.08);
  headGroup.add(hairRight);

  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 32), hairMat);
  hairBack.scale.set(1.35, 1.9, 0.8);
  hairBack.position.set(0, -0.5, -0.35);
  headGroup.add(hairBack);

  // Olhos grandes (piscam e seguem o mouse)
  function createEye(side) {
    const group = new THREE.Group();
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 32), darkMat);
    eye.scale.set(1, 1.15, 0.6);
    group.add(eye);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), whiteMat);
    shine.position.set(0.05, 0.07, 0.09);
    group.add(shine);
    group.position.set(side * 0.3, -0.02, 0.68);
    return group;
  }
  const leftEye = createEye(-1);
  const rightEye = createEye(1);
  const eyes = new THREE.Group();
  eyes.add(leftEye, rightEye);
  headGroup.add(eyes);

  // Sobrancelhas
  const browGeo = new THREE.CapsuleGeometry(0.025, 0.18, 4, 8);
  const leftBrow = new THREE.Mesh(browGeo, hairMat);
  leftBrow.rotation.z = Math.PI / 2 - 0.12;
  leftBrow.position.set(-0.3, 0.26, 0.7);
  headGroup.add(leftBrow);
  const rightBrow = new THREE.Mesh(browGeo, hairMat);
  rightBrow.rotation.z = Math.PI / 2 + 0.12;
  rightBrow.position.set(0.3, 0.26, 0.7);
  headGroup.add(rightBrow);

  // Bindi
  const bindi = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), darkMat);
  bindi.position.set(0, 0.24, 0.73);
  headGroup.add(bindi);

  // Sorriso
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 12, 24, Math.PI), mouthMat);
  smile.position.set(0, -0.3, 0.72);
  smile.rotation.z = Math.PI;
  headGroup.add(smile);

  // Sardas
  const freckleGeo = new THREE.SphereGeometry(0.018, 8, 8);
  [
    [-0.36, -0.18, 0.68], [-0.44, -0.14, 0.63], [-0.4, -0.24, 0.64],
    [0.36, -0.18, 0.68], [0.44, -0.14, 0.63], [0.4, -0.24, 0.64],
  ].forEach(([x, y, z]) => {
    const freckle = new THREE.Mesh(freckleGeo, blushMat);
    freckle.position.set(x, y, z);
    headGroup.add(freckle);
  });

  // Corpo: blazer verde + camiseta preta + colar
  const blazer = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.5, 8, 24), blazerMat);
  blazer.position.y = 0.35;
  chara.add(blazer);

  const shirt = new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 32), shirtMat);
  shirt.scale.set(0.95, 0.7, 0.45);
  shirt.position.set(0, 0.66, 0.42);
  chara.add(shirt);

  const necklace = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 12, 32), goldMat);
  necklace.position.set(0, 0.6, 0.5);
  necklace.rotation.x = 1.35;
  chara.add(necklace);

  // Braços (pivô no ombro; o direito acena)
  function createArm(side) {
    const group = new THREE.Group();
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.4, 8, 16), blazerMat);
    sleeve.position.y = -0.28;
    group.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.125, 24, 24), skinMat);
    hand.position.y = -0.58;
    group.add(hand);
    group.position.set(side * 0.56, 0.62, 0.3);
    group.rotation.z = side * -0.28;
    return group;
  }
  const leftArm = createArm(-1);
  const rightArm = createArm(1);
  chara.add(leftArm, rightArm);

  // Pernas jeans + barra + sapatos
  function createLeg(side) {
    const group = new THREE.Group();
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.35, 8, 16), jeansMat);
    group.add(leg);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 24), cuffMat);
    cuff.position.y = -0.3;
    group.add(cuff);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 24), shoeMat);
    shoe.scale.set(1, 0.65, 1.35);
    shoe.position.set(0, -0.44, 0.07);
    group.add(shoe);
    group.position.set(side * 0.23, -0.72, 0);
    return group;
  }
  chara.add(createLeg(-1), createLeg(1));

  chara.scale.setScalar(0.68);
  chara.position.y = -0.12;

  // ── Modelo .glb opcional ───────────────────────────────────────
  // Se existir assets/cosmo.glb no repositório, ele substitui a
  // personagem geométrica automaticamente (modelo esculpido, ex.:
  // gerado por IA a partir de uma imagem de referência).
  let model = null;
  (async () => {
    try {
      const head = await fetch("assets/cosmo.glb", { method: "HEAD" });
      if (!head.ok) return;
      const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
      const gltf = await new GLTFLoader().loadAsync("assets/cosmo.glb");
      const loaded = gltf.scene;

      // Centraliza e redimensiona para ~2.3 de altura
      const box = new THREE.Box3().setFromObject(loaded);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = 2.3 / (size.y || 1);
      loaded.scale.setScalar(scale);
      loaded.position.sub(center.multiplyScalar(scale));
      loaded.position.y += 0.1;

      const wrapper = new THREE.Group();
      wrapper.add(loaded);
      scene.add(wrapper);
      model = wrapper;
      chara.visible = false;
    } catch (err) {
      console.warn("Modelo assets/cosmo.glb não carregado:", err);
    }
  })();

  // ── Elementos tecnológicos ─────────────────────────────────────
  // Anéis de holograma na base
  const ring1 = new THREE.Mesh(
    new THREE.TorusGeometry(1.0, 0.02, 12, 64),
    new THREE.MeshBasicMaterial({ color: 0x8b7bff, transparent: true, opacity: 0.7 })
  );
  ring1.rotation.x = Math.PI / 2;
  ring1.position.y = -0.98;
  scene.add(ring1);

  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(1.3, 0.015, 12, 64),
    new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.45 })
  );
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = -1.02;
  scene.add(ring2);

  // Satélites de dados orbitando
  function createOrbiter(geometry, color, radius, speed, height, phase) {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color }));
    scene.add(mesh);
    return { mesh, radius, speed, height, phase };
  }
  const orbiters = [
    createOrbiter(new THREE.OctahedronGeometry(0.09), 0x8b7bff, 1.55, 0.7, 0.5, 0),
    createOrbiter(new THREE.BoxGeometry(0.1, 0.1, 0.1), 0x67e8f9, 1.8, -0.5, 0.1, 2.1),
    createOrbiter(new THREE.TetrahedronGeometry(0.1), 0xf0abfc, 1.4, 0.95, 1.0, 4.2),
  ];

  // Campo de estrelas
  function createStarfield(count, radius, color, size) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = radius * (0.6 + Math.random() * 0.4);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color, size, sizeAttenuation: true });
    return new THREE.Points(geometry, material);
  }
  const stars = createStarfield(700, 9, 0x9a8cff, 0.025);
  scene.add(stars);

  // ── Interação ──────────────────────────────────────────────────
  const mouse = { x: 0, y: 0 };
  window.addEventListener("pointermove", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (event.clientY / window.innerHeight) * 2 - 1;
  });

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height || 1;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  const startTime = performance.now();
  function animate() {
    requestAnimationFrame(animate);
    const t = (performance.now() - startTime) / 1000;

    // Flutuação suave (personagem geométrica ou modelo .glb)
    const actor = model || chara;
    actor.position.y = -0.12 + Math.sin(t * 1.3) * 0.08;
    actor.rotation.z = Math.sin(t * 0.6) * 0.02;

    if (model) {
      // Modelo esculpido: o corpo inteiro segue o mouse
      const targetModelY = mouse.x * 0.45;
      const targetModelX = mouse.y * 0.15;
      model.rotation.y += (targetModelY - model.rotation.y) * 0.06;
      model.rotation.x += (targetModelX - model.rotation.x) * 0.06;
    } else {
      // Cabeça segue o mouse (com suavização)
      const targetHeadY = mouse.x * 0.5;
      const targetHeadX = mouse.y * 0.3;
      headGroup.rotation.y += (targetHeadY - headGroup.rotation.y) * 0.08;
      headGroup.rotation.x += (targetHeadX - headGroup.rotation.x) * 0.08;

      // Corpo acompanha de leve
      const targetBodyY = mouse.x * 0.15;
      chara.rotation.y += (targetBodyY - chara.rotation.y) * 0.05;
    }

    // Olhos deslizam um pouquinho
    eyes.position.x = mouse.x * 0.05;
    eyes.position.y = -mouse.y * 0.03;

    // Piscada a cada ~4s
    const blinkPhase = t % 4;
    const blink = blinkPhase < 0.22 ? 1 - Math.sin((Math.PI * blinkPhase) / 0.22) * 0.92 : 1;
    leftEye.scale.y = blink;
    rightEye.scale.y = blink;

    // Aceno do braço direito a cada ~7s
    const wavePhase = t % 7;
    if (wavePhase < 1.4) {
      const envelope = Math.sin((Math.PI * wavePhase) / 1.4);
      rightArm.rotation.z = -0.28 - envelope * (2.15 + Math.sin(t * 12) * 0.22);
    } else {
      rightArm.rotation.z += (-0.28 - rightArm.rotation.z) * 0.1;
    }

    // Anéis de holograma pulsam
    const pulse = 1 + Math.sin(t * 2.2) * 0.05;
    ring1.scale.setScalar(pulse);
    ring2.scale.setScalar(1 + Math.sin(t * 2.2 + 1.5) * 0.05);
    ring1.material.opacity = 0.55 + Math.sin(t * 2.2) * 0.2;
    ring2.material.opacity = 0.35 + Math.sin(t * 2.2 + 1.5) * 0.15;

    // Satélites de dados orbitam
    orbiters.forEach(({ mesh, radius, speed, height, phase }) => {
      const angle = t * speed + phase;
      mesh.position.set(
        Math.cos(angle) * radius,
        height + Math.sin(t * 1.7 + phase) * 0.15,
        Math.sin(angle) * radius
      );
      mesh.rotation.x = t * 1.2;
      mesh.rotation.y = t * 0.9;
    });

    // Estrelas giram devagar
    stars.rotation.y = t * 0.02;

    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}
