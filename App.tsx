import React, { useState, useEffect, useMemo } from 'react';
import StudentReportPage from './pages/StudentReportPage';
import CircleReportPage from './pages/CircleReportPage';
import GeneralReportPage from './pages/GeneralReportPage';
import DashboardPage from './pages/DashboardPage';
import NotesPage from './pages/NotesPage';
import EvaluationPage from './pages/EvaluationPage';
import ExcellencePage from './pages/ExcellencePage';
import TeacherAttendancePage from './pages/TeacherAttendancePage';
import TeacherAttendanceReportPage from './pages/TeacherAttendanceReportPage';
import PasswordModal from './components/PasswordModal';
import { Nav } from './components/Nav';
import Notification from './components/Notification';
import { Spinner } from './components/Spinner';
import type { RawStudentData, ProcessedStudentData, Achievement, RawCircleEvaluationData, CircleEvaluationData, EvaluationSubmissionData, RawSupervisorData, SupervisorData, RawTeacherAttendanceData, TeacherDailyAttendance, TeacherAttendanceReportEntry, TeacherInfo } from './types';

const API_URL = 'https://script.google.com/macros/s/AKfycbx9ppbeol6DtF0g5zNRBj2uD5GmPwebFOBXDonw7eO-TIRoCM6rOMiLwIktQfiNPl11/exec';

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

const processTeacherAttendanceData = (data: RawTeacherAttendanceData[], allTeacherNames: string[]): TeacherDailyAttendance[] => {
    const timeZone = 'Asia/Riyadh';
    const todayRiyadh = new Date(new Date().toLocaleString('en-US', { timeZone }));
    todayRiyadh.setHours(0, 0, 0, 0);

    const teacherRecords = new Map<string, { checkIn: Date | null, checkOut: Date | null }>();

    allTeacherNames.forEach(name => {
        teacherRecords.set(name, { checkIn: null, checkOut: null });
    });

    data.forEach(item => {
        const timestamp = new Date(item['time']);
        const itemDateRiyadh = new Date(timestamp.toLocaleString('en-US', { timeZone }));
        itemDateRiyadh.setHours(0, 0, 0, 0);
        
        const teacherName = (item['name'] || '').trim();
        const status = (item.status || '').trim();

        if (itemDateRiyadh.getTime() === todayRiyadh.getTime() && teacherRecords.has(teacherName)) {
            const record = teacherRecords.get(teacherName)!;

            if (status === 'حضور' || status === 'الحض' || status === 'الحضور') {
                if (!record.checkIn || timestamp < record.checkIn) {
                    record.checkIn = timestamp;
                }
            } else if (status === 'انصراف') {
                if (!record.checkOut || timestamp > record.checkOut) {
                    record.checkOut = timestamp;
                }
            }
        }
    });

    return Array.from(teacherRecords.entries()).map(([teacherName, times]) => {
        let status: 'لم يحضر' | 'حاضر' | 'مكتمل الحضور' = 'لم يحضر';
        if (times.checkIn && times.checkOut) {
            status = 'مكتمل الحضور';
        } else if (times.checkIn) {
            status = 'حاضر';
        }
        
        return {
            teacherName,
            checkIn: times.checkIn,
            checkOut: times.checkOut,
            status,
        };
    });
};

