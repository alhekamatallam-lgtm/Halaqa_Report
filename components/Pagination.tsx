import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) {
    return null;
  }

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    const halfPagesToShow = Math.floor(maxPagesToShow / 2);
    
    let startPage = Math.max(1, currentPage - halfPagesToShow);
    let endPage = Math.min(totalPages, currentPage + halfPagesToShow);

    if (currentPage - halfPagesToShow <= 0) {
        endPage = Math.min(totalPages, maxPagesToShow);
    }

    if (currentPage + halfPagesToShow >= totalPages) {
        startPage = Math.max(1, totalPages - maxPagesToShow + 1);
    }

    if (startPage > 1) {
        pageNumbers.push(
            <button key={1} onClick={() => handlePageClick(1)} className="px-4 py-2 text-sm font-medium text-stone-700 bg-white rounded-md hover:bg-stone-100 border border-stone-300">
                1
            </button>
        );
        if (startPage > 2) {
            pageNumbers.push(<span key="start-ellipsis" className="px-4 py-2 text-sm text-stone-500">...</span>);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(
            <button
                key={i}
                onClick={() => handlePageClick(i)}
                className={`px-4 py-2 text-sm font-medium rounded-md border ${
                    i === currentPage
                        ? 'bg-amber-500 text-white border-amber-500 shadow-inner'
                        : 'bg-white text-stone-700 hover:bg-stone-100 border-stone-300'
                }`}
                aria-current={i === currentPage ? 'page' : undefined}
            >
                {i}
            </button>
        );
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pageNumbers.push(<span key="end-ellipsis" className="px-4 py-2 text-sm text-stone-500">...</span>);
        }
        pageNumbers.push(
            <button key={totalPages} onClick={() => handlePageClick(totalPages)} className="px-4 py-2 text-sm font-medium text-stone-700 bg-white rounded-md hover:bg-stone-100 border-stone-300">
                {totalPages}
            </button>
        );
    }

    return pageNumbers;
  };

  return (
    <div className="flex justify-between items-center mt-6 print-hidden">
        <button
            onClick={() => handlePageClick(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-stone-700 bg-white rounded-md hover:bg-stone-100 border border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            السابق
        </button>
        <div className="hidden sm:flex items-center gap-2">
            {renderPageNumbers()}
        </div>
        <button
            onClick={() => handlePageClick(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-stone-700 bg-white rounded-md hover:bg-stone-100 border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
             التالي
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
    </div>
  );
};

export default Pagination;
