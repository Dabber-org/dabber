"use client";
import { Button, styled, Typography } from "@mui/material";

export default function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <StyledButton onClick={onClick} className="opacityOnHover-50">
      <Typography variant="fontDemiSm" color="text.primary">
        Back
      </Typography>
    </StyledButton>
  );
}

const StyledButton = styled(Button)({
  minWidth: "auto",
  textTransform: "none",
});
