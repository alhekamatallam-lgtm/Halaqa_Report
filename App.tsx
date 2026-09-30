import React, { useState, useEffect, useMemo } from 'react';
import EvaluationPage from './pages/EvaluationPage';
import EvaluationReportPage from './pages/EvaluationReportPage';
import CombinedAttendancePage from './pages/CombinedAttendancePage';
import TeacherAttendanceReportPage from './pages/TeacherAttendanceReportPage';
import SupervisorAttendanceReportPage from './pages/SupervisorAttendanceReportPage';
import PasswordModal from './components/PasswordModal';
import { Sidebar, type Page } from './components/Sidebar';
import Notification from './components/Notification';
import type {
    RawSupervisorData,
    SupervisorData,
    RawTeacherAttendanceData,
    TeacherDailyAttendance,
    TeacherInfo,
    RawSupervisorAttendanceData,
    SupervisorAttendanceReportEntry,
    SupervisorDailyAttendance,
    RawTeacherInfo,
    EvalQuestion,
    EvalSubmissionPayload,
    ProcessedEvalResult,
    RawEvalResult,
    RawProductorData,
    ProductorData,
    CombinedTeacherAttendanceEntry,
    AuthenticatedUser,
} from './types';
import { MenuIcon } from './components/icons';
import initialData from './initialData.json';

const API_URL = 'https://script.google.com/macros/s/AKfycbxbmwdJKfAZmeStYZv82hmNJkC1je_bY0IcfiJ1fhfo8Qz7I-b10Mb1Z-EcCpbjnTA/exec';
const LOGO_URL = 'https://i.ibb.co/ZzqqtpZQ/1-page-001-removebg-preview.png';

const normalizeArabicForMatch = (text: string) => {
    if (!text) return '';
    return text
        .normalize('NFC')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/[إأآا]/g, 'ا')
        .replace(/[يى]/g, 'ي')
        .replace(/ة/g, 'ه')
        .trim();
};

const processEvalResultsData = (
    data: RawEvalResult[],
    questions: EvalQuestion[]
): { processedResults: ProcessedEvalResult[]; headerMap: Map<number, string> } => {
    const headerMap = new Map<number, string>();
    const maxScore = questions.reduce((sum, q) => sum + q.mark, 0);

    if (data.length > 0) {
        const firstRow = data[0];
        const headers = Object.keys(firstRow);
        const normalize = (text: string): string =>
            String(text || '')
                .normalize('NFC')
                .replace(/[\u200B-\u200D\uFEFF\s]/g, '')
                .replace(/[إأآا]/g, 'ا');

        questions.forEach(q => {
            const normalizedQue = normalize(q.que);
            const foundHeader = headers.find(h => normalize(h) === normalizedQue);
            if (foundHeader) {
                headerMap.set(q.id, foundHeader.trim());
            } else {
                headerMap.set(q.id, q.que.trim());
            }
        });
    } else {
        questions.forEach(q => {
            headerMap.set(q.id, q.que.trim());
        });
    }

    const processedResults = data.map((row, index) => {
        let totalScore = 0;
        const scores = questions.map(q => {
            const header = headerMap.get(q.id);
            if (!header) {
                return { question: q.que, score: 0, maxMark: q.mark };
            }
            const score = Number(row[header as keyof RawEvalResult]) || 0;
            totalScore += score;
            return {
                question: q.que,
                score: score,
                maxMark: q.mark,
            };
        });

        return {
            id: `${row['المعلم']}-${row['الحلقة']}-${index}`,
            teacherName: String(row['المعلم'] || ''),
            circleName: String(row['الحلقة'] || ''),
            totalScore,
            maxScore,
            scores,
        };
    }).sort((a, b) => b.totalScore - a.totalScore);

    return { processedResults, headerMap };
};

