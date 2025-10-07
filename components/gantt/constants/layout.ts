// Layout constants for Gantt chart components

export const GANTT_LAYOUT = {
  // Timeline dimensions
  DAY_WIDTH: 40,
  TASK_NAME_WIDTH: 256,

  // Row dimensions
  TASK_ROW_HEIGHT: 56, // h-14 in Tailwind (14 * 4 = 56px)
  GROUP_HEADER_HEIGHT: 40, // h-10 in Tailwind (10 * 4 = 40px)

  // Header dimensions (p-2 = 8px padding on all sides)
  MONTH_HEADER_HEIGHT: 38, // Content + padding: ~22px text + 16px padding (8px top + 8px bottom)
  DAY_HEADER_HEIGHT: 52, // Content + padding: ~36px text + 16px padding (8px top + 8px bottom)
  HEADER_HEIGHT: 90, // MONTH_HEADER_HEIGHT + DAY_HEADER_HEIGHT = 38 + 52

  // Task bar
  TASK_BAR_HEIGHT: 32, // h-8 in Tailwind (8 * 4 = 32px)
  TASK_BAR_MARGIN: 12, // Vertical margin for task bar centering
} as const;
