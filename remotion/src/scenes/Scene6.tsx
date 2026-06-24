import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { colors, fonts } from "../styles";
import { FloatingParticle, AnimatedRing, GradientOrb, DashedArc } from "../components/FloatingParticle";
import { SceneChrome } from "../components/SceneChrome";
import { EditorialList } from "../components/EditorialList";

const LEDGER_WIDTH = 520;

export const Scene6Buyer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);

  const ledgerSpring = spring({ frame: frame - 28, fps, config: { damping: 200 } });
  const ledgerOpacity = interpolate(ledgerSpring, [0, 1], [0, 1]);
  const ledgerY = interpolate(ledgerSpring, [0, 1], [26, 0]);
  const ruleReveal = interpolate(frame, [34, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Ticker that counts up to the guaranteed net figure
  const tickerSpring = spring({ frame: frame - 40, fps, config: { damping: 40, stiffness: 60 } });
  const amount = Math.round(interpolate(tickerSpring, [0, 1], [0, 4250]));

  // Lock snap
  const lockSpring = spring({ frame: frame - 78, fps, config: { damping: 10, stiffness: 220 } });
  const lockScale = interpolate(lockSpring, [0, 1], [0, 1]);
  const lockRotate = interpolate(lockSpring, [0, 1], [-25, 0]);

  const formatUSD = (n: number) =>
    "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

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
      <DashedArc x={1100} y={760} size={200} speed={0.3} />

      <SceneChrome step={6} chapter="The Net" kicker="Your Guaranteed Number" />


      <div style={{ display: "flex", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 120, padding: "0 200px" }}>
        {/* Text column */}
        <div style={{ flex: "0 0 620px", maxWidth: 620 }}>
          <div
            style={{
              fontFamily: fonts.body,
              fontSize: 24,
              color: colors.accent,
              letterSpacing: 3,
              textTransform: "uppercase",
              fontWeight: 500,
              opacity: titleOpacity,
              marginBottom: 20,
            }}
          >
            Your Guaranteed Net
          </div>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 92,
              color: colors.foreground,
              lineHeight: 1.05,
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
            }}
          >
            One number,{"\n"}
            <span style={{ fontStyle: "italic", color: colors.primary }}>locked in.</span>
          </div>
          <div
            style={{
              fontFamily: fonts.body,
              fontSize: 24,
              color: colors.muted,
              lineHeight: 1.55,
              maxWidth: 560,
              marginTop: 28,
              opacity: titleOpacity,
            }}
          >
            We quote you a guaranteed net — your number after every fee. We list on
            consignment, and the day it sells, that's exactly what you receive.
          </div>
        </div>

        {/* Visual column — guaranteed net editorial ledger */}
        <div
          style={{
            flex: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 36,
            width: LEDGER_WIDTH,
          }}
        >
          {/* Vogue-style net-offer ledger: no floating white card/badge overlay */}
          <div
            style={{
              width: LEDGER_WIDTH,
              padding: "28px 0 34px",
              transform: `translateY(${ledgerY}px)`,
              opacity: ledgerOpacity,
              position: "relative",
            }}
          >
            <div
              style={{
                width: `${ruleReveal * 100}%`,
                height: 1,
                background: colors.foreground,
                opacity: 0.55,
                marginBottom: 24,
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 28 }}>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 15,
                  color: colors.accent,
                  letterSpacing: 3.5,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  lineHeight: 1.35,
                }}
              >
                Guaranteed
                <br />
                net to you
              </div>

              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 76,
                  color: colors.foreground,
                  lineHeight: 0.92,
                  textAlign: "right",
                }}
              >
                {formatUSD(amount)}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                marginTop: 26,
                paddingTop: 20,
                borderTop: `1px solid ${colors.foreground}26`,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  border: `1px solid ${colors.primary}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${lockScale}) rotate(${lockRotate}deg)`,
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              </div>
              <div style={{ fontFamily: fonts.body, fontSize: 16, color: colors.muted, lineHeight: 1.45 }}>
                <span style={{ color: colors.primary, fontWeight: 700 }}>$0 upfront</span>
                <br />
                net of every cemetery and broker fee
              </div>
            </div>

            <div
              style={{
                width: `${ruleReveal * 100}%`,
                height: 1,
                background: colors.foreground,
                opacity: 0.25,
                marginTop: 28,
              }}
            />
          </div>

          <EditorialList
            width={LEDGER_WIDTH}
            items={[
              { label: "Listed on consignment", from: 62 },
              { label: "When it sells, you're paid", from: 86 },
              { label: "Exactly your quoted net", from: 106 },
            ]}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