const processSupervisorData = (data: RawSupervisorData[]): SupervisorData[] => {
    const supervisorMap = new Map<string, { supervisorName: string; password: string; circles: string[] }>();
    data.forEach(item => {
        const supervisorId = String(item['id'] || '').trim();
        const supervisorName = String(item['المشرف'] || '').trim();
        const password = String(item['كلمة المرور'] || '').trim();
        const circle = String(item['الحلقة'] || '').trim();

        if (supervisorId && supervisorName) {
            if (!supervisorMap.has(supervisorId)) {
                supervisorMap.set(supervisorId, { supervisorName, password, circles: [] });
            }

            const supervisorEntry = supervisorMap.get(supervisorId)!;
            if (circle && !supervisorEntry.circles.includes(circle)) {
                supervisorEntry.circles.push(circle);
            }
        }
    });

    return Array.from(supervisorMap.entries()).map(([id, data]) => ({
        id,
        supervisorName: data.supervisorName,
        password: data.password,
        circles: data.circles,
    }));
};

const processProductorData = (data: RawProductorData[]): ProductorData[] => {
    return data
        .map(item => ({
            role: (item['role'] || '').trim(),
            name: (item['name'] || '').trim(),
            password: String(item['pwd'] || '').trim(),
        }))
        .filter(item => item.role && item.name && item.password);
};

const processTeachersInfoData = (data: RawTeacherInfo[]): TeacherInfo[] => {
    return data
        .map(item => ({
            id: Number(item['teacher_id']),
            name: normalizeArabicForMatch(item['المعلم'] || ''),
            circle: String(item['الحلقات'] || '').trim(),
            circleTime: String(item['وقت الحلقة'] || '').trim()
        }))
        .filter(item => !isNaN(item.id) && item.name);
};

const processTeacherAttendanceReportData = (data: RawTeacherAttendanceData[], teachersInfo: TeacherInfo[]): CombinedTeacherAttendanceEntry[] => {
    const teacherLookup = new Map<number, TeacherInfo>();
    teachersInfo.forEach(t => teacherLookup.set(t.id, t));

    const groupMap = new Map<string, { id: number, date: string, times: string[] }>();

    data.forEach(item => {
        const id = Number(item.teacher_id);
        const rawDate = String(item['تاريخ العملية'] || '').trim().split(' ')[0];
        const rawTime = String(item['وقت العملية'] || '').trim().split(' ').pop() || '';

        if (isNaN(id) || !rawDate || !rawTime) return;

        const key = `${id}|${rawDate}`;
        if (!groupMap.has(key)) {
            groupMap.set(key, { id, date: rawDate, times: [] });
        }
        groupMap.get(key)!.times.push(rawTime);
    });

    const report: CombinedTeacherAttendanceEntry[] = [];

    groupMap.forEach((group, key) => {
        const info = teacherLookup.get(group.id);
        if (!info) return;

        const sortedTimes = group.times.sort();
        const checkInTime = sortedTimes[0];
        const checkOutTime = sortedTimes.length > 1 ? sortedTimes[sortedTimes.length - 1] : null;

        report.push({
            id: key,
            teacherId: group.id,
            teacherName: info.name,
            circles: info.circle || '—',
            circleTime: info.circleTime || '—',
            date: group.date,
            checkInTime: checkInTime,
            checkOutTime: checkOutTime,
            status: 'حاضر'
        });
    });

    return report.sort((a, b) => b.date.localeCompare(a.date));
};

const parseAttendanceTime = (dateStr: string, timeStr: string): Date | null => {
    try {
        const datePart = dateStr.split(' ')[0];
        const timePart = timeStr.split(' ').pop() || '';
        if (!datePart || !timePart) return null;

        const d = new Date(`${datePart}T${timePart}`);
        return isNaN(d.getTime()) ? null : d;
    } catch (e) {
        return null;
    }
};

