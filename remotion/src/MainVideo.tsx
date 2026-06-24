import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { SceneIntro } from "./scenes/SceneIntro";
import { Scene1Initiation } from "./scenes/Scene1";
import { Scene2Evaluation } from "./scenes/Scene2";
import { Scene3Agreement } from "./scenes/Scene3";
import { Scene4Marketing } from "./scenes/Scene4";
import { Scene5ActiveSales } from "./scenes/Scene5";
import { Scene6Buyer } from "./scenes/Scene6";
import { Scene7Processing } from "./scenes/Scene7";
import { Scene8Closing } from "./scenes/Scene8";
import { SceneOutro } from "./scenes/SceneOutro";
import { loadFont as loadDisplay } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadBody } from "@remotion/google-fonts/DMSans";

loadDisplay();
loadBody();

// Editorial pacing: vary timing & presentation across transitions so cuts feel
// like turning a magazine page, not a slideshow.
const fastFade = () => ({
  presentation: fade(),
  timing: linearTiming({ durationInFrames: 14 }),
});
const slowFade = () => ({
  presentation: fade(),
  timing: linearTiming({ durationInFrames: 22 }),
});
const wipeRight = () => ({
  presentation: wipe({ direction: "from-right" as const }),
  timing: springTiming({ config: { damping: 200 }, durationInFrames: 28 }),
});
const wipeLeft = () => ({
  presentation: wipe({ direction: "from-left" as const }),
  timing: springTiming({ config: { damping: 200 }, durationInFrames: 28 }),
});
const slideUp = () => ({
  presentation: slide({ direction: "from-bottom" as const }),
  timing: linearTiming({ durationInFrames: 22 }),
});
const slideRight = () => ({
  presentation: slide({ direction: "from-right" as const }),
  timing: linearTiming({ durationInFrames: 22 }),
});

export const SellerJourney: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={120}>
        <SceneIntro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...slowFade()} />

      <TransitionSeries.Sequence durationInFrames={120}>
        <Scene1Initiation />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...wipeRight()} />

      <TransitionSeries.Sequence durationInFrames={120}>
        <Scene2Evaluation />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...fastFade()} />

      <TransitionSeries.Sequence durationInFrames={120}>
        <Scene3Agreement />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...slideRight()} />

      <TransitionSeries.Sequence durationInFrames={140}>
        <Scene4Marketing />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...wipeLeft()} />

      <TransitionSeries.Sequence durationInFrames={140}>
        <Scene5ActiveSales />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...fastFade()} />

      <TransitionSeries.Sequence durationInFrames={130}>
        <Scene6Buyer />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...wipeRight()} />

      <TransitionSeries.Sequence durationInFrames={140}>
        <Scene7Processing />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...slideUp()} />

      <TransitionSeries.Sequence durationInFrames={140}>
        <Scene8Closing />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...slowFade()} />

      <TransitionSeries.Sequence durationInFrames={120}>
        <SceneOutro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
