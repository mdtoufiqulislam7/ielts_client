"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/utils/cookies';
import { useAuth } from '@/contexts/AuthContext';

interface Question {
  id: string;
  exam_id: string;
  question_text: string;
  created_by_ai: boolean;
}

interface Exam {
  id: string;
  exam_type: string;
  taken_at: string;
  user_id: string;
  questions: Question[];
  ai_generated: boolean;
}

interface UserExam {
  id: string;
  exam_id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  exam: {
    id: string;
    exam_type: string;
    questions: Question[];
  };
}

interface Answer {
  question_id: string;
  answer_text: string;
}

export default function Community() {
  const [exam, setExam] = useState<Exam | null>(null);
  const [userExam, setUserExam] = useState<UserExam | null>(null);
  const [userExamId, setUserExamId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(true);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) {
      createExam();
    }
  }, [isAuthenticated]);

  const getAuthHeaders = () => {
    const token = getCookie('accessToken') || getCookie('refreshToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const createExam = async () => {
    try {
      setCreating(true);
      setError('');
      const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
      if (!apiUrl) {
        throw new Error('API backend URL is not configured');
      }

      const token = getCookie('accessToken') || getCookie('refreshToken');
      if (!token) {
        throw new Error('You must be logged in to create an exam');
      }

      const response = await fetch(`${apiUrl}/api/exams/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          exam_type: 'written',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create exam');
      }

      // Handle response structure: { message, data: { id, exam_type, questions, ... } }
      if (data.data) {
        setExam(data.data);
        // Automatically start the exam after creation
        await startExam(data.data.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while creating exam');
    } finally {
      setCreating(false);
      setLoading(false);
    }
  };

  const startExam = async (examId: string) => {
    try {
      setStarting(true);
      setError('');
      const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
      if (!apiUrl) return;

      const response = await fetch(`${apiUrl}/api/exams/start`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          exam_id: examId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to start exam');
      }

      // Handle response: { message, data: { id: user_exam_id, exam: { questions }, ... } }
      if (data.data) {
        setUserExam(data.data);
        setUserExamId(data.data.id);
        // Update exam with questions from user exam
        if (data.data.exam) {
          setExam({
            ...exam!,
            questions: data.data.exam.questions || [],
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while starting exam');
    } finally {
      setStarting(false);
    }
  };

  const submitAnswer = async (questionId: string, answerText: string) => {
    if (!userExamId || !answerText.trim()) {
      setError('Please enter an answer before submitting');
      return;
    }

    try {
      setSubmitting(prev => ({ ...prev, [questionId]: true }));
      setError('');
      setSuccess('');
      const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
      if (!apiUrl) return;

      const response = await fetch(`${apiUrl}/api/exams/submit-answer`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          user_exam_id: userExamId,
          question_id: questionId,
          answer_text: answerText.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit answer');
      }

      setSuccess('Answer submitted successfully!');
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while submitting answer');
    } finally {
      setSubmitting(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const completeExam = async () => {
    if (!userExamId) {
      setError('No active exam found');
      return;
    }

    try {
      setCompleting(true);
      setError('');
      const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
      if (!apiUrl) return;

      const response = await fetch(`${apiUrl}/api/exams/complete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          user_exam_id: userExamId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to complete exam');
      }

      setSuccess('Exam completed successfully!');
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/deshboard');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while completing exam');
    } finally {
      setCompleting(false);
    }
  };

  if (!mounted) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">You must be logged in to take the exam.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">IELTS Writing Exam</h1>
              <p className="text-gray-600 mt-2">Practice your writing skills with AI-generated questions</p>
            </div>
            <button
              onClick={() => router.push('/deshboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {creating && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Creating your exam with AI-generated questions...</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Error State */}
        {error && !creating && !starting && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <p className="text-red-800">{error}</p>
            {!userExamId && (
              <button
                onClick={createExam}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Exam Questions */}
        {userExam && exam && exam.questions && exam.questions.length > 0 && (
          <div className="space-y-6">
            {/* Exam Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-800 font-medium">Exam ID: {exam.id}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Created: {new Date(exam.taken_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-800 font-medium">
                    {exam.questions.length} Questions
                  </p>
                  <p className="text-xs text-blue-600 mt-1">AI Generated</p>
                </div>
              </div>
            </div>

            {/* Questions List */}
            {exam.questions.map((question, index) => (
              <div
                key={question.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  {/* Question Number */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="flex-1">
                    <div className="mb-3">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        Question {index + 1}
                      </span>
                      {question.created_by_ai && (
                        <span className="ml-2 inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          AI Generated
                        </span>
                      )}
                    </div>
                    <p className="text-gray-800 text-lg leading-relaxed mb-4">
                      {question.question_text}
                    </p>

                    {/* Answer Textarea */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Answer
                      </label>
                      <textarea
                        rows={8}
                        value={answers[question.id] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Write your essay answer here. Aim for at least 250 words..."
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {answers[question.id]?.split(/\s+/).filter(word => word.length > 0).length || 0} words • Minimum 250 words recommended
                        </p>
                        <button
                          onClick={() => submitAnswer(question.id, answers[question.id] || '')}
                          disabled={!answers[question.id]?.trim() || submitting[question.id]}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting[question.id] ? 'Submitting...' : 'Submit Answer'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Exam Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    You have {exam.questions.length} questions to complete
                  </p>
                </div>
                 <div className="flex space-x-3">
                   <button
                     onClick={() => router.push('/deshboard')}
                     className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                   >
                     Back to Dashboard
                   </button>
                   <button
                     onClick={completeExam}
                     disabled={completing}
                     className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {completing ? 'Completing...' : 'Complete Exam'}
                   </button>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* No Questions State */}
        {exam && (!exam.questions || exam.questions.length === 0) && !creating && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600">No questions available. Please try creating a new exam.</p>
            <button
              onClick={createExam}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Exam
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

