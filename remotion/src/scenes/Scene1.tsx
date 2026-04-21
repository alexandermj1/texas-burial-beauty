import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from "remotion";
import { colors, fonts } from "../styles";
import { FloatingParticle, AnimatedRing, GradientOrb, DashedArc } from "../components/FloatingParticle";

export const Scene1Initiation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const daySpring = spring({ frame, fps, config: { damping: 200 } });
  const dayOpacity = interpolate(daySpring, [0, 1], [0, 1]);

  const titleSpring = spring({ frame: frame - 15, fps, config: { damping: 200 } });
  const titleY = interpolate(titleSpring, [0, 1], [50, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  const subSpring = spring({ frame: frame - 30, fps, config: { damping: 200 } });
  const subOpacity = interpolate(subSpring, [0, 1], [0, 1]);

  const phoneSpring = spring({ frame: frame - 20, fps, config: { damping: 15, stiffness: 200 } });
  const phoneScale = interpolate(phoneSpring, [0, 1], [0, 1]);
  const phoneRotate = interpolate(phoneSpring, [0, 1], [-15, 0]);

  const numSpring = spring({ frame: frame - 5, fps, config: { damping: 20, stiffness: 200 } });
  const numScale = interpolate(numSpring, [0, 1], [0, 1]);

  const pulse = Math.sin((frame * 3) / fps) * 0.05 + 1;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${colors.background} 0%, ${colors.sandLight} 60%, ${colors.primaryLight} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FloatingParticle x={150} y={200} size={80} speed={0.8} color={colors.primaryLight} />
      <FloatingParticle x={1600} y={100} size={60} speed={1.2} color={colors.accentLight} />
      <AnimatedRing x={1600} y={200} size={300} speed={0.5} />
      <GradientOrb x={180} y={700} size={200} />
      <DashedArc x={900} y={780} size={220} speed={0.3} />

      {/* Step badge */}
      <div style={{ position: "absolute", left: 100, top: 80, transform: `scale(${numScale})`, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: colors.primary, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.display, fontSize: 28, color: colors.background }}>1</div>
        <span style={{ fontFamily: fonts.body, fontSize: 20, color: colors.muted, letterSpacing: 2, textTransform: "uppercase" }}>Step One</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 120, padding: "0 180px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: fonts.body, fontSize: 24, color: colors.primary, letterSpacing: 3, textTransform: "uppercase", fontWeight: 500, opacity: dayOpacity, marginBottom: 20 }}>
            Day 1
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 88, color: colors.foreground, lineHeight: 1.1, opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            Seller{"\n"}
            <span style={{ fontStyle: "italic", color: colors.primary }}>Reaches Out</span>
          </div>
          <div style={{ fontFamily: fonts.body, fontSize: 26, color: colors.muted, lineHeight: 1.6, maxWidth: 560, marginTop: 28, opacity: subOpacity }}>
            A quick call or email is all it takes to start.
          </div>
        </div>

        <div style={{ flex: 0, transform: `scale(${phoneScale * pulse}) rotate(${phoneRotate}deg)` }}>
          <div style={{ width: 240, height: 240, borderRadius: 48, background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 20px 60px -15px ${colors.primary}60` }}>
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke={colors.background} strokeWidth="1.5">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
        </div>
      </div>

      <Sequence from={40}>
        <BottomProgress step={1} />
      </Sequence>
    </AbsoluteFill>
  );
};

const BottomProgress: React.FC<{ step: number }> = ({ step }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 200 } });
  const opacity = interpolate(progress, [0, 1], [0, 0.6]);
  return (
    <div style={{ position: "absolute", bottom: 60, left: 160, right: 160, display: "flex", alignItems: "center", gap: 8, opacity }}>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i < step ? colors.primary : colors.sand }} />
      ))}
      <span style={{ fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginLeft: 8 }}>{step}/8</span>
    </div>
  );
};
