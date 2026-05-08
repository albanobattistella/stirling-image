import type React from "react";
import { FONT } from "@/lib/fonts";

const TRAFFIC_LIGHTS = [
  { color: "#ff5f57", key: "red" },
  { color: "#febc2e", key: "yellow" },
  { color: "#28c840", key: "green" },
];

export const TerminalWindow: React.FC<{
  width: number;
  height: number;
  title?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  /** Opacity for traffic light dots (0-1), used for morph transitions */
  dotsOpacity?: number;
  /** Override top bar background color */
  topBarColor?: string;
  /** Override body background color */
  bodyColor?: string;
  /** Optional element to render in the title area instead of plain text */
  titleElement?: React.ReactNode;
}> = ({
  width,
  height,
  title = "Terminal",
  style,
  children,
  dotsOpacity = 1,
  topBarColor = "#1e1e2e",
  bodyColor = "#0d1117",
  titleElement,
}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 36,
          backgroundColor: topBarColor,
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
          flexShrink: 0,
          position: "relative",
        }}
      >
        {/* Traffic light dots */}
        <div style={{ display: "flex", gap: 8, opacity: dotsOpacity }}>
          {TRAFFIC_LIGHTS.map((dot) => (
            <div
              key={dot.key}
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: dot.color,
              }}
            />
          ))}
        </div>

        {/* Title area (centered) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          {titleElement || (
            <span
              style={{
                fontFamily: FONT.body,
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              {title}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          backgroundColor: bodyColor,
          padding: "16px 20px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
};
