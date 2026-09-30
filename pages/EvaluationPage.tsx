
import React, { useState, useMemo, useEffect } from 'react';
import type { EvalSubmissionPayload, EvalQuestion, ProcessedEvalResult, AuthenticatedUser, TeacherInfo } from '../types';
import PastEvaluationsTable from '../components/PastEvaluationsTable';

interface EvaluationPageProps {
  onSubmit: (data: EvalSubmissionPayload) => Promise<void>;
  isSubmitting: boolean;
  authenticatedUser: AuthenticatedUser;
  evalQuestions: EvalQuestion[];
  evalResults: ProcessedEvalResult[];
  evalHeaderMap: Map<number, string>;
  allTeachers: TeacherInfo[];
  onSelectReport?: (report: ProcessedEvalResult) => void;
}

const EvaluationPage: React.FC<EvaluationPageProps> = ({ onSubmit, isSubmitting, authenticatedUser, evalQuestions, evalResults, evalHeaderMap, allTeachers, onSelectReport }) => {
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedCircle, setSelectedCircle] = useState('');
  const [scores, setScores] = useState<Record<number, number | ''>>({});
  const [error, setError] = useState<string | null>(null);

  const maxTotalScore = useMemo(() => {
    return evalQuestions.reduce((sum, q) => sum + q.mark, 0);
  }, [evalQuestions]);

  const currentTotalScore = useMemo(() => {
    return Object.values(scores).reduce((sum: number, score) => sum + (Number(score) || 0), 0);
  }, [scores]);

  const resetForm = () => {
      setSelectedTeacher('');
      setSelectedCircle('');
      setScores({});
      setError(null);
  };

  // تصفية المعلمين بناءً على صلاحيات المستخدم (مشرف أو مدير)
  const manageableTeachers = useMemo(() => {
    if (authenticatedUser.role === 'admin') {
      return allTeachers;
    }
    const supervisorCircles = new Set(authenticatedUser.circles);
    // تصفية المعلمين الذين لديهم حلقة واحدة على الأقل تتبع لهذا المشرف
    return allTeachers.filter(t => {
        const teacherCircles = t.circle.split(/[،,]/).map(c => c.trim());
        return teacherCircles.some(c => supervisorCircles.has(c));
    });
  }, [allTeachers, authenticatedUser]);
  
  const teacherNames = useMemo(() => {
    const teacherSet = new Set<string>(manageableTeachers.map(t => t.name).filter(item => item));
    return Array.from(teacherSet).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [manageableTeachers]);

  // استخراج الحلقات المرتبطة بالمعلم المختار
  const availableCircles = useMemo(() => {
    if (!selectedTeacher) return [];
    
    // البحث عن جميع السجلات لهذا المعلم
    const teacherRecords = manageableTeachers.filter(t => t.name === selectedTeacher);
    const circleSet = new Set<string>();
    
    teacherRecords.forEach(t => {
        t.circle.split(/[،,]/).forEach(c => {
            const trimmedCircle = c.trim();
            if (trimmedCircle) {
                // إذا كان المستخدم مشرفاً، نظهر فقط الحلقات التي تحت إشرافه لهذا المعلم
                if (authenticatedUser.role === 'admin' || authenticatedUser.circles.includes(trimmedCircle)) {
                    circleSet.add(trimmedCircle);
                }
            }
        });
    });

    return Array.from(circleSet).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [manageableTeachers, selectedTeacher, authenticatedUser]);

  const filteredPastEvaluations = useMemo(() => {
    if (authenticatedUser.role === 'admin') {
      return evalResults;
    }
    const supervisorCircles = new Set(authenticatedUser.circles);
    return evalResults.filter(result => supervisorCircles.has(result.circleName));
  }, [evalResults, authenticatedUser]);

  useEffect(() => {
    if (availableCircles.length > 0) {
      setSelectedCircle(availableCircles[0]);
    } else {
      setSelectedCircle('');
    }
    setScores({});
  }, [selectedTeacher, availableCircles]);

  const handleSetAllMaxScores = () => {
    const maxScores: Record<number, number> = {};
    evalQuestions.forEach(q => {
      maxScores[q.id] = q.mark;
    });
    setScores(maxScores);
  };

  const handleResetScores = () => {
    setScores({});
  };

  const getQuickSteps = (maxMark: number): number[] => {
    if (maxMark <= 5) {
      return Array.from({ length: maxMark + 1 }, (_, i) => i);
    }
    if (maxMark === 10) {
      return [0, 2, 4, 6, 8, 10];
    }
    if (maxMark === 15) {
      return [0, 3, 6, 9, 12, 15];
    }
    const step = Math.max(1, Math.round(maxMark / 5));
    const steps: number[] = [];
    for (let i = 0; i < maxMark; i += step) {
      steps.push(i);
    }
    if (!steps.includes(maxMark)) steps.push(maxMark);
    return steps;
  };

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

    setError(null);

    const payload: EvalSubmissionPayload = {
      sheet: 'Eval_result',
      'المعلم': selectedTeacher,
      'الحلقة': selectedCircle,
    };

    evalQuestions.forEach(q => {
        const header = evalHeaderMap.get(q.id);
        const payloadKey = header || q.que.trim();
        payload[payloadKey] = Number(scores[q.id] || 0);
    });
    
    await onSubmit(payload);
    resetForm();
  };
  
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white p-5 md:p-8 rounded-2xl shadow-xl border border-stone-200">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-stone-100 gap-4">
            <div>
                <h2 className="text-2xl font-bold text-stone-800">نموذج زيارة معلم حلقة</h2>
                <p className="text-stone-500 mt-1 text-sm">نموذج سريع ومبسط لتقييم زيارة المعلم في الحلقة</p>
            </div>
            <div className="flex items-center gap-2 bg-stone-900 text-white px-5 py-3 rounded-xl shadow border-b-2 border-amber-500">
                <span className="text-xs text-stone-300 font-semibold ml-2">المجموع:</span>
                <span className="text-2xl font-extrabold text-amber-400">{currentTotalScore}</span>
                <span className="text-xs text-stone-400">/ {maxTotalScore}</span>
            </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200/70">
                <div>
                    <label htmlFor="teacher-select" className="block text-sm font-bold text-stone-700 mb-1.5">المعلم</label>
                    <select id="teacher-select" value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} required className="block w-full px-3 py-2.5 text-base bg-white border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-lg shadow-sm">
                        <option value="">-- اختر المعلم --</option>
                        {teacherNames.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="circle-select" className="block text-sm font-bold text-stone-700 mb-1.5">الحلقة</label>
                    <select id="circle-select" value={selectedCircle} onChange={(e) => setSelectedCircle(e.target.value)} required disabled={!selectedTeacher} className="block w-full px-3 py-2.5 text-base bg-white border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-lg disabled:bg-stone-100 shadow-sm">
                        <option value="">-- اختر الحلقة --</option>
                        {availableCircles.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {evalQuestions.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-50/70 px-4 py-2.5 rounded-xl border border-amber-200/60">
                    <span className="text-xs font-bold text-amber-900">اختصارات سريعة للدرجات:</span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSetAllMaxScores}
                            className="px-3 py-1.5 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                        >
                            الدرجة الكاملة للكل ({maxTotalScore})
                        </button>
                        <button
                            type="button"
                            onClick={handleResetScores}
                            className="px-3 py-1.5 text-xs font-bold bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-colors"
                        >
                            تصفير الكل (0)
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {evalQuestions.map(q => {
                    const currentVal = Number(scores[q.id] ?? 0);
                    const quickSteps = getQuickSteps(q.mark);
                    return (
                        <div key={q.id} className="p-4 rounded-xl border border-stone-200 bg-stone-50/40 hover:bg-white hover:shadow-sm transition-all">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                <div className="flex items-start gap-2.5 flex-1">
                                    <span className="bg-amber-500 text-stone-900 font-bold w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 text-xs mt-0.5">{q.id}</span>
                                    <div className="space-y-1">
                                        <label htmlFor={`q-${q.id}`} className="text-sm font-bold text-stone-800 cursor-pointer block">
                                            {q.que}
                                            <span className="inline-block mr-2 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">الدرجة: {q.mark}</span>
                                        </label>
                                        {q.tip && (
                                            <p className="text-xs text-stone-500 leading-relaxed">{q.tip}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {quickSteps.map(stepVal => (
                                            <button
                                                key={stepVal}
                                                type="button"
                                                onClick={() => setScores(prev => ({ ...prev, [q.id]: stepVal }))}
                                                className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-xs font-bold border transition-all ${
                                                    currentVal === stepVal
                                                        ? 'bg-amber-500 text-stone-900 border-amber-600 shadow-sm scale-105'
                                                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                                                }`}
                                            >
                                                {stepVal}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="number"
                                        id={`q-${q.id}`}
                                        value={scores[q.id] ?? 0}
                                        onFocus={e => e.target.select()}
                                        onChange={e => handleScoreChange(q.id, e.target.value, q.mark)}
                                        min="0"
                                        max={q.mark}
                                        placeholder="0"
                                        className="w-20 h-9 text-center text-sm border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 rounded-lg font-extrabold text-stone-900 shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-stone-200">
                <div className="flex items-center gap-4 bg-stone-800 text-white px-6 py-3 rounded-xl shadow border-b-4 border-amber-500 w-full sm:w-auto justify-center">
                    <span className="text-sm font-bold text-stone-300">إجمالي الدرجة:</span>
                    <span className="text-3xl font-extrabold text-amber-400">{currentTotalScore} <span className="text-base text-stone-400 font-normal">/ {maxTotalScore}</span></span>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto h-12 px-10 text-base font-bold text-stone-900 bg-amber-500 rounded-xl shadow-lg hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-150 disabled:bg-amber-300 disabled:cursor-not-allowed">
                    {isSubmitting ? 'جاري الإرسال...' : 'إرسال تقرير الزيارة'}
                </button>
            </div>
            {error && <p className="text-red-600 text-sm font-bold text-center mt-2 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</p>}
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-xl border border-stone-200">
        <h3 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            سجل الزيارات السابقة
        </h3>
        <PastEvaluationsTable results={filteredPastEvaluations} onViewDetail={onSelectReport} />
      </div>
    </div>
  );
};

export default EvaluationPage;