const processTeacherAttendanceData = (data: RawTeacherAttendanceData[], allTeachers: TeacherInfo[]): TeacherDailyAttendance[] => {
    const timeZone = 'Asia/Riyadh';
    const todayRiyadhStr = new Date().toLocaleDateString('en-CA', { timeZone });
    const teacherRecords = new Map<number, { teacherName: string, checkIn: Date | null, checkOut: Date | null }>();

    allTeachers.forEach(t => {
        teacherRecords.set(t.id, { teacherName: t.name, checkIn: null, checkOut: null });
    });

    data.forEach(item => {
        const id = Number(item.teacher_id);
        if (isNaN(id) || !teacherRecords.has(id)) return;

        const dateStr = String(item['تاريخ العملية'] || '');
        const timeStr = String(item['وقت العملية'] || '');

        if (dateStr.includes(todayRiyadhStr)) {
            const record = teacherRecords.get(id)!;
            const status = (item.status || '').trim();
            const actualTime = parseAttendanceTime(dateStr, timeStr);

            if (status === 'حضور' || status === 'الحضور') {
                record.checkIn = actualTime;
            } else if (status === 'انصراف') {
                record.checkOut = actualTime;
            }
        }
    });

    return Array.from(teacherRecords.values()).map(record => {
        let status: 'لم يحضر' | 'حاضر' | 'مكتمل الحضور' = 'لم يحضر';
        if (record.checkIn && record.checkOut) status = 'مكتمل الحضور';
        else if (record.checkIn) status = 'حاضر';
        return { teacherName: record.teacherName, checkIn: record.checkIn, checkOut: record.checkOut, status };
    });
};

const processSupervisorAttendanceData = (data: RawSupervisorAttendanceData[], allSupervisors: SupervisorData[]): SupervisorDailyAttendance[] => {
    const timeZone = 'Asia/Riyadh';
    const todayRiyadhStr = new Date().toLocaleDateString('en-CA', { timeZone });
    const supervisorRecords = new Map<string, { supervisorName: string, checkIn: Date | null, checkOut: Date | null }>();

    allSupervisors.forEach(s => {
        supervisorRecords.set(s.id, { supervisorName: s.supervisorName, checkIn: null, checkOut: null });
    });

    data.forEach(item => {
        const supervisorId = String(item.id || '').trim();
        if (!supervisorId || !supervisorRecords.has(supervisorId)) return;

        const dateStr = String(item['تاريخ العملية'] || '');
        const timeStr = String(item['وقت العملية'] || '');

        if (dateStr.includes(todayRiyadhStr)) {
            const record = supervisorRecords.get(supervisorId)!;
            const status = (item.status || '').trim();
            const actualTime = parseAttendanceTime(dateStr, timeStr);

            if (status === 'حضور' || status === 'الحضور') {
                record.checkIn = actualTime;
            } else if (status === 'انصراف') {
                record.checkOut = actualTime;
            }
        }
    });

    return Array.from(supervisorRecords.values()).map(record => {
        let status: 'لم يحضر' | 'حاضر' | 'مكتمل الحضور' = 'لم يحضر';
        if (record.checkIn && record.checkOut) status = 'مكتمل الحضور';
        else if (record.checkIn) status = 'حاضر';
        return { supervisorName: record.supervisorName, checkIn: record.checkIn, checkOut: record.checkOut, status };
    });
};

const processSupervisorAttendanceReportData = (data: RawSupervisorAttendanceData[], allSupervisors: SupervisorData[]): SupervisorAttendanceReportEntry[] => {
    const supervisorLookup = new Map<string, { name: string, circle: string }>();
    allSupervisors.forEach(s => {
        supervisorLookup.set(s.id, {
            name: s.supervisorName,
            circle: s.circles.join('، ') || '—'
        });
    });

    const groupMap = new Map<string, { id: string, date: string, times: string[] }>();

    data.forEach(item => {
        const id = String(item.id || '').trim();
        const rawDate = String(item['تاريخ العملية'] || '').trim().split(' ')[0];
        const rawTime = String(item['وقت العملية'] || '').trim().split(' ').pop() || '';

        if (!id || !rawDate || !rawTime) return;

        const key = `${id}|${rawDate}`;
        if (!groupMap.has(key)) {
            groupMap.set(key, { id, date: rawDate, times: [] });
        }
        groupMap.get(key)!.times.push(rawTime);
    });

    const report: SupervisorAttendanceReportEntry[] = [];

    groupMap.forEach((group) => {
        const info = supervisorLookup.get(group.id);
        if (!info) return;

        const sortedTimes = group.times.sort();
        const checkInTime = sortedTimes[0];
        const checkOutTime = sortedTimes.length > 1 ? sortedTimes[sortedTimes.length - 1] : null;

        report.push({
            supervisorId: group.id,
            supervisorName: info.name,
            circle: info.circle,
            date: group.date,
            checkInTime: checkInTime,
            checkOutTime: checkOutTime,
            status: 'حاضر'
        });
    });

    return report.sort((a, b) => b.date.localeCompare(a.date));
};

