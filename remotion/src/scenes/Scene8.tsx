import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from "remotion";
import { colors, fonts } from "../styles";
import { FloatingParticle, AnimatedRing, GradientOrb, DashedArc } from "../components/FloatingParticle";

const SYMBOL_SIZE = 240;
const CHIP_HEIGHT = 52;

export const Scene8Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);

  const badgeSpring = spring({ frame: frame - 30, fps, config: { damping: 10, stiffness: 200 } });
  const badgeScale = interpolate(badgeSpring, [0, 1], [0, 1]);

  const glow = Math.sin(frame / 20) * 10 + 30;
  const numSpring = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });

  // 3 chips perfectly spaced: top aligned with symbol top, bottom with symbol bottom
  const chipTop1 = 0;
  const chipTop3 = SYMBOL_SIZE - CHIP_HEIGHT;
  const chipTop2 = (chipTop1 + chipTop3) / 2;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${colors.primaryLight} 0%, ${colors.background} 40%, ${colors.sandLight} 80%, ${colors.accentLight} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FloatingParticle x={200} y={100} size={30} speed={2} color={colors.primary + "40"} />
      <FloatingParticle x={1400} y={150} size={25} speed={1.8} color={colors.primary + "40"} />
      <FloatingParticle x={1600} y={300} size={35} speed={1.3} color={colors.accent + "40"} />
      <AnimatedRing x={1550} y={220} size={300} speed={0.7} />
      <GradientOrb x={150} y={650} size={220} />
      <DashedArc x={900} y={800} size={180} speed={0.3} />
      <AnimatedRing x={250} y={350} size={150} color={colors.sand + "20"} speed={0.3} />

      <div style={{ position: "absolute", left: 100, top: 80, transform: `scale(${interpolate(numSpring, [0, 1], [0, 1])})`, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: colors.primary, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.display, fontSize: 28, color: colors.background }}>8</div>
        <span style={{ fontFamily: fonts.body, fontSize: 20, color: colors.muted, letterSpacing: 2, textTransform: "uppercase" }}>Final Step</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 120, padding: "0 180px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: fonts.body, fontSize: 24, color: colors.accent, letterSpacing: 3, textTransform: "uppercase", fontWeight: 500, opacity: titleOpacity, marginBottom: 20 }}>
            Day ~90
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 88, color: colors.foreground, lineHeight: 1.1, opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            Sale{"\n"}
            <span style={{ fontStyle: "italic", color: colors.primary }}>Complete</span>
          </div>
          <div style={{ fontFamily: fonts.body, fontSize: 26, color: colors.muted, lineHeight: 1.6, maxWidth: 560, marginTop: 28, opacity: titleOpacity }}>
            Payment issued at exactly the agreed price — no additional fees.
          </div>
        </div>

        <div style={{ flex: 0, position: "relative" }}>
          {/* Big checkmark — same SYMBOL_SIZE as all others */}
          <div style={{
            width: SYMBOL_SIZE, height: SYMBOL_SIZE, borderRadius: "50%",
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: `scale(${badgeScale})`,
            boxShadow: `0 ${glow}px 60px -15px ${colors.primary}50`,
          }}>
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke={colors.background} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Closing points as white pill boxes, perfectly aligned with symbol */}
          <Sequence from={55}>
            <ClosingChip text="Financing arranged" top={chipTop1} />
          </Sequence>
          <Sequence from={70}>
            <ClosingChip text="Ownership transferred" top={chipTop2} />
          </Sequence>
          <Sequence from={85}>
            <ClosingChip text="Full payment — no fees" top={chipTop3} />
          </Sequence>
        </div>
      </div>

      <Sequence from={40}>
        <BottomProgress step={8} />
      </Sequence>
    </AbsoluteFill>
  );
};

const ClosingChip: React.FC<{ text: string; top: number }> = ({ text, top }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const x = interpolate(s, [0, 1], [20, 0]);
  return (
    <div style={{
      position: "absolute", top, left: 260,
      display: "flex", alignItems: "center", gap: 14,
      background: colors.white, borderRadius: 999, padding: "12px 20px", width: 280,
      boxShadow: `0 16px 34px -14px ${colors.foreground}24`,
      opacity, transform: `translateX(${x}px)`,
    }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: colors.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span style={{ fontFamily: fonts.body, fontSize: 20, color: colors.foreground, fontWeight: 500 }}>{text}</span>
    </div>
  );
};

const BottomProgress: React.FC<{ step: number }> = ({ step }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 200 } });
  const opacity = interpolate(progress, [0, 1], [0, 0.6]);
  return (
    <div style={{ position: "absolute", bottom: 60, left: 160, right: 160, display: "flex", alignItems: "center", gap: 8, opacity }}>
      {Array.from({ length: 8 }, (_, i) => (<div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i < step ? colors.primary : colors.sand }} />))}
      <span style={{ fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginLeft: 8 }}>{step}/8</span>
    </div>
  );
};
