import { Composition } from "remotion";
import { SellerJourney } from "./MainVideo";

// 8 scenes × ~135 frames avg + transitions
// Total: ~40 seconds at 30fps = 1200 frames
export const RemotionRoot = () => (
  <Composition
    id="seller-journey"
    component={SellerJourney}
    durationInFrames={1010}
    fps={30}
    width={1920}
    height={1080}
  />
);
