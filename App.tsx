import React, { useState, useEffect, useMemo } from 'react';
import StudentReportPage from './pages/StudentReportPage';
import CircleReportPage from './pages/CircleReportPage';
import GeneralReportPage from './pages/GeneralReportPage';
import DashboardPage from './pages/DashboardPage';
import NotesPage from './pages/NotesPage';
import EvaluationPage from './pages/EvaluationPage';
import PasswordModal from './components/PasswordModal';
import { Nav } from './components/Nav';
import Notification from './components/Notification';
import type { RawStudentData, ProcessedStudentData, Achievement, RawCircleEvaluationData, CircleEvaluationData, EvaluationSubmissionData, RawSupervisorData, SupervisorData } from './types';

const API_URL = 'https://script.google.com/macros/s/AKfycbwXlKv2wzbSStv602UBsQ3P1p7kTX-3nJ-bmAfbfjiKFrojtL6cfnzb-EmcNasIvw2s/exec';

const parseAchievement = (value: any): Achievement => {
  const strValue = String(value || '');
  if (!strValue || !strValue.includes('%')) {
    return { achieved: 0, required: 0, formatted: '0 / 0', index: 0 };
  }
  const parts = strValue.split('%');
  const achieved = parseFloat(parts[0]) || 0;
  const required = parseFloat(parts[1]) || 0;
  return {
    achieved,
    required,
    formatted: `${achieved} / ${required}`,
    index: required > 0 ? achieved / required : 0,
  };
};

const parsePercentage = (value: any): number => {
    if (typeof value === 'number') {
        return value > 1 ? value / 100 : value;
    }

    const strValue = String(value || '0').trim();
    if (strValue.endsWith('%')) {
        return (parseFloat(strValue.slice(0, -1)) || 0) / 100;
    }
    
    const numValue = parseFloat(strValue);
    if (isNaN(numValue)) return 0;

    return numValue > 1 ? numValue / 100 : numValue;
};


const processEvaluationData = (data: RawCircleEvaluationData[]): CircleEvaluationData[] => {
    return data.map(item => {
        const circleName = String(item["الحلقة"] || '').trim();
        if (!circleName) {
            return null;
        }

        return {
            circleName,
            discipline: parsePercentage(item["انضباط الحلقة"]),
            memorization: parsePercentage(item["انجاز الحفظ"]),
            review: parsePercentage(item["انجاز المراجعة"]),
            consolidation: parsePercentage(item["انجاز التثبيت"]),
            attendance: parsePercentage(item["نسبة الحضور"]),
            generalIndex: parsePercentage(item["المؤشر العام"]),
            overall: parsePercentage(item["التقييم العام"]),
        };
    })
    .filter((item): item is CircleEvaluationData => item !== null);
};

const processSupervisorData = (data: RawSupervisorData[]): SupervisorData[] => {
    const supervisorMap = new Map<string, { password: string; circles: string[] }>();
    data.forEach(item => {
        const supervisorName = (item['المشرف'] || '').trim();
        const password = (item['كلمة المرور'] || '').trim();
        const circle = (item['الحلقة'] || '').trim();

        if (supervisorName && password && circle) {
            if (!supervisorMap.has(supervisorName)) {
                supervisorMap.set(supervisorName, { password, circles: [] });
            }
            supervisorMap.get(supervisorName)!.circles.push(circle);
        }
    });

    return Array.from(supervisorMap.entries()).map(([supervisorName, data]) => ({
        supervisorName,
        ...data
    }));
};


