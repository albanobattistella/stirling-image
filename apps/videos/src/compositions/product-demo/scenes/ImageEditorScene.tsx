import type React from "react";
import { ScreenshotScene } from "./ScreenshotScene";

export const ImageEditorScene: React.FC = () => {
  return (
    <ScreenshotScene
      screenshot="editor.png"
      caption="Full image editor built in."
      captionFrame={100}
    />
  );
};
