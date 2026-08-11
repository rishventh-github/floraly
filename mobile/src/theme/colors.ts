export type AppColors = {
  forest950: string;
  forest800: string;
  forest700: string;
  forest600: string;
  moss400: string;
  moss300: string;
  cream50: string;
  cream100: string;
  /** Pure white — overlays, text on photos/buttons */
  white: string;
  /** Elevated cards / sheets */
  surface: string;
  stone200: string;
  stone400: string;
  stone500: string;
  stone600: string;
  rose500: string;
  rose50: string;
  amber50: string;
};

export const lightColors: AppColors = {
  forest950: "#0B1F14",
  forest800: "#1B4332",
  forest700: "#2D6A4F",
  forest600: "#40916C",
  moss400: "#95D5B2",
  moss300: "#B7E4C7",
  cream50: "#F8F6F1",
  cream100: "#F1EEE6",
  white: "#FFFFFF",
  surface: "#FFFFFF",
  stone200: "#E7E5E4",
  stone400: "#A8A29E",
  stone500: "#78716C",
  stone600: "#57534E",
  rose500: "#F43F5E",
  rose50: "#FFF1F2",
  amber50: "#FFFBEB",
};

export const darkColors: AppColors = {
  forest950: "#07140E",
  forest800: "#E4EBE3",
  forest700: "#B7C9B8",
  forest600: "#40916C",
  moss400: "#6F9A72",
  moss300: "#2F4A38",
  cream50: "#152018",
  cream100: "#0C1410",
  white: "#FFFFFF",
  surface: "#1A2620",
  stone200: "#2A3830",
  stone400: "#8A968C",
  stone500: "#A3AEA5",
  stone600: "#C2CBC3",
  rose500: "#FB7185",
  rose50: "#2A1518",
  amber50: "#2A2410",
};

/** @deprecated Prefer useTheme().colors — kept for gradual migration. */
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
