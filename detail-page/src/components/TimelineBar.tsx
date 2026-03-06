import type { CSSProperties } from "react";

interface TimelineBarProps {
  baseMean?: number;
  currentMean?: number;
  maxValue: number;
}

export function TimelineBar({ baseMean, currentMean, maxValue }: TimelineBarProps) {
  if (maxValue === 0 || (baseMean == null && currentMean == null)) {
    return null;
  }

  const baseWidth = baseMean != null ? (baseMean / maxValue) * 100 : 0;
  const currentWidth = currentMean != null ? (currentMean / maxValue) * 100 : 0;

  const isFaster = currentMean != null && baseMean != null && currentMean < baseMean;
  const isSlower = currentMean != null && baseMean != null && currentMean > baseMean;

  const containerStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    height: 24,
  };

  const baseBarStyle: CSSProperties = {
    position: "absolute",
    top: 2,
    left: 0,
    height: 6,
    width: `${baseWidth}%`,
    backgroundColor: "#cbd5e1",
    borderRadius: 3,
  };

  const prGroupStyle: CSSProperties = {
    position: "absolute",
    top: 14,
    left: 0,
    height: 6,
    display: "flex",
  };

  const commonWidth = Math.min(baseWidth, currentWidth);
  const diffWidth = Math.abs(baseWidth - currentWidth);

  return (
    <div style={containerStyle}>
      <div style={baseBarStyle} />
      <div style={prGroupStyle}>
        <div
          style={{
            width: `${commonWidth}%`,
            height: "100%",
            backgroundColor: isFaster ? "#10b981" : isSlower ? "#ef4444" : "#94a3b8",
            borderRadius: diffWidth > 0 ? "3px 0 0 3px" : "3px",
            minWidth: commonWidth > 0 ? 2 : 0,
          }}
        />
        {isFaster && diffWidth > 0.5 && (
          <div
            style={{
              width: `${diffWidth}%`,
              height: "100%",
              border: "1px dashed #10b981",
              backgroundColor: "#d1fae5",
              borderRadius: "0 3px 3px 0",
              borderLeft: "none",
              boxSizing: "border-box",
            }}
          />
        )}
        {isSlower && diffWidth > 0.5 && (
          <div
            style={{
              width: `${diffWidth}%`,
              height: "100%",
              background:
                "repeating-linear-gradient(45deg, #ef4444, #ef4444 4px, #fca5a5 4px, #fca5a5 8px)",
              borderRadius: "0 3px 3px 0",
            }}
          />
        )}
      </div>
    </div>
  );
}
