import type React from "react";
import { ScreenshotScene } from "./ScreenshotScene";

export const BatchProcessingScene: React.FC = () => {
  return (
    <ScreenshotScene
      screenshot="compress-tool.png"
      caption="Unlimited batch. No caps."
      captionFrame={160}
    />
  );
};
