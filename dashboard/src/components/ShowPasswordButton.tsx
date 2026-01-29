import { InputAdornment } from "@mui/material";

import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useTheme } from "@mui/material/styles";

export default function ShowPasswordButton({
  showPassword,
  setShowPassword,
}: {
  showPassword: boolean;
  setShowPassword: (showPassword: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <InputAdornment position="end" style={{ cursor: "pointer" }}>
      {showPassword ? (
        <IconEyeOff
          color={theme.palette.primary.main}
          size={20}
          onClick={() => setShowPassword(!showPassword)}
          className="opacityOnHover-50"
        />
      ) : (
        <IconEye
          color={theme.palette.primary.main}
          size={20}
          onClick={() => setShowPassword(!showPassword)}
          className="opacityOnHover-50"
        />
      )}
    </InputAdornment>
  );
}
