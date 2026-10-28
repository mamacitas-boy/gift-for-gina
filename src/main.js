import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import './style.css';

RectAreaLightUniformsLib.init();

const CONFIG_VERSION = 1;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const SURFACES = ['front', 'back', 'left', 'right', 'ceiling'];
const SURFACE_LABELS = { front: 'Front wall', back: 'Back wall', left: 'Left wall', right: 'Right wall', ceiling: 'Ceiling' };

const svgImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#c8955a"/><stop offset="1" stop-color="#4a554e"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><path d="M0 286 180 136l120 64 108-96 232 166H0Z" fill="#1e2825" opacity=".72"/><circle cx="486" cy="98" r="56" fill="#edc280" opacity=".85"/><path d="M0 318 220 178l84 44 146-94 190 132v100H0Z" fill="#0c1210" opacity=".8"/></svg>`)}`;

const DEFAULT_CONTENT = [
  { id: 'hero', type: 'text', surface: 'back', text: 'ROOMSCAPE', caption: 'A quiet place to begin. Look closer.', x: -1.6, y: 3.2, rotation: 0, scale: 1.0, opacity: 1, width: 3.9 },
  { id: 'field-note', type: 'text', surface: 'back', text: 'The pause between places', caption: 'A room can hold a thought before it becomes a plan.', x: 1.7, y: 1.7, rotation: 0, scale: 1.0, opacity: 1, width: 2.5 },
  { id: 'soft-geometry', type: 'text', surface: 'left', text: 'Soft geometry', caption: 'Warm plaster, long shadows, a little room to think.', x: -0.5, y: 2.4, rotation: 0, scale: 1.0, opacity: 1, width: 2.6 },
  { id: 'viewfinder', type: 'image', surface: 'right', text: 'Keep looking', caption: 'Turn the room around.', source: svgImage, sourceName: 'Example image', x: 0.4, y: 2.45, rotation: 0, scale: 1.0, opacity: 1, width: 2.8 },
  { id: 'ceiling-study', type: 'text', surface: 'ceiling', text: 'Above / below', caption: 'A new kind of horizon.', x: -0.9, y: 1.1, rotation: 0, scale: 0.9, opacity: 1, width: 2.3 },
];

const DEFAULT_CONFIG = {
  version: CONFIG_VERSION,
  room: { width: 9.2, depth: 9, height: 5 },
  materials: { wall: '#b8b0a5', floor: '#5f625d', ceiling: '#d1c8bb', background: '#131716', wallRoughness: 0.88, floorRoughness: 0.73 },
  lighting: { exposure: 1.12, keyIntensity: 3.1, ambientIntensity: 1.8, warmth: 0.5 },
  camera: { orbitSensitivity: 0.42, maxDistance: 3.25 },
  content: DEFAULT_CONTENT,
};

const state = {
  config: null,
  mode: 'view',
  contentType: 'text',
  selectedItemId: null,
  pendingImageSource: '',
  pendingImageName: '',
  drag: null,
};

const sceneHost = document.querySelector('#scene');
const webglHost = document.querySelector('#webgl-layer');
const cssHost = document.querySelector('#css3d-layer');
const scene = new THREE.Scene();
const cssScene = new THREE.Scene();
const roomGroup = new THREE.Group();
scene.add(roomGroup);

const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
webglHost.appendChild(renderer.domElement);

