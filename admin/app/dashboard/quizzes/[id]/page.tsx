'use client';

import { useParams } from 'next/navigation';
import { QuizEditor } from '@/components/quiz-editor';

export default function EditQuizPage() {
  const { id } = useParams<{ id: string }>();
  return <QuizEditor quizId={id} />;
}
