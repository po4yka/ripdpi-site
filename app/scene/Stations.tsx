import { Line, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { CHAPTERS } from "~/story/chapters";
import { Crow, type CrowState } from "./Crow";
import { burst, crossed } from "./Effects";
import { Ghost, Shadow, useGhostState } from "./Ghost";
import { hash, local, pointer, smoothstep, toPointer, useChapter, usePalette, useSceneTime } from "./kit";
import { AppMark, BrickTower, Globe, Lantern, Lens, Phone, SealedName } from "./Props";
import { FONT, Tomb, TOMB_FRONT, TOMB_H, type TombState } from "./Tomb";
import { Tree } from "./Scenery";

const at = (id: string) => CHAPTERS.findIndex((c) => c.id === id);
const station = (id: string) => CHAPTERS[at(id)]!.station;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** The shares of the crack at which chips fall from it. */
const CHIP_MARKS = [0.05, 0.4, 0.75];
// Scratch vectors of the frame loops.
const REST = new THREE.Vector3();
const SPOT = new THREE.Vector3();

/**
 * Rest in peace, DPI (SceneWelcome.kt). It opens as the app icon: the ghost inside the tombstone. The ghost leaves
 * the stone through its top, the carving shows, the stone cracks and leans, and a crow lands on it.
 */
export function RipStation() {
  const palette = usePalette();
  const chapter = useChapter();
  const time = useSceneTime();
  const x0 = station("rip");
  const tomb = useRef<TombState>({ carving: 0, cracked: 0, tilt: 0 });
  const ghost = useGhostState({ position: [x0, 1, TOMB_FRONT + 0.05], scale: 1.4, still: true });
  const crow = useRef<CrowState>({ position: new THREE.Vector3(), flying: 0, head: 0, visible: false });

  const cracks = useRef(Infinity);
  const landed = useRef(Infinity);
  const landedAt = useRef(-Infinity);

  useFrame(() => {
    const p = local(chapter.current, at("rip"));
    const rise = smoothstep(0.06, 0.24, p);
    const glide = smoothstep(0.24, 0.42, p);
    const g = ghost.current;
    g.position.set(x0, mix(1, TOMB_H + 1.2, rise), mix(TOMB_FRONT + 0.05, 0.4, rise)).lerp(REST.set(x0 + 4.6, 0.9, 1.6), glide);
    g.scale = mix(1.4, 1, rise);
    g.still = rise < 0.01;
    // An outline as it rises through the stone and over it; solid again once it is clear.
    g.phase = smoothstep(0.02, 0.3, rise) * (1 - smoothstep(0.1, 0.7, glide));
    g.lag = Math.sin(glide * Math.PI) * 0.9;
    g.look = glide > 0.95 ? -0.6 : 0;

    const s = tomb.current;
    // The stone shakes just before the ghost comes out of it.
    s.tremble = Math.sin(time.current * 90) * 0.03 * smoothstep(0.02, 0.04, p) * (1 - smoothstep(0.06, 0.1, p));
    s.carving = smoothstep(0.2, 0.38, p);
    const before = cracks.current;
    s.cracked = smoothstep(0.34, 0.52, p);
    s.tilt = -0.045 * s.cracked;
    // Chips fall as the crack opens.
    for (const mark of CHIP_MARKS) {
      if (before < mark && s.cracked >= mark) {
        burst(SPOT.set(x0 + 0.7, TOMB_H * (0.9 - mark * 0.4), TOMB_FRONT + 0.1), palette.stone, 4, { speed: 1.6, size: 0.08, gravity: 9, span: 1.6 });
      }
    }
    cracks.current = s.cracked;

    // The crow is down on the stone before the camera leaves for the wall.
    const flight = smoothstep(0.42, 0.6, p);
    if (crossed(landed, flight, 1)) {
      landedAt.current = time.current;
      burst(SPOT.set(x0 + 0.4, TOMB_H + 0.1, 0), palette.stone, 5, { speed: 1, size: 0.12, gravity: 1.5, span: 0.6 });
    }
    // It dips on its legs as it lands.
    const settle = Math.min(10, time.current - landedAt.current);
    const c = crow.current;
    c.visible = flight > 0;
    c.flying = flight < 1 ? 1 : 0;
    c.position.set(
      x0 + 0.4 - (1 - flight) * 11 - Math.sin(flight * Math.PI) * 1.5,
      TOMB_H + 0.45 + (1 - flight) ** 2 * 8 - 0.1 * Math.exp(-5 * settle) * Math.sin(settle * 16),
      0,
    );
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
    const g = new THREE.ConeGeometry(1.5, BEAM, 40, 1, true);
    g.translate(0, -BEAM / 2, 0);
    return g;
  }, []);
  const beamFade = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 128;
    const g = canvas.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 0, 128);
    // An alpha map is read from the green channel, so the fade is in greys.
    grad.addColorStop(0, "rgb(13,13,13)");
    grad.addColorStop(0.75, "rgb(153,153,153)");
    grad.addColorStop(1, "rgb(255,255,255)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);
  const packets = useRef<(THREE.Group | null)[]>([]);
  const packetMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const riders = [useGhostState({ position: [0, 0, 0], scale: 0.42 }), useGhostState({ position: [0, 0, 0], scale: 0.42 })];
  const cone = useRef<THREE.Mesh>(null!);
  const wasStopped = useRef([true, true, true]);
  // A packet stops with its face just short of the bricks, after a whole number of quarter turns.
  const stopX = wallX - 1.455;
  const loop = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      pts.push([x0 - 6 + Math.cos(a) * 2.4, 2.6 + Math.sin(a) * 1.6, 0.5]);
    }
    return pts;
  }, [x0]);

  const scanner = useMemo(() => new THREE.Vector3(wallX - 0.7, 7.72, 1.5), [wallX]);
  const aim = useMemo(() => new THREE.Vector2(), []);

  useFrame((frame, delta) => {
    const t = time.current;
    // The scanner locks on the packet that comes up to the wall; with none in reach it sweeps.
    let turn = -0.35 + Math.sin(t * 1.4) * 0.22;
    packets.current.forEach((pk, i) => {
      if (!pk) return;
      const u = (t * 0.28 + i / 3) % 1;
      const run = Math.min(1, u * 1.4);
      const stopped = run >= 1;
      // A cube that rolls: a quarter turn for each of its sides, and its centre rises as it tips over an edge.
      const quarters = run * TURNS;
      const tip = (quarters % 1) * (Math.PI / 2);
      const x = mix(stopX - TURNS * SIDE, stopX, run);
      const z = 0.6 + (i - 1) * 0.5;
      pk.position.set(x, (SIDE / Math.SQRT2) * Math.sin(tip + Math.PI / 4), z);
      pk.rotation.z = -quarters * (Math.PI / 2);
      // It grows out of the apps and shrinks away at the wall: no packet appears or goes by a cut.
      pk.scale.setScalar(smoothstep(0, 0.05, u) * (1 - smoothstep(0.88, 1, u)));
      const m = packetMats.current[i];
      if (m) m.color.copy(palette.paper).lerp(palette.dangerGlow, smoothstep(0.93, 1, run));
      if (stopped && !wasStopped.current[i]) burst(SPOT.set(x + 0.3, 0.4, z), palette.dangerGlow, 3, { speed: 2.2, size: 0.1, span: 0.6 });
      wasStopped.current[i] = stopped;
      // The window is shorter than the gap between packets, so the sweep plays between two of them.
      if (u > 0.54 && u < 0.84) turn = Math.atan2(x - scanner.x, scanner.y - 0.3);
    });
    // The reader's pointer takes the scanner over while it moves.
    if (pointer.idle < 3) {
      toPointer(frame, scanner, aim);
      turn = THREE.MathUtils.clamp(Math.atan2(aim.x, -aim.y), -1.2, 0.3);
    }
    beam.current.rotation.z = THREE.MathUtils.damp(beam.current.rotation.z, turn, 6, delta);
    // The beam is as long as it takes to reach the ground at its angle.
    cone.current.scale.y = scanner.y / Math.cos(beam.current.rotation.z) / BEAM;
    riders.forEach((r, i) => {
      const u = (t * 0.12 + i * 0.5) % 1;
      const x = mix(x0 - 5, x0 + 7, u);
      r.current.position.set(x, 1.6 + Math.sin(u * Math.PI) * 1.2, 0.2 - i * 0.6);
      const inside = smoothstep(wallX - 1.7, wallX - 1, x) * (1 - smoothstep(wallX + 1, wallX + 1.7, x));
      r.current.phase = inside;
      r.current.lag = 0.8;
      // It comes out of the apps by a fade, and goes into the globe.
      r.current.fade = smoothstep(0, 0.08, u) * (1 - smoothstep(0.93, 1, u));
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
      <group position={scanner}>
        {/* An arm out of the coping holds the head in front of the wall. */}
        <mesh position={[0, 0, -0.3]}>
          <boxGeometry args={[0.12, 0.12, 0.6]} />
          <meshStandardMaterial color={palette.ink} roughness={0.5} metalness={0.4} />
        </mesh>
        <group ref={beam} rotation-z={-0.35}>
          {/* The head turns with the beam: a pill with a hood, and the red lens in its end. */}
          <mesh position={[0, 0.2, 0]}>
            <capsuleGeometry args={[0.24, 0.4, 6, 20]} />
            <meshStandardMaterial color={palette.stone} roughness={0.55} metalness={0.35} />
          </mesh>
          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.27, 0.3, 0.22, 20, 1, true]} />
            <meshStandardMaterial color={palette.ink} roughness={0.5} metalness={0.4} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.14, 0]}>
            <sphereGeometry args={[0.17, 16, 12]} />
            <meshBasicMaterial color={palette.dangerGlow} toneMapped={false} />
          </mesh>
          <mesh ref={cone} geometry={beamGeometry} userData={{ noShadow: true }}>
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
          <spotLight ref={spot} color={palette.danger} intensity={260} distance={24} angle={0.2} penumbra={0.35} decay={1.8} />
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