const cssRenderer = new CSS3DRenderer();
cssRenderer.domElement.className = 'css3d-renderer';
cssHost.appendChild(cssRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.enablePan = false;
controls.minPolarAngle = 0.4;
controls.maxPolarAngle = 2.72;
controls.minAzimuthAngle = -Infinity;
controls.maxAzimuthAngle = Infinity;
controls.touches.ONE = THREE.TOUCH.ROTATE;
controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

let metrics = {};
let surfaceGroups = {};
let contentObjects = new Map();
let roomMaterials = {};
let keyLight;
let ambientLight;
let backWash;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeConfig(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const config = clone(DEFAULT_CONFIG);
  for (const group of ['room', 'materials', 'lighting', 'camera']) {
    if (source[group] && typeof source[group] === 'object') Object.assign(config[group], source[group]);
  }
  if (Array.isArray(source.content)) config.content = source.content.map(normalizeContent).filter(Boolean);
  config.version = CONFIG_VERSION;
  config.room.width = THREE.MathUtils.clamp(Number(config.room.width) || 9.2, 6.5, 13);
  config.room.depth = THREE.MathUtils.clamp(Number(config.room.depth) || 9, 6.5, 13);
  config.room.height = THREE.MathUtils.clamp(Number(config.room.height) || 5, 3.8, 7);
  config.materials.wall = normalizeColor(config.materials.wall, DEFAULT_CONFIG.materials.wall);
  config.materials.floor = normalizeColor(config.materials.floor, DEFAULT_CONFIG.materials.floor);
  config.materials.ceiling = normalizeColor(config.materials.ceiling, DEFAULT_CONFIG.materials.ceiling);
  config.materials.background = normalizeColor(config.materials.background, DEFAULT_CONFIG.materials.background);
  config.materials.wallRoughness = THREE.MathUtils.clamp(Number(config.materials.wallRoughness) || DEFAULT_CONFIG.materials.wallRoughness, 0, 1);
  config.materials.floorRoughness = THREE.MathUtils.clamp(Number(config.materials.floorRoughness) || DEFAULT_CONFIG.materials.floorRoughness, 0, 1);
  config.lighting.exposure = THREE.MathUtils.clamp(Number(config.lighting.exposure) || DEFAULT_CONFIG.lighting.exposure, 0.5, 2);
  config.lighting.keyIntensity = THREE.MathUtils.clamp(Number(config.lighting.keyIntensity) || 3.1, 0.5, 5);
  config.lighting.ambientIntensity = THREE.MathUtils.clamp(Number(config.lighting.ambientIntensity) || DEFAULT_CONFIG.lighting.ambientIntensity, 0, 4);
  config.lighting.warmth = THREE.MathUtils.clamp(Number(config.lighting.warmth) || DEFAULT_CONFIG.lighting.warmth, 0, 1);
  config.camera.orbitSensitivity = THREE.MathUtils.clamp(Number(config.camera.orbitSensitivity) || 0.42, 0.15, 0.9);
  config.camera.maxDistance = THREE.MathUtils.clamp(Number(config.camera.maxDistance) || DEFAULT_CONFIG.camera.maxDistance, 1.5, 6);
  const seenIds = new Set();
  config.content = config.content.filter(Boolean).map((item) => {
    let normalized = item;
    while (seenIds.has(normalized.id)) normalized = { ...normalized, id: `${normalized.id}-${Math.random().toString(16).slice(2)}` };
    seenIds.add(normalized.id);
    return normalized;
  });
  config.content = config.content.length ? config.content : clone(DEFAULT_CONTENT);
  config.content.forEach((item) => {
    item.y = THREE.MathUtils.clamp(item.y, 0.35, config.room.height - 0.4);
  });
  return config;
}

function normalizeColor(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    const color = new THREE.Color(value);
    return `#${color.getHexString()}`;
  } catch {
    return fallback;
  }
}

function isSafeImageSource(source) {
  if (source.startsWith('data:image/')) return true;
  try {
    const url = new URL(source, window.location.href);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeContent(item) {
  if (!item || !SURFACES.includes(item.surface)) return null;
  const type = item.type === 'image' ? 'image' : 'text';
  if (type === 'image' && (typeof item.source !== 'string' || !isSafeImageSource(item.source))) return null;
  return {
    id: String(item.id || `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    type,
    surface: item.surface,
    text: String(item.text || (type === 'image' ? 'Image study' : 'Untitled note')).slice(0, 88),
    caption: String(item.caption || (type === 'image' ? 'A new image in the room.' : 'A note placed in the room.')).slice(0, 180),
    source: type === 'image' ? item.source : '',
    sourceName: String(item.sourceName || 'Image'),
    x: THREE.MathUtils.clamp(Number.isFinite(Number(item.x)) ? Number(item.x) : 0, -5, 5),
    y: THREE.MathUtils.clamp(Number.isFinite(Number(item.y)) ? Number(item.y) : 2.2, 0.35, 6.5),
    rotation: THREE.MathUtils.clamp(Number(item.rotation) || 0, -180, 180),
    scale: THREE.MathUtils.clamp(Number(item.scale) || 1, 0.45, 1.8),
    opacity: THREE.MathUtils.clamp(Number(item.opacity) || 1, 0.2, 1),
    width: THREE.MathUtils.clamp(Number(item.width) || 2.8, 1.2, 5),
  };
}

async function loadConfig() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}roomscape.config`, { cache: 'default' });
    if (!response.ok) throw new Error('config not found');
    const parsed = await response.json();
    if (Number(parsed.version) > CONFIG_VERSION) throw new Error('unsupported config version');
    return mergeConfig(parsed);
  } catch {
    return mergeConfig(DEFAULT_CONFIG);
  }
}

function createWall(name, start, end, material) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(-dz, dx);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, metrics.wallHeight, metrics.wallThickness), material);
  mesh.name = name;
  mesh.position.set((start.x + end.x) / 2, metrics.wallHeight / 2, (start.z + end.z) / 2);
  mesh.rotation.y = angle;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  roomGroup.add(mesh);

  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: 0x665f58, transparent: true, opacity: 0.24 }));
  edges.position.copy(mesh.position);
  edges.rotation.copy(mesh.rotation);
  roomGroup.add(edges);
  return { mesh, angle, center: mesh.position.clone() };
}

