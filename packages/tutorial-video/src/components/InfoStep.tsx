// packages/tutorial-video/src/components/InfoStep.tsx
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import "./StepStyles.css";

interface InfoStepProps {
  title: string;
  content: string;
  stepIndex: number;
  totalSteps: number;
  durationInFrames: number;
}

export const InfoStep: React.FC<InfoStepProps> = ({
  title,
  content,
  stepIndex,
  totalSteps,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const progress = frame / durationInFrames;
  
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
        <div className="step-number">Passo {stepIndex + 1} de {totalSteps}</div>
        <h1 className="step-title">{title}</h1>
      </div>

      <div className="step-progress" style={{ opacity: headerProgress }}>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
        <div className="progress-text">
          {Math.round(((stepIndex + 1) / totalSteps) * 100)}% completo
        </div>
      </div>

      <div className="step-body">
        <div className="step-content" style={contentStyle}>
          {content}
        </div>

        <div className="cta-button" style={ctaStyle}>
          Continuar →
        </div>
      </div>
    </div>
  );
};