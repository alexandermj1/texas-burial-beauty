import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { colors, fonts } from "../styles";

export const CountUp: React.FC<{
  from: number;
  to: number;
  suffix?: string;
  prefix?: string;
  label: string;
  delay?: number;
  color?: string;
}> = ({ from, to, suffix = "", prefix = "", label, delay = 0, color = colors.primary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 40, stiffness: 60 },
  });

  const value = Math.round(interpolate(progress, [0, 1], [from, to]));
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(progress, [0, 1], [30, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 56,
          color,
          lineHeight: 1,
        }}
      >
        {prefix}{value.toLocaleString()}{suffix}
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: 18,
          color: colors.muted,
          marginTop: 8,
        }}
      >
        {label}
      </div>
    </div>
  );
};
