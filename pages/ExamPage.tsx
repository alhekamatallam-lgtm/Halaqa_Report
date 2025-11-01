import React, { useState, useMemo, useEffect } from 'react';
import type { ProcessedStudentData, ExamSubmissionData } from '../types';

type AuthenticatedUser = { role: 'admin' | 'supervisor', name: string, circles: string[] };

interface ExamPageProps {
  onSubmit: (data: ExamSubmissionData) => Promise<void>;
  isSubmitting: boolean;
  students: ProcessedStudentData[];
  authenticatedUser: AuthenticatedUser;
}

const ExamPage: React.FC<ExamPageProps> = ({ onSubmit, isSubmitting, students, authenticatedUser }) => {
  const [selectedCircle, setSelectedCircle] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(''); // Stores JSON string of {studentName, circle}
  const [examName, setExamName] = useState('');
  const [scores, setScores] = useState<Array<number | ''>>(['', '', '', '', '']);
  const [totalScore, setTotalScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const latestWeek = useMemo(() => {
    if (!students || students.length === 0) return null;
    const allWeeks = [...new Set<string>(students.map(s => s.week).filter((w): w is string => !!w))];
    if (allWeeks.length === 0) return null;
    allWeeks.sort((a, b) => a.localeCompare(b, 'ar'));
    return allWeeks[allWeeks.length - 1];
  }, [students]);

  const studentsFromLatestWeek = useMemo(() => {
    if (!latestWeek) return students; // Fallback to all students if no weeks are defined
    return students.filter(s => s.week === latestWeek);
  }, [students, latestWeek]);

  const manageableStudents = useMemo(() => {
    if (authenticatedUser.role === 'admin') {
      return studentsFromLatestWeek;
    }
    const supervisorCircles = new Set(authenticatedUser.circles);
    return studentsFromLatestWeek.filter(s => supervisorCircles.has(s.circle));
  }, [studentsFromLatestWeek, authenticatedUser]);

  const circles = useMemo(() => {
    const circleSet = new Set<string>(manageableStudents.map(s => s.circle).filter(Boolean));
    return Array.from(circleSet).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [manageableStudents]);

  const availableStudents = useMemo(() => {
    if (!selectedCircle) return [];
    return manageableStudents.filter(s => s.circle === selectedCircle).sort((a, b) => a.studentName.localeCompare(b.studentName, 'ar'));
  }, [manageableStudents, selectedCircle]);

  useEffect(() => {
    const newTotal = scores.reduce((acc: number, score) => acc + (Number(score) || 0), 0);
    setTotalScore(newTotal);
  }, [scores]);

  useEffect(() => { setSelectedStudent(''); }, [selectedCircle]);

  const handleScoreChange = (index: number, value: string) => {
    const newScores = [...scores];
    const numValue = parseInt(value, 10);
    
    if (value === '') {
      newScores[index] = '';
    } else if (!isNaN(numValue)) {
      const clampedValue = Math.max(0, Math.min(20, numValue));
      newScores[index] = clampedValue;
    }
    setScores(newScores);
  };

  const resetForm = () => {
      setSelectedCircle('');
      setSelectedStudent('');
      setExamName('');
      setScores(['', '', '', '', '']);
      setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedStudent || !examName.trim()) {
      setError('الرجاء تعبئة جميع الحقول المطلوبة.');
      return;
    }

    const finalScores = scores.map(s => Number(s) || 0);
    if (finalScores.some(s => s < 0 || s > 20)) {
        setError('يجب أن تكون درجة كل سؤال بين 0 و 20.');
        return;
    }

    const studentData = JSON.parse(selectedStudent);
    const finalTotalScore = finalScores.reduce((a, b) => a + b, 0);

    const submissionData: ExamSubmissionData = {
      "الطالب": studentData.studentName,
      "الحلقة": studentData.circle,
      "الاختبار  ": examName.trim(),
      "السؤال الاول": finalScores[0],
      "السؤال الثاني": finalScores[1],
      "السؤال الثالث": finalScores[2],
      "السؤال الرابع": finalScores[3],
      "السؤال الخامس": finalScores[4],
      "إجمالي الدرجة": finalTotalScore,
    };
    
    await onSubmit(submissionData);
    resetForm();
  };

  return (
    <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-stone-200">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-stone-800">نموذج رصد درجات الاختبار</h2>
                <p className="text-stone-500 mt-2">
                    {latestWeek ? `يتم عرض الطلاب بناءً على بيانات آخر أسبوع (${latestWeek}).` : 'الرجاء إدخال بيانات الاختبار للطالب المختار.'}
                </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="circle-select" className="block text-sm font-medium text-stone-700 mb-2">الحلقة</label>
                        <select id="circle-select" value={selectedCircle} onChange={(e) => setSelectedCircle(e.target.value)} required className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md">
                            <option value="">-- اختر الحلقة --</option>
                            {circles.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="student-select" className="block text-sm font-medium text-stone-700 mb-2">الطالب</label>
                        <select id="student-select" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} required disabled={!selectedCircle} className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md disabled:bg-stone-100">
                            <option value="">-- اختر الطالب --</option>
                            {availableStudents.map(s => <option key={s.username} value={JSON.stringify({ studentName: s.studentName, circle: s.circle })}>{s.studentName}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="exam-name" className="block text-sm font-medium text-stone-700 mb-2">اسم الاختبار</label>
                    <input type="text" id="exam-name" value={examName} onChange={(e) => setExamName(e.target.value)} required placeholder="مثال: جزء 1 ف1" className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md" />
                </div>
                
                <div className="pt-4 border-t border-stone-200">
                    <h3 className="text-lg font-semibold text-stone-800 mb-4">الدرجات (من 20 لكل سؤال)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                        {scores.map((score, index) => (
                            <div key={index} className="md:col-span-1">
                                <label htmlFor={`score-${index}`} className="block text-sm font-medium text-stone-700 mb-2">{`السؤال ${index + 1}`}</label>
                                <input type="number" id={`score-${index}`} value={score} onChange={(e) => handleScoreChange(index, e.target.value)} required min="0" max="20" className="block w-full text-center py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md" />
                            </div>
                        ))}
                        <div className="col-span-2 md:col-span-1 bg-stone-100 p-4 rounded-lg text-center">
                            <label className="block text-sm font-medium text-stone-700">الإجمالي</label>
                            <p className="text-3xl font-bold text-amber-600 mt-2">{totalScore}</p>
                        </div>
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}

                <div className="flex justify-end pt-6 border-t border-stone-200">
                     <button type="submit" disabled={isSubmitting} className="w-full md:w-auto h-12 px-8 text-base font-semibold text-stone-900 bg-amber-500 rounded-md shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-150 disabled:bg-amber-400 disabled:cursor-not-allowed">
                        {isSubmitting ? 'جاري الإرسال...' : 'إرسال الدرجات'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default ExamPage;