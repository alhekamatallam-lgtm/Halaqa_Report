import React from 'react';
import type { ProcessedStudentData } from '../types';
import { ProgressBar } from './ProgressBar';
import { SortIcon, SortUpIcon, SortDownIcon } from './icons';

type SortKey = keyof ProcessedStudentData;

interface ReportTableProps {
  students: ProcessedStudentData[];
  onRowClick: (student: ProcessedStudentData) => void;
  sortConfig: { key: SortKey; direction: 'ascending' | 'descending' } | null;
  onSort: (key: SortKey) => void;
}

const SortableHeader: React.FC<{
  label: string;
  sortKey: SortKey;
  sortConfig: ReportTableProps['sortConfig'];
  onSort: ReportTableProps['onSort'];
  className?: string;
}> = ({ label, sortKey, sortConfig, onSort, className = '' }) => {
  const isSorted = sortConfig?.key === sortKey;
  const direction = sortConfig?.direction;

  return (
    <th
      scope="col"
      className={`px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider cursor-pointer ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center justify-center gap-1">
        <span>{label}</span>
        {isSorted ? (direction === 'ascending' ? <SortUpIcon /> : <SortDownIcon />) : <SortIcon />}
      </div>
    </th>
  );
};

export const ReportTable: React.FC<ReportTableProps> = ({ students, onRowClick, sortConfig, onSort }) => {
  return (
    <div className="overflow-x-auto shadow-lg rounded-xl border border-stone-200">
      <table className="min-w-full divide-y divide-stone-200">
        <thead className="bg-stone-200">
          <tr>
            <th scope="col" className="w-1/6 px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">
              اسم الطالب
            </th>
            <SortableHeader label="الحلقة" sortKey="circle" sortConfig={sortConfig} onSort={onSort} className="hidden md:table-cell" />
            <SortableHeader label="المعلم" sortKey="teacherName" sortConfig={sortConfig} onSort={onSort} className="hidden md:table-cell" />
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">
              إنجاز الحفظ
            </th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">
              إنجاز المراجعة
            </th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">
              إنجاز التثبيت
            </th>
            <SortableHeader label="الحضور" sortKey="attendance" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="النقاط" sortKey="totalPoints" sortConfig={sortConfig} onSort={onSort} className="hidden md:table-cell" />
          </tr>
        </thead>
        <tbody className="bg-stone-50 divide-y divide-stone-200">
          {students.map((student) => (
            <tr 
              key={student.username} 
              className={`transition-colors duration-200 cursor-pointer ${student.hasMultipleEntries ? 'bg-amber-100/40 hover:bg-amber-100/70 ring-1 ring-amber-300' : 'hover:bg-amber-100/50'}`} 
              onClick={() => onRowClick(student)}
            >
              <td className="px-6 py-4 text-sm font-medium text-stone-900 text-center">{student.studentName}</td>
              <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-stone-600 text-center">{student.circle}</td>
              <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-stone-600 text-center">{student.teacherName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 min-w-[150px] text-center">
                <div className='flex flex-col gap-1'>
                    <span>{student.memorizationPages.formatted}</span>
                    <div>
                        <ProgressBar value={student.memorizationPages.index} />
                        <p className="text-xs text-center text-gray-600 mt-1">{(student.memorizationPages.index * 100).toFixed(0)}%</p>
                    </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 min-w-[150px] text-center">
                 <div className='flex flex-col gap-1'>
                    <span>{student.reviewPages.formatted}</span>
                    <div>
                        <ProgressBar value={student.reviewPages.index} />
                        <p className="text-xs text-center text-gray-600 mt-1">{(student.reviewPages.index * 100).toFixed(0)}%</p>
                    </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 min-w-[150px] text-center">
                 <div className='flex flex-col gap-1'>
                    <span>{student.consolidationPages.formatted}</span>
                     <div>
                        <ProgressBar value={student.consolidationPages.index} />
                        <p className="text-xs text-center text-gray-600 mt-1">{(student.consolidationPages.index * 100).toFixed(0)}%</p>
                    </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 text-center">
                <div className='w-24 mx-auto'>
                    <ProgressBar value={student.attendance} />
                    <p className="text-xs text-center text-gray-600 mt-1">{(student.attendance * 100).toFixed(0)}%</p>
                </div>
              </td>
              <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm font-semibold text-stone-800 text-center">{student.totalPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};