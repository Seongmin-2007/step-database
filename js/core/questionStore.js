/**
 * @file questionStore.js
 * @description Shared in-memory store for questions and tags loaded from JSON.
 *              Replaces window.__filteredQuestions and window.questionTags globals.
 *
 * Modules that need question data should import from here rather than
 * accessing window globals.
 */

import { QUESTIONS_JSON, QUESTION_TAGS_JSON } from "./constants.js";

/** @type {Object[]} Full list of all questions */
let allQuestions = [];

/** @type {Object[]} Currently filtered/visible questions (as used by the sidebar) */
let filteredQuestions = [];

/** @type {Record<string, string[]>} Map of image path → tag array */
let questionTags = {};

/** @type {boolean} */
let loaded = false;

// ─── Loaders ─────────────────────────────────────────────────────────────────

/**
 * Load questions and tags from JSON files.
 * Safe to call multiple times — only fetches once.
 * @returns {Promise<{ questions: Object[], tags: Record<string, string[]> }>}
 */
export async function loadQuestionData() {
  if (loaded) return { questions: allQuestions, tags: questionTags };

  const [questions, tags] = await Promise.all([
    fetch(QUESTIONS_JSON).then(r => r.json()),
    fetch(QUESTION_TAGS_JSON).then(r => r.json())
  ]);

  allQuestions  = questions;
  questionTags  = tags;
  loaded        = true;

  return { questions: allQuestions, tags: questionTags };
}

// ─── Accessors ────────────────────────────────────────────────────────────────

/** @returns {Object[]} */
export const getAllQuestions     = ()  => allQuestions;

/** @returns {Object[]} */
export const getFilteredQuestions = () => filteredQuestions;

/** @returns {Record<string, string[]>} */
export const getQuestionTags     = ()  => questionTags;

/**
 * Get the tags for a specific question.
 * @param   {string|number} year
 * @param   {string|number} paper
 * @param   {string|number} question
 * @returns {string[]}
 */
export function getTagsFor(year, paper, question) {
  const path = `assets/images/questions/${year}/S${paper}/Q${question}.png`;
  return questionTags[path] ?? [];
}

// ─── Mutators ─────────────────────────────────────────────────────────────────

/**
 * Update the list of filtered questions (called by the sidebar on each render).
 * @param {Object[]} list
 */
export function setFilteredQuestions(list) {
  filteredQuestions = list;
}