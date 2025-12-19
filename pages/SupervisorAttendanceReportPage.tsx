
import React from 'react';
import type { SupervisorAttendanceReportEntry, SupervisorAttendanceSummaryEntry } from '../types';
import AttendanceDetailModal from '../components/AttendanceDetailModal';
import { PrintIcon, ExcelIcon } from '../components/icons';
import { ProgressBar } from '../components/ProgressBar';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 20;

interface SupervisorAttendanceReportPageProps {
  reportData: SupervisorAttendanceReportEntry[];
}

const SupervisorAttendanceReportPage: React.FC<SupervisorAttendanceReportPageProps> = ({ reportData }) => {
  const [activeTab, setActiveTab] = React.useState<'detailed' | 'summary'>('detailed');
  const [modalData, setModalData] = React.useState<{ title: string; dates: string[] } | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedSupervisor, setSelectedSupervisor] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedSupervisor, startDate, endDate]);

  const supervisorOptions = React.useMemo(() => {
    const uniqueSupervisors = new Map<string, string>();
    reportData.forEach(item => {
        uniqueSupervisors.set(item.supervisorId, item.supervisorName);
    });
    return Array.from(uniqueSupervisors.entries()).sort((a, b) => a[1].localeCompare(b[1], 'ar'));
  }, [reportData]);

  const filteredData = React.useMemo(() => {
    return reportData.filter(item => {
        const supervisorMatch = !selectedSupervisor || item.supervisorId === selectedSupervisor;
        
        let dateMatch = true;
        const entryDate = item.date.replace(/\//g, '-');
        if (startDate && entryDate < startDate) dateMatch = false;
        if (endDate && entryDate > endDate) dateMatch = false;
        
        return supervisorMatch && dateMatch;
    });
  }, [reportData, selectedSupervisor, startDate, endDate]);

  const summaryData: SupervisorAttendanceSummaryEntry[] = React.useMemo(() => {
    const summaryMap = new Map<string, { name: string, days: number }>();

    filteredData.forEach(item => {
        if (!summaryMap.has(item.supervisorId)) {
            summaryMap.set(item.supervisorId, { name: item.supervisorName, days: 0 });
        }
        summaryMap.get(item.supervisorId)!.days += 1;
    });

    return Array.from(summaryMap.entries())
        .map(([id, data]) => ({
            supervisorId: id,
            supervisorName: data.name,
            presentDays: data.days,
            attendanceRate: Math.min(data.days / 20, 1), // Assuming 20 days per month target for index
        }))
        .sort((a, b) => a.supervisorName.localeCompare(b.supervisorName, 'ar'));
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
    setSelectedSupervisor('');
    setStartDate('');
    setEndDate('');
  };

  const handleExport = () => {
    const XLSX = (window as any).XLSX;
    let dataToExport;
    let fileName;

    if (activeTab === 'detailed') {
      dataToExport = filteredData.map(item => ({
        'المعرف': item.supervisorId,
        'اسم المشرف': item.supervisorName,
        'الحلقة': item.circle,
        'التاريخ': item.date,
        'وقت الحضور': item.checkInTime || '—',
        'وقت الانصراف': item.checkOutTime || '—',
        'الحالة': item.status,
      }));
      fileName = 'تقرير_حضور_المشرفين_التفصيلي.xlsx';
    } else {
      dataToExport = summaryData.map(item => ({
        'المعرف': item.supervisorId,
        'اسم المشرف': item.supervisorName,
        'أيام الحضور': item.presentDays,
      }));
      fileName = 'ملخص_حضور_المشرفين.xlsx';
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
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
                <label className="block text-sm font-medium text-stone-700 mb-2">المشرف</label>
                <select value={selectedSupervisor} onChange={e => setSelectedSupervisor(e.target.value)} className="block w-full py-2 border-stone-300 rounded-md sm:text-sm">
                    <option value="">كل المشرفين</option>
                    {supervisorOptions.map(opt => <option key={opt[0]} value={opt[0]}>{opt[1]}</option>)}
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
          <TabButton label="تقرير مفصل" isActive={activeTab === 'detailed'} onClick={() => setActiveTab('detailed')} />
          <TabButton label="ملخص الحضور" isActive={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
        </div>
        
        {activeTab === 'detailed' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-100">
                <tr>
                  <th className="px-4 py-4 text-center text-xs font-bold text-stone-700 uppercase">المعرف</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-stone-700 uppercase">اسم المشرف</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-stone-700 uppercase">الحلقة</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-stone-700 uppercase">التاريخ</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-stone-700 uppercase">وقت الحضور</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-stone-700 uppercase">وقت الانصراف</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-stone-700 uppercase">الحالة</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {paginatedData.length > 0 ? (
                  (paginatedData as SupervisorAttendanceReportEntry[]).map((item, idx) => (
                    <tr key={idx} className="hover:bg-amber-50 transition-all">
                      <td className="px-4 py-4 text-sm text-stone-500 text-center font-mono">{item.supervisorId}</td>
                      <td className="px-4 py-4 text-sm font-bold text-stone-900 text-center">{item.supervisorName}</td>
                      <td className="px-4 py-4 text-sm text-stone-600 text-center">{item.circle}</td>
                      <td className="px-4 py-4 text-sm text-stone-600 text-center font-mono">{item.date}</td>
                      <td className="px-4 py-4 text-sm text-green-700 text-center font-mono">{item.checkInTime || '—'}</td>
                      <td className="px-4 py-4 text-sm text-red-700 text-center font-mono">{item.checkOutTime || '—'}</td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-green-600">حاضر</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-stone-500">لا توجد حركات حضور مسجلة تطابق الفلاتر.</td></tr>
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
                  <th className="px-6 py-4 text-center text-xs font-bold text-stone-700 uppercase">المعرف</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-stone-700 uppercase">اسم المشرف</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-stone-700 uppercase">عدد أيام الحضور</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-stone-700 uppercase w-48">مؤشر الحضور</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {(paginatedData as SupervisorAttendanceSummaryEntry[]).map((item, index) => (
                  <tr key={index} className="hover:bg-stone-50 transition-all">
                    <td className="px-6 py-4 text-sm text-stone-500 text-center font-mono">{item.supervisorId}</td>
                    <td className="px-6 py-4 text-sm font-bold text-stone-900 text-center">{item.supervisorName}</td>
                    <td className="px-6 py-4 text-sm font-bold text-amber-600 text-center">{item.presentDays}</td>
                    <td className="px-6 py-4">
                      <ProgressBar value={item.attendanceRate} />
                    </td>
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

export default SupervisorAttendanceReportPage;
