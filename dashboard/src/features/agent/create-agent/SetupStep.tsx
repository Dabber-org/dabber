"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, styled } from "@mui/material";
import StepHeader from "./components/StepHeader";
import LabeledInput from "@/components/LabeledInput";
import { FormProvider, useForm } from "react-hook-form";
import { SetupStepFormData, setupStepFormSchema } from "./types";
import { StyledStepContainer } from "./components/StepContainer";
import AgentCapabilities from "./components/AgentCapabilities";
import { ContinueButton } from "./components/Buttons";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateAgentContext } from "./context";
import LabeledTextarea from "@/components/LabeledTextarea";
import CaretLargeUp from "@/icons/CaretLargeUp";
import CaretLargeDown from "@/icons/CaretLargeDown";

export default function SetupStep({ onContinue }: { onContinue: (formData: SetupStepFormData) => void }) {
  const { setupFormData } = useCreateAgentContext();
  const methods = useForm<z.infer<typeof setupStepFormSchema>>({
    resolver: zodResolver(setupStepFormSchema),
    defaultValues: setupFormData,
  });

  const {
    register,
    formState: { errors },
    watch,
    handleSubmit,
  } = methods;
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  return (
    <FormProvider {...methods}>
      <StyledStepContainer onSubmit={handleSubmit(onContinue)} noValidate>
        <StepHeader title="Setup Your Agent " description="Tell us the basics so we can personalize your agent." />
        <LabeledInput
          label="Assistant Name"
          name="assistantName"
          register={register}
          errors={errors}
          watch={watch}
          placeholder="Enter your agent name "
        />
        <AgentCapabilities />

        <AdvancedOptionsToggle
          className="opacityOnHover-50"
          type="button"
          onClick={() => setShowAdvancedOptions((prev) => !prev)}
        >
          {showAdvancedOptions ? (
            <>
              <CaretLargeUp />
              Hide advanced options
            </>
          ) : (
            <>
              <CaretLargeDown />
              Show advanced options
            </>
          )}
        </AdvancedOptionsToggle>
        <AnimatePresence initial={false}>
          {showAdvancedOptions && (
            <MotionTextareaWrapper
              key="instructions"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <LabeledTextarea
                label="Agent Instructions"
                name="instructions"
                register={register}
                errors={errors}
                watch={watch}
                placeholder="Enter your agent instructions"
              />
            </MotionTextareaWrapper>
          )}
        </AnimatePresence>
        <ContinueButton label="Continue" type="submit" />
      </StyledStepContainer>
    </FormProvider>
  );
}

const AdvancedOptionsToggle = styled(Button)(({ theme }) => ({
  textTransform: "none",
  padding: theme.spacing(0.25, 0.5),
  borderRadius: "0rem",
  alignSelf: "flex-start",
  width: "100%",
  borderBottom: `1px solid ${theme.palette.border.subtle}`,
  color: theme.palette.primary.main,
  fontWeight: 500,
  justifyContent: "flex-start",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.25),
  "&:hover": {
    borderBottom: `1px solid ${theme.palette.border.primary}`,
    backgroundColor: "transparent",
  },
}));

const MotionTextareaWrapper = styled(motion.div)(() => ({
  width: "100%",
}));
