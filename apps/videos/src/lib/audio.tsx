import { Audio } from "@remotion/media";
import type React from "react";
import { interpolate, staticFile, useCurrentFrame } from "remotion";

export const BackgroundMusic: React.FC<{
  src?: string;
  volume?: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  totalFrames: number;
}> = ({ src, volume = 0.4, fadeInFrames = 30, fadeOutFrames = 60, totalFrames }) => {
  const frame = useCurrentFrame();
  if (!src) return null;

  const vol = interpolate(
    frame,
    [0, fadeInFrames, totalFrames - fadeOutFrames, totalFrames],
    [0, volume, volume, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return <Audio src={src} volume={vol} />;
};
