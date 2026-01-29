import { styled } from "@mui/material";

export const StyledStepContainer = styled("form")(({ theme }) => ({
  padding: theme.spacing(1.5),
  gap: theme.spacing(1.5),
  width: "28.25rem",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  justifyContent: "flex-start",
}));
