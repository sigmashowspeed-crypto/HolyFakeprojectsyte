import { memo, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { content } from "../content";

const cameraCurve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 3.2, 9.2),
    new THREE.Vector3(-6.9, 3.4, 4.2),
    new THREE.Vector3(-7.2, 3.8, -4.4),
    new THREE.Vector3(-0.8, 4.4, -8.4),
    new THREE.Vector3(6.7, 3.5, -4.2),
    new THREE.Vector3(7.2, 3.1, 3.5),
    new THREE.Vector3(0.9, 2.6, 8.7),
  ],
  false,
  "catmullrom",
  0.35,
);

const stopAngles = [-0.41, -1.21, -2.03, -2.8, 2.7];
const stopProgress = [0.05, 0.19, 0.33, 0.47, 0.61];

function seeded(index, salt = 0) {
  const x = Math.sin(index * 91.17 + salt * 37.43) * 43758.5453;
  return x - Math.floor(x);
}

function CameraRig({ progressRef, reducedMotion }) {
  const { camera } = useThree();
  const point = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const progress = Math.min(0.995, Math.max(0, progressRef.current));
    cameraCurve.getPointAt(progress * 0.92, point);
    const drift = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.35) * 0.09;
    point.y += drift;
    camera.position.lerp(point, 1 - Math.exp(-delta * 3.2));
    look.set(0, progress > 0.82 ? 0.45 : 0.05, 0);
    camera.lookAt(look);
  });

  return null;
}

function Sky({ progressRef }) {
  const { scene } = useThree();
  const current = useMemo(() => new THREE.Color(content.stops[0].sky), []);
  const target = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const p = progressRef.current;
    let color = content.stops[0].sky;
    if (p > 0.14) color = content.stops[1].sky;
    if (p > 0.29) color = content.stops[2].sky;
    if (p > 0.43) color = content.stops[3].sky;
    if (p > 0.57) color = content.stops[4].sky;
    if (p > 0.72) color = "#17142c";
    if (p > 0.88) color = "#715f8f";
    target.set(color);
    current.lerp(target, 0.025);
    scene.background = current;
    if (scene.fog) scene.fog.color.copy(current);
  });

  return <fog attach="fog" args={[content.stops[0].sky, 8, 19]} />;
}

function Petal({ color, position, rotation = [0, 0, 0], scale = 1 }) {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <sphereGeometry args={[0.15, 7, 5]} />
      <meshStandardMaterial color={color} flatShading roughness={0.78} />
    </mesh>
  );
}

function Stem({ height = 0.8, color = "#49755b", position = [0, 0, 0] }) {
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]}>
      <cylinderGeometry args={[0.025, 0.038, height, 6]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  );
}

