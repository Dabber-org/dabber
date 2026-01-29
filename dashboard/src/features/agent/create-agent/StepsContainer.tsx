"use client";
import { Stack } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { useCreateAgentContext } from "./context";

const MotionStack = motion(Stack);

export default function StepsContainer() {
  const { currentStep, STEPS } = useCreateAgentContext();
  const currentStepConfig = STEPS[currentStep - 1];

  return (
    <Stack width="100%" justifyContent="center" alignItems="center" overflow="hidden">
      <AnimatePresence mode="wait">
        <MotionStack
          key={currentStepConfig.label}
          width="100%"
          justifyContent="center"
          alignItems="center"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -32 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          {currentStepConfig.component}
        </MotionStack>
      </AnimatePresence>
    </Stack>
  );
}
