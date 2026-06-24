import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { colors, fonts } from "../styles";
import { FloatingParticle, AnimatedRing, GradientOrb, DashedArc } from "../components/FloatingParticle";
import { SceneChrome } from "../components/SceneChrome";
import { EditorialList } from "../components/EditorialList";

const SYMBOL_SIZE = 240;

export const Scene2Evaluation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 14, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [45, 0]);

  const visualSpring = spring({ frame: frame - 28, fps, config: { damping: 16, stiffness: 200 } });
  const visualScale = interpolate(visualSpring, [0, 1], [0.7, 1]);
  const pulse = Math.sin(frame / 10) * 0.03 + 1;
  const numSpring = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${colors.sandLight} 0%, ${colors.background} 50%, ${colors.primaryLight} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FloatingParticle x={110} y={310} size={90} speed={0.7} color={colors.accentLight} />
      <FloatingParticle x={1560} y={180} size={70} speed={1.1} color={colors.primaryLight} />
      <AnimatedRing x={1600} y={250} size={300} speed={0.5} />
      <GradientOrb x={180} y={650} size={180} />
      <DashedArc x={900} y={780} size={200} speed={0.3} />

      <SceneChrome step={2} chapter="Evaluation" kicker="Free Valuation" />


      <div style={{ display: "flex", flexDirection: "row-reverse", alignItems: "center", gap: 140, padding: "0 200px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: fonts.body, fontSize: 24, color: colors.accent, letterSpacing: 3, textTransform: "uppercase", fontWeight: 500, opacity: titleOpacity, marginBottom: 20 }}>
            Free Valuation
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 96, color: colors.foreground, lineHeight: 1.05, opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            Property{"\n"}
            <span style={{ fontStyle: "italic", color: colors.primary }}>Evaluation</span>
          </div>
          <div style={{ fontFamily: fonts.body, fontSize: 26, color: colors.muted, lineHeight: 1.6, maxWidth: 560, marginTop: 28, opacity: titleOpacity }}>
            We research comparables, verify records, and issue your formal quote.
          </div>
        </div>

        <div style={{ flex: 0, position: "relative" }}>
          {/* Main symbol */}
          <div style={{
            width: SYMBOL_SIZE, height: SYMBOL_SIZE, borderRadius: 48,
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: `scale(${visualScale * pulse})`,
            boxShadow: `0 20px 60px -15px ${colors.primary}60`,
          }}>
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke={colors.background} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3h6" />
              <path d="M10 7h4" />
              <rect x="5" y="3" width="14" height="18" rx="2" />
              <path d="m9 14 2 2 4-4" />
            </svg>
          </div>

          {/* Tags stacked to the right, evenly spaced */}
          <Sequence from={52}>
            <EvalTag text="Comparables" icon="📊" top={-10} />
          </Sequence>
          <Sequence from={74}>
            <EvalTag text="Records" icon="📁" top={80} />
          </Sequence>
          <Sequence from={96}>
            <EvalTag text="Quote Ready" icon="✅" top={170} />
          </Sequence>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const EvalTag: React.FC<{ text: string; icon: string; top: number }> = ({ text, icon, top }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16, stiffness: 200 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const x = interpolate(s, [0, 1], [26, 0]);

  return (
    <div style={{
      position: "absolute", top, left: 260,
      display: "flex", alignItems: "center", gap: 12,
      background: colors.white, padding: "12px 20px", borderRadius: 999,
      boxShadow: `0 16px 36px -16px ${colors.foreground}24`,
      opacity, transform: `translateX(${x}px)`,
      width: 220,
    }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ fontFamily: fonts.body, fontSize: 22, color: colors.foreground, fontWeight: 500 }}>{text}</span>
    </div>
  );
};