function createQuad(name, points, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap((point) => [point.x, point.y, point.z]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  roomGroup.add(mesh);
}

function createBeam(start, end) {
  const startVector = new THREE.Vector3(start.x, start.y, start.z);
  const endVector = new THREE.Vector3(end.x, end.y, end.z);
  const direction = endVector.clone().sub(startVector);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, direction.length(), 8), new THREE.MeshStandardMaterial({ color: 0x655f58, roughness: 0.75 }));
  beam.position.copy(startVector).add(endVector).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  beam.castShadow = true;
  roomGroup.add(beam);
}

function clearRoom() {
  while (roomGroup.children.length) {
    const child = roomGroup.children.pop();
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
    else child.material?.dispose?.();
  }
  while (cssScene.children.length) {
    const child = cssScene.children.pop();
    child.traverse((object) => object.element?.remove());
  }
  contentObjects = new Map();
}

function createSurfaceGroup(name, position, rotationY = 0, rotationX = 0) {
  const group = new THREE.Group();
  group.name = `${name} HTML surface`;
  group.position.copy(position);
  group.rotation.set(rotationX, rotationY, 0);
  cssScene.add(group);
  return group;
}

function buildRoom() {
  clearRoom();
  const config = state.config;
  metrics = {
    backZ: -config.room.depth / 2,
    frontZ: config.room.depth / 2,
    backHalfWidth: config.room.width / 2,
    frontHalfWidth: config.room.width * 0.74,
    height: config.room.height,
    wallHeight: config.room.height - 0.18,
    wallThickness: 0.18,
    floorY: 0,
  };
  roomMaterials = {
    wall: new THREE.MeshStandardMaterial({ color: config.materials.wall, roughness: config.materials.wallRoughness, metalness: 0.02, side: THREE.DoubleSide }),
    side: new THREE.MeshStandardMaterial({ color: config.materials.wall, roughness: Math.min(1, config.materials.wallRoughness + 0.03), metalness: 0.02, side: THREE.DoubleSide }),
    ceiling: new THREE.MeshStandardMaterial({ color: config.materials.ceiling, roughness: 0.82, side: THREE.DoubleSide }),
    floor: new THREE.MeshStandardMaterial({ color: config.materials.floor, roughness: config.materials.floorRoughness, metalness: 0.08, side: THREE.DoubleSide }),
  };

  const backWall = createWall('Back wall', { x: -metrics.backHalfWidth, z: metrics.backZ }, { x: metrics.backHalfWidth, z: metrics.backZ }, roomMaterials.wall);
  const leftWall = createWall('Left wall', { x: -metrics.frontHalfWidth, z: metrics.frontZ }, { x: -metrics.backHalfWidth, z: metrics.backZ }, roomMaterials.side);
  const rightWall = createWall('Right wall', { x: metrics.backHalfWidth, z: metrics.backZ }, { x: metrics.frontHalfWidth, z: metrics.frontZ }, roomMaterials.side);
  const frontWall = createWall('Front wall', { x: -metrics.frontHalfWidth, z: metrics.frontZ }, { x: metrics.frontHalfWidth, z: metrics.frontZ }, roomMaterials.wall);
  void frontWall;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(metrics.frontHalfWidth * 2.3, config.room.depth * 1.45), roomMaterials.floor);
  floor.name = 'Floor';
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, metrics.floorY - 0.03, 0);
  floor.receiveShadow = true;
  roomGroup.add(floor);

  createQuad('Central ceiling panel', [{ x: -metrics.backHalfWidth, y: metrics.height, z: metrics.backZ }, { x: metrics.backHalfWidth, y: metrics.height, z: metrics.backZ }, { x: metrics.backHalfWidth, y: metrics.height, z: 0.85 }, { x: -metrics.backHalfWidth, y: metrics.height, z: 0.85 }], roomMaterials.ceiling);
  createQuad('Forward ceiling panel', [{ x: -metrics.backHalfWidth, y: metrics.height, z: 0.85 }, { x: metrics.backHalfWidth, y: metrics.height, z: 0.85 }, { x: metrics.backHalfWidth + 0.75, y: metrics.height - 0.16, z: metrics.frontZ }, { x: -metrics.backHalfWidth - 0.75, y: metrics.height - 0.16, z: metrics.frontZ }], roomMaterials.ceiling);
  createQuad('Left sloped ceiling wing', [{ x: -metrics.backHalfWidth, y: metrics.height, z: metrics.backZ }, { x: -metrics.backHalfWidth, y: metrics.height, z: 0.85 }, { x: -metrics.backHalfWidth - 0.75, y: metrics.height - 0.16, z: metrics.frontZ }, { x: -metrics.frontHalfWidth, y: metrics.height - 0.16, z: metrics.frontZ }], roomMaterials.ceiling);
  createQuad('Right sloped ceiling wing', [{ x: metrics.backHalfWidth, y: metrics.height, z: 0.85 }, { x: metrics.backHalfWidth, y: metrics.height, z: metrics.backZ }, { x: metrics.frontHalfWidth, y: metrics.height - 0.16, z: metrics.frontZ }, { x: metrics.backHalfWidth + 0.75, y: metrics.height - 0.16, z: metrics.frontZ }], roomMaterials.ceiling);
  createBeam({ x: -metrics.backHalfWidth, y: metrics.height + 0.015, z: 0.85 }, { x: metrics.backHalfWidth, y: metrics.height + 0.015, z: 0.85 });
  createBeam({ x: -metrics.backHalfWidth, y: metrics.height + 0.015, z: 0.85 }, { x: -metrics.backHalfWidth - 0.75, y: metrics.height - 0.145, z: metrics.frontZ });
  createBeam({ x: metrics.backHalfWidth, y: metrics.height + 0.015, z: 0.85 }, { x: metrics.backHalfWidth + 0.75, y: metrics.height - 0.145, z: metrics.frontZ });

  const leftNormal = new THREE.Vector3(Math.sin(leftWall.angle), 0, Math.cos(leftWall.angle));
  const rightNormal = new THREE.Vector3(Math.sin(rightWall.angle), 0, Math.cos(rightWall.angle));
  surfaceGroups = {
    back: createSurfaceGroup('Back wall', new THREE.Vector3(0, 0.12, metrics.backZ + metrics.wallThickness / 2 + 0.045)),
    front: createSurfaceGroup('Front wall', new THREE.Vector3(0, 0.12, metrics.frontZ - metrics.wallThickness / 2 - 0.045), Math.PI),
    left: createSurfaceGroup('Left wall', leftWall.center.clone().add(leftNormal.multiplyScalar(metrics.wallThickness / 2 + 0.045)).setY(0.12), leftWall.angle),
    right: createSurfaceGroup('Right wall', rightWall.center.clone().add(rightNormal.multiplyScalar(metrics.wallThickness / 2 + 0.045)).setY(0.12), rightWall.angle),
    ceiling: createSurfaceGroup('Ceiling', new THREE.Vector3(0, metrics.height + 0.04, -1.45), 0, -Math.PI / 2),
  };
  updateLightPositions();
  addSurfaceLabels();
  renderContentObjects();
  applyAppearance();
  updateCameraBounds();
}

