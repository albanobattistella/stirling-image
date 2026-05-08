import type React from "react";
import { ScreenshotScene } from "./ScreenshotScene";

export const PipelineBuilderScene: React.FC = () => {
  return (
    <ScreenshotScene
      screenshot="automate.png"
      caption="Chain tools into workflows."
      captionFrame={120}
      zoomFrom={1.05}
      zoomTo={1.0}
    />
  );
};
