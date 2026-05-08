import type React from "react";
import { AbsoluteFill } from "remotion";
import { Terminal } from "@/components/Terminal";

const COMMAND = [
  { text: "docker", color: "#ff7b72" },
  { text: " run ", color: "#e6edf3" },
  { text: "-p ", color: "#79c0ff" },
  { text: "3000:3000", color: "#a5d6ff" },
  { text: " ", color: "#e6edf3" },
  { text: "snapotter/snapotter", color: "#7ee787" },
];

const OUTPUT = [
  { text: "v2.4.0", color: "#f59e0b", delay: 0 },
  { text: "49 tools loaded", color: "#7ee787", delay: 3 },
  { text: "15 AI models ready", color: "#7ee787", delay: 6 },
  { text: "✓ Server running on :3000", color: "#3fb950", delay: 9 },
];

export const TerminalInstallScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Terminal
        command={COMMAND}
        commandStartFrame={15}
        commandSpeed={2}
        outputLines={OUTPUT}
        outputStartFrame={95}
        outputStagger={8}
        width={800}
        height={350}
        enterFrame={0}
      />
    </AbsoluteFill>
  );
};
