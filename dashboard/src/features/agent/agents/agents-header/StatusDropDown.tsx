import DropDownMenu from "@/components/DropDownMenu";
import { Stack } from "@mui/material";
export default function StatusDropDown({ value, onChange }: { value?: string; onChange?: (value: string) => void }) {
  return (
    <Stack width="25%">
      <DropDownMenu
        label="Status"
        options={[
          { value: "all", label: "All Statuses" },
          { value: "pending", label: "Pending" },
          { value: "failed", label: "Failed" },
          { value: "ready", label: "Ready" },
          { value: "inactive", label: "Inactive" },
        ]}
        value={value || "all"}
        onChange={(event) => {
          onChange?.(event.target.value as string);
        }}
      />
    </Stack>
  );
}
