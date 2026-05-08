import type React from "react";
import { ScreenshotScene } from "./ScreenshotScene";

export const DashboardScene: React.FC = () => {
  return (
    <ScreenshotScene
      screenshot="dashboard.png"
      caption="49 tools. One dashboard."
      captionFrame={120}
      panX={-20}
    />
  );
};