/** The length of the scanner's beam cone before it is stretched to the ground. */
const BEAM = 7.6;
/** The side of a plain packet, and the quarter turns it rolls before the wall. */
const SIDE = 0.55;
const TURNS = 8;

const NAME = "EXAMPLE.ORG";
const NOISE = "#%&*@!?$#%&";
/** How far to the left of the ghost of the Trouble scene its lens is, in world units (see `Lens`). */
const LENS_DX = 1.12;
/** The height of the gantry's beam, and of the arm on it. */
const ARM_Y = 5.5;

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
  const shaft = useRef<THREE.Mesh>(null!);
  const mark =useRef<THREE.MeshBasicMaterial>(null!);
  const stampLight = useRef<THREE.PointLight>(null!);
  const board = useRef<{ text: string } | null>(null);
  const shown = useRef("");
  const struck = useRef(Infinity);

  useFrame(() => {
    const p = local(chapter.current, at("checkpoint"));
    const walk = smoothstep(0.05, 0.85, p);
    const g = ghost.current;
    g.position.set(mix(x0 - 6, x0 + 6, walk), 1, 0.6);
    g.lag = Math.sin(walk * Math.PI) * 0.7;
    const down = smoothstep(0.38, 0.46, p) * (1 - smoothstep(0.56, 0.64, p));
    stamp.current.position.y = mix(4.4, 0.03, down);
    // The shaft runs from the block up to the arm of the gantry, whatever the height of the block.
    const shaftLength = ARM_Y - 0.15 - (stamp.current.position.y + 0.5);
    shaft.current.scale.y = shaftLength;
    shaft.current.position.y = 0.5 + shaftLength / 2;
    // Dust goes up on both sides where the stamp comes down.
    if (crossed(struck, down, 0.97)) {
      for (const dx of [-1.1, 1.1]) burst(SPOT.set(x0 + dx, 0.1, 0.9), palette.stone, 4, { speed: 1.2, size: 0.12, gravity: 1.5, span: 0.6 });
    }
    // The ghost is an outline from before the block reaches it until it is clear of the block (2.2 apart).
    g.phase = smoothstep(0, 0.12, down) * (1 - smoothstep(2.2, 2.8, Math.abs(g.position.x - x0)));
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
        <group key={dx} position={[x0 + dx, 0, -0.4]}>
          <mesh position={[0, 2.75, 0]}>
            <boxGeometry args={[0.22, 5.5, 0.22]} />
            <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <boxGeometry args={[0.7, 0.14, 0.5]} />
            <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.35} />
          </mesh>
        </group>
      ))}
      <mesh position={[x0, 5.5, -0.4]}>
        <boxGeometry args={[4.4, 0.3, 0.3]} />
        <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.35} />
      </mesh>
      {/* The arm that holds the stamp out over the ghost's path. */}
      <mesh position={[x0, ARM_Y, 0.1]}>
        <boxGeometry args={[0.3, 0.3, 1.3]} />
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
        {/* The plate that prints, and the body that holds it. */}
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[1.8, 0.14, 1.2]} />
          <meshBasicMaterial color={palette.dangerGlow} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <boxGeometry args={[1.3, 0.36, 0.85]} />
          <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.35} />
        </mesh>
        <pointLight ref={stampLight} position={[0, 0.5, 0.9]} color={palette.danger} distance={7} decay={1.6} />
        <mesh ref={shaft}>
          <cylinderGeometry args={[0.1, 0.1, 1, 8]} />
          <meshStandardMaterial color={palette.ink} roughness={0.55} metalness={0.35} />
        </mesh>
      </group>
      <mesh position={[x0, 0.02, 0.6]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.8, 1.2]} />
        <meshBasicMaterial ref={mark} color={palette.danger} transparent opacity={0} depthWrite={false} />
      </mesh>
      <Ghost state={ghost} id={3}>
        <SealedName />
      </Ghost>
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
  const time = useSceneTime();
  const x0 = station("trouble");
  const posts = [-4.5, -2, 0.5, 3, 5.5].map((dx) => x0 + dx);
  const BREAK = 3; // the lamp at the break
  const lamps = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const signalLight = useRef<THREE.PointLight>(null!);
  const dangerLight = useRef<THREE.PointLight>(null!);
  const ghost = useGhostState({ position: [x0 - 6, 3.4, 0.8], scale: 0.7 });
  const lampAt = useMemo(() => new THREE.Vector3(), []);
  const near = useMemo(() => new THREE.Vector2(), []);
  const sparked = useRef<number | null>(null);
  // The spans past the break carry nothing: they are dull, not the colour of the signal.
  const dead = useMemo(() => palette.ink.clone().lerp(palette.nightLight, 0.25), [palette]);
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
    const out: [number, number, number][][] = [sag(x0 - 6.8, posts[0]!, 0)];
    for (let i = 0; i < posts.length - 1; i++) {
      if (i === BREAK - 1) out.push(sag(posts[i]!, posts[i + 1]!, 1), sag(posts[i]!, posts[i + 1]!, 2));
      else out.push(sag(posts[i]!, posts[i + 1]!, 0));
    }
    out.push(sag(posts[posts.length - 1]!, x0 + 6.8, 0));
    return out;
  }, [x0]); // eslint-disable-line react-hooks/exhaustive-deps -- posts derive from x0

  useFrame((frame) => {
    const p = local(chapter.current, at("trouble"));
    const walk = smoothstep(0.08, 0.7, p);
    // The ghost holds the lens below it, to its left: the walk puts the lens on each lamp in turn and ends on the break.
    const gx = mix(x0 - 6, posts[BREAK]! + LENS_DX, walk);
    const lensX = gx - LENS_DX;
    const tested = (i: number) => (i <= BREAK ? smoothstep(posts[i]! - 0.9, posts[i]! - 0.1, lensX) : 0);
    lamps.current.forEach((m, i) => {
      if (!m) return;
      let on = tested(i);
      // The reader can test the line before the ghost does: a lamp under the pointer shows what it carries.
      // Past the break nothing arrives, so those lamps stay dark.
      if (pointer.idle < 4 && i <= BREAK) {
        on = Math.max(on, 1 - smoothstep(0.08, 0.2, toPointer(frame, lampAt.set(posts[i]!, 2.75, 0), near).length()));
      }
      m.color.copy(palette.ink).lerp(i === BREAK ? palette.dangerGlow : palette.signalGlow, on);
    });
    // One signal light rides the last lit lamp; the break has its own red light.
    let last = 0;
    for (let i = 1; i < BREAK; i++) if (tested(i) > 0.5) last = i;
    signalLight.current.position.set(posts[last]!, 2.9, 0.4);
    signalLight.current.intensity = 26 * tested(0);
    dangerLight.current.intensity = 34 * tested(BREAK);
    const g = ghost.current;
    // It leans the way it goes: forward as the reader scrolls on, back as the reader scrolls back, not at all at rest.
    const step = gx - g.position.x;
    g.lag = Math.abs(step) > 1e-4 ? Math.sign(step) * 0.5 : 0;
    g.position.set(gx, 3.6, 0.8);
    // The loose end spits a few sparks now and then, while the camera is here.
    const beat = Math.floor(time.current / 4.8);
    if (sparked.current !== null && beat !== sparked.current && Math.abs(chapter.current - at("trouble") - 0.4) < 0.7) {
      burst(SPOT.set(posts[BREAK - 1]! + 1.1, 1.05, 0), palette.dangerGlow, 3, { speed: 1.8, size: 0.08, span: 0.6 });
    }
    sparked.current = beat;
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
        <Line key={i} points={pts} color={i >= 4 ? dead : palette.signal} lineWidth={2.5} />
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
      <Ghost state={ghost} id={4}>
        <Lens />
      </Ghost>
      <Globe x={x0 + 7.6} />
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
        // It leaves the port on the device straight up, then bends toward the wall.
        new THREE.Vector3(x0 - 5, 3.45, 0),
        new THREE.Vector3(x0 - 4.8, 4.35, 0),
        new THREE.Vector3(x0 - 2, 5.2, 0),
        new THREE.Vector3(wallX, 4.6, 0),
        new THREE.Vector3(x0 + 5, 4.2, 0),
        new THREE.Vector3(x0 + 7.4, 2.6, 0),
      ]),
    [x0, wallX],
  );
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 160, 0.42, 24, false), [curve]);
  // A glass tube: clear where the eye looks through its wall, bright where it looks along it.
  const glass = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: { tint: { value: palette.signalGlow } },
        vertexShader:
          "varying vec3 vN; varying vec3 vV; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }",
        fragmentShader:
          "uniform vec3 tint; varying vec3 vN; varying vec3 vV; void main() { float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0); gl_FragColor = vec4(tint, mix(0.1, 0.7, rim));\n#include <colorspace_fragment>\n}",
      }),
    [palette],
  );
  useEffect(() => () => glass.dispose(), [glass]);
  const riders = [0, 1, 2, 3].map(() => useGhostState({ position: [0, 0, 0], scale: 0.32, still: true })); // eslint-disable-line react-hooks/rules-of-hooks -- fixed count
  const presser = useGhostState({ position: [x0 - 7.2, 0.9, 1.4] });
  const spark = useRef<THREE.Mesh>(null!);
  const tip = useRef<THREE.Mesh>(null!);
  const holes = useRef<(THREE.Mesh | null)[]>([]);
  // Where the tunnel goes into the wall and comes out of it: a ring opens on each face as the tunnel gets there.
  const holeAt = useMemo(
    () =>
      [wallX - 1.1, wallX + 1.1].map((face) => {
        let u = 0;
        while (u < 1 && curve.getPointAt(u).x < face) u += 0.005;
        return { u, at: curve.getPointAt(u) };
      }),
    [curve, wallX],
  );
  const tapped = useRef(-Infinity);
  // Under reduced motion the scene's time stands still, so a tap would leave its spark hanging.
  const animate = useThree((s) => s.frameloop === "always");

  useFrame(() => {
    const p = local(chapter.current, at("connect"));
    const pressed = smoothstep(0.08, 0.16, p);
    const grown = smoothstep(0.16, 0.5, p);
    // A tap on the device lights its button and sends one bright packet as far as the tunnel has grown.
    const sent = (time.current - tapped.current) / 1.8;
    button.current.color.copy(palette.mid).lerp(palette.signalGlow, Math.max(pressed, 1 - sent));
    spark.current.visible = sent < Math.min(1, grown);
    if (spark.current.visible) curve.getPointAt(sent, spark.current.position);
    geometry.setDrawRange(0, Math.floor((geometry.index?.count ?? 0) * grown));
    tube.current.visible = grown > 0.01;
    lights.current.forEach((l, i) => l && (l.intensity = (i === 0 ? pressed : smoothstep(i * 0.3, i * 0.3 + 0.3, grown)) * 22));
    // The ghost leans in to the device, touches the button with narrowed eyes, and comes back.
    const press = Math.sin(pressed * Math.PI);
    const g = presser.current;
    g.position.x = x0 - 7.2 + press * 0.75;
    g.lag = press * 0.6;
    g.open = 1 - press * 0.55;
    g.look = 1;
    // A bright point leads the tunnel while it grows.
    tip.current.scale.setScalar(smoothstep(0, 0.03, grown) * (1 - smoothstep(0.95, 1, grown)));
    curve.getPointAt(grown, tip.current.position);
    holes.current.forEach((h, i) => h && h.scale.setScalar(smoothstep(holeAt[i]!.u, holeAt[i]!.u + 0.04, grown)));
    riders.forEach((r, i) => {
      const u = (time.current * 0.1 + i / 4) % 1;
      const s = r.current;
      // A rider comes out of the device and goes into the globe by a fade, and rides only the tunnel that is there.
      s.fade = smoothstep(0, 0.1, u) * (1 - smoothstep(0.9, 1, u)) * smoothstep(u, u + 0.06, grown);
      const pt = curve.getPointAt(u, SPOT);
      s.position.set(pt.x, pt.y - 0.42, pt.z);
      s.lag = 0.8;
      s.phase = smoothstep(wallX - 1.6, wallX - 1, pt.x) * (1 - smoothstep(wallX + 1, wallX + 1.6, pt.x));
    });
  });

  return (
    <group>
      <group
        onClick={animate ? () => void (tapped.current = time.current) : undefined}
        onPointerOver={animate ? () => void (document.body.style.cursor = "pointer") : undefined}
        onPointerOut={animate ? () => void (document.body.style.cursor = "") : undefined}
      >
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
      </group>
      <mesh ref={spark} visible={false} userData={{ noShadow: true }}>
        <sphereGeometry args={[0.3, 16, 12]} />
        <meshBasicMaterial color={palette.signalGlow} toneMapped={false} />
      </mesh>
      <mesh ref={tip} scale={0} userData={{ noShadow: true }}>
        <sphereGeometry args={[0.2, 12, 8]} />
        <meshBasicMaterial color={palette.signalGlow} toneMapped={false} />
      </mesh>
      {holeAt.map(({ at: hole }, i) => (
        <mesh key={i} ref={(h) => void (holes.current[i] = h)} position={hole} rotation-y={Math.PI / 2} userData={{ noShadow: true }}>
          <torusGeometry args={[0.52, 0.06, 8, 32]} />
          <meshBasicMaterial color={palette.signalGlow} toneMapped={false} />
        </mesh>
      ))}
      <Shadow x={x0 - 5} w={1.4} d={0.5} />
      <mesh ref={tube} geometry={geometry} material={glass} />
      {/* The port on top of the device that the tunnel comes out of. */}
      <group position={[x0 - 5, 3.45, 0]}>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.5, 0.56, 0.14, 24]} />
          <meshStandardMaterial color={palette.ink} roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.12, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.46, 0.06, 8, 32]} />
          <meshStandardMaterial color={palette.ink} roughness={0.5} metalness={0.4} />
        </mesh>
      </group>
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
  const zs = useRef<((THREE.Object3D & { fillOpacity: number }) | null)[]>([]);
  const flies = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(() => {
    const t = time.current;
    const g = ghost.current;
    const u = (Math.sin(t * 0.3) + 1) / 2;
    g.position.set(mix(x0 - 1.5, x0 + 2.5, u), 1.1, 1.6);
    g.lag = Math.cos(t * 0.3) * 0.5;
    zs.current.forEach((z, i) => {
      if (!z) return;
      const k = (t * 0.35 + i / 3) % 1;
      z.position.set(x0 - 6.5 + k * 0.8, 3.2 + k * 2.2, 0.3);
      z.scale.setScalar(0.5 + k * 0.5);
      // Each letter comes out of the phone and thins away as it rises.
      z.fillOpacity = smoothstep(0, 0.15, k) * (1 - k) * 0.9;
    });
    // Fireflies drift over the grave and glow in turn.
    flies.current.forEach((f, i) => {
      if (!f) return;
      f.position.set(
        x0 - 4 + hash(i + 40) * 12 + Math.sin(t * 0.3 + i * 1.7) * 1.2,
        0.9 + hash(i + 50) * 2.6 + Math.sin(t * 0.5 + i * 2.3) * 0.4,
        -1 + hash(i + 60) * 3.5,
      );
      f.scale.setScalar(0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.9)));
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
      {/* The lantern the ghost carries is the signal: it stays lit all night. */}
      <Ghost state={ghost} id={6} glow={1}>
        <Lantern />
      </Ghost>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} ref={(f) => void (flies.current[i] = f)} userData={{ noShadow: true }}>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshBasicMaterial color={palette.signalGlow} toneMapped={false} />
        </mesh>
      ))}
      <Tree x={x0 - 11} z={-2.5} scale={1.1} />
    </group>
  );
}
