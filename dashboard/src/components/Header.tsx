"use client";
import { Button, Stack, Typography } from "@mui/material";
import MainButton from "./MainButton";

export default function Header() {
  return (
    <Stack direction="row" justifyContent="end" width="100%">
      <MainButton label="Feedback" onClick={() => {}} letter="F" />

      <Button className="opacityOnHover-50">
        <Typography variant="fontDemiSm" color="text.secondary" textTransform="none">
          Docs
        </Typography>
      </Button>
    </Stack>
  );
}
