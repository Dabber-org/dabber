"use client";
import { Button, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useEffect } from "react";

export default function MainButton({
  label,
  letter,
  type,
  onClick,
  startIcon,
  disabled,
}: {
  label: string;
  letter?: string;
  type?: "button" | "submit";
  onClick: () => void;
  startIcon?: React.ReactNode;
  disabled?: boolean;
}) {
  useEffect(() => {
    if (!letter) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === letter.toLowerCase() &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        !disabled
      ) {
        onClick();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [letter, onClick, disabled]);

  return (
    <StyledButton className="opacityOnHover-50" onClick={onClick} type={type} disabled={disabled}>
      {startIcon}
      <Typography
        variant="fontDemiSm"
        color={disabled ? "text.disabled" : "text.onAccent"}
        gap="0.25rem"
        textTransform="none"
      >
        {label}
      </Typography>

      {letter && (
        <StyledTypography
          variant="fontMediumXs"
          color={disabled ? "text.disabled" : "text.primary"}
          paddingInline="0.4rem"
          paddingBlock="0.09rem"
          borderRadius="0.375rem"
          height="1.25rem"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {letter}
        </StyledTypography>
      )}
    </StyledButton>
  );
}

const StyledButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.text.primary,
  borderRadius: theme.spacing(0.75),
  border: `1px solid ${theme.palette.border.primary}`,
  padding: theme.spacing(0.5, 1),
  width: "fit-content",
  textTransform: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(0.625),
  "&:disabled": {
    backgroundColor: theme.palette.action.disabledBackground,
    borderColor: theme.palette.action.disabled,
    opacity: 0.6,
  },
}));

const StyledTypography = styled(Typography)(({ theme }) => ({
  backgroundColor: theme.palette.background.subtle2,
  borderRadius: "0.375rem",
}));
