import type React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { RotatingTaglines } from "@/components/RotatingTaglines";
import { COLOR } from "@/lib/colors";

const TAGLINES = [
  "No uploads to the cloud. Ever.",
  "100% local processing.",
  "Works fully offline.",
  "Air-gapped ready.",
];

export const PrivacyBeatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const totalFrames = 120;

  const bgScale = interpolate(frame, [0, totalFrames], [1.0, 1.05], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill>
        <Img
          src={staticFile("screenshots/dashboard.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.12,
            transform: `scale(${bgScale})`,
          }}
        />
      </AbsoluteFill>

      <RotatingTaglines
        lines={TAGLINES}
        startFrame={0}
        framesPerLine={30}
        fontSize={48}
        color={COLOR.accent}
      />
    </AbsoluteFill>
  );
};
