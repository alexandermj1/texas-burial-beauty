import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { colors, fonts } from "../styles";
import { FloatingParticle, AnimatedRing, GradientOrb, DashedArc } from "../components/FloatingParticle";
import { SceneChrome } from "../components/SceneChrome";
import { EditorialList } from "../components/EditorialList";

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

      <SceneChrome step={7} chapter="Logistics" kicker="Processing & Paperwork" />


      <div style={{ display: "flex", alignItems: "center", gap: 120, padding: "0 180px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: fonts.body, fontSize: 24, color: colors.accent, letterSpacing: 3, textTransform: "uppercase", fontWeight: 500, opacity: titleOpacity, marginBottom: 20 }}>
            Processing & Logistics
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 92, color: colors.foreground, lineHeight: 1.05, opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            Processing &{"\n"}
            <span style={{ fontStyle: "italic", color: colors.primary }}>Logistics</span>
          </div>
          <div style={{ fontFamily: fonts.body, fontSize: 26, color: colors.muted, lineHeight: 1.6, maxWidth: 560, marginTop: 28, opacity: titleOpacity }}>
            We execute transfer agreements and coordinate directly with the cemetery office.
          </div>
        </div>

        <div style={{ flex: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
          {/* Progress bar above symbol */}
          <div style={{ width: SYMBOL_SIZE, opacity: progressBarOpacity }}>
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
          }}>
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke={colors.background} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="m9 15 2 2 4-4" />
            </svg>
          </div>

          <EditorialList
            width={SYMBOL_SIZE + 120}
            items={[
              { label: "Transfer", from: 56 },
              { label: "Cemetery", from: 74 },
              { label: "Records", from: 92 },
            ]}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

