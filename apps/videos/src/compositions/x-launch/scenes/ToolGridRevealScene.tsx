import type React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { AppWindow } from "@/components/AppWindow";
import { Counter } from "@/components/Counter";
import { COLOR } from "@/lib/colors";
import { TEXT } from "@/lib/fonts";

export const ToolGridRevealScene: React.FC = () => {
  const frame = useCurrentFrame();
  const totalFrames = 180;

  const scale = interpolate(frame, [0, totalFrames], [1.0, 1.08], {
    extrapolateRight: "clamp",
  });
  const windowOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ opacity: windowOpacity }}>
        <AppWindow
          title="SnapOtter"
          width={900}
          height={900}
          topBarColor="#1a1a2e"
          bodyColor="#0f172a"
        >
          <div style={{ overflow: "hidden", width: "100%", height: "100%" }}>
            <Img
              src={staticFile("screenshots/dashboard.png")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${scale})`,
              }}
            />
          </div>
        </AppWindow>
      </div>

      <div style={{ position: "absolute", bottom: 60, right: 80 }}>
        <Counter
          from={0}
          to={49}
          startFrame={10}
          duration={90}
          style={{
            ...TEXT.counter,
            fontSize: 120,
            color: COLOR.accent,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
