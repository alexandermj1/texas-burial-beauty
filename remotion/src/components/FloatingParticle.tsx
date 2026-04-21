import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { colors } from "../styles";

export const FloatingParticle: React.FC<{
  x: number;
  y: number;
  size: number;
  speed?: number;
  color?: string;
}> = ({ x, y, size, speed = 1, color = colors.primaryLight }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const drift = Math.sin((frame * speed) / fps) * 15;
  const drift2 = Math.cos((frame * speed * 0.7) / fps) * 10;
  const opacity = 0.3 + Math.sin((frame * 0.5) / fps) * 0.15;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + drift,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        opacity,
        transform: `translateX(${drift2}px)`,
      }}
    />
  );
};

/** Animated ring that slowly rotates and pulses */
export const AnimatedRing: React.FC<{
  x: number;
  y: number;
  size: number;
  color?: string;
  strokeWidth?: number;
  speed?: number;
}> = ({ x, y, size, color = colors.primary + "18", strokeWidth = 2, speed = 1 }) => {
  const frame = useCurrentFrame();
  const rotation = (frame * speed * 0.3);
  const scale = 1 + Math.sin(frame * 0.02 * speed) * 0.06;
  const opacity = 0.15 + Math.sin(frame * 0.03) * 0.08;

  return (
    <div style={{
      position: "absolute", left: x - size / 2, top: y - size / 2,
      width: size, height: size, borderRadius: "50%",
      border: `${strokeWidth}px solid ${color}`,
      transform: `rotate(${rotation}deg) scale(${scale})`,
      opacity,
    }} />
  );
};

/** Subtle dashed arc decoration */
export const DashedArc: React.FC<{
  x: number;
  y: number;
  size: number;
  color?: string;
  speed?: number;
}> = ({ x, y, size, color = colors.sand, speed = 0.5 }) => {
  const frame = useCurrentFrame();
  const rotation = frame * speed * 0.5;
  const opacity = 0.12 + Math.sin(frame * 0.025) * 0.05;

  return (
    <div style={{
      position: "absolute", left: x - size / 2, top: y - size / 2,
      width: size, height: size, borderRadius: "50%",
      border: `1.5px dashed ${color}`,
      transform: `rotate(${rotation}deg)`,
      opacity,
    }} />
  );
};

/** Gradient orb that drifts slowly */
export const GradientOrb: React.FC<{
  x: number;
  y: number;
  size: number;
  color1?: string;
  color2?: string;
  speed?: number;
}> = ({ x, y, size, color1 = colors.primaryLight, color2 = colors.accentLight, speed = 1 }) => {
  const frame = useCurrentFrame();
  const driftX = Math.sin(frame * 0.015 * speed) * 20;
  const driftY = Math.cos(frame * 0.012 * speed) * 15;
  const opacity = 0.25 + Math.sin(frame * 0.02) * 0.1;
  const scale = 1 + Math.sin(frame * 0.018 * speed) * 0.08;

  return (
    <div style={{
      position: "absolute",
      left: x - size / 2 + driftX,
      top: y - size / 2 + driftY,
      width: size, height: size,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${color1}, ${color2}00)`,
      opacity,
      transform: `scale(${scale})`,
    }} />
  );
};
