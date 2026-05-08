import type React from "react";
import { AbsoluteFill } from "remotion";
import { FeaturePill } from "@/components/FeaturePill";

const FEATURES = [
  { label: "Batch Processing", x: 340, y: 380, from: "left" as const },
  { label: "Pipeline Automation", x: 560, y: 380, from: "right" as const },
  { label: "REST API", x: 340, y: 440, from: "left" as const },
  { label: "55+ Input Formats", x: 560, y: 440, from: "right" as const },
  { label: "Image Editor", x: 340, y: 500, from: "left" as const },
  { label: "One Container", x: 560, y: 500, from: "right" as const },
  { label: "Multi-arch", x: 340, y: 560, from: "left" as const },
  { label: "15 AI Models", x: 560, y: 560, from: "right" as const },
];

export const FeatureBurstScene: React.FC = () => {
  return (
    <AbsoluteFill>
      {FEATURES.map((f, i) => (
        <FeaturePill
          key={f.label}
          label={f.label}
          enterFrame={i * 8}
          targetX={f.x}
          targetY={f.y}
          fromDirection={f.from}
        />
      ))}
    </AbsoluteFill>
  );
};
