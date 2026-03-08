/**
 * @file constants.js
 * @description Central store for all magic numbers and configuration values.
 *              Import from here rather than hardcoding values in modules.
 */

// ----- Priority scoring -----
export const PRIORITY_DECAY_DAYS  = 45;   // Half-life for exponential time decay
export const PRIORITY_LATEST_BOOST = 3;   // Weight multiplier for most recent attempt
export const PRIORITY_ATTEMPT_LOG  = 0.15; // Log scaling factor for attempt count bonus

// ----- Paper structure -----
/** Number of questions in each STEP paper */
export const PAPER_QUESTION_COUNT = { 1: 13, 2: 13, 3: 13 };
export const PAPERS = [1, 2, 3];

// ----- Timing -----
export const DEBOUNCE_MS         = 300;  // Firestore fetch debounce
export const DELETE_ARM_MS       = 2000; // Window to confirm delete
export const COMMIT_SUCCESS_MS   = 1200; // "Saved ✓" flash duration
export const SPLASH_DURATION_MS  = 4500; // Auto-close splash screen

// ----- Heatmap -----
export const HEATMAP_DAYS        = 120;  // How many days back to show

// ----- Screensaver / Lorenz -----
export const LORENZ_SIGMA        = 10;
export const LORENZ_RHO          = 28;
export const LORENZ_BETA         = 8 / 3;
export const LORENZ_DT           = 0.008;

// ----- Privileged users -----
/** UIDs that unlock easter-egg screensaver mode */
export const SUPER_USER_UIDS = new Set([
  "xc1CIaOlAzcF0PvouZpR8WxwaDG3"
]);

// ----- Data paths -----
export const QUESTIONS_JSON     = "data/questions.json";
export const QUESTION_TAGS_JSON = "data/question_tags.json";
export const BUILD_JSON         = "data/build.json";

/** Build a canonical question image path */
export function questionImagePath(year, paper, question) {
  return `assets/images/questions/${year}/S${paper}/Q${question}.png`;
}

/** Build a solution image path (index is 1-based) */
export function solutionImagePath(year, paper, question, index) {
  return `assets/images/solutions/${year}/S${paper}/Q${question}-${index}.jpg`;
}