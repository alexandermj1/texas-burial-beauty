import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from "remotion";
import { colors, fonts } from "../styles";
import { FloatingParticle, AnimatedRing, GradientOrb, DashedArc } from "../components/FloatingParticle";
import { SceneChrome } from "../components/SceneChrome";

const CARD_WIDTH = 360;
const BADGE_WIDTH = 240;

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


      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 96, padding: "0 180px" }}>
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
            position: "relative",
            width: CARD_WIDTH + BADGE_WIDTH + 30,
            height: 380,
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

          {/* Stacked badges to the right of the ticket */}
          <Sequence from={62}>
            <FlowBadge
              label="Listed on consignment"
              top={28}
              left={CARD_WIDTH + 30}
              icon="list"
            />
          </Sequence>
          <Sequence from={86}>
            <FlowBadge
              label="When it sells, you're paid"
              top={120}
              left={CARD_WIDTH + 30}
              icon="check"
            />
          </Sequence>
          <Sequence from={106}>
            <FlowBadge
              label="Exactly your quoted net"
              top={212}
              left={CARD_WIDTH + 30}
              icon="dollar"
              accent
            />
          </Sequence>
        </div>
      </div>

      <Sequence from={40}>
        <BottomProgress step={6} />
      </Sequence>
    </AbsoluteFill>
  );
};

const FlowBadge: React.FC<{
  label: string;
  top: number;
  left: number;
  icon: "list" | "check" | "dollar";
  accent?: boolean;
}> = ({ label, top, left, icon, accent = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16, stiffness: 180 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const x = interpolate(s, [0, 1], [24, 0]);

  const iconStroke = accent ? colors.white : colors.primary;
  const iconBg = accent ? colors.primary : colors.primaryLight;

  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: colors.white,
        borderRadius: 999,
        width: BADGE_WIDTH,
        padding: "12px 18px",
        boxShadow: `0 15px 30px -14px ${colors.foreground}24`,
        opacity,
        transform: `translateX(${x}px)`,
        border: accent ? `1.5px solid ${colors.primary}30` : "none",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke={iconStroke}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {icon === "list" && (
            <>
              <line x1="8" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="20" y2="12" />
              <line x1="8" y1="18" x2="20" y2="18" />
              <circle cx="4" cy="6" r="1" />
              <circle cx="4" cy="12" r="1" />
              <circle cx="4" cy="18" r="1" />
            </>
          )}
          {icon === "check" && <polyline points="20 6 9 17 4 12" />}
          {icon === "dollar" && (
            <>
              <line x1="12" y1="2" x2="12" y2="22" />
              <path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </>
          )}
        </svg>
      </div>
      <span
        style={{
          fontFamily: fonts.body,
          fontSize: 18,
          color: colors.foreground,
          fontWeight: accent ? 600 : 500,
          lineHeight: 1.15,
        }}
      >
        {label}
      </span>
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
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i < step ? colors.primary : colors.sand }} />
      ))}
      <span style={{ fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginLeft: 8 }}>{step}/8</span>
    </div>
  );
};
