import type React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { RotatingTaglines } from "@/components/RotatingTaglines";

const TAGLINES = [
  "No signups.",
  "No uploads.",
  "No limits.",
  "Free forever.",
  "Open source.",
  "Fully offline.",
];

export const TaglineCascadeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const totalFrames = 150;

  const bgScale = interpolate(frame, [0, totalFrames], [1.0, 1.1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Img
          src={staticFile("screenshots/dashboard.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.15,
            transform: `scale(${bgScale})`,
          }}
        />
      </AbsoluteFill>

      <RotatingTaglines
        lines={TAGLINES}
        startFrame={0}
        framesPerLine={25}
        fontSize={56}
        color="white"
      />
    </AbsoluteFill>
  );
};
