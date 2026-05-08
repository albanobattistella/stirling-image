import type React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { NumberPunch } from "@/components/NumberPunch";

const PUNCHES = [
  { number: "49", descriptor: "tools", frame: 0 },
  { number: "15", descriptor: "AI models", frame: 37 },
  { number: "55+", descriptor: "formats", frame: 74 },
  { number: "1", descriptor: "container", frame: 111 },
];

export const NumberPunchScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {PUNCHES.map((p, i) => {
        const segmentEnd = i < PUNCHES.length - 1 ? PUNCHES[i + 1].frame : p.frame + 37;
        const fadeInOpacity = interpolate(frame, [p.frame, p.frame + 4], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const fadeOutOpacity = interpolate(frame, [segmentEnd - 6, segmentEnd], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const isLastPunch = i === PUNCHES.length - 1;
        const visible = frame >= p.frame && frame < segmentEnd;
        const opacity = isLastPunch ? fadeInOpacity : Math.min(fadeInOpacity, fadeOutOpacity);

        if (!visible) return null;

        return (
          <AbsoluteFill
            key={p.number}
            style={{ justifyContent: "center", alignItems: "center", opacity }}
          >
            <NumberPunch
              number={p.number}
              descriptor={p.descriptor}
              enterFrame={p.frame}
              numberSize={200}
              shakeIntensity={2}
            />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
