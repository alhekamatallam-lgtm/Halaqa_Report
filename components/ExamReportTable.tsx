import React from 'react';
import type { ProcessedExamData } from '../types';
import { SortIcon, SortUpIcon, SortDownIcon } from './icons';

type SortKey = keyof ProcessedExamData;

interface ExamReportTableProps {
  exams: ProcessedExamData[];
  sortConfig: { key: SortKey; direction: 'ascending' | 'descending' } | null;
  onSort: (key: SortKey) => void;
}

const SortableHeader: React.FC<{
  label: string;
  sortKey: SortKey;
  sortConfig: ExamReportTableProps['sortConfig'];
  onSort: ExamReportTableProps['onSort'];
  className?: string;
}> = ({ label, sortKey, sortConfig, onSort, className = '' }) => {
  const isSorted = sortConfig?.key === sortKey;
  const direction = sortConfig?.direction;

  return (
    <th
      scope="col"
      className={`px-4 py-3 text-center text-sm font-bold text-stone-700 uppercase tracking-wider cursor-pointer ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center justify-center gap-1">
        <span>{label}</span>
        {isSorted ? (direction === 'ascending' ? <SortUpIcon /> : <SortDownIcon />) : <SortIcon />}
      </div>
    </th>
  );
};

const ExamReportTable: React.FC<ExamReportTableProps> = ({ exams, onSort, sortConfig }) => {
  return (
    <div className="overflow-x-auto shadow-xl rounded-xl border border-stone-200 bg-white">
      <table className="min-w-full divide-y divide-stone-200">
        <thead className="bg-stone-200">
          <tr>
            <SortableHeader label="الطالب" sortKey="studentName" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="الحلقة" sortKey="circle" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="الاختبار" sortKey="examName" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="س1" sortKey="q1" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="س2" sortKey="q2" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="س3" sortKey="q3" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="س4" sortKey="q4" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="س5" sortKey="q5" sortConfig={sortConfig} onSort={onSort} />
            <SortableHeader label="الإجمالي" sortKey="totalScore" sortConfig={sortConfig} onSort={onSort} />
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-stone-200">
          {exams.length > 0 ? (
            exams.map((exam, index) => (
              <tr key={`${exam.studentName}-${exam.examName}-${index}`} className="hover:bg-amber-100/60 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-stone-900 text-center">{exam.studentName}</td>
                <td className="px-4 py-3 text-sm text-stone-600 text-center">{exam.circle}</td>
                <td className="px-4 py-3 text-sm text-stone-600 text-center">{exam.examName}</td>
                <td className="px-4 py-3 text-sm text-stone-600 text-center font-mono">{exam.q1}</td>
                <td className="px-4 py-3 text-sm text-stone-600 text-center font-mono">{exam.q2}</td>
                <td className="px-4 py-3 text-sm text-stone-600 text-center font-mono">{exam.q3}</td>
                <td className="px-4 py-3 text-sm text-stone-600 text-center font-mono">{exam.q4}</td>
                <td className="px-4 py-3 text-sm text-stone-600 text-center font-mono">{exam.q5}</td>
                <td className="px-4 py-3 text-sm font-bold text-amber-700 text-center">{exam.totalScore}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9} className="px-6 py-12 text-center text-stone-500">
                لا توجد نتائج اختبارات لعرضها.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ExamReportTable;