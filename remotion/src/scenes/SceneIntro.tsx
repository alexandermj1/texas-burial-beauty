import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { colors, fonts } from "../styles";
import { FloatingParticle, AnimatedRing, GradientOrb, DashedArc } from "../components/FloatingParticle";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgScale = interpolate(frame, [0, 150], [1, 1.08], { extrapolateRight: "clamp" });

  const titleSpring = spring({ frame: frame - 15, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [60, 0]);

  const subSpring = spring({ frame: frame - 35, fps, config: { damping: 200 } });
  const subOpacity = interpolate(subSpring, [0, 1], [0, 1]);
  const subY = interpolate(subSpring, [0, 1], [30, 0]);

  const numSpring = spring({ frame: frame - 50, fps, config: { damping: 15, stiffness: 150 } });
  const numScale = interpolate(numSpring, [0, 1], [0.5, 1]);
  const numOpacity = interpolate(numSpring, [0, 1], [0, 1]);

  const lineWidth = interpolate(frame - 25, [0, 40], [0, 300], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${colors.background} 0%, ${colors.primaryLight} 30%, ${colors.sandLight} 70%, ${colors.background} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${bgScale})`,
      }}
    >
      <FloatingParticle x={100} y={150} size={120} speed={0.5} color={colors.primaryLight} />
      <FloatingParticle x={1600} y={200} size={100} speed={0.7} color={colors.accentLight} />
      <FloatingParticle x={300} y={700} size={80} speed={0.4} color={colors.sandLight} />
      <FloatingParticle x={1400} y={650} size={90} speed={0.6} color={colors.primaryLight} />
      <AnimatedRing x={1650} y={180} size={350} speed={0.4} />
      <AnimatedRing x={250} y={750} size={250} color={colors.sand + "18"} speed={0.3} />
      <GradientOrb x={1500} y={600} size={250} />
      <DashedArc x={400} y={200} size={300} speed={0.2} />

      <div style={{
        position: "absolute",
        width: 600,
        height: 600,
        borderRadius: "50%",
        border: `2px solid ${colors.primary}15`,
        right: -100,
        top: -100,
      }} />

      <div style={{ textAlign: "center", maxWidth: 1000, padding: "0 80px" }}>
        <div style={{
          fontFamily: fonts.body,
          fontSize: 22,
          color: colors.primary,
          letterSpacing: 4,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: titleOpacity,
          marginBottom: 30,
        }}>
          Cemetery Property Resales
        </div>

        <div style={{
          fontFamily: fonts.display,
          fontSize: 110,
          color: colors.foreground,
          lineHeight: 1.05,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}>
          Your Seller{"\n"}
          <span style={{ fontStyle: "italic", color: colors.primary }}>Journey</span>
        </div>

        <div style={{
          width: lineWidth,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${colors.primary}60, transparent)`,
          margin: "32px auto",
        }} />

        <div style={{
          fontFamily: fonts.body,
          fontSize: 30,
          color: colors.muted,
          lineHeight: 1.6,
          opacity: subOpacity,
          transform: `translateY(${subY}px)`,
          fontWeight: 300,
        }}>
          From first contact to final payment — here's everything{"\n"}
          we do behind the scenes to sell your property.
        </div>

        <div style={{
          marginTop: 50,
          display: "inline-flex",
          alignItems: "center",
          gap: 20,
          background: colors.white,
          borderRadius: 100,
          padding: "20px 44px",
          transform: `scale(${numScale})`,
          opacity: numOpacity,
          boxShadow: `0 15px 50px -15px ${colors.foreground}12`,
        }}>
          <div style={{
            fontFamily: fonts.display,
            fontSize: 52,
            color: colors.primary,
          }}>
            ~90
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: fonts.body, fontSize: 20, color: colors.foreground, fontWeight: 500 }}>Days</div>
            <div style={{ fontFamily: fonts.body, fontSize: 15, color: colors.muted }}>Approximate timeline</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
