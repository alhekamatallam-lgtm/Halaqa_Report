import React from 'react';

interface FilterControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  allCircleTimes: string[];
  selectedCircleTime: string;
  allTeachers: string[];
  selectedTeacher: string;
  availableCircles: string[];
  selectedCircle: string;
  allWeeks?: string[];
  selectedWeek?: string;
  onFilterChange: (filterType: 'time' | 'teacher' | 'circle' | 'week', value: string) => void;
  onClearFilters: () => void;
  searchLabel?: string;
  searchPlaceholder?: string;
  showWeekFilter?: boolean;
  weekFilterLabel?: string;
  weekFilterAllOptionLabel?: string;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  searchQuery,
  onSearchChange,
  allCircleTimes,
  selectedCircleTime,
  allTeachers,
  selectedTeacher,
  availableCircles,
  selectedCircle,
  allWeeks = [],
  selectedWeek = '',
  onFilterChange,
  onClearFilters,
  searchLabel = 'بحث بالطالب',
  searchPlaceholder = 'ادخل اسم الطالب...',
  showWeekFilter = true,
  weekFilterLabel = 'فلترة حسب الأسبوع',
  weekFilterAllOptionLabel = 'كل الأسابيع',
}) => {
  return (
    <div className="mb-8 bg-stone-50 p-6 rounded-xl shadow-lg border border-stone-200 print-hidden">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-1">
            <label htmlFor="search-filter" className="block text-sm font-medium text-stone-700 mb-2">{searchLabel}</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                id="search-filter"
                className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="teacher-filter" className="block text-sm font-medium text-stone-700 mb-2">فلترة حسب المعلم</label>
            <select
              id="teacher-filter"
              className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
              value={selectedTeacher}
              onChange={(e) => onFilterChange('teacher', e.target.value)}
            >
              <option value="">كل المعلمين</option>
              {allTeachers.map((teacher) => (
                <option key={teacher} value={teacher}>
                  {teacher}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="circle-filter" className="block text-sm font-medium text-stone-700 mb-2">فلترة حسب الحلقة</label>
            <select
              id="circle-filter"
              className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
              value={selectedCircle}
              onChange={(e) => onFilterChange('circle', e.target.value)}
            >
              <option value="">كل الحلقات</option>
              {availableCircles.map((circle) => (
                <option key={circle} value={circle}>
                  {circle}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="circle-time-filter" className="block text-sm font-medium text-stone-700 mb-2">فلترة حسب وقت الحلقة</label>
            <select
              id="circle-time-filter"
              className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
              value={selectedCircleTime}
              onChange={(e) => onFilterChange('time', e.target.value)}
            >
              <option value="">الكل</option>
              {allCircleTimes.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
          {showWeekFilter && (
            <div>
              <label htmlFor="week-filter" className="block text-sm font-medium text-stone-700 mb-2">{weekFilterLabel}</label>
              <select
                id="week-filter"
                className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                value={selectedWeek}
                onChange={(e) => onFilterChange('week', e.target.value)}
              >
                <option value="">{weekFilterAllOptionLabel}</option>
                {allWeeks.map((week) => (
                  <option key={week} value={week}>
                    {week}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <button
              onClick={onClearFilters}
              className="w-full h-10 px-4 text-sm font-semibold text-stone-700 bg-stone-200 rounded-md shadow-sm hover:bg-stone-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-400 transition-all duration-150"
              aria-label="مسح الفلتر"
            >
              مسح الفلتر
            </button>
          </div>
        </div>
    </div>
  );
};

export default FilterControls;