import QuizScreen from "@/components/QuizScreen";

export default async function QuizSubmittedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuizScreen phase="submitted" attemptId={id} />;
}
