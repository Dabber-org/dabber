import { Typography, Link as MuiLink } from "@mui/material";
import Link from "next/link";
export default function SignupLink() {
  return (
    <Typography variant="fontMediumBase" color="text.secondary" textAlign="center">
      Don’t have an account?
      <MuiLink
        component={Link}
        href="/signup"
        variant="fontMediumBase"
        color="border.primary"
        className="opacityOnHover-50"
        sx={{ marginLeft: "0.31rem" }}
      >
        Sign up
      </MuiLink>
    </Typography>
  );
}
