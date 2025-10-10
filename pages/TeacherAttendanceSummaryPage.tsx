import React from 'react';
import type { TeacherAttendanceReportEntry, TeacherAttendanceSummaryEntry } from '../types';

interface TeacherAttendanceSummaryPageProps {
  reportData: TeacherAttendanceReportEntry[];
}

const TeacherAttendanceSummaryPage: React.FC<TeacherAttendanceSummaryPageProps> = ({ reportData }) => {
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  const summaryData: TeacherAttendanceSummaryEntry[] = React.useMemo(() => {
    const filteredReports = reportData.filter(item => {
      const itemDate = new Date(item.date + 'T00:00:00Z');
      const start = startDate ? new Date(startDate + 'T00:00:00Z') : null;
      const end = endDate ? new Date(endDate + 'T00:00:00Z') : null;

      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;
      
      return true;
    });

    const summaryMap = new Map<string, { presentDays: number; absentDays: number }>();

    filteredReports.forEach(item => {
      if (!summaryMap.has(item.teacherName)) {
        summaryMap.set(item.teacherName, { presentDays: 0, absentDays: 0 });
      }

      const teacherSummary = summaryMap.get(item.teacherName)!;
      const isAbsent = item.checkInTime === null && item.checkOutTime === null;

      if (isAbsent) {
        teacherSummary.absentDays += 1;
      } else {
        teacherSummary.presentDays += 1;
      }
    });

    return Array.from(summaryMap.entries())
      .map(([teacherName, data]) => ({
        teacherName,
        ...data,
      }))
      .sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'ar'));
  }, [reportData, startDate, endDate]);

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-stone-50 p-6 rounded-xl shadow-lg border border-stone-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
            <button
              onClick={handleClearFilters}
              className="w-full h-10 px-4 text-sm font-semibold text-stone-700 bg-stone-200 rounded-md shadow-sm hover:bg-stone-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-400 transition-all duration-150"
            >
              مسح الفلتر
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto shadow-lg rounded-xl border border-stone-200">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-200">
            <tr>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">اسم المعلم</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">عدد أيام الحضور</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">عدد أيام الغياب</th>
            </tr>
          </thead>
          <tbody className="bg-stone-50 divide-y divide-stone-200">
            {summaryData.length > 0 ? (
              summaryData.map(item => (
                <tr key={item.teacherName} className="hover:bg-amber-100/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900 text-center">{item.teacherName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-semibold text-center">{item.presentDays}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700 font-semibold text-center">{item.absentDays}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-stone-500">
                  لا توجد بيانات لعرضها.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeacherAttendanceSummaryPage;
