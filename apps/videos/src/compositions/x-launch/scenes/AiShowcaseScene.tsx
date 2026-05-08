import type React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { BeforeAfter } from "@/components/BeforeAfter";
import { ClipReveal } from "@/components/ClipReveal";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { COLOR } from "@/lib/colors";
import { FONT } from "@/lib/fonts";

const Checkerboard: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <div
    style={{
      width,
      height,
      backgroundImage:
        "linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)",
      backgroundSize: "16px 16px",
      backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
      opacity: 0.3,
    }}
  />
);

const BgRemovalDemo: React.FC = () => (
  <BeforeAfter
    before={<PhotoPlaceholder width={400} height={300} hue={30} />}
    after={
      <div style={{ position: "relative", width: 400, height: 300 }}>
        <Checkerboard width={400} height={300} />
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 120,
            width: 160,
            height: 200,
            borderRadius: "50% 50% 45% 45%",
            background: "linear-gradient(135deg, #e8a87c, #d4856b)",
          }}
        />
      </div>
    }
    scanStartFrame={5}
    scanDuration={40}
    width={400}
    height={300}
  />
);

const UpscaleDemo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
      <div
        style={{
          width: 80,
          height: 80,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 2,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={`px-${i}`}
            style={{
              backgroundColor: `hsl(${(i * 23) % 360}, 60%, ${50 + (i % 3) * 10}%)`,
            }}
          />
        ))}
      </div>
      <span
        style={{ color: COLOR.accent, fontFamily: FONT.heading, fontWeight: 800, fontSize: 36 }}
      >
        4x
      </span>
      <PhotoPlaceholder width={160} height={160} hue={200} />
    </div>
  );
};

export const AiShowcaseScene: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={60}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <BgRemovalDemo />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={60} durationInFrames={60}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <UpscaleDemo />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={120} durationInFrames={60}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <BeforeAfter
            before={
              <div style={{ position: "relative", width: 400, height: 300 }}>
                <PhotoPlaceholder width={400} height={300} hue={180} />
                <div
                  style={{
                    position: "absolute",
                    top: 80,
                    left: 150,
                    width: 100,
                    height: 100,
                    border: `2px dashed ${COLOR.accent}`,
                    borderRadius: 8,
                  }}
                />
              </div>
            }
            after={<PhotoPlaceholder width={400} height={300} hue={180} />}
            scanStartFrame={5}
            scanDuration={40}
            width={400}
            height={300}
          />
        </AbsoluteFill>
      </Sequence>

      <div
        style={{
          position: "absolute",
          bottom: 40,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT.body,
          fontWeight: 600,
          fontSize: 24,
          color: "rgba(255,255,255,0.8)",
        }}
      >
        15 AI models. Your hardware. No cloud.
      </div>
    </AbsoluteFill>
  );
};
