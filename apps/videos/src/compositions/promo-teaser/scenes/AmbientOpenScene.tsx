import type React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { GradientBlob } from "@/components/GradientBlob";

const BLOBS = [
  {
    color: "#f59e0b",
    radius: 200,
    cx: 300,
    cy: 400,
    a: 1,
    b: 2,
    phaseX: 0,
    phaseY: 0,
    amplitudeX: 60,
    amplitudeY: 40,
  },
  {
    color: "#f97316",
    radius: 150,
    cx: 750,
    cy: 250,
    a: 2,
    b: 1,
    phaseX: 1.2,
    phaseY: 0.8,
    amplitudeX: 50,
    amplitudeY: 60,
  },
  {
    color: "#d97706",
    radius: 180,
    cx: 540,
    cy: 700,
    a: 1,
    b: 1,
    phaseX: 2.4,
    phaseY: 1.6,
    amplitudeX: 70,
    amplitudeY: 50,
  },
];

const SCREENSHOTS = ["dashboard.png", "resize-tool.png", "editor.png"];
const CYCLE_FRAMES = 30;

export const AmbientOpenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const currentIdx = Math.floor(frame / CYCLE_FRAMES) % SCREENSHOTS.length;
  const nextIdx = (currentIdx + 1) % SCREENSHOTS.length;
  const cycleProgress = (frame % CYCLE_FRAMES) / CYCLE_FRAMES;

  const currentOpacity = interpolate(cycleProgress, [0, 0.8, 1], [0.6, 0.6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const nextOpacity = interpolate(cycleProgress, [0.7, 1], [0, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(frame % CYCLE_FRAMES, [0, CYCLE_FRAMES], [1.05, 1.0], {
    extrapolateRight: "clamp",
  });

  const rotation = (currentIdx % 2 === 0 ? 1 : -1) * 3.5;

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      {BLOBS.map((blob, i) => (
        <GradientBlob key={`ambient-${i}`} config={blob} duration={600} />
      ))}

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            width: 700,
            height: 450,
            position: "relative",
            transform: `rotate(${rotation}deg) scale(${scale})`,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          <Img
            src={staticFile(`screenshots/${SCREENSHOTS[currentIdx]}`)}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: currentOpacity,
            }}
          />
          <Img
            src={staticFile(`screenshots/${SCREENSHOTS[nextIdx]}`)}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: nextOpacity,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
