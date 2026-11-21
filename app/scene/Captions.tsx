import { Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import { CHAPTERS } from "~/story/chapters";
import { chapterShown } from "~/story/progress";
import { smoothstep, useChapter, usePalette } from "./kit";
import { backOff, shotAt } from "./shots";
import { FONT } from "./Tomb";

/** The captions stand in the landscape, behind the props, so the stone, the wall and the ghosts pass in front. */
const DEPTH = -4.5;

export function Captions() {
  const palette = usePalette();
  const chapter = useChapter();
  const size = useThree((s) => s.size);
  const fov = useThree((s) => (s.camera as THREE.PerspectiveCamera).fov);
  const texts = useRef<({ fillOpacity: number; position: THREE.Vector3; visible: boolean } | null)[]>([]);
  const aspect = size.width / size.height;
  const layout = CHAPTERS.map((_, i) => {
    const shot = shotAt(i);
    const distance = shot.z * backOff(aspect) - DEPTH;
    const width = 2 * distance * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * aspect;
    const height = width / aspect;
    return { x: shot.lookX - width * 0.43, y: shot.lookY + height * (shot.caption ?? 0.27), width, fontSize: Math.min(height * 0.17, width * 0.12) };
  });

  useFrame(() => {
    const c = chapter.current;
    texts.current.forEach((t, i) => {
      if (!t) return;
      // The first caption gives way early to the carving it names.
      const a = i === 0 ? 1 - smoothstep(0.16, 0.28, c) : chapterShown(i, c);
      t.visible = a > 0.005;
      t.fillOpacity = a;
      // Rises a little as it comes in, and keeps rising as it goes.
      t.position.y = layout[i]!.y + (1 - smoothstep(-0.12, 0.1, c - i)) * -0.6 + smoothstep(0.5, 0.8, c - i) * 0.6;
    });
  });

  return (
    <group userData={{ noShadow: true }}>
      {CHAPTERS.map((ch, i) => {
        const { x, y, width, fontSize } = layout[i]!;
        return (
          <Text
            key={ch.id}
            ref={(t: { fillOpacity: number; position: THREE.Vector3; visible: boolean } | null) => void (texts.current[i] = t)}
            font={FONT}
            fontSize={fontSize}
            maxWidth={width * 0.82}
            lineHeight={0.92}
            letterSpacing={-0.045}
            position={[x, y, DEPTH]}
            anchorX="left"
            anchorY="middle"
            color={palette.nightLight}
          >
            {ch.caption}
          </Text>
        );
      })}
    </group>
  );
}
