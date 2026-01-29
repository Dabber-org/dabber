import { Box, Stack, styled, Typography } from "@mui/material";
import { useFormContext, useWatch } from "react-hook-form";
import { CapabilityOption, SetupStepFormData } from "../types";

export default function AgentCapabilities() {
  const {
    control,
    setValue,
    formState: { errors, submitCount },
  } = useFormContext<SetupStepFormData>();

  const selectedCapabilities = (useWatch({
    control,
    name: "capabilities",
  }) ?? []) as CapabilityOption[];

  const toggleCapability = (value: CapabilityOption) => {
    const isSelected = selectedCapabilities.includes(value);
    const updated = isSelected
      ? selectedCapabilities.filter((capability) => capability !== value)
      : [...selectedCapabilities, value];

    setValue("capabilities", updated, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const capabilityError = errors.capabilities?.message as string | undefined;
  const showCapabilityError = !!capabilityError && submitCount > 0;

  return (
    <Stack direction="column" gap={0.62}>
      <Typography variant="fontMediumBase" color="text.primary">
        Your Agent Capabilities
      </Typography>
      {CAPABILITY_CARDS.map((card) => (
        <CapabilityCard
          key={card.title}
          {...card}
          selected={selectedCapabilities.includes(card.value)}
          onClick={() => toggleCapability(card.value)}
        />
      ))}
      {showCapabilityError && (
        <Typography variant="fontRegularSm" color="error.main">
          {capabilityError}
        </Typography>
      )}
    </Stack>
  );
}

const CapabilityCard = ({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) => {
  return (
    <StyledCapabilityCard direction="row" gap={0.5} className="opacityOnHover-50" onClick={onClick}>
      {selected ? <SelectedDot /> : <UnselectedDot />}
      <Stack direction="column" gap={0.5}>
        <Typography variant="fontDemiBase" color="primary.main">
          {title}
        </Typography>
        <Typography variant="fontRegularSm" color="text.secondary">
          {description}
        </Typography>
      </Stack>
    </StyledCapabilityCard>
  );
};

const SelectedDot = () => {
  return (
    <Box
      component="span"
      width={8}
      height={8}
      margin={0.31}
      sx={{
        backgroundColor: "primary.main",
        borderRadius: "100%",
        flexShrink: 0,
      }}
    />
  );
};

const UnselectedDot = () => {
  return (
    <Box
      component="span"
      width={8}
      height={8}
      margin={0.31}
      sx={{
        backgroundColor: "border.default",
        borderRadius: "100%",
        flexShrink: 0,
      }}
    />
  );
};

type CapabilityCardConfig = {
  value: CapabilityOption;
  title: string;
  description: string;
};

const CAPABILITY_CARDS: CapabilityCardConfig[] = [
  {
    value: "staticKnowledge",
    title: "Static Knowledge",
    description: "Your agent will learn from your website, documents, and static pages.",
  },
  {
    value: "dynamicIntegration",
    title: "Dynamic Integration",
    description: "Connect your agent to your systems for real-time interactions.",
  },
];

const StyledCapabilityCard = styled(Stack)(({ theme }) => ({
  backgroundColor: theme.palette.background.surface,
  borderRadius: "0.75rem",
  padding: theme.spacing(0.81),
  border: `1px solid ${theme.palette.border.default}`,
  cursor: "pointer",
}));
