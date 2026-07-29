import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.getElementById("cosmos-canvas");
if (canvas) {
  const container = canvas.parentElement;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;
  controls.minDistance = 3.5;
  controls.maxDistance = 10;

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.6, 1),
    new THREE.MeshBasicMaterial({ color: 0x8b7bff, wireframe: true })
  );
  scene.add(core);

  const innerGlow = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.1, 2),
    new THREE.MeshBasicMaterial({ color: 0x4b38f5, wireframe: true, transparent: true, opacity: 0.5 })
  );
  scene.add(innerGlow);

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

  const stars = createStarfield(900, 8, 0xffffff, 0.02);
  scene.add(stars);

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
    const elapsed = (performance.now() - startTime) / 1000;
    core.rotation.y = elapsed * 0.15;
    innerGlow.rotation.y = -elapsed * 0.2;
    stars.rotation.y = elapsed * 0.02;
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}
