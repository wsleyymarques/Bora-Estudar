// packages/tutorial-video/src/components/SuccessStep.tsx
import React from "react";
import { useCurrentFrame, interpolate, spring } from "remotion";
import "./StepStyles.css";

interface SuccessStepProps {
  title: string;
  content: string;
  stepIndex: number;
  totalSteps: number;
  durationInFrames: number;
}

export const SuccessStep: React.FC<SuccessStepProps> = ({
  title,
  content,
  stepIndex,
  totalSteps,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const progress = frame / durationInFrames;
  
  // Use spring for a nice pop-in animation
  const iconScale = spring({
    frame,
    fps: 30,
    config: { damping: 15, stiffness: 150 },
    startValue: 0,
    endValue: 1,
    delay: durationInFrames * 0.1,
  });
  
  const headerProgress = interpolate(progress, [0, 0.3], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  const contentProgress = interpolate(progress, [0.2, 0.5], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  const ctaProgress = interpolate(progress, [0.4, 0.7], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });

  const headerStyle: React.CSSProperties = {
    opacity: headerProgress,
    transform: `translateY(${interpolate(headerProgress, [0, 1], [20, 0])}px)`,
  };
  
  const contentStyle: React.CSSProperties = {
    opacity: contentProgress,
    transform: `translateY(${interpolate(contentProgress, [0, 1], [20, 0])}px)`,
  };
  
  const ctaStyle: React.CSSProperties = {
    opacity: ctaProgress,
    transform: `translateY(${interpolate(ctaProgress, [0, 1], [20, 0])}px)`,
  };

  return (
    <div className="step-container">
      <div className="step-header" style={headerStyle}>
        <div className="step-number">Concluído!</div>
        <h1 className="step-title">{title}</h1>
      </div>

      <div className="step-progress" style={{ opacity: headerProgress }}>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: "100%" }}
          />
        </div>
        <div className="progress-text">100% completo</div>
      </div>

      <div className="step-body">
        <div style={{ 
          transform: `scale(${iconScale})`,
          transformOrigin: "center",
        }} className="success-icon">
          🎉
        </div>

        <div className="step-content" style={contentStyle} style={{ whiteSpace: "pre-line", textAlign: "center" }}>
          {content}
        </div>

        <div className="cta-button" style={ctaStyle}>
          Ver no Dashboard →
        </div>
      </div>
    </div>
  );
};