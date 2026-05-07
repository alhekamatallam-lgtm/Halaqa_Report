
import React, { useState, useMemo } from 'react';
import type { ProcessedEvalResult, AuthenticatedUser } from '../types';
import { ProgressBar } from '../components/ProgressBar';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 10;

interface EvaluationReportPageProps {
  evalResults: ProcessedEvalResult[];
  authenticatedUser: AuthenticatedUser | null;
  initialSelectedReport?: ProcessedEvalResult | null;
}

const EvaluationReportPage: React.FC<EvaluationReportPageProps> = ({ evalResults, authenticatedUser, initialSelectedReport }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<ProcessedEvalResult | null>(initialSelectedReport || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [printAllDetailed, setPrintAllDetailed] = useState(false);

  const filteredResults = useMemo(() => {
    let results = evalResults;
    
    // Filter by auth roles
    if (authenticatedUser) {
        if (authenticatedUser.role === 'supervisor') {
          const supervisorCircles = new Set(authenticatedUser.circles);
          results = results.filter(result => supervisorCircles.has(result.circleName));
        } else if (authenticatedUser.role === 'teacher') {
           results = results.filter(result => result.teacherName === authenticatedUser.name);
        }
    }

    // Filter by search term
    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        results = results.filter(r => 
            r.teacherName.toLowerCase().includes(lowerSearch) || 
            r.circleName.toLowerCase().includes(lowerSearch)
        );
    }

    return results;
  }, [evalResults, authenticatedUser, searchTerm]);

  const { paginatedResults, totalPages } = useMemo(() => {
    const total = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);
    const paginated = filteredResults.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
    return { paginatedResults: paginated, totalPages: total };
  }, [filteredResults, currentPage]);

  const handlePrint = () => {
    setPrintAllDetailed(false);
    setTimeout(() => window.print(), 100);
  };

  const handlePrintAllDetailed = () => {
    setPrintAllDetailed(true);
    setTimeout(() => {
        window.print();
        setPrintAllDetailed(false);
    }, 100);
  };

  if (selectedReport) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-stone-200 print-hidden">
             <button 
                onClick={() => setSelectedReport(null)}
                className="flex items-center gap-2 text-stone-600 hover:text-stone-900 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>العودة للقائمة</span>
            </button>
            <button 
                onClick={handlePrint}
                className="flex items-center gap-2 bg-amber-500 text-stone-900 px-6 py-2 rounded-lg font-bold hover:bg-amber-600 transition-all shadow-md"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>طباعة التقرير</span>
            </button>
        </div>

        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-stone-200 max-w-4xl mx-auto printable-area">
            {/* Header for Print */}
            <div className="text-center mb-10 border-b-2 border-stone-100 pb-8">
                <img src="https://i.ibb.co/ZzqqtpZQ/1-page-001-removebg-preview.png" alt="Logo" className="h-20 mx-auto mb-4" />
                <h1 className="text-3xl font-extrabold text-stone-800">تقرير زيارة معلم حلقة</h1>
                <div className="grid grid-cols-2 mt-6 gap-4 text-right">
                    <div>
                        <p className="text-stone-500 text-sm">اسم المعلم:</p>
                        <p className="text-lg font-bold text-stone-800">{selectedReport.teacherName}</p>
                    </div>
                    <div>
                        <p className="text-stone-500 text-sm">اسم الحلقة:</p>
                        <p className="text-lg font-bold text-stone-800">{selectedReport.circleName}</p>
                    </div>
                </div>
            </div>

            {/* Score Summary */}
            <div className="bg-stone-50 rounded-2xl p-6 mb-10 flex flex-col md:flex-row items-center justify-between gap-6 border border-stone-100">
                <div className="text-center md:text-right">
                    <h3 className="text-lg font-bold text-stone-700 mb-1">النتيجة النهائية</h3>
                    <p className="text-stone-500 text-sm">مستوى الأداء العام للمعلم في هذه الزيارة</p>
                </div>
                <div className="text-center bg-stone-800 text-white px-10 py-5 rounded-2xl shadow-xl border-b-4 border-amber-500">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">إجمالي الدرجة</p>
                    <p className="text-5xl font-black text-amber-400">{selectedReport.totalScore} <span className="text-xl text-stone-500 font-normal">/ {selectedReport.maxScore}</span></p>
                    <div className="mt-2 w-full max-w-[150px] mx-auto">
                        <ProgressBar value={selectedReport.maxScore > 0 ? selectedReport.totalScore / selectedReport.maxScore : 0} />
                    </div>
                </div>
            </div>

            {/* Detailed Questions */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-stone-800 mb-6 border-r-4 border-amber-500 pr-4">تفاصيل التقييم</h3>
                <div className="overflow-hidden border border-stone-200 rounded-xl">
                    <table className="min-w-full divide-y divide-stone-200">
                        <thead className="bg-stone-50">
                            <tr>
                                <th className="px-6 py-4 text-center text-xs font-bold text-stone-600 uppercase tracking-wider w-12">#</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-stone-600 uppercase tracking-wider">السؤال / المعيار</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-stone-600 uppercase tracking-wider w-32">الدرجة المستحقة</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-stone-600 uppercase tracking-wider w-32">الدرجة القصوى</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-stone-200">
                            {selectedReport.scores.map((score, idx) => (
                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/30'}>
                                    <td className="px-6 py-4 text-center text-sm text-stone-500 font-medium">{idx + 1}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-stone-800 leading-relaxed">{score.question}</td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${score.score >= (score.maxMark * 0.7) ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                            {score.score}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-stone-500 font-bold">{score.maxMark}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer for Print */}
            <div className="mt-16 pt-8 border-t border-stone-200 flex justify-between text-sm text-stone-400 font-medium">
                <p>تاريخ استخراج التقرير: {new Date().toLocaleDateString('ar-SA')}</p>
                <p>منصة التقارير التفاعلية</p>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-md border border-stone-200 print-hidden">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-stone-800">تقارير زيارات المعلمين</h2>
                        <p className="text-stone-500 text-sm mt-1">عرض وتحليل نتائج زيارات المعلمين في الحلقات</p>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                    <button 
                         onClick={handlePrint}
                         className="flex items-center justify-center gap-2 bg-stone-100 text-stone-700 px-4 py-2 rounded-lg font-bold hover:bg-stone-200 transition-all border border-stone-200 w-full md:w-auto"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>طباعة الجدول</span>
                    </button>
                    <button 
                         onClick={handlePrintAllDetailed}
                         className="flex items-center justify-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-lg font-bold hover:bg-amber-200 transition-all border border-amber-200 w-full md:w-auto"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>طباعة التقارير المفصلة</span>
                    </button>
                    <div className="relative w-full md:w-72">
                        <input 
                            type="text" 
                            placeholder="بحث عن معلم أو حلقة..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-4 pr-10 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-2.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden printable-area">
            {/* Header for List Print (hidden on screen) */}
            <div className="hidden print:block mb-8 text-center border-b-2 border-stone-100 pb-6">
                <img src="https://i.ibb.co/ZzqqtpZQ/1-page-001-removebg-preview.png" alt="Logo" className="h-16 mx-auto mb-3" />
                <h1 className="text-2xl font-bold text-stone-800">تقرير زيارات معلمي الحلقات</h1>
                <p className="text-stone-500 text-sm">{searchTerm ? `نتائج البحث عن: ${searchTerm}` : 'كافة الزيارات المسجلة'}</p>
            </div>

            <div className="overflow-x-auto print:hidden">
                <table className="min-w-full divide-y divide-stone-200">
                    <thead className="bg-stone-50">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-stone-600 uppercase tracking-wider w-12">#</th>
                            <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-stone-600 uppercase tracking-wider">المعلم</th>
                            <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-stone-600 uppercase tracking-wider">الحلقة</th>
                            <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-stone-600 uppercase tracking-wider">الدرجة</th>
                            <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-stone-600 uppercase tracking-wider">النسبة</th>
                            <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-stone-600 uppercase tracking-wider">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-stone-200">
                        {paginatedResults.map((item, index) => {
                            const percentage = item.maxScore > 0 ? Math.round((item.totalScore / item.maxScore) * 100) : 0;
                            const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                            return (
                                <tr key={item.id} className="hover:bg-amber-50/40 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500 font-medium text-center">{globalIndex}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-stone-900">{item.teacherName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">{item.circleName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-stone-800">
                                        {item.totalScore} / {item.maxScore}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className='w-32 mx-auto'>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-stone-500">{percentage}%</span>
                                            </div>
                                            <ProgressBar value={item.maxScore > 0 ? item.totalScore / item.maxScore : 0} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        <button 
                                            onClick={() => setSelectedReport(item)}
                                            className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-900 bg-amber-50 px-4 py-2 rounded-lg transition-colors border border-amber-100 group-hover:bg-amber-100"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            <span>التفاصيل</span>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="hidden print:block">
                {printAllDetailed ? (
                    <div className="space-y-8">
                        {filteredResults.map((report, rIdx) => (
                            <div key={report.id} className={`${rIdx < filteredResults.length - 1 ? 'page-break' : ''} p-8`}>
                                <div className="text-center mb-8 border-b border-stone-200 pb-6">
                                    <img src="https://i.ibb.co/ZzqqtpZQ/1-page-001-removebg-preview.png" alt="Logo" className="h-16 mx-auto mb-3" />
                                    <h1 className="text-2xl font-bold text-stone-800">تقرير زيارة معلم حلقة</h1>
                                    <div className="flex justify-between mt-4 text-right px-4">
                                        <p className="font-bold">المعلم: {report.teacherName}</p>
                                        <p className="font-bold">الحلقة: {report.circleName}</p>
                                    </div>
                                </div>
                                <div className="mb-6 flex justify-between items-center bg-stone-50 p-4 rounded-lg border border-stone-200">
                                    <p className="font-bold">الدرجة الإجمالية:</p>
                                    <p className="text-2xl font-black text-amber-600">{report.totalScore} / {report.maxScore}</p>
                                </div>
                                <table className="min-w-full border-collapse border border-stone-300 text-sm">
                                    <thead className="bg-stone-100">
                                        <tr>
                                            <th className="border border-stone-300 px-3 py-2 text-right">#</th>
                                            <th className="border border-stone-300 px-3 py-2 text-right">المعيار</th>
                                            <th className="border border-stone-300 px-3 py-2 text-center w-20">الدرجة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.scores.map((s, sIdx) => (
                                            <tr key={sIdx}>
                                                <td className="border border-stone-300 px-3 py-2 text-center">{sIdx + 1}</td>
                                                <td className="border border-stone-300 px-3 py-2">{s.question}</td>
                                                <td className="border border-stone-300 px-3 py-2 text-center font-bold">{s.score} / {s.maxMark}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="mb-8 text-center border-b-2 border-stone-100 pb-6">
                            <img src="https://i.ibb.co/ZzqqtpZQ/1-page-001-removebg-preview.png" alt="Logo" className="h-16 mx-auto mb-3" />
                            <h1 className="text-2xl font-bold text-stone-800">تقرير زيارات معلمي الحلقات</h1>
                            <p className="text-stone-500 text-sm">{searchTerm ? `نتائج البحث عن: ${searchTerm}` : 'كافة الزيارات المسجلة'}</p>
                        </div>
                        <table className="min-w-full border-collapse border border-stone-300">
                            <thead className="bg-stone-100">
                                <tr>
                                    <th className="border border-stone-300 px-4 py-3 text-center w-12">#</th>
                                    <th className="border border-stone-300 px-4 py-3 text-right">المعلم</th>
                                    <th className="border border-stone-300 px-4 py-3 text-right">الحلقة</th>
                                    <th className="border border-stone-300 px-4 py-3 text-center">الدرجة</th>
                                    <th className="border border-stone-300 px-4 py-3 text-center">النسبة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResults.map((item, idx) => {
                                    const percentage = item.maxScore > 0 ? Math.round((item.totalScore / item.maxScore) * 100) : 0;
                                    return (
                                        <tr key={item.id}>
                                            <td className="border border-stone-300 px-4 py-2 text-center">{idx + 1}</td>
                                            <td className="border border-stone-300 px-4 py-2 font-bold">{item.teacherName}</td>
                                            <td className="border border-stone-300 px-4 py-2">{item.circleName}</td>
                                            <td className="border border-stone-300 px-4 py-2 text-center">{item.totalScore} / {item.maxScore}</td>
                                            <td className="border border-stone-300 px-4 py-2 text-center font-bold">{percentage}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </>
                )}
            </div>

            {filteredResults.length === 0 && (
                <div className="px-6 py-20 text-center text-stone-500 print-hidden">
                    <div className="flex flex-col items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-stone-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium">لا توجد تقارير عرض حالياً</p>
                    </div>
                </div>
            )}

            {totalPages > 1 && (
                <div className="bg-stone-50 border-t border-stone-200 px-6 py-4 print-hidden">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    </div>
  );
};

export default EvaluationReportPage;
