import { useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from "remotion";
import { colors, fonts } from "../styles";

export type EditorialItem = {
  label: string;
  value?: string | number;
  from: number;
};

type Props = {
  items: EditorialItem[];
  width: number;
  align?: "left" | "right";
};

/**
 * Vogue-style editorial credits list — thin hairline rules, small caps numerals,
 * label and (optional) value separated by a leader rule. Rendered as a flow
 * column (no absolute positioning) so it can never overlap headline copy.
 */
export const EditorialList: React.FC<Props> = ({ items, width, align = "left" }) => {
  return (
    <div style={{ width, display: "flex", flexDirection: "column", gap: 14 }}>
      {items.map((item, i) => (
        <Sequence key={i} from={item.from} layout="none">
          <EditorialRow index={i + 1} label={item.label} value={item.value} align={align} />
        </Sequence>
      ))}
    </div>
  );
};

const EditorialRow: React.FC<{
  index: number;
  label: string;
  value?: string | number;
  align: "left" | "right";
}> = ({ index, label, value, align }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 22, stiffness: 180 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [10, 0]);

  const num = `N° 0${index}`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 16,
        opacity,
        transform: `translateY(${y}px)`,
        flexDirection: align === "right" ? "row-reverse" : "row",
        textAlign: align,
      }}
    >
      <span
        style={{
          fontFamily: fonts.body,
          fontSize: 12,
          color: colors.muted,
          letterSpacing: 2,
          textTransform: "uppercase",
          minWidth: 38,
        }}
      >
        {num}
      </span>
      <span
        style={{
          fontFamily: fonts.display,
          fontSize: 22,
          color: colors.foreground,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 1,
          background: colors.foreground + "26",
          transform: "translateY(-4px)",
        }}
      />
      {value !== undefined && (
        <span
          style={{
            fontFamily: fonts.display,
            fontStyle: "italic",
            fontSize: 26,
            color: colors.primary,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
};
