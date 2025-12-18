'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/utils/cookies';
import { useAuth } from '@/contexts/AuthContext';

interface QuestionMark {
  question_id: string;
  question_text: string;
  mark: number;
  max_mark?: number;
}

interface ExamResult {
  exam_id: string;
  exam_type: string;
  user_exam_id: string;
  completed_at: string;
  total_mark: number;
  max_mark?: number;
  questions: QuestionMark[];
}

interface ResultsData {
  user_id: string;
  exams: ExamResult[];
  total_exams: number;
  exams_with_marks: number;
  total_mark: number;
  average_mark: number;
}

export default function Result() {
  const [results, setResults] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) {
      fetchResults();
    }
  }, [isAuthenticated]);

  const getAuthHeaders = () => {
    const token = getCookie('accessToken') || getCookie('refreshToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError('');
      const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
      
      if (!apiUrl) {
        throw new Error('API backend URL is not configured');
      }

      const token = getCookie('accessToken') || getCookie('refreshToken');
      if (!token) {
        throw new Error('You must be logged in to view results');
      }

      const url = `${apiUrl}/api/results/marks`;
      console.log('Fetching results - URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      console.log('Results response status:', response.status);

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error(`API returned non-JSON response: ${text.substring(0, 100)}`);
      }

      const data = await response.json();
      console.log('Results response data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch results');
      }

      // Handle response structure: { message, data: { user_id, exams, ... } }
      if (data.data) {
        setResults(data.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching results:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching results');
    } finally {
      setLoading(false);
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
          <p className="text-gray-600 mb-6">You must be logged in to view your results.</p>
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Exam Results</h1>
              <p className="text-gray-600 mt-2">View your exam marks and performance</p>
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
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your results...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchResults}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results Summary */}
        {results && !loading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Exams</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{results.total_exams}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Exams with Marks</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{results.exams_with_marks}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Marks</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{results.total_mark}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Average Mark</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{results.average_mark.toFixed(1)}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Exams List */}
            {results.exams && results.exams.length > 0 ? (
              <div className="space-y-6">
                {results.exams.map((exam, examIndex) => (
                  <div key={exam.exam_id || examIndex} className="bg-white rounded-lg shadow-md overflow-hidden">
                    {/* Exam Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold mb-2">
                            Exam {examIndex + 1} - {exam.exam_type || 'IELTS Exam'}
                          </h2>
                          <p className="text-blue-100 text-sm">
                            Completed: {new Date(exam.completed_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-blue-100 mb-1">Total Score</p>
                          <p className="text-3xl font-bold">
                            {exam.total_mark}
                            {exam.max_mark && <span className="text-xl text-blue-200">/{exam.max_mark}</span>}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Questions and Marks */}
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Marks</h3>
                      {exam.questions && exam.questions.length > 0 ? (
                        <div className="space-y-4">
                          {exam.questions.map((question, qIndex) => (
                            <div
                              key={question.question_id || qIndex}
                              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                                      {qIndex + 1}
                                    </span>
                                    <span className="text-sm text-gray-500">Question {qIndex + 1}</span>
                                  </div>
                                  <p className="text-gray-800 leading-relaxed">{question.question_text}</p>
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                  <div className="text-right">
                                    <p className="text-sm text-gray-500 mb-1">Mark</p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-2xl font-bold text-green-600">
                                        {question.mark}
                                      </span>
                                      {question.max_mark && (
                                        <span className="text-lg text-gray-400">/{question.max_mark}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>No questions found for this exam.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Results Found</h3>
                <p className="text-gray-600 mb-6">You haven't completed any exams yet or marks are not available.</p>
                <button
                  onClick={() => router.push('/community')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Take an Exam
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

