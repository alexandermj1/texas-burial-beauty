import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from "remotion";
import { colors, fonts } from "../styles";
import { FloatingParticle, AnimatedRing, GradientOrb, DashedArc } from "../components/FloatingParticle";

const SYMBOL_SIZE = 240;
const CARD_SIZE = 140;
const CARD_GAP = 60;
const LINE_LENGTH = CARD_GAP;

export const Scene6Buyer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);

  const leftCard = spring({ frame: frame - 36, fps, config: { damping: 20, stiffness: 110 } });
  const rightCard = spring({ frame: frame - 46, fps, config: { damping: 20, stiffness: 110 } });
  const leftX = interpolate(leftCard, [0, 1], [-30, 0]);
  const rightX = interpolate(rightCard, [0, 1], [30, 0]);

  const lineWidth = interpolate(frame - 58, [0, 26], [0, LINE_LENGTH], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const matchSpring = spring({ frame: frame - 82, fps, config: { damping: 12, stiffness: 240 } });
  const matchScale = interpolate(matchSpring, [0, 1], [0, 1]);

  const numSpring = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });

  const totalWidth = CARD_SIZE * 2 + CARD_GAP;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${colors.primaryLight} 0%, ${colors.background} 50%, ${colors.sandLight} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FloatingParticle x={100} y={300} size={70} speed={0.8} color={colors.primaryLight} />
      <FloatingParticle x={1500} y={600} size={60} speed={1.2} color={colors.accentLight} />
      <AnimatedRing x={1500} y={250} size={260} speed={0.5} />
      <GradientOrb x={200} y={650} size={180} />
      <DashedArc x={1100} y={700} size={200} speed={0.3} />

      <div style={{ position: "absolute", left: 100, top: 80, transform: `scale(${interpolate(numSpring, [0, 1], [0, 1])})`, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: colors.primary, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.display, fontSize: 28, color: colors.background }}>6</div>
        <span style={{ fontFamily: fonts.body, fontSize: 20, color: colors.muted, letterSpacing: 2, textTransform: "uppercase" }}>Step Six</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 100, padding: "0 180px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: fonts.body, fontSize: 24, color: colors.accent, letterSpacing: 3, textTransform: "uppercase", fontWeight: 500, opacity: titleOpacity, marginBottom: 20 }}>
            Days 30–60
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 96, color: colors.foreground, lineHeight: 1.05, opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            Securing{"\n"}
            <span style={{ fontStyle: "italic", color: colors.primary }}>the Buyer</span>
          </div>
          <div style={{ fontFamily: fonts.body, fontSize: 26, color: colors.muted, lineHeight: 1.6, maxWidth: 560, marginTop: 28, opacity: titleOpacity }}>
            We match your property with a qualified buyer and lock in formal terms.
          </div>
        </div>

        {/* Property → Line → Buyer visual — compact layout */}
        <div style={{ flex: 0, position: "relative", width: totalWidth, height: SYMBOL_SIZE }}>
          {/* Property card */}
          <div style={{
            position: "absolute", left: 0, top: (SYMBOL_SIZE - CARD_SIZE) / 2,
            transform: `translateX(${leftX}px)`, opacity: interpolate(leftCard, [0, 1], [0, 1]),
          }}>
            <MatchCard icon="🏠" title="Property" subtitle="Listed" />
          </div>

          {/* Connecting line background */}
          <div style={{
            position: "absolute",
            left: CARD_SIZE,
            top: SYMBOL_SIZE / 2 - 2,
            width: CARD_GAP, height: 4,
            borderRadius: 2, background: colors.sand,
          }} />
          {/* Connecting line animated */}
          <div style={{
            position: "absolute",
            left: CARD_SIZE,
            top: SYMBOL_SIZE / 2 - 2,
            width: lineWidth, height: 4,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
          }} />

          {/* Match checkmark in center */}
          <div style={{
            position: "absolute",
            left: CARD_SIZE + (CARD_GAP - 50) / 2,
            top: SYMBOL_SIZE / 2 - 25,
            width: 50, height: 50, borderRadius: "50%",
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: `scale(${matchScale})`,
            boxShadow: `0 12px 30px -8px ${colors.primary}45`,
            zIndex: 2,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.background} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Buyer card */}
          <div style={{
            position: "absolute", left: CARD_SIZE + CARD_GAP, top: (SYMBOL_SIZE - CARD_SIZE) / 2,
            transform: `translateX(${rightX}px)`, opacity: interpolate(rightCard, [0, 1], [0, 1]),
          }}>
            <MatchCard icon="👤" title="Buyer" subtitle="Qualified" />
          </div>

          {/* Match confirmed label */}
          <Sequence from={90}>
            <div style={{
              position: "absolute", left: (totalWidth - 220) / 2, bottom: -50,
              background: colors.white, borderRadius: 999, padding: "12px 24px",
              boxShadow: `0 14px 30px -12px ${colors.foreground}22`,
            }}>
              <span style={{ fontFamily: fonts.body, fontSize: 22, color: colors.foreground, fontWeight: 500 }}>Match Confirmed</span>
            </div>
          </Sequence>
        </div>
      </div>

      <Sequence from={40}>
        <BottomProgress step={6} />
      </Sequence>
    </AbsoluteFill>
  );
};

const CARD_SIZE_INNER = 140;

const MatchCard: React.FC<{ icon: string; title: string; subtitle: string }> = ({ icon, title, subtitle }) => {
  return (
    <div style={{
      width: CARD_SIZE_INNER, minHeight: CARD_SIZE_INNER, background: colors.white, borderRadius: 24,
      padding: "16px 12px", boxShadow: `0 16px 36px -14px ${colors.foreground}24`, textAlign: "center",
    }}>
      <div style={{ width: 50, height: 50, borderRadius: "50%", background: colors.primaryLight, margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: fonts.display, fontSize: 20, color: colors.foreground, lineHeight: 1 }}>{title}</div>
      <div style={{ fontFamily: fonts.body, fontSize: 15, color: colors.muted, marginTop: 4 }}>{subtitle}</div>
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
