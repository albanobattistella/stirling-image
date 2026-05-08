import type React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Counter } from "@/components/Counter";
import { ToolGrid } from "@/components/ToolGrid";
import { COLOR } from "@/lib/colors";
import { TEXT } from "@/lib/fonts";

export const ToolGridRevealScene: React.FC = () => {
  const frame = useCurrentFrame();

  const gridOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 40,
          right: 40,
          opacity: gridOpacity,
          transform: "scale(0.85)",
          transformOrigin: "top center",
        }}
      >
        <ToolGrid startFrame={10} cellWidth={110} cellHeight={26} gap={4} />
      </div>

      <div style={{ position: "absolute", bottom: 60, right: 80 }}>
        <Counter
          from={0}
          to={49}
          startFrame={10}
          duration={90}
          style={{
            ...TEXT.counter,
            fontSize: 64,
            color: COLOR.accent,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
