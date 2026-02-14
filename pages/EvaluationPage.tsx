
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
}

const EvaluationPage: React.FC<EvaluationPageProps> = ({ onSubmit, isSubmitting, authenticatedUser, evalQuestions, evalResults, evalHeaderMap, allTeachers }) => {
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
    <div className="space-y-8">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-stone-200">
        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-stone-800">نموذج زيارة معلم حلقة</h2>
            <p className="text-stone-500 mt-2 text-sm">قم بتعبئة التقييم بناءً على المعايير الموضحة لكل سؤال</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-stone-50 rounded-xl border border-stone-100">
                <div>
                    <label htmlFor="teacher-select" className="block text-sm font-bold text-stone-700 mb-2">المعلم</label>
                    <select id="teacher-select" value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} required className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md shadow-sm">
                        <option value="">-- اختر المعلم --</option>
                        {teacherNames.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="circle-select" className="block text-sm font-bold text-stone-700 mb-2">الحلقة</label>
                    <select id="circle-select" value={selectedCircle} onChange={(e) => setSelectedCircle(e.target.value)} required disabled={!selectedTeacher} className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md disabled:bg-stone-100 shadow-sm">
                        <option value="">-- اختر الحلقة --</option>
                        {availableCircles.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <div className="pt-4 space-y-6">
                {evalQuestions.map(q => (
                    <div key={q.id} className="space-y-2 border-b border-stone-100 pb-6 last:border-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                            <label htmlFor={`q-${q.id}`} className="md:col-span-2 text-sm font-bold text-stone-700 flex items-start gap-2">
                                <span className="bg-amber-100 text-amber-700 w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 text-xs">{q.id}</span>
                                <div>
                                    {q.que}
                                    <span className="block md:inline-block md:mr-2 text-xs font-normal text-stone-500">(الدرجة القصوى: {q.mark})</span>
                                </div>
                            </label>
                            <input
                                type="number"
                                id={`q-${q.id}`}
                                value={scores[q.id] ?? 0}
                                onChange={e => handleScoreChange(q.id, e.target.value, q.mark)}
                                min="0"
                                max={q.mark}
                                placeholder="0"
                                className="block w-full text-center py-2 text-base border border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md font-bold text-stone-800 shadow-sm"
                            />
                        </div>
                        {q.tip && (
                            <div className="mr-8 md:mr-10 flex items-start gap-2 text-xs text-stone-600 bg-amber-50/50 p-2 rounded border-r-2 border-amber-300 italic">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{q.tip}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-stone-200">
                <div className="text-center bg-stone-800 text-white px-8 py-4 rounded-2xl shadow-lg border-b-4 border-amber-500">
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">إجمالي الدرجة</label>
                    <p className="text-4xl font-extrabold text-amber-400 mt-1">{currentTotalScore} <span className="text-lg text-stone-500 font-normal">/ {maxTotalScore}</span></p>
                </div>
                 <button type="submit" disabled={isSubmitting} className="w-full md:w-auto h-14 px-12 text-lg font-bold text-stone-900 bg-amber-500 rounded-xl shadow-xl hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-150 disabled:bg-amber-400 disabled:cursor-not-allowed transform hover:-translate-y-1">
                    {isSubmitting ? 'جاري الإرسال...' : 'إرسال تقرير الزيارة'}
                </button>
            </div>
             {error && <p className="text-red-500 text-sm font-bold text-center mt-4 bg-red-50 p-2 rounded border border-red-100">{error}</p>}
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-xl border border-stone-200">
        <h3 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            سجل الزيارات السابقة
        </h3>
        <PastEvaluationsTable results={filteredPastEvaluations} />
      </div>
    </div>
  );
};

export default EvaluationPage;
