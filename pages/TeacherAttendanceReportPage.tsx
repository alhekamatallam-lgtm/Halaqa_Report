
import React, { useEffect } from 'react';
import type { CombinedTeacherAttendanceEntry, TeacherAttendanceSummaryEntry } from '../types';
import AttendanceDetailModal from '../components/AttendanceDetailModal';
import { PrintIcon, ExcelIcon, RefreshIcon } from '../components/icons'; 
import { ProgressBar } from '../components/ProgressBar';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 15;

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

  // Force reset page to 1 whenever filters or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedTeacher, startDate, endDate]);

  // Derive teacher options directly from the attendance report data (attandance sheet)
  const teacherOptions = React.useMemo(() => {
      const uniqueTeachers = new Map<number, string>();
      
      reportData.forEach(item => {
          // We use the map to ensure uniqueness by ID. 
          if (item.teacherId) {
            uniqueTeachers.set(item.teacherId, item.teacherName);
          }
      });

      return Array.from(uniqueTeachers.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.id - b.id);
  }, [reportData]);
  
  const filteredData = React.useMemo(() => {
    const trimmedSelectedTeacher = selectedTeacher.trim();
    
    return reportData.filter(item => {
      // Use ID for filtering
      const teacherMatch = !trimmedSelectedTeacher || item.teacherId.toString() === trimmedSelectedTeacher;
      
      // DATE FILTERING: Direct String Comparison (YYYY-MM-DD)
      // We do NOT convert to Date objects to avoid timezone shifts.
      // '2023-10-01' is lexicographically smaller than '2023-10-02', so string comparison works perfectly.
      
      let dateMatch = true;
      if (startDate && item.date < startDate) {
          dateMatch = false;
      }
      if (endDate && item.date > endDate) {
          dateMatch = false;
      }
      
      return teacherMatch && dateMatch;
    });
  }, [reportData, selectedTeacher, startDate, endDate]);

  const summaryData: TeacherAttendanceSummaryEntry[] = React.useMemo(() => {
    // Group by Teacher ID instead of Name
    const summaryMap = new Map<number, { teacherName: string; presentDates: Set<string>; absentDates: Set<string> }>();

    filteredData.forEach(item => {
        if (!summaryMap.has(item.teacherId)) {
            summaryMap.set(item.teacherId, { teacherName: item.teacherName, presentDates: new Set(), absentDates: new Set() });
        }
        const teacherSummary = summaryMap.get(item.teacherId)!;
        const isAbsent = item.checkInTime === null && item.checkOutTime === null;

        if (isAbsent) {
            teacherSummary.absentDates.add(item.date);
        } else {
            teacherSummary.presentDates.add(item.date);
        }
    });

    return Array.from(summaryMap.entries())
        .map(([teacherId, data]) => {
            const presentDays = data.presentDates.size;
            const absentDays = data.absentDates.size;
            const totalDays = presentDays + absentDays;
            return {
                teacherId,
                teacherName: data.teacherName,
                presentDays,
                absentDays,
                attendanceRate: totalDays > 0 ? presentDays / totalDays : 0,
            };
        })
        .sort((a, b) => a.teacherId - b.teacherId); 
  }, [filteredData]);
  
  const currentData = activeTab === 'detailed' ? filteredData : summaryData;
  const totalItems = currentData.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // Safe Pagination: recalculate bounds based on the *current* data
  const safeCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  const paginatedData = React.useMemo(() => {
    return currentData.slice(
      (safeCurrentPage - 1) * ITEMS_PER_PAGE,
      safeCurrentPage * ITEMS_PER_PAGE
    );
  }, [currentData, safeCurrentPage]);

  
  const handleShowDates = (teacherName: string, type: 'present' | 'absent') => {
    const title = type === 'present' 
        ? `أيام الحضور للمعلم: ${teacherName}` 
        : `أيام الغياب للمعلم: ${teacherName}`;
    
    const dateSet = new Set<string>();
    filteredData
        .filter(item => item.teacherName === teacherName)
        .forEach(item => {
            const isAbsent = item.checkInTime === null && item.checkOutTime === null;
            if ((type === 'present' && !isAbsent) || (type === 'absent' && isAbsent)) {
                dateSet.add(item.date);
            }
        });

    const dates = Array.from(dateSet)
        .sort().reverse(); 

    setModalData({ title, dates });
  };

  const handleFilterChange = (type: 'teacher' | 'start' | 'end', value: string) => {
      if (type === 'teacher') setSelectedTeacher(value);
      else if (type === 'start') setStartDate(value);
      else if (type === 'end') setEndDate(value);
  };

  const handleClearFilters = () => {
      setSelectedTeacher('');
      setStartDate('');
      setEndDate('');
  };

  const handleExport = () => {
    const XLSX = (window as any).XLSX;
    let dataToExport;
    let fileName;
    let sheetName;

    if (activeTab === 'detailed') {
      dataToExport = filteredData.map(item => ({
        'رقم المعلم': item.teacherId,
        'اسم المعلم': item.teacherName,
        'التاريخ': item.date, // Direct string
        'وقت الحضور': item.checkInTime || 'غائب',
        'وقت الانصراف': item.checkOutTime || '',
        'ملاحظات': item.notes || '',
      }));
      fileName = 'تقرير_حضور_المعلمين_التفصيلي.xlsx';
      sheetName = 'التقرير التفصيلي';
    } else { // summary
      dataToExport = summaryData.map(item => ({
        'رقم المعلم': item.teacherId,
        'اسم المعلم': item.teacherName,
        'أيام الحضور': item.presentDays,
        'أيام الغياب': item.absentDays,
        'نسبة الحضور': `${(item.attendanceRate * 100).toFixed(0)}%`,
      }));
      fileName = 'ملخص_حضور_المعلمين.xlsx';
      sheetName = 'الملخص الإجمالي';
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
  };
  
  const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-sm font-semibold rounded-t-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 relative ${
        isActive
          ? 'bg-white text-amber-600'
          : 'bg-transparent text-stone-500 hover:bg-stone-200/50 hover:text-stone-800'
      }`}
    >
      {label}
      {isActive && <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 rounded-t-full"></div>}
    </button>
  );
  
  const printTitle = `تقرير حضور المعلمين - ${new Date().toLocaleDateString('ar-EG')}`;

  return (
    <div className="space-y-6">
      <div className="flex justify-end print-hidden gap-2">
        {onRefresh && (
            <button 
                onClick={onRefresh} 
                disabled={isRefreshing}
                className="w-auto h-10 px-4 text-sm font-semibold text-amber-800 bg-amber-100 rounded-md shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
            </button>
        )}
        <button onClick={handleExport} className="w-auto h-10 px-4 text-sm font-semibold text-green-800 bg-green-100 rounded-md shadow-sm hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-150 flex items-center justify-center gap-2">
            <ExcelIcon /> تصدير لإكسل
        </button>
        <button onClick={() => window.print()} className="w-auto h-10 px-4 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 flex items-center justify-center gap-2">
            <PrintIcon /> طباعة
        </button>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-lg border border-stone-200 print-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="teacher-filter" className="block text-sm font-medium text-stone-700 mb-2">فلترة حسب المعلم</label>
             <select 
                id="teacher-filter" 
                value={selectedTeacher} 
                onChange={e => handleFilterChange('teacher', e.target.value)} 
                className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
             >
                <option value="">كل المعلمين</option>
                {teacherOptions.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.id} - {teacher.name}</option>
                ))}
              </select>
          </div>
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-stone-700 mb-2">من تاريخ</label>
            <input 
                type="date" 
                id="start-date" 
                value={startDate} 
                onChange={e => handleFilterChange('start', e.target.value)} 
                className="block w-full pl-3 pr-2 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-stone-700 mb-2">إلى تاريخ</label>
            <input 
                type="date" 
                id="end-date" 
                value={endDate} 
                onChange={e => handleFilterChange('end', e.target.value)} 
                className="block w-full pl-3 pr-2 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
            />
          </div>
          <div>
            <button onClick={handleClearFilters} className="w-full h-10 px-4 text-sm font-semibold text-stone-700 bg-stone-200 rounded-md shadow-sm hover:bg-stone-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-400 transition-all duration-150">
              مسح الفلتر
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden printable-area">
        <h2 className="print-title">{printTitle}</h2>
        <div className="sticky top-0 z-10 flex border-b border-stone-200 bg-stone-100 px-4 print-hidden">
          <TabButton label="تفصيلي" isActive={activeTab === 'detailed'} onClick={() => setActiveTab('detailed')} />
          <TabButton label="إجمالي" isActive={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
        </div>
        
        {activeTab === 'detailed' && (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-100 sticky top-[49px] z-5">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">رقم المعلم</th>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">اسم المعلم</th>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">التاريخ</th>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">وقت الحضور</th>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">وقت الانصراف</th>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-200">
                  {paginatedData.length > 0 ? (
                    (paginatedData as CombinedTeacherAttendanceEntry[]).map((item) => {
                      const isAbsent = item.checkInTime === null && item.checkOutTime === null;
                      const rowClass = isAbsent ? 'bg-red-50/70 absent-row-print' : 'hover:bg-amber-100/60';
                      return (
                        <tr key={item.id} className={`${rowClass} transition-all`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 text-center font-mono">{item.teacherId}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900 text-center">{item.teacherName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 text-center">{item.date}</td>
                            {isAbsent ? (
                                <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-700 text-center">
                                غائب
                                </td>
                            ) : (
                                <>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 text-center font-mono">{item.checkInTime || '---'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700 text-center font-mono">{item.checkOutTime || '---'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500 text-center">{item.notes || '---'}</td>
                                </>
                            )}
                        </tr>
                      )
                    })
                  ) : (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-stone-500">لا توجد بيانات تطابق الفلتر المحدد.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
             <div className="p-4">
              <Pagination currentPage={safeCurrentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
           <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-100 sticky top-[49px] z-5">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">رقم المعلم</th>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">اسم المعلم</th>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">عدد أيام الحضور</th>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">عدد أيام الغياب</th>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">نسبة الحضور</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-200">
                  {paginatedData.length > 0 ? (
                    (paginatedData as TeacherAttendanceSummaryEntry[]).map((item, index) => (
                      <tr key={item.teacherId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-stone-50/70'} hover:bg-amber-100/60 transition-all`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 text-center font-mono">{item.teacherId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900 text-center">{item.teacherName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-center">
                          <button
                            onClick={() => handleShowDates(item.teacherName, 'present')}
                            disabled={item.presentDays === 0}
                            className="text-green-700 underline cursor-pointer hover:text-green-800 disabled:text-gray-400 disabled:no-underline disabled:cursor-default"
                          >
                            {item.presentDays}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-center">
                           <button
                            onClick={() => handleShowDates(item.teacherName, 'absent')}
                            disabled={item.absentDays === 0}
                            className="text-red-700 underline cursor-pointer hover:text-red-800 disabled:text-gray-400 disabled:no-underline disabled:cursor-default"
                          >
                            {item.absentDays}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 text-center">
                          <div className='w-24 mx-auto'>
                              <ProgressBar value={item.attendanceRate} />
                              <p className="text-xs text-center text-gray-600 mt-1">{(item.attendanceRate * 100).toFixed(0)}%</p>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-stone-500">
                        لا توجد بيانات لعرضها.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
             <div className="p-4">
               <Pagination currentPage={safeCurrentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </div>
        )}
      </div>
       <AttendanceDetailModal 
          isOpen={!!modalData}
          onClose={() => setModalData(null)}
          title={modalData?.title || ''}
          dates={modalData?.dates || []}
        />
    </div>
  );
};

export default TeacherAttendanceReportPage;
