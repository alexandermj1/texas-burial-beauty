import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from "remotion";
import { colors, fonts } from "../styles";
import { FloatingParticle, AnimatedRing, GradientOrb, DashedArc } from "../components/FloatingParticle";

const SYMBOL_SIZE = 240;

export const Scene4Marketing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [42, 0]);

  const iconSpring = spring({ frame: frame - 28, fps, config: { damping: 14, stiffness: 180 } });
  const iconScale = interpolate(iconSpring, [0, 1], [0.72, 1]);
  const wave = Math.sin(frame / 12) * 0.03 + 1;

  const reachSpring = spring({ frame: frame - 86, fps, config: { damping: 40, stiffness: 60 } });
  const reach = Math.round(interpolate(reachSpring, [0, 1], [0, 15000]));

  const numSpring = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${colors.sandLight} 0%, ${colors.background} 52%, ${colors.accentLight} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FloatingParticle x={100} y={400} size={60} speed={1} color={colors.primaryLight} />
      <FloatingParticle x={1700} y={300} size={75} speed={0.8} color={colors.accentLight} />
      <AnimatedRing x={1580} y={200} size={280} speed={0.6} />
      <GradientOrb x={200} y={700} size={200} />
      <DashedArc x={850} y={780} size={240} speed={0.35} />

      <div style={{ position: "absolute", left: 100, top: 80, transform: `scale(${interpolate(numSpring, [0, 1], [0, 1])})`, display: "flex", alignItems: "center", gap: 16, zIndex: 2 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: colors.primary, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.display, fontSize: 28, color: colors.background }}>4</div>
        <span style={{ fontFamily: fonts.body, fontSize: 20, color: colors.muted, letterSpacing: 2, textTransform: "uppercase" }}>Step Four</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 120, padding: "0 180px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: fonts.body, fontSize: 24, color: colors.accent, letterSpacing: 3, textTransform: "uppercase", fontWeight: 500, opacity: titleOpacity, marginBottom: 20 }}>
            Days 5–14
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 96, color: colors.foreground, lineHeight: 1.05, opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            Marketing{"\n"}
            <span style={{ fontStyle: "italic", color: colors.primary }}>Launch</span>
          </div>
          <div style={{ fontFamily: fonts.body, fontSize: 26, color: colors.muted, lineHeight: 1.6, maxWidth: 560, marginTop: 28, opacity: titleOpacity }}>
            We launch your listing across website, Google Ads, and mortuary partners.
          </div>
        </div>

        <div style={{ flex: 0, position: "relative" }}>
          {/* Main symbol — megaphone/broadcast */}
          <div style={{
            width: SYMBOL_SIZE, height: SYMBOL_SIZE, borderRadius: 48,
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: `scale(${iconScale * wave})`,
            boxShadow: `0 20px 60px -15px ${colors.primary}60`,
          }}>
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke={colors.background} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M8 10h8" />
              <path d="M8 14h4" />
            </svg>
          </div>

          {/* Chips stacked to the right */}
          <Sequence from={48}>
            <MarketingChip icon="🌐" label="Website" top={-10} />
          </Sequence>
          <Sequence from={66}>
            <MarketingChip icon="📣" label="Google Ads" top={80} />
          </Sequence>
          <Sequence from={82}>
            <MarketingChip icon="🏛️" label="Mortuaries" top={170} />
          </Sequence>

          {/* Reach counter below, centered under symbol */}
          <Sequence from={96}>
            <div style={{
              position: "absolute", top: 260, left: (SYMBOL_SIZE - 220) / 2,
              background: colors.white, borderRadius: 20, padding: "14px 22px",
              boxShadow: `0 16px 34px -14px ${colors.foreground}25`, width: 220,
            }}>
              <div style={{ fontFamily: fonts.display, fontSize: 34, color: colors.primary, lineHeight: 1 }}>{reach.toLocaleString()}+</div>
              <div style={{ fontFamily: fonts.body, fontSize: 18, color: colors.muted }}>buyers reached</div>
            </div>
          </Sequence>
        </div>
      </div>

      <Sequence from={40}>
        <BottomProgress step={4} />
      </Sequence>
    </AbsoluteFill>
  );
};

const MarketingChip: React.FC<{ icon: string; label: string; top: number }> = ({ icon, label, top }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16, stiffness: 180 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const x = interpolate(s, [0, 1], [24, 0]);

  return (
    <div style={{
      position: "absolute", top, left: 260,
      display: "flex", alignItems: "center", gap: 10,
      background: colors.white, borderRadius: 999, width: 220, padding: "12px 20px",
      boxShadow: `0 16px 30px -14px ${colors.foreground}24`,
      opacity, transform: `translateX(${x}px)`,
    }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ fontFamily: fonts.body, fontSize: 22, color: colors.foreground, fontWeight: 500 }}>{label}</span>
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
