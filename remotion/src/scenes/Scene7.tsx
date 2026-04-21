import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from "remotion";
import { colors, fonts } from "../styles";
import { FloatingParticle, AnimatedRing, GradientOrb, DashedArc } from "../components/FloatingParticle";

const SYMBOL_SIZE = 240;
const BOX_HEIGHT = 48;

export const Scene7Processing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);

  const iconSpring = spring({ frame: frame - 30, fps, config: { damping: 16, stiffness: 180 } });
  const iconScale = interpolate(iconSpring, [0, 1], [0.72, 1]);
  const pulse = Math.sin(frame / 11) * 0.03 + 1;

  const progress = interpolate(frame - 44, [0, 78], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const progressBarOpacity = interpolate(frame - 44, [0, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const numSpring = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });

  // White boxes aligned to symbol: top, center, bottom
  const boxTop1 = 0;
  const boxTop3 = SYMBOL_SIZE - BOX_HEIGHT;
  const boxTop2 = (boxTop1 + boxTop3) / 2;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${colors.sandLight} 0%, ${colors.background} 50%, ${colors.primaryLight} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FloatingParticle x={180} y={250} size={60} speed={0.9} color={colors.primaryLight} />
      <FloatingParticle x={1550} y={600} size={75} speed={0.7} color={colors.accentLight} />
      <AnimatedRing x={1600} y={180} size={280} speed={0.5} />
      <GradientOrb x={120} y={600} size={200} />
      <DashedArc x={950} y={750} size={220} speed={0.4} />

      <div style={{ position: "absolute", left: 100, top: 80, transform: `scale(${interpolate(numSpring, [0, 1], [0, 1])})`, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: colors.primary, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.display, fontSize: 28, color: colors.background }}>7</div>
        <span style={{ fontFamily: fonts.body, fontSize: 20, color: colors.muted, letterSpacing: 2, textTransform: "uppercase" }}>Step Seven</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 120, padding: "0 180px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: fonts.body, fontSize: 24, color: colors.accent, letterSpacing: 3, textTransform: "uppercase", fontWeight: 500, opacity: titleOpacity, marginBottom: 20 }}>
            Days 60–80
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 92, color: colors.foreground, lineHeight: 1.05, opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            Processing &{"\n"}
            <span style={{ fontStyle: "italic", color: colors.primary }}>Logistics</span>
          </div>
          <div style={{ fontFamily: fonts.body, fontSize: 26, color: colors.muted, lineHeight: 1.6, maxWidth: 560, marginTop: 28, opacity: titleOpacity }}>
            We execute transfer agreements and coordinate directly with the cemetery office.
          </div>
        </div>

        <div style={{ flex: 0, position: "relative" }}>
          {/* Progress bar above symbol — NO Sequence wrapper to avoid AbsoluteFill overlay */}
          <div style={{ marginBottom: 18, width: SYMBOL_SIZE, opacity: progressBarOpacity }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: fonts.body, fontSize: 17, color: colors.muted }}>Paperwork</span>
              <span style={{ fontFamily: fonts.body, fontSize: 17, color: colors.primary, fontWeight: 600 }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: colors.sand, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, borderRadius: 999, background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})` }} />
            </div>
          </div>

          {/* Main symbol */}
          <div style={{
            width: SYMBOL_SIZE, height: SYMBOL_SIZE, borderRadius: 38,
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: `scale(${iconScale * pulse})`,
            boxShadow: `0 20px 60px -15px ${colors.primary}60`,
            position: "relative",
          }}>
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke={colors.background} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="m9 15 2 2 4-4" />
            </svg>
          </div>

          {/* Doc stamps to the right — positioned relative to symbol top */}
          <Sequence from={56}>
            <DocStamp label="Transfer" top={boxTop1} />
          </Sequence>
          <Sequence from={74}>
            <DocStamp label="Cemetery" top={boxTop2} />
          </Sequence>
          <Sequence from={92}>
            <DocStamp label="Records" top={boxTop3} />
          </Sequence>
        </div>
      </div>

      <Sequence from={40}>
        <BottomProgress step={7} />
      </Sequence>
    </AbsoluteFill>
  );
};

const DocStamp: React.FC<{ label: string; top: number }> = ({ label, top }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16, stiffness: 180 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const x = interpolate(s, [0, 1], [24, 0]);

  // Offset top to account for the progress bar above the symbol (approx 54px: 36px bar + 18px margin)
  const adjustedTop = top + 54;

  return (
    <div style={{
      position: "absolute", top: adjustedTop, left: 260,
      display: "flex", alignItems: "center", gap: 10,
      background: colors.white, borderRadius: 999, width: 200, padding: "11px 18px",
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
