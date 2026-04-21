import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from "remotion";
import { colors, fonts } from "../styles";
import { FloatingParticle, AnimatedRing, GradientOrb } from "../components/FloatingParticle";

const SYMBOL_SIZE = 240;

export const Scene3Agreement: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);

  const docSpring = spring({ frame: frame - 30, fps, config: { damping: 16, stiffness: 200 } });
  const docScale = interpolate(docSpring, [0, 1], [0.7, 1]);

  const sigProgress = interpolate(frame - 55, [0, 40], [0, 152], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const stampSpring = spring({ frame: frame - 80, fps, config: { damping: 12, stiffness: 300 } });
  const stampScale = interpolate(stampSpring, [0, 1], [3, 1]);
  const stampOpacity = interpolate(frame - 80, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const numSpring = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${colors.background} 0%, ${colors.primaryLight} 40%, ${colors.sandLight} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FloatingParticle x={200} y={150} size={70} speed={0.9} color={colors.primaryLight} />
      <FloatingParticle x={1600} y={500} size={80} speed={0.7} color={colors.accentLight} />
      <AnimatedRing x={1650} y={200} size={300} speed={0.6} />
      <GradientOrb x={150} y={700} size={200} />
      <AnimatedRing x={900} y={800} size={180} color={colors.sand + "15"} speed={0.4} />

      <div style={{ position: "absolute", left: 100, top: 80, transform: `scale(${interpolate(numSpring, [0, 1], [0, 1])})`, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: colors.primary, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.display, fontSize: 28, color: colors.background }}>3</div>
        <span style={{ fontFamily: fonts.body, fontSize: 20, color: colors.muted, letterSpacing: 2, textTransform: "uppercase" }}>Step Three</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 120, padding: "0 180px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: fonts.body, fontSize: 24, color: colors.accent, letterSpacing: 3, textTransform: "uppercase", fontWeight: 500, opacity: titleOpacity, marginBottom: 20 }}>
            Days 3–5
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 96, color: colors.foreground, lineHeight: 1.05, opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            Quote{"\n"}
            <span style={{ fontStyle: "italic", color: colors.primary }}>Accepted</span>
          </div>
          <div style={{ fontFamily: fonts.body, fontSize: 26, color: colors.muted, lineHeight: 1.6, maxWidth: 560, marginTop: 28, opacity: titleOpacity }}>
            You accept our quote and we begin representing your property.
          </div>
        </div>

        <div style={{ flex: 0, position: "relative", marginTop: -50 }}>
          {/* Contract document */}
          <Sequence from={30}>
            <div
              style={{
                width: SYMBOL_SIZE,
                height: SYMBOL_SIZE,
                borderRadius: 42,
                background: colors.white,
                boxShadow: `0 26px 60px -26px ${colors.foreground}2C`,
                padding: "30px 26px",
                display: "flex",
                flexDirection: "column",
                transform: `scale(${docScale})`,
              }}
            >
              <div style={{ fontFamily: fonts.body, fontSize: 16, color: colors.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>
                Purchase Agreement
              </div>
              <div style={{ height: 2, borderRadius: 2, background: colors.sand, marginTop: 16 }} />
              <div style={{ height: 2, borderRadius: 2, background: colors.sand, marginTop: 14 }} />
              <div style={{ height: 2, borderRadius: 2, background: colors.sand, marginTop: 14, width: "78%" }} />
              <div style={{ marginTop: 38, fontFamily: fonts.body, fontSize: 17, color: colors.muted }}>Seller Signature</div>
              <div style={{ marginTop: 12, width: 152, height: 4, borderRadius: 2, background: colors.sand, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${sigProgress}px`, background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`, borderRadius: 2 }} />
              </div>
            </div>
          </Sequence>

          {/* AGREED stamp */}
          <Sequence from={80}>
            <div
              style={{
                position: "absolute",
                right: -40,
                bottom: -40,
                width: 130,
                height: 130,
                borderRadius: "50%",
                border: `5px solid ${colors.primary}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${stampScale}) rotate(-15deg)`,
                opacity: stampOpacity,
                background: colors.white,
              }}
            >
              <div style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary, textAlign: "center", lineHeight: 1.05 }}>
                AGREED
              </div>
            </div>
          </Sequence>
        </div>
      </div>

      <Sequence from={40}>
        <BottomProgress step={3} />
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
      {Array.from({ length: 8 }, (_, i) => (<div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i < step ? colors.primary : colors.sand }} />))}
      <span style={{ fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginLeft: 8 }}>{step}/8</span>
    </div>
  );
};