function GrassTuft({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      {[-0.055, 0, 0.055].map((x, index) => (
        <mesh key={x} position={[x, 0.12 + index * 0.025, 0]} rotation={[0, 0, (index - 1) * 0.24]}>
          <coneGeometry args={[0.027, 0.3 + index * 0.04, 5]} />
          <meshStandardMaterial color={index === 1 ? "#5d8866" : "#77a477"} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function GardenDetails({ index }) {
  const grass = useMemo(
    () => Array.from({ length: 14 }, (_, itemIndex) => ({
      position: [
        (seeded(itemIndex, index + 32) - 0.5) * 2.55,
        0.02,
        (seeded(itemIndex, index + 42) - 0.5) * 1.25,
      ],
      scale: 0.65 + seeded(itemIndex, index + 52) * 0.55,
    })),
    [index],
  );
  const rocks = useMemo(
    () => Array.from({ length: 5 }, (_, itemIndex) => ({
      position: [
        (seeded(itemIndex, index + 62) - 0.5) * 2.45,
        0.055,
        (seeded(itemIndex, index + 72) - 0.5) * 1.1,
      ],
      scale: 0.07 + seeded(itemIndex, index + 82) * 0.08,
    })),
    [index],
  );

  return (
    <group>
      {grass.map((item, itemIndex) => <GrassTuft key={itemIndex} {...item} />)}
      {rocks.map((item, itemIndex) => (
        <mesh key={itemIndex} position={item.position} scale={item.scale}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={itemIndex % 2 ? "#d6c3a3" : "#bba98c"} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Tulip({ position, color, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <Stem />
      <group position={[0, 0.84, 0]}>
        <Petal color={color} position={[-0.08, 0, 0]} rotation={[0, 0, 0.38]} />
        <Petal color={color} position={[0.08, 0, 0]} rotation={[0, 0, -0.38]} />
        <Petal color="#ffd1dc" position={[0, 0.07, 0.04]} scale={0.82} />
      </group>
    </group>
  );
}

function SakuraBlossom({ position, scale = 1, pale = false }) {
  return (
    <group position={position} scale={scale}>
      {Array.from({ length: 5 }, (_, index) => {
        const angle = (index / 5) * Math.PI * 2;
        return (
          <Petal
            key={index}
            color={pale ? "#ffe5ed" : "#f7adc7"}
            position={[Math.cos(angle) * 0.12, Math.sin(angle) * 0.12, 0]}
            rotation={[0, 0, angle - Math.PI / 2]}
            scale={[0.82, 1.08, 0.42]}
          />
        );
      })}
      <mesh position={[0, 0, 0.06]}>
        <sphereGeometry args={[0.045, 7, 5]} />
        <meshStandardMaterial color="#e6b84e" flatShading />
      </mesh>
    </group>
  );
}

function Branch({ position, length, rotation }) {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[0.035, 0.07, length, 7]} />
      <meshStandardMaterial color="#765047" flatShading roughness={0.9} />
    </mesh>
  );
}

function SakuraTree() {
  const blossoms = [
    [-0.78, 1.55, 0.02],
    [-0.58, 1.82, 0.08],
    [-0.34, 1.48, 0.12],
    [-0.18, 2.02, -0.03],
    [0.08, 1.73, 0.12],
    [0.34, 2.05, 0.03],
    [0.55, 1.7, 0.08],
    [0.78, 1.9, -0.02],
    [0.18, 2.25, 0.04],
  ];

  return (
    <group>
      <mesh position={[0, 0.72, 0]} rotation={[0, 0, -0.035]}>
        <cylinderGeometry args={[0.075, 0.15, 1.5, 7]} />
        <meshStandardMaterial color="#765047" flatShading roughness={0.9} />
      </mesh>
      <Branch position={[-0.29, 1.33, 0]} length={0.88} rotation={[0, 0, -0.84]} />
      <Branch position={[0.32, 1.47, 0]} length={0.94} rotation={[0, 0, 0.8]} />
      <Branch position={[-0.07, 1.72, 0.02]} length={0.72} rotation={[0, 0, -0.22]} />
      <Branch position={[0.18, 1.87, 0.01]} length={0.62} rotation={[0, 0, 0.38]} />
      {blossoms.map((position, index) => (
        <SakuraBlossom
          key={index}
          position={position}
          scale={0.78 + (index % 3) * 0.09}
          pale={index % 3 === 0}
        />
      ))}
    </group>
  );
}

function Lavender({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <Stem height={1.05} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Petal
          key={i}
          color={i % 2 ? "#a78bda" : "#8563bd"}
          position={[(i % 2 ? 1 : -1) * 0.07, 0.72 + i * 0.095, 0]}
          scale={0.47}
        />
      ))}
    </group>
  );
}

function Sunflower({ position, scale = 1 }) {
  const petals = Array.from({ length: 10 }, (_, i) => i);
  return (
    <group position={position} scale={scale}>
      <Stem height={1.12} />
      <group position={[0, 1.12, 0]} rotation={[0, 0, 0.05]}>
        {petals.map((i) => {
          const angle = (i / petals.length) * Math.PI * 2;
          return (
            <Petal
              key={i}
              color="#f8cd4f"
              position={[Math.cos(angle) * 0.23, Math.sin(angle) * 0.23, 0]}
              rotation={[0, 0, angle]}
              scale={[1.25, 0.65, 0.55]}
            />
          );
        })}
        <mesh position={[0, 0, 0.08]}>
          <sphereGeometry args={[0.2, 9, 6]} />
          <meshStandardMaterial color="#5d3d2c" flatShading />
        </mesh>
      </group>
    </group>
  );
}

function WaterLily() {
  const petals = Array.from({ length: 12 }, (_, i) => i);
  return (
    <group>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.45, 28]} />
        <meshStandardMaterial color="#4f9698" transparent opacity={0.82} roughness={0.35} />
      </mesh>
      <mesh position={[-0.6, 0.065, -0.25]} rotation={[-Math.PI / 2, 0.2, 0]}>
        <circleGeometry args={[0.38, 10, 0.35, Math.PI * 1.82]} />
        <meshStandardMaterial color="#6a9e75" flatShading />
      </mesh>
      <group position={[0.24, 0.16, 0.08]}>
        {petals.map((i) => {
          const angle = (i / petals.length) * Math.PI * 2;
          return (
            <Petal
              key={i}
              color={i % 2 ? "#f7d7e7" : "#fff0f5"}
              position={[Math.cos(angle) * 0.25, 0.04, Math.sin(angle) * 0.25]}
              rotation={[0, -angle, 0]}
              scale={[1.25, 0.48, 0.72]}
            />
          );
        })}
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.11, 7, 5]} />
          <meshStandardMaterial color="#f0c84b" flatShading />
        </mesh>
      </group>
    </group>
  );
}

function FlowerPatch({ index, progressRef, reducedMotion }) {
  const group = useRef();
  const flowerGroup = useRef();
  const angle = stopAngles[index];
  const radius = 2.15;
  const position = [Math.sin(angle) * radius, 2.72, Math.cos(angle) * radius];
  const rotation = [0, angle, 0];
  const flowers = useMemo(
    () => Array.from({ length: index === 1 ? 1 : 10 }, (_, i) => ({
      position: [(seeded(i, index) - 0.5) * 2.25, 0, (seeded(i, index + 7) - 0.5) * 1.1],
      scale: 0.62 + seeded(i, index + 12) * 0.42,
      color: i % 3 === 0 ? "#fdd6df" : i % 2 ? "#f37b9b" : "#ffadbf",
    })),
    [index],
  );

  useFrame((state, delta) => {
    const progress = progressRef.current;
    const nearest = stopProgress.reduce((best, point, stopIndex) => (
      Math.abs(point - progress) < Math.abs(stopProgress[best] - progress) ? stopIndex : best
    ), 0);
    const target = progress < 0.69 && nearest === index ? 1 : 0.015;
    const rate = reducedMotion ? 12 : 7.5;
    const value = THREE.MathUtils.damp(flowerGroup.current.scale.x, target, rate, delta);
    flowerGroup.current.scale.setScalar(value);
    if (!reducedMotion) {
      flowerGroup.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.7 + index) * 0.025;
    }
  });

  return (
    <group ref={group} position={position} rotation={rotation}>
      <mesh position={[0, -0.14, 0]} scale={[1.45, 0.16, 0.82]}>
        <sphereGeometry args={[1, 12, 7]} />
        <meshStandardMaterial
          color={["#81a875", "#86a681", "#7e9871", "#98a66f", "#5e8973"][index]}
          flatShading
        />
      </mesh>
      <group ref={flowerGroup}>
        <GardenDetails index={index} />
        {index === 0 && flowers.map((item, i) => <Tulip key={i} {...item} />)}
        {index === 1 && <SakuraTree />}
        {index === 2 && flowers.map((item, i) => <Lavender key={i} position={item.position} scale={item.scale} />)}
        {index === 3 && flowers.slice(0, 7).map((item, i) => <Sunflower key={i} position={item.position} scale={item.scale} />)}
        {index === 4 && <WaterLily />}
      </group>
    </group>
  );
}

