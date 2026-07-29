import type { Metadata } from "next";

// noindex across the attempt surface: an indexed attempt URL is a question paper in a search result.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
