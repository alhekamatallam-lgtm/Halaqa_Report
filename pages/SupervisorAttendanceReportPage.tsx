

import React from 'react';
import type { SupervisorAttendanceReportEntry, SupervisorAttendanceSummaryEntry } from '../types';
import AttendanceDetailModal from '../components/AttendanceDetailModal';
import { PrintIcon } from '../components/icons';
import { ProgressBar } from '../components/ProgressBar';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 10;

interface SupervisorAttendanceReportPageProps {
  reportData: SupervisorAttendanceReportEntry[];
}

const SupervisorAttendanceReportPage: React.FC<SupervisorAttendanceReportPageProps> = ({ reportData }) => {
  const [activeTab, setActiveTab] = React.useState<'detailed' | 'summary'>('detailed');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [selectedSupervisor, setSelectedSupervisor] = React.useState('');
  const [modalData, setModalData] = React.useState<{ title: string; dates: string[] } | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, selectedSupervisor, activeTab]);

  const supervisors = React.useMemo(() => {
    const supervisorSet = new Set<string>(reportData.map(r => r.supervisorName));
    return Array.from<string>(supervisorSet).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [reportData]);

  const filteredData = React.useMemo(() => {
    return reportData.filter(item => {
      const itemDate = new Date(item.date + 'T00:00:00Z');
      const start = startDate ? new Date(startDate + 'T00:00:00Z') : null;
      const end = endDate ? new Date(endDate + 'T00:00:00Z') : null;

      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;
      if (selectedSupervisor && item.supervisorName !== selectedSupervisor) return false;
      
      return true;
    });
  }, [reportData, startDate, endDate, selectedSupervisor]);

  const summaryData: SupervisorAttendanceSummaryEntry[] = React.useMemo(() => {
    const summaryMap = new Map<string, { presentDates: Set<string>; absentDates: Set<string> }>();

    filteredData.forEach(item => {
        if (!summaryMap.has(item.supervisorName)) {
            summaryMap.set(item.supervisorName, { presentDates: new Set(), absentDates: new Set() });
        }
        const supervisorSummary = summaryMap.get(item.supervisorName)!;
        const isAbsent = item.checkInTime === null && item.checkOutTime === null;

        if (isAbsent) {
            supervisorSummary.absentDates.add(item.date);
        } else {
            supervisorSummary.presentDates.add(item.date);
        }
    });

    return Array.from(summaryMap.entries())
        .map(([supervisorName, data]) => {
            const presentDays = data.presentDates.size;
            const absentDays = data.absentDates.size;
            const totalDays = presentDays + absentDays;
            return {
                supervisorName,
                presentDays,
                absentDays,
                attendanceRate: totalDays > 0 ? presentDays / totalDays : 0,
            };
        })
        .sort((a, b) => a.supervisorName.localeCompare(b.supervisorName, 'ar'));
  }, [filteredData]);
  
  const paginatedDetailedData = React.useMemo(() => {
    return filteredData.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [filteredData, currentPage]);
  const totalDetailedPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  const paginatedSummaryData = React.useMemo(() => {
    return summaryData.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [summaryData, currentPage]);
  const totalSummaryPages = Math.ceil(summaryData.length / ITEMS_PER_PAGE);


  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedSupervisor('');
  };
  
  const handleShowDates = (supervisorName: string, type: 'present' | 'absent') => {
    const title = type === 'present' 
        ? `أيام الحضور للمشرف: ${supervisorName}` 
        : `أيام الغياب للمشرف: ${supervisorName}`;
    
    const dateSet = new Set<string>();
    filteredData
        .filter(item => item.supervisorName === supervisorName)
        .forEach(item => {
            const isAbsent = item.checkInTime === null && item.checkOutTime === null;
            if ((type === 'present' && !isAbsent) || (type === 'absent' && isAbsent)) {
                dateSet.add(item.date);
            }
        });

    const dates = Array.from(dateSet)
        .sort((a, b) => b.localeCompare(a))
        .map(date => new Date(date + 'T00:00:00Z').toLocaleDateString('ar-EG', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }));

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

  const printTitle = `تقرير حضور المشرفين - ${new Date().toLocaleDateString('ar-EG')}`;

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
            <label htmlFor="supervisor-filter" className="block text-sm font-medium text-stone-700 mb-2">المشرف</label>
            <select
              id="supervisor-filter"
              value={selectedSupervisor}
              onChange={e => setSelectedSupervisor(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
            >
              <option value="">كل المشرفين</option>
              {supervisors.map(supervisor => (
                <option key={supervisor} value={supervisor}>{supervisor}</option>
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
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">اسم المشرف</th>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">التاريخ</th>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">وقت الحضور</th>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">وقت الانصراف</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-200">
                  {paginatedDetailedData.length > 0 ? (
                    paginatedDetailedData.map((item, index) => {
                      const isAbsent = item.checkInTime === null && item.checkOutTime === null;
                      const rowClass = isAbsent ? 'bg-red-50/70 absent-row-print' : (index % 2 === 0 ? 'bg-white' : 'bg-stone-50/70');

                      return (
                        <tr key={`${item.date}-${item.supervisorName}-${index}`} className={`${rowClass} hover:bg-amber-100/60 transition-all`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900 text-center">{item.supervisorName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 text-center">{new Date(item.date + 'T00:00:00Z').toLocaleDateString('ar-EG', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}</td>
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
             <div className="p-4">
              <Pagination currentPage={currentPage} totalPages={totalDetailedPages} onPageChange={setCurrentPage} />
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
           <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-100 sticky top-[49px] z-5">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">اسم المشرف</th>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">عدد أيام الحضور</th>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">عدد أيام الغياب</th>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">نسبة الحضور</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-200">
                  {paginatedSummaryData.length > 0 ? (
                    paginatedSummaryData.map((item, index) => (
                      <tr key={item.supervisorName} className={`${index % 2 === 0 ? 'bg-white' : 'bg-stone-50/70'} hover:bg-amber-100/60 transition-all`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900 text-center">{item.supervisorName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-center">
                          <button
                            onClick={() => handleShowDates(item.supervisorName, 'present')}
                            disabled={item.presentDays === 0}
                            className="text-green-700 underline cursor-pointer hover:text-green-800 disabled:text-gray-400 disabled:no-underline disabled:cursor-default"
                          >
                            {item.presentDays}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-center">
                           <button
                            onClick={() => handleShowDates(item.supervisorName, 'absent')}
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
                      <td colSpan={4} className="px-6 py-12 text-center text-stone-500">
                        لا توجد بيانات تطابق الفلتر المحدد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
             <div className="p-4">
               <Pagination currentPage={currentPage} totalPages={totalSummaryPages} onPageChange={setCurrentPage} />
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

export default SupervisorAttendanceReportPage;