// طلب "متحوّط": خادم Google Apps Script يتأخر أحياناً أو يرجع 404 بشكل عشوائي،
// فإذا تأخر الرد نرسل نسخة إضافية من نفس الطلب ونأخذ أول رد سليم
const hedgedFetchJson = (
    makeRequest: () => Promise<Response>,
    opts: { hedgeAfterMs: number; maxAttempts: number; totalTimeoutMs: number }
): Promise<any> =>
    new Promise((resolve, reject) => {
        let done = false;
        let attempts = 0;
        let failures = 0;
        let lastError: any = null;
        let hedgeTimer: any = null;
        const finish = (fn: () => void) => {
            if (done) return;
            done = true;
            clearTimeout(hedgeTimer);
            clearTimeout(totalTimer);
            fn();
        };
        const totalTimer = setTimeout(
            () => finish(() => reject(lastError || new Error('انتهت مهلة الاتصال بالخادم'))),
            opts.totalTimeoutMs
        );
        const launch = () => {
            if (done || attempts >= opts.maxAttempts) return;
            attempts++;
            clearTimeout(hedgeTimer);
            hedgeTimer = setTimeout(launch, opts.hedgeAfterMs);
            makeRequest()
                .then(async res => {
                    const text = await res.text();
                    if (!res.ok || !text.trim().startsWith('{')) throw new Error(`HTTP ${res.status}`);
                    const json = JSON.parse(text);
                    finish(() => resolve(json));
                })
                .catch(err => {
                    failures++;
                    lastError = err;
                    if (done) return;
                    if (attempts < opts.maxAttempts) launch();
                    else if (failures >= attempts) finish(() => reject(err));
                });
        };
        launch();
    });

