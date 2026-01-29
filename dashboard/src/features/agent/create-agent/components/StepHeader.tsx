import { Stack, Typography } from "@mui/material";
export default function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <Stack gap={0.25}>
      <Typography variant="fontDemi2xl" color="text.primary" textAlign="start">
        {title}
      </Typography>
      <Typography variant="fontRegularBase" color="text.secondary" textAlign="start">
        {description}
      </Typography>
    </Stack>
  );
}
