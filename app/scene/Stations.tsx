import { Line, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Line2 } from "three/addons/lines/Line2.js";

import { CHAPTERS } from "~/story/chapters";
import { Ghost, Shadow, useGhostState } from "./Ghost";
import { local, smoothstep, useChapter, usePalette, useSceneTime } from "./kit";
import { AppMark, BrickTower, Globe, Phone } from "./Props";
import { Crow, FONT, Tomb, TOMB_FRONT, TOMB_H, type CrowState, type TombState } from "./Tomb";
import { Tree } from "./Scenery";

const at = (id: string) => CHAPTERS.findIndex((c) => c.id === id);
const station = (id: string) => CHAPTERS[at(id)]!.station;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Rest in peace, DPI (SceneWelcome.kt). It opens as the app icon: the ghost inside the tombstone. The ghost leaves
 * the stone through its top, the carving shows, the stone cracks and leans, and a crow lands on it.
 */
export function RipStation() {
  const chapter = useChapter();
  const time = useSceneTime();
  const x0 = station("rip");
  const tomb = useRef<TombState>({ carving: 0, cracked: 0, tilt: 0 });
  const ghost = useGhostState({ position: [x0, 1, TOMB_FRONT + 0.05], scale: 1.4, still: true });
  const crow = useRef<CrowState>({ position: new THREE.Vector3(), flying: 0, head: 0, visible: false });

  useFrame(() => {
    const p = local(chapter.current, at("rip"));
    const rise = smoothstep(0.06, 0.24, p);
    const glide = smoothstep(0.24, 0.42, p);
    const g = ghost.current;
    g.position.set(mix(x0, x0, rise), mix(1, TOMB_H + 1.2, rise), mix(TOMB_FRONT + 0.05, 0.4, rise));
    g.position.lerp(new THREE.Vector3(x0 + 4.6, 0.9, 1.6), glide);
    g.scale = mix(1.4, 1, rise);
    g.still = rise < 0.01;
    g.phase = rise * (1 - glide) * (rise < 1 ? 1 : 0.6);
    g.lag = Math.sin(glide * Math.PI) * 0.9;
    g.look = glide > 0.95 ? -0.6 : 0;

    tomb.current.carving = smoothstep(0.2, 0.38, p);
    tomb.current.cracked = smoothstep(0.34, 0.56, p);
    tomb.current.tilt = -0.045 * tomb.current.cracked;

    const flight = smoothstep(0.55, 0.78, p);
    const c = crow.current;
    c.visible = flight > 0;
    c.flying = flight < 1 ? 1 : 0;
    c.position.set(x0 + 0.4 - (1 - flight) * 9 - Math.sin(flight * Math.PI) * 1.5, TOMB_H + 0.45 + (1 - flight) ** 2 * 5, 0);
    const turn = Math.sin(time.current * 0.8);
    c.head = turn > 0.6 ? 1 : turn < -0.7 ? -1 : 0;
  });

  return (
    <group>
      <Shadow x={x0} w={4.6} d={1.2} />
      <Tomb state={tomb} x={x0} />
      <Ghost state={ghost} id={1} light />
      <Crow state={crow} time={time} />
      <Tree x={x0 - 7.5} z={-2} />
    </group>
  );
}

/**
 * The wall (WallScene.kt). A brick wall with wire and a scanner stands between the apps and the open internet. The
 * plain packets of the apps roll to the wall; the scanner sees them, and they stop. Ghosts pass through.
 */
