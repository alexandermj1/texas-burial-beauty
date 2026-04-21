import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { colors } from "../styles";

export const ProgressBar: React.FC<{
  progress: number; // 0-1
  delay?: number;
  label?: string;
}> = ({ progress, delay = 0, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const animProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 30, stiffness: 80 },
  });

  const width = interpolate(animProgress, [0, 1], [0, progress * 100]);
  const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ opacity, width: "100%" }}>
      {label && (
        <div
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 16,
            color: colors.muted,
            marginBottom: 8,
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          width: "100%",
          height: 8,
          borderRadius: 4,
          background: colors.sandLight,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            borderRadius: 4,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
          }}
        />
      </div>
    </div>
  );
};
