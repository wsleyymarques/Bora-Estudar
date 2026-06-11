// packages/tutorial-video/src/compositions/RecipeVideo.tsx
import React from "react";
import {
  Composition,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import type { Recipe, Step, SelectStep as SelectStepType, FormStep as FormStepType } from "@bora-estudar/tutorial-engine";
import { InfoStep as InfoStepComponent } from "../components/InfoStep";
import { SelectStep } from "../components/SelectStep";
import { FormStep as FormStepComponent } from "../components/FormStep";
import { ConfirmationStep } from "../components/ConfirmationStep";
import { SuccessStep as SuccessStepComponent } from "../components/SuccessStep";

interface RecipeVideoProps {
  recipe: Recipe;
}

const STEP_DURATION_FRAMES = 150; // 5 seconds at 30fps

// Step renderer component that shows the appropriate step type
const StepRenderer: React.FC<{
  step: Step;
  stepIndex: number;
  totalSteps: number;
  recipe: Recipe;
  frameOffset: number;
}> = ({ step, stepIndex, totalSteps, recipe, frameOffset }) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - frameOffset;
  
  // Don't render if not our turn
  if (relativeFrame < 0 || relativeFrame > STEP_DURATION_FRAMES) {
    return null;
  }

  const baseProps = {
    title: step.title,
    content: step.content || "",
    stepIndex,
    totalSteps,
    durationInFrames: STEP_DURATION_FRAMES,
  };

  switch (step.type) {
    case "info":
      return <InfoStepComponent {...baseProps} />;
    
    case "single-select": {
      const typedStep = step as SelectStepType;
      return (
        <SelectStep
          {...baseProps}
          options={typedStep.options}
          isMultiSelect={false}
        />
      );
    }
    
    case "multi-select": {
      const typedStep = step as SelectStepType;
      return (
        <SelectStep
          {...baseProps}
          options={typedStep.options}
          isMultiSelect={true}
        />
      );
    }
    
    case "form": {
      const typedStep = step as FormStepType;
      return (
        <FormStepComponent
          {...baseProps}
          fields={typedStep.fields}
        />
      );
    }
    
    case "confirmation":
      return <ConfirmationStep {...baseProps} />;
    
    case "success":
      return <SuccessStepComponent {...baseProps} />;
    
    default:
      return (
        <InfoStepComponent
          {...baseProps}
          title={`Tipo desconhecido: ${step.type}`}
          content="Este tipo de passo não é suportado no vídeo."
        />
      );
  }
};

