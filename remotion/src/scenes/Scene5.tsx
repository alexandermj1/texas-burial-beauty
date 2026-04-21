import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from "remotion";
import { colors, fonts } from "../styles";
import { FloatingParticle, AnimatedRing, GradientOrb, DashedArc } from "../components/FloatingParticle";

const SYMBOL_SIZE = 240;

export const Scene5ActiveSales: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);

  const iconSpring = spring({ frame: frame - 30, fps, config: { damping: 16, stiffness: 180 } });
  const iconScale = interpolate(iconSpring, [0, 1], [0.72, 1]);
  const pulse = Math.sin(frame / 10) * 0.03 + 1;

  const numSpring = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });

  // Ticker values
  const tickerSpring = spring({ frame: frame - 60, fps, config: { damping: 40, stiffness: 60 } });
  const showings = Math.round(interpolate(tickerSpring, [0, 1], [0, 12]));
  const inquiries = Math.round(interpolate(tickerSpring, [0, 1], [0, 30]));
  const qualified = Math.round(interpolate(tickerSpring, [0, 1], [0, 7]));

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${colors.background} 0%, ${colors.sandLight} 40%, ${colors.primaryLight} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FloatingParticle x={150} y={200} size={65} speed={0.9} color={colors.primaryLight} />
      <FloatingParticle x={1650} y={150} size={80} speed={0.7} color={colors.accentLight} />
      <AnimatedRing x={1550} y={230} size={260} speed={0.5} />
      <GradientOrb x={200} y={680} size={190} />
      <DashedArc x={950} y={760} size={210} speed={0.4} />

      <div style={{ position: "absolute", left: 100, top: 80, transform: `scale(${interpolate(numSpring, [0, 1], [0, 1])})`, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: colors.primary, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.display, fontSize: 28, color: colors.background }}>5</div>
        <span style={{ fontFamily: fonts.body, fontSize: 20, color: colors.muted, letterSpacing: 2, textTransform: "uppercase" }}>Step Five</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 120, padding: "0 180px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: fonts.body, fontSize: 24, color: colors.accent, letterSpacing: 3, textTransform: "uppercase", fontWeight: 500, opacity: titleOpacity, marginBottom: 20 }}>
            Days 14–60
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 96, color: colors.foreground, lineHeight: 1.05, opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            Active{"\n"}
            <span style={{ fontStyle: "italic", color: colors.primary }}>Sales</span>
          </div>
          <div style={{ fontFamily: fonts.body, fontSize: 26, color: colors.muted, lineHeight: 1.6, maxWidth: 560, marginTop: 28, opacity: titleOpacity }}>
            Our team hunts for buyers and leads in-person cemetery showings.
          </div>
        </div>

        <div style={{ flex: 0, position: "relative" }}>
          {/* Main symbol — search */}
          <div style={{
            width: SYMBOL_SIZE, height: SYMBOL_SIZE, borderRadius: "50%",
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: `scale(${iconScale * pulse})`,
            boxShadow: `0 20px 60px -15px ${colors.primary}60`,
          }}>
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke={colors.background} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>

          {/* Count bubbles to the right */}
          <Sequence from={52}>
            <CountBubble label="Inquiries" value={inquiries} top={-10} ticker />
          </Sequence>
          <Sequence from={68}>
            <CountBubble label="Showings" value={showings} top={80} ticker />
          </Sequence>
          <Sequence from={84}>
            <CountBubble label="Qualified" value={qualified} top={170} ticker />
          </Sequence>
        </div>
      </div>

      <Sequence from={40}>
        <BottomProgress step={5} />
      </Sequence>
    </AbsoluteFill>
  );
};

const CountBubble: React.FC<{ label: string; value: number; top: number; ticker?: boolean }> = ({ label, value, top, ticker = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 18, stiffness: 180 } });
  const tickerSpring = spring({ frame, fps, config: { damping: 32, stiffness: 70 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const x = interpolate(s, [0, 1], [24, 0]);
  const displayValue = ticker ? Math.round(interpolate(tickerSpring, [0, 1], [0, value])) : value;

  return (
    <div style={{
      position: "absolute", top, left: 260,
      background: colors.white, borderRadius: 999, width: 200, padding: "10px 20px",
      boxShadow: `0 16px 34px -14px ${colors.foreground}24`,
      opacity, transform: `translateX(${x}px)`,
    }}>
      <div style={{ fontFamily: fonts.display, fontSize: 34, color: colors.primary, lineHeight: 1 }}>{displayValue}</div>
      <div style={{ fontFamily: fonts.body, fontSize: 18, color: colors.muted }}>{label}</div>
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
