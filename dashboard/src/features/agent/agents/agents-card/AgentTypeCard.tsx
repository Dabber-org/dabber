import { Typography } from "@mui/material";
import { getTypeBackgroundColor, getTypeColor } from "../utils";

export default function AgentTypeCard({ type }: { type: string }) {
  return (
    <Typography
      variant="fontMediumXs"
      sx={{
        backgroundColor: getTypeBackgroundColor(type),
        padding: "0.25rem 0.5rem",
        borderRadius: "0.5rem",
        color: getTypeColor(type),
      }}
    >
      {type}
    </Typography>
  );
}
