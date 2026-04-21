import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { colors, fonts } from "../styles";
import { FloatingParticle, AnimatedRing, GradientOrb, DashedArc } from "../components/FloatingParticle";

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 15, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);

  const subSpring = spring({ frame: frame - 30, fps, config: { damping: 200 } });
  const subOpacity = interpolate(subSpring, [0, 1], [0, 1]);

  const contactSpring = spring({ frame: frame - 45, fps, config: { damping: 20, stiffness: 150 } });
  const contactScale = interpolate(contactSpring, [0, 1], [0.9, 1]);
  const contactOpacity = interpolate(contactSpring, [0, 1], [0, 1]);

  const pulse = Math.sin(frame / 15) * 5 + 25;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${colors.primaryLight} 0%, ${colors.background} 40%, ${colors.sandLight} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FloatingParticle x={200} y={200} size={100} speed={0.5} color={colors.primaryLight} />
      <FloatingParticle x={1500} y={300} size={80} speed={0.7} color={colors.accentLight} />
      <AnimatedRing x={1600} y={200} size={320} speed={0.4} />
      <AnimatedRing x={300} y={700} size={200} color={colors.sand + "18"} speed={0.3} />
      <GradientOrb x={1400} y={650} size={220} />
      <DashedArc x={500} y={150} size={280} speed={0.25} />

      {/* Completed timeline */}
      <div style={{ position: "absolute", top: 80, left: 160, right: 160, display: "flex", alignItems: "center", gap: 8 }}>
        {Array.from({ length: 8 }, (_, i) => {
          const dotSpring = spring({ frame: frame - i * 4, fps, config: { damping: 20, stiffness: 200 } });
          return (
            <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: colors.primary, opacity: interpolate(dotSpring, [0, 1], [0, 1]) }} />
          );
        })}
      </div>

      <div style={{ textAlign: "center", maxWidth: 900 }}>
        <div style={{
          fontFamily: fonts.display,
          fontSize: 100,
          color: colors.foreground,
          lineHeight: 1.1,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}>
          We Handle{"\n"}
          <span style={{ fontStyle: "italic", color: colors.primary }}>Everything</span>
        </div>

        <div style={{
          fontFamily: fonts.body,
          fontSize: 28,
          color: colors.muted,
          lineHeight: 1.6,
          marginTop: 28,
          opacity: subOpacity,
          fontWeight: 300,
        }}>
          No upfront costs. No hidden fees. No hassle.{"\n"}
          Just a seamless sale at the best market price.
        </div>

        <div style={{
          marginTop: 50,
          display: "inline-flex",
          alignItems: "center",
          gap: 30,
          background: colors.white,
          borderRadius: 28,
          padding: "32px 52px",
          transform: `scale(${contactScale})`,
          opacity: contactOpacity,
          boxShadow: `0 ${pulse}px 80px -20px ${colors.primary}20`,
        }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: fonts.display, fontSize: 28, color: colors.foreground }}>Get Your Free Valuation</div>
            <div style={{ fontFamily: fonts.body, fontSize: 20, color: colors.muted, marginTop: 8 }}>650-372-0795 · Help@CemeteryProperty.com</div>
          </div>
        </div>

        <div style={{ fontFamily: fonts.body, fontSize: 16, color: colors.muted, marginTop: 24, opacity: subOpacity }}>
          *Approximate timeline — actual duration may vary by property
        </div>
      </div>
    </AbsoluteFill>
  );
};