const processData = (data: RawStudentData[]): ProcessedStudentData[] => {
    const normalize = (val: any): string => {
        const str = String(val || '');
        return str
            .normalize('NFC') 
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .trim()
            .replace(/\s+/g, ' ');
    };

    const studentsMap = new Map<number, ProcessedStudentData>();
    let lastStudentUsername: number | null = null;

    for (const item of data) {
        const username = item["اسم المستخدم"];
        const studentName = normalize(item["الطالب"]);

        if (studentName && username) {
            lastStudentUsername = username;
            const processedStudent: ProcessedStudentData = {
                studentName: studentName,
                username: username,
                circle: normalize(item["الحلقة"]),
                circleTime: normalize(item["وقت الحلقة"]),
                memorizationLessons: normalize(item["دروس الحفظ"]),
                memorizationPages: parseAchievement(item["أوجه الحفظ"]),
                reviewLessons: normalize(item["دروس المراجعة"]),
                reviewPages: parseAchievement(item["أوجه المراجه"]),
                consolidationPages: parseAchievement(item["أوجه التثبيت"]),
                teacherName: normalize(item["اسم المعلم"]),
                program: normalize(item["البرنامج"]),
                attendance: item["نسبة الحضور"] || 0,
                totalPoints: item["اجمالي النقاط"] || 0,
                guardianMobile: normalize(item["جوال ولي الأمر"]),
                hasMultipleEntries: false,
            };

            if (processedStudent.circle.includes('التبيان')) {
                const zeroAchievement = (achievement: Achievement): Achievement => ({
                    ...achievement,
                    achieved: 0,
                    formatted: `0 / ${achievement.required}`,
                    index: 0,
                });
                processedStudent.memorizationPages = zeroAchievement(processedStudent.memorizationPages);
                processedStudent.reviewPages = zeroAchievement(processedStudent.reviewPages);
                processedStudent.consolidationPages = zeroAchievement(processedStudent.consolidationPages);
            }
            
            studentsMap.set(username, processedStudent);
        } else if (lastStudentUsername) {
            const existingStudent = studentsMap.get(lastStudentUsername);
            if (existingStudent) {
                let isMerged = false;
                const newMemorization = normalize(item["دروس الحفظ"]);
                if (newMemorization && newMemorization.trim() !== '') {
                    existingStudent.memorizationLessons += `, ${newMemorization}`;
                    isMerged = true;
                }

                const newReview = normalize(item["دروس المراجعة"]);
                if (newReview && newReview.trim() !== '') {
                    existingStudent.reviewLessons += `, ${newReview}`;
                    isMerged = true;
                }
                if (isMerged) {
                    existingStudent.hasMultipleEntries = true;
                }
            }
        }
    }

    return Array.from(studentsMap.values());
};

type Page = 'students' | 'circles' | 'general' | 'dashboard' | 'notes' | 'evaluation';
type AuthenticatedUser = { role: 'admin' | 'supervisor', name: string, circles: string[] };

