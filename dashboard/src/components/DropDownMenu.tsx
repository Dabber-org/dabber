import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { Stack, styled, useTheme } from "@mui/material";
import ExpandArrow from "@/icons/ExpandArrow";

export default function DropDownMenu({
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (event: SelectChangeEvent<unknown>) => void;
}) {
  const theme = useTheme();

  return (
    <Stack width="100%">
      <FormControl fullWidth>
        <StyledSelect
          id="demo-simple-select-autowidth"
          value={value}
          onChange={onChange}
          size="small"
          IconComponent={(props) => <ExpandArrow primaryFill={theme.palette.text.secondary} {...props} />}
          MenuProps={{
            PaperProps: {
              sx: {
                minWidth: "100%",
                width: "max-content",
                backgroundColor: theme.palette.background.surface,
              },
            },
            anchorOrigin: {
              vertical: "bottom",
              horizontal: "left",
            },
            transformOrigin: {
              vertical: "top",
              horizontal: "left",
            },
          }}
        >
          {options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </StyledSelect>
      </FormControl>
    </Stack>
  );
}

const StyledSelect = styled(Select)(({ theme }) => ({
  color: "text.secondary",
  minWidth: "100%",
  backgroundColor: theme.palette.background.surface,
  borderRadius: "0.75rem",
  "& .MuiSelect-select": {
    minWidth: "100%",
  },
  "& .MuiSelect-icon": {
    color: theme.palette.text.secondary,
    position: "absolute",
    right: "8px",
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },

  "& .MuiOutlinedInput-notchedOutline": {
    border: "transparent",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    border: `2px solid ${theme.palette.primary.main}`,
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    border: `2px solid ${theme.palette.primary.main}`,
  },
}));
