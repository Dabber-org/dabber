import { Button, CircularProgress, Typography, styled } from "@mui/material";
import GoogleIcon from "@/icons/GoogleIcon";
import GithubIcon from "@/icons/GithubIcon";

export default function AuthButton({
  onClick,
  label,
  type,
  isLoading,
}: {
  onClick?: () => void;
  label: string;
  type: "submit" | "button";
  isLoading?: boolean;
}) {
  return (
    <Button
      variant="contained"
      className="opacityOnHover-50"
      sx={{
        boxShadow: "none",
        backgroundColor: "primary.main",
        width: "100%",
        textTransform: "none",
        paddingBlock: "0.62rem",
        paddingInline: "1.5rem",
        borderRadius: "0.75rem",
      }}
      disabled={isLoading}
      type={type}
      onClick={type === "submit" ? undefined : onClick}
    >
      <Typography variant="fontDemiSm" color="white">
        {isLoading ? <CircularProgress size={20} sx={{ color: "white" }} /> : label}
      </Typography>
    </Button>
  );
}

export const GithubButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <SocialButton onClick={onClick} variant="outlined" startIcon={<GithubIcon />}>
      Continue with GitHub
    </SocialButton>
  );
};

export const GoogleButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <SocialButton onClick={onClick} variant="outlined" startIcon={<GoogleIcon />}>
      Continue with Google
    </SocialButton>
  );
};

const SocialButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.background.surface,
  color: theme.palette.text.primary,
  width: "100%",
  borderRadius: "0.625rem",
  padding: "0.5rem 1rem",
  borderColor: theme.palette.background.surface,
  textTransform: "none",
  ...theme.typography.fontDemiSm,
  "& .MuiButton-startIcon": {
    marginRight: "0.38rem",
  },
  "&:hover": {
    scale: "1.04",
    transition: "all 0.1s ease-in  ",
    backgroundColor: "transparent",
  },
}));
