import type React from "react";
import { ScreenshotScene } from "./ScreenshotScene";

export const SingleToolScene: React.FC = () => {
  return (
    <ScreenshotScene
      screenshot="resize-tool.png"
      caption="Upload. Configure. Process."
      captionFrame={120}
      zoomTo={1.08}
      panY={-15}
    />
  );
};
