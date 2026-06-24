import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { colors, fonts } from "../styles";
import { FloatingParticle, AnimatedRing, GradientOrb, DashedArc } from "../components/FloatingParticle";
import { SceneChrome } from "../components/SceneChrome";
import { EditorialList } from "../components/EditorialList";

const CARD_WIDTH = 420;

export const Scene6Buyer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);

  const cardSpring = spring({ frame: frame - 28, fps, config: { damping: 16, stiffness: 170 } });
  const cardScale = interpolate(cardSpring, [0, 1], [0.78, 1]);
  const cardOpacity = interpolate(cardSpring, [0, 1], [0, 1]);

  // Ticker that counts up to the guaranteed net figure
  const tickerSpring = spring({ frame: frame - 40, fps, config: { damping: 40, stiffness: 60 } });
  const amount = Math.round(interpolate(tickerSpring, [0, 1], [0, 4250]));

  // Lock snap
  const lockSpring = spring({ frame: frame - 78, fps, config: { damping: 10, stiffness: 220 } });
  const lockScale = interpolate(lockSpring, [0, 1], [0, 1]);
  const lockRotate = interpolate(lockSpring, [0, 1], [-25, 0]);

  const numSpring = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });

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

        {/* Visual column — guaranteed net "ticket" */}
        <div
          style={{
            flex: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 36,
            width: CARD_WIDTH,
          }}
        >
          {/* The net-offer ticket */}
          <div
            style={{
              width: CARD_WIDTH,
              padding: "32px 34px 30px",
              borderRadius: 28,
              background: colors.white,
              boxShadow: `0 30px 60px -20px ${colors.foreground}30`,
              transform: `scale(${cardScale})`,
              opacity: cardOpacity,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top accent bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 6,
                background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
              }}
            />

            <div
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                color: colors.muted,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              Guaranteed net to you
            </div>

            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 64,
                color: colors.foreground,
                lineHeight: 1,
                letterSpacing: -1,
              }}
            >
              {formatUSD(amount)}
            </div>

            {/* Fee breakdown row */}
            <div
              style={{
                marginTop: 22,
                paddingTop: 18,
                borderTop: `1px dashed ${colors.sand}`,
                display: "flex",
                justifyContent: "space-between",
                fontFamily: fonts.body,
                fontSize: 15,
                color: colors.muted,
              }}
            >
              <span>Net of every fee</span>
              <span style={{ color: colors.primary, fontWeight: 600 }}>$0 to you upfront</span>
            </div>

            {/* Lock seal */}
            <div
              style={{
                position: "absolute",
                bottom: 22,
                right: 22,
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${lockScale}) rotate(${lockRotate}deg)`,
                boxShadow: `0 12px 24px -10px ${colors.primary}80`,
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.white}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </div>
          </div>

          <EditorialList
            width={CARD_WIDTH}
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

