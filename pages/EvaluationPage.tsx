import React, { useState, useMemo } from 'react';
import type { EvaluationSubmissionData, CircleEvaluationData, ProcessedStudentData } from '../types';
import EvaluationModal from '../components/EvaluationModal';
import EvaluationTable from '../components/EvaluationTable';

type AuthenticatedUser = { role: 'admin' | 'supervisor', name: string, circles: string[] };

interface EvaluationPageProps {
  onSubmit: (data: EvaluationSubmissionData) => Promise<void>;
  isSubmitting: boolean;
  evaluationData: CircleEvaluationData[];
  students: ProcessedStudentData[];
  authenticatedUser: AuthenticatedUser;
}

const EvaluationPage: React.FC<EvaluationPageProps> = ({ onSubmit, isSubmitting, evaluationData, students, authenticatedUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      
      <EvaluationTable evaluations={visibleEvaluations} />

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