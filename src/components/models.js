import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const TAU = Math.PI * 2;
const up = new THREE.Vector3(0, 1, 0);
const matrix = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();

export function seeded(index, salt = 0) {
  const value = Math.sin(index * 91.17 + salt * 37.43) * 43758.5453;
  return value - Math.floor(value);
}

// Merge the small sculpted parts: an entire flower bed uses only a few draw calls.
class Sculpture {
  constructor() {
    this.parts = [];
  }

  add(source, color, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    geometry.deleteAttribute("uv");
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    const tint = new THREE.Color(color);
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = tint.r;
      colors[i + 1] = tint.g;
      colors[i + 2] = tint.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const orientation = Array.isArray(rotation)
      ? quaternion.setFromEuler(new THREE.Euler(...rotation))
      : rotation;
    matrix.compose(new THREE.Vector3(...position), orientation, new THREE.Vector3(...scale));
    geometry.applyMatrix4(matrix);
    this.parts.push(geometry);
  }

  stem(from, to, bottom = 0.02, top = 0.012, color = "#426b50", segments = 6) {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    const cylinder = new THREE.CylinderGeometry(top, bottom, direction.length(), segments);
    this.add(cylinder, color, start.add(end).multiplyScalar(0.5).toArray(),
      new THREE.Quaternion().setFromUnitVectors(up, direction.normalize()));
    cylinder.dispose();
  }

  finish() {
    if (!this.parts.length) return new THREE.BufferGeometry();
    const geometry = mergeGeometries(this.parts, false);
    this.parts.forEach((part) => part.dispose());
    geometry.computeBoundingSphere();
    return geometry;
  }
}

// The petal is a curved ribbon, not a stretched ball. Its central ridge catches light.
function ribbon({ length = 0.5, width = 0.16, spread = 0.2, cup = 0.08, pointed = false, rows = 9 } = {}) {
  const vertices = [];
  const indices = [];
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const profile = Math.pow(Math.sin(Math.PI * t), pointed ? 0.92 : 0.56);
    for (let col = 0; col <= 4; col++) {
      const side = col / 2 - 1;
      const w = (0.006 + profile * width) * side;
      vertices.push(w, t * length, spread * t * t + cup * side * side * Math.sin(Math.PI * t));
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < 4; col++) {
      const a = row * 5 + col;
      indices.push(a, a + 1, a + 6, a, a + 6, a + 5);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const tulipPetal = ribbon({ length: 0.43, width: 0.17, spread: 0.17, cup: 0.11 });
const tulipLeaf = ribbon({ length: 0.63, width: 0.085, spread: 0.2, cup: 0.04, pointed: true });
const longLeaf = ribbon({ length: 0.35, width: 0.024, spread: 0.12, cup: 0.02, pointed: true, rows: 5 });
const broadLeaf = ribbon({ length: 0.43, width: 0.145, spread: 0.16, cup: 0.05, pointed: true });
const goldenPetal = ribbon({ length: 0.33, width: 0.06, spread: 0.055, cup: 0.02, pointed: true, rows: 6 });
const pinkPetal = ribbon({ length: 0.14, width: 0.058, spread: 0.035, cup: 0.018, rows: 5 });
const lilyPetal = ribbon({ length: 0.58, width: 0.12, spread: 0.21, cup: 0.05, pointed: true });
const grain = new THREE.IcosahedronGeometry(1, 0);
const round = new THREE.IcosahedronGeometry(1, 1);
const cone = new THREE.ConeGeometry(1, 1, 7);

function tint(color, lightness) {
  return new THREE.Color(color).lerp(new THREE.Color("#fff3ee"), lightness);
}

function addTulip(green, petals, origin, scale, color, facing = 0, bloom = 1) {
  const [x, y, z] = origin;
  green.stem(origin, [x + 0.035 * scale, y + 0.92 * scale, z], 0.021 * scale, 0.014 * scale);
  green.add(tulipLeaf, "#507e5b", [x, y + 0.14 * scale, z], [0.35, facing + 0.7, 0.3, "YXZ"], [scale, scale, scale]);
  green.add(tulipLeaf, "#6c965f", [x, y + 0.3 * scale, z], [0.35, facing + 3.5, -0.2, "YXZ"], [scale * 0.78, scale * 0.9, scale]);
  for (let i = 0; i < 6; i++) {
    const angle = i / 6 * TAU + facing;
    const radius = i % 2 ? 0.055 : 0.08;
    petals.add(tulipPetal, tint(color, i % 2 ? 0.06 : 0.24),
      [x + Math.sin(angle) * radius * scale, y + (0.9 + (i % 2 ? 0.025 : 0)) * scale, z + Math.cos(angle) * radius * scale],
      [0.16 * bloom, angle, 0, "YXZ"], [scale, scale, scale * (0.4 + bloom * 0.6)]);
  }
  petals.add(round, "#f2bf73", [x + 0.025 * scale, y + 1.01 * scale, z], [0, 0, 0], [0.033 * scale, 0.05 * scale, 0.033 * scale]);
}

function addBlossom(petals, position, scale, pale = false, rotation = [0, 0, 0]) {
  const orientation = Array.isArray(rotation)
    ? new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation))
    : rotation;
  const transform = new THREE.Matrix4().compose(new THREE.Vector3(...position),
    orientation, new THREE.Vector3(scale, scale, scale));
  for (let i = 0; i < 5; i++) {
    const petalTransform = transform.clone().multiply(new THREE.Matrix4().makeRotationZ(i / 5 * TAU));
    const mesh = pinkPetal.clone().applyMatrix4(petalTransform);
    petals.add(mesh, pale ? "#ffe0e8" : (i % 2 ? "#efa4bd" : "#ffc6d7"));
    mesh.dispose();
  }
  const center = new THREE.Vector3(0, 0, 0.035).applyMatrix4(transform);
  petals.add(grain, "#df9b52", center.toArray(), rotation, [0.022 * scale, 0.022 * scale, 0.022 * scale]);
}

