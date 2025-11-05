import React, { useState, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { ProcessedStudentData } from '../types';
import { ProgressBar } from '../components/ProgressBar';

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center space-x-2 space-x-reverse">
    <div className="w-4 h-4 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-4 h-4 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-4 h-4 rounded-full bg-amber-500 animate-bounce"></div>
    <span className="text-stone-600 font-medium">جاري إنشاء التقرير...</span>
  </div>
);


const StudentFollowUpPage: React.FC<{ students: ProcessedStudentData[] }> = ({ students }) => {
  const [selectedCircle, setSelectedCircle] = useState('');
  const [selectedStudentUsername, setSelectedStudentUsername] = useState<number | ''>('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const circles = useMemo(() => {
    const circleSet = new Set<string>();
    students.forEach(s => s.circle && circleSet.add(s.circle));
    return Array.from(circleSet).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [students]);

  const studentsInCircle = useMemo(() => {
    if (!selectedCircle) return [];
    const studentMap = new Map<number, string>();
    students
        .filter(s => s.circle === selectedCircle && s.studentName && s.username)
        .forEach(s => studentMap.set(s.username, s.studentName));
    return Array.from(studentMap.entries())
        .map(([username, studentName]) => ({ username, studentName }))
        .sort((a, b) => a.studentName.localeCompare(b.studentName, 'ar'));
  }, [students, selectedCircle]);
  
  const selectedStudentData = useMemo(() => {
    if (!selectedStudentUsername) return [];
    return students
        .filter(s => s.username === selectedStudentUsername)
        .sort((a, b) => (a.week || '').localeCompare(b.week || '', 'ar'));
  }, [students, selectedStudentUsername]);

  const selectedStudentName = useMemo(() => {
    return selectedStudentData.length > 0 ? selectedStudentData[0].studentName : '';
  }, [selectedStudentData]);

  const handleCircleChange = (circle: string) => {
    setSelectedCircle(circle);
    setSelectedStudentUsername('');
    setSummary('');
    setError(null);
  };

  const handleStudentChange = (usernameStr: string) => {
    const username = Number(usernameStr);
    setSelectedStudentUsername(username || '');
    setSummary('');
    setError(null);
  };

  const handleGenerateSummary = async () => {
    if (selectedStudentData.length === 0) return;

    setIsLoading(true);
    setSummary('');
    setError(null);

    const dataToString = selectedStudentData.map(s => 
      `الأسبوع (${s.week || 'غير محدد'}) في حلقة (${s.circle}): الحفظ ${s.memorizationPages.formatted}, المراجعة ${s.reviewPages.formatted}, التثبيت ${s.consolidationPages.formatted}, الحضور ${(s.attendance * 100).toFixed(0)}%, النقاط ${s.totalPoints}`
    ).join('\n');

    const prompt = `
        أنت مشرف تعليمي خبير في تحليل أداء الطلاب في حلقات تحفيظ القرآن الكريم.
        أمامك بيانات طالب خلال عدة أسابيع. اسم الطالب: ${selectedStudentName}.

        البيانات:
        ${dataToString}

        المطلوب منك كتابة تقرير موجز ومحفز عن أداء الطالب باللغة العربية. يجب أن يتضمن التقرير النقاط التالية:
        1. تحليل عام لمستوى الطالب في الحفظ والمراجعة والتثبيت ضمن حلقته/حلقاته.
        2. الإشارة إلى نقاط القوة والتميز لدى الطالب.
        3. تحديد الجوانب التي تحتاج إلى تحسين وتطوير.
        4. تقديم توصيات ونصائح عملية للطالب وولي أمره.
        5. الحفاظ على لغة إيجابية ومحفزة.

        اجعل التقرير على شكل فقرات واضحة ومنظمة.
    `;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setSummary(response.text);

    } catch (err) {
      console.error("Error generating summary:", err);
      setError("حدث خطأ أثناء إنشاء التقرير. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-lg border border-stone-200">
        <h2 className="text-xl font-bold text-stone-800 mb-4">اختيار الطالب</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="circle-select" className="block text-sm font-medium text-stone-700 mb-2">الحلقة</label>
            <select id="circle-select" value={selectedCircle} onChange={(e) => handleCircleChange(e.target.value)} className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md">
                <option value="">-- اختر الحلقة --</option>
                {circles.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="student-select" className="block text-sm font-medium text-stone-700 mb-2">الطالب</label>
            <select id="student-select" value={selectedStudentUsername} onChange={(e) => handleStudentChange(e.target.value)} disabled={!selectedCircle} className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md disabled:bg-stone-100">
                <option value="">-- اختر الطالب --</option>
                {studentsInCircle.map(s => <option key={s.username} value={s.username}>{s.studentName}</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedStudentData.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-stone-200">
          <h3 className="text-lg font-bold text-stone-800 mb-4">بيانات الطالب: {selectedStudentName}</h3>
          <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-100">
                    <tr>
                        <th className="px-4 py-3 text-center text-sm font-bold text-stone-700">الأسبوع</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-stone-700">الحلقة</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-stone-700">الحفظ</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-stone-700">المراجعة</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-stone-700">التثبيت</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-stone-700">الحضور</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-stone-700">النقاط</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-200">
                    {selectedStudentData.map(s => (
                        <tr key={s.week}>
                            <td className="px-4 py-3 text-sm text-center text-stone-800 font-medium">{s.week}</td>
                            <td className="px-4 py-3 text-sm text-center text-stone-600">{s.circle}</td>
                            <td className="px-4 py-3 text-sm text-center text-stone-600">{s.memorizationPages.formatted}</td>
                            <td className="px-4 py-3 text-sm text-center text-stone-600">{s.reviewPages.formatted}</td>
                            <td className="px-4 py-3 text-sm text-center text-stone-600">{s.consolidationPages.formatted}</td>
                            <td className="px-4 py-3 text-sm text-center text-stone-600">
                                <div className="w-24 mx-auto">
                                    <ProgressBar value={s.attendance} />
                                    <p className="text-xs mt-1">{(s.attendance * 100).toFixed(0)}%</p>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-stone-800 font-bold">{s.totalPoints}</td>
                        </tr>
                    ))}
                </tbody>
             </table>
          </div>
          <div className="mt-6 text-center">
            <button 
              onClick={handleGenerateSummary} 
              disabled={isLoading}
              className="px-6 py-3 text-base font-semibold text-stone-900 bg-amber-500 rounded-md shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-150 disabled:bg-amber-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'جاري التحليل...' : 'إنشاء تقرير بالذكاء الاصطناعي'}
            </button>
          </div>
          
          {(isLoading || error || summary) && (
            <div className="mt-6 bg-stone-50 p-6 rounded-lg border border-stone-200">
              <h4 className="text-md font-bold text-stone-800 mb-4">التقرير التحليلي</h4>
              {isLoading && <LoadingSpinner />}
              {error && <p className="text-red-600 text-center">{error}</p>}
              {summary && <p className="text-stone-700 whitespace-pre-wrap leading-relaxed">{summary}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentFollowUpPage;