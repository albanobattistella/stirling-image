import type React from "react";
import { AbsoluteFill } from "remotion";
import { FeaturePill } from "@/components/FeaturePill";

const FEATURES = [
  { label: "Batch Processing", col: 0, row: 0, from: "left" as const },
  { label: "Pipeline Automation", col: 1, row: 0, from: "right" as const },
  { label: "REST API", col: 0, row: 1, from: "left" as const },
  { label: "55+ Input Formats", col: 1, row: 1, from: "right" as const },
  { label: "Image Editor", col: 0, row: 2, from: "left" as const },
  { label: "One Container", col: 1, row: 2, from: "right" as const },
  { label: "Multi-arch", col: 0, row: 3, from: "left" as const },
  { label: "15 AI Models", col: 1, row: 3, from: "right" as const },
];

const PILL_WIDTH = 200;
const GAP_X = 20;
const GAP_Y = 16;
const PILL_HEIGHT = 50;
const GRID_WIDTH = PILL_WIDTH * 2 + GAP_X;
const GRID_HEIGHT = PILL_HEIGHT * 4 + GAP_Y * 3;
const START_X = (1080 - GRID_WIDTH) / 2;
const START_Y = (1080 - GRID_HEIGHT) / 2;

export const FeatureBurstScene: React.FC = () => {
  return (
    <AbsoluteFill>
      {FEATURES.map((f, i) => {
        const x = START_X + f.col * (PILL_WIDTH + GAP_X);
        const y = START_Y + f.row * (PILL_HEIGHT + GAP_Y);
        return (
          <FeaturePill
            key={f.label}
            label={f.label}
            enterFrame={i * 8}
            targetX={x}
            targetY={y}
            fromDirection={f.from}
          />
        );
      })}
    </AbsoluteFill>
  );
};
