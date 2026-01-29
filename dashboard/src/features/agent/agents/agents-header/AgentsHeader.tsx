import { Button, Stack, Typography } from "@mui/material";
import SearchBar from "@/components/SearchBar";
import StatusDropDown from "./StatusDropDown";
import TypesDropDown from "./TypesDropDown";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

export default function AgentsHeader({
  onChange,
  status,
  onChangeStatus,
  type,
  onChangeType,
}: {
  onChange?: (value: string) => void;
  status: string;
  onChangeStatus?: (value: string) => void;
  type: string;
  onChangeType?: (value: string) => void;
}) {
  const router = useRouter();
  return (
    <Stack gap="2rem">
      <Stack direction="row" justifyContent="space-between" width="100%">
        <Stack>
          <Typography variant="fontDemi3xl" color="text.primary" textAlign="start">
            My Agents
          </Typography>
        </Stack>
        <Button
          className="opacityOnHover-50"
          startIcon={<IconPlus />}
          sx={{
            backgroundColor: "text.primary",
            height: "fit-content",
            textTransform: "none",
            borderRadius: "0.75rem",
            paddingInline: "0.7rem",
            gap: "0.25rem",
          }}
          onClick={() => router.push("/agents/create")}
        >
          <Typography variant="fontDemiSm" color="primary.main">
            Create New Agent
          </Typography>
        </Button>
      </Stack>

      <Stack width="100%" direction="row" gap="1rem">
        <SearchBar onChange={onChange} />
        <TypesDropDown value={type} onChange={onChangeType} />
        <StatusDropDown value={status} onChange={onChangeStatus} />
      </Stack>
    </Stack>
  );
}
