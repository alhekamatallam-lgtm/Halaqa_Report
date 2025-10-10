import React from 'react';
import type { TeacherAttendanceReportEntry, TeacherAttendanceSummaryEntry } from '../types';
import AttendanceDetailModal from '../components/AttendanceDetailModal';
import { PrintIcon } from '../components/icons';

interface TeacherAttendanceReportPageProps {
  reportData: TeacherAttendanceReportEntry[];
}

const TeacherAttendanceReportPage: React.FC<TeacherAttendanceReportPageProps> = ({ reportData }) => {
  const [activeTab, setActiveTab] = React.useState<'detailed' | 'summary'>('detailed');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [selectedTeacher, setSelectedTeacher] = React.useState('');
  const [modalData, setModalData] = React.useState<{ title: string; dates: string[] } | null>(null);

  const teachers = React.useMemo(() => {
    const teacherSet = new Set<string>(reportData.map(r => r.teacherName));
    return Array.from<string>(teacherSet).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [reportData]);

  const filteredData = React.useMemo(() => {
    return reportData.filter(item => {
      const itemDate = new Date(item.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;
      if (selectedTeacher && item.teacherName !== selectedTeacher) return false;
      
      return true;
    });
  }, [reportData, startDate, endDate, selectedTeacher]);

  const summaryData: TeacherAttendanceSummaryEntry[] = React.useMemo(() => {
    const summaryMap = new Map<string, { presentDates: Set<string>; absentDates: Set<string> }>();

    filteredData.forEach(item => {
        if (!summaryMap.has(item.teacherName)) {
            summaryMap.set(item.teacherName, { presentDates: new Set(), absentDates: new Set() });
        }
        const teacherSummary = summaryMap.get(item.teacherName)!;
        const isAbsent = item.checkInTime === null && item.checkOutTime === null;

        if (isAbsent) {
            teacherSummary.absentDates.add(item.date);
        } else {
            teacherSummary.presentDates.add(item.date);
        }
    });

    return Array.from(summaryMap.entries())
        .map(([teacherName, data]) => ({
            teacherName,
            presentDays: data.presentDates.size,
            absentDays: data.absentDates.size,
        }))
        .sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'ar'));
  }, [filteredData]);

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedTeacher('');
  };
  
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
        .sort((a, b) => b.localeCompare(a))
        .map(date => new Date(date).toLocaleDateString('ar-EG', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }));

    setModalData({ title, dates });
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
      <div className="bg-white p-6 rounded-xl shadow-xl border border-stone-200 print-hidden">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-stone-700 mb-2">من تاريخ</label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="block w-full pl-3 pr-2 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-stone-700 mb-2">إلى تاريخ</label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="block w-full pl-3 pr-2 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
            />
          </div>
          <div>
            <label htmlFor="teacher-filter" className="block text-sm font-medium text-stone-700 mb-2">المعلم</label>
            <select
              id="teacher-filter"
              value={selectedTeacher}
              onChange={e => setSelectedTeacher(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
            >
              <option value="">كل المعلمين</option>
              {teachers.map(teacher => (
                <option key={teacher} value={teacher}>{teacher}</option>
              ))}
            </select>
          </div>
          <div>
            <button
              onClick={handleClearFilters}
              className="w-full h-10 px-4 text-sm font-semibold text-stone-700 bg-stone-200 rounded-md shadow-sm hover:bg-stone-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-400 transition-all duration-150"
            >
              مسح الفلتر
            </button>
          </div>
          <div>
            <button
              onClick={() => window.print()}
              className="w-full h-10 px-4 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 flex items-center justify-center gap-2"
            >
              <PrintIcon />
              طباعة
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden printable-area">
        <h2 className="print-title">{printTitle}</h2>
        <div className="flex border-b border-stone-200 bg-stone-100 px-4 print-hidden">
          <TabButton label="تفصيلي" isActive={activeTab === 'detailed'} onClick={() => setActiveTab('detailed')} />
          <TabButton label="إجمالي" isActive={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
        </div>
        
        {activeTab === 'detailed' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-100 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">اسم المعلم</th>
                  <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">التاريخ</th>
                  <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">وقت الحضور</th>
                  <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">وقت الانصراف</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {filteredData.length > 0 ? (
                  filteredData.map((item, index) => {
                    const isAbsent = item.checkInTime === null && item.checkOutTime === null;
                    const rowClass = isAbsent ? 'bg-red-50/70 absent-row-print' : (index % 2 === 0 ? 'bg-white' : 'bg-stone-50/70');

                    return (
                      <tr key={`${item.date}-${item.teacherName}-${index}`} className={`${rowClass} hover:bg-amber-100/60 transition-all`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900 text-center">{item.teacherName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 text-center">{new Date(item.date).toLocaleDateString('ar-EG', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                        {isAbsent ? (
                          <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-700 text-center">
                            غائب
                          </td>
                        ) : (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 text-center font-mono">{item.checkInTime || '---'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 text-center font-mono">{item.checkOutTime || '---'}</td>
                          </>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-stone-500">
                      لا توجد بيانات تطابق الفلتر المحدد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-100 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">اسم المعلم</th>
                  <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">عدد أيام الحضور</th>
                  <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">عدد أيام الغياب</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {summaryData.length > 0 ? (
                  summaryData.map((item, index) => (
                    <tr key={item.teacherName} className={`${index % 2 === 0 ? 'bg-white' : 'bg-stone-50/70'} hover:bg-amber-100/60 transition-all`}>
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
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-stone-500">
                      لا توجد بيانات تطابق الفلتر المحدد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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