const App: React.FC = () => {
    const [evalQuestions, setEvalQuestions] = useState<EvalQuestion[]>([]);
    const [evalResults, setEvalResults] = useState<ProcessedEvalResult[]>([]);
    const [evalHeaderMap, setEvalHeaderMap] = useState<Map<number, string>>(new Map());
    const [supervisors, setSupervisors] = useState<SupervisorData[]>([]);
    const [productors, setProductors] = useState<ProductorData[]>([]);
    const [teachersInfo, setTeachersInfo] = useState<TeacherInfo[]>([]);
    const [teacherAttendance, setTeacherAttendance] = useState<TeacherDailyAttendance[]>([]);
    const [combinedTeacherAttendanceLog, setCombinedTeacherAttendanceLog] = useState<CombinedTeacherAttendanceEntry[]>([]);
    const [supervisorAttendance, setSupervisorAttendance] = useState<SupervisorDailyAttendance[]>([]);
    const [supervisorAttendanceReport, setSupervisorAttendanceReport] = useState<SupervisorAttendanceReportEntry[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage] = useState("جاري التحميل...");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [liveReady, setLiveReady] = useState(false);
    const [liveLoadFailed, setLiveLoadFailed] = useState(false);
    const [fullLoaded, setFullLoaded] = useState(false);
    const [submittingTeacher, setSubmittingTeacher] = useState<string | null>(null);
    const [submittingSupervisor, setSubmittingSupervisor] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<Page>('combinedAttendance');
    const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [selectedEvalReport, setSelectedEvalReport] = useState<ProcessedEvalResult | null>(null);

    const asrTeachersInfo = useMemo(() => {
        return [...teachersInfo].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [teachersInfo]);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const processAllData = (dataContainer: any) => {
        const evalQuestionsData = dataContainer.eval;
        if (evalQuestionsData && Array.isArray(evalQuestionsData)) {
            const questions = evalQuestionsData as EvalQuestion[];
            setEvalQuestions(questions);
            const evalResultsData = dataContainer.Eval_result || [];
            const { processedResults, headerMap } = processEvalResultsData(evalResultsData as RawEvalResult[], questions);
            setEvalResults(processedResults);
            setEvalHeaderMap(headerMap);
        }

        const supervisorSheetData = dataContainer['supervisor'];
        let currentSupervisors: SupervisorData[] = [];
        if (supervisorSheetData && Array.isArray(supervisorSheetData)) {
            currentSupervisors = processSupervisorData(supervisorSheetData as RawSupervisorData[]);
            setSupervisors(currentSupervisors);
        }

        const productorSheetData = dataContainer.productor;
        if (productorSheetData && Array.isArray(productorSheetData)) {
            setProductors(processProductorData(productorSheetData as RawProductorData[]));
        }

        let currentAsrTeachers: TeacherInfo[] = [];
        const teachersSheetData = dataContainer.teachers;
        if (teachersSheetData && Array.isArray(teachersSheetData)) {
            currentAsrTeachers = processTeachersInfoData(teachersSheetData as RawTeacherInfo[]);
        }
        setTeachersInfo(currentAsrTeachers);

        const attendanceRaw = dataContainer.attandance || [];
        if (attendanceRaw && Array.isArray(attendanceRaw)) {
            setTeacherAttendance(processTeacherAttendanceData(attendanceRaw as RawTeacherAttendanceData[], currentAsrTeachers));
            setCombinedTeacherAttendanceLog(processTeacherAttendanceReportData(attendanceRaw as RawTeacherAttendanceData[], currentAsrTeachers));
        }

        const responRaw = dataContainer.respon || [];
        if (Array.isArray(responRaw)) {
            setSupervisorAttendance(processSupervisorAttendanceData(responRaw as RawSupervisorAttendanceData[], currentSupervisors));
            setSupervisorAttendanceReport(processSupervisorAttendanceReportData(responRaw as RawSupervisorAttendanceData[], currentSupervisors));
        }
    };

    // جلب البيانات: أولاً بيانات اليوم فقط (خفيفة وسريعة)، والسجل الكامل يُجلب عند فتح صفحات التقارير
    const fetchData = async (full: boolean) => {
        const url = full ? API_URL : `${API_URL}?mode=today`;
        const allDataJson = await hedgedFetchJson(
            () => fetch(`${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`),
            full
                ? { hedgeAfterMs: 90000, maxAttempts: 2, totalTimeoutMs: 180000 }
                : { hedgeAfterMs: 3000, maxAttempts: 5, totalTimeoutMs: 60000 }
        );
        if (!(allDataJson && allDataJson.success && allDataJson.data)) {
            throw new Error('استجابة غير صالحة من الخادم');
        }
        processAllData(allDataJson.data);
        setLiveReady(true);
        const isLight = allDataJson.mode === 'today';
        if (full || !isLight) setFullLoaded(true);
    };

    const loadData = async () => {
        setError(null);
        setLiveLoadFailed(false);
        if (initialData) {
            // نعرض الأسماء فوراً، لكن بدون حالات الحضور القديمة المخزنة في الكود
            processAllData({ ...(initialData as any), attandance: [], respon: [] });
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }

        try {
            await fetchData(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
            if (!initialData) {
                setError(msg);
            } else {
                setLiveLoadFailed(true);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const ensureFullData = async () => {
        if (fullLoaded) return;
        try {
            await fetchData(true);
        } catch (err) {
            setNotification({ message: 'تعذّر تحميل السجل الكامل للتقارير', type: 'error' });
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handlePostEvaluation = async (data: EvalSubmissionPayload) => {
        setIsSubmitting(true);
        setNotification(null);
        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(data),
            });
        } catch (err) {
            if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                // Google Apps Script CORS redirect normal behavior
            } else {
                setNotification({ message: 'فشل في إرسال التقييم.', type: 'error' });
                setIsSubmitting(false);
                return;
            }
        }

        // Optimistically add the new evaluation to state so it appears immediately
        const maxScore = evalQuestions.reduce((sum, q) => sum + q.mark, 0);
        let totalScore = 0;
        const scores = evalQuestions.map(q => {
            const header = evalHeaderMap.get(q.id) || q.que.trim();
            const score = Number(data[header]) || 0;
            totalScore += score;
            return {
                question: q.que,
                score,
                maxMark: q.mark,
            };
        });

        const newResult: ProcessedEvalResult = {
            id: `${data['المعلم']}-${data['الحلقة']}-${Date.now()}`,
            teacherName: String(data['المعلم'] || ''),
            circleName: String(data['الحلقة'] || ''),
            totalScore,
            maxScore,
            scores,
        };

        setEvalResults(prev => [newResult, ...prev].sort((a, b) => b.totalScore - a.totalScore));
        setNotification({ message: 'تم إرسال التقييم بنجاح!', type: 'success' });
        setIsSubmitting(false);
    };

    // إرسال إلى الشيت مع التحقق من نجاح العملية فعلاً
    const postToSheet = async (payload: Record<string, any>) => {
        // رقم طلب فريد: يسمح بإعادة الإرسال تلقائياً دون تكرار الصف في الشيت
        const rid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const body = JSON.stringify({ ...payload, rid });
        const json = await hedgedFetchJson(
            () => fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body,
            }),
            { hedgeAfterMs: 6000, maxAttempts: 4, totalTimeoutMs: 60000 }
        );
        if (json && json.success === false) {
            throw new Error(json.message || 'رفض الخادم العملية');
        }
    };

    const handlePostTeacherAttendance = async (teacherId: number, teacherName: string, action: 'حضور' | 'انصراف') => {
        const current = teacherAttendance.find(r => r.teacherName === teacherName);
        if (action === 'حضور' && current?.checkIn) {
            setNotification({ message: `${teacherName} مسجَّل حضوره مسبقاً اليوم`, type: 'error' });
            return;
        }
        if (action === 'انصراف' && current?.checkOut) {
            setNotification({ message: `${teacherName} مسجَّل انصرافه مسبقاً اليوم`, type: 'error' });
            return;
        }
        const previous = current ? { ...current } : null;
        const now = new Date();
        setSubmittingTeacher(teacherName);

        // تحديث فوري للبطاقة بدون تعطيل بقية البطاقات
        setTeacherAttendance(prev => prev.map(record => {
            if (record.teacherName !== teacherName) return record;
            const updated: any = { ...record };
            if (action === 'حضور') updated.checkIn = now; else updated.checkOut = now;
            if (updated.checkIn && updated.checkOut) updated.status = 'مكتمل الحضور';
            else if (updated.checkIn) updated.status = 'حاضر';
            return updated;
        }));

        try {
            await postToSheet({
                sheet: 'attandance',
                "teacher_id": teacherId,
                "name": teacherName,
                "status": action,
                "time": now.toISOString(),
            });
            setNotification({ message: `تم تسجيل ${action} للمعلم ${teacherName} بنجاح`, type: 'success' });
        } catch (err) {
            if (previous) setTeacherAttendance(prev => prev.map(r => (r.teacherName === teacherName ? previous : r)));
            setNotification({ message: `تعذّر تسجيل ${action} للمعلم ${teacherName} — تحقق من الاتصال وأعد المحاولة`, type: 'error' });
        } finally {
            setSubmittingTeacher(cur => (cur === teacherName ? null : cur));
        }
    };

    const handlePostSupervisorAttendance = async (supervisorId: string, action: 'حضور' | 'انصراف') => {
        const supervisor = supervisors.find(s => s.id === supervisorId);
        if (!supervisor) return;
        const supervisorName = supervisor.supervisorName;
        const current = supervisorAttendance.find(r => r.supervisorName === supervisorName);
        if (action === 'حضور' && current?.checkIn) {
            setNotification({ message: `${supervisorName} مسجَّل حضوره مسبقاً اليوم`, type: 'error' });
            return;
        }
        if (action === 'انصراف' && current?.checkOut) {
            setNotification({ message: `${supervisorName} مسجَّل انصرافه مسبقاً اليوم`, type: 'error' });
            return;
        }
        const previous = current ? { ...current } : null;
        const now = new Date();
        setSubmittingSupervisor(supervisorName);

        setSupervisorAttendance(prev => prev.map(record => {
            if (record.supervisorName !== supervisorName) return record;
            const updated: any = { ...record };
            if (action === 'حضور') updated.checkIn = now; else updated.checkOut = now;
            if (updated.checkIn && updated.checkOut) updated.status = 'مكتمل الحضور';
            else if (updated.checkIn) updated.status = 'حاضر';
            return updated;
        }));

        try {
            await postToSheet({
                sheet: 'respon',
                "id": supervisorId,
                "name": supervisorName,
                "status": action,
                "time": now.toISOString(),
            });
            setNotification({ message: `تم تسجيل ${action} للمشرف ${supervisorName} بنجاح`, type: 'success' });
        } catch (err) {
            if (previous) setSupervisorAttendance(prev => prev.map(r => (r.supervisorName === supervisorName ? previous : r)));
            setNotification({ message: `تعذّر تسجيل ${action} للمشرف ${supervisorName} — تحقق من الاتصال وأعد المحاولة`, type: 'error' });
        } finally {
            setSubmittingSupervisor(cur => (cur === supervisorName ? null : cur));
        }
    };

    const handleNavigation = (page: Page) => {
        if (['teacherAttendanceReport', 'supervisorAttendanceReport', 'evaluationReport'].includes(page)) {
            ensureFullData();
        }
        if (!authenticatedUser && ['evaluation', 'evaluationReport'].includes(page)) {
            setCurrentPage(page);
            setShowPasswordModal(true);
            setIsMobileSidebarOpen(false);
            return;
        }
        setCurrentPage(page);
        setShowPasswordModal(false);
        setIsMobileSidebarOpen(false);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-stone-50">
                <img src={LOGO_URL} alt="شعار المجمع" className="w-28 h-28 animate-pulse mb-4" />
                <div className="flex items-center gap-3 text-stone-700 font-semibold text-lg">
                    <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <p>{loadingMessage}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-red-50 p-4 text-center">
                <div className="bg-white p-6 rounded-xl shadow-lg max-w-md">
                    <h3 className="text-lg font-bold text-red-800 mb-2">فشل تحميل البيانات</h3>
                    <p className="text-stone-600 mb-6">{error}</p>
                    <button onClick={loadData} className="w-full px-4 py-2 bg-amber-500 text-white rounded-md font-semibold hover:bg-amber-600">إعادة المحاولة</button>
                </div>
            </div>
        );
    }

    const titles: Record<Page, string> = {
        combinedAttendance: 'حضور المعلمين والمشرفين',
        teacherAttendanceReport: 'تقرير حضور المعلمين',
        supervisorAttendanceReport: 'تقرير حضور المشرفين',
        evaluation: `زيارة معلم حلقة ${authenticatedUser ? `- ${authenticatedUser.name}` : ''}`,
        evaluationReport: 'تقارير زيارات المعلمين',
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'combinedAttendance':
                return (
                    <CombinedAttendancePage
                        allTeachers={asrTeachersInfo}
                        teacherAttendanceStatus={teacherAttendance}
                        onTeacherSubmit={handlePostTeacherAttendance}
                        submittingTeacher={submittingTeacher}
                        allSupervisors={supervisors.map(s => ({ id: s.id, name: s.supervisorName }))}
                        supervisorAttendanceStatus={supervisorAttendance}
                        onSupervisorSubmit={handlePostSupervisorAttendance}
                        submittingSupervisor={submittingSupervisor}
                        isSubmitting={!liveReady}
                        authenticatedUser={authenticatedUser}
                    />
                );
            case 'teacherAttendanceReport':
                return (
                    <TeacherAttendanceReportPage
                        reportData={combinedTeacherAttendanceLog}
                    />
                );
            case 'supervisorAttendanceReport':
                return (
                    <SupervisorAttendanceReportPage
                        reportData={supervisorAttendanceReport}
                    />
                );
            case 'evaluation':
                return authenticatedUser ? (
                    <EvaluationPage
                        onSubmit={handlePostEvaluation}
                        isSubmitting={isSubmitting}
                        authenticatedUser={authenticatedUser}
                        evalQuestions={evalQuestions}
                        evalResults={evalResults}
                        evalHeaderMap={evalHeaderMap}
                        allTeachers={teachersInfo}
                        onSelectReport={(r) => {
                            setSelectedEvalReport(r);
                            setCurrentPage('evaluationReport');
                        }}
                    />
                ) : null;
            case 'evaluationReport':
                return (
                    <EvaluationReportPage
                        evalResults={evalResults}
                        authenticatedUser={authenticatedUser}
                        key={selectedEvalReport?.id || 'list'}
                        initialSelectedReport={selectedEvalReport}
                    />
                );
            default:
                return (
                    <CombinedAttendancePage
                        allTeachers={asrTeachersInfo}
                        teacherAttendanceStatus={teacherAttendance}
                        onTeacherSubmit={handlePostTeacherAttendance}
                        submittingTeacher={submittingTeacher}
                        allSupervisors={supervisors.map(s => ({ id: s.id, name: s.supervisorName }))}
                        supervisorAttendanceStatus={supervisorAttendance}
                        onSupervisorSubmit={handlePostSupervisorAttendance}
                        submittingSupervisor={submittingSupervisor}
                        isSubmitting={!liveReady}
                        authenticatedUser={authenticatedUser}
                    />
                );
        }
    };

    return (
        <div className="flex h-screen bg-stone-100" dir="rtl">
            <div className={`print-hidden lg:flex lg:flex-shrink-0 fixed lg:relative inset-y-0 right-0 z-40 transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0`}>
                <Sidebar
                    currentPage={currentPage}
                    onNavigate={handleNavigation}
                    isCollapsed={isSidebarCollapsed}
                    onToggle={() => setIsSidebarCollapsed(prev => !prev)}
                    authenticatedUser={authenticatedUser}
                />
            </div>
            {isMobileSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setIsMobileSidebarOpen(false)}></div>}
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto transition-all duration-300">
                <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-20 p-4 md:px-6 border-b border-stone-200 flex justify-between items-center print-hidden">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl md:text-2xl font-bold text-stone-800">{titles[currentPage]}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {authenticatedUser ? (
                            <button
                                onClick={() => {
                                    setAuthenticatedUser(null);
                                    if (['evaluation', 'evaluationReport'].includes(currentPage)) {
                                        setCurrentPage('combinedAttendance');
                                    }
                                }}
                                className="px-3 py-1.5 text-xs font-bold text-stone-700 bg-stone-200 hover:bg-stone-300 rounded-lg transition-colors"
                            >
                                خروج ({authenticatedUser.name})
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowPasswordModal(true)}
                                className="px-3 py-1.5 text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg transition-colors"
                            >
                                دخول المشرفين
                            </button>
                        )}
                        <button
                            className="lg:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-md"
                            onClick={() => setIsMobileSidebarOpen(true)}
                        >
                            <MenuIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>
                <div className="p-4 md:p-6">{currentPage === 'combinedAttendance' && !liveReady && (
                            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold text-center">
                                {liveLoadFailed ? (
                                    <span>تعذّر جلب حالة الحضور من الشيت. <button onClick={() => loadData()} className="underline font-bold">إعادة المحاولة</button></span>
                                ) : (
                                    <span className="animate-pulse">جاري جلب حالة الحضور لليوم من الشيت... ستتفعّل الأزرار تلقائياً</span>
                                )}
                            </div>
                        )}
                        {renderPage()}</div>
            </main>
            {showPasswordModal && (
                <PasswordModal
                    onSuccess={(user) => {
                        setAuthenticatedUser(user);
                        setShowPasswordModal(false);
                    }}
                    onClose={() => {
                        setShowPasswordModal(false);
                        if (['evaluation', 'evaluationReport'].includes(currentPage)) {
                            setCurrentPage('combinedAttendance');
                        }
                    }}
                    supervisors={supervisors}
                    productors={productors}
                    teachersInfo={teachersInfo}
                />
            )}
            <Notification notification={notification} onClose={() => setNotification(null)} />
        </div>
    );
};

export default App;
