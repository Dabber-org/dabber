"use client";
import { StyledStepContainer } from "./components/StepContainer";
import StepHeader from "./components/StepHeader";
import { useForm } from "react-hook-form";
import { DynamicKnowledgeStepFormData, dynamicKnowledgeStepFormSchema } from "./types";
import LabeledInput from "@/components/LabeledInput";
import { Stack } from "@mui/material";
import BackButton from "./components/BackButton";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ContinueButton } from "./components/Buttons";
import { useCreateAgentContext } from "./context";

export default function DynamicKnowledgeStep({
  onContinue,
  onBack,
}: {
  onContinue: (formData: DynamicKnowledgeStepFormData) => void;
  onBack: () => void;
}) {
  const { dynamicKnowledgeFormData, isLoading } = useCreateAgentContext();
  const {
    register,
    formState: { errors },
    watch,
    handleSubmit,
  } = useForm<z.infer<typeof dynamicKnowledgeStepFormSchema>>({
    resolver: zodResolver(dynamicKnowledgeStepFormSchema),
    defaultValues: dynamicKnowledgeFormData,
  });
  return (
    <StyledStepContainer onSubmit={handleSubmit(onContinue)} noValidate>
      <StepHeader title="Dynamic Knowledge" description="Configure your dynamic knowledge" />
      <LabeledInput
        label="API Base URL"
        name="apiBaseUrl"
        register={register}
        errors={errors}
        watch={watch}
        placeholder="https://api.example.com"
      />
      <LabeledInput
        label="API Key"
        name="apiKey"
        register={register}
        errors={errors}
        watch={watch}
        placeholder="Enter your API key"
      />
      <LabeledInput
        label="OpenAPI URL"
        name="openApiUrl"
        register={register}
        errors={errors}
        watch={watch}
        placeholder="https://api.example.com/openapi.json"
      />
      <Stack direction="row" gap={1} width="100%">
        <ContinueButton label="Continue" type="submit" isLoading={isLoading} />
        <BackButton onClick={onBack} />
      </Stack>
    </StyledStepContainer>
  );
}
