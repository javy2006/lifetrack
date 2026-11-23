import { QUIZ_QUESTIONS } from '../game/quiz.ts';

export type QuizAnswers = Partial<Record<string, string>>;

export function getQuizProgress(answers: QuizAnswers) {
  const answered = QUIZ_QUESTIONS.flatMap((question) => {
    const selectedOptionId = answers[question.id];
    if (selectedOptionId === undefined) return [];
    return [{
      question,
      selectedOptionId,
      selectedOption: question.options.find((option) => option.id === selectedOptionId) ?? null,
      correctOption: question.options.find((option) => option.id === question.correctOptionId)!,
      isCorrect: selectedOptionId === question.correctOptionId,
    }];
  });
  const currentQuestion = QUIZ_QUESTIONS.find((question) => answers[question.id] === undefined) ?? null;
  return { answered, currentQuestion, allAnswered: currentQuestion === null, total: QUIZ_QUESTIONS.length };
}
