const PROFANITIES = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "crap",
  "dick",
  "pussy"
];

/**
 * Moderation filter: replaces toxic words with asterisks.
 */
const cleanMessage = (text) => {
  if (!text) return "";
  let cleaned = text;
  
  PROFANITIES.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    cleaned = cleaned.replace(regex, "*".repeat(word.length));
  });

  return cleaned;
};

export { cleanMessage };