const App: React.FC = () => {
    const [students, setStudents] = useState<ProcessedStudentData[]>([]);
    const [evaluationData, setEvaluationData] = useState<CircleEvaluationData[]>([]);
    const [supervisors, setSupervisors] = useState<SupervisorData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<Page>('general');
    const [initialStudentFilter, setInitialStudentFilter] = useState<{ circle: string } | null>(null);
    const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            const cacheBuster = `&v=${new Date().getTime()}`;
            try {
                const allDataResponse = await fetch(`${API_URL}?${cacheBuster.substring(1)}`);
                if (!allDataResponse.ok) throw new Error(`خطأ في الشبكة: ${allDataResponse.statusText}`);
                const allDataJson = await allDataResponse.json();
                
                const dataContainer = allDataJson.data || allDataJson;
                
                const studentSheetName = Object.keys(dataContainer).find(name => name !== 'Evaluation_Sheet' && name !== 'supervisor');
                let allStudentsRaw: any[] = [];
                if (studentSheetName && Array.isArray(dataContainer[studentSheetName])) {
                    allStudentsRaw = dataContainer[studentSheetName];
                } else {
                     console.warn("لم يتم العثور على ورقة بيانات الطلاب.");
                }
                
                const processedStudents = processData(allStudentsRaw as RawStudentData[]);
                setStudents(processedStudents);
                
                const evaluationSheetData = dataContainer['Evaluation_Sheet'];
                if (evaluationSheetData && Array.isArray(evaluationSheetData)) {
                    const processedEvaluations = processEvaluationData(evaluationSheetData as RawCircleEvaluationData[]);
                    setEvaluationData(processedEvaluations);
                }

                const supervisorSheetData = dataContainer['supervisor'];
                if (supervisorSheetData && Array.isArray(supervisorSheetData)) {
                    const processedSupervisors = processSupervisorData(supervisorSheetData as RawSupervisorData[]);
                    setSupervisors(processedSupervisors);
                }

            } catch (err) {
                console.error("فشل في جلب البيانات:", err);
                setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handlePostEvaluation = async (data: EvaluationSubmissionData) => {
        setIsSubmitting(true);
        setNotification(null);
        try {
            const payload = {
                sheet: 'Evaluation_Sheet',
                ...data
            };

            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
            });
        } catch (err) {
            if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                 console.log('Fetch error occurred, likely due to Apps Script redirect. Proceeding with data refresh.');
            } else {
                console.error("فشل في إرسال التقييم:", err);
                setNotification({ message: 'فشل في إرسال التقييم. الرجاء التحقق من اتصالك بالإنترنت.', type: 'error' });
                setIsSubmitting(false);
                return;
            }
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const cacheBuster = `&v=${new Date().getTime()}`;
            const evaluationResponse = await fetch(`${API_URL}?sheetName=Evaluation_Sheet${cacheBuster}`);
            if (!evaluationResponse.ok) throw new Error(`خطأ في تحديث البيانات: ${evaluationResponse.statusText}`);
            const evaluationJson = await evaluationResponse.json();
            
            const dataContainer = evaluationJson.data || evaluationJson;
            const refreshedEvaluationsRaw = dataContainer['Evaluation_Sheet'] || (Array.isArray(dataContainer) ? dataContainer : []);
            
            if (!Array.isArray(refreshedEvaluationsRaw)) {
                 throw new Error('تنسيق بيانات التقييم المحدثة غير صالح.');
            }

            const processedEvaluations = processEvaluationData(refreshedEvaluationsRaw as RawCircleEvaluationData[]);
            setEvaluationData(processedEvaluations);
            setNotification({ message: 'تم إرسال التقييم بنجاح!', type: 'success' });
        } catch(refreshError) {
             console.error("فشل في تحديث البيانات بعد الإرسال:", refreshError);
             setNotification({ message: 'تم الإرسال، ولكن فشل تحديث البيانات. حاول تحديث الصفحة.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNavigation = (page: Page) => {
        setInitialStudentFilter(null);
        if (page === 'evaluation' && !authenticatedUser) {
            setShowPasswordModal(true);
            return;
        }
        setShowPasswordModal(false);
        setCurrentPage(page);
    };

    const handleCircleSelect = (circleName: string) => {
        setInitialStudentFilter({ circle: circleName });
        setCurrentPage('students');
    };
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-screen text-lg text-gray-600"><p>جاري تحميل البيانات...</p></div>;
    }
    
    if (error) {
        return <div className="flex justify-center items-center h-screen text-lg text-red-600 bg-red-50 p-4"><p>فشل تحميل البيانات: {error}</p></div>;
    }

    const titles = {
        students: 'لوحة متابعة الطلاب',
        circles: 'التقرير الإجمالي للحلقات',
        general: 'التقرير العام والشامل',
        dashboard: 'لوحة متابعة الحلقات',
        notes: 'ملاحظات الطلاب',
        evaluation: `تقييم الحلقات ${authenticatedUser ? `- ${authenticatedUser.name}` : ''}`
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'students':
                return <StudentReportPage students={students} initialFilter={initialStudentFilter} clearInitialFilter={() => setInitialStudentFilter(null)} />;
            case 'circles':
                return <CircleReportPage students={students} />;
            case 'general':
                return <GeneralReportPage students={students} />;
            case 'dashboard':
                return <DashboardPage students={students} onCircleSelect={handleCircleSelect} />;
            case 'notes':
                return <NotesPage students={students} />;
            case 'evaluation':
                 if (!authenticatedUser) return null;
                return (
                    <EvaluationPage
                        onSubmit={handlePostEvaluation}
                        isSubmitting={isSubmitting}
                        evaluationData={evaluationData}
                        students={students}
                        authenticatedUser={authenticatedUser}
                    />
                );
            default:
                return <StudentReportPage students={students} initialFilter={null} clearInitialFilter={() => {}} />;
        }
    };

    return (
        <div className="bg-stone-100 min-h-screen font-sans">
            <Notification notification={notification} onClose={() => setNotification(null)} />
            <header className="bg-stone-800 text-white shadow-lg pb-4">
                 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center pt-6">
                        <img src="https://i.ibb.co/L5x1y21/logo.png" alt="شعار الراجحي" className="h-20" />
                    </div>
                    <h1 className="text-3xl font-bold leading-tight text-center text-amber-400 pt-2 pb-6" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.5)'}}>
                       {titles[currentPage]}
                    </h1>
                </div>
                <Nav currentPage={currentPage} onNavigate={handleNavigation} />
            </header>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {renderPage()}
            </main>
            {showPasswordModal && (
                <PasswordModal
                    supervisors={supervisors}
                    onSuccess={(user) => {
                        setAuthenticatedUser(user);
                        setShowPasswordModal(false);
                        setCurrentPage('evaluation');
                    }}
                    onClose={() => setShowPasswordModal(false)}
                />
            )}
        </div>
    );
};

export default App;