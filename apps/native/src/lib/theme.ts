/**
 * D007-compliant theme constants — clean/minimal light theme.
 *
 * Background: white. Text: near-black. Accent: system blue.
 * Used across all native screens for visual consistency.
 */

export const colors = {
  /** Primary background (screens, cards) */
  background: "#FFFFFF",
  /** Secondary/subtle background (grouped sections, inputs) */
  backgroundSecondary: "#F5F5F5",
  /** Primary text color */
  text: "#1A1A1A",
  /** Secondary/muted text */
  textSecondary: "#6B7280",
  /** Placeholder text */
  textPlaceholder: "#9CA3AF",
  /** Primary accent — system blue */
  accent: "#007AFF",
  /** Destructive action color */
  destructive: "#FF3B30",
  /** Success/positive color */
  success: "#34C759",
  /** Border / separator */
  border: "#E5E7EB",
  /** Tab bar background */
  tabBar: "#FFFFFF",
  /** Tab bar border (top edge) */
  tabBarBorder: "#E5E7EB",
  /** Active tab icon/label */
  tabActive: "#007AFF",
  /** Inactive tab icon/label */
  tabInactive: "#8E8E93",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const fontFamily = {
  regular: "Regular",
  medium: "Medium",
  semiBold: "SemiBold",
  bold: "Bold",
} as const;
