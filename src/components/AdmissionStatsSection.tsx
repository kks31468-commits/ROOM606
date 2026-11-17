import React, { useMemo, useState } from 'react';
import { Award, Building2, ChevronDown, ChevronUp, GraduationCap, Sparkles, TrendingUp, Users } from 'lucide-react';

export interface StatsPosterItem {
  id: number;
  studentNo: number;
  studentName: string;
  university: string;
  faculty: string;
}

export interface StatsStudentItem {
  no: number;
  prefix: 'นาย' | 'นางสาว';
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
}

interface AdmissionStatsSectionProps {
  posters: StatsPosterItem[];
  students: StatsStudentItem[];
  selectedUniversity: string;
  onSelectUniversity: (uni: string) => void;
  onSelectStudentFilter?: (studentName: string) => void;
  isLoading?: boolean;
}

interface FieldClusterRule {
  key: string;
  label: string;
  colorClass: string;
  barClass: string;
  keywords: string[];
}

const FIELD_CLUSTER_RULES: FieldClusterRule[] = [
  {
    key: 'engineering',
    label: 'วิศวกรรมศาสตร์ & เทคโนโลยี',
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    barClass: 'from-indigo-500 to-violet-500',
    keywords: ['วิศว', 'เครื่องกล', 'คอมพิวเตอร์', 'หุ่นยนต์', 'ไฟฟ้า', 'เมคคาทรอนิกส์', 'เคมีเภสัช', 'พาณิชย์นาวี'],
  },
  {
    key: 'science_health',
    label: 'วิทยาศาสตร์ สุขภาพ & พยาบาล',
    colorClass: 'text-sky-600 dark:text-sky-400',
    barClass: 'from-sky-500 to-cyan-500',
    keywords: ['สาธารณสุข', 'พยาบาล', 'อาชีวอนามัย', 'จุลชีววิทยา', 'การแพทย์', 'วิทยาศาสตร์'],
  },
  {
    key: 'business_arts',
    label: 'บริหาร บัญชี & ศิลปศาสตร์',
    colorClass: 'text-amber-600 dark:text-amber-400',
    barClass: 'from-amber-500 to-orange-500',
    keywords: ['บัญชี', 'บัชชี', 'วิทยาการจัดการ', 'ซัพพลายเชน', 'ธุรกิจ', 'ศิลปศาสตร์', 'จิตวิทยา'],
  },
  {
    key: 'edu_agri',
    label: 'ครุศาสตร์ & เกษตรศาสตร์',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    barClass: 'from-emerald-500 to-teal-500',
    keywords: ['ครุศาสตร์', 'ศึกษาศาสตร์', 'เกษตร', 'สัตว'],
  },
];

function classifyFaculty(faculty: string): string {
  const lower = faculty.toLowerCase();
  for (const rule of FIELD_CLUSTER_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.key;
    }
  }
  return 'other';
}

export function splitPosterUniversities(universityStr: string): string[] {
  return universityStr
    .split('&')
    .map((u) => u.trim())
    .filter(Boolean);
}