function addSurfaceLabels() {
  for (const surface of SURFACES) {
    const element = document.createElement('div');
    element.className = 'surface-label';
    element.textContent = SURFACE_LABELS[surface];
    const object = new CSS3DObject(element);
    object.scale.setScalar(0.01);
    const positions = { back: { x: -3.8, y: 4.25 }, front: { x: -3.8, y: 4.25 }, left: { x: -3.1, y: 4.25 }, right: { x: -3.1, y: 4.25 }, ceiling: { x: -3.7, y: 0.3 } };
    object.position.set(positions[surface].x, positions[surface].y, 0.03);
    object.userData.isLabel = true;
    surfaceGroups[surface].add(object);
  }
}

function createContentElement(item) {
  const element = document.createElement('article');
  element.className = `content-object ${item.type === 'image' ? 'content-image-object' : 'content-text-object'}`;
  element.dataset.contentId = item.id;
  element.tabIndex = 0;
  element.setAttribute('role', 'button');
  element.setAttribute('aria-label', `${item.type === 'image' ? 'Image' : 'Text'} on ${SURFACE_LABELS[item.surface]}: ${item.text}`);

  const header = document.createElement('div');
  header.className = 'content-object-header';
  const kicker = document.createElement('span');
  kicker.textContent = item.type === 'image' ? item.sourceName : 'Room note';
  const marker = document.createElement('span');
  marker.textContent = '///';
  header.append(kicker, marker);
  element.append(header);

  if (item.type === 'image') {
    const image = document.createElement('img');
    image.src = item.source;
    image.alt = item.text || item.sourceName;
    image.className = 'content-image';
    image.loading = 'lazy';
    element.append(image);
  }
  const title = document.createElement('h3');
  title.textContent = item.text;
  const caption = document.createElement('p');
  caption.textContent = item.caption;
  element.append(title, caption);

  element.addEventListener('pointerdown', (event) => startObjectDrag(event, item));
  element.addEventListener('click', () => selectContent(item.id));
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectContent(item.id);
    }
  });
  return element;
}