export function WallStation() {
  const palette = usePalette();
  const time = useSceneTime();
  const x0 = station("wall");
  const wallX = x0 + 1;
  const beam = useRef<THREE.Group>(null!);
  const spot = useRef<THREE.SpotLight>(null!);
  const spotTarget = useRef<THREE.Object3D>(null!);
  useEffect(() => void (spot.current.target = spotTarget.current), []);
  const beamGeometry = useMemo(() => {
    // An open cone with its tip at the scanner, 7.6 long, pointing down.
    const g = new THREE.ConeGeometry(1.5, 7.6, 40, 1, true);
    g.translate(0, -3.8, 0);
    return g;
  }, []);
  const beamFade = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 128;
    const g = canvas.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, "rgba(255,255,255,0.05)");
    grad.addColorStop(0.75, "rgba(255,255,255,0.6)");
    grad.addColorStop(1, "rgba(255,255,255,1)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);
  const packets = useRef<(THREE.Group | null)[]>([]);
  const packetMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const riders = [useGhostState({ position: [0, 0, 0], scale: 0.42 }), useGhostState({ position: [0, 0, 0], scale: 0.42 })];
  const loop = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      pts.push([x0 - 6 + Math.cos(a) * 2.4, 2.6 + Math.sin(a) * 1.6, 0.5]);
    }
    return pts;
  }, [x0]);

  useFrame(() => {
    const t = time.current;
    beam.current.rotation.z = -0.35 + Math.sin(t * 1.4) * 0.22;
    packets.current.forEach((pk, i) => {
      if (!pk) return;
      const u = (t * 0.28 + i / 3) % 1;
      const x = mix(x0 - 5, wallX - 1.45, Math.min(1, u * 1.4));
      const stopped = u * 1.4 >= 1;
      pk.position.set(x, 0.32, 0.6 + (i - 1) * 0.5);
      pk.rotation.z = stopped ? 0 : -u * 14;
      const m = packetMats.current[i];
      if (m) m.color.copy(stopped ? palette.dangerGlow : palette.paper);
      pk.scale.setScalar(stopped ? 1 - smoothstep(0.85, 1, u) : 1);
    });
    riders.forEach((r, i) => {
      const u = (t * 0.12 + i * 0.5) % 1;
      const x = mix(x0 - 5, x0 + 7, u);
      r.current.position.set(x, 1.6 + Math.sin(u * Math.PI) * 1.2, 0.2 - i * 0.6);
      const inside = smoothstep(wallX - 1.7, wallX - 1, x) * (1 - smoothstep(wallX + 1, wallX + 1.7, x));
      r.current.phase = inside;
      r.current.lag = 0.8;
    });
  });

  return (
    <group>
      <Line points={loop} color={palette.signal} lineWidth={2} dashed dashSize={0.25} gapSize={0.18} />
      {[
        [-1.2, 3.1],
        [0, 3.4],
        [1.1, 2.9],
        [-0.6, 2],
        [0.7, 1.9],
      ].map(([dx, y], i) => (
        <AppMark key={i} position={[x0 - 6 + dx!, y!, 0.5]} />
      ))}
      <BrickTower x={wallX} />
      <Shadow x={wallX} w={2.2} d={1.4} />
      {/* The scanner on top of the wall, and its red beam sweeping the ground in front of it. */}
      <group position={[wallX - 0.6, 7.6, 1.2]}>
        <mesh>
          <sphereGeometry args={[0.32, 16, 12]} />
          <meshBasicMaterial color={palette.dangerGlow} toneMapped={false} />
        </mesh>
        <group ref={beam}>
          <mesh geometry={beamGeometry} userData={{ noShadow: true }}>
            <meshBasicMaterial
              color={palette.danger}
              alphaMap={beamFade}
              transparent
              opacity={0.22}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <spotLight ref={spot} color={palette.danger} intensity={260} distance={14} angle={0.24} penumbra={0.5} decay={1.8} />
          <object3D ref={spotTarget} position={[0, -7.6, 0]} />
        </group>
      </group>
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(g) => void (packets.current[i] = g)}>
          <mesh>
            <boxGeometry args={[0.55, 0.55, 0.55]} />
            <meshBasicMaterial ref={(m) => void (packetMats.current[i] = m)} color={palette.paper} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {riders.map((r, i) => (
        <Ghost key={i} state={r} id={10 + i} />
      ))}
      <Globe x={x0 + 7.5} />
    </group>
  );
}

const NAME = "EXAMPLE.ORG";
const NOISE = "#%&*@!?$#%&";

/**
 * The checkpoint (CheckpointScene.kt). A board over a gantry; the ghost carries a sealed name through it. The stamp
 * of the censor comes down, goes through the ghost, and marks only the ground. Under the gantry the name reads as
 * noise.
 */
