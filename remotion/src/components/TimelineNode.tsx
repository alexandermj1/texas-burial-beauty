import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { colors, fonts } from "../styles";

export const TimelineNode: React.FC<{
  stepNumber: number;
  title: string;
  delay?: number;
}> = ({ stepNumber, title, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });

  const scale = interpolate(progress, [0, 1], [0.3, 1]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: colors.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fonts.display,
          fontSize: 28,
          color: colors.background,
          flexShrink: 0,
        }}
      >
        {stepNumber}
      </div>
      <span
        style={{
          fontFamily: fonts.display,
          fontSize: 32,
          color: colors.foreground,
        }}
      >
        {title}
      </span>
    </div>
  );
};
