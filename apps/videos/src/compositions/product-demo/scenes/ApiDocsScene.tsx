import type React from "react";
import { ScreenshotScene } from "./ScreenshotScene";

export const ApiDocsScene: React.FC = () => {
  return (
    <ScreenshotScene
      screenshot="api-docs.png"
      caption="Every tool via REST API."
      captionFrame={120}
      topBarColor="#ffffff"
      bodyColor="#ffffff"
    />
  );
};
