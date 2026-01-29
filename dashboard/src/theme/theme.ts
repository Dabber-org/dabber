"use client";
import { createTheme } from "@mui/material/styles";
import { darkPalette, lightPalette } from "./colors";
import { typographyTokens } from "./typography";

declare module "@mui/material/styles" {
  interface TypographyVariantsOptions {
    fontMediumBase: React.CSSProperties;
    fontDemi5xl: React.CSSProperties;
    fontMediumXl: React.CSSProperties;
    fontRegularBase: React.CSSProperties;
    fontDemi3xl: React.CSSProperties;
    fontDemi2xl: React.CSSProperties;
    fontMediumXs: React.CSSProperties;
    fontMediumSm: React.CSSProperties;
    fontDemiSm: React.CSSProperties;
    fontRegularSm: React.CSSProperties;
    fontDemiXl: React.CSSProperties;
    fontDemiBase: React.CSSProperties;
  }

  interface TypographyVariants {
    fontMediumBase: React.CSSProperties;
    fontDemi5xl: React.CSSProperties;
    fontMediumXl: React.CSSProperties;
    fontRegularBase: React.CSSProperties;
    fontDemi3xl: React.CSSProperties;
    fontDemi2xl: React.CSSProperties;
    fontMediumXs: React.CSSProperties;
    fontMediumSm: React.CSSProperties;
    fontDemiSm: React.CSSProperties;
    fontRegularSm: React.CSSProperties;
    fontDemiXl: React.CSSProperties;
    fontDemiBase: React.CSSProperties;
    fontDemi3_5xs: React.CSSProperties;
  }

  interface PaletteOptions {
    border?: {
      default: string;
      primary: string;
      subtle: string;
    };
    backdrop?: string;
    tag?: {
      dynamic: {
        text: string;
        bg: string;
      };
      static: {
        text: string;
        bg: string;
      };
    };
    status?: {
      success: {
        main: string;
        bg: string;
      };
      error: {
        main: string;
        bg: string;
      };
      warning: {
        main: string;
        bg: string;
      };
    };
  }

  interface TypeBackground {
    default: string;
    subtle: string;
    surface: string;
    subtle2: string;
  }

  interface TypeText {
    primary: string;
    secondary: string;
    muted: string;
    onAccent: string;
  }

  interface PaletteBackground {
    default: string;
    subtle: string;
    surface: string;
  }

  interface PaletteText {
    primary: string;
    secondary: string;
    muted: string;
  }

  interface Palette {
    border: {
      default: string;
      primary: string;
      subtle: string;
    };
    backdrop: string;
    tag: {
      dynamic: {
        text: string;
        bg: string;
      };
      static: {
        text: string;
        bg: string;
      };
    };
    status: {
      success: {
        main: string;
        bg: string;
      };
      error: {
        main: string;
        bg: string;
      };
      warning: {
        main: string;
        bg: string;
      };
    };
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    fontMediumBase: true;
    fontDemi5xl: true;
    fontMediumXl: true;
    fontRegularBase: true;
    fontDemi3xl: true;
    fontDemi2xl: true;
    fontMediumXs: true;
    fontMediumSm: true;
    fontDemiSm: true;
    fontRegularSm: true;
    fontDemiXl: true;
    fontDemiBase: true;
    fontDemi3_5xs: true;
  }
}

const theme = createTheme({
  colorSchemes: {
    light: {
      palette: lightPalette,
    },
    dark: {
      palette: darkPalette,
    },
  },
  typography: typographyTokens,

  components: {
    MuiTypography: {
      defaultProps: {
        color: "text.primary",
      },
    },
  },
  shape: {
    borderRadius: 16,
  },
  spacing: 16,
});

export default theme;