function Planet({ progressRef, reducedMotion }) {
  const patches = useMemo(
    () => Array.from({ length: 13 }, (_, i) => ({
      angle: seeded(i, 20) * Math.PI * 2,
      radial: 0.45 + seeded(i, 21) * 2.65,
      scaleX: 0.3 + seeded(i, 22) * 0.52,
      scaleZ: 0.25 + seeded(i, 23) * 0.46,
    })),
    [],
  );

  return (
    <group position={[0, -2.45, 0]} scale={0.92}>
      <mesh>
        <icosahedronGeometry args={[3.55, 3]} />
        <meshStandardMaterial color="#709c83" flatShading roughness={0.86} />
      </mesh>
      {patches.map((patch, i) => {
        const y = Math.sqrt(Math.max(0.2, 3.48 ** 2 - patch.radial ** 2));
        return (
          <mesh
            key={i}
            position={[
              Math.sin(patch.angle) * patch.radial,
              y + 0.015,
              Math.cos(patch.angle) * patch.radial,
            ]}
            scale={[patch.scaleX, 0.05, patch.scaleZ]}
            rotation={[0, -patch.angle, 0]}
          >
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={i % 2 ? "#83ad78" : "#5f8b74"} flatShading />
          </mesh>
        );
      })}
      {stopAngles.map((_, index) => <FlowerPatch key={index} index={index} progressRef={progressRef} reducedMotion={reducedMotion} />)}
    </group>
  );
}

