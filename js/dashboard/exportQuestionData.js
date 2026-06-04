/**
 * @file exportQuestionData.js
 * @description Exports all attempted questions with their notes, times,
 *              difficulties, and tags to a downloadable file.
 *
 * Usage — call from the browser console or wire to a button:
 *
 *   import { exportQuestionData } from "./exportQuestionData.js";
 *   exportQuestionData("json");   // or "csv" or "txt"
 */

import { getAttempts }                    from "../core/attemptStore.js";
import { getAllQuestions, getTagsFor }     from "../core/questionStore.js";
import { parseQuestionID, makeQuestionID } from "../core/utils.js";
import { toDate }                          from "../core/utils.js";

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Collect all attempt data and trigger a file download.
 *
 * @param {"json"|"csv"|"txt"} format   Output format (default: "txt")
 */
export function exportQuestionData(format = "txt") {
  const attempts   = getAttempts();
  const questions  = getAllQuestions();
  const records    = _buildRecords(attempts, questions);

  let content, filename, mime;

  switch (format) {
    case "json":
      content  = _toJSON(records);
      filename = "step_questions.json";
      mime     = "application/json";
      break;
    case "csv":
      content  = _toCSV(records);
      filename = "step_questions.csv";
      mime     = "text/csv";
      break;
    default:
      content  = _toTXT(records);
      filename = "step_questions.txt";
      mime     = "text/plain";
  }

  _download(content, filename, mime);
}

// ─── Build records ────────────────────────────────────────────────────────────

/**
 * Aggregate all attempts per question into a single record.
 *
 * @param   {Object[]} attempts
 * @param   {Object[]} questions
 * @returns {Object[]}
 */
function _buildRecords(attempts, questions) {
  // Group attempts by questionID
  /** @type {Record<string, Object[]>} */
  const byQuestion = {};
  attempts.forEach(a => {
    (byQuestion[a.questionID] ??= []).push(a);
  });

  return Object.entries(byQuestion)
    .map(([qid, qAttempts]) => {
      const parsed = parseQuestionID(qid);
      const tags   = parsed
        ? getTagsFor(parsed.year, parsed.paper, parsed.question)
        : [];

      // Sort attempts oldest-first
      const sorted = [...qAttempts].sort((a, b) => {
        const ta = toDate(a.createdAt)?.getTime() ?? 0;
        const tb = toDate(b.createdAt)?.getTime() ?? 0;
        return ta - tb;
      });

      // Aggregate across attempts
      const ratedAttempts = sorted.filter(a => a.difficulty);
      const timedAttempts = sorted.filter(a => typeof a.time === "number");
      const notes         = sorted
        .map(a => (a.notes ?? "").trim())
        .filter(Boolean);
      const completed     = sorted.some(a => a.status === "completed");

      return {
        questionID:    qid,
        tags:          tags,
        status:        completed ? "completed" : "attempted",
        attemptCount:  sorted.length,

        // Times (seconds → minutes, rounded to 1dp)
        times_min:     timedAttempts.map(a => +(a.time / 60).toFixed(1)),
        avgTime_min:   timedAttempts.length
          ? +( timedAttempts.reduce((s, a) => s + a.time, 0) / timedAttempts.length / 60 ).toFixed(1)
          : null,

        // Difficulties (1–5 scale)
        difficulties:  ratedAttempts.map(a => a.difficulty),
        avgDifficulty: ratedAttempts.length
          ? +( ratedAttempts.reduce((s, a) => s + a.difficulty, 0) / ratedAttempts.length ).toFixed(2)
          : null,

        // Notes (one entry per attempt that had a note)
        notes:         notes,

        // Dates
        dates:         sorted.map(a => toDate(a.createdAt)?.toISOString().slice(0, 10) ?? "unknown"),
        lastAttempted: toDate(sorted.at(-1)?.createdAt)?.toISOString().slice(0, 10) ?? "unknown",
      };
    })
    .sort((a, b) => a.questionID.localeCompare(b.questionID));
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function _toJSON(records) {
  return JSON.stringify(records, null, 2);
}

function _toCSV(records) {
  const header = [
    "questionID", "status", "tags", "attemptCount",
    "avgTime_min", "times_min",
    "avgDifficulty", "difficulties",
    "notes", "lastAttempted", "dates"
  ].join(",");

  const rows = records.map(r => [
    r.questionID,
    r.status,
    `"${r.tags.join("; ")}"`,
    r.attemptCount,
    r.avgTime_min ?? "",
    `"${r.times_min.join("; ")}"`,
    r.avgDifficulty ?? "",
    `"${r.difficulties.join("; ")}"`,
    `"${r.notes.join(" | ").replace(/"/g, '""')}"`,
    r.lastAttempted,
    `"${r.dates.join("; ")}"`
  ].join(","));

  return [header, ...rows].join("\n");
}

function _toTXT(records) {
  const lines = [];

  lines.push("═".repeat(60));
  lines.push("  STEP Question Export");
  lines.push(`  Generated: ${new Date().toLocaleString("en-GB")}`);
  lines.push(`  Total questions: ${records.length}`);
  lines.push("═".repeat(60));
  lines.push("");

  records.forEach(r => {
    lines.push(`┌─ ${r.questionID}  [${r.status.toUpperCase()}]`);
    lines.push(`│  Tags:         ${r.tags.length ? r.tags.join(", ") : "—"}`);
    lines.push(`│  Attempts:     ${r.attemptCount}  (last: ${r.lastAttempted})`);

    if (r.avgTime_min !== null) {
      const timeDetail = r.times_min.length > 1
        ? `${r.avgTime_min} min avg  [${r.times_min.map(t => t + "m").join(", ")}]`
        : `${r.avgTime_min} min`;
      lines.push(`│  Time:         ${timeDetail}`);
    } else {
      lines.push(`│  Time:         —`);
    }

    if (r.avgDifficulty !== null) {
      const stars = "★".repeat(Math.round(r.avgDifficulty)) +
                    "☆".repeat(5 - Math.round(r.avgDifficulty));
      const diffDetail = r.difficulties.length > 1
        ? `${r.avgDifficulty} avg  [${r.difficulties.join(", ")}]  ${stars}`
        : `${r.avgDifficulty}  ${stars}`;
      lines.push(`│  Difficulty:   ${diffDetail}`);
    } else {
      lines.push(`│  Difficulty:   —`);
    }

    if (r.notes.length) {
      r.notes.forEach((note, i) => {
        const prefix = i === 0 ? "│  Notes:        " : "│                ";
        lines.push(`${prefix}${note}`);
      });
    } else {
      lines.push(`│  Notes:        —`);
    }

    lines.push("└" + "─".repeat(59));
    lines.push("");
  });

  return lines.join("\n");
}

// ─── Download helper ──────────────────────────────────────────────────────────

function _download(content, filename, mime) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}