const processTeacherAttendanceReportData = (data: RawTeacherAttendanceData[], allTeachers: string[]): TeacherAttendanceReportEntry[] => {
    const timeZone = 'Asia/Riyadh';
    
    const toRiyadhDateString = (date: Date): string => {
        const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).formatToParts(date);
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        return `${year}-${month}-${day}`;
    };

    const timeFormatOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone,
    };
    
    // Step 1: Aggregate check-in/check-out times per teacher per day
    const dailyRecords = new Map<string, { teacherName: string; date: string; checkIn: Date | null; checkOut: Date | null }>();

    data.forEach(item => {
        const timestamp = new Date(item.time);
        if (isNaN(timestamp.getTime())) return;
        
        const teacherName = (item.name || '').trim();
        const status = (item.status || '').trim();
        if (!teacherName) return;

        const dateString = toRiyadhDateString(timestamp);
        const mapKey = `${dateString}/${teacherName}`;

        let entry = dailyRecords.get(mapKey);
        if (!entry) {
            entry = { teacherName, date: dateString, checkIn: null, checkOut: null };
            dailyRecords.set(mapKey, entry);
        }
        
        if (status === 'حضور' || status === 'الحض' || status === 'الحضور') {
            if (!entry.checkIn || timestamp < entry.checkIn) {
                entry.checkIn = timestamp;
            }
        } else if (status === 'انصراف') {
            if (!entry.checkOut || timestamp > entry.checkOut) {
                entry.checkOut = timestamp;
            }
        }
    });

    // Step 2: Determine date range and add records for absent days
    if (data.length > 0 || allTeachers.length > 0) {
        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        data.forEach(item => {
            const timestamp = new Date(item.time);
            if (isNaN(timestamp.getTime())) return;
            if (!minDate || timestamp < minDate) minDate = timestamp;
            if (!maxDate || timestamp > maxDate) maxDate = timestamp;
        });

        const today = new Date();
        if (!maxDate || today > maxDate) {
            maxDate = today;
        }
        if (minDate && maxDate) {
            const workingDays = [0, 1, 2, 3]; // Sunday to Wednesday
            let currentDate = new Date(minDate);
            currentDate.setHours(0, 0, 0, 0);

            while (currentDate <= maxDate) {
                if (workingDays.includes(currentDate.getDay())) {
                    const dateString = toRiyadhDateString(currentDate);
                    allTeachers.forEach(teacherName => {
                        const mapKey = `${dateString}/${teacherName}`;
                        if (!dailyRecords.has(mapKey)) {
                            dailyRecords.set(mapKey, {
                                teacherName,
                                date: dateString,
                                checkIn: null,
                                checkOut: null,
                            });
                        }
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
    }

    // Step 3: Format the aggregated data into the final report structure
    const report: TeacherAttendanceReportEntry[] = Array.from(dailyRecords.values()).map(record => ({
        teacherName: record.teacherName,
        date: record.date,
        checkInTime: record.checkIn ? new Intl.DateTimeFormat('ar-EG-u-nu-latn', timeFormatOptions).format(record.checkIn) : null,
        checkOutTime: record.checkOut ? new Intl.DateTimeFormat('ar-EG-u-nu-latn', timeFormatOptions).format(record.checkOut) : null,
    }));

    // Step 4: Sort the final report
    return report.sort((a, b) => {
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
        return a.teacherName.localeCompare(b.teacherName, 'ar');
    });
};


const processData = (data: RawStudentData[]): ProcessedStudentData[] => {
    const processed: ProcessedStudentData[] = [];
    let lastStudent: ProcessedStudentData | null = null;

    const normalize = (val: any): string => {
        const str = String(val || '');
        return str
            .normalize('NFC')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .trim()
            .replace(/\s+/g, ' ');
    };

    for (const item of data) {
        const username = item["اسم المستخدم"];
        const studentName = normalize(item["الطالب"]);

        if (studentName && username) {
            const circle = normalize(item["الحلقة"]);
            const isTabyan = circle.includes('التبيان');

            const zeroAchievement = (achievement: Achievement): Achievement => ({
                ...achievement,
                achieved: 0,
                formatted: `0 / ${achievement.required.toFixed(1)}`,
                index: 0,
            });

            let memPages = parseAchievement(item["أوجه الحفظ"]);
            let revPages = parseAchievement(item["أوجه المراجه"]);
            let conPages = parseAchievement(item["أوجه التثبيت"]);

            if (isTabyan) {
                memPages = zeroAchievement(memPages);
                revPages = zeroAchievement(revPages);
                conPages = zeroAchievement(conPages);
            }

            const student: ProcessedStudentData = {
                studentName,
                username,
                circle,
                circleTime: normalize(item["وقت الحلقة"]),
                memorizationLessons: normalize(item["دروس الحفظ"]),
                memorizationPages: memPages,
                reviewLessons: normalize(item["دروس المراجعة"]),
                reviewPages: revPages,
                consolidationPages: conPages,
                teacherName: normalize(item["اسم المعلم"]),
                program: normalize(item["البرنامج"]),
                attendance: parsePercentage(item["نسبة الحضور"]),
                totalPoints: item["اجمالي النقاط"] || 0,
                guardianMobile: normalize(item["جوال ولي الأمر"]),
                week: normalize(item["الأسبوع"] || item["الاسبوع"]),
            };
            processed.push(student);
            lastStudent = student;
        } else if (lastStudent) {
            const newMemorization = normalize(item["دروس الحفظ"]);
            if (newMemorization && newMemorization.trim() !== '') {
                lastStudent.memorizationLessons += `, ${newMemorization}`;
            }

            const newReview = normalize(item["دروس المراجعة"]);
            if (newReview && newReview.trim() !== '') {
                lastStudent.reviewLessons += `, ${newReview}`;
            }
        }
    }
    return processed;
};


type Page = 'students' | 'circles' | 'general' | 'dashboard' | 'notes' | 'evaluation' | 'excellence' | 'teacherAttendance' | 'teacherAttendanceReport';
type AuthenticatedUser = { role: 'admin' | 'supervisor', name: string, circles: string[] };

const App: React.FC = () => {
    const [students, setStudents] = useState<ProcessedStudentData[]>([]);
    const [evaluationData, setEvaluationData] = useState<CircleEvaluationData[]>([]);
    const [supervisors, setSupervisors] = useState<SupervisorData[]>([]);
    const [teacherAttendance, setTeacherAttendance] = useState<TeacherDailyAttendance[]>([]);
    const [teacherAttendanceReport, setTeacherAttendanceReport] = useState<TeacherAttendanceReportEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittingTeacher, setSubmittingTeacher] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<Page>('general');
    const [initialStudentFilter, setInitialStudentFilter] = useState<{ circle: string } | null>(null);
    const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);

    const asrTeachersInfo = useMemo(() => {
        const teacherInfoMap = new Map<string, TeacherInfo>();
        students
            .filter(s => s.circleTime === 'العصر' && s.teacherName && s.circle)
            .forEach(s => {
                if (!teacherInfoMap.has(s.teacherName)) {
                    teacherInfoMap.set(s.teacherName, { name: s.teacherName, circle: s.circle });
                }
            });
        return Array.from(teacherInfoMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [students]);

    const asrTeacherNames = useMemo(() => asrTeachersInfo.map(t => t.name), [asrTeachersInfo]);


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
                // Fetch student and evaluation data
                const allDataResponse = await fetch(`${API_URL}?${cacheBuster.substring(1)}`);
                if (!allDataResponse.ok) throw new Error(`خطأ في الشبكة: ${allDataResponse.statusText}`);
                const allDataJson = await allDataResponse.json();
                
                const dataContainer = allDataJson.data || allDataJson;
                
                const studentSheetName = Object.keys(dataContainer).find(name => name !== 'Evaluation_Sheet' && name !== 'supervisor' && name !== 'attandance');
                let allStudentsRaw: any[] = [];
                if (studentSheetName && Array.isArray(dataContainer[studentSheetName])) {
                    allStudentsRaw = dataContainer[studentSheetName];
                } else {
                     console.warn("لم يتم العثور على ورقة بيانات الطلاب.");
                }
                
                const sanitizedStudentsRaw = allStudentsRaw.map(row => {
                    const newRow: { [key: string]: any } = {};
                    Object.keys(row).forEach(key => {
                        const cleanedKey = key.replace(/[\\u200B-\\u200D\\uFEFF]/g, '').trim();
                        newRow[cleanedKey] = row[key];
                    });
                    return newRow;
                });
                
                const processedStudents = processData(sanitizedStudentsRaw as RawStudentData[]);
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

                const attendanceRaw = dataContainer['attandance'] || [];
                if (attendanceRaw && Array.isArray(attendanceRaw)) {
                    const rawAttendanceData = attendanceRaw as RawTeacherAttendanceData[];
                    const currentAsrTeacherNames = Array.from<string>(new Set(
                        processedStudents
                            .filter(s => s.circleTime === 'العصر')
                            .map(s => s.teacherName)
                            .filter(Boolean)
                    ));
                    const processedAttendance = processTeacherAttendanceData(rawAttendanceData, currentAsrTeacherNames);
                    setTeacherAttendance(processedAttendance);

                    const processedReport = processTeacherAttendanceReportData(rawAttendanceData, currentAsrTeacherNames);
                    setTeacherAttendanceReport(processedReport);
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
    
    const handlePostTeacherAttendance = async (teacherName: string, action: 'حضور' | 'انصراف') => {
        setIsSubmitting(true);
        setSubmittingTeacher(teacherName);
        setNotification(null);
        const payload = {
            sheet: 'attandance',
            "name": teacherName,
            "status": action,
            "time": new Date().toISOString(),
        };

        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
            });
        } catch (err) {
            if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                console.log('Fetch error (attendance), likely due to Apps Script redirect. Proceeding.');
            } else {
                console.error("فشل في تسجيل الحضور:", err);
                setNotification({ message: 'فشل في تسجيل الحضور. الرجاء التحقق من اتصالك.', type: 'error' });
                setIsSubmitting(false);
                setSubmittingTeacher(null);
                return;
            }
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const cacheBuster = `&v=${new Date().getTime()}`;
            const attendanceResponse = await fetch(`${API_URL}?sheetName=attandance${cacheBuster}`);
            if (!attendanceResponse.ok) throw new Error(`خطأ في تحديث الحضور: ${attendanceResponse.statusText}`);
            const attendanceJson = await attendanceResponse.json();
            
            const dataContainer = attendanceJson.data || attendanceJson;
            const attendanceRaw = dataContainer['attandance'] || (Array.isArray(dataContainer) ? dataContainer : []);
            
            if (!Array.isArray(attendanceRaw)) {
                 throw new Error('تنسيق بيانات الحضور المحدثة غير صالح.');
            }
            
            const rawAttendanceData = attendanceRaw as RawTeacherAttendanceData[];
            const processedAttendance = processTeacherAttendanceData(rawAttendanceData, asrTeacherNames);
            setTeacherAttendance(processedAttendance);

            const processedReport = processTeacherAttendanceReportData(rawAttendanceData, asrTeacherNames);
            setTeacherAttendanceReport(processedReport);

            setNotification({ message: `تم تسجيل ${action} للمعلم ${teacherName} بنجاح!`, type: 'success' });
        } catch(refreshError) {
            console.error("فشل تحديث بيانات الحضور:", refreshError);
            setNotification({ message: 'تم التسجيل، ولكن فشل تحديث البيانات. حاول تحديث الصفحة.', type: 'error' });
        } finally {
            setIsSubmitting(false);
            setSubmittingTeacher(null);
        }
    };

    const handleNavigation = (page: Page) => {
        setInitialStudentFilter(null);
        if (page === 'evaluation' && !authenticatedUser) {
            setCurrentPage(page);
            setShowPasswordModal(true);
        } else {
            setCurrentPage(page);
            setShowPasswordModal(false);
        }
    };

    const handleCircleSelect = (circleName: string) => {
        setInitialStudentFilter({ circle: circleName });
        setCurrentPage('students');
    };
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Spinner />
            </div>
        );
    }
    
    if (error) {
        return <div className="flex justify-center items-center h-screen text-lg text-red-600 bg-red-50 p-4"><p>فشل تحميل البيانات: {error}</p></div>;
    }

    const titles = {
        students: 'لوحة متابعة الطلاب',
        circles: 'التقرير الإجمالي للحلقات',
        general: 'نظام متابعة اداء الحلقات',
        dashboard: 'لوحة متابعة الحلقات',
        notes: 'ملاحظات الطلاب',
        evaluation: `تقييم الحلقات ${authenticatedUser ? `- ${authenticatedUser.name}` : ''}`,
        excellence: 'منصة تميز الحلقات',
        teacherAttendance: 'حضور وانصراف المعلمين',
        teacherAttendanceReport: 'تقرير حضور المعلمين',
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
            case 'excellence':
                return <ExcellencePage students={students} />;
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
            case 'teacherAttendance':
                return (
                    <TeacherAttendancePage 
                        allTeachers={asrTeachersInfo}
                        attendanceStatus={teacherAttendance}
                        onSubmit={handlePostTeacherAttendance}
                        isSubmitting={isSubmitting}
                        submittingTeacher={submittingTeacher}
                        setHeaderVisible={setIsHeaderVisible}
                    />
                );
            case 'teacherAttendanceReport':
                return <TeacherAttendanceReportPage reportData={teacherAttendanceReport} />;
            default:
                return <StudentReportPage students={students} initialFilter={null} clearInitialFilter={() => {}} />;
        }
    };

    const mainContainerClass = currentPage === 'teacherAttendance' 
        ? "py-8 px-2 sm:px-4" // Full-width for attendance page
        : "max-w-7xl mx-auto py-8 sm:px-6 lg:px-8"; // Default centered layout

    return (
        <div className="bg-stone-100 min-h-screen font-sans">
            <Notification notification={notification} onClose={() => setNotification(null)} />
            {isHeaderVisible && (
                <header className="bg-stone-800/95 backdrop-blur-sm text-white shadow-lg pb-4 sticky top-0 z-40 print-hidden">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center pt-6">
                            <h2 className="text-xl font-semibold text-stone-200">مجمع الراجحي بشبرا</h2>
                        </div>
                        <h1 className="text-4xl font-bold leading-tight text-center text-amber-400 pt-2 pb-6" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.6)'}}>
                        {titles[currentPage]}
                        </h1>
                    </div>
                    <Nav currentPage={currentPage} onNavigate={handleNavigation} />
                </header>
            )}
            <main className={mainContainerClass}>
                <div className="animate-slide-in">
                  {renderPage()}
                </div>
            </main>
            {showPasswordModal && (
                <PasswordModal
                    supervisors={supervisors}
                    onSuccess={(user) => {
                        setAuthenticatedUser(user);
                        setShowPasswordModal(false);
                        if (currentPage !== 'evaluation') {
                            setCurrentPage('evaluation');
                        }
                    }}
                    onClose={() => setShowPasswordModal(false)}
                />
            )}
        </div>
    );
};

export default App;