function addSakura(green, petals) {
  const branches = [
    [[0, 0, 0], [-0.06, 0.85, 0], 0.13, 0.085],
    [[-0.06, 0.85, 0], [0.08, 1.6, -0.04], 0.085, 0.043],
    [[0, 1.15, 0], [-0.57, 1.7, 0.04], 0.065, 0.025],
    [[0.04, 1.35, 0], [0.61, 1.87, -0.1], 0.058, 0.022],
    [[0.06, 1.57, -0.04], [0.2, 2.16, 0], 0.043, 0.014],
    [[-0.38, 1.51, 0.04], [-0.86, 1.9, 0.08], 0.032, 0.009],
    [[0.47, 1.74, -0.07], [0.89, 2.03, 0.04], 0.028, 0.008],
    [[0.02, 1.39, -0.04], [-0.15, 1.9, 0.5], 0.045, 0.015],
    [[0.01, 1.49, -0.04], [-0.24, 2.07, -0.42], 0.038, 0.012],
  ];
  branches.forEach(([from, to, bottom, top]) => green.stem(from, to, bottom, top, "#755043", 8));
  const lobes = [[-0.66, 1.92, 0.04], [0.65, 2.06, 0], [0.1, 2.28, 0], [-0.1, 1.96, 0.38], [-0.2, 2.16, -0.35]];
  lobes.forEach((center, lobe) => {
    // A soft faceted volume gives the tree a complete silhouette between blossoms.
    petals.add(round, lobe % 2 ? "#c987a4" : "#d996b1", center, [0, lobe * 0.5, 0], [0.45, 0.34, 0.38]);
    for (let i = 0; i < 58; i++) {
      const elevation = 1 - 2 * (i + 0.5) / 58;
      const radial = Math.sqrt(1 - elevation * elevation);
      const angle = i * 2.39996 + lobe;
      const position = [center[0] + Math.cos(angle) * radial * 0.48, center[1] + elevation * 0.37, center[2] + Math.sin(angle) * radial * 0.41];
      const outward = new THREE.Vector3(Math.cos(angle) * radial, elevation, Math.sin(angle) * radial).normalize();
      const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward)
        .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), seeded(i, lobe) * TAU));
      addBlossom(petals, position, 0.88 + seeded(i, lobe + 9) * 0.36, i % 4 === 0, rotation);
    }
  });
  for (let i = 0; i < 12; i++) {
    addBlossom(petals, [(seeded(i, 7) - 0.5) * 1.8, 0.03, (seeded(i, 17) - 0.5) * 0.7], 0.36, true, [-Math.PI / 2, 0, i]);
  }
}

