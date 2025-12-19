
import React, { useEffect } from 'react';
import type { CombinedTeacherAttendanceEntry, TeacherAttendanceSummaryEntry } from '../types';
import AttendanceDetailModal from '../components/AttendanceDetailModal';
import { PrintIcon, ExcelIcon, RefreshIcon } from '../components/icons'; 
import { ProgressBar } from '../components/ProgressBar';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 20;

interface TeacherAttendanceReportPageProps {
  reportData: CombinedTeacherAttendanceEntry[];
  onRefresh?: () => Promise<void>; 
  isRefreshing?: boolean; 
}

const TeacherAttendanceReportPage: React.FC<TeacherAttendanceReportPageProps> = ({ reportData, onRefresh, isRefreshing }) => {
  const [activeTab, setActiveTab] = React.useState<'detailed' | 'summary'>('detailed');
  const [modalData, setModalData] = React.useState<{ title: string; dates: string[] } | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedTeacher, setSelectedTeacher] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedTeacher, startDate, endDate]);

  const teacherOptions = React.useMemo(() => {
      const uniqueTeachers = new Map<number, string>();
      reportData.forEach(item => {
          uniqueTeachers.set(item.teacherId, item.teacherName);
      });
      return Array.from(uniqueTeachers.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [reportData]);
  
  const filteredData = React.useMemo(() => {
    return reportData.filter(item => {
      const teacherMatch = !selectedTeacher || item.teacherId.toString() === selectedTeacher;
      
      let dateMatch = true;
      const cleanEntryDate = item.date.replace(/\//g, '-');
      if (startDate && cleanEntryDate < startDate) dateMatch = false;
      if (endDate && cleanEntryDate > endDate) dateMatch = false;
      
      return teacherMatch && dateMatch;
    });
  }, [reportData, selectedTeacher, startDate, endDate]);

  const summaryData: TeacherAttendanceSummaryEntry[] = React.useMemo(() => {
    const summaryMap = new Map<number, { teacherName: string; presentDays: number }>();

    filteredData.forEach(item => {
        if (!summaryMap.has(item.teacherId)) {
            summaryMap.set(item.teacherId, { teacherName: item.teacherName, presentDays: 0 });
        }
        summaryMap.get(item.teacherId)!.presentDays += 1;
    });

    return Array.from(summaryMap.entries())
        .map(([teacherId, data]) => ({
            teacherId,
            teacherName: data.teacherName,
            presentDays: data.presentDays,
            attendanceRate: Math.min(data.presentDays / 20, 1), 
        }))
        .sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'ar')); 
  }, [filteredData]);
  
  const currentData = activeTab === 'detailed' ? filteredData : summaryData;
  const totalItems = currentData.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  const paginatedData = React.useMemo(() => {
    return currentData.slice(
      (safeCurrentPage - 1) * ITEMS_PER_PAGE,
      safeCurrentPage * ITEMS_PER_PAGE
    );
  }, [currentData, safeCurrentPage]);

  const handleClearFilters = () => {
      setSelectedTeacher('');
      setStartDate('');
      setEndDate('');
  };

  const handleExport = () => {
    const XLSX = (window as any).XLSX;
    let dataToExport;
    let fileName;

    if (activeTab === 'detailed') {
      dataToExport = filteredData.map(item => ({
        'رقم المعلم': item.teacherId,
        'اسم المعلم': item.teacherName,
        'الحلقات': item.circles,
        'وقت الحلقة': item.circleTime,
        'التاريخ': item.date,
        'وقت الحضور': item.checkInTime || '—',
        'وقت الانصراف': item.checkOutTime || '—',
        'الحالة': 'حاضر',
      }));
      fileName = 'تقرير_حضور_المعلمين_التفصيلي.xlsx';
    } else {
      dataToExport = summaryData.map(item => ({
        'رقم المعلم': item.teacherId,
        'اسم المعلم': item.teacherName,
        'أيام الحضور': item.presentDays,
      }));
      fileName = 'ملخص_حضور_المعلمين.xlsx';
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'البيانات');
    XLSX.writeFile(wb, fileName);
  };
  
  const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-sm font-semibold rounded-t-lg transition-colors duration-300 relative ${
        isActive ? 'bg-white text-amber-600' : 'bg-transparent text-stone-500 hover:text-stone-800'
      }`}
    >
      {label}
      {isActive && <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 rounded-t-full"></div>}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end print-hidden gap-2">
        {onRefresh && (
            <button onClick={onRefresh} disabled={isRefreshing} className="px-4 h-10 text-sm font-semibold text-amber-800 bg-amber-100 rounded-md hover:bg-amber-200 flex items-center gap-2 disabled:opacity-50">
                <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
            </button>
        )}
        <button onClick={handleExport} className="px-4 h-10 text-sm font-semibold text-green-800 bg-green-100 rounded-md hover:bg-green-200 flex items-center gap-2">
            <ExcelIcon /> تصدير لإكسل
        </button>
        <button onClick={() => window.print()} className="px-4 h-10 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2">
            <PrintIcon /> طباعة
        </button>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-lg border border-stone-200 print-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">المعلم</label>
             <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} className="block w-full py-2 border-stone-300 rounded-md sm:text-sm">
                <option value="">كل المعلمين</option>
                {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">من تاريخ</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="block w-full py-2 border-stone-300 rounded-md sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">إلى تاريخ</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="block w-full py-2 border-stone-300 rounded-md sm:text-sm" />
          </div>
          <div>
            <button onClick={handleClearFilters} className="w-full h-10 text-sm font-semibold text-stone-700 bg-stone-200 rounded-md hover:bg-stone-300">مسح الفلتر</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden printable-area">
        <div className="sticky top-0 z-10 flex border-b border-stone-200 bg-stone-100 px-4 print-hidden">
          <TabButton label="تقرير تفصيلي" isActive={activeTab === 'detailed'} onClick={() => setActiveTab('detailed')} />
          <TabButton label="ملخص الحضور" isActive={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
        </div>
        
        {activeTab === 'detailed' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-100">
                <tr>
                  <th className="px-4 py-4 text-center text-xs font-bold text-stone-700 uppercase tracking-wider">رقم المعلم</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-stone-700 uppercase tracking-wider">اسم المعلم</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-stone-700 uppercase tracking-wider">الحلقات</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-stone-700 uppercase tracking-wider">وقت الحلقة</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-stone-700 uppercase tracking-wider">التاريخ</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-stone-700 uppercase tracking-wider">وقت الحضور</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-stone-700 uppercase tracking-wider">وقت الانصراف</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-stone-700 uppercase tracking-wider">الحالة</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {paginatedData.length > 0 ? (
                  (paginatedData as CombinedTeacherAttendanceEntry[]).map((item, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/50 transition-all">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-stone-500 text-center font-mono">{item.teacherId}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-stone-900 text-center">{item.teacherName}</td>
                        <td className="px-4 py-4 text-sm text-stone-600 text-center">{item.circles}</td>
                        <td className="px-4 py-4 text-sm text-stone-600 text-center">{item.circleTime}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-stone-600 text-center font-mono">{item.date}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-green-700 text-center font-mono">{item.checkInTime || '—'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-red-700 text-center font-mono">{item.checkOutTime || '—'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-bold text-green-600">حاضر</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-stone-500">لا توجد حركات مسجلة تطابق الفلتر.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-100">
                <tr>
                  <th className="px-6 py-4 text-center text-xs font-bold text-stone-700 uppercase tracking-wider">رقم المعلم</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-stone-700 uppercase tracking-wider">اسم المعلم</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-stone-700 uppercase tracking-wider">عدد أيام الحضور</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-stone-700 uppercase tracking-wider w-48">مؤشر الحضور</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {(paginatedData as TeacherAttendanceSummaryEntry[]).map((item, index) => (
                  <tr key={index} className="hover:bg-stone-50 transition-all">
                    <td className="px-6 py-4 text-sm text-stone-500 text-center font-mono">{item.teacherId}</td>
                    <td className="px-6 py-4 text-sm font-bold text-stone-900 text-center">{item.teacherName}</td>
                    <td className="px-6 py-4 text-sm font-bold text-amber-600 text-center">{item.presentDays}</td>
                    <td className="px-6 py-4"><ProgressBar value={item.attendanceRate} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 border-t border-stone-200 print-hidden">
          <Pagination currentPage={safeCurrentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>
    </div>
  );
};

export default TeacherAttendanceReportPage;
