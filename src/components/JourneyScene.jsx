import { memo, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { content } from "../content";
import {
  createBalloon,
  createCloud,
  createGarden,
  createIntroTulip,
  createPlanet,
  createPlanetPlants,
  createPond,
  GARDEN_HEIGHT,
  GARDEN_RADIUS,
} from "./models";

const cameraCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 3.2, 9.2),
  new THREE.Vector3(-6.9, 3.4, 4.2),
  new THREE.Vector3(-7.2, 3.8, -4.4),
  new THREE.Vector3(-0.8, 4.4, -8.4),
  new THREE.Vector3(6.7, 3.5, -4.2),
  new THREE.Vector3(7.2, 3.1, 3.5),
  new THREE.Vector3(0.9, 2.6, 8.7),
], false, "catmullrom", 0.35);

const stopAngles = [-0.41, -1.21, -2.03, -2.8, 2.7];
const stopProgress = [0.05, 0.19, 0.33, 0.47, 0.61];
const petalMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.82 });
const plantMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.94 });
const facetedMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.87 });

function CameraRig({ progressRef, reducedMotion }) {
  const { camera, size } = useThree();
  const point = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, delta) => {
    const progress = THREE.MathUtils.clamp(progressRef.current, 0, 0.995);
    cameraCurve.getPointAt(progress * 0.92, point);
    if (size.width / size.height < 0.8) point.multiplyScalar(1.16);
    point.y += reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.35) * 0.045;
    camera.position.lerp(point, 1 - Math.exp(-Math.min(delta, 0.05) * 3.2));
    look.set(0, progress > 0.82 ? 0.35 : -0.12, 0);
    camera.lookAt(look);
  });
  return null;
}

function Sky({ progressRef }) {
  const { scene } = useThree();
  const current = useMemo(() => new THREE.Color(content.stops[0].sky), []);
  const target = useMemo(() => new THREE.Color(), []);
  useFrame((_, delta) => {
    const p = progressRef.current;
    let color = content.stops[0].sky;
    if (p > 0.14) color = content.stops[1].sky;
    if (p > 0.29) color = content.stops[2].sky;
    if (p > 0.43) color = content.stops[3].sky;
    if (p > 0.57) color = content.stops[4].sky;
    if (p > 0.72) color = "#17142c";
    if (p > 0.88) color = "#715f8f";
    target.set(color);
    current.lerp(target, 1 - Math.exp(-delta * 1.5));
    scene.background = current;
    if (scene.fog) scene.fog.color.copy(current);
  });
  return <fog attach="fog" args={[content.stops[0].sky, 11, 29]} />;
}

function Pond() {
  const geometry = useMemo(createPond, []);
  return (
    <group>
      <mesh geometry={geometry.shore}>
        <meshStandardMaterial color="#8caa85" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geometry.water}>
        <meshStandardMaterial color="#5f9ea5" metalness={0.12} roughness={0.32} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geometry.ripple}>
        <meshBasicMaterial color="#c6e1d9" transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function FlowerPatch({ index, progressRef, reducedMotion }) {
  const group = useRef();
  const blossoms = useRef();
  const geometry = useMemo(() => createGarden(index), [index]);
  const angle = stopAngles[index];
  useFrame((state, delta) => {
    const p = progressRef.current;
    const nearest = stopProgress.reduce((best, point, i) => (
      Math.abs(point - p) < Math.abs(stopProgress[best] - p) ? i : best
    ), 0);
    const inFinale = p > 0.91;
    const target = p < 0.69 && nearest === index ? 1 : inFinale ? 0.72 : 0.01;
    const value = THREE.MathUtils.damp(group.current.scale.x, target, reducedMotion ? 18 : 6.5, Math.min(delta, 0.05));
    group.current.scale.setScalar(value);
    group.current.visible = value > 0.012;
    blossoms.current.scale.y = 0.8 + value * 0.2;
    if (!reducedMotion) group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.7 + index) * 0.012;
  });
  return (
    <group position={[Math.sin(angle) * GARDEN_RADIUS, GARDEN_HEIGHT, Math.cos(angle) * GARDEN_RADIUS]} rotation={[0, angle, 0]}>
      <group ref={group} scale={index === 0 ? 1 : 0.01}>
        {index === 4 && <Pond />}
        <mesh geometry={geometry.green} material={plantMaterial} />
        <mesh ref={blossoms} geometry={geometry.petals} material={petalMaterial} />
        <mesh geometry={geometry.rocks} material={facetedMaterial} />
      </group>
    </group>
  );
}

function Planet({ progressRef, reducedMotion }) {
  const surface = useMemo(createPlanet, []);
  const plants = useMemo(() => createPlanetPlants(stopAngles), []);
  return (
    <group position={[0, -2.45, 0]} scale={0.92}>
      <mesh geometry={surface} material={facetedMaterial} />
      <mesh geometry={plants} material={facetedMaterial} />
      {stopAngles.map((_, index) => <FlowerPatch key={index} index={index} progressRef={progressRef} reducedMotion={reducedMotion} />)}
    </group>
  );
}