export function CheckpointStation() {
  const palette = usePalette();
  const chapter = useChapter();
  const x0 = station("checkpoint");
  const ghost = useGhostState({ position: [x0 - 6, 1, 0.6] });
  const stamp = useRef<THREE.Group>(null!);
  const mark = useRef<THREE.MeshBasicMaterial>(null!);
  const stampLight = useRef<THREE.PointLight>(null!);
  const board = useRef<{ text: string } | null>(null);
  const shown = useRef("");

  useFrame(() => {
    const p = local(chapter.current, at("checkpoint"));
    const walk = smoothstep(0.05, 0.85, p);
    const g = ghost.current;
    g.position.set(mix(x0 - 6, x0 + 6, walk), 1, 0.6);
    g.lag = Math.sin(walk * Math.PI) * 0.7;
    const down = smoothstep(0.38, 0.46, p) * (1 - smoothstep(0.56, 0.64, p));
    stamp.current.position.y = mix(4.4, 0.35, down);
    g.phase = down > 0.2 && Math.abs(g.position.x - x0) < 1.6 ? 1 : 0;
    mark.current.opacity = smoothstep(0.45, 0.5, p) * 0.85;
    stampLight.current.intensity = 4 + down * 30;
    // Under the gantry the name is noise: the board shows what the censor reads.
    const under = Math.abs(g.position.x - x0) < 2.6;
    const text = under ? NOISE : NAME;
    if (board.current && shown.current !== text) {
      board.current.text = text;
      shown.current = text;
    }
  });

  return (
    <group>
      {[-1.8, 1.8].map((dx) => (
        <mesh key={dx} position={[x0 + dx, 2.75, -0.4]}>
          <boxGeometry args={[0.22, 5.5, 0.22]} />
          <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.35} />
        </mesh>
      ))}
      <mesh position={[x0, 5.5, -0.4]}>
        <boxGeometry args={[4.4, 0.3, 0.3]} />
        <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.35} />
      </mesh>
      {/* The split-flap board. */}
      <mesh position={[x0, 6.55, -0.4]}>
        <boxGeometry args={[6.4, 1.4, 0.3]} />
        <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.35} />
      </mesh>
      <Text
        ref={board}
        font={FONT}
        fontSize={0.62}
        letterSpacing={0.18}
        position={[x0, 6.55, -0.22]}
        color={palette.paper}
        anchorX="center"
        anchorY="middle"
      >
        {NAME}
      </Text>
      <group ref={stamp} position={[x0, 4.4, 0.6]}>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[1.8, 0.4, 1.2]} />
          <meshBasicMaterial color={palette.dangerGlow} toneMapped={false} />
        </mesh>
        <pointLight ref={stampLight} position={[0, -0.3, 0.4]} color={palette.danger} distance={7} decay={1.6} />
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 2.2, 8]} />
          <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.35} />
        </mesh>
      </group>
      <mesh position={[x0, 0.02, 0.6]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.8, 1.2]} />
        <meshBasicMaterial ref={mark} color={palette.danger} transparent opacity={0} depthWrite={false} />
      </mesh>
      <Ghost state={ghost} id={3} />
    </group>
  );
}

/**
 * Trouble (TroubleScene.kt). The line from the device to the open internet hangs broken between two posts. The
 * ghost takes a lens along the line; the lamp of each post that still carries the signal turns to the signal
 * colour, and the lamp at the break turns to the danger colour.
 */
