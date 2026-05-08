import type React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FONT } from "@/lib/fonts";

export const AiShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const totalFrames = 180;

  const crossfade = interpolate(frame, [80, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale1 = interpolate(frame, [0, 90], [1.0, 1.05], {
    extrapolateRight: "clamp",
  });
  const scale2 = interpolate(frame, [90, totalFrames], [1.0, 1.05], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const textOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill>
        <Img
          src={staticFile("screenshots/remove-bg.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale1})`,
            opacity: 1 - crossfade,
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill>
        <Img
          src={staticFile("screenshots/resize-tool.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale2})`,
            opacity: crossfade,
          }}
        />
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          bottom: 40,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT.body,
          fontWeight: 600,
          fontSize: 24,
          color: "rgba(255,255,255,0.9)",
          opacity: textOpacity,
          textShadow: "0 2px 12px rgba(0,0,0,0.7)",
        }}
      >
        15 AI models. Your hardware. No cloud.
      </div>
    </AbsoluteFill>
  );
};
