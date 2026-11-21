import { Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
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
  // The lightest thing in the frame, kept just under the bloom threshold so the words do not glow.
  const color = useMemo(() => palette.nightLight.clone().multiplyScalar(1.25), [palette]);
  const chapter = useChapter();
  const size = useThree((s) => s.size);
  const fov = useThree((s) => (s.camera as THREE.PerspectiveCamera).fov);
  const texts = useRef<({ fillOpacity: number; position: THREE.Vector3; visible: boolean } | null)[]>([]);
  const aspect = size.width / size.height;
  const layout = CHAPTERS.map((ch, i) => {
    const shot = shotAt(i, aspect);
    const distance = shot.z * backOff(aspect) - DEPTH;
    const width = 2 * distance * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * aspect;
    const height = width / aspect;
    const maxWidth = width * (shot.captionWidth ?? 0.82);
    // A narrow caption shrinks until its longest word fits on one line (a glyph of this face is about 0.56 em wide).
    const longest = Math.max(...ch.caption.split(" ").map((w) => w.length));
    const fontSize = Math.min(height * 0.17, width * 0.12, maxWidth / (longest * 0.56));
    return { x: shot.lookX - width * 0.43, y: shot.lookY + height * (shot.caption ?? 0.27), maxWidth, fontSize };
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
        const { x, y, maxWidth, fontSize } = layout[i]!;
        return (
          <Text
            key={ch.id}
            ref={(t: { fillOpacity: number; position: THREE.Vector3; visible: boolean } | null) => void (texts.current[i] = t)}
            font={FONT}
            fontSize={fontSize}
            maxWidth={maxWidth}
            lineHeight={0.92}
            letterSpacing={-0.045}
            position={[x, y, DEPTH]}
            anchorX="left"
            anchorY="middle"
            color={color}
          >
            {ch.caption}
          </Text>
        );
      })}
    </group>
  );
}
