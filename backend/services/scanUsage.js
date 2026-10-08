import ScanUsage from "../models/ScanUsage.js";

// Google's standard (pay-as-you-go) prices in USD per 1M tokens. Output includes the
// model's "thinking" tokens. Source: ai.google.dev/gemini-api/docs/pricing (Oct 2026).
// Update these if Google changes its prices.
const PRICES = {
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-3.5-flash": { input: 1.5, output: 9.0 },
  "gemini-3.8-flash": { input: 1.5, output: 7.5 },
};
// gemini-3.8-flash has an introductory price until the end of 2026.
const INTRO_PRICES = { "gemini-3.8-flash": { input: 0.75, output: 3.75, until: Date.parse("2027-01-01T00:00:00Z") } };
// For a model not listed above, assume the most expensive known price so the budget errs on the safe side.
const FALLBACK_PRICE = { input: 1.5, output: 9.0 };

const priceFor = (model) => {
  const intro = INTRO_PRICES[model];
  if (intro && Date.now() < intro.until) return intro;
  return PRICES[model] ?? FALLBACK_PRICE;
};

const DEFAULT_MONTHLY_BUDGET_USD = 8;

export const monthlyBudgetUsd = () => {
  const value = Number.parseFloat(process.env.SCAN_MONTHLY_BUDGET_USD);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_MONTHLY_BUDGET_USD;
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

// Cost of one request from the token counts Gemini reports with every answer.
export const estimateCostUsd = (model, usage = {}) => {
  const price = priceFor(model);
  const input = usage.promptTokenCount ?? 0;
  const output = (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0);
  return { input, output, costUsd: (input * price.input + output * price.output) / 1_000_000 };
};

export async function recordCloudScan(model, usage) {
  const { input, output, costUsd } = estimateCostUsd(model, usage);
  await ScanUsage.updateOne(
    { month: currentMonth() },
    { $inc: { scans: 1, inputTokens: input, outputTokens: output, costUsd } },
    { upsert: true }
  );
  return costUsd;
}

export async function getMonthUsage() {
  const doc = await ScanUsage.findOne({ month: currentMonth() }).lean();
  const budgetUsd = monthlyBudgetUsd();
  const costUsd = doc?.costUsd ?? 0;
  return {
    month: currentMonth(),
    scans: doc?.scans ?? 0,
    costUsd,
    budgetUsd,
    budgetReached: costUsd >= budgetUsd,
  };
}
