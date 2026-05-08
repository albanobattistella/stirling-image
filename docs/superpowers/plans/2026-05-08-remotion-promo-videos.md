# Remotion Promotional Videos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three promotional videos for SnapOtter (X launch, product demo, promo teaser) using Remotion in the existing `apps/videos/` workspace.

**Architecture:** Extends the existing `apps/videos/` workspace with new shared components and three multi-scene compositions. Each scene is a self-contained React component receiving relative frames (0 to durationInFrames) via Remotion's `Series`. Background layers (grain, gradient mesh) live at the composition level.

**Tech Stack:** Remotion v4, React 18, TypeScript, Tailwind CSS v3 (Webpack compat), `@remotion/motion-blur`, `@remotion/paths`

**Spec:** `docs/superpowers/specs/2026-05-08-remotion-promo-videos-design.md`

**Existing codebase patterns (follow these exactly):**
- Path alias: `@/*` maps to `./src/*`
- All styling is inline `style` objects (not Tailwind classes)
- Design system imports: `@/lib/colors` (COLOR), `@/lib/fonts` (FONT, TEXT), `@/lib/motion` (EASE, SPRING, TIMING)
- Components use `useCurrentFrame()` + `interpolate()` from `remotion`
- `AbsoluteFill` for full-frame positioning
- `staticFile()` for `public/` assets
- `Img` from `remotion` for images
- Logo asset: `staticFile("logo.png")` (PNG, not SVG)
- Tool data: `@/lib/tools` (TOOLS array, getToolsByCategory)

**Verification approach:** Remotion is visual -- there are no unit tests. Every task ends with "Open Remotion Studio (`pnpm --filter @snapotter/videos dev`), select the composition, scrub the timeline, verify the animation looks correct." This IS the test.

---

### Task 1: Audio Infrastructure

**Files:**
- Modify: `apps/videos/package.json`
- Create: `apps/videos/src/lib/audio.tsx`

The Audio component in Remotion v4 is imported from `@remotion/media`. We need to add this dependency and create a reusable BackgroundMusic component.

- [ ] **Step 1: Add @remotion/media dependency**

```bash
cd apps/videos && pnpm add @remotion/media
```

- [ ] **Step 2: Create the BackgroundMusic component**

Create `apps/videos/src/lib/audio.tsx`:

```tsx
import type React from "react";
import { Audio } from "@remotion/media";
import { interpolate, staticFile, useCurrentFrame } from "remotion";

export const BackgroundMusic: React.FC<{
  src?: string;
  volume?: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  totalFrames: number;
}> = ({
  src,
  volume = 0.4,
  fadeInFrames = 30,
  fadeOutFrames = 60,
  totalFrames,
}) => {
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
```

- [ ] **Step 3: Verify the workspace still builds**

```bash
cd apps/videos && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/videos/package.json apps/videos/pnpm-lock.yaml apps/videos/src/lib/audio.tsx
git commit -m "feat(videos): add BackgroundMusic component with fade-in/fade-out"
```

---

### Task 2: AppWindow Component

**Files:**
- Create: `apps/videos/src/components/AppWindow.tsx`

macOS-style window chrome with traffic light dots. Used by Terminal, and for the Product Demo UI mockups.

- [ ] **Step 1: Create AppWindow**

Create `apps/videos/src/components/AppWindow.tsx`:

```tsx
import type React from "react";

const TRAFFIC_LIGHTS = [
  { color: "#ff5f57", border: "#e0443e" },
  { color: "#febc2e", border: "#dea123" },
  { color: "#28c840", border: "#1aab29" },
];

export const AppWindow: React.FC<{
  children: React.ReactNode;
  title?: string;
  width: number;
  height: number;
  topBarColor?: string;
  bodyColor?: string;
  style?: React.CSSProperties;
}> = ({
  children,
  title,
  width,
  height,
  topBarColor = "#1e1e2e",
  bodyColor = "#0d1117",
  style,
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
      <div
        style={{
          height: 36,
          backgroundColor: topBarColor,
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
          flexShrink: 0,
        }}
      >
        {TRAFFIC_LIGHTS.map((dot) => (
          <div
            key={dot.color}
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: dot.color,
              border: `1px solid ${dot.border}`,
              marginRight: 8,
            }}
          />
        ))}
        {title && (
          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255,255,255,0.5)",
              marginRight: 56,
            }}
          >
            {title}
          </div>
        )}
      </div>
      <div
        style={{
          flex: 1,
          backgroundColor: bodyColor,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify in Remotion Studio**

Add a quick test to Root.tsx ComponentTest or open Studio and import manually. Verify the window chrome renders with traffic lights.

- [ ] **Step 3: Commit**

```bash
git add apps/videos/src/components/AppWindow.tsx
git commit -m "feat(videos): add AppWindow component with macOS traffic light chrome"
```

---

### Task 3: Terminal Component

**Files:**
- Create: `apps/videos/src/components/Terminal.tsx`

Wraps AppWindow with terminal-specific styling. Uses the existing TypeWriter component for typed output.

- [ ] **Step 1: Create Terminal**

Create `apps/videos/src/components/Terminal.tsx`:

```tsx
import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AppWindow } from "@/components/AppWindow";
import { TypeWriter } from "@/components/TypeWriter";
import { SPRING } from "@/lib/motion";

interface OutputLine {
  text: string;
  color: string;
  delay: number;
}

export const Terminal: React.FC<{
  command: { text: string; color: string }[];
  commandStartFrame: number;
  commandSpeed?: number;
  outputLines?: OutputLine[];
  outputStartFrame: number;
  outputStagger?: number;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  enterFrame?: number;
}> = ({
  command,
  commandStartFrame,
  commandSpeed = 2,
  outputLines = [],
  outputStartFrame,
  outputStagger = 3,
  width = 800,
  height = 450,
  style,
  enterFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterProgress = spring({
    frame: frame - enterFrame,
    fps,
    config: SPRING.snappy,
  });

  const translateY = interpolate(enterProgress, [0, 1], [height + 50, 0]);
  const opacity = interpolate(enterProgress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        transform: `translateY(${translateY}px)`,
        opacity,
        ...style,
      }}
    >
      <AppWindow title="Terminal" width={width} height={height}>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ color: "#8b949e", fontSize: 16, fontFamily: "monospace" }}>
              ${" "}
            </span>
            <TypeWriter
              segments={command}
              startFrame={commandStartFrame}
              speed={commandSpeed}
              style={{ fontSize: 16 }}
            />
          </div>

          {outputLines.map((line, i) => {
            const lineFrame = outputStartFrame + i * outputStagger;
            const lineOpacity = interpolate(
              frame,
              [lineFrame, lineFrame + 6],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );

            return (
              <div
                key={`${line.text}-${i}`}
                style={{
                  marginTop: i === 0 ? 12 : 4,
                  fontSize: 16,
                  fontFamily: "monospace",
                  color: line.color,
                  opacity: lineOpacity,
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>
      </AppWindow>
    </div>
  );
};
```

- [ ] **Step 2: Verify in Remotion Studio**

Temporarily add a Composition that renders Terminal with sample command and output. Scrub timeline to verify typing and output animation.

- [ ] **Step 3: Commit**

```bash
git add apps/videos/src/components/Terminal.tsx
git commit -m "feat(videos): add Terminal component with typing + output animation"
```

---

### Task 4: Simple Components Batch -- FeaturePill, ProgressBar, NumberPunch

**Files:**
- Create: `apps/videos/src/components/FeaturePill.tsx`
- Create: `apps/videos/src/components/ProgressBar.tsx`
- Create: `apps/videos/src/components/NumberPunch.tsx`

- [ ] **Step 1: Create FeaturePill**

Create `apps/videos/src/components/FeaturePill.tsx`:

```tsx
import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR } from "@/lib/colors";
import { FONT } from "@/lib/fonts";
import { SPRING } from "@/lib/motion";

export const FeaturePill: React.FC<{
  label: string;
  enterFrame: number;
  targetX: number;
  targetY: number;
  fromDirection?: "left" | "right" | "top" | "bottom";
}> = ({ label, enterFrame, targetX, targetY, fromDirection = "left" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - enterFrame,
    fps,
    config: SPRING.popIn,
  });

  const offscreen = {
    left: { x: -300, y: targetY },
    right: { x: 1400, y: targetY },
    top: { x: targetX, y: -100 },
    bottom: { x: targetX, y: 1200 },
  }[fromDirection];

  const x = interpolate(progress, [0, 1], [offscreen.x, targetX]);
  const y = interpolate(progress, [0, 1], [offscreen.y, targetY]);
  const scale = interpolate(progress, [0, 1], [0.8, 1]);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `scale(${scale})`,
        padding: "8px 18px",
        borderRadius: 8,
        backgroundColor: `${COLOR.accent}26`,
        border: `1px solid ${COLOR.accent}40`,
        color: "white",
        fontFamily: FONT.body,
        fontWeight: 600,
        fontSize: 16,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
};
```

- [ ] **Step 2: Create ProgressBar**

Create `apps/videos/src/components/ProgressBar.tsx`:

```tsx
import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { EASE } from "@/lib/motion";

export const ProgressBar: React.FC<{
  startFrame: number;
  duration: number;
  width?: number;
  height?: number;
  color?: string;
  bgColor?: string;
  style?: React.CSSProperties;
}> = ({
  startFrame,
  duration,
  width = 200,
  height = 6,
  color = "#3b82f6",
  bgColor = "rgba(255,255,255,0.1)",
  style,
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.smooth },
  );

  return (
    <div
      style={{
        width,
        height,
        borderRadius: height / 2,
        backgroundColor: bgColor,
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
    </div>
  );
};
```

- [ ] **Step 3: Create NumberPunch**

Create `apps/videos/src/components/NumberPunch.tsx`:

```tsx
import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR } from "@/lib/colors";
import { TEXT } from "@/lib/fonts";
import { SPRING } from "@/lib/motion";

export const NumberPunch: React.FC<{
  number: string;
  descriptor: string;
  enterFrame: number;
  numberSize?: number;
  shakeIntensity?: number;
}> = ({ number, descriptor, enterFrame, numberSize = 120, shakeIntensity = 2 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const elapsed = frame - enterFrame;
  const scaleSpring = spring({ frame: elapsed, fps, config: SPRING.settle });
  const scale = interpolate(scaleSpring, [0, 1], [1.5, 1]);

  const shakeDecay = interpolate(elapsed, [0, 12], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shakeX = Math.sin(elapsed * 3) * shakeIntensity * shakeDecay;
  const shakeY = Math.cos(elapsed * 4) * shakeIntensity * shakeDecay;

  const descOpacity = interpolate(elapsed, [8, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const numberOpacity = interpolate(elapsed, [0, 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "center",
        gap: 20,
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      }}
    >
      <span
        style={{
          ...TEXT.counter,
          fontSize: numberSize,
          transform: `scale(${scale})`,
          opacity: numberOpacity,
          display: "inline-block",
        }}
      >
        {number}
      </span>
      <span
        style={{
          fontFamily: TEXT.heroSub.fontFamily,
          fontWeight: 500,
          fontSize: 36,
          color: COLOR.accent,
          opacity: descOpacity,
        }}
      >
        {descriptor}
      </span>
    </div>
  );
};
```

- [ ] **Step 4: Verify all three in Remotion Studio**

- [ ] **Step 5: Commit**

```bash
git add apps/videos/src/components/FeaturePill.tsx apps/videos/src/components/ProgressBar.tsx apps/videos/src/components/NumberPunch.tsx
git commit -m "feat(videos): add FeaturePill, ProgressBar, NumberPunch components"
```

---

### Task 5: Simple Components Batch -- RotatingTaglines, GradientMesh

**Files:**
- Create: `apps/videos/src/components/RotatingTaglines.tsx`
- Create: `apps/videos/src/components/GradientMesh.tsx`

- [ ] **Step 1: Create RotatingTaglines**

Create `apps/videos/src/components/RotatingTaglines.tsx`:

```tsx
import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLOR } from "@/lib/colors";
import { FONT } from "@/lib/fonts";
import { EASE } from "@/lib/motion";

export const RotatingTaglines: React.FC<{
  lines: string[];
  startFrame: number;
  framesPerLine: number;
  fontSize?: number;
  color?: string;
}> = ({
  lines,
  startFrame,
  framesPerLine,
  fontSize = 36,
  color = COLOR.accent,
}) => {
  const frame = useCurrentFrame();
  const elapsed = frame - startFrame;
  if (elapsed < 0) return null;

  const lineIndex = Math.floor(elapsed / framesPerLine);
  const lineProgress = (elapsed % framesPerLine) / framesPerLine;
  if (lineIndex >= lines.length) return null;

  const enterDuration = 0.2;
  const holdEnd = 0.7;
  const exitEnd = 1.0;

  const opacity =
    lineProgress < enterDuration
      ? interpolate(lineProgress, [0, enterDuration], [0, 1], { easing: EASE.enter })
      : lineProgress < holdEnd
        ? 1
        : interpolate(lineProgress, [holdEnd, exitEnd], [1, 0], { easing: EASE.exit });

  const translateY =
    lineProgress < enterDuration
      ? interpolate(lineProgress, [0, enterDuration], [30, 0], { easing: EASE.enter })
      : lineProgress > holdEnd
        ? interpolate(lineProgress, [holdEnd, exitEnd], [0, -20], { easing: EASE.exit })
        : 0;

  const glowOpacity = interpolate(
    Math.sin(frame * 0.08),
    [-1, 1],
    [0.03, 0.08],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 100,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${COLOR.accent} 0%, transparent 70%)`,
          opacity: glowOpacity,
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          fontFamily: FONT.body,
          fontWeight: 500,
          fontSize,
          color,
          opacity,
          transform: `translateY(${translateY}px)`,
          textAlign: "center",
        }}
      >
        {lines[lineIndex]}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create GradientMesh**

Create `apps/videos/src/components/GradientMesh.tsx`:

```tsx
import type React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { GradientBlob } from "@/components/GradientBlob";
import type { CSSProperties } from "react";

interface BlobDef {
  color: string;
  radius: number;
  cx: number;
  cy: number;
  a: number;
  b: number;
  phaseX: number;
  phaseY: number;
  amplitudeX: number;
  amplitudeY: number;
}

export const GradientMesh: React.FC<{
  blobs: BlobDef[];
  duration: number;
  baseOpacity?: number;
  opacityRange?: [number, number];
  opacityFrameRange?: [number, number];
  style?: CSSProperties;
}> = ({
  blobs,
  duration,
  baseOpacity,
  opacityRange,
  opacityFrameRange,
  style,
}) => {
  const frame = useCurrentFrame();
  let containerOpacity = baseOpacity ?? 1;

  if (opacityRange && opacityFrameRange) {
    containerOpacity = interpolate(
      frame,
      opacityFrameRange,
      opacityRange,
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
  }

  return (
    <AbsoluteFill style={{ opacity: containerOpacity, ...style }}>
      {blobs.map((blob, i) => (
        <GradientBlob key={`mesh-blob-${i}`} config={blob} duration={duration} />
      ))}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Verify in Remotion Studio**

- [ ] **Step 4: Commit**

```bash
git add apps/videos/src/components/RotatingTaglines.tsx apps/videos/src/components/GradientMesh.tsx
git commit -m "feat(videos): add RotatingTaglines and GradientMesh components"
```

---

### Task 6: LogoReveal + GitHubCTA Components

**Files:**
- Create: `apps/videos/src/components/LogoReveal.tsx`
- Create: `apps/videos/src/components/GitHubCTA.tsx`

- [ ] **Step 1: Create LogoReveal**

Create `apps/videos/src/components/LogoReveal.tsx`:

```tsx
import type React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ClipReveal } from "@/components/ClipReveal";
import { COLOR } from "@/lib/colors";
import { TEXT } from "@/lib/fonts";
import { SPRING } from "@/lib/motion";

const PARTICLE_COUNT = 25;

export const LogoReveal: React.FC<{
  convergeFrame?: number;
  burstFrame?: number;
  logoFrame?: number;
  textFrame?: number;
  taglineFrame?: number;
  logoSize?: number;
}> = ({
  convergeFrame = 0,
  burstFrame = 30,
  logoFrame = 30,
  textFrame = 50,
  taglineFrame = 70,
  logoSize = 80,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const logoScale = spring({
    frame: frame - logoFrame,
    fps,
    config: SPRING.popIn,
  });

  const glowRadius = interpolate(
    frame,
    [burstFrame, burstFrame + 15],
    [0, 200],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const glowOpacity = interpolate(
    frame,
    [burstFrame, burstFrame + 20],
    [0.2, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const baseAngle = random(`particle-angle-${i}`) * Math.PI * 2;
        const maxRadius = 300 + random(`particle-radius-${i}`) * 200;
        const size = 2 + random(`particle-size-${i}`) * 3;
        const rotSpeed = 0.03 + random(`particle-speed-${i}`) * 0.02;
        const particleOpacity = 0.3 + random(`particle-opacity-${i}`) * 0.7;

        const convergeProgress = interpolate(
          frame,
          [convergeFrame, burstFrame],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        const angle = baseAngle + frame * rotSpeed;
        const radius = maxRadius * convergeProgress;
        const px = width / 2 + Math.cos(angle) * radius;
        const py = height / 2 + Math.sin(angle) * radius;
        const pOpacity = convergeProgress > 0.05 ? particleOpacity : 0;

        return (
          <div
            key={`particle-${i}`}
            style={{
              position: "absolute",
              left: px - size / 2,
              top: py - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: COLOR.accent,
              opacity: pOpacity,
            }}
          />
        );
      })}

      <div
        style={{
          position: "absolute",
          width: glowRadius * 2,
          height: glowRadius * 2,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLOR.accent} 0%, transparent 70%)`,
          opacity: glowOpacity,
          left: width / 2 - glowRadius,
          top: height / 2 - glowRadius,
        }}
      />

      <Img
        src={staticFile("logo.png")}
        style={{
          width: logoSize,
          height: logoSize,
          transform: `scale(${logoScale})`,
        }}
      />

      <div style={{ height: 16 }} />

      <ClipReveal startFrame={textFrame}>
        <span style={{ ...TEXT.sectionTitle, fontSize: 48, color: "white" }}>
          SnapOtter
        </span>
      </ClipReveal>

      <div style={{ height: 8 }} />

      <ClipReveal startFrame={taglineFrame}>
        <span
          style={{
            fontFamily: TEXT.heroSub.fontFamily,
            fontWeight: 500,
            fontSize: 24,
            color: COLOR.accent,
          }}
        >
          Your images. Stay yours.
        </span>
      </ClipReveal>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Create GitHubCTA**

Create `apps/videos/src/components/GitHubCTA.tsx`:

```tsx
import type React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { ClipReveal } from "@/components/ClipReveal";
import { COLOR } from "@/lib/colors";
import { FONT, TEXT } from "@/lib/fonts";

export const GitHubCTA: React.FC<{
  labelFrame?: number;
  logoFrame?: number;
  taglineFrame?: number;
  ctaFrame?: number;
  urlFrame?: number;
}> = ({
  labelFrame = 0,
  logoFrame = 15,
  taglineFrame = 30,
  ctaFrame = 50,
  urlFrame = 65,
}) => {
  const frame = useCurrentFrame();

  const logoScale = interpolate(
    frame,
    [logoFrame, logoFrame + 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const glowRadius = interpolate(
    frame,
    [logoFrame, logoFrame + 15],
    [0, 200],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const borderOpacity = interpolate(
    Math.sin(frame * 0.06),
    [-1, 1],
    [0.3, 0.6],
  );

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        border: `2px solid rgba(245, 158, 11, ${borderOpacity})`,
      }}
    >
      <ClipReveal startFrame={labelFrame}>
        <span
          style={{
            ...TEXT.label,
            color: COLOR.accent,
            fontSize: 18,
          }}
        >
          100% OPEN SOURCE
        </span>
      </ClipReveal>

      <div style={{ height: 24 }} />

      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            width: glowRadius * 2,
            height: glowRadius * 2,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${COLOR.accent} 0%, transparent 70%)`,
            opacity: 0.15,
            left: 40 - glowRadius,
            top: 40 - glowRadius,
          }}
        />
        <Img
          src={staticFile("logo.png")}
          style={{
            width: 80,
            height: 80,
            transform: `scale(${logoScale})`,
          }}
        />
      </div>

      <div style={{ height: 20 }} />

      <ClipReveal startFrame={taglineFrame}>
        <span style={{ ...TEXT.sectionTitle, fontSize: 48 }}>
          Free forever.
        </span>
      </ClipReveal>

      <div style={{ height: 16 }} />

      <ClipReveal startFrame={ctaFrame}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          <span style={{ fontFamily: FONT.body, fontWeight: 400, fontSize: 20, color: "white" }}>
            Star us on GitHub
          </span>
        </div>
      </ClipReveal>

      <div style={{ height: 8 }} />

      <ClipReveal startFrame={urlFrame}>
        <span style={{ fontFamily: FONT.mono, fontSize: 16, color: COLOR.accent }}>
          github.com/snapotter-hq/SnapOtter
        </span>
      </ClipReveal>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Verify in Remotion Studio**

- [ ] **Step 4: Commit**

```bash
git add apps/videos/src/components/LogoReveal.tsx apps/videos/src/components/GitHubCTA.tsx
git commit -m "feat(videos): add LogoReveal and GitHubCTA components"
```

---

### Task 7: ToolGrid + BeforeAfter Components

**Files:**
- Create: `apps/videos/src/components/ToolGrid.tsx`
- Create: `apps/videos/src/components/BeforeAfter.tsx`

- [ ] **Step 1: Create ToolGrid**

Create `apps/videos/src/components/ToolGrid.tsx`:

```tsx
import type React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ToolPill } from "@/components/ToolPill";
import { CATEGORY_ORDER } from "@/lib/colors";
import { SPRING, TIMING } from "@/lib/motion";
import { TOOLS, getToolsByCategory } from "@/lib/tools";

export const ToolGrid: React.FC<{
  startFrame: number;
  cellWidth?: number;
  cellHeight?: number;
  gap?: number;
  style?: React.CSSProperties;
}> = ({ startFrame, cellWidth = 140, cellHeight = 32, gap = 6, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let globalIndex = 0;

  return (
    <div
      style={{
        display: "flex",
        gap: gap * 2,
        ...style,
      }}
    >
      {CATEGORY_ORDER.map((cat) => {
        const tools = getToolsByCategory(cat);
        return (
          <div key={cat} style={{ display: "flex", flexDirection: "column", gap }}>
            {tools.map((tool) => {
              const i = globalIndex++;
              const enterDelay = startFrame + i * TIMING.staggerFrames;
              const s = spring({
                frame: frame - enterDelay,
                fps,
                config: SPRING.settle,
              });

              return (
                <div
                  key={tool.name}
                  style={{
                    opacity: s,
                    transform: `translateX(${(1 - s) * 100}px) scale(${0.8 + s * 0.2})`,
                  }}
                >
                  <ToolPill
                    name={tool.name}
                    category={tool.category}
                    style={{ width: cellWidth, fontSize: 11, padding: "3px 8px" }}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 2: Create BeforeAfter**

Create `apps/videos/src/components/BeforeAfter.tsx`:

```tsx
import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLOR } from "@/lib/colors";
import { EASE } from "@/lib/motion";

export const BeforeAfter: React.FC<{
  before: React.ReactNode;
  after: React.ReactNode;
  scanStartFrame: number;
  scanDuration: number;
  width: number;
  height: number;
  style?: React.CSSProperties;
}> = ({ before, after, scanStartFrame, scanDuration, width, height, style }) => {
  const frame = useCurrentFrame();

  const scanProgress = interpolate(
    frame,
    [scanStartFrame, scanStartFrame + scanDuration],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.smooth },
  );

  const scanX = (scanProgress / 100) * width;

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        borderRadius: 8,
        ...style,
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>{before}</div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `inset(0 ${100 - scanProgress}% 0 0)`,
        }}
      >
        {after}
      </div>

      {scanProgress > 0 && scanProgress < 100 && (
        <div
          style={{
            position: "absolute",
            left: scanX,
            top: 0,
            width: 2,
            height: "100%",
            backgroundColor: COLOR.accent,
            boxShadow: `0 0 20px ${COLOR.accent}80`,
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 3: Verify in Remotion Studio**

- [ ] **Step 4: Commit**

```bash
git add apps/videos/src/components/ToolGrid.tsx apps/videos/src/components/BeforeAfter.tsx
git commit -m "feat(videos): add ToolGrid and BeforeAfter components"
```

---

### Task 8: Promo Teaser Scenes

**Files:**
- Create: `apps/videos/src/compositions/promo-teaser/scenes/AmbientOpenScene.tsx`
- Create: `apps/videos/src/compositions/promo-teaser/scenes/NumberPunchScene.tsx`
- Create: `apps/videos/src/compositions/promo-teaser/scenes/TaglineCascadeScene.tsx`
- Create: `apps/videos/src/compositions/promo-teaser/scenes/LogoRevealScene.tsx`
- Create: `apps/videos/src/compositions/promo-teaser/scenes/CTAScene.tsx`

Each scene receives relative frames (0 to its durationInFrames) from `Series.Sequence`.

- [ ] **Step 1: Create AmbientOpenScene (90 frames)**

Create `apps/videos/src/compositions/promo-teaser/scenes/AmbientOpenScene.tsx`:

```tsx
import type React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { GradientBlob } from "@/components/GradientBlob";

const BLOBS = [
  { color: "#f59e0b", radius: 200, cx: 300, cy: 400, a: 1, b: 2, phaseX: 0, phaseY: 0, amplitudeX: 60, amplitudeY: 40 },
  { color: "#f97316", radius: 150, cx: 750, cy: 250, a: 2, b: 1, phaseX: 1.2, phaseY: 0.8, amplitudeX: 50, amplitudeY: 60 },
  { color: "#d97706", radius: 180, cx: 540, cy: 700, a: 1, b: 1, phaseX: 2.4, phaseY: 1.6, amplitudeX: 70, amplitudeY: 50 },
];

export const AmbientOpenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      {BLOBS.map((blob, i) => (
        <GradientBlob key={`ambient-${i}`} config={blob} duration={600} />
      ))}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Create NumberPunchScene (150 frames)**

Create `apps/videos/src/compositions/promo-teaser/scenes/NumberPunchScene.tsx`:

```tsx
import type React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { NumberPunch } from "@/components/NumberPunch";
import { COLOR } from "@/lib/colors";

const PUNCHES = [
  { number: "49", descriptor: "tools", frame: 0, size: 120, shake: 2 },
  { number: "15", descriptor: "AI models", frame: 37, size: 120, shake: 2 },
  { number: "55+", descriptor: "formats", frame: 74, size: 120, shake: 2 },
  { number: "1", descriptor: "container", frame: 111, size: 144, shake: 3 },
];

export const NumberPunchScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {PUNCHES.map((p, i) => {
        const visible = frame >= p.frame && frame < p.frame + 37;
        const flashStart = p.frame - 2;
        const flashOpacity =
          i > 0 && frame >= flashStart && frame < flashStart + 2
            ? interpolate(frame, [flashStart, flashStart + 2], [1, 0])
            : 0;

        return (
          <AbsoluteFill key={p.number} style={{ justifyContent: "center", alignItems: "center" }}>
            {i > 0 && (
              <AbsoluteFill
                style={{ backgroundColor: COLOR.dark, opacity: flashOpacity }}
              />
            )}
            {visible && (
              <NumberPunch
                number={p.number}
                descriptor={p.descriptor}
                enterFrame={p.frame}
                numberSize={p.size}
                shakeIntensity={p.shake}
              />
            )}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Create TaglineCascadeScene (150 frames)**

Create `apps/videos/src/compositions/promo-teaser/scenes/TaglineCascadeScene.tsx`:

```tsx
import type React from "react";
import { AbsoluteFill } from "remotion";
import { RotatingTaglines } from "@/components/RotatingTaglines";

const TAGLINES = [
  "No signups.",
  "No uploads.",
  "No limits.",
  "Free forever.",
  "Open source.",
  "Fully offline.",
];

export const TaglineCascadeScene: React.FC = () => {
  return (
    <AbsoluteFill>
      <RotatingTaglines
        lines={TAGLINES}
        startFrame={0}
        framesPerLine={25}
        fontSize={40}
        color="white"
      />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Create LogoRevealScene (120 frames)**

Create `apps/videos/src/compositions/promo-teaser/scenes/LogoRevealScene.tsx`:

```tsx
import type React from "react";
import { AbsoluteFill } from "remotion";
import { LogoReveal } from "@/components/LogoReveal";

export const LogoRevealScene: React.FC = () => {
  return (
    <AbsoluteFill>
      <LogoReveal
        convergeFrame={0}
        burstFrame={30}
        logoFrame={30}
        textFrame={50}
        taglineFrame={70}
        logoSize={80}
      />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 5: Create CTAScene (90 frames)**

Create `apps/videos/src/compositions/promo-teaser/scenes/CTAScene.tsx`:

```tsx
import type React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR } from "@/lib/colors";
import { FONT } from "@/lib/fonts";
import { SPRING } from "@/lib/motion";

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pillScale = spring({ frame, fps, config: SPRING.popIn });
  const urlOpacity = interpolate(frame, [15, 25], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [60, 90], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glowOpacity = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.3, 0.6]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          transform: `scale(${pillScale})`,
          padding: "14px 36px",
          borderRadius: 50,
          background: `linear-gradient(135deg, ${COLOR.accent}, ${COLOR.accentHover})`,
          boxShadow: `0 0 30px rgba(245, 158, 11, ${glowOpacity})`,
          color: "white",
          fontFamily: FONT.heading,
          fontWeight: 700,
          fontSize: 20,
        }}
      >
        Get it free
      </div>

      <div style={{ height: 16 }} />

      <span
        style={{
          fontFamily: FONT.mono,
          fontSize: 16,
          color: "white",
          opacity: urlOpacity,
        }}
      >
        snapotter.com
      </span>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 6: Commit**

```bash
git add apps/videos/src/compositions/promo-teaser/
git commit -m "feat(videos): add all 5 Promo Teaser scene components"
```

---

### Task 9: Promo Teaser Compositions + Root Registration

**Files:**
- Create: `apps/videos/src/compositions/promo-teaser/PromoTeaser.tsx`
- Create: `apps/videos/src/compositions/promo-teaser/PromoTeaserVertical.tsx`
- Modify: `apps/videos/src/Root.tsx`

- [ ] **Step 1: Create PromoTeaser (square)**

Create `apps/videos/src/compositions/promo-teaser/PromoTeaser.tsx`:

```tsx
import type React from "react";
import { AbsoluteFill, Series } from "remotion";
import { GradientBlob } from "@/components/GradientBlob";
import { GrainOverlay } from "@/components/GrainOverlay";
import { COLOR } from "@/lib/colors";
import { AmbientOpenScene } from "./scenes/AmbientOpenScene";
import { CTAScene } from "./scenes/CTAScene";
import { LogoRevealScene } from "./scenes/LogoRevealScene";
import { NumberPunchScene } from "./scenes/NumberPunchScene";
import { TaglineCascadeScene } from "./scenes/TaglineCascadeScene";

const BG_BLOBS = [
  { color: "#f59e0b", radius: 200, cx: 300, cy: 400, a: 1, b: 2, phaseX: 0, phaseY: 0, amplitudeX: 60, amplitudeY: 40 },
  { color: "#f97316", radius: 150, cx: 750, cy: 250, a: 2, b: 1, phaseX: 1.2, phaseY: 0.8, amplitudeX: 50, amplitudeY: 60 },
  { color: "#d97706", radius: 180, cx: 540, cy: 700, a: 1, b: 1, phaseX: 2.4, phaseY: 1.6, amplitudeX: 70, amplitudeY: 50 },
];

export const PromoTeaser: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.dark }}>
      {BG_BLOBS.map((blob, i) => (
        <GradientBlob key={`bg-${i}`} config={blob} duration={600} />
      ))}

      <Series>
        <Series.Sequence durationInFrames={90}>
          <AmbientOpenScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <NumberPunchScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <TaglineCascadeScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={120}>
          <LogoRevealScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={90}>
          <CTAScene />
        </Series.Sequence>
      </Series>

      <GrainOverlay opacity={0.03} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Create PromoTeaserVertical**

Create `apps/videos/src/compositions/promo-teaser/PromoTeaserVertical.tsx`:

```tsx
import type React from "react";
import { AbsoluteFill, Series } from "remotion";
import { GradientBlob } from "@/components/GradientBlob";
import { GrainOverlay } from "@/components/GrainOverlay";
import { COLOR } from "@/lib/colors";
import { AmbientOpenScene } from "./scenes/AmbientOpenScene";
import { CTAScene } from "./scenes/CTAScene";
import { LogoRevealScene } from "./scenes/LogoRevealScene";
import { NumberPunchScene } from "./scenes/NumberPunchScene";
import { TaglineCascadeScene } from "./scenes/TaglineCascadeScene";

const BG_BLOBS = [
  { color: "#f59e0b", radius: 250, cx: 540, cy: 600, a: 1, b: 2, phaseX: 0, phaseY: 0, amplitudeX: 80, amplitudeY: 100 },
  { color: "#f97316", radius: 200, cx: 300, cy: 1200, a: 2, b: 1, phaseX: 1.2, phaseY: 0.8, amplitudeX: 60, amplitudeY: 120 },
  { color: "#d97706", radius: 220, cx: 700, cy: 1600, a: 1, b: 1, phaseX: 2.4, phaseY: 1.6, amplitudeX: 90, amplitudeY: 80 },
];

export const PromoTeaserVertical: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.dark }}>
      {BG_BLOBS.map((blob, i) => (
        <GradientBlob key={`bg-v-${i}`} config={blob} duration={600} />
      ))}

      <Series>
        <Series.Sequence durationInFrames={90}>
          <AmbientOpenScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <NumberPunchScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <TaglineCascadeScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={120}>
          <LogoRevealScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={90}>
          <CTAScene />
        </Series.Sequence>
      </Series>

      <GrainOverlay opacity={0.03} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Register in Root.tsx**

In `apps/videos/src/Root.tsx`, add the imports and Composition entries after the existing ones:

```tsx
import { PromoTeaser } from "./compositions/promo-teaser/PromoTeaser";
import { PromoTeaserVertical } from "./compositions/promo-teaser/PromoTeaserVertical";
```

Add inside the `<>` fragment:

```tsx
    <Composition
      id="PromoTeaser"
      component={PromoTeaser}
      durationInFrames={600}
      fps={30}
      width={1080}
      height={1080}
    />
    <Composition
      id="PromoTeaserVertical"
      component={PromoTeaserVertical}
      durationInFrames={600}
      fps={30}
      width={1080}
      height={1920}
    />
```

- [ ] **Step 4: Verify in Remotion Studio**

```bash
pnpm --filter @snapotter/videos dev
```

Select "PromoTeaser" from the composition picker. Scrub through all 600 frames. Verify:
- Frames 0-90: ambient blobs fade in
- Frames 90-240: numbers punch in (49, 15, 55+, 1) with black flashes between
- Frames 240-390: taglines cascade
- Frames 390-510: particles converge, logo reveals
- Frames 510-600: CTA pill, fade to black

Then check PromoTeaserVertical in portrait mode.

- [ ] **Step 5: Commit**

```bash
git add apps/videos/src/compositions/promo-teaser/ apps/videos/src/Root.tsx
git commit -m "feat(videos): add PromoTeaser square and vertical compositions"
```

---

### Task 10: X Launch Video Scenes 1-4

**Files:**
- Create: `apps/videos/src/compositions/x-launch/scenes/HookScene.tsx`
- Create: `apps/videos/src/compositions/x-launch/scenes/TerminalInstallScene.tsx`
- Create: `apps/videos/src/compositions/x-launch/scenes/ToolGridRevealScene.tsx`
- Create: `apps/videos/src/compositions/x-launch/scenes/AiShowcaseScene.tsx`

- [ ] **Step 1: Create HookScene (120 frames)**

Create `apps/videos/src/compositions/x-launch/scenes/HookScene.tsx`:

```tsx
import type React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ClipReveal } from "@/components/ClipReveal";
import { COLOR } from "@/lib/colors";
import { TEXT } from "@/lib/fonts";

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const glowOpacity = Math.sin(frame * 0.08) * 0.03 + 0.08;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 200,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${COLOR.accent} 0%, transparent 70%)`,
          opacity: glowOpacity,
          filter: "blur(60px)",
        }}
      />

      <div style={{ textAlign: "center" }}>
        <ClipReveal startFrame={10} duration={20}>
          <span style={{ ...TEXT.heroHeadline }}>Your images.</span>
        </ClipReveal>
        <div style={{ height: 12 }} />
        <ClipReveal startFrame={40} duration={20}>
          <span style={{ ...TEXT.heroHeadline }}>Stay yours.</span>
        </ClipReveal>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Create TerminalInstallScene (150 frames)**

Create `apps/videos/src/compositions/x-launch/scenes/TerminalInstallScene.tsx`:

```tsx
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
```

- [ ] **Step 3: Create ToolGridRevealScene (180 frames)**

Create `apps/videos/src/compositions/x-launch/scenes/ToolGridRevealScene.tsx`:

```tsx
import type React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Counter } from "@/components/Counter";
import { ToolGrid } from "@/components/ToolGrid";
import { COLOR } from "@/lib/colors";
import { TEXT } from "@/lib/fonts";

export const ToolGridRevealScene: React.FC = () => {
  const frame = useCurrentFrame();

  const gridOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 40,
          right: 40,
          opacity: gridOpacity,
          transform: "scale(0.85)",
          transformOrigin: "top center",
        }}
      >
        <ToolGrid startFrame={10} cellWidth={110} cellHeight={26} gap={4} />
      </div>

      <div style={{ position: "absolute", bottom: 60, right: 80 }}>
        <Counter
          from={0}
          to={49}
          startFrame={10}
          duration={90}
          style={{
            ...TEXT.counter,
            fontSize: 64,
            color: COLOR.accent,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Create AiShowcaseScene (180 frames)**

Create `apps/videos/src/compositions/x-launch/scenes/AiShowcaseScene.tsx`:

```tsx
import type React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
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
      <span style={{ color: COLOR.accent, fontFamily: FONT.heading, fontWeight: 800, fontSize: 36 }}>
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
```

- [ ] **Step 5: Commit**

```bash
git add apps/videos/src/compositions/x-launch/scenes/
git commit -m "feat(videos): add X Launch scenes 1-4 (Hook, Terminal, ToolGrid, AI)"
```

---

### Task 11: X Launch Video Scenes 5-7 + Composition

**Files:**
- Create: `apps/videos/src/compositions/x-launch/scenes/PrivacyBeatScene.tsx`
- Create: `apps/videos/src/compositions/x-launch/scenes/FeatureBurstScene.tsx`
- Create: `apps/videos/src/compositions/x-launch/scenes/GitHubCTAScene.tsx`
- Create: `apps/videos/src/compositions/x-launch/XLaunchVideo.tsx`
- Modify: `apps/videos/src/Root.tsx`

- [ ] **Step 1: Create PrivacyBeatScene (120 frames)**

Create `apps/videos/src/compositions/x-launch/scenes/PrivacyBeatScene.tsx`:

```tsx
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
```

- [ ] **Step 2: Create FeatureBurstScene (150 frames)**

Create `apps/videos/src/compositions/x-launch/scenes/FeatureBurstScene.tsx`:

```tsx
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
```

- [ ] **Step 3: Create GitHubCTAScene (150 frames)**

Create `apps/videos/src/compositions/x-launch/scenes/GitHubCTAScene.tsx`:

```tsx
import type React from "react";
import { AbsoluteFill } from "remotion";
import { GitHubCTA } from "@/components/GitHubCTA";

export const GitHubCTAScene: React.FC = () => {
  return (
    <AbsoluteFill>
      <GitHubCTA
        labelFrame={5}
        logoFrame={20}
        taglineFrame={40}
        ctaFrame={60}
        urlFrame={75}
      />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Create XLaunchVideo composition**

Create `apps/videos/src/compositions/x-launch/XLaunchVideo.tsx`:

```tsx
import type React from "react";
import { AbsoluteFill, Series } from "remotion";
import { GrainOverlay } from "@/components/GrainOverlay";
import { COLOR } from "@/lib/colors";
import { AiShowcaseScene } from "./scenes/AiShowcaseScene";
import { FeatureBurstScene } from "./scenes/FeatureBurstScene";
import { GitHubCTAScene } from "./scenes/GitHubCTAScene";
import { HookScene } from "./scenes/HookScene";
import { PrivacyBeatScene } from "./scenes/PrivacyBeatScene";
import { TerminalInstallScene } from "./scenes/TerminalInstallScene";
import { ToolGridRevealScene } from "./scenes/ToolGridRevealScene";

export const XLaunchVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.dark }}>
      <Series>
        <Series.Sequence durationInFrames={120}>
          <HookScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <TerminalInstallScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={180}>
          <ToolGridRevealScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={180}>
          <AiShowcaseScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={120}>
          <PrivacyBeatScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <FeatureBurstScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <GitHubCTAScene />
        </Series.Sequence>
      </Series>

      <GrainOverlay opacity={0.03} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 5: Register in Root.tsx**

Add import and Composition entry to `apps/videos/src/Root.tsx`:

```tsx
import { XLaunchVideo } from "./compositions/x-launch/XLaunchVideo";
```

```tsx
    <Composition
      id="XLaunchVideo"
      component={XLaunchVideo}
      durationInFrames={1050}
      fps={30}
      width={1080}
      height={1080}
    />
```

- [ ] **Step 6: Verify in Remotion Studio**

Select "XLaunchVideo". Scrub through all 1050 frames (35 seconds). Verify all 7 scenes play in sequence.

- [ ] **Step 7: Commit**

```bash
git add apps/videos/src/compositions/x-launch/ apps/videos/src/Root.tsx
git commit -m "feat(videos): add XLaunchVideo composition with all 7 scenes"
```

---

### Task 12: Product Demo Scenes 1-3

**Files:**
- Create: `apps/videos/src/compositions/product-demo/scenes/DashboardScene.tsx`
- Create: `apps/videos/src/compositions/product-demo/scenes/SingleToolScene.tsx`
- Create: `apps/videos/src/compositions/product-demo/scenes/BatchProcessingScene.tsx`

These scenes replicate the SnapOtter UI in light theme. Each is a simplified mockup built from divs and inline styles.

- [ ] **Step 1: Create DashboardScene (240 frames)**

Create `apps/videos/src/compositions/product-demo/scenes/DashboardScene.tsx`:

```tsx
import type React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AppWindow } from "@/components/AppWindow";
import { COLOR, CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/colors";
import { FONT } from "@/lib/fonts";
import { SPRING } from "@/lib/motion";
import { TOOLS } from "@/lib/tools";

const VISIBLE_TOOLS = TOOLS.slice(0, 12);

export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowScale = spring({ frame, fps, config: SPRING.snappy });
  const searchText = "resize";
  const typingStart = 60;
  const charsVisible = Math.floor(Math.max(0, frame - typingStart) / 3);
  const typed = searchText.slice(0, charsVisible);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f4" }}>
      <div style={{ transform: `scale(${0.95 + windowScale * 0.05})`, opacity: windowScale }}>
        <AppWindow title="SnapOtter" width={1600} height={900} topBarColor="#ffffff" bodyColor="#ffffff">
          <div style={{ padding: 24 }}>
            {/* Top bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <Img src={staticFile("logo.png")} style={{ width: 32, height: 32 }} />
              <span style={{ fontFamily: FONT.heading, fontWeight: 800, fontSize: 20, color: "#0a0a0a" }}>
                SnapOtter
              </span>
              <div
                style={{
                  flex: 1,
                  maxWidth: 400,
                  height: 40,
                  borderRadius: 8,
                  border: "1px solid #e5e5e5",
                  padding: "0 16px",
                  display: "flex",
                  alignItems: "center",
                  fontFamily: FONT.body,
                  fontSize: 14,
                  color: typed ? "#0a0a0a" : "#a3a3a3",
                }}
              >
                {typed || "Search tools..."}
                {frame >= typingStart && charsVisible < searchText.length && Math.floor(frame / 8) % 2 === 0 && (
                  <span style={{ width: 2, height: 16, backgroundColor: "#3b82f6", marginLeft: 1 }} />
                )}
              </div>
            </div>

            {/* Category pills */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              {CATEGORY_ORDER.map((cat) => (
                <div
                  key={cat}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 16,
                    fontSize: 12,
                    fontFamily: FONT.body,
                    fontWeight: 500,
                    backgroundColor: `${COLOR.category[cat]}15`,
                    color: COLOR.category[cat],
                    border: `1px solid ${COLOR.category[cat]}30`,
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </div>
              ))}
            </div>

            {/* Tool grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {VISIBLE_TOOLS.map((tool) => {
                const matches = !typed || tool.name.toLowerCase().includes(typed.toLowerCase());
                const cardOpacity = typed ? (matches ? 1 : 0.2) : 1;
                const cardScale = typed ? (matches ? 1 : 0.95) : 1;
                return (
                  <div
                    key={tool.name}
                    style={{
                      padding: 16,
                      borderRadius: 8,
                      border: "1px solid #e5e5e5",
                      backgroundColor: "white",
                      opacity: cardOpacity,
                      transform: `scale(${cardScale})`,
                      transition: "all 0.2s",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: COLOR.category[tool.category] ?? COLOR.accent,
                        marginBottom: 8,
                      }}
                    />
                    <div
                      style={{
                        fontFamily: FONT.body,
                        fontWeight: 500,
                        fontSize: 14,
                        color: "#0a0a0a",
                      }}
                    >
                      {tool.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </AppWindow>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Create SingleToolScene (360 frames)**

Create `apps/videos/src/compositions/product-demo/scenes/SingleToolScene.tsx`:

```tsx
import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AppWindow } from "@/components/AppWindow";
import { Counter } from "@/components/Counter";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { ProgressBar } from "@/components/ProgressBar";
import { COLOR } from "@/lib/colors";
import { FONT } from "@/lib/fonts";
import { SPRING } from "@/lib/motion";

export const SingleToolScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideIn = spring({ frame, fps, config: SPRING.snappy });
  const dropFrame = 40;
  const dropProgress = spring({ frame: frame - dropFrame, fps, config: SPRING.natural });
  const processFrame = 180;
  const showResult = frame > processFrame + 60;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f4" }}>
      <div style={{ transform: `translateX(${(1 - slideIn) * 300}px)`, opacity: slideIn }}>
        <AppWindow title="Resize -- SnapOtter" width={1600} height={900} topBarColor="#ffffff" bodyColor="#ffffff">
          <div style={{ display: "flex", height: "100%" }}>
            {/* Dropzone */}
            <div style={{ flex: 0.6, padding: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {frame < dropFrame ? (
                <div
                  style={{
                    width: "100%",
                    height: 400,
                    border: "2px dashed #d4d4d4",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT.body,
                    fontSize: 16,
                    color: "#a3a3a3",
                  }}
                >
                  Drop an image here
                </div>
              ) : (
                <div style={{ transform: `translateY(${(1 - dropProgress) * -200}px)`, opacity: dropProgress }}>
                  <PhotoPlaceholder width={500} height={375} hue={30} />
                </div>
              )}
            </div>

            {/* Settings */}
            <div style={{ flex: 0.4, padding: 24, backgroundColor: "#fafafa", borderLeft: "1px solid #e5e5e5" }}>
              <div style={{ fontFamily: FONT.heading, fontWeight: 700, fontSize: 18, color: "#0a0a0a", marginBottom: 20 }}>
                Settings
              </div>

              {/* Width field */}
              <label style={{ fontFamily: FONT.body, fontSize: 13, color: "#737373", display: "block", marginBottom: 4 }}>
                Width
              </label>
              <div
                style={{
                  height: 36,
                  borderRadius: 6,
                  border: "1px solid #e5e5e5",
                  padding: "0 12px",
                  display: "flex",
                  alignItems: "center",
                  fontFamily: FONT.mono,
                  fontSize: 14,
                  color: "#0a0a0a",
                  marginBottom: 16,
                }}
              >
                1920
              </div>

              {/* Height field */}
              <label style={{ fontFamily: FONT.body, fontSize: 13, color: "#737373", display: "block", marginBottom: 4 }}>
                Height
              </label>
              <div
                style={{
                  height: 36,
                  borderRadius: 6,
                  border: "1px solid #e5e5e5",
                  padding: "0 12px",
                  display: "flex",
                  alignItems: "center",
                  fontFamily: FONT.mono,
                  fontSize: 14,
                  color: "#a3a3a3",
                  marginBottom: 16,
                }}
              >
                auto
              </div>

              {/* Process button / results */}
              {frame >= processFrame && !showResult && (
                <ProgressBar startFrame={0} duration={60} width={300} color="#3b82f6" style={{ marginTop: 20 }} />
              )}

              {showResult && (
                <div style={{ marginTop: 20, display: "flex", gap: 16 }}>
                  <div style={{ fontFamily: FONT.body, fontSize: 14, color: "#a3a3a3" }}>2.4 MB</div>
                  <div style={{ fontFamily: FONT.body, fontSize: 14, color: "#22c55e", fontWeight: 600 }}>340 KB</div>
                  <div style={{ fontFamily: FONT.heading, fontSize: 14, color: COLOR.accent, fontWeight: 700 }}>-86%</div>
                </div>
              )}
            </div>
          </div>
        </AppWindow>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Create BatchProcessingScene (360 frames)**

Create `apps/videos/src/compositions/product-demo/scenes/BatchProcessingScene.tsx`:

```tsx
import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AppWindow } from "@/components/AppWindow";
import { ClipReveal } from "@/components/ClipReveal";
import { ProgressBar } from "@/components/ProgressBar";
import { COLOR } from "@/lib/colors";
import { FONT, TEXT } from "@/lib/fonts";
import { SPRING } from "@/lib/motion";

const FILES = [
  { name: "photo_001.jpg", from: "1.8 MB", to: "95 KB" },
  { name: "photo_002.jpg", from: "3.2 MB", to: "210 KB" },
  { name: "landscape.png", from: "4.1 MB", to: "280 KB" },
  { name: "portrait.jpg", from: "2.7 MB", to: "160 KB" },
  { name: "macro_01.jpg", from: "5.0 MB", to: "320 KB" },
  { name: "event_23.jpg", from: "1.5 MB", to: "85 KB" },
  { name: "scan_hires.png", from: "8.2 MB", to: "450 KB" },
  { name: "product_a.jpg", from: "2.0 MB", to: "120 KB" },
];

export const BatchProcessingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const processStartFrame = 100;
  const filesPerSecond = 3;
  const framesPerFile = Math.floor(30 / filesPerSecond);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f4" }}>
      <AppWindow title="Compress -- SnapOtter" width={1600} height={900} topBarColor="#ffffff" bodyColor="#ffffff">
        <div style={{ padding: 24 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {FILES.map((file, i) => {
              const enterDelay = 20 + i * 4;
              const enterSpring = spring({ frame: frame - enterDelay, fps, config: SPRING.popIn });
              const fileProcessFrame = processStartFrame + i * framesPerFile;
              const isDone = frame > fileProcessFrame + framesPerFile;
              const isProcessing = frame >= fileProcessFrame && !isDone;

              return (
                <div
                  key={file.name}
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    border: `1px solid ${isDone ? "#22c55e40" : "#e5e5e5"}`,
                    backgroundColor: isDone ? "#f0fdf4" : "white",
                    opacity: enterSpring,
                    transform: `scale(${0.8 + enterSpring * 0.2})`,
                  }}
                >
                  <div style={{ fontFamily: FONT.body, fontSize: 12, color: "#0a0a0a", fontWeight: 500, marginBottom: 8 }}>
                    {file.name}
                  </div>

                  {isProcessing && (
                    <ProgressBar
                      startFrame={0}
                      duration={framesPerFile}
                      width={200}
                      height={4}
                      color="#3b82f6"
                    />
                  )}

                  {isDone && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: "#22c55e", fontSize: 14 }}>{"✓"}</span>
                      <span style={{ fontFamily: FONT.mono, fontSize: 11, color: "#a3a3a3" }}>{file.from}</span>
                      <span style={{ fontFamily: FONT.mono, fontSize: 11, color: "#a3a3a3" }}>{"→"}</span>
                      <span style={{ fontFamily: FONT.mono, fontSize: 11, color: "#22c55e", fontWeight: 600 }}>{file.to}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {frame > 280 && (
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <ClipReveal startFrame={280}>
                <span style={{ ...TEXT.sectionTitle, fontSize: 32, color: "#0a0a0a" }}>
                  Unlimited batch. No caps.
                </span>
              </ClipReveal>
            </div>
          )}
        </div>
      </AppWindow>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/videos/src/compositions/product-demo/scenes/
git commit -m "feat(videos): add Product Demo scenes 1-3 (Dashboard, SingleTool, Batch)"
```

---

### Task 13: Product Demo Scenes 4-6

**Files:**
- Create: `apps/videos/src/compositions/product-demo/scenes/PipelineBuilderScene.tsx`
- Create: `apps/videos/src/compositions/product-demo/scenes/AiToolsScene.tsx`
- Create: `apps/videos/src/compositions/product-demo/scenes/ImageEditorScene.tsx`

- [ ] **Step 1: Create PipelineBuilderScene (390 frames)**

Create `apps/videos/src/compositions/product-demo/scenes/PipelineBuilderScene.tsx`:

```tsx
import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AppWindow } from "@/components/AppWindow";
import { COLOR } from "@/lib/colors";
import { FONT } from "@/lib/fonts";
import { SPRING, EASE } from "@/lib/motion";

const BLOCKS = [
  { name: "Resize", color: COLOR.category.essentials, enterFrame: 40, x: 250 },
  { name: "Compress", color: COLOR.category.optimization, enterFrame: 80, x: 580 },
  { name: "Watermark", color: COLOR.category.watermark, enterFrame: 120, x: 910 },
];

export const PipelineBuilderScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f4" }}>
      <AppWindow title="Pipeline Builder -- SnapOtter" width={1600} height={900} topBarColor="#ffffff" bodyColor="#ffffff">
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {/* Blocks */}
          {BLOCKS.map((block, i) => {
            const s = spring({ frame: frame - block.enterFrame, fps, config: SPRING.popIn });
            return (
              <div
                key={block.name}
                style={{
                  position: "absolute",
                  left: block.x,
                  top: 280,
                  width: 160,
                  height: 80,
                  borderRadius: 12,
                  backgroundColor: `${block.color}20`,
                  border: `2px solid ${block.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONT.body,
                  fontWeight: 600,
                  fontSize: 16,
                  color: block.color,
                  opacity: s,
                  transform: `scale(${0.5 + s * 0.5})`,
                }}
              >
                {block.name}
              </div>
            );
          })}

          {/* Connection lines */}
          {frame > 140 &&
            [0, 1].map((ci) => {
              const lineProgress = interpolate(
                frame,
                [140 + ci * 20, 170 + ci * 20],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.enter },
              );
              const x1 = BLOCKS[ci].x + 160;
              const x2 = BLOCKS[ci + 1].x;
              return (
                <svg
                  key={`line-${ci}`}
                  style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }}
                >
                  <line
                    x1={x1}
                    y1={320}
                    x2={x1 + (x2 - x1) * lineProgress}
                    y2={320}
                    stroke="#a3a3a3"
                    strokeWidth={2}
                    strokeDasharray="6,4"
                  />
                </svg>
              );
            })}

          {/* Running indicator */}
          {frame > 220 && (
            <div
              style={{
                position: "absolute",
                bottom: 100,
                width: "100%",
                textAlign: "center",
                fontFamily: FONT.body,
                fontSize: 14,
                color: "#22c55e",
                fontWeight: 500,
                opacity: interpolate(frame, [220, 235], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              {"✓"} Pipeline completed -- 5 images processed
            </div>
          )}
        </div>
      </AppWindow>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Create AiToolsScene (360 frames)**

Create `apps/videos/src/compositions/product-demo/scenes/AiToolsScene.tsx`:

```tsx
import type React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { AppWindow } from "@/components/AppWindow";
import { BeforeAfter } from "@/components/BeforeAfter";
import { ClipReveal } from "@/components/ClipReveal";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { ProgressBar } from "@/components/ProgressBar";
import { COLOR } from "@/lib/colors";
import { FONT, TEXT } from "@/lib/fonts";

const Checkerboard: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <div
    style={{
      width: w,
      height: h,
      backgroundImage:
        "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
      backgroundSize: "16px 16px",
      backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
      opacity: 0.4,
    }}
  />
);

export const AiToolsScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f4" }}>
      {/* Background removal demo (0-180) */}
      <Sequence from={0} durationInFrames={180}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <AppWindow title="Remove Background -- SnapOtter" width={1200} height={700} topBarColor="#ffffff" bodyColor="#ffffff">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 40, padding: 24 }}>
              <Sequence from={0} durationInFrames={60}>
                <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        border: "3px solid #3b82f6",
                        borderTop: "3px solid transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    <span style={{ fontFamily: FONT.body, fontSize: 14, color: "#3b82f6" }}>
                      Running rembg model locally...
                    </span>
                  </div>
                </AbsoluteFill>
              </Sequence>

              <Sequence from={60} durationInFrames={120}>
                <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
                  <BeforeAfter
                    before={<PhotoPlaceholder width={450} height={340} hue={30} />}
                    after={
                      <div style={{ position: "relative", width: 450, height: 340 }}>
                        <Checkerboard w={450} h={340} />
                        <div
                          style={{
                            position: "absolute",
                            top: 50,
                            left: 140,
                            width: 170,
                            height: 240,
                            borderRadius: "50% 50% 45% 45%",
                            background: "linear-gradient(135deg, #e8a87c, #d4856b)",
                          }}
                        />
                      </div>
                    }
                    scanStartFrame={10}
                    scanDuration={50}
                    width={450}
                    height={340}
                  />
                </AbsoluteFill>
              </Sequence>
            </div>
          </AppWindow>
        </AbsoluteFill>
      </Sequence>

      {/* Quick AI tool montage (180-360) */}
      <Sequence from={180} durationInFrames={90}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <AppWindow title="Upscale 4x -- SnapOtter" width={1000} height={500} topBarColor="#ffffff" bodyColor="#ffffff">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 30 }}>
              <PhotoPlaceholder width={100} height={100} hue={200} />
              <span style={{ fontFamily: FONT.heading, fontWeight: 800, fontSize: 32, color: COLOR.accent }}>4x</span>
              <PhotoPlaceholder width={300} height={300} hue={200} />
            </div>
          </AppWindow>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={270} durationInFrames={90}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <AppWindow title="OCR / Text Extraction -- SnapOtter" width={1000} height={500} topBarColor="#ffffff" bodyColor="#ffffff">
            <div style={{ display: "flex", height: "100%" }}>
              <div style={{ flex: 0.5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PhotoPlaceholder width={300} height={350} hue={50} />
              </div>
              <div style={{ flex: 0.5, padding: 24, borderLeft: "1px solid #e5e5e5", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 14, color: "#0a0a0a" }}>Extracted Text</div>
                {["Lorem ipsum dolor sit", "amet consectetur", "adipiscing elit sed do"].map((line, i) => (
                  <div
                    key={`ocr-${i}`}
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: 13,
                      color: "#525252",
                      padding: "4px 8px",
                      backgroundColor: "#eff6ff",
                      borderRadius: 4,
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </AppWindow>
        </AbsoluteFill>
      </Sequence>

      {/* Bottom text */}
      <div style={{ position: "absolute", bottom: 40, width: "100%", textAlign: "center" }}>
        <ClipReveal startFrame={300}>
          <span style={{ ...TEXT.sectionTitle, fontSize: 32, color: "#0a0a0a" }}>
            All on your hardware.
          </span>
        </ClipReveal>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Create ImageEditorScene (300 frames)**

Create `apps/videos/src/compositions/product-demo/scenes/ImageEditorScene.tsx`:

```tsx
import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AppWindow } from "@/components/AppWindow";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { COLOR } from "@/lib/colors";
import { FONT } from "@/lib/fonts";
import { SPRING } from "@/lib/motion";

const TOOLBAR_ICONS = [
  "Move", "Select", "Brush", "Eraser", "Clone", "Dodge", "Text", "Shape",
  "Line", "Gradient", "Fill", "Crop", "Eyedropper", "Zoom", "Hand",
];

export const ImageEditorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({ frame, fps, config: SPRING.snappy });
  const brushFrame = 60;
  const brushProgress = interpolate(frame, [brushFrame, brushFrame + 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const activeToolIdx = frame < 60 ? 2 : frame < 120 ? 6 : frame < 200 ? 11 : 2;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f4" }}>
      <div style={{ transform: `scale(${0.95 + enterSpring * 0.05})`, opacity: enterSpring }}>
        <AppWindow title="Editor -- SnapOtter" width={1600} height={900} topBarColor="#1e293b" bodyColor="#0f172a">
          <div style={{ display: "flex", height: "100%" }}>
            {/* Toolbar */}
            <div
              style={{
                width: 48,
                backgroundColor: "#1e293b",
                borderRight: "1px solid #334155",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: 8,
                gap: 2,
              }}
            >
              {TOOLBAR_ICONS.map((icon, i) => (
                <div
                  key={icon}
                  style={{
                    width: 36,
                    height: 32,
                    borderRadius: 6,
                    backgroundColor: i === activeToolIdx ? "#3b82f6" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: i === activeToolIdx ? "white" : "#94a3b8",
                    fontFamily: FONT.body,
                    fontWeight: 500,
                  }}
                >
                  {icon.slice(0, 2)}
                </div>
              ))}
            </div>

            {/* Canvas */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <PhotoPlaceholder width={900} height={600} hue={180} />

              {/* Brush stroke */}
              {brushProgress > 0 && (
                <svg
                  style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                  width="100%"
                  height="100%"
                >
                  <path
                    d={`M 300 350 Q 450 280 600 320 T 900 300`}
                    fill="none"
                    stroke={COLOR.accent}
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeDasharray={800}
                    strokeDashoffset={800 * (1 - brushProgress)}
                    opacity={0.7}
                  />
                </svg>
              )}

              {/* Text overlay */}
              {frame > 130 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 80,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontFamily: FONT.heading,
                    fontWeight: 700,
                    fontSize: 28,
                    color: "white",
                    textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                    opacity: interpolate(frame, [130, 145], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                  }}
                >
                  SnapOtter
                </div>
              )}
            </div>

            {/* Layers panel */}
            <div
              style={{
                width: 200,
                backgroundColor: "#1e293b",
                borderLeft: "1px solid #334155",
                padding: 12,
              }}
            >
              <div style={{ fontFamily: FONT.body, fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Layers
              </div>
              {["Text Layer", "Brush Stroke", "Background"].map((layer, i) => (
                <div
                  key={layer}
                  style={{
                    padding: "6px 8px",
                    borderRadius: 4,
                    backgroundColor: i === 0 ? "#334155" : "transparent",
                    fontFamily: FONT.body,
                    fontSize: 12,
                    color: "#e2e8f0",
                    marginBottom: 2,
                  }}
                >
                  {layer}
                </div>
              ))}
            </div>
          </div>
        </AppWindow>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/videos/src/compositions/product-demo/scenes/
git commit -m "feat(videos): add Product Demo scenes 4-6 (Pipeline, AI, Editor)"
```

---

### Task 14: Product Demo Scenes 7-8 + Composition

**Files:**
- Create: `apps/videos/src/compositions/product-demo/scenes/ApiDocsScene.tsx`
- Create: `apps/videos/src/compositions/product-demo/scenes/EndCardScene.tsx`
- Create: `apps/videos/src/compositions/product-demo/ProductDemo.tsx`
- Modify: `apps/videos/src/Root.tsx`

- [ ] **Step 1: Create ApiDocsScene (150 frames)**

Create `apps/videos/src/compositions/product-demo/scenes/ApiDocsScene.tsx`:

```tsx
import type React from "react";
import { AbsoluteFill } from "remotion";
import { AppWindow } from "@/components/AppWindow";
import { ClipReveal } from "@/components/ClipReveal";
import { TypeWriter } from "@/components/TypeWriter";
import { FONT, TEXT } from "@/lib/fonts";

const CURL_SEGMENTS = [
  { text: "curl ", color: "#e6edf3" },
  { text: "-X POST ", color: "#79c0ff" },
  { text: "localhost:1349/api/v1/tools/resize ", color: "#a5d6ff" },
  { text: '-F "file=@photo.jpg" ', color: "#7ee787" },
  { text: "-F ", color: "#79c0ff" },
  { text: '"settings={\\"width\\":800}"', color: "#ffa657" },
];

export const ApiDocsScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f4" }}>
      <AppWindow title="API Docs -- SnapOtter" width={1200} height={600} topBarColor="#1e293b" bodyColor="#0d1117">
        <div style={{ padding: 24 }}>
          <div style={{ fontFamily: FONT.body, fontSize: 12, color: "#8b949e", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Example Request
          </div>
          <div style={{ backgroundColor: "#161b22", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <TypeWriter segments={CURL_SEGMENTS} startFrame={10} speed={1} style={{ fontSize: 14, lineHeight: 1.6 }} />
          </div>

          <ClipReveal startFrame={80}>
            <div style={{ backgroundColor: "#161b22", borderRadius: 8, padding: 16 }}>
              <pre style={{ fontFamily: FONT.mono, fontSize: 13, color: "#e6edf3", margin: 0, lineHeight: 1.6 }}>
                {`{
  "downloadUrl": "/api/v1/download/abc123",
  "originalSize": 2400000,
  "processedSize": 340000
}`}
              </pre>
            </div>
          </ClipReveal>
        </div>
      </AppWindow>

      <div style={{ position: "absolute", bottom: 40, width: "100%", textAlign: "center" }}>
        <ClipReveal startFrame={100}>
          <span style={{ ...TEXT.sectionTitle, fontSize: 28, color: "#0a0a0a" }}>
            Every tool via REST API.
          </span>
        </ClipReveal>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Create EndCardScene (90 frames)**

Create `apps/videos/src/compositions/product-demo/scenes/EndCardScene.tsx`:

```tsx
import type React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ClipReveal } from "@/components/ClipReveal";
import { COLOR } from "@/lib/colors";
import { FONT, TEXT } from "@/lib/fonts";
import { SPRING } from "@/lib/motion";

export const EndCardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame, fps, config: SPRING.natural });
  const fadeOut = interpolate(frame, [70, 90], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white",
        opacity: fadeOut,
      }}
    >
      <Img
        src={staticFile("logo.png")}
        style={{
          width: 80,
          height: 80,
          opacity: logoSpring,
          transform: `scale(${0.8 + logoSpring * 0.2})`,
        }}
      />

      <div style={{ height: 16 }} />

      <ClipReveal startFrame={10}>
        <span style={{ ...TEXT.sectionTitle, fontSize: 36, color: "#0a0a0a" }}>
          Self-hosted image processing.
        </span>
      </ClipReveal>

      <div style={{ height: 12 }} />

      <ClipReveal startFrame={25}>
        <span style={{ fontFamily: FONT.body, fontSize: 18, color: COLOR.accent }}>
          snapotter.com
        </span>
      </ClipReveal>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Create ProductDemo composition**

Create `apps/videos/src/compositions/product-demo/ProductDemo.tsx`:

```tsx
import type React from "react";
import { AbsoluteFill, Series } from "remotion";
import { GrainOverlay } from "@/components/GrainOverlay";
import { AiToolsScene } from "./scenes/AiToolsScene";
import { ApiDocsScene } from "./scenes/ApiDocsScene";
import { BatchProcessingScene } from "./scenes/BatchProcessingScene";
import { DashboardScene } from "./scenes/DashboardScene";
import { EndCardScene } from "./scenes/EndCardScene";
import { ImageEditorScene } from "./scenes/ImageEditorScene";
import { PipelineBuilderScene } from "./scenes/PipelineBuilderScene";
import { SingleToolScene } from "./scenes/SingleToolScene";

export const ProductDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#f5f5f4" }}>
      <Series>
        <Series.Sequence durationInFrames={240}>
          <DashboardScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={360}>
          <SingleToolScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={360}>
          <BatchProcessingScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={390}>
          <PipelineBuilderScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={360}>
          <AiToolsScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={300}>
          <ImageEditorScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <ApiDocsScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={90}>
          <EndCardScene />
        </Series.Sequence>
      </Series>

      <GrainOverlay opacity={0.02} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Register in Root.tsx**

Add to `apps/videos/src/Root.tsx`:

```tsx
import { ProductDemo } from "./compositions/product-demo/ProductDemo";
```

```tsx
    <Composition
      id="ProductDemo"
      component={ProductDemo}
      durationInFrames={2250}
      fps={30}
      width={1920}
      height={1080}
    />
```

- [ ] **Step 5: Verify in Remotion Studio**

Select "ProductDemo". Scrub through all 2250 frames (75 seconds). Verify all 8 scenes play in sequence with light-theme UI mockups.

- [ ] **Step 6: Commit**

```bash
git add apps/videos/src/compositions/product-demo/ apps/videos/src/Root.tsx
git commit -m "feat(videos): add ProductDemo composition with all 8 scenes"
```

---

### Task 15: Render Script

**Files:**
- Create: `apps/videos/scripts/render-all.mjs`

- [ ] **Step 1: Create render script**

Create `apps/videos/scripts/render-all.mjs`:

```js
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { enableTailwind } from "@remotion/tailwind";
import fs from "node:fs";
import path from "node:path";

const COMPOSITIONS = [
  { id: "XLaunchVideo", slug: "x-launch" },
  { id: "ProductDemo", slug: "product-demo" },
  { id: "PromoTeaser", slug: "promo-teaser-square" },
  { id: "PromoTeaserVertical", slug: "promo-teaser-vertical" },
];

const OUTPUT_DIR = path.resolve("./out");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log("Bundling...");
const bundleLocation = await bundle({
  entryPoint: "./src/index.ts",
  webpackOverride: (config) => enableTailwind(config),
});
console.log("Bundle complete.\n");

for (const comp of COMPOSITIONS) {
  console.log(`Rendering ${comp.id}...`);
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: comp.id,
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    crf: 20,
    pixelFormat: "yuv420p",
    imageFormat: "jpeg",
    concurrency: 4,
    outputLocation: path.join(OUTPUT_DIR, `${comp.slug}.mp4`),
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 10 === 0) process.stdout.write(`\r  ${pct}%`);
    },
  });

  console.log(`\r  Done: ${comp.slug}.mp4`);
}

console.log(`\nAll ${COMPOSITIONS.length} videos rendered to ${OUTPUT_DIR}`);
```

- [ ] **Step 2: Test single render**

```bash
cd apps/videos && npx remotion render PromoTeaser out/test-promo.mp4
```

Expected: MP4 file created in `apps/videos/out/`.

- [ ] **Step 3: Commit**

```bash
git add apps/videos/scripts/render-all.mjs
git commit -m "feat(videos): add batch render script for all promo compositions"
```

---

### Task 16: Final Verification

- [ ] **Step 1: TypeScript check**

```bash
cd apps/videos && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Verify all compositions in Remotion Studio**

```bash
pnpm --filter @snapotter/videos dev
```

Open browser. Confirm all compositions appear in the picker:
- ComponentTest (existing)
- FloatingTools (existing)
- BrandGradient (existing)
- FormatUniverse (existing)
- **PromoTeaser** (new)
- **PromoTeaserVertical** (new)
- **XLaunchVideo** (new)
- **ProductDemo** (new)

Scrub through each new composition end-to-end. Verify:
- No blank frames or missing elements
- Scene transitions are clean (no visual gaps between Series.Sequence boundaries)
- Text is readable at each hold point
- Animations feel smooth (spring overshoot, ease curves)
- Colors match brand palette (amber accents, category colors)

- [ ] **Step 3: Test render one video**

```bash
cd apps/videos && npx remotion render XLaunchVideo out/x-launch.mp4
```

Open the output MP4 and watch it. Verify it matches what was shown in Studio.

- [ ] **Step 4: Commit any fixes from verification**

```bash
git add -A apps/videos/
git commit -m "fix(videos): polish from final verification pass"
```
