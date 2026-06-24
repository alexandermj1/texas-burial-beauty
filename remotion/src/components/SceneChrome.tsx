import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { colors, fonts } from "../styles";

/**
 * Editorial Vogue-inspired chrome: top masthead with chapter mark and
 * page number, bottom hairline footer with publication mark + 8-tick
 * progress. Replaces the per-scene step badge and bottom progress bar so
 * every scene feels part of the same magazine spread.
 */
export const SceneChrome: React.FC<{
  step: number;            // 1..8
  chapter: string;         // e.g. "Initiation"
  kicker?: string;         // e.g. "Initial Contact"
}> = ({ step, chapter, kicker }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const top = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const topO = interpolate(top, [0, 1], [0, 1]);
  const topY = interpolate(top, [0, 1], [-14, 0]);

  const ruleW = interpolate(frame - 6, [0, 28], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const foot = spring({ frame: frame - 18, fps, config: { damping: 200 } });
  const footO = interpolate(foot, [0, 1], [0, 1]);
  const footY = interpolate(foot, [0, 1], [14, 0]);

  return (
    <>
      {/* Top masthead */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 100,
          right: 100,
          display: "flex",
          alignItems: "center",
          gap: 28,
          opacity: topO,
          transform: `translateY(${topY}px)`,
          zIndex: 5,
        }}
      >
        <span
          style={{
            fontFamily: fonts.body,
            fontSize: 14,
            letterSpacing: 4,
            textTransform: "uppercase",
            fontWeight: 600,
            color: colors.foreground,
          }}
        >
          Vol. 01
        </span>
        <span style={{ width: 1, height: 18, background: colors.foreground + "30" }} />
        <span
          style={{
            fontFamily: fonts.display,
            fontSize: 22,
            fontStyle: "italic",
            color: colors.foreground,
            lineHeight: 1,
          }}
        >
          N° 0{step}
          <span style={{ color: colors.muted, fontStyle: "normal", fontFamily: fonts.body, fontSize: 14, marginLeft: 12, letterSpacing: 3, textTransform: "uppercase" }}>
            {chapter}
          </span>
        </span>
        <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${colors.foreground}30, transparent)`, transformOrigin: "left", transform: `scaleX(${ruleW / 100})` }} />
        {kicker && (
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: 12,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: colors.muted,
            }}
          >
            {kicker}
          </span>
        )}
        <span
          style={{
            fontFamily: fonts.body,
            fontSize: 12,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: colors.muted,
          }}
        >
          Page {step} / 8
        </span>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 56,
          left: 100,
          right: 100,
          display: "flex",
          alignItems: "center",
          gap: 24,
          opacity: footO,
          transform: `translateY(${footY}px)`,
          zIndex: 5,
        }}
      >
        <span
          style={{
            fontFamily: fonts.display,
            fontStyle: "italic",
            fontSize: 18,
            color: colors.foreground,
            letterSpacing: 0.2,
          }}
        >
          Texas Cemetery Brokers
        </span>
        <span style={{ width: 1, height: 14, background: colors.foreground + "30" }} />
        <span
          style={{
            fontFamily: fonts.body,
            fontSize: 11,
            letterSpacing: 3.5,
            textTransform: "uppercase",
            color: colors.muted,
          }}
        >
          The Seller Journey
        </span>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
          {Array.from({ length: 8 }, (_, i) => {
            const active = i < step;
            const current = i === step - 1;
            return (
              <div
                key={i}
                style={{
                  height: current ? 3 : 1,
                  width: current ? 36 : 18,
                  borderRadius: 1,
                  background: active ? colors.foreground : colors.foreground + "25",
                  transition: "none",
                }}
              />
            );
          })}
          <span style={{ fontFamily: fonts.body, fontSize: 11, letterSpacing: 2.5, color: colors.muted, marginLeft: 10, textTransform: "uppercase" }}>
            {String(step).padStart(2, "0")} · 08
          </span>
        </div>
      </div>
    </>
  );
};
