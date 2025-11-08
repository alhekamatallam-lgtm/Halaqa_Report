import React, { useState, useMemo } from 'react';
import type { ProcessedStudentData } from '../types';
import { ExcelIcon } from '../components/icons';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 15;

interface TeacherListPageProps {
  students: ProcessedStudentData[];
}

interface TeacherCircleInfo {
  teacherName: string;
  circles: string;
}

const TeacherListPage: React.FC<TeacherListPageProps> = ({ students }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const teacherCircleData: TeacherCircleInfo[] = useMemo(() => {
    const map = new Map<string, Set<string>>();
    students.forEach(student => {
      if (student.teacherName && student.circle) {
        if (!map.has(student.teacherName)) {
          map.set(student.teacherName, new Set());
        }
        map.get(student.teacherName)!.add(student.circle);
      }
    });

    const list = Array.from(map.entries()).map(([teacherName, circlesSet]) => ({
      teacherName,
      circles: Array.from(circlesSet).sort((a, b) => a.localeCompare(b, 'ar')).join('، '),
    }));

    return list.sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'ar'));
  }, [students]);

  const { paginatedData, totalPages, fullFilteredList } = useMemo(() => {
    let filteredList = teacherCircleData;
    if (searchQuery) {
      filteredList = teacherCircleData.filter(item =>
        item.teacherName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    const total = Math.ceil(filteredList.length / ITEMS_PER_PAGE);
    const paginated = filteredList.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
    
    return { paginatedData: paginated, totalPages: total, fullFilteredList: filteredList };
  }, [teacherCircleData, searchQuery, currentPage]);

  const handleExport = () => {
    const XLSX = (window as any).XLSX;
    const dataToExport = fullFilteredList.map(item => ({
      'المعلم': item.teacherName,
      'الحلقات': item.circles,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'قائمة المعلمين');
    XLSX.writeFile(wb, 'قائمة_المعلمين.xlsx');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-lg border border-stone-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
                <label htmlFor="search-teacher" className="block text-sm font-medium text-stone-700 mb-2">بحث بالمعلم</label>
                <input
                    type="text"
                    id="search-teacher"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ادخل اسم المعلم..."
                    className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                />
            </div>
            <div>
                 <button
                    onClick={handleExport}
                    className="w-full h-10 px-4 text-sm font-semibold text-green-800 bg-green-100 rounded-md shadow-sm hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-150 flex items-center justify-center gap-2"
                >
                    <ExcelIcon />
                    تصدير لإكسل
                </button>
            </div>
        </div>
      </div>
      
      <div className="overflow-x-auto shadow-xl rounded-xl border border-stone-200 bg-white">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-200">
            <tr>
              <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider w-16">م</th>
              <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">اسم المعلم</th>
              <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">الحلقات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-stone-200">
            {paginatedData.map((item, index) => (
              <tr key={item.teacherName} className="hover:bg-amber-100/60 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-stone-800 text-center">{((currentPage - 1) * ITEMS_PER_PAGE) + index + 1}</td>
                <td className="px-6 py-4 text-sm font-semibold text-stone-900 text-center">{item.teacherName}</td>
                <td className="px-6 py-4 text-sm text-stone-600 text-center">{item.circles}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default TeacherListPage;