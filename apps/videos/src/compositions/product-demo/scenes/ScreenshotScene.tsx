import type React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { AppWindow } from "@/components/AppWindow";
import { ClipReveal } from "@/components/ClipReveal";
import { TEXT } from "@/lib/fonts";

export const ScreenshotScene: React.FC<{
  screenshot: string;
  caption?: string;
  captionFrame?: number;
  zoomFrom?: number;
  zoomTo?: number;
  panX?: number;
  panY?: number;
  topBarColor?: string;
  bodyColor?: string;
}> = ({
  screenshot,
  caption,
  captionFrame = 60,
  zoomFrom = 1.0,
  zoomTo = 1.06,
  panX = 0,
  panY = 0,
  topBarColor = "#1a1a2e",
  bodyColor = "#0f172a",
}) => {
  const frame = useCurrentFrame();
  const totalFrames = 300;

  const scale = interpolate(frame, [0, totalFrames], [zoomFrom, zoomTo], {
    extrapolateRight: "clamp",
  });
  const translateX = interpolate(frame, [0, totalFrames], [0, panX], {
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [0, totalFrames], [0, panY], {
    extrapolateRight: "clamp",
  });
  const windowOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", backgroundColor: "#f0f0f0" }}
    >
      <div style={{ opacity: windowOpacity }}>
        <AppWindow
          title="SnapOtter"
          width={1700}
          height={950}
          topBarColor={topBarColor}
          bodyColor={bodyColor}
        >
          <div style={{ overflow: "hidden", width: "100%", height: "100%" }}>
            <Img
              src={staticFile(`screenshots/${screenshot}`)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
              }}
            />
          </div>
        </AppWindow>
      </div>

      {caption && (
        <div
          style={{
            position: "absolute",
            bottom: 30,
            width: "100%",
            textAlign: "center",
          }}
        >
          <ClipReveal startFrame={captionFrame}>
            <span
              style={{
                ...TEXT.sectionTitle,
                fontSize: 32,
                color: "#1a1a2e",
                backgroundColor: "rgba(255,255,255,0.85)",
                padding: "8px 24px",
                borderRadius: 8,
              }}
            >
              {caption}
            </span>
          </ClipReveal>
        </div>
      )}
    </AbsoluteFill>
  );
};
