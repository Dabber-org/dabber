import { Agent } from "@/generated/prisma";
import { Stack, Typography, Grid, Button } from "@mui/material";
import { IconCircleCheckFilled } from "@tabler/icons-react";
import theme from "@/theme";
import EditPen from "@/icons/EditPen";
import { useState } from "react";
import Switch from "@/icons/Switch";
const dynamicIntegrationItems = (agent: Agent) => [
  { label: "API Access", value: agent.apiBaseUrl },
  { label: "API Key", value: "sk_live_••••••••••••••••" },
  { label: "OpenAPI URL", value: agent.openApiUrl },
];

const staticIntegrationItems = (agent: Agent) => [
  { label: "Website URL", value: agent.scrapingUrl },
  { label: "Update Frequency", value: "Weekly" },
];

export const DynamicIntegrationCard = ({ agent }: { agent: Agent }) => {
  const [isActive, setIsActive] = useState(true);
  return (
    <Stack gap="1rem">
      {agent.isDynamicEnabled && (
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="fontDemiBase" color="text.primary">
            Dynamic Integration (API)
          </Typography>
          <Stack direction="row" alignItems="center" gap="0.5rem">
            <Button
              className="opacityOnHover-50"
              sx={{
                padding: 0,
                minWidth: 0,
                width: 32,
                height: 32,
              }}
            >
              <EditPen />
            </Button>
            <Switch
              checked={isActive}
              onClick={() => {
                setIsActive(!isActive);
              }}
            />
          </Stack>
        </Stack>
      )}
      {agent.isDynamicEnabled && (
        <Grid container spacing={1}>
          {dynamicIntegrationItems(agent).map((item) => (
            <Grid size={4} key={item.label}>
              <Stack direction="column" gap="0.5rem">
                <Stack direction="row" alignItems="center" gap="0.5rem">
                  <Typography variant="fontRegularSm" color="text.secondary">
                    {item.label}
                  </Typography>
                  <IconCircleCheckFilled size={16} color={theme.palette.primary.main} />
                </Stack>
                <Typography variant="fontRegularSm" color="text.primary">
                  {item.value}
                </Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
};

export const StaticIntegrationCard = ({ agent }: { agent: Agent }) => {
  const [isActive, setIsActive] = useState(true);
  return (
    <Stack gap="1rem">
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="fontDemiBase" color="text.primary">
          Static Integration (Website)
        </Typography>
        <Stack direction="row" alignItems="center" gap="0.5rem">
          <Button
            className="opacityOnHover-50"
            sx={{
              padding: 0,
              minWidth: 0,
              width: 32,
              height: 32,
            }}
          >
            <EditPen />
          </Button>
          <Switch checked={isActive} onChange={() => setIsActive(!isActive)} />
        </Stack>
      </Stack>
      {agent.isStaticEnabled && (
        <Grid container spacing={1}>
          {staticIntegrationItems(agent).map((item) => (
            <Grid size={4} key={item.label}>
              <Stack direction="column" gap="0.5rem">
                <Stack direction="row" alignItems="center" gap="0.5rem">
                  <Typography variant="fontRegularSm" color="text.secondary">
                    {item.label}
                  </Typography>
                  <IconCircleCheckFilled size={16} color={theme.palette.primary.main} />
                </Stack>
                <Typography variant="fontRegularSm" color="text.primary">
                  {item.value}
                </Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
};