function addLavender(green, petals, origin, scale, phase) {
  for (let stemIndex = 0; stemIndex < 5; stemIndex++) {
    const angle = stemIndex / 5 * TAU + phase;
    const height = (0.77 + seeded(stemIndex, phase) * 0.38) * scale;
    const leanX = Math.sin(angle) * 0.16 * scale;
    const leanZ = Math.cos(angle) * 0.16 * scale;
    const [x, y, z] = origin;
    const tip = [x + leanX, y + height, z + leanZ];
    green.stem(origin, tip, 0.008 * scale, 0.006 * scale, "#6b8669", 5);
    for (let leaf = 0; leaf < 3; leaf++) {
      const t = 0.15 + leaf * 0.16;
      green.add(longLeaf, leaf % 2 ? "#8a9e83" : "#6f8f72", [x + leanX * t, y + height * t, z + leanZ * t],
        [0.75, angle + leaf * 2.3, 0, "YXZ"], [scale * 0.7, scale * 0.8, scale]);
    }
    // Tight tapered whorls make a lavender spike, without oversized bead-like flowers.
    for (let row = 0; row < 8; row++) {
      const t = 0.68 + row * 0.043;
      const radius = (0.057 - row * 0.0046) * scale;
      for (let floret = 0; floret < 4; floret++) {
        const a = floret / 4 * TAU + row * 0.72;
        petals.add(grain, ["#79549d", "#9671bc", "#b396d0"][(row + floret) % 3],
          [x + leanX * t + Math.sin(a) * radius, y + height * t, z + leanZ * t + Math.cos(a) * radius],
          [0.18, a, 0.3], [0.031 * scale, 0.044 * scale, 0.029 * scale]);
      }
    }
    petals.add(grain, "#b49bd4", tip, [0, phase, 0], [0.024 * scale, 0.043 * scale, 0.024 * scale]);
  }
}

function addSunflower(green, petals, origin, scale, facing) {
  const [x, y, z] = origin;
  const height = 1.18 * scale;
  green.stem(origin, [x + 0.03, y + height, z], 0.028 * scale, 0.018 * scale);
  for (let i = 0; i < 3; i++) {
    green.add(broadLeaf, i % 2 ? "#779256" : "#4f7748", [x, y + height * (0.2 + i * 0.23), z],
      [0.7, facing + i * 2.6, 0.1, "YXZ"], [scale, scale, scale]);
  }
  const head = new THREE.Matrix4().compose(new THREE.Vector3(x + 0.03, y + height, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, facing, 0.08)), new THREE.Vector3(scale, scale, scale));
  for (let i = 0; i < 26; i++) {
    const angle = i / 13 * TAU + (i >= 13 ? 0.24 : 0);
    const petalMatrix = head.clone()
      .multiply(new THREE.Matrix4().makeRotationZ(angle))
      .multiply(new THREE.Matrix4().makeTranslation(0, i >= 13 ? 0.105 : 0.15, i >= 13 ? -0.025 : 0));
    const petal = goldenPetal.clone().applyMatrix4(petalMatrix);
    petals.add(petal, i >= 13 ? "#e8aa38" : (i % 3 ? "#f5cd5b" : "#ffe48a"));
    petal.dispose();
  }
  petals.add(round, "#674332", [x + 0.03, y + height, z], [-0.12, facing, 0.08], [0.18 * scale, 0.18 * scale, 0.068 * scale]);
  for (let i = 0; i < 40; i++) {
    const radius = Math.sqrt((i + 0.5) / 40) * 0.153;
    const point = new THREE.Vector3(Math.cos(i * 2.39996) * radius, Math.sin(i * 2.39996) * radius, 0.063).applyMatrix4(head);
    petals.add(grain, i % 3 ? "#a27742" : "#cc9b52", point.toArray(), [0, facing, 0], [0.012 * scale, 0.012 * scale, 0.009 * scale]);
  }
}

