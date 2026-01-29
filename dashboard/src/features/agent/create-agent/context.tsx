"use client";

import React, { createContext, useContext, useState, useTransition, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CapabilityOption, DynamicKnowledgeStepFormData, SetupStepFormData, StaticConfigStepFormData } from "./types";
import DynamicKnowledgeStep from "./DynamicKnowledgeStep";
import SetupStep from "./SetupStep";
import StaticConfigStep from "./StaticConfigStep";
import { createAgent } from "./services";

type StepFormData = SetupStepFormData | StaticConfigStepFormData | DynamicKnowledgeStepFormData;
type StepId = "setup" | "staticConfig" | "dynamicKnowledge";

type StepConfig = {
  label: string;
  component: React.ReactNode;
};

const deriveStepSequence = (capabilities: CapabilityOption[]): StepId[] => {
  const sequence: StepId[] = ["setup"];
  if (capabilities.includes("staticKnowledge")) {
    sequence.push("staticConfig");
  }
  if (capabilities.includes("dynamicIntegration")) {
    sequence.push("dynamicKnowledge");
  }
  return sequence;
};

interface CreateAgentContextType {
  currentStep: number;
  setupFormData: SetupStepFormData;
  staticConfigFormData: StaticConfigStepFormData;
  dynamicKnowledgeFormData: DynamicKnowledgeStepFormData;
  isLoading: boolean;
  handleContinue: (stepId: StepId, formData: StepFormData) => void;
  handleBack: () => void;
  STEPS: StepConfig[];
}

const CreateAgentContext = createContext<CreateAgentContextType>({
  currentStep: 1,
  setupFormData: {
    assistantName: "",
    instructions: "",
    capabilities: [],
  },
  staticConfigFormData: {
    websiteUrl: "",
  },
  dynamicKnowledgeFormData: {
    apiBaseUrl: "",
    openApiUrl: "",
    apiKey: "",
  },
  isLoading: false,
  handleContinue: () => {},
  handleBack: () => {},
  STEPS: [],
});

export const CreateAgentProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [isLoading, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState(1);
  const [setupFormData, setSetupFormData] = useState<SetupStepFormData>({
    assistantName: "",
    instructions: "",
    capabilities: [],
  });
  const [staticConfigFormData, setStaticConfigFormData] = useState<StaticConfigStepFormData>({
    websiteUrl: "",
  });
  const [dynamicKnowledgeFormData, setDynamicKnowledgeFormData] = useState<DynamicKnowledgeStepFormData>({
    apiBaseUrl: "",
    openApiUrl: "",
    apiKey: "",
  });
  const [stepSequence, setStepSequence] = useState<StepId[]>(["setup"]);

  const persistStepFormData = (stepId: StepId, formData: StepFormData) => {
    switch (stepId) {
      case "setup":
        setSetupFormData(formData as SetupStepFormData);
        break;
      case "staticConfig":
        setStaticConfigFormData(formData as StaticConfigStepFormData);
        break;
      case "dynamicKnowledge":
        setDynamicKnowledgeFormData(formData as DynamicKnowledgeStepFormData);
        break;
    }
  };

  const handleContinue = (stepId: StepId, formData: StepFormData) => {
    persistStepFormData(stepId, formData);

    if (stepId === "setup") {
      const nextSequence = deriveStepSequence((formData as SetupStepFormData).capabilities);
      setStepSequence(nextSequence);
      setCurrentStep((prev) => Math.min(prev + 1, nextSequence.length));
      return;
    }

    const isLastStep = currentStep === stepSequence.length;

    if (isLastStep) {
      handleSubmit(stepId, formData);
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, stepSequence.length));
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (finalStepId: StepId, finalStepData: StepFormData) => {
    const includeStatic = setupFormData.capabilities.includes("staticKnowledge");
    const includeDynamic = setupFormData.capabilities.includes("dynamicIntegration");
    const effectiveStaticData =
      finalStepId === "staticConfig" ? (finalStepData as StaticConfigStepFormData) : staticConfigFormData;
    const effectiveDynamicData =
      finalStepId === "dynamicKnowledge" ? (finalStepData as DynamicKnowledgeStepFormData) : dynamicKnowledgeFormData;

    startTransition(async () => {
      const agentData = {
        userId: "123",
        name: setupFormData.assistantName,
        instructions: setupFormData.instructions ?? null,
        scrapingUrl: includeStatic ? effectiveStaticData.websiteUrl : undefined,
        openApiUrl: includeDynamic ? effectiveDynamicData.openApiUrl : undefined,
        apiBaseUrl: includeDynamic ? effectiveDynamicData.apiBaseUrl : undefined,
        isStaticEnabled: includeStatic,
        isDynamicEnabled: includeDynamic,
      };
      const agent = await createAgent(agentData);
      router.push(`/agents/${agent.id}`);
    });
  };

  const STEPS: StepConfig[] = stepSequence.map((stepId) => {
    switch (stepId) {
      case "setup":
        return {
          label: "Setup",
          component: <SetupStep onContinue={(formData: SetupStepFormData) => handleContinue("setup", formData)} />,
        };
      case "staticConfig":
        return {
          label: "Static Configuration",
          component: (
            <StaticConfigStep
              onContinue={(formData: StaticConfigStepFormData) => handleContinue("staticConfig", formData)}
              onBack={handleBack}
            />
          ),
        };
      case "dynamicKnowledge":
        return {
          label: "Dynamic Knowledge",
          component: (
            <DynamicKnowledgeStep
              onContinue={(formData: DynamicKnowledgeStepFormData) => handleContinue("dynamicKnowledge", formData)}
              onBack={handleBack}
            />
          ),
        };
    }
  });

  return React.createElement(
    CreateAgentContext.Provider,
    {
      value: {
        currentStep,
        setupFormData,
        staticConfigFormData,
        dynamicKnowledgeFormData,
        isLoading,
        handleContinue,
        handleBack,
        STEPS,
      },
    },
    children
  );
};

export const useCreateAgentContext = () => useContext(CreateAgentContext);
