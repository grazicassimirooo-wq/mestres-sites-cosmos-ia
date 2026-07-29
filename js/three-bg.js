import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.getElementById("cosmos-canvas");
if (canvas) {
  const container = canvas.parentElement;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0.4, 6);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 3.5;
  controls.maxDistance = 9;
  controls.target.set(0, 0.2, 0);

  // Luzes
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
  keyLight.position.set(2.5, 3, 4);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0x6d5dfc, 6, 12);
  rimLight.position.set(-2.5, -1, -3);
  scene.add(rimLight);

  // Materiais
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2f3ff, roughness: 0.35, metalness: 0.1 });
  const purpleMat = new THREE.MeshStandardMaterial({ color: 0x6d5dfc, roughness: 0.45, metalness: 0.15 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xaab6ff });

  // ── Mascote: robozinho astronauta ──────────────────────────────
  const mascot = new THREE.Group();
  scene.add(mascot);

  // Cabeça (gira seguindo o mouse)
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.95;
  mascot.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 48, 48), whiteMat);
  head.scale.set(1, 0.92, 0.95);
  headGroup.add(head);

  // Olhos brilhantes (deslizam no rosto seguindo o mouse)
  const eyes = new THREE.Group();
  const eyeGeo = new THREE.SphereGeometry(0.09, 24, 24);
  const leftEye = new THREE.Mesh(eyeGeo, glowMat);
  leftEye.position.set(-0.22, 0.06, 0.92);
  const rightEye = new THREE.Mesh(eyeGeo, glowMat);
  rightEye.position.set(0.22, 0.06, 0.92);
  eyes.add(leftEye, rightEye);
  headGroup.add(eyes);

  // Sorriso
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 12, 24, Math.PI), glowMat);
  smile.position.set(0, -0.16, 0.9);
  smile.rotation.z = Math.PI;
  headGroup.add(smile);

  // Antena
  const antennaRod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 12), purpleMat);
  antennaRod.position.set(0, 0.92, 0);
  headGroup.add(antennaRod);
  const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 24), glowMat.clone());
  antennaTip.position.set(0, 1.13, 0);
  headGroup.add(antennaTip);

  // Corpo
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 0.5, 8, 24), purpleMat);
  body.position.y = -0.35;
  mascot.add(body);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 24), glowMat);
  chest.position.set(0, -0.2, 0.5);
  mascot.add(chest);

  // Braços (com pivô no ombro para poder acenar)
  function createArm(side) {
    const group = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.42, 8, 16), whiteMat);
    arm.position.y = -0.3;
    group.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 24), purpleMat);
    hand.position.y = -0.58;
    group.add(hand);
    group.position.set(side * 0.66, 0.02, 0);
    group.rotation.z = side * -0.4;
    return group;
  }
  const leftArm = createArm(-1);
  const rightArm = createArm(1);
  mascot.add(leftArm, rightArm);

  // Pezinhos
  const footGeo = new THREE.SphereGeometry(0.18, 24, 24);
  const leftFoot = new THREE.Mesh(footGeo, whiteMat);
  leftFoot.position.set(-0.26, -1.05, 0.05);
  const rightFoot = new THREE.Mesh(footGeo, whiteMat);
  rightFoot.position.set(0.26, -1.05, 0.05);
  mascot.add(leftFoot, rightFoot);

  // ── Campo de estrelas ao redor ─────────────────────────────────
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

  // ── Interação: cabeça e olhos seguem o mouse ───────────────────
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

    // Flutuação suave
    mascot.position.y = Math.sin(t * 1.4) * 0.12 + 0.05;
    mascot.rotation.z = Math.sin(t * 0.7) * 0.03;

    // Cabeça segue o mouse (com suavização)
    const targetHeadY = mouse.x * 0.55;
    const targetHeadX = mouse.y * 0.35;
    headGroup.rotation.y += (targetHeadY - headGroup.rotation.y) * 0.08;
    headGroup.rotation.x += (targetHeadX - headGroup.rotation.x) * 0.08;

    // Corpo acompanha de leve
    const targetBodyY = mouse.x * 0.18;
    mascot.rotation.y += (targetBodyY - mascot.rotation.y) * 0.05;

    // Olhos deslizam um pouquinho
    eyes.position.x = mouse.x * 0.06;
    eyes.position.y = -mouse.y * 0.04;

    // Aceno periódico do braço direito (a cada ~6s)
    const wavePhase = t % 6;
    if (wavePhase < 1.4) {
      const envelope = Math.sin((Math.PI * wavePhase) / 1.4);
      rightArm.rotation.z = -0.4 - envelope * (1.6 + Math.sin(t * 12) * 0.25);
    } else {
      rightArm.rotation.z += (-0.4 - rightArm.rotation.z) * 0.1;
    }

    // Antena pisca
    antennaTip.material.color.setHSL(0.68, 1, 0.65 + Math.sin(t * 3) * 0.2);

    // Estrelas giram devagar
    stars.rotation.y = t * 0.02;

    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}
