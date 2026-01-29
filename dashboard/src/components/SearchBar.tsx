import SearchIcon from "@/icons/brand/SearchIcon";
import { InputAdornment, Stack } from "@mui/material";
import { InputField } from "./LabeledAuthInput";
import theme from "@/theme/theme";

export default function SearchBar({ onChange }: { onChange?: (value: string) => void }) {
  return (
    <Stack direction="row" alignItems="center" gap={1} width="50%">
      <InputField
        placeholder="Search..."
        size="small"
        sx={{
          borderRadius: "1.75rem",
          variant: "fontMediumSm",
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon primaryFill={theme.palette.primary.main} />
              </InputAdornment>
            ),
          },
        }}
        onChange={(event) => {
          onChange?.(event.target.value);
        }}
      />
    </Stack>
  );
}