function addLily(green, petals, origin, scale = 1) {
  const [x, y, z] = origin;
  for (let layer = 0; layer < 3; layer++) {
    const count = 10 - layer * 2;
    for (let i = 0; i < count; i++) {
      const a = i / count * TAU + layer * 0.28;
      const s = scale * (1 - layer * 0.23);
      petals.add(lilyPetal, layer === 2 ? "#f9cada" : (i % 2 ? "#ffe5ee" : "#fff2f0"),
        [x + Math.sin(a) * 0.035 * scale, y + layer * 0.05 * scale, z + Math.cos(a) * 0.035 * scale],
        [1.07 - layer * 0.36, a, 0, "YXZ"], [s, s, s]);
    }
  }
  petals.add(round, "#efc367", [x, y + 0.14 * scale, z], [0, 0, 0], [0.095 * scale, 0.045 * scale, 0.095 * scale]);
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * TAU;
    petals.stem([x + Math.sin(a) * 0.06 * scale, y + 0.15 * scale, z + Math.cos(a) * 0.06 * scale],
      [x + Math.sin(a) * 0.07 * scale, y + 0.23 * scale, z + Math.cos(a) * 0.07 * scale], 0.008 * scale, 0.005 * scale, "#f7d97a", 4);
  }
}

export const PLANET_RADIUS = 3.55;
export const GARDEN_RADIUS = 2.03;
export const GARDEN_HEIGHT = Math.sqrt(PLANET_RADIUS ** 2 - GARDEN_RADIUS ** 2);

export function groundHeight(x, z) {
  return Math.sqrt(Math.max(0.1, PLANET_RADIUS ** 2 - x * x - (GARDEN_RADIUS + z) ** 2)) - GARDEN_HEIGHT + 0.015;
}

