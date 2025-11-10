import React, { useState, useMemo, useEffect } from 'react';
import type { EvalSubmissionPayload, ProcessedStudentData, EvalQuestion, ProcessedEvalResult } from '../types';
import PastEvaluationsTable from '../components/PastEvaluationsTable';

type AuthenticatedUser = { role: 'admin' | 'supervisor', name: string, circles: string[] };

interface EvaluationPageProps {
  onSubmit: (data: EvalSubmissionPayload) => Promise<void>;
  isSubmitting: boolean;
  students: ProcessedStudentData[];
  authenticatedUser: AuthenticatedUser;
  evalQuestions: EvalQuestion[];
  evalResults: ProcessedEvalResult[];
  evalHeaderMap: Map<number, string>;
}

const EvaluationPage: React.FC<EvaluationPageProps> = ({ onSubmit, isSubmitting, students, authenticatedUser, evalQuestions, evalResults, evalHeaderMap }) => {
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedCircle, setSelectedCircle] = useState('');
  const [scores, setScores] = useState<Record<number, number | ''>>({});
  const [error, setError] = useState<string | null>(null);

  const maxTotalScore = useMemo(() => {
    return evalQuestions.reduce((sum, q) => sum + q.mark, 0);
  }, [evalQuestions]);

  const currentTotalScore = useMemo(() => {
    // FIX: Explicitly type the accumulator `sum` to prevent TypeScript from inferring it as `unknown`.
    return Object.values(scores).reduce((sum: number, score) => sum + (Number(score) || 0), 0);
  }, [scores]);

  const resetForm = () => {
      setSelectedTeacher('');
      setSelectedCircle('');
      setScores({});
      setError(null);
  };

  const manageableStudents = useMemo(() => {
    if (authenticatedUser.role === 'admin') {
      return students;
    }
    const supervisorCircles = new Set(authenticatedUser.circles);
    return students.filter(s => supervisorCircles.has(s.circle));
  }, [students, authenticatedUser]);
  
  const teachers = useMemo(() => {
    const teacherSet = new Set<string>(manageableStudents.map(s => s.teacherName).filter(item => item));
    return Array.from(teacherSet).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [manageableStudents]);

  const availableCircles = useMemo(() => {
    if (!selectedTeacher) return [];
    const circleSet = new Set<string>(
        manageableStudents
            .filter(s => s.teacherName === selectedTeacher)
            .map(s => s.circle)
            .filter(item => item)
    );
    return Array.from(circleSet).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [manageableStudents, selectedTeacher]);

  useEffect(() => {
    setSelectedCircle('');
    setScores({});
  }, [selectedTeacher]);

  const handleScoreChange = (questionId: number, value: string, maxMark: number) => {
    const numValue = parseInt(value, 10);
    let finalValue: number | '' = '';
    
    if (value === '') {
      finalValue = '';
    } else if (!isNaN(numValue)) {
      finalValue = Math.max(0, Math.min(maxMark, numValue));
    } else {
        finalValue = scores[questionId] || '';
    }

    setScores(prev => ({ ...prev, [questionId]: finalValue }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCircle || !selectedTeacher) {
      setError('الرجاء اختيار المعلم والحلقة.');
      return;
    }

    const allQuestionsAnswered = evalQuestions.every(q => scores[q.id] !== undefined && scores[q.id] !== '');
    if (!allQuestionsAnswered) {
        setError('الرجاء إدخال درجة لجميع الأسئلة.');
        return;
    }

    setError(null);

    const payload: EvalSubmissionPayload = {
      sheet: 'Eval_result',
      'المعلم': selectedTeacher,
      'الحلقة': selectedCircle,
    };

    evalQuestions.forEach(q => {
        const header = evalHeaderMap.get(q.id);
        // Use the mapped header which is the source of truth for the column name.
        // Fallback to the question text from `eval` sheet if map is somehow incomplete.
        const payloadKey = header || q.que.trim();
        payload[payloadKey] = scores[q.id]!;
    });
    
    await onSubmit(payload);
    resetForm();
  };
  
  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-stone-200">
        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-stone-800">نموذج تقييم حلقة</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="teacher-select" className="block text-sm font-medium text-stone-700 mb-2">المعلم</label>
                    <select id="teacher-select" value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} required className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md">
                        <option value="">-- اختر المعلم --</option>
                        {teachers.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="circle-select" className="block text-sm font-medium text-stone-700 mb-2">الحلقة</label>
                    <select id="circle-select" value={selectedCircle} onChange={(e) => setSelectedCircle(e.target.value)} required disabled={!selectedTeacher} className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md disabled:bg-stone-100">
                        <option value="">-- اختر الحلقة --</option>
                        {availableCircles.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <div className="pt-4 border-t border-stone-200 space-y-4">
                {evalQuestions.map(q => (
                    <div key={q.id} className="grid grid-cols-3 gap-4 items-center">
                        <label htmlFor={`q-${q.id}`} className="col-span-2 text-sm font-medium text-stone-700">
                            <span className="font-bold text-amber-600">{q.id}.</span> {q.que} <span className="text-xs text-stone-500">(الدرجة: {q.mark})</span>
                        </label>
                        <input
                            type="number"
                            id={`q-${q.id}`}
                            value={scores[q.id] || ''}
                            onChange={e => handleScoreChange(q.id, e.target.value, q.mark)}
                            min="0"
                            max={q.mark}
                            className="block w-full text-center py-2 text-base border border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                        />
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-stone-200">
                <div className="text-center bg-stone-100 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-stone-700">الإجمالي</label>
                    <p className="text-3xl font-bold text-amber-600 mt-1">{currentTotalScore} <span className="text-lg text-stone-500">/ {maxTotalScore}</span></p>
                </div>
                 <button type="submit" disabled={isSubmitting} className="h-12 px-8 text-base font-semibold text-stone-900 bg-amber-500 rounded-md shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-150 disabled:bg-amber-400 disabled:cursor-not-allowed">
                    {isSubmitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
                </button>
            </div>
             {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-xl border border-stone-200">
        <h3 className="text-xl font-bold text-stone-800 mb-4">التقييمات السابقة</h3>
        <PastEvaluationsTable results={evalResults} />
      </div>
    </div>
  );
};

export default EvaluationPage;
