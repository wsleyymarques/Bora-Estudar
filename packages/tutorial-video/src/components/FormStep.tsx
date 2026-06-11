// packages/tutorial-video/src/components/FormStep.tsx
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import "./StepStyles.css";

interface FormField {
  name: string;
  type: "text" | "number" | "date" | "select" | "multi-select" | "textarea" | "checkbox";
  label: string;
  placeholder?: string;
  default?: unknown;
  min?: number;
  max?: number;
  step?: number;
  help?: string;
  options?: { id: string; label: string; value: unknown }[];
  validation?: { required?: boolean };
}

interface FormStepProps {
  title: string;
  content: string;
  fields: FormField[];
  stepIndex: number;
  totalSteps: number;
  durationInFrames: number;
  formData?: Record<string, unknown>;
}

export const FormStep: React.FC<FormStepProps> = ({
  title,
  content,
  fields,
  stepIndex,
  totalSteps,
  durationInFrames,
  formData = {},
}) => {
  const frame = useCurrentFrame();
  const progress = frame / durationInFrames;
  
  const headerProgress = interpolate(progress, [0, 0.25], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  const fieldsProgress = interpolate(progress, [0.15, 0.5], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  const ctaProgress = interpolate(progress, [0.45, 0.75], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });

  const headerStyle: React.CSSProperties = {
    opacity: headerProgress,
    transform: `translateY(${interpolate(headerProgress, [0, 1], [20, 0])}px)`,
  };
  
  const fieldsStyle: React.CSSProperties = {
    opacity: fieldsProgress,
    transform: `translateY(${interpolate(fieldsProgress, [0, 1], [20, 0])}px)`,
  };
  
  const ctaStyle: React.CSSProperties = {
    opacity: ctaProgress,
    transform: `translateY(${interpolate(ctaProgress, [0, 1], [20, 0])}px)`,
  };

  const isFieldFilled = (field: FormField) => {
    const value = formData[field.name];
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  };

  const allRequiredFilled = fields
    .filter((f) => f.validation?.required)
    .every((f) => isFieldFilled(f));

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

        <div className="step-form" style={fieldsStyle} style={{ width: "100%", maxWidth: "600px" }}>
          {fields.map((field, index) => {
            const delay = index * 0.05;
            const itemProgress = interpolate(progress, [0.15 + delay, 0.45 + delay], [0, 1], { 
              extrapolateLeft: "clamp", 
              extrapolateRight: "clamp" 
            });
            const itemStyle: React.CSSProperties = {
              opacity: itemProgress,
              transform: `translateY(${interpolate(itemProgress, [0, 1], [20, 0])}px)`,
            };

            const isFilled = isFieldFilled(field);
            const value = formData[field.name] as string | number | string[] | undefined;

            return (
              <div key={field.name} className="form-field" style={itemStyle}>
                <label className="form-label" htmlFor={field.name}>
                  {field.label}
                </label>
                {field.type === "select" && field.options && (
                  <select
                    id={field.name}
                    className="form-input"
                    value={value || ""}
                    disabled={true}
                  >
                    <option value="" disabled={!!value}>
                      {field.placeholder || "Selecione..."}
                    </option>
                    {field.options.map((opt) => (
                      <option key={opt.id} value={String(opt.value)}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
                {field.type === "textarea" && (
                  <textarea
                    id={field.name}
                    className="form-input"
                    rows={4}
                    value={value || ""}
                    placeholder={field.placeholder}
                    disabled={true}
                  />
                )}
                {field.type === "number" && (
                  <input
                    id={field.name}
                    type="number"
                    className="form-input"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={value !== undefined ? String(value) : ""}
                    placeholder={field.placeholder}
                    disabled={true}
                  />
                )}
                {field.type === "date" && (
                  <input
                    id={field.name}
                    type="date"
                    className="form-input"
                    value={value || ""}
                    disabled={true}
                  />
                )}
                {["text", "checkbox"].includes(field.type) && (
                  <input
                    id={field.name}
                    type={field.type}
                    className="form-input"
                    value={value !== undefined ? String(value) : ""}
                    placeholder={field.placeholder}
                    disabled={true}
                    checked={field.type === "checkbox" && Boolean(value)}
                  />
                )}
                {field.help && <p className="form-help">{field.help}</p>}
                {isFilled && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#10b981" }}>
                    ✓ Preenchido
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="cta-button" style={ctaStyle} disabled={!allRequiredFilled}>
          {allRequiredFilled ? "Continuar →" : "Preencha os campos obrigatórios"}
        </div>
      </div>
    </div>
  );
};