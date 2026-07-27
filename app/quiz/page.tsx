import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { attempts } from "@/lib/models";
import { getSession } from "@/lib/session";
import QuizScreen from "@/components/QuizScreen";

export const dynamic = "force-dynamic";

/**
 * /quiz resolves against the student's actual attempt rather than being a screen of its own.
 * It used to render "your attempt is already recorded" unconditionally, so every CTA pointing here
 * told a freshly registered student they had already sat the paper.
 */
export default async function QuizPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const collection = await attempts();
  const attempt = await collection.findOne(
    { userId: new ObjectId(session.uid) },
    { projection: { status: 1 }, sort: { _id: -1 } },
  );

  if (!attempt) redirect("/quiz/rules");
  if (attempt.status === "in_progress") redirect(`/quiz/attempt/${attempt._id}`);

  return <QuizScreen phase="done" />;
}