function pondSurface(inner, outer, lift, centerX = 0, centerZ = 0, radiusX = 1.3, radiusZ = 0.7, start = 0, sweep = TAU) {
  const positions = [];
  const indices = [];
  const rows = 6;
  const columns = 48;
  for (let row = 0; row <= rows; row++) {
    const radius = THREE.MathUtils.lerp(inner, outer, row / rows);
    for (let column = 0; column <= columns; column++) {
      const angle = start + column / columns * sweep;
      const x = centerX + Math.cos(angle) * radius * radiusX;
      const z = centerZ + Math.sin(angle) * radius * radiusZ;
      positions.push(x, groundHeight(x, z) + lift, z);
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const a = row * (columns + 1) + column;
      indices.push(a, a + columns + 1, a + 1, a + 1, a + columns + 1, a + columns + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createPond() {
  return {
    water: pondSurface(0, 1, 0.055),
    shore: pondSurface(1, 1.09, 0.035),
    ripple: pondSurface(0.87, 0.875, 0.06),
  };
}

export function createGarden(index) {
  const green = new Sculpture();
  const petals = new Sculpture();
  const rocks = new Sculpture();
  const count = index === 0 ? 14 : index === 2 ? 9 : index === 3 ? 7 : 0;
  for (let i = 0; i < count; i++) {
    const x = (seeded(i, index + 5) - 0.5) * 2.35;
    const z = (seeded(i, index + 11) - 0.5) * 0.74;
    const position = [x, groundHeight(x, z), z];
    const scale = 0.66 + seeded(i, index + 19) * 0.3;
    if (index === 0) addTulip(green, petals, position, scale, ["#db7394", "#f2afbd", "#f9d3dc"][i % 3], i * 1.3);
    if (index === 2) addLavender(green, petals, position, scale, i * 0.87);
    if (index === 3) addSunflower(green, petals, position, scale, (seeded(i, 52) - 0.5) * 0.35);
  }
  if (index === 1) addSakura(green, petals);
  if (index === 4) {
    addLily(green, petals, [0.2, groundHeight(0.2, 0.04) + 0.14, 0.04], 1);
    addLily(green, petals, [-0.69, groundHeight(-0.69, -0.32) + 0.14, -0.32], 0.5);
    [[0.18, 0.02, 0.53], [-0.7, -0.33, 0.34], [0.76, -0.34, 0.25]].forEach(([x, z, size], i) => {
      const pad = pondSurface(0, 1, 0.071, x, z, size, size * 0.78, i * 1.7 + 0.2, TAU - 0.48);
      green.add(pad, i % 2 ? "#729b72" : "#558865");
      pad.dispose();
      for (let vein = 0; vein < 7; vein++) {
        const a = vein / 7 * TAU + i * 1.7;
        const endX = x + Math.sin(a) * size * 0.8;
        const endZ = z + Math.cos(a) * size * 0.6;
        green.stem([x, groundHeight(x, z) + 0.079, z], [endX, groundHeight(endX, endZ) + 0.079, endZ], 0.003, 0.001, "#91ad79", 4);
      }
    });
  }
  for (let i = 0; i < 24; i++) {
    const x = index === 4 ? Math.cos(i / 24 * TAU) * 1.44 : (seeded(i, index + 30) - 0.5) * 2.7;
    const z = index === 4 ? Math.sin(i / 24 * TAU) * 0.82 : (seeded(i, index + 40) - 0.5) * 1.15;
    const height = groundHeight(x, z);
    for (let blade = 0; blade < 4; blade++) {
      const size = 0.22 + seeded(i, blade + 63) * 0.18;
      green.add(longLeaf, blade % 2 ? "#65956c" : "#85a676", [x, height, z],
        [0.4, i + blade * 1.9, (blade - 1.5) * 0.12], [1.2, size / 0.35, 0.9]);
    }
    if (i % 5 === 0) {
      rocks.add(round, i % 2 ? "#bdb7a0" : "#d8cbb1", [x, height, z], [0.1, i, 0.2], [0.1, 0.06, 0.12]);
    }
  }
  return { green: green.finish(), petals: petals.finish(), rocks: rocks.finish() };
}

export function createIntroTulip(bloom = 0) {
  const green = new Sculpture();
  const petals = new Sculpture();
  addTulip(green, petals, [0, 0, 0], 1.5, "#e989a9", 0, bloom);
  return { green: green.finish(), petals: petals.finish() };
}

export function createPlanet() {
  const geometry = new THREE.IcosahedronGeometry(PLANET_RADIUS, 7);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const point = new THREE.Vector3();
  const color = new THREE.Color();
  const moss = new THREE.Color("#8fad78");
  const emerald = new THREE.Color("#4f8270");
  const rock = new THREE.Color("#8c8874");
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    const disturbance = Math.sin(point.x * 2.3 + point.z) * Math.cos(point.z * 1.9 - point.y) * 0.023;
    point.setLength(PLANET_RADIUS + disturbance);
    positions.setXYZ(i, point.x, point.y, point.z);
  }
  for (let i = 0; i < positions.count; i += 3) {
    point.set(0, 0, 0);
    for (let j = 0; j < 3; j++) point.add(new THREE.Vector3().fromBufferAttribute(positions, i + j));
    point.multiplyScalar(1 / 3);
    const pattern = (Math.sin(point.x * 1.65 + Math.sin(point.z * 2)) * Math.cos(point.z * 1.9 + point.y * 0.7) + 1) * 0.5;
    color.copy(emerald).lerp(moss, pattern * 0.76);
    if (point.y < -0.7) color.lerp(rock, Math.min(0.75, (-point.y - 0.7) / 3));
    color.multiplyScalar(0.94 + seeded(i, 41) * 0.1);
    for (let j = 0; j < 3; j++) color.toArray(colors, (i + j) * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function createPlanetPlants(stopAngles) {
  const plants = new Sculpture();
  for (let i = 0; i < 26; i++) {
    const angle = seeded(i, 90) * TAU;
    const radial = 2.4 + seeded(i, 92) * 0.85;
    const position = new THREE.Vector3(Math.sin(angle) * radial,
      Math.sqrt(PLANET_RADIUS ** 2 - radial ** 2), Math.cos(angle) * radial);
    if (stopAngles.some((stop) => position.distanceTo(new THREE.Vector3(Math.sin(stop) * GARDEN_RADIUS, GARDEN_HEIGHT, Math.cos(stop) * GARDEN_RADIUS)) < 1.35)) continue;
    const normal = position.clone().normalize();
    const orientation = new THREE.Quaternion().setFromUnitVectors(up, normal);
    const local = (x, y, z) => new THREE.Vector3(x, y, z).applyQuaternion(orientation).add(position).toArray();
    const size = 0.32 + seeded(i, 99) * 0.28;
    if (i % 3 === 0) {
      plants.stem(position.toArray(), local(0, size * 1.25, 0), size * 0.045, size * 0.025, "#7d6650");
      plants.add(round, "#649276", local(0, size * 1.16, 0), orientation, [size * 0.48, size * 0.56, size * 0.48]);
      plants.add(round, "#88a879", local(size * 0.25, size * 0.9, 0), orientation, [size * 0.36, size * 0.38, size * 0.36]);
    } else {
      for (let layer = 0; layer < 3; layer++) {
        plants.add(cone, ["#4d7c63", "#668f6d", "#83a27a"][layer], local(0, size * (0.35 + layer * 0.32), 0), orientation,
          [size * (0.48 - layer * 0.1), size * 0.65, size * (0.48 - layer * 0.1)]);
      }
    }
  }
  return plants.finish();
}

export function createBalloon() {
  const envelope = new Sculpture();
  const rigging = new Sculpture();
  const basket = new Sculpture();
  const panelColors = ["#c85f7c", "#f2b6ad", "#e8999e", "#f6d2b5", "#d8798e", "#efafa7"];
  const profile = [[0.15, 0.55], [0.32, 0.8], [0.66, 1.15], [0.91, 1.58], [1.05, 2.04], [1, 2.46], [0.8, 2.84], [0.46, 3.13], [0, 3.27]];
  const lathePoints = profile.map(([radius, y]) => new THREE.Vector2(radius, y));
  for (let panel = 0; panel < 18; panel++) {
    const angle = panel / 18 * TAU;
    const geometry = new THREE.LatheGeometry(lathePoints, 3, angle, TAU / 18);
    envelope.add(geometry, panelColors[panel % panelColors.length]);
    geometry.dispose();
    const curve = new THREE.CatmullRomCurve3(profile.map(([radius, y]) => new THREE.Vector3(Math.sin(angle) * (radius + 0.003), y, Math.cos(angle) * (radius + 0.003))));
    const seam = new THREE.TubeGeometry(curve, 20, 0.007, 4, false);
    rigging.add(seam, "#bd7c7d");
    seam.dispose();
  }
  for (const x of [-0.32, 0.32]) {
    for (const z of [-0.24, 0.24]) {
      rigging.stem([x, 0.06, z], [x * 0.65, 0.82, z * 0.65], 0.01, 0.008, "#8a6d57", 5);
    }
  }
  const body = new THREE.BoxGeometry(1, 1, 1);
  // Four basket walls, a floor and rounded rims leave the top genuinely open.
  basket.add(body, "#956443", [0, -0.2, 0], [0, 0, 0], [0.67, 0.045, 0.52]);
  basket.add(body, "#ba8b5c", [0, -0.035, 0.26], [0, 0, 0], [0.69, 0.32, 0.035]);
  basket.add(body, "#aa7b51", [0, -0.035, -0.26], [0, 0, 0], [0.69, 0.32, 0.035]);
  for (const x of [-0.33, 0.33]) basket.add(body, "#ad8055", [x, -0.035, 0], [0, 0, 0], [0.035, 0.32, 0.52]);
  for (const y of [-0.16, -0.1, -0.04, 0.02, 0.08, 0.13]) {
    for (const z of [-0.284, 0.284]) basket.stem([-0.345, y, z], [0.345, y, z], 0.009, 0.009, y === 0.13 ? "#d4a775" : "#cca06c", 5);
    for (const x of [-0.351, 0.351]) basket.stem([x, y, -0.276], [x, y, 0.276], 0.009, 0.009, "#c49a68", 5);
  }
  for (let i = 0; i < 14; i++) {
    for (const z of [-0.283, 0.283]) {
      const x = -0.31 + i * 0.048;
      basket.stem([x, -0.18, z], [x, 0.12, z], 0.004, 0.004, i % 2 ? "#956e4d" : "#d3ac7b", 4);
    }
  }
  const ring = new THREE.TorusGeometry(0.16, 0.022, 5, 18);
  rigging.add(ring, "#8b6554", [0, 0.56, 0], [Math.PI / 2, 0, 0]);
  ring.dispose();
  rigging.add(body, "#685753", [0, 0.35, 0], [0, 0, 0], [0.18, 0.12, 0.13]);
  rigging.add(cone, "#ffd394", [0, 0.47, 0], [0, 0, 0], [0.04, 0.15, 0.04]);
  body.dispose();
  return { envelope: envelope.finish(), rigging: rigging.finish(), basket: basket.finish() };
}

export function createCloud() {
  const cloud = new Sculpture();
  [[-0.65, 0, 0, 0.48], [-0.26, 0.14, 0, 0.66], [0.31, 0.1, 0, 0.53], [0.67, -0.05, 0, 0.33]].forEach(([x, y, z, size]) => {
    cloud.add(round, "#fff9f3", [x, y, z], [0, 0, 0], [size, size * 0.62, size * 0.48]);
  });
  return cloud.finish();
}