export const AdmissionStatsSection: React.FC<AdmissionStatsSectionProps> = ({
  posters,
  students,
  selectedUniversity,
  onSelectUniversity,
  onSelectStudentFilter,
  isLoading = false,
}) => {
  const [showAllUniversities, setShowAllUniversities] = useState(false);
  const [rightTab, setRightTab] = useState<'fields' | 'students'>('fields');

  const stats = useMemo(() => {
    const totalStudents = students.length || 40;
    const studentByNo = new Map(students.map((s) => [s.no, s]));

    const admittedMap = new Map<
      string,
      {
        key: string;
        studentNo: number;
        displayName: string;
        gender: 'M' | 'F' | 'U';
        offerCount: number;
        universities: Set<string>;
      }
    >();

    const uniMap = new Map<string, { name: string; offerCount: number; studentKeys: Set<string> }>();
    const clusterCounts = new Map<string, number>();

    for (const poster of posters) {
      const sKey = poster.studentNo > 0 ? `no:${poster.studentNo}` : `name:${poster.studentName}`;
      const matchedStudent = poster.studentNo > 0 ? studentByNo.get(poster.studentNo) : undefined;
      const inferredGender: 'M' | 'F' | 'U' = matchedStudent
        ? matchedStudent.gender
        : poster.studentName.startsWith('นาย')
        ? 'M'
        : poster.studentName.startsWith('นางสาว')
        ? 'F'
        : 'U';

      if (!admittedMap.has(sKey)) {
        admittedMap.set(sKey, {
          key: sKey,
          studentNo: poster.studentNo,
          displayName: matchedStudent
            ? `${matchedStudent.prefix}${matchedStudent.firstName} ${matchedStudent.lastName}`
            : poster.studentName,
          gender: inferredGender,
          offerCount: 0,
          universities: new Set(),
        });
      }
      const entry = admittedMap.get(sKey)!;
      entry.offerCount += 1;

      const unis = splitPosterUniversities(poster.university);
      for (const uni of unis) {
        entry.universities.add(uni);
        if (!uniMap.has(uni)) {
          uniMap.set(uni, { name: uni, offerCount: 0, studentKeys: new Set() });
        }
        const uEntry = uniMap.get(uni)!;
        uEntry.offerCount += 1;
        uEntry.studentKeys.add(sKey);
      }

      const cKey = classifyFaculty(poster.faculty);
      clusterCounts.set(cKey, (clusterCounts.get(cKey) || 0) + 1);
    }

    const admittedList = Array.from(admittedMap.values()).sort((a, b) => {
      if (b.offerCount !== a.offerCount) return b.offerCount - a.offerCount;
      return (a.studentNo || 999) - (b.studentNo || 999);
    });

    const admittedCount = admittedList.length;
    const admissionRate = totalStudents > 0 ? Math.round((admittedCount / totalStudents) * 100) : 0;
    const multiOfferCount = admittedList.filter((s) => s.offerCount >= 2).length;

    const maleTotal = students.filter((s) => s.gender === 'M').length;
    const femaleTotal = students.filter((s) => s.gender === 'F').length;
    const maleAdmitted = admittedList.filter((s) => s.gender === 'M').length;
    const femaleAdmitted = admittedList.filter((s) => s.gender === 'F').length;

    const universityStats = Array.from(uniMap.values())
      .map((u) => ({
        name: u.name,
        offerCount: u.offerCount,
        studentCount: u.studentKeys.size,
      }))
      .sort((a, b) => {
        if (b.offerCount !== a.offerCount) return b.offerCount - a.offerCount;
        return b.studentCount - a.studentCount;
      });

    const fieldStats = [
      ...FIELD_CLUSTER_RULES.map((rule) => ({
        key: rule.key,
        label: rule.label,
        colorClass: rule.colorClass,
        barClass: rule.barClass,
        count: clusterCounts.get(rule.key) || 0,
      })),
      ...(clusterCounts.get('other')
        ? [
            {
              key: 'other',
              label: 'สาขาวิชาอื่นๆ',
              colorClass: 'text-slate-600 dark:text-slate-300',
              barClass: 'from-slate-500 to-slate-400',
              count: clusterCounts.get('other') || 0,
            },
          ]
        : []),
    ]
      .filter((f) => f.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      totalStudents,
      admittedCount,
      admissionRate,
      multiOfferCount,
      maleTotal,
      maleAdmitted,
      femaleTotal,
      femaleAdmitted,
      universityStats,
      fieldStats,
      admittedList,
      topField: fieldStats[0] || null,
    };
  }, [posters, students]);

  if (isLoading && posters.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-5 sm:p-6 space-y-4 animate-pulse">
        <div className="h-5 w-48 rounded-lg bg-slate-200/70 dark:bg-white/10" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200/60 dark:bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (posters.length === 0) {
    return null;
  }

  const maxUniCount = Math.max(1, ...stats.universityStats.map((u) => u.offerCount));
  const visibleUniversities = showAllUniversities
    ? stats.universityStats
    : stats.universityStats.slice(0, 6);

  return (
    <section className="space-y-4 sm:space-y-5" aria-label="สถิติคนติดมหาลัยห้อง ม.6/6 APE">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Class Admission Progress */}
        <div className="glass-panel rounded-3xl p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              คนติดมหาลัยในห้อง
            </span>
            <span className="w-8 h-8 rounded-xl bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
              {stats.admittedCount}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              / {stats.totalStudents} คน ({stats.admissionRate}%)
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
              style={{ width: `${Math.min(100, stats.admissionRate)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Total Offers & Multi-Admits */}
        <div className="glass-panel rounded-3xl p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              ผลงานสอบติดรวม
            </span>
            <span className="w-8 h-8 rounded-xl bg-sky-500/12 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-sky-600 dark:text-sky-400 tabular-nums">
              {posters.length}
            </span>
            <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              ผลงาน
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            ติดหลายสถาบัน/สาขา {stats.multiOfferCount} คน
          </p>
        </div>

        {/* Card 3: Distinct Universities */}
        <div className="glass-panel rounded-3xl p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              สถาบันอุดมศึกษา
            </span>
            <span className="w-8 h-8 rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {stats.universityStats.length}
            </span>
            <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              สถาบัน
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
            อันดับ 1: {stats.universityStats[0]?.name || '—'}
          </p>
        </div>

        {/* Card 4: Gender & Top Field */}
        <div className="glass-panel rounded-3xl p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              สัดส่วนชาย / หญิง
            </span>
            <span className="w-8 h-8 rounded-xl bg-violet-500/12 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 text-sm sm:text-base font-extrabold tabular-nums">
            <span className="text-indigo-600 dark:text-indigo-400">
              ชาย {stats.maleAdmitted}/{stats.maleTotal}
            </span>
            <span className="text-slate-400 font-normal">·</span>
            <span className="text-rose-500 dark:text-rose-400">
              หญิง {stats.femaleAdmitted}/{stats.femaleTotal}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
            สายยอดนิยม: {stats.topField?.label || '—'}
          </p>
        </div>
      </div>

      {/* Detailed Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Left: Universities Breakdown (interactive filter) */}
        <div className="glass-panel rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <h3 className="text-sm sm:text-base font-bold truncate">สถิติตามมหาวิทยาลัย</h3>
            </div>
            {selectedUniversity !== 'all' ? (
              <button
                type="button"
                onClick={() => onSelectUniversity('all')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
              >
                แสดงทั้งหมด
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 shrink-0">คลิกเพื่อกรองภาพ</span>
            )}
          </div>

          <div className="space-y-2.5">
            {visibleUniversities.map((uni) => {
              const isSelected = selectedUniversity === uni.name;
              const widthPct = Math.max(8, Math.round((uni.offerCount / maxUniCount) * 100));
              return (
                <button
                  key={uni.name}
                  type="button"
                  onClick={() => onSelectUniversity(isSelected ? 'all' : uni.name)}
                  className={`w-full text-left p-2.5 rounded-2xl transition-all cursor-pointer ${
                    isSelected
                      ? 'glass-subtle ring-2 ring-indigo-500/70'
                      : 'hover:bg-white/45 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs sm:text-sm mb-1.5">
                    <span className={`font-semibold truncate ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {uni.name}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                      {uni.offerCount} ผลงาน · {uni.studentCount} คน
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200/75 dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-600 to-sky-500'
                          : 'bg-gradient-to-r from-indigo-500/80 to-violet-500/80'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {stats.universityStats.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllUniversities((prev) => !prev)}
              className="w-full py-2 min-h-[38px] rounded-2xl glass-subtle text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {showAllUniversities ? (
                <>
                  <span>ย่อรายการ</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>ดูครบทั้ง {stats.universityStats.length} สถาบัน</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Right: Field Clusters / Admitted Students Toggle */}
        <div className="glass-panel rounded-3xl p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                <h3 className="text-sm sm:text-base font-bold">
                  {rightTab === 'fields' ? 'สัดส่วนตามกลุ่มสาขาวิชา' : `รายชื่อผู้สอบติด (${stats.admittedCount}/${stats.totalStudents} คน)`}
                </h3>
              </div>

              <div className="glass-subtle p-1 rounded-xl flex items-center text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setRightTab('fields')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    rightTab === 'fields'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  กลุ่มสาขา
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab('students')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    rightTab === 'students'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  รายชื่อ ({stats.admittedCount})
                </button>
              </div>
            </div>

            {rightTab === 'fields' ? (
              <div className="space-y-3.5 pt-1">
                {stats.fieldStats.map((field) => {
                  const pct = Math.round((field.count / Math.max(1, posters.length)) * 100);
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {field.label}
                        </span>
                        <span className={`font-mono tabular-nums text-xs font-bold shrink-0 ${field.colorClass}`}>
                          {field.count} ผลงาน ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200/75 dark:bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${field.barClass} transition-all duration-500`}
                          style={{ width: `${Math.max(6, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
                {stats.admittedList.map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => onSelectStudentFilter?.(st.displayName)}
                    className="glass-subtle rounded-2xl px-3 py-2.5 text-left hover:border-indigo-400/60 transition-all flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {st.studentNo > 0 ? `#${st.studentNo} ` : ''}
                        {st.displayName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {st.universities.size} สถาบัน
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold font-mono tabular-nums shrink-0">
                      {st.offerCount}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>รออัปเดตเพิ่มเติมในห้องอีก {Math.max(0, stats.totalStudents - stats.admittedCount)} คน</span>
            <span className="font-mono tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
              คืบหน้า {stats.admittedCount}/{stats.totalStudents} คน
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
