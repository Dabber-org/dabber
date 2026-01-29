// primary
const PRIMARY_MAIN = "#009975";

// backgrounds
const DARK_BG_DEFAULT = "#0C0C0C";
const DARK_BG_SUBTLE = "#191919";
const DARK_BG_SURFACE = "#161616";

const LIGHT_BG_DEFAULT = "#FFFFFF";
const LIGHT_BG_SUBTLE = "#F7F8F9";
const LIGHT_BG_SURFACE = "#F4F4F4";

const BG_SUBTLE_2 = "rgba(0, 0, 0, 0.22)";

// text
const DARK_TEXT_PRIMARY = "#FFFFFF";
const DARK_TEXT_SECONDARY = "#ACACAC";
const DARK_TEXT_MUTED = "#636363";

const LIGHT_TEXT_PRIMARY = "#0D0D0F";
const LIGHT_TEXT_SECONDARY = "#4B4C4F";
const LIGHT_TEXT_MUTED = "#636363";

const TEXT_ON_ACCENT = "#FFFFFF";

// border
const DARK_BORDER_DEFAULT = "#262626";
const DARK_BORDER_PRIMARY = "#11D8A9";
const DARK_BORDER_SUBTLE = "#1C1C1C";

const LIGHT_BORDER_DEFAULT = "#EAEAEA";
const LIGHT_BORDER_PRIMARY = "#11D8A9";
const LIGHT_BORDER_SUBTLE = "#F0F0F0";

// backdrop
const DARK_BACKDROP = "rgba(0, 0, 0, 0.66)";
const LIGHT_BACKDROP = "rgba(208, 208, 208, 0.19)";

// tags
const TAG_DYNAMIC_TEXT = "#3B31FF";
const TAG_DYNAMIC_BG = "rgba(61, 53, 213, 0.06)";
const TAG_STATIC = "#FF7D2B";
const TAG_STATIC_BG = "rgba(255, 125, 43, 0.13)";

// status
const STATUS_SUCCESS_BG = "rgba(69, 255, 109, 0.15)";
const STATUS_SUCCESS = "#36D458";

const STATUS_ERROR_BG = "rgba(255, 23, 63, 0.07)";
const STATUS_ERROR = "#FF4A45";

const STATUS_WARNING_BG = "rgba(255, 230, 37, 0.14)";
const STATUS_WARNING = "#FFCC25";

export const lightPalette = {
  primary: {
    main: PRIMARY_MAIN,
  },
  background: {
    default: LIGHT_BG_DEFAULT,
    subtle: LIGHT_BG_SUBTLE,
    surface: LIGHT_BG_SURFACE,
    subtle2: BG_SUBTLE_2,
  },
  text: {
    primary: LIGHT_TEXT_PRIMARY,
    secondary: LIGHT_TEXT_SECONDARY,
    muted: LIGHT_TEXT_MUTED,
    onAccent: TEXT_ON_ACCENT,
  },
  divider: LIGHT_BORDER_DEFAULT,
  border: {
    default: LIGHT_BORDER_DEFAULT,
    primary: LIGHT_BORDER_PRIMARY,
    subtle: LIGHT_BORDER_SUBTLE,
  },
  backdrop: LIGHT_BACKDROP,
  tag: {
    dynamic: {
      text: TAG_DYNAMIC_TEXT,
      bg: TAG_DYNAMIC_BG,
    },
    static: {
      text: TAG_STATIC,
      bg: TAG_STATIC_BG,
    },
  },
  status: {
    success: {
      main: STATUS_SUCCESS,
      bg: STATUS_SUCCESS_BG,
    },
    error: {
      main: STATUS_ERROR,
      bg: STATUS_ERROR_BG,
    },
    warning: {
      main: STATUS_WARNING,
      bg: STATUS_WARNING_BG,
    },
  },
};

export const darkPalette = {
  primary: {
    main: PRIMARY_MAIN,
  },
  background: {
    default: DARK_BG_DEFAULT,
    subtle: DARK_BG_SUBTLE,
    surface: DARK_BG_SURFACE,
    subtle2: BG_SUBTLE_2,
  },
  text: {
    primary: DARK_TEXT_PRIMARY,
    secondary: DARK_TEXT_SECONDARY,
    muted: DARK_TEXT_MUTED,
    onAccent: TEXT_ON_ACCENT,
  },
  divider: DARK_BORDER_DEFAULT,
  border: {
    default: DARK_BORDER_DEFAULT,
    primary: DARK_BORDER_PRIMARY,
    subtle: DARK_BORDER_SUBTLE,
  },
  backdrop: DARK_BACKDROP,
  tag: {
    dynamic: {
      text: TAG_DYNAMIC_TEXT,
      bg: TAG_DYNAMIC_BG,
    },
    static: {
      text: TAG_STATIC,
      bg: TAG_STATIC_BG,
    },
  },
  status: {
    success: {
      main: STATUS_SUCCESS,
      bg: STATUS_SUCCESS_BG,
    },
    error: {
      main: STATUS_ERROR,
      bg: STATUS_ERROR_BG,
    },
    warning: {
      main: STATUS_WARNING,
      bg: STATUS_WARNING_BG,
    },
  },
};