export const RecipeVideo: React.FC<RecipeVideoProps> = ({ recipe }) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  
  const totalSteps = recipe.steps.length;
  
  // Calculate which step should be visible
  const currentStepIndex = Math.min(
    Math.floor(frame / STEP_DURATION_FRAMES),
    totalSteps - 1
  );
  
  // Background with subtle animation
  const bgHue = spring({
    frame,
    fps,
    config: { damping: 100, stiffness: 50 },
    startValue: 220,
    endValue: 260,
  });

  return (
    <div
      style={{
        width,
        height,
        background: `hsl(${bgHue}, 30%, 6%)`,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Ambient background glow */}
      <div
        style={{
          position: "absolute",
          top: "-50%",
          left: "-50%",
          width: "200%",
          height: "200%",
          background: `radial-gradient(circle at center, hsl(${bgHue}, 50%, 15%) 0%, transparent 70%)`,
          opacity: 0.3,
          pointerEvents: "none",
        }}
      />
      
      {/* Render all steps, but only one is visible at a time */}
      {recipe.steps.map((step, index) => (
        <StepRenderer
          key={step.id}
          step={step}
          stepIndex={index}
          totalSteps={totalSteps}
          recipe={recipe}
          frameOffset={index * STEP_DURATION_FRAMES}
        />
      ))}
      
      {/* Global progress indicator at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 8,
          zIndex: 10,
        }}
      >
        {recipe.steps.map((_, index) => (
          <div
            key={index}
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: index < currentStepIndex 
                ? "hsl(240, 100%, 70%)" 
                : index === currentStepIndex
                ? "hsl(240, 100%, 80%)"
                : "rgba(100, 116, 139, 0.5)",
              transition: "all 0.3s ease",
              boxShadow: index === currentStepIndex 
                ? "0 0 12px hsl(240, 100%, 70%)"
                : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Root composition that registers the video
export const RecipeVideoRoot: React.FC = () => {
  // Default recipes for studio preview
  const defaultCriarPlano: Recipe = {
    schemaVersion: 1,
    id: "criar-plano",
    title: "Criar seu Plano de Estudos",
    description: "Vamos montar seu plano personalizado passo a passo",
    estimatedMinutes: 7,
    metadata: { category: "onboarding", icon: "📋", color: "#6366f1", requiredForBadge: true },
    settings: { allowSkip: true, allowBack: true, persistProgress: true, autoAdvance: false, showProgressBar: true, showStepNumbers: true },
    initialData: {},
    steps: [
      { id: "welcome", type: "info", title: "Bem-vindo ao Bora Estudar! 🎓", content: "Olá! Vamos criar seu plano de estudos personalizado.\nSão só alguns passos rápidos — uns 7 minutinhos.", optional: false },
      { id: "goal-selection", type: "multi-select", title: "Qual seu objetivo principal?", content: "Pode escolher mais de um", options: [
        { id: "concurso", label: "Concurso Público", icon: "🏛️" },
        { id: "vestibular", label: "Vestibular / ENEM", icon: "🎓" },
        { id: "certificacao", label: "Certificação Profissional", icon: "📜" },
        { id: "rotina", label: "Criar Rotina de Estudos", icon: "📅" },
      ], validation: { minSelections: 1, maxSelections: 3 }, optional: false, mapsTo: "goals" },
      { id: "subject-selection", type: "multi-select", title: "Quais matérias você quer estudar?", content: "Baseado no seu objetivo", options: [
        { id: "portugues", label: "Português", icon: "📝" },
        { id: "matematica", label: "Matemática", icon: "🔢" },
        { id: "direito", label: "Direito", icon: "⚖️" },
        { id: "informatica", label: "Informática", icon: "💻" },
        { id: "ingles", label: "Inglês", icon: "🇺🇸" },
        { id: "raciocinio", label: "Raciocínio Lógico", icon: "🧩" },
      ], validation: { minSelections: 1 }, optional: false, mapsTo: "subjects" },
      { id: "routine-config", type: "form", title: "Como é sua rotina semanal?", content: "Quanto tempo você tem?", fields: [
        { name: "weeklyHours", type: "number", label: "Horas por semana", min: 1, max: 80, step: 1, default: 10 },
        { name: "preferredTimes", type: "multi-select", label: "Melhores horários", options: [
          { id: "manha", label: "Manhã (6h-12h)", value: "manha" },
          { id: "tarde", label: "Tarde (12h-18h)", value: "tarde" },
          { id: "noite", label: "Noite (18h-23h)", value: "noite" },
          { id: "madrugada", label: "Madrugada (23h-6h)", value: "madrugada" },
        ], validation: { minSelections: 1 } },
      ], validation: { required: ["weeklyHours", "preferredTimes"] }, optional: false, mapsTo: ["weeklyHours", "preferredTimes"] },
      { id: "study-method", type: "single-select", title: "Como você prefere estudar?", content: "Isso define como vamos estruturar seus ciclos.", options: [
        { id: "pomodoro", label: "Pomodoro (25min foco + 5min pausa)", icon: "🍅" },
        { id: "deep-work", label: "Deep Work (90min blocos longos)", icon: "🧠" },
        { id: "intercalado", label: "Intercalado (matérias diferentes por dia)", icon: "🔄" },
        { id: "revisao-ativa", label: "Revisão Ativa (flashcards, questões)", icon: "🃏" },
      ], optional: true, mapsTo: "studyMethod" },
      { id: "confirm-summary", type: "confirmation", title: "Tudo certo? Bora gerar seu plano! 🚀", content: "Resumo do seu plano", cta: { label: "Gerar Plano ✨", action: "complete", variant: "primary" }, optional: false },
      { id: "success", type: "success", title: "Plano criado com sucesso! 🎉", content: "Seu plano está pronto no dashboard.", optional: false, onComplete: [] },
    ],
  };

  const defaultCronogramaAvulso: Recipe = {
    schemaVersion: 1,
    id: "cronograma-avulso",
    title: "Criar Cronograma Avulso",
    description: "Agenda rápida para prova, concurso ou evento específico",
    estimatedMinutes: 3,
    metadata: { category: "quick-action", icon: "📅", color: "#10b981", requiredForBadge: false },
    settings: { allowSkip: true, allowBack: true, persistProgress: true, autoAdvance: false, showProgressBar: true, showStepNumbers: false },
    initialData: {},
    steps: [
      { id: "event-info", type: "form", title: "Sobre o evento/prova", content: "Quando é? Como se chama?", fields: [
        { name: "eventName", type: "text", label: "Nome do evento/prova", placeholder: "Ex: Concurso TRF 2024" },
        { name: "eventDate", type: "date", label: "Data da prova/evento" },
      ], validation: { required: ["eventName", "eventDate"] }, optional: false, mapsTo: ["eventName", "eventDate"] },
      { id: "subject-priority", type: "multi-select", title: "Quais matérias caem na prova?", content: "Ordene por prioridade", options: [
        { id: "portugues", label: "Português" },
        { id: "matematica", label: "Matemática" },
        { id: "direito-constitucional", label: "Direito Constitucional" },
        { id: "direito-administrativo", label: "Direito Administrativo" },
        { id: "informatica", label: "Informática" },
        { id: "raciocinio-logico", label: "Raciocínio Lógico" },
        { id: "ingles", label: "Inglês" },
      ], validation: { minSelections: 1 }, optional: false, mapsTo: "subjects", ui: { draggable: true } },
      { id: "intensity", type: "single-select", title: "Quanto tempo você tem por dia?", content: "Seja realista", options: [
        { id: "light", label: "Leve (1-2h/dia)", value: 1.5 },
        { id: "moderate", label: "Moderado (3-4h/dia)", value: 3.5 },
        { id: "intense", label: "Intenso (5-6h/dia)", value: 5.5 },
        { id: "custom", label: "Personalizado", value: null },
      ], optional: false, mapsTo: "dailyHours" },
      { id: "generate-schedule", type: "confirmation", title: "Pronto para gerar! 📋", content: "Seu cronograma", cta: { label: "Gerar Cronograma 🚀", action: "complete", variant: "primary" }, optional: false },
      { id: "success", type: "success", title: "Cronograma pronto! 🎯", content: "Seu cronograma semanal está no dashboard.", optional: false, onComplete: [] },
    ],
  };

  return (
    <>
      <Composition
        id="criar-plano"
        component={RecipeVideo}
        durationInFrames={7 * STEP_DURATION_FRAMES}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ recipe: defaultCriarPlano }}
      />
      <Composition
        id="cronograma-avulso"
        component={RecipeVideo}
        durationInFrames={6 * STEP_DURATION_FRAMES}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ recipe: defaultCronogramaAvulso }}
      />
    </>
  );
};

export default RecipeVideoRoot;