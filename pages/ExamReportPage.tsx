import React, { useState, useMemo } from 'react';
import type { ProcessedExamData } from '../types';
import ExamReportTable from '../components/ExamReportTable';
import Pagination from '../components/Pagination';
import { UsersIcon, ClipboardListIcon } from '../components/icons';

type SortKey = keyof ProcessedExamData;
const ITEMS_PER_PAGE = 15;

interface ExamReportPageProps {
  examData: ProcessedExamData[];
}

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; }> = ({ label, value, icon }) => (
  <div className="bg-white p-6 rounded-2xl shadow-lg flex items-center space-x-reverse space-x-4 border border-stone-200">
    <div className="flex-shrink-0 bg-amber-100 text-amber-600 rounded-full p-3">
      {icon}
    </div>
    <div>
        <p className="text-2xl font-bold text-stone-800">{value}</p>
        <p className="text-sm font-semibold text-stone-600">{label}</p>
    </div>
  </div>
);

const ExamReportPage: React.FC<ExamReportPageProps> = ({ examData }) => {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'totalScore', direction: 'descending' });
    const [currentPage, setCurrentPage] = useState(1);
    
    // Filters state
    const [searchStudent, setSearchStudent] = useState('');
    const [searchExam, setSearchExam] = useState('');
    const [selectedCircle, setSelectedCircle] = useState('');
    
    const circles = useMemo(() => {
        const circleSet = new Set<string>(examData.map(e => e.circle).filter(Boolean));
        return Array.from(circleSet).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [examData]);
    
    const { paginatedExams, totalPages, stats } = useMemo(() => {
        let filteredData = examData;

        if (searchStudent) {
            filteredData = filteredData.filter(e => e.studentName.toLowerCase().includes(searchStudent.toLowerCase()));
        }
        if (searchExam) {
            filteredData = filteredData.filter(e => e.examName.toLowerCase().includes(searchExam.toLowerCase()));
        }
        if (selectedCircle) {
            filteredData = filteredData.filter(e => e.circle === selectedCircle);
        }

        const sortedList = [...filteredData];
        if (sortConfig) {
            sortedList.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                let comparison = 0;

                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    comparison = aValue > bValue ? 1 : -1;
                } else {
                    comparison = String(aValue).localeCompare(String(bValue), 'ar');
                }
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        
        const currentStats = {
            testedStudentsCount: new Set(sortedList.map(d => d.studentName)).size,
            totalExamsCount: sortedList.length,
        };

        const total = Math.ceil(sortedList.length / ITEMS_PER_PAGE);
        const paginated = sortedList.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );

        return { paginatedExams: paginated, totalPages: total, stats: currentStats };
    }, [examData, sortConfig, currentPage, searchStudent, searchExam, selectedCircle]);

    const handleSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setSearchStudent('');
        setSearchExam('');
        setSelectedCircle('');
        setCurrentPage(1);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard label="عدد الطلاب المختبرين" value={stats.testedStudentsCount} icon={<UsersIcon className="w-7 h-7" />} />
                <StatCard label="إجمالي الاختبارات المرصودة" value={stats.totalExamsCount} icon={<ClipboardListIcon className="w-7 h-7" />} />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-stone-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label htmlFor="search-student" className="block text-sm font-medium text-stone-700 mb-2">بحث بالطالب</label>
                        <input type="text" id="search-student" value={searchStudent} onChange={e => setSearchStudent(e.target.value)} placeholder="ادخل اسم الطالب..." className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md" />
                    </div>
                     <div>
                        <label htmlFor="search-exam" className="block text-sm font-medium text-stone-700 mb-2">بحث بالاختبار</label>
                        <input type="text" id="search-exam" value={searchExam} onChange={e => setSearchExam(e.target.value)} placeholder="ادخل اسم الاختبار..." className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md" />
                    </div>
                     <div>
                        <label htmlFor="circle-filter" className="block text-sm font-medium text-stone-700 mb-2">فلترة حسب الحلقة</label>
                        <select id="circle-filter" value={selectedCircle} onChange={e => setSelectedCircle(e.target.value)} className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md">
                            <option value="">كل الحلقات</option>
                            {circles.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <button onClick={handleClearFilters} className="w-full h-10 px-4 text-sm font-semibold text-stone-700 bg-stone-200 rounded-md shadow-sm hover:bg-stone-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-400 transition-all">
                            مسح الفلتر
                        </button>
                    </div>
                </div>
            </div>

            <ExamReportTable exams={paginatedExams} onSort={handleSort} sortConfig={sortConfig} />
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
    );
};

export default ExamReportPage;