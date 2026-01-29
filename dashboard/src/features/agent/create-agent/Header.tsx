import { Stack, Typography } from "@mui/material";
import DabberBotSmall from "@/icons/brand/DabberBotSmall";
export default function Header() {
  return (
    <Stack
      gap={1.5}
      width="100%"
      direction="row"
      alignItems="center"
      paddingInline="1.5rem"
      paddingBlock="2rem"
      justifyContent="flex-start"
    >
      <DabberBotSmall />
      <Stack>
        <Typography variant="fontDemi3xl" color="text.primary" textAlign="start">
          Create Agent
        </Typography>
        <Typography variant="fontMediumBase" color="text.secondary" textAlign="start">
          Let’s set up your AI Agent
        </Typography>
      </Stack>
    </Stack>
  );
}
