"use server";

// PRD v4 §7 Step 15g: actions on the Questions tab (docs/PRD-ai-assistant.md
// §3.C). Answers go into the hidden answer pool and apply to future questions
// only (D12, D38); promoting to the visible FAQ or training Q&A is explicit.
import {
  getPool, answerQuestions, dismissQuestion, retireAnswer, addAnswerToFaq, addAnswerToTraining, type AnswerAuthor,
} from "@nfc/db";
import { getActionStore, getCurrentAdminSession } from "@/current-store.js";
import { revalidatePath } from "next/cache";

type Result = { error?: string };
const MAX_ANSWER_CHARS = 1500;

const pool = () => getPool({ connectionString: process.env.DATABASE_URL });
const done = (productId: string): Result => {
  revalidatePath("/questions");
  revalidatePath(`/questions/${productId}`);
  return {};
};

async function author(): Promise<AnswerAuthor> {
  const session = await getCurrentAdminSession(pool());
  if (session?.role === "manager") return { role: session.level, staffId: session.staffId };
  return { role: "owner", staffId: null };   // owners, and the founder as super admin
}

export async function answerAction(
  shop: string,
  productId: string,
  input: { themeId: string | null; questionId: string | null; question: string; answer: string },
): Promise<Result> {
  const store = await getActionStore(pool(), shop, "questions");
  if (!store) return { error: "Not allowed" };
  const question = input.question.trim();
  const answer = input.answer.trim();
  if (!question) return { error: "Write the question first" };
  if (!answer) return { error: "Write an answer first" };
  if (answer.length > MAX_ANSWER_CHARS) return { error: "Keep the answer under 1,500 characters" };
  const saved = await answerQuestions(pool(), store.id, productId, {
    themeId: input.themeId, questionId: input.questionId, question, answer, author: await author(),
  });
  if (!saved) return { error: "Product not found" };
  return done(productId);
}

export async function dismissQuestionAction(shop: string, productId: string, questionId: string): Promise<Result> {
  const store = await getActionStore(pool(), shop, "questions");
  if (!store) return { error: "Not allowed" };
  if (!(await dismissQuestion(pool(), store.id, questionId))) return { error: "Question not found" };
  return done(productId);
}

export async function retireAnswerAction(shop: string, productId: string, answerId: string): Promise<Result> {
  const store = await getActionStore(pool(), shop, "questions");
  if (!store) return { error: "Not allowed" };
  if (!(await retireAnswer(pool(), store.id, answerId))) return { error: "Answer not found" };
  return done(productId);
}

export async function promoteAction(shop: string, productId: string, to: "faq" | "training", question: string, answer: string): Promise<Result> {
  const store = await getActionStore(pool(), shop, "questions");
  if (!store) return { error: "Not allowed" };
  const add = to === "faq" ? addAnswerToFaq : addAnswerToTraining;
  if (!(await add(pool(), store.id, productId, question, answer))) return { error: "Product not found" };
  revalidatePath(`/enrichment/${productId}`);
  return done(productId);
}