export function TroubleStation() {
  const palette = usePalette();
  const chapter = useChapter();
  const x0 = station("trouble");
  const posts = [-4.5, -2, 0.5, 3, 5.5].map((dx) => x0 + dx);
  const BREAK = 3; // the lamp at the break
  const lamps = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const signalLight = useRef<THREE.PointLight>(null!);
  const dangerLight = useRef<THREE.PointLight>(null!);
  const ghost = useGhostState({ position: [x0 - 6, 3.4, 0.8], scale: 0.7 });
  const cables = useMemo(() => {
    const sag = (a: number, b: number, broken: 0 | 1 | 2) => {
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 16; i++) {
        const u = i / 16;
        if (broken === 1 && u > 0.45) break;
        if (broken === 2 && u < 0.55) continue;
        const hang = broken ? (broken === 1 ? (u / 0.45) ** 2 * -1.2 : ((1 - u) / 0.45) ** 2 * -1.2) : 0;
        pts.push([mix(a, b, u), 2.6 - Math.sin(u * Math.PI) * 0.45 + hang, 0]);
      }
      return pts;
    };
    const out: [number, number, number][][] = [sag(x0 - 6.6, posts[0]!, 0)];
    for (let i = 0; i < posts.length - 1; i++) {
      if (i === BREAK - 1) out.push(sag(posts[i]!, posts[i + 1]!, 1), sag(posts[i]!, posts[i + 1]!, 2));
      else out.push(sag(posts[i]!, posts[i + 1]!, 0));
    }
    out.push(sag(posts[posts.length - 1]!, x0 + 7.4, 0));
    return out;
  }, [x0]); // eslint-disable-line react-hooks/exhaustive-deps -- posts derive from x0

  useFrame(() => {
    const p = local(chapter.current, at("trouble"));
    const reach = smoothstep(0.08, 0.7, p) * (posts.length - 0.5);
    lamps.current.forEach((m, i) => {
      if (!m) return;
      const on = smoothstep(i, i + 0.4, reach) * (i <= BREAK ? 1 : 0);
      m.color.copy(palette.ink).lerp(i === BREAK ? palette.dangerGlow : palette.signalGlow, on);
    });
    // One signal light rides the last lit lamp; the break has its own red light.
    const last = Math.min(BREAK - 1, Math.max(0, Math.floor(reach)));
    signalLight.current.position.set(posts[last]!, 2.9, 0.4);
    signalLight.current.intensity = 26 * smoothstep(0, 0.4, reach);
    dangerLight.current.intensity = 34 * smoothstep(BREAK, BREAK + 0.4, reach);
    const g = ghost.current;
    const gx = mix(x0 - 6, posts[BREAK]! - 0.6, smoothstep(0.08, 0.7, p));
    g.lag = gx < posts[BREAK]! - 0.7 ? 0.5 : 0;
    g.position.set(gx, 3.6, 0.8);
  });

  return (
    <group>
      <Phone x={x0 - 7.4} h={2.6}>
        <mesh>
          <circleGeometry args={[0.3, 24]} />
          <meshBasicMaterial color={palette.dangerGlow} toneMapped={false} />
        </mesh>
      </Phone>
      {cables.map((pts, i) => (
        <Line key={i} points={pts} color={palette.signal} lineWidth={2.5} />
      ))}
      {posts.map((px, i) => (
        <group key={i} position={[px, 0, 0]}>
          <mesh position={[0, 1.3, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 2.6, 8]} />
            <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.35} />
          </mesh>
          <mesh position={[0, 2.75, 0]}>
            <sphereGeometry args={[0.26, 18, 12]} />
            <meshBasicMaterial ref={(m) => void (lamps.current[i] = m)} color={palette.ink} toneMapped={false} />
          </mesh>
          <Shadow x={0} w={0.4} d={0.2} />
        </group>
      ))}
      <pointLight ref={signalLight} color={palette.signal} distance={8} decay={1.6} intensity={0} />
      <pointLight ref={dangerLight} position={[posts[BREAK]!, 2.9, 0.4]} color={palette.danger} distance={8} decay={1.6} intensity={0} />
      <Ghost state={ghost} id={4} />
      <Globe x={x0 + 8.2} />
    </group>
  );
}

/**
 * Connect (ConnectScene.kt). The ghost presses the one button of the device. The button lights, a key shows, and
 * a tunnel grows from the device through the wall to the open internet; small ghosts ride it and turn to outlines
 * in the wall.
 */
export function ConnectStation() {
  const palette = usePalette();
  const chapter = useChapter();
  const time = useSceneTime();
  const x0 = station("connect");
  const wallX = x0 + 1.6;
  const button = useRef<THREE.MeshBasicMaterial>(null!);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const tube = useRef<THREE.Mesh>(null!);
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(x0 - 5, 3.6, 0),
        new THREE.Vector3(x0 - 2, 5.2, 0),
        new THREE.Vector3(wallX, 4.6, 0),
        new THREE.Vector3(x0 + 5, 4.2, 0),
        new THREE.Vector3(x0 + 7.4, 2.6, 0),
      ]),
    [x0, wallX],
  );
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 120, 0.42, 16, false), [curve]);
  const riders = [0, 1, 2, 3].map(() => useGhostState({ position: [0, 0, 0], scale: 0.32 })); // eslint-disable-line react-hooks/rules-of-hooks -- fixed count
  const presser = useGhostState({ position: [x0 - 7.2, 0.9, 1.4] });

  useFrame(() => {
    const p = local(chapter.current, at("connect"));
    const pressed = smoothstep(0.08, 0.16, p);
    button.current.color.copy(palette.mid).lerp(palette.signalGlow, pressed);
    const grown = smoothstep(0.16, 0.5, p);
    geometry.setDrawRange(0, Math.floor((geometry.index?.count ?? 0) * grown));
    tube.current.visible = grown > 0.01;
    lights.current.forEach((l, i) => l && (l.intensity = (i === 0 ? pressed : smoothstep(i * 0.3, i * 0.3 + 0.3, grown)) * 22));
    presser.current.lag = pressed > 0 && pressed < 1 ? 0.6 : 0;
    presser.current.look = 1;
    riders.forEach((r, i) => {
      const u = (time.current * 0.1 + i / 4) % 1;
      const s = r.current;
      s.visible = grown > u + 0.02;
      const pt = curve.getPointAt(u);
      s.position.set(pt.x, pt.y - 0.42, pt.z);
      s.lag = 0.8;
      s.phase = smoothstep(wallX - 1.6, wallX - 1, pt.x) * (1 - smoothstep(wallX + 1, wallX + 1.6, pt.x));
    });
  });

  return (
    <group>
      <Phone x={x0 - 5} h={3.4}>
        <mesh position={[0, 0.25, 0]}>
          <ringGeometry args={[0.38, 0.55, 32]} />
          <meshBasicMaterial ref={button} color={palette.mid} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.9, 0]}>
          <planeGeometry args={[0.7, 0.12]} />
          <meshBasicMaterial color={palette.signalGlow} toneMapped={false} />
        </mesh>
      </Phone>
      <Shadow x={x0 - 5} w={1.4} d={0.5} />
      <mesh ref={tube} geometry={geometry}>
        <meshBasicMaterial color={palette.signalGlow} toneMapped={false} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <BrickTower x={wallX} h={6} />
      {[0, 0.35, 0.7].map((u, i) => {
        const pt = curve.getPointAt(u);
        return (
          <pointLight
            key={u}
            ref={(l) => void (lights.current[i] = l)}
            position={i === 0 ? [x0 - 5, 2.4, 1.2] : [pt.x, pt.y - 0.6, 0.8]}
            color={palette.signal}
            distance={9}
            decay={1.6}
            intensity={0}
          />
        );
      })}
      {riders.map((r, i) => (
        <Ghost key={i} state={r} id={20 + i} />
      ))}
      <Ghost state={presser} id={5} />
      <Globe x={x0 + 7.4} />
    </group>
  );
}