function Balloon({ progressRef, reducedMotion }) {
  const group = useRef();
  const target = useMemo(() => new THREE.Vector3(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);
  const { camera, size } = useThree();

  useFrame((state, delta) => {
    const p = progressRef.current;
    const finaleDrop = Math.max(0, (p - 0.86) / 0.14);
    const compact = size.width / size.height < 0.8;
    offset.set(compact ? 0.42 : 2.05, 0.28 - finaleDrop * 1.8, -5.5);
    target.copy(offset).applyMatrix4(camera.matrixWorld);
    group.current.position.lerp(target, 1 - Math.exp(-delta * 4.4));
    group.current.rotation.x = 0;
    group.current.rotation.y = Math.atan2(
      camera.position.x - group.current.position.x,
      camera.position.z - group.current.position.z,
    );
    const targetScale = p >= 0.69 && p < 0.86 ? 0.31 : 0.45;
    const balloonScale = THREE.MathUtils.damp(group.current.scale.x, targetScale, 5, delta);
    group.current.scale.setScalar(balloonScale);
    if (!reducedMotion) {
      group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.65) * 0.055;
      group.current.position.y += Math.sin(state.clock.elapsedTime * 0.9) * 0.003;
    }
  });

  return (
    <group ref={group} scale={0.45}>
      <mesh position={[0, 1.75, 0]} scale={[1.05, 1.35, 1.05]}>
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial color="#c9677f" flatShading roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.76, 1.02]} scale={[0.13, 1.25, 0.06]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#efb0b6" transparent opacity={0.82} />
      </mesh>
      <mesh position={[0, 1.76, -0.95]} scale={[0.24, 1.25, 0.035]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#e6a892" transparent opacity={0.64} />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.13, 0.23, 0.34, 8]} />
        <meshStandardMaterial color="#70483e" flatShading />
      </mesh>
      {[-0.43, 0.43].flatMap((x) => [-0.25, 0.25].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.5, z]} rotation={[0, 0, x * -0.18]}>
          <cylinderGeometry args={[0.012, 0.012, 1.12, 5]} />
          <meshStandardMaterial color="#77594a" />
        </mesh>
      )))}
      <mesh position={[0, -0.12, 0]}>
        <boxGeometry args={[0.72, 0.48, 0.62]} />
        <meshStandardMaterial color="#a7744d" flatShading />
      </mesh>
      <mesh position={[0, -0.04, 0.318]}>
        <boxGeometry args={[0.74, 0.055, 0.035]} />
        <meshStandardMaterial color="#6f4b37" flatShading />
      </mesh>
      <mesh position={[0, -0.2, 0.318]}>
        <boxGeometry args={[0.74, 0.045, 0.035]} />
        <meshStandardMaterial color="#6f4b37" flatShading />
      </mesh>
      <pointLight color="#ffd19b" intensity={2.4} distance={2.5} position={[0, 0.56, 0]} />
    </group>
  );
}

function Cloud({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      {[
        [-0.42, 0, 0],
        [0, 0.13, 0],
        [0.42, -0.01, 0],
        [0.06, -0.13, 0.06],
      ].map((point, index) => (
        <mesh key={index} position={point} scale={index === 1 ? 0.72 : 0.54}>
          <icosahedronGeometry args={[0.72, 2]} />
          <meshStandardMaterial color="#fffaf5" transparent opacity={0.32} flatShading depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function IntroBud({ visible, reducedMotion }) {
  if (!visible) return null;
  return (
    <Float speed={reducedMotion ? 0 : 1.1} rotationIntensity={reducedMotion ? 0 : 0.18} floatIntensity={reducedMotion ? 0 : 0.3}>
      <group position={[0, 0.6, 2.2]} scale={1.05}>
        <Stem height={1.35} color="#6b9979" />
        <group position={[0, 1.37, 0]}>
          <Petal color="#d96e91" position={[-0.14, 0, 0]} rotation={[0, 0, 0.38]} scale={1.45} />
          <Petal color="#d96e91" position={[0.14, 0, 0]} rotation={[0, 0, -0.38]} scale={1.45} />
          <Petal color="#ffd0dd" position={[0, 0.12, 0.08]} scale={1.2} />
        </group>
        <pointLight color="#ff91b5" intensity={8} distance={5} position={[0, 1.5, 0.8]} />
      </group>
    </Float>
  );
}

function World({ progressRef, reducedMotion, started }) {
  return (
    <>
      <Sky progressRef={progressRef} />
      <CameraRig progressRef={progressRef} reducedMotion={reducedMotion} />
      <ambientLight intensity={1.4} />
      <hemisphereLight args={["#fff4e5", "#294b4d", 2.5]} />
      <directionalLight position={[4, 8, 5]} intensity={1.8} color="#fff0df" />
      <Planet progressRef={progressRef} reducedMotion={reducedMotion} />
      {started && <Balloon progressRef={progressRef} reducedMotion={reducedMotion} />}
      <Cloud position={[-5.7, 3.4, 0]} scale={0.85} />
      <Cloud position={[5.3, 4.3, -1]} scale={1.05} />
      <Cloud position={[0.5, 5.1, -4.2]} scale={0.72} />
      <IntroBud visible={!started} reducedMotion={reducedMotion} />
      <Sparkles count={70} scale={[13, 8, 13]} size={2.2} speed={reducedMotion ? 0 : 0.16} opacity={0.4} color="#fff4d8" />
    </>
  );
}

function JourneyScene({ progressRef, reducedMotion, started }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 3.2, 9.2], fov: 47, near: 0.1, far: 50 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
    >
      <World progressRef={progressRef} reducedMotion={reducedMotion} started={started} />
    </Canvas>
  );
}

export default memo(JourneyScene);