function updateContentObject(item) {
  const object = contentObjects.get(item.id);
  if (!object) return;
  object.position.set(item.x, item.y, 0.05);
  object.rotation.z = THREE.MathUtils.degToRad(item.rotation);
  object.scale.setScalar(0.01 * item.scale);
  object.element.style.width = `${item.width * 100}px`;
  object.element.style.opacity = String(item.opacity);
  object.element.setAttribute('aria-label', `${item.type === 'image' ? 'Image' : 'Text'} on ${SURFACE_LABELS[item.surface]}: ${item.text}`);
}

function clearContentObjects() {
  for (const object of contentObjects.values()) {
    object.element.remove();
    object.parent?.remove(object);
  }
  contentObjects = new Map();
}

function renderContentObjects() {
  clearContentObjects();
  for (const item of state.config.content) {
    const element = createContentElement(item);
    const object = new CSS3DObject(element);
    surfaceGroups[item.surface].add(object);
    contentObjects.set(item.id, object);
    updateContentObject(item);
  }
  refreshObjectList();
  if (state.selectedItemId) selectContent(state.selectedItemId, false);
}

function selectContent(id, scroll = true) {
  if (!state.config.content.some((item) => item.id === id)) return;
  state.selectedItemId = id;
  for (const [itemId, object] of contentObjects) object.element.classList.toggle('is-selected', itemId === id);
  const item = state.config.content.find((entry) => entry.id === id);
  syncTransformControls(item);
  if (scroll) document.querySelector(`[data-list-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' });
}

function syncTransformControls(item) {
  const controlsRoot = document.querySelector('#transform-controls');
  const disabled = !item;
  controlsRoot.classList.toggle('is-disabled', disabled);
  controlsRoot.setAttribute('aria-disabled', String(disabled));
  document.querySelector('#selected-name').textContent = item ? item.type.toUpperCase() : 'NONE';
  const inputs = { x: '#position-x', y: '#position-y', rotation: '#rotation', scale: '#scale', opacity: '#opacity' };
  for (const selector of Object.values(inputs)) document.querySelector(selector).disabled = disabled;
  document.querySelectorAll('.nudge-button, #duplicate-object, #delete-object').forEach((button) => { button.disabled = disabled; });
  if (!item) return;
  document.querySelector(inputs.x).value = item.x;
  document.querySelector(inputs.y).value = item.y;
  document.querySelector(inputs.rotation).value = item.rotation;
  document.querySelector(inputs.scale).value = item.scale;
  document.querySelector(inputs.opacity).value = item.opacity;
  updateTransformOutputs(item);
}

function updateTransformOutputs(item) {
  document.querySelector('#position-x-value').textContent = `${Number(item.x).toFixed(2)}m`;
  document.querySelector('#position-y-value').textContent = `${Number(item.y).toFixed(2)}m`;
  document.querySelector('#rotation-value').textContent = `${Math.round(item.rotation)}°`;
  document.querySelector('#scale-value').textContent = `${Number(item.scale).toFixed(2)}×`;
  document.querySelector('#opacity-value').textContent = `${Math.round(item.opacity * 100)}%`;
}

function refreshObjectList() {
  const list = document.querySelector('#content-list');
  list.replaceChildren();
  for (const item of state.config.content) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `content-list-item${item.id === state.selectedItemId ? ' is-selected' : ''}`;
    button.dataset.listId = item.id;
    const title = document.createElement('strong');
    title.textContent = item.text;
    const meta = document.createElement('span');
    meta.textContent = `${item.type} · ${SURFACE_LABELS[item.surface]}`;
    button.append(title, meta);
    button.addEventListener('click', () => selectContent(item.id));
    list.append(button);
  }
  document.querySelector('#object-count').textContent = String(state.config.content.length).padStart(2, '0');
}

function getSelectedItem() {
  return state.config.content.find((item) => item.id === state.selectedItemId);
}

function startObjectDrag(event, item) {
  if (state.mode !== 'edit' || event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  selectContent(item.id, false);
  state.drag = { itemId: item.id, startX: event.clientX, startY: event.clientY, itemX: item.x, itemY: item.y };
  event.currentTarget.setPointerCapture?.(event.pointerId);
  window.addEventListener('pointermove', moveObjectDrag);
  window.addEventListener('pointerup', endObjectDrag, { once: true });
}

function moveObjectDrag(event) {
  if (!state.drag) return;
  const item = state.config.content.find((entry) => entry.id === state.drag.itemId);
  if (!item) return;
  item.x = THREE.MathUtils.clamp(state.drag.itemX + (event.clientX - state.drag.startX) / 110, -5, 5);
  item.y = THREE.MathUtils.clamp(state.drag.itemY - (event.clientY - state.drag.startY) / 110, 0.35, metrics.height - 0.4);
  updateContentObject(item);
  syncTransformControls(item);
}

function endObjectDrag() {
  state.drag = null;
  window.removeEventListener('pointermove', moveObjectDrag);
}

function applyAppearance() {
  const config = state.config;
  scene.background = new THREE.Color(config.materials.background);
  renderer.toneMappingExposure = Number(config.lighting.exposure) || 1.12;
  if (roomMaterials.wall) roomMaterials.wall.color.set(config.materials.wall);
  if (roomMaterials.side) roomMaterials.side.color.set(config.materials.wall);
  if (roomMaterials.floor) roomMaterials.floor.color.set(config.materials.floor);
  if (roomMaterials.ceiling) roomMaterials.ceiling.color.set(config.materials.ceiling);
  if (roomMaterials.wall) roomMaterials.wall.roughness = Number(config.materials.wallRoughness) || 0.88;
  if (roomMaterials.floor) roomMaterials.floor.roughness = Number(config.materials.floorRoughness) || 0.73;
  if (keyLight) keyLight.intensity = Number(config.lighting.keyIntensity) || 3.1;
  if (ambientLight) ambientLight.intensity = Number(config.lighting.ambientIntensity) || 1.8;
  document.querySelector('#background-color').value = config.materials.background;
}

function updateLightPositions() {
  if (!backWash) return;
  backWash.position.set(0, metrics.height * 0.61, metrics.backZ + 0.25);
}

function updateCameraBounds() {
  controls.target.set(0, metrics.height * 0.48, 0);
  controls.minDistance = 1.15;
  controls.maxDistance = Math.min(Number(state.config.camera.maxDistance) || 3.25, metrics.backHalfWidth - 0.65, metrics.frontZ - 0.65, metrics.height * 0.58);
  controls.rotateSpeed = Number(state.config.camera.orbitSensitivity) || 0.42;
}

function resetCamera() {
  camera.position.set(0, metrics.height * 0.48, Math.min(2.65, metrics.frontZ - 0.95));
  controls.target.set(0, metrics.height * 0.48, 0);
  controls.update();
}

function clampCameraInsideRoom() {
  const padding = 0.38;
  const minZ = metrics.backZ + padding;
  const maxZ = metrics.frontZ - padding;
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, minZ, maxZ);
  camera.position.y = THREE.MathUtils.clamp(camera.position.y, 0.7, metrics.height - 0.55);
  const progress = THREE.MathUtils.clamp((camera.position.z - metrics.backZ) / (metrics.frontZ - metrics.backZ), 0, 1);
  const halfWidth = THREE.MathUtils.lerp(metrics.backHalfWidth, metrics.frontHalfWidth, progress) - padding;
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -halfWidth, halfWidth);
}

function resize() {
  const width = sceneHost.clientWidth;
  const height = sceneHost.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 768 ? 1.5 : 2));
  renderer.setSize(width, height);
  cssRenderer.setSize(width, height);
}

function createLights() {
  scene.add(new THREE.HemisphereLight(0xe9dfd1, 0x242b28, 1.2));
  ambientLight = new THREE.AmbientLight(0xd8ded4, state.config.lighting.ambientIntensity);
  scene.add(ambientLight);
  keyLight = new THREE.DirectionalLight(0xfff0d8, state.config.lighting.keyIntensity);
  keyLight.position.set(-3.6, 8.6, 4.2);
  keyLight.target.position.set(0, 1.2, 0);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1536, 1536);
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 30;
  keyLight.shadow.camera.left = -10;
  keyLight.shadow.camera.right = 10;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -2;
  scene.add(keyLight, keyLight.target);
  const fillLight = new THREE.PointLight(0x98b1ab, 10, 13, 2);
  fillLight.position.set(0, 3.25, 1.8);
  scene.add(fillLight);
  backWash = new THREE.RectAreaLight(0xe3b272, 3.5, 7, 2.2);
  backWash.position.set(0, 3.05, metrics.backZ + 0.25);
  backWash.rotation.y = Math.PI;
  scene.add(backWash);
  updateLightPositions();
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.mode-tab').forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  const edit = mode === 'edit';
  document.querySelector('#view-controls').classList.toggle('is-hidden', edit);
  document.querySelector('#edit-controls').classList.toggle('is-hidden', !edit);
  document.querySelector('#view-controls').setAttribute('aria-hidden', String(edit));
  document.querySelector('#edit-controls').setAttribute('aria-hidden', String(!edit));
  cssHost.classList.toggle('is-editing', edit);
  if (!edit) {
    state.drag = null;
    document.querySelectorAll('.content-object').forEach((element) => element.classList.remove('is-selected'));
  } else if (state.selectedItemId) selectContent(state.selectedItemId, false);
}

function setFeedback(message, error = false) {
  const feedback = document.querySelector('#global-feedback');
  feedback.textContent = message;
  feedback.classList.toggle('is-visible', Boolean(message));
  feedback.classList.toggle('is-error', error);
}

function bindRange(selector, output, handler) {
  const input = document.querySelector(selector);
  input.addEventListener('input', () => {
    handler(Number(input.value));
    if (output) document.querySelector(output).textContent = input.value;
  });
}

function bindEditor() {
  document.querySelector('#settings-toggle').addEventListener('click', () => {
    const panel = document.querySelector('#settings-panel');
    const open = panel.classList.toggle('is-open');
    document.querySelector('#settings-toggle').setAttribute('aria-expanded', String(open));
  });
  document.querySelector('#settings-close').addEventListener('click', () => {
    document.querySelector('#settings-panel').classList.remove('is-open');
    document.querySelector('#settings-toggle').setAttribute('aria-expanded', 'false');
  });
  document.querySelectorAll('.mode-tab').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
  document.querySelector('#reset-view').addEventListener('click', () => { resetCamera(); setFeedback('Camera recentered.'); });
  bindRange('#view-sensitivity', '#view-sensitivity-value', (value) => { state.config.camera.orbitSensitivity = value; controls.rotateSpeed = value; });
  document.querySelector('#show-labels').addEventListener('change', (event) => { document.querySelectorAll('.surface-label').forEach((label) => { label.style.opacity = event.target.checked ? '1' : '0'; }); });

  document.querySelectorAll('.type-button').forEach((button) => button.addEventListener('click', () => {
    state.contentType = button.dataset.contentType;
    document.querySelectorAll('.type-button').forEach((entry) => entry.classList.toggle('is-active', entry === button));
    document.querySelector('#text-fields').classList.toggle('is-hidden', state.contentType !== 'text');
    document.querySelector('#image-fields').classList.toggle('is-hidden', state.contentType !== 'image');
  }));

  const fileInput = document.querySelector('#image-file');
  fileInput.addEventListener('change', async () => {
    if (fileInput.files[0]) await prepareImageFile(fileInput.files[0]);
  });
  const dropZone = document.querySelector('#drop-zone');
  dropZone.addEventListener('dragover', (event) => { event.preventDefault(); dropZone.classList.add('is-dragging'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-dragging'));
  dropZone.addEventListener('drop', async (event) => { event.preventDefault(); dropZone.classList.remove('is-dragging'); if (event.dataTransfer.files[0]) await prepareImageFile(event.dataTransfer.files[0]); });

  document.querySelector('#content-form').addEventListener('submit', submitContent);
  bindRange('#content-width', '#content-width-value', (value) => { document.querySelector('#content-width-value').textContent = `${value.toFixed(1)}m`; });

  const transformBindings = { '#position-x': 'x', '#position-y': 'y', '#rotation': 'rotation', '#scale': 'scale', '#opacity': 'opacity' };
  for (const [selector, property] of Object.entries(transformBindings)) {
    document.querySelector(selector).addEventListener('input', (event) => {
      const item = getSelectedItem();
      if (!item) return;
      item[property] = Number(event.target.value);
      updateContentObject(item);
      updateTransformOutputs(item);
    });
  }
  document.querySelectorAll('.nudge-button').forEach((button) => button.addEventListener('click', () => {
    const item = getSelectedItem();
    if (!item) return;
    const amount = 0.15;
    if (button.dataset.nudge === 'left') item.x -= amount;
    if (button.dataset.nudge === 'right') item.x += amount;
    if (button.dataset.nudge === 'up') item.y += amount;
    if (button.dataset.nudge === 'down') item.y -= amount;
    item.x = THREE.MathUtils.clamp(item.x, -5, 5);
    item.y = THREE.MathUtils.clamp(item.y, 0.35, metrics.height - 0.4);
    updateContentObject(item);
    syncTransformControls(item);
  }));
  document.querySelector('#duplicate-object').addEventListener('click', duplicateSelected);
  document.querySelector('#delete-object').addEventListener('click', deleteSelected);

  for (const [selector, materialKey] of [['#wall-color', 'wall'], ['#floor-color', 'floor'], ['#ceiling-color', 'ceiling'], ['#background-color', 'background']]) {
    document.querySelector(selector).addEventListener('input', (event) => { state.config.materials[materialKey] = event.target.value; applyAppearance(); });
  }
  for (const [selector, configKey, output] of [['#room-width', 'width', '#room-width-value'], ['#room-depth', 'depth', '#room-depth-value'], ['#room-height', 'height', '#room-height-value']]) {
    document.querySelector(selector).addEventListener('input', (event) => { document.querySelector(output).textContent = `${Number(event.target.value).toFixed(1)}m`; });
    document.querySelector(selector).addEventListener('change', (event) => { state.config.room[configKey] = Number(event.target.value); buildRoom(); resetCamera(); });
  }
  bindRange('#key-light', '#key-light-value', (value) => { state.config.lighting.keyIntensity = value; applyAppearance(); });
  document.querySelector('#export-config').addEventListener('click', exportConfig);
  document.querySelector('#import-config').addEventListener('change', importConfig);
}

async function prepareImageFile(file) {
  if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) { setFeedback('Choose an image smaller than 8 MB.', true); return; }
  state.pendingImageSource = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  state.pendingImageName = file.name;
  document.querySelector('#drop-zone').textContent = `Ready: ${file.name}`;
  setFeedback('Image ready to place.');
}

function submitContent(event) {
  event.preventDefault();
  const surface = document.querySelector('#content-surface').value;
  const width = Number(document.querySelector('#content-width').value);
  let item;
  if (state.contentType === 'text') {
    const text = document.querySelector('#text-input').value.trim();
    if (!text) { setFeedback('Write a message before placing it.', true); document.querySelector('#text-input').focus(); return; }
    item = { type: 'text', text, caption: 'A new note in the room.' };
  } else {
    const url = document.querySelector('#image-url').value.trim();
    const source = state.pendingImageSource || url;
    if (!source) { setFeedback('Upload an image or paste an image URL first.', true); return; }
    if (url && !state.pendingImageSource) { try { new URL(url); } catch { setFeedback('That image URL is not valid.', true); return; } }
    item = { type: 'image', text: 'Image study', caption: 'A new image in the room.', source, sourceName: state.pendingImageName || 'Remote image' };
  }
  const created = normalizeContent({ ...item, id: `${item.type}-${Date.now()}`, surface, x: 0, y: Math.min(2.3, metrics.height - 0.8), rotation: 0, scale: 1, opacity: 1, width });
  state.config.content.push(created);
  renderContentObjects();
  selectContent(created.id);
  document.querySelector('#text-input').value = '';
  document.querySelector('#image-url').value = '';
  state.pendingImageSource = '';
  state.pendingImageName = '';
  document.querySelector('#drop-zone').textContent = 'Drop an image here';
  setFeedback(`${item.type === 'image' ? 'Image' : 'Note'} placed on the ${SURFACE_LABELS[surface].toLowerCase()}.`);
}

function duplicateSelected() {
  const item = getSelectedItem();
  if (!item) return;
  const copy = normalizeContent({ ...item, id: `${item.type}-${Date.now()}`, x: item.x + 0.35, y: item.y - 0.25 });
  state.config.content.push(copy);
  renderContentObjects();
  selectContent(copy.id);
  setFeedback('Object duplicated.');
}

function deleteSelected() {
  const item = getSelectedItem();
  if (!item) return;
  state.config.content = state.config.content.filter((entry) => entry.id !== item.id);
  state.selectedItemId = null;
  buildRoom();
  setFeedback('Object removed.');
}

function exportConfig() {
  const blob = new Blob([JSON.stringify(state.config, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'roomscape.config';
  link.click();
  URL.revokeObjectURL(link.href);
  setFeedback('Configuration exported.');
}

async function importConfig(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (Number(parsed.version) > CONFIG_VERSION) throw new Error('This config is from a newer version.');
    state.config = mergeConfig(parsed);
    state.selectedItemId = null;
    syncAppearanceInputs();
    buildRoom();
    resetCamera();
    setFeedback('Configuration imported.');
  } catch (error) {
    setFeedback(error.message || 'That config could not be imported.', true);
  } finally {
    event.target.value = '';
  }
}

function syncAppearanceInputs() {
  const config = state.config;
  for (const [selector, value] of [['#wall-color', config.materials.wall], ['#floor-color', config.materials.floor], ['#ceiling-color', config.materials.ceiling], ['#background-color', config.materials.background], ['#room-width', config.room.width], ['#room-depth', config.room.depth], ['#room-height', config.room.height], ['#key-light', config.lighting.keyIntensity], ['#view-sensitivity', config.camera.orbitSensitivity]]) document.querySelector(selector).value = value;
  document.querySelector('#room-width-value').textContent = `${Number(config.room.width).toFixed(1)}m`;
  document.querySelector('#room-depth-value').textContent = `${Number(config.room.depth).toFixed(1)}m`;
  document.querySelector('#room-height-value').textContent = `${Number(config.room.height).toFixed(1)}m`;
  document.querySelector('#key-light-value').textContent = Number(config.lighting.keyIntensity).toFixed(1);
  document.querySelector('#view-sensitivity-value').textContent = Number(config.camera.orbitSensitivity).toFixed(2);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  clampCameraInsideRoom();
  renderer.render(scene, camera);
  cssRenderer.render(cssScene, camera);
}

async function init() {
  state.config = await loadConfig();
  buildRoom();
  createLights();
  applyAppearance();
  syncAppearanceInputs();
  resetCamera();
  bindEditor();
  window.addEventListener('resize', resize);
  resize();
  setMode('view');
  animate();
}

init();
