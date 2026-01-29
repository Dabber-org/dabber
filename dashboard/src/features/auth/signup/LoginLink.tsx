import { Typography, Link as MuiLink } from "@mui/material";
import Link from "next/link";
export default function LoginLink() {
  return (
    <Typography variant="fontMediumBase" color="text.secondary" textAlign="center">
      Already have an account?
      <MuiLink
        component={Link}
        href="/login"
        variant="fontMediumBase"
        color="primary.main"
        className="opacityOnHover-50"
        sx={{ marginLeft: "0.31rem" }}
      >
        Login
      </MuiLink>
    </Typography>
  );
}