function Balloon({ progressRef, reducedMotion }) {
  const group = useRef();
  const geometry = useMemo(createBalloon, []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);
  const { camera, size } = useThree();
  useFrame((state, delta) => {
    const p = progressRef.current;
    const finaleDrop = THREE.MathUtils.smoothstep(p, 0.86, 1);
    const portrait = size.width / size.height < 0.8;
    offset.set(portrait ? 0.5 : 2.05, 0.28 - finaleDrop * 1.7, -5.5);
    target.copy(offset).applyMatrix4(camera.matrixWorld);
    // Match the camera immediately on mount, then gently float with it.
    if (!group.current.userData.placed) {
      group.current.position.copy(target);
      group.current.userData.placed = true;
    } else group.current.position.lerp(target, 1 - Math.exp(-Math.min(delta, 0.05) * 5));
    group.current.rotation.x = 0;
    group.current.rotation.y = Math.atan2(camera.position.x - group.current.position.x, camera.position.z - group.current.position.z);
    group.current.rotation.z = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.65) * 0.028;
    const normalScale = portrait ? 0.32 : 0.43;
    const targetScale = p >= 0.69 && p < 0.86 ? 0.28 : normalScale;
    const scale = THREE.MathUtils.damp(group.current.scale.x, targetScale, 5, delta);
    group.current.scale.setScalar(scale);
  });
  return (
    <group ref={group} scale={0.4}>
      <mesh geometry={geometry.envelope}>
        <meshStandardMaterial vertexColors roughness={0.91} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geometry.rigging} material={plantMaterial} />
      <mesh geometry={geometry.basket} material={facetedMaterial} />
      <pointLight color="#ffcf94" intensity={0.4} distance={1.6} position={[0, 0.48, 0]} />
    </group>
  );
}

function Clouds({ reducedMotion }) {
  const group = useRef();
  const geometry = useMemo(createCloud, []);
  const { camera } = useThree();
  const offset = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    // Distant camera-relative clouds can never pass in front of the balloon.
    offset.set(0, reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.12) * 0.08, -17);
    group.current.position.copy(offset).applyMatrix4(camera.matrixWorld);
    group.current.quaternion.copy(camera.quaternion);
  });
  return (
    <group ref={group}>
      {[[-6.2, 3.1, 0, 1], [5.4, 4.6, -1, 1.2], [1.8, 5.7, -2, 0.62], [-3.4, -0.3, -2, 0.52]].map(([x, y, z, scale], i) => (
        <mesh key={i} position={[x, y, z]} scale={scale} geometry={geometry}>
          <meshStandardMaterial vertexColors transparent opacity={0.43} roughness={1} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function IntroBud({ started, reducedMotion }) {
  const group = useRef();
  const petals = useRef();
  const closed = useMemo(() => {
    const bud = createIntroTulip(0);
    const bloom = createIntroTulip(1);
    bud.petals.morphAttributes.position = [bloom.petals.attributes.position];
    bud.petals.morphAttributes.normal = [bloom.petals.attributes.normal];
    return bud;
  }, []);
  const bloom = useRef(0);
  useFrame((state, delta) => {
    bloom.current = THREE.MathUtils.damp(bloom.current, started ? 1 : 0, reducedMotion ? 25 : 4, delta);
    group.current.visible = bloom.current < 0.98;
    if (petals.current.morphTargetInfluences) petals.current.morphTargetInfluences[0] = bloom.current;
    group.current.scale.setScalar(1.05 + bloom.current * 0.1);
    group.current.position.y = 0.35 + (reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.75) * 0.035);
  });
  return (
    <group ref={group} position={[0, 0.35, 2.2]}>
      <mesh geometry={closed.green} material={plantMaterial} />
      <mesh ref={petals} geometry={closed.petals} material={petalMaterial} onUpdate={(mesh) => mesh.updateMorphTargets()} />
      <pointLight color="#ffadc6" intensity={2} distance={4} position={[0, 1.65, 0.7]} />
    </group>
  );
}

function World({ progressRef, reducedMotion, started }) {
  return (
    <>
      <Sky progressRef={progressRef} />
      <CameraRig progressRef={progressRef} reducedMotion={reducedMotion} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={["#fff3e9", "#4a645e", 1.55]} />
      <directionalLight position={[-3, 7, 5]} intensity={1.65} color="#fff3e1" />
      <directionalLight position={[5, 3, -4]} intensity={0.5} color="#eee4ff" />
      <group visible={started}>
        <Planet progressRef={progressRef} reducedMotion={reducedMotion} />
      </group>
      {started && <Balloon progressRef={progressRef} reducedMotion={reducedMotion} />}
      <Clouds reducedMotion={reducedMotion} />
      <IntroBud started={started} reducedMotion={reducedMotion} />
      <Sparkles count={60} scale={[13, 8, 13]} size={1.8} speed={reducedMotion ? 0 : 0.12} opacity={0.28} color="#fff4d8" />
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
