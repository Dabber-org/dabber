import { Divider as MuiDivider, Typography } from "@mui/material";
export default function Divider() {
  return (
    <MuiDivider
      sx={{
        marginBlock: "1.5rem",
        width: "100%",
        "&::before, &::after": {
          borderTopWidth: "0.0625rem",
          borderColor: "avey.gray.500",
        },
        "& .MuiDivider-wrapper": {
          paddingInline: "0.5rem",
        },
      }}
    >
      <Typography variant="fontRegularBase" color="text.secondary">
        Or
      </Typography>
    </MuiDivider>
  );
}