/**
 * The night watch (NightScene.kt), at the grave of DPI. The phone sleeps, and its tunnel key
 * stays lit. The ghost keeps its round with a lantern.
 */
export function NightStation() {
  const palette = usePalette();
  const time = useSceneTime();
  const x0 = station("night");
  const tomb = useRef<TombState>({ carving: 1, cracked: 1, tilt: -0.045 });
  const ghost = useGhostState({ position: [x0, 1, 1.4] });
  const zs = useRef<(THREE.Object3D | null)[]>([]);

  useFrame(() => {
    const t = time.current;
    const g = ghost.current;
    const u = (Math.sin(t * 0.3) + 1) / 2;
    g.position.set(mix(x0 - 1.5, x0 + 2.5, u), 1.1, 1.6);
    g.lag = Math.cos(t * 0.3) * 0.5;
    zs.current.forEach((z, i) => {
      if (!z) return;
      const k = (t * 0.35 + i / 3) % 1;
      z.position.set(x0 - 6.5 + k * 0.8, 4 + k * 1.6, 0.3);
      z.scale.setScalar(0.5 + k * 0.5);
    });
  });

  return (
    <group>
      <Tomb state={tomb} x={x0 + 5} z={-1.5} />
      <Phone x={x0 - 6.5} h={2.6}>
        <mesh>
          <planeGeometry args={[0.5, 0.12]} />
          <meshBasicMaterial color={palette.signalGlow} toneMapped={false} />
        </mesh>
      </Phone>
      {[0, 1, 2].map((i) => (
        <Text key={i} ref={(z) => void (zs.current[i] = z)} font={FONT} fontSize={0.5} color={palette.mid}>
          z
        </Text>
      ))}
      <Ghost state={ghost} id={6} glow={1} />
      {/* The lantern the ghost carries is the signal: it stays lit all night. */}
      <Lantern ghost={ghost} />
      <Tree x={x0 - 11} z={-2.5} scale={1.1} />
    </group>
  );
}

function Lantern({ ghost }: { ghost: { current: { position: THREE.Vector3 } } }) {
  const palette = usePalette();
  const lamp = useRef<THREE.Group>(null!);
  const line = useRef<Line2>(null);
  useFrame(() => {
    lamp.current.position.copy(ghost.current.position).add(new THREE.Vector3(1.5, 0.6, 0.4));
  });
  return (
    <group ref={lamp}>
      <mesh>
        <boxGeometry args={[0.36, 0.5, 0.36]} />
        <meshBasicMaterial color={palette.signalGlow} toneMapped={false} />
      </mesh>
      <Line ref={line} points={[[0, 0.25, 0], [-0.4, 0.9, 0]]} color={palette.nightLight} lineWidth={2} />
      <pointLight color={palette.signal} intensity={18} distance={8} decay={1.6} />
    </group>
  );
}
