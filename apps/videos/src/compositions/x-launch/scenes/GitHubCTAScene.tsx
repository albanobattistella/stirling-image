import type React from "react";
import { AbsoluteFill } from "remotion";
import { GitHubCTA } from "@/components/GitHubCTA";

export const GitHubCTAScene: React.FC = () => {
  return (
    <AbsoluteFill>
      <GitHubCTA labelFrame={5} logoFrame={20} taglineFrame={40} ctaFrame={60} urlFrame={75} />
    </AbsoluteFill>
  );
};
