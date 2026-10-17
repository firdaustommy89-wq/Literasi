import React, { useState, useMemo } from 'react';
import { LiteracyEntry, JenjangKelas, JenisLiterasi } from '../types';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine,
  Dot
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  Award, 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  Filter,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface LiteracyTrendChartProps {
  entries: LiteracyEntry[];
  title?: string;
  subtitle?: string;
}

interface MonthlyTrendPoint {
  monthKey: string;      // "2026-05"
  monthLabel: string;    // "Mei 26"
  fullMonthName: string; // "Mei 2026"
  avgScore: number;      // 0 - 100
  avgReflection: number; // 0 - 20
  totalEntries: number;
  highestScore: number;
  lowestScore: number;
  validatedCount: number;
}

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const MONTH_NAMES_LONG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const LiteracyTrendChart: React.FC<LiteracyTrendChartProps> = ({
  entries,
  title = 'Tren Rata-rata Skor Literasi Siswa',
  subtitle = 'Perkembangan capaian skor literasi siswa dari bulan ke bulan (Skala 0 - 100)'
}) => {
  // Filters
  const [selectedGrade, setSelectedGrade] = useState<'all' | JenjangKelas>('all');
  const [selectedType, setSelectedType] = useState<'all' | JenisLiterasi>('all');
  const [showVolumeArea, setShowVolumeArea] = useState<boolean>(true);

  // Filter entries according to grade and literacy type
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (selectedGrade !== 'all' && e.studentKelas !== selectedGrade) return false;
      if (selectedType !== 'all' && e.literacyType !== selectedType) return false;
      return true;
    });
  }, [entries, selectedGrade, selectedType]);

  // Aggregate by month (last 6 months up to current date)
  const chartData = useMemo<MonthlyTrendPoint[]>(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 - 11

    // Build timeline for the last 6 months
    const monthTimeline: { key: string; short: string; full: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      const short = `${MONTH_NAMES_SHORT[m]} '${String(y).slice(-2)}`;
      const full = `${MONTH_NAMES_LONG[m]} ${y}`;
      monthTimeline.push({ key, short, full });
    }

    // Group filtered entries by year-month
    const grouped = new Map<string, LiteracyEntry[]>();
    filteredEntries.forEach((e) => {
      const dateStr = e.date || e.createdAt;
      if (dateStr && dateStr.length >= 7) {
        const key = dateStr.substring(0, 7);
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(e);
      }
    });

    // Also include any other months from entries not in timeline if present
    const allKeys = new Set(monthTimeline.map((t) => t.key));
    grouped.forEach((_, key) => {
      if (!allKeys.has(key) && /^\d{4}-\d{2}$/.test(key)) {
        const [y, m] = key.split('-').map(Number);
        const mIdx = m - 1;
        monthTimeline.push({
          key,
          short: `${MONTH_NAMES_SHORT[mIdx] || m} '${String(y).slice(-2)}`,
          full: `${MONTH_NAMES_LONG[mIdx] || m} ${y}`
        });
      }
    });

    // Sort timeline chronologically
    monthTimeline.sort((a, b) => a.key.localeCompare(b.key));

    // Calculate aggregated metrics for each month
    return monthTimeline.map((item) => {
      const monthItems = grouped.get(item.key) || [];

      // Calculate scores
      let sumFinalScore = 0;
      let countScores = 0;
      let sumReflection = 0;
      let countReflections = 0;
      let highest = 0;
      let lowest = 100;
      let validatedCount = 0;

      monthItems.forEach((entry) => {
        if (entry.teacherValidation) {
          validatedCount++;
        }

        // Determine effective score
        const score = entry.totalFinalScore !== undefined && entry.totalFinalScore !== null
          ? entry.totalFinalScore
          : entry.teacherValidation
            ? (entry.reflection.totalScore + entry.teacherValidation.validationScore)
            : (entry.reflection?.totalScore ? entry.reflection.totalScore * 5 : undefined);

        if (score !== undefined) {
          sumFinalScore += score;
          countScores++;
          if (score > highest) highest = score;
          if (score < lowest) lowest = score;
        }

        if (entry.reflection?.totalScore) {
          sumReflection += entry.reflection.totalScore;
          countReflections++;
        }
      });

      // Default or calculated averages
      const avgScore = countScores > 0 
        ? Math.round((sumFinalScore / countScores) * 10) / 10 
        : 0;

      const avgReflection = countReflections > 0 
        ? Math.round((sumReflection / countReflections) * 10) / 10 
        : 0;

      return {
        monthKey: item.key,
        monthLabel: item.short,
        fullMonthName: item.full,
        avgScore,
        avgReflection,
        totalEntries: monthItems.length,
        highestScore: countScores > 0 ? highest : 0,
        lowestScore: countScores > 0 ? lowest : 0,
        validatedCount
      };
    });
  }, [filteredEntries]);

  // Points that have actual submissions
  const activePoints = useMemo(() => {
    return chartData.filter((d) => d.totalEntries > 0);
  }, [chartData]);

  // Current month vs previous month trend calculation
  const trendComparison = useMemo(() => {
    if (activePoints.length === 0) return null;
    const latest = activePoints[activePoints.length - 1];
    const prev = activePoints.length >= 2 ? activePoints[activePoints.length - 2] : null;

    if (!prev) {
      return {
        latestScore: latest.avgScore,
        diff: 0,
        isPositive: true,
        monthName: latest.fullMonthName
      };
    }

    const diff = Math.round((latest.avgScore - prev.avgScore) * 10) / 10;
    return {
      latestScore: latest.avgScore,
      prevScore: prev.avgScore,
      diff,
      isPositive: diff >= 0,
      monthName: latest.fullMonthName,
      prevMonthName: prev.fullMonthName
    };
  }, [activePoints]);

  // School target/KKM baseline
  const KKM_SCORE = 75;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-7 mb-8">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {title}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200 hidden sm:inline-block">
              Recharts Analytics
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            {subtitle}
          </p>
        </div>

        {/* Filter Badges & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Grade Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <span className="px-2 text-slate-400 hidden sm:inline">Kelas:</span>
            <button
              onClick={() => setSelectedGrade('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedGrade === 'all'
                  ? 'bg-white text-indigo-600 shadow-xs font-black'
                  : 'hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            {(['10', '11', '12'] as JenjangKelas[]).map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedGrade === g
                    ? 'bg-white text-indigo-600 shadow-xs font-black'
                    : 'hover:text-slate-900'
                }`}
              >
                Kls {g}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedType === 'all'
                  ? 'bg-white text-indigo-600 shadow-xs font-black'
                  : 'hover:text-slate-900'
              }`}
            >
              Semua Jenis
            </button>
            <button
              onClick={() => setSelectedType('Kitab Suci')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedType === 'Kitab Suci'
                  ? 'bg-white text-indigo-600 shadow-xs font-black'
                  : 'hover:text-slate-900'
              }`}
            >
              Kitab Suci
            </button>
            <button
              onClick={() => setSelectedType('Non Mapel')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedType === 'Non Mapel'
                  ? 'bg-white text-indigo-600 shadow-xs font-black'
                  : 'hover:text-slate-900'
              }`}
            >
              Non Mapel
            </button>
          </div>

          {/* Toggle Volume Area */}
          <button
            onClick={() => setShowVolumeArea(!showVolumeArea)}
            title="Tampilkan bayangan volume entri"
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              showVolumeArea
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Volume Entri</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
        <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rata-rata Terkini</div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 mt-0.5">
            {trendComparison?.latestScore || 0} <span className="text-xs text-slate-400 font-semibold">/ 100</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            Periode {trendComparison?.monthName || 'Bulan Ini'}
          </div>
        </div>

        <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dinamika Tren</div>
          <div className="text-xl sm:text-2xl font-black mt-0.5 flex items-center gap-1">
            {trendComparison && trendComparison.prevScore !== undefined ? (
              trendComparison.isPositive ? (
                <span className="text-emerald-600 flex items-center">
                  +{trendComparison.diff}
                  <ArrowUpRight className="w-4 h-4 ml-0.5" />
                </span>
              ) : (
                <span className="text-rose-600 flex items-center">
                  {trendComparison.diff}
                  <ArrowDownRight className="w-4 h-4 ml-0.5" />
                </span>
              )
            ) : (
              <span className="text-slate-700">Stabil</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {trendComparison && trendComparison.prevScore !== undefined ? 'vs bulan sebelumnya' : 'Capaian awal periode'}
          </div>
        </div>

        <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target KKM Sekolah</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
            {KKM_SCORE} <span className="text-xs text-slate-400 font-semibold">Poin</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Tercapai ({trendComparison?.latestScore && trendComparison.latestScore >= KKM_SCORE ? 'Tuntas' : 'Dalam Proses'})
          </div>
        </div>

        <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sampel Data</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
            {filteredEntries.length} <span className="text-xs text-slate-400 font-semibold">Jurnal</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {activePoints.length} bulan aktif tercatat
          </div>
        </div>
      </div>

      {/* Main Recharts Graph */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
          >
            <defs>
              {/* Gradient for main line */}
              <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
              </linearGradient>
              {/* Gradient for volume area */}
              <linearGradient id="volumeColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9333ea" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#9333ea" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

            <XAxis
              dataKey="monthLabel"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />

            <YAxis
              domain={[50, 100]}
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tickFormatter={(val) => `${val}`}
            />

            {/* Custom Tooltip */}
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as MonthlyTrendPoint;
                  return (
                    <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-700 text-xs min-w-[210px] animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
                        <span className="font-black text-slate-200 text-sm">{data.fullMonthName}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                          {data.totalEntries} Jurnal
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Rata-rata Skor:</span>
                          <span className="font-black text-indigo-300 text-sm">
                            {data.avgScore > 0 ? `${data.avgScore} / 100` : 'Belum ada data'}
                          </span>
                        </div>

                        {data.totalEntries > 0 && (
                          <>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Skor Tertinggi:</span>
                              <span className="font-bold text-emerald-400">{data.highestScore} Poin</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Refleksi Rata-rata:</span>
                              <span className="font-bold text-purple-300">{data.avgReflection} / 20</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Tervalidasi Guru:</span>
                              <span className="font-bold text-slate-300">{data.validatedCount} entri</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* KKM Benchmark Reference Line */}
            <ReferenceLine
              y={KKM_SCORE}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `KKM (${KKM_SCORE})`,
                position: 'insideBottomRight',
                fill: '#d97706',
                fontSize: 10,
                fontWeight: 'bold'
              }}
            />

            {/* Optional Volume Shadow Area */}
            {showVolumeArea && (
              <Area
                type="monotone"
                dataKey="avgScore"
                fill="url(#scoreColor)"
                stroke="none"
              />
            )}

            {/* Main Score Trend Line */}
            <Line
              type="monotone"
              dataKey="avgScore"
              name="Rata-rata Skor Literasi"
              stroke="#4f46e5"
              strokeWidth={3}
              dot={{
                r: 4,
                fill: '#4f46e5',
                stroke: '#ffffff',
                strokeWidth: 2
              }}
              activeDot={{
                r: 6,
                fill: '#4338ca',
                stroke: '#e0e7ff',
                strokeWidth: 3
              }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Month Breakdown Badges */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-indigo-600 rounded-full inline-block"></span>
            <span className="font-bold text-slate-700">Rata-rata Skor Literasi (0-100)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-500 inline-block"></span>
            <span className="font-semibold text-slate-600">Batas KKM Sekolah (75 Poin)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          Grafik diperbarui otomatis dari Cloud Firestore
        </div>
      </div>
    </div>
  );
};
