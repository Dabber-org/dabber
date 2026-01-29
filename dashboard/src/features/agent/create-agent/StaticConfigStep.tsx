"use client";
import { StyledStepContainer } from "./components/StepContainer";
import StepHeader from "./components/StepHeader";
import LabeledInput from "@/components/LabeledInput";
import { useForm } from "react-hook-form";
import { StaticConfigStepFormData, staticConfigStepFormSchema } from "./types";
import { Stack } from "@mui/material";
import { ContinueButton } from "./components/Buttons";
import BackButton from "./components/BackButton";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateAgentContext } from "./context";

export default function StaticConfigStep({
  onContinue,
  onBack,
}: {
  onContinue: (formData: StaticConfigStepFormData) => void;
  onBack: () => void;
}) {
  const { staticConfigFormData, isLoading } = useCreateAgentContext();
  const {
    register,
    formState: { errors },
    watch,
    handleSubmit,
  } = useForm<z.infer<typeof staticConfigStepFormSchema>>({
    resolver: zodResolver(staticConfigStepFormSchema),
    defaultValues: staticConfigFormData,
  });
  return (
    <StyledStepContainer onSubmit={handleSubmit(onContinue)} noValidate>
      <StepHeader title="Static Configuration" description="Configure your static configuration" />
      <LabeledInput
        label="Website URL"
        name="websiteUrl"
        register={register}
        errors={errors}
        watch={watch}
        placeholder="Enter your website URL"
      />
      <Stack direction="row" gap={1} width="100%">
        <ContinueButton label="Continue" type="submit" isLoading={isLoading} />
        <BackButton onClick={onBack} />
      </Stack>
    </StyledStepContainer>
  );
}
