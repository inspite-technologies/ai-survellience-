// Detect break type based on time
export const detectBreakType = (date) => {
  const hour = date.getHours();

  if (hour >= 10 && hour < 11) return "tea";
  if (hour >= 13 && hour < 15) return "lunch";
  if (hour >= 16 && hour < 17) return "snacks";

  return "none";
};

// Emoji for logs
export const getBreakEmoji = (type) => {
  switch (type) {
    case "tea":
      return "☕";
    case "lunch":
      return "🍛";
    case "snacks":
      return "🍪";
    default:
      return "⏱️";
  }
};

// Label for UI / logs
export const getBreakLabel = (type) => {
  switch (type) {
    case "tea":
      return "Tea Break";
    case "lunch":
      return "Lunch Break";
    case "snacks":
      return "Snacks Break";
    default:
      return "Work Session";
  }
};
