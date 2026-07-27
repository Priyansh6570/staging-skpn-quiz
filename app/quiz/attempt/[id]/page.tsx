import QuizScreen from "@/components/QuizScreen";

export default async function QuizAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuizScreen phase="attempt" attemptId={id} />;
}
