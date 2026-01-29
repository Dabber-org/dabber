import DropDownMenu from "@/components/DropDownMenu";
import { Stack } from "@mui/material";

export default function TypesDropDown({ value, onChange }: { value?: string; onChange?: (value: string) => void }) {
  return (
    <Stack width="25%">
      <DropDownMenu
        label="Types"
        options={[
          { value: "all", label: "All Types" },
          { value: "static", label: "Static" },
          { value: "dynamic", label: "Dynamic" },
        ]}
        value={value || "all"}
        onChange={(event) => {
          onChange?.(event.target.value as string);
        }}
      />
    </Stack>
  );
}
