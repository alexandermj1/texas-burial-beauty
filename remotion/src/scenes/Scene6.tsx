import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from "remotion";
import { colors, fonts } from "../styles";
import { FloatingParticle, AnimatedRing, GradientOrb, DashedArc } from "../components/FloatingParticle";

const SYMBOL_SIZE = 240;
const BADGE_WIDTH = 210;

export const Scene6Buyer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);

  const iconSpring = spring({ frame: frame - 30, fps, config: { damping: 16, stiffness: 180 } });
  const iconScale = interpolate(iconSpring, [0, 1], [0.72, 1]);
  const pulse = Math.sin(frame / 10) * 0.03 + 1;
  const offerProgress = interpolate(frame - 46, [0, 66], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const numSpring = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });

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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 96, padding: "0 180px" }}>
        <div style={{ flex: "0 0 620px", maxWidth: 620 }}>
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

        <div style={{ flex: 0, position: "relative", width: SYMBOL_SIZE + BADGE_WIDTH + 26, height: SYMBOL_SIZE + 64 }}>
          <div style={{ marginBottom: 18, width: SYMBOL_SIZE, opacity: interpolate(frame - 44, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: fonts.body, fontSize: 17, color: colors.muted }}>Buyer terms</span>
              <span style={{ fontFamily: fonts.body, fontSize: 17, color: colors.primary, fontWeight: 600 }}>{Math.round(offerProgress)}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: colors.sand, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${offerProgress}%`, borderRadius: 999, background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})` }} />
            </div>
          </div>

          <div style={{
            width: SYMBOL_SIZE, height: SYMBOL_SIZE, borderRadius: "50%",
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: `scale(${iconScale * pulse})`,
            boxShadow: `0 20px 60px -15px ${colors.primary}60`,
          }}>
            <svg width="124" height="124" viewBox="0 0 24 24" fill="none" stroke={colors.background} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5V7.8A2.8 2.8 0 0 1 6.8 5h4.4A2.8 2.8 0 0 1 14 7.8v4.7" />
              <path d="M7 12.5v-2.2A2 2 0 0 1 9 8.3h3" />
              <path d="M3 14.5h5.2l2 2h3.1" />
              <path d="M21 14.5h-5.2l-2 2" />
              <path d="M8 18.8h8" />
              <path d="m15.5 10.8 1.6 1.6 3.2-3.4" />
            </svg>
          </div>

          <Sequence from={54}>
            <BuyerBadge label="Buyer found" top={78} />
          </Sequence>
          <Sequence from={74}>
            <BuyerBadge label="Terms locked" top={156} />
          </Sequence>
        </div>
      </div>

      <Sequence from={40}>
        <BottomProgress step={6} />
      </Sequence>
    </AbsoluteFill>
  );
};

const BuyerBadge: React.FC<{ label: string; top: number }> = ({ label, top }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16, stiffness: 180 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const x = interpolate(s, [0, 1], [24, 0]);

  return (
    <div style={{
      position: "absolute", top, left: 260,
      display: "flex", alignItems: "center", gap: 10,
      background: colors.white, borderRadius: 999, width: BADGE_WIDTH, padding: "11px 18px",
      boxShadow: `0 15px 30px -14px ${colors.foreground}24`,
      opacity, transform: `translateX(${x}px)`,
    }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", background: colors.primaryLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span style={{ fontFamily: fonts.body, fontSize: 21, color: colors.foreground, fontWeight: 500 }}>{label}</span>
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
