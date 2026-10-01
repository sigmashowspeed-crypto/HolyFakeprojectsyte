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
const stopProgress = [0.08, 0.22, 0.36, 0.5, 0.64];

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

function SakuraTree() {
  const blossoms = useMemo(
    () => Array.from({ length: 20 }, (_, i) => ({
      position: [
        (seeded(i, 2) - 0.5) * 2.1,
        1.25 + seeded(i, 3) * 1.35,
        (seeded(i, 4) - 0.5) * 1.2,
      ],
      scale: 0.65 + seeded(i, 5) * 0.6,
    })),
    [],
  );

  return (
    <group>
      <mesh position={[0, 0.78, 0]} rotation={[0, 0, -0.08]}>
        <cylinderGeometry args={[0.11, 0.18, 1.65, 7]} />
        <meshStandardMaterial color="#7b594f" flatShading />
      </mesh>
      {blossoms.map((item, index) => (
        <Petal key={index} color={index % 3 ? "#ffbdd3" : "#ffe0ea"} {...item} />
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
    const distance = Math.abs(progressRef.current - stopProgress[index]);
    const target = distance < 0.13 ? 1 : 0.16;
    const rate = reducedMotion ? 8 : 3.8;
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
        <meshStandardMaterial color={index === 4 ? "#547f69" : "#78976c"} flatShading />
      </mesh>
      <group ref={flowerGroup}>
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
      y: (seeded(i, 21) - 0.5) * 2.6,
      scale: 0.22 + seeded(i, 22) * 0.4,
    })),
    [],
  );

  return (
    <group position={[0, -2.45, 0]}>
      <mesh>
        <icosahedronGeometry args={[3.55, 3]} />
        <meshStandardMaterial color="#6d987d" flatShading roughness={0.92} />
      </mesh>
      {patches.map((patch, i) => {
        const radial = Math.sqrt(Math.max(0.2, 3.3 ** 2 - patch.y ** 2));
        return (
          <mesh
            key={i}
            position={[Math.sin(patch.angle) * radial, patch.y, Math.cos(patch.angle) * radial]}
            scale={patch.scale}
          >
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={i % 2 ? "#8eb497" : "#5f8876"} flatShading />
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

  useFrame((state, delta) => {
    const p = progressRef.current;
    const angle = p * Math.PI * 1.88 + 0.35;
    const finaleDrop = Math.max(0, (p - 0.86) / 0.14);
    target.set(Math.sin(angle) * 4.45, 1.7 - finaleDrop * 1.25, Math.cos(angle) * 4.45);
    group.current.position.lerp(target, 1 - Math.exp(-delta * 2.2));
    if (!reducedMotion) {
      group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.65) * 0.055;
      group.current.position.y += Math.sin(state.clock.elapsedTime * 0.9) * 0.003;
    }
  });

  return (
    <group ref={group} scale={0.72}>
      <mesh position={[0, 1.75, 0]} scale={[1.05, 1.35, 1.05]}>
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial color="#d77386" flatShading roughness={0.62} />
      </mesh>
      <mesh position={[0, 1.76, 0.92]} scale={[0.2, 1.26, 0.04]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#f3c6b1" transparent opacity={0.68} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.5, 0]} rotation={[0, 0, x * -0.18]}>
          <cylinderGeometry args={[0.012, 0.012, 1.12, 5]} />
          <meshStandardMaterial color="#77594a" />
        </mesh>
      ))}
      <mesh position={[0, -0.12, 0]}>
        <boxGeometry args={[0.72, 0.48, 0.62]} />
        <meshStandardMaterial color="#a7744d" flatShading />
      </mesh>
    </group>
  );
}

function Cloud({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      {[
        [-0.55, 0, 0],
        [0, 0.16, 0],
        [0.55, -0.02, 0],
        [0.08, -0.18, 0.08],
      ].map((point, index) => (
        <mesh key={index} position={point} scale={index === 1 ? 0.85 : 0.66}>
          <icosahedronGeometry args={[0.72, 2]} />
          <meshStandardMaterial color="#fff9f3" transparent opacity={0.44} flatShading />
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
      <Balloon progressRef={progressRef} reducedMotion={reducedMotion} />
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
