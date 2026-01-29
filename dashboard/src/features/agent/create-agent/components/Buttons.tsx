import { Button, CircularProgress, styled, Typography } from "@mui/material";

export const StyledContinueButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.text.primary,
  borderRadius: theme.spacing(0.75),
  border: `1px solid ${theme.palette.border.primary}`,
  padding: theme.spacing(0.5, 1),
  width: "5.25rem",
  textTransform: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(1),
}));

export const ContinueButton = ({
  label,
  type,
  isLoading,
}: {
  label: string;
  type: "button" | "submit";
  isLoading?: boolean;
}) => {
  return (
    <StyledContinueButton className="opacityOnHover-50" type={type} disabled={isLoading}>
      {isLoading ? (
        <CircularProgress size={17} sx={{ color: "white" }} />
      ) : (
        <Typography variant="fontDemiSm" color="text.primary">
          {label}
        </Typography>
      )}
    </StyledContinueButton>
  );
};
