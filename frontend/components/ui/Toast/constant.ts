export const TOAST_DURATION = {
  SHORT: 3000,
  DEFAULT: 5000,
  LONG: 7000,
} as const;

export const TOAST_POSITIONS = {
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
} as const;

export const TOAST_STYLES = {
  success: {
    container: "bg-green-50 border-green-200 text-green-800",
    icon: "text-green-600",
    closeButton: "text-green-600 hover:bg-green-100",
  },
  error: {
    container: "bg-red-50 border-red-200 text-red-800",
    icon: "text-red-600",
    closeButton: "text-red-600 hover:bg-red-100",
  },
  warning: {
    container: "bg-yellow-50 border-yellow-200 text-yellow-800",
    icon: "text-yellow-600",
    closeButton: "text-yellow-600 hover:bg-yellow-100",
  },
  info: {
    container: "bg-blue-50 border-blue-200 text-blue-800",
    icon: "text-blue-600",
    closeButton: "text-blue-600 hover:bg-blue-100",
  },
} as const;

