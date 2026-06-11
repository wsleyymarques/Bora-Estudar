// packages/tutorial-video/src/components/SelectStep.tsx
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import "./StepStyles.css";

interface Option {
  id: string;
  label: string;
  icon?: string;
  description?: string;
}

interface SelectStepProps {
  title: string;
  content: string;
  options: Option[];
  isMultiSelect: boolean;
  stepIndex: number;
  totalSteps: number;
  durationInFrames: number;
  selectedValues?: string[];
}

export const SelectStep: React.FC<SelectStepProps> = ({
  title,
  content,
  options,
  isMultiSelect,
  stepIndex,
  totalSteps,
  durationInFrames,
  selectedValues = [],
}) => {
  const frame = useCurrentFrame();
  const progress = frame / durationInFrames;
  
  const headerProgress = interpolate(progress, [0, 0.25], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  const optionsProgress = interpolate(progress, [0.15, 0.45], [0, 1], { 
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
  
  const optionsStyle: React.CSSProperties = {
    opacity: optionsProgress,
    transform: `translateY(${interpolate(optionsProgress, [0, 1], [20, 0])}px)`,
  };
  
  const ctaStyle: React.CSSProperties = {
    opacity: ctaProgress,
    transform: `translateY(${interpolate(ctaProgress, [0, 1], [20, 0])}px)`,
  };

  const isSelected = (optionId: string) => selectedValues.includes(optionId);

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
        <div className="step-content" style={headerStyle}>
          {content}
        </div>

        <div className="option-grid" style={optionsStyle} role="listbox" aria-multiselectable={isMultiSelect}>
          {options.map((option, index) => {
            const delay = index * 0.05;
            const itemProgress = interpolate(progress, [0.15 + delay, 0.4 + delay], [0, 1], { 
              extrapolateLeft: "clamp", 
              extrapolateRight: "clamp" 
            });
            const itemStyle: React.CSSProperties = {
              opacity: itemProgress,
              transform: `translateY(${interpolate(itemProgress, [0, 1], [30, 0])}px)`,
            };

            return (
              <div
                key={option.id}
                className={`option-card ${isSelected(option.id) ? "selected" : ""}`}
                style={itemStyle}
                role="option"
                aria-selected={isSelected(option.id)}
              >
                {option.icon && <span className="option-icon">{option.icon}</span>}
                <span className="option-label">{option.label}</span>
                {option.description && (
                  <span className="option-description">{option.description}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="cta-button" style={ctaStyle} disabled={selectedValues.length === 0}>
          {isMultiSelect 
            ? `${selectedValues.length} selecionado(s) — Continuar →` 
            : "Selecionar →"}
        </div>
      </div>
    </div>
  );
};