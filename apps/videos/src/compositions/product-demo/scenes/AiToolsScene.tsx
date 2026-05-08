import type React from "react";
import { ScreenshotScene } from "./ScreenshotScene";

export const AiToolsScene: React.FC = () => {
  return (
    <ScreenshotScene
      screenshot="remove-bg.png"
      caption="15 AI models. Your hardware."
      captionFrame={120}
      panX={10}
    />
  );
};
