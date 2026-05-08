import type React from "react";
import { AbsoluteFill } from "remotion";
import { RotatingTaglines } from "@/components/RotatingTaglines";
import { COLOR } from "@/lib/colors";

const TAGLINES = [
  "No uploads to the cloud. Ever.",
  "100% local processing.",
  "Works fully offline.",
  "Air-gapped ready.",
];

export const PrivacyBeatScene: React.FC = () => {
  return (
    <AbsoluteFill>
      <RotatingTaglines
        lines={TAGLINES}
        startFrame={0}
        framesPerLine={30}
        fontSize={36}
        color={COLOR.accent}
      />
    </AbsoluteFill>
  );
};
