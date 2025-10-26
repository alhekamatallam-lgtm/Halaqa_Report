import React, { useState, useMemo } from 'react';
import type { EvaluationSubmissionData, CircleEvaluationData, ProcessedStudentData } from '../types';
import EvaluationModal from '../components/EvaluationModal';
import EvaluationTable from '../components/EvaluationTable';
import Pagination from '../components/Pagination';

type AuthenticatedUser = { role: 'admin' | 'supervisor', name: string, circles: string[] };
const ITEMS_PER_PAGE = 10;

interface EvaluationPageProps {
  onSubmit: (data: EvaluationSubmissionData) => Promise<void>;
  isSubmitting: boolean;
  evaluationData: CircleEvaluationData[];
  students: ProcessedStudentData[];
  authenticatedUser: AuthenticatedUser;
}

const EvaluationPage: React.FC<EvaluationPageProps> = ({ onSubmit, isSubmitting, evaluationData, students, authenticatedUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSubmit = async (data: EvaluationSubmissionData) => {
    await onSubmit(data);
    setIsModalOpen(false);
  };

  const visibleEvaluations = useMemo(() => {
    if (authenticatedUser.role === 'admin') {
      return evaluationData;
    }
    const supervisorCircles = new Set(authenticatedUser.circles);
    return evaluationData.filter(e => supervisorCircles.has(e.circleName));
  }, [evaluationData, authenticatedUser]);

  const manageableStudents = useMemo(() => {
    if (authenticatedUser.role === 'admin') {
      return students;
    }
    const supervisorCircles = new Set(authenticatedUser.circles);
    return students.filter(s => supervisorCircles.has(s.circle));
  }, [students, authenticatedUser]);

  const { paginatedEvaluations, totalPages } = useMemo(() => {
    const total = Math.ceil(visibleEvaluations.length / ITEMS_PER_PAGE);
    const paginated = visibleEvaluations.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
    return { paginatedEvaluations: paginated, totalPages: total };
  }, [visibleEvaluations, currentPage]);


  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2 text-sm font-semibold text-stone-900 bg-amber-500 rounded-md shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-150"
        >
          إضافة تقييم جديد
        </button>
      </div>
      
      <EvaluationTable evaluations={paginatedEvaluations} />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
       />

      {isModalOpen && (
        <EvaluationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          students={manageableStudents}
          evaluationData={visibleEvaluations}
        />
      )}
    </>
  );
};

export default EvaluationPage;
