import React, { useState, useMemo } from 'react';
import type { ProcessedEvalResult } from '../types';
import { ProgressBar } from './ProgressBar';
import Pagination from './Pagination';

const ITEMS_PER_PAGE = 5;

interface PastEvaluationsTableProps {
  results: ProcessedEvalResult[];
}

const PastEvaluationsTable: React.FC<PastEvaluationsTableProps> = ({ results }) => {
  const [currentPage, setCurrentPage] = useState(1);

  const { paginatedResults, totalPages } = useMemo(() => {
    const total = Math.ceil(results.length / ITEMS_PER_PAGE);
    const paginated = results.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
    return { paginatedResults: paginated, totalPages: total };
  }, [results, currentPage]);

  return (
    <div className="space-y-4">
        <div className="overflow-x-auto border border-stone-200 rounded-lg">
            <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-100">
                <tr>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">المعلم</th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">الحلقة</th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">الدرجة الإجمالية</th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-200">
                {paginatedResults.length > 0 ? (
                    paginatedResults.map((item) => (
                    <tr key={item.id} className="hover:bg-amber-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-stone-900 text-center">{item.teacherName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-700 text-center">{item.circleName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 min-w-[150px] text-center">
                            <div className='w-32 mx-auto space-y-1'>
                                <p className="font-bold">{item.totalScore} / {item.maxScore}</p>
                                <ProgressBar value={item.maxScore > 0 ? item.totalScore / item.maxScore : 0} />
                            </div>
                        </td>
                    </tr>
                    ))
                ) : (
                    <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-stone-500">
                        لا توجد زيارات سابقة لعرضها.
                    </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
        {totalPages > 1 && (
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        )}
    </div>
  );
};

export default PastEvaluationsTable;
