import React, { useState, useMemo } from 'react';
import { User, RombelItem, JenjangKelas, LiteracyEntry, MonthlyVerification } from '../types';
import { 
  GraduationCap, 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  Search, 
  X, 
  Check, 
  AlertCircle, 
  AlertTriangle, 
  FileSpreadsheet, 
  CheckCircle2, 
  Building2, 
  BookOpen, 
  LayoutGrid, 
  List, 
  ArrowRight, 
  RefreshCw,
  Sparkles,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';

interface RombelManagementViewProps {
  rombels: RombelItem[];
  users: User[];
  entries?: LiteracyEntry[];
  monthlyVerifications?: MonthlyVerification[];
  onSaveRombels: (updatedRombels: RombelItem[]) => Promise<void> | void;
  onCascadeUpdateRombel: (
    oldRombelName: string, 
    newRombelName: string, 
    newGrade: JenjangKelas
  ) => Promise<{ updatedUsers: number; updatedEntries: number; updatedVerifications: number }>;
  onReassignOrDeleteRombel: (
    rombelToDelete: string, 
    targetRombel?: string
  ) => Promise<{ updatedUsers: number; updatedEntries: number }>;
  onViewRombelStudents?: (rombelName: string) => void;
}

export const RombelManagementView: React.FC<RombelManagementViewProps> = ({
  rombels,
  users,
  entries = [],
  monthlyVerifications = [],
  onSaveRombels,
  onCascadeUpdateRombel,
  onReassignOrDeleteRombel,
  onViewRombelStudents,
}) => {
  // Filters & layout
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingRombel, setEditingRombel] = useState<RombelItem | null>(null);
  const [deletingRombel, setDeletingRombel] = useState<RombelItem | null>(null);
  const [viewingRombelStudents, setViewingRombelStudents] = useState<RombelItem | null>(null);

  // Form states for Add / Edit
  const [formName, setFormName] = useState<string>('');
  const [formGrade, setFormGrade] = useState<JenjangKelas>('10');
  const [formWaliKelas, setFormWaliKelas] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [cascadeToStudents, setCascadeToStudents] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reassignment target when deleting
  const [deleteTargetRombel, setDeleteTargetRombel] = useState<string>('');

  // Available teachers for Wali Kelas dropdown
  const teachers = useMemo(() => {
    return users.filter((u) => u.role === 'guru');
  }, [users]);

  // Students list
  const students = useMemo(() => {
    return users.filter((u) => u.role === 'siswa');
  }, [users]);

  // Map student count per rombel name
  const studentCountByRombel = useMemo(() => {
    const map = new Map<string, number>();
    students.forEach((s) => {
      const r = (s.rombel || `Kelas ${s.kelas || '10'}`).trim();
      map.set(r.toLowerCase(), (map.get(r.toLowerCase()) || 0) + 1);
    });
    return map;
  }, [students]);

  // Students belonging to a rombel
  const getStudentsInRombel = (rombelName: string) => {
    const target = rombelName.toLowerCase().trim();
    return students.filter((s) => {
      const r = (s.rombel || `Kelas ${s.kelas || '10'}`).toLowerCase().trim();
      return r === target;
    });
  };

  // Grade Counts for Rombels
  const gradeCounts = useMemo(() => {
    return {
      all: rombels.length,
      '10': rombels.filter((r) => r.grade === '10').length,
      '11': rombels.filter((r) => r.grade === '11').length,
      '12': rombels.filter((r) => r.grade === '12').length,
    };
  }, [rombels]);

  // Filtered & Sorted Rombels
  const filteredRombels = useMemo(() => {
    return rombels
      .filter((r) => {
        if (selectedGrade !== 'all' && r.grade !== selectedGrade) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = r.name.toLowerCase().includes(q);
          const matchWali = (r.waliKelas || '').toLowerCase().includes(q);
          const matchDesc = (r.description || '').toLowerCase().includes(q);
          if (!matchName && !matchWali && !matchDesc) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by Grade first, then by name alphanumeric
        if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [rombels, selectedGrade, searchQuery]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormName('');
    setFormGrade((selectedGrade !== 'all' ? selectedGrade : '10') as JenjangKelas);
    setFormWaliKelas('');
    setFormDescription('');
    setShowAddModal(true);
  };

  // Submit Add Rombel
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      alert('Nama rombel tidak boleh kosong.');
      return;
    }

    // Check duplicate
    const exists = rombels.some((r) => r.name.toLowerCase().trim() === cleanName.toLowerCase());
    if (exists) {
      alert(`Rombel dengan nama "${cleanName}" sudah ada dalam database.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const newRombel: RombelItem = {
        id: `rombel-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: cleanName,
        grade: formGrade,
        waliKelas: formWaliKelas.trim() || undefined,
        description: formDescription.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      const updated = [...rombels, newRombel];
      await onSaveRombels(updated);

      setShowAddModal(false);
      setFeedbackMsg({
        type: 'success',
        text: `Rombel baru "${newRombel.name}" (Kelas ${newRombel.grade}) berhasil ditambahkan ke database!`,
      });

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: `Gagal menambahkan rombel: ${err?.message || 'Kesalahan jaringan'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (rombel: RombelItem) => {
    setEditingRombel(rombel);
    setFormName(rombel.name);
    setFormGrade(rombel.grade);
    setFormWaliKelas(rombel.waliKelas || '');
    setFormDescription(rombel.description || '');
    setCascadeToStudents(true);
  };

  // Submit Edit Rombel
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRombel) return;
    const cleanName = formName.trim();
    if (!cleanName) {
      alert('Nama rombel tidak boleh kosong.');
      return;
    }

    // Check duplicate if name changed
    if (cleanName.toLowerCase() !== editingRombel.name.toLowerCase()) {
      const exists = rombels.some(
        (r) => r.id !== editingRombel.id && r.name.toLowerCase().trim() === cleanName.toLowerCase()
      );
      if (exists) {
        alert(`Rombel dengan nama "${cleanName}" sudah terdaftar.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const oldName = editingRombel.name;
      const isNameChanged = cleanName.toLowerCase() !== oldName.toLowerCase();
      const isGradeChanged = formGrade !== editingRombel.grade;

      // Update rombel item in array
      const updatedRombels = rombels.map((r) =>
        r.id === editingRombel.id
          ? {
              ...r,
              name: cleanName,
              grade: formGrade,
              waliKelas: formWaliKelas.trim() || undefined,
              description: formDescription.trim() || undefined,
            }
          : r
      );

      await onSaveRombels(updatedRombels);

      let cascadeReport = '';
      if ((isNameChanged || isGradeChanged) && cascadeToStudents) {
        const result = await onCascadeUpdateRombel(oldName, cleanName, formGrade);
        cascadeReport = ` serta menyinkronkan ${result.updatedUsers} akun siswa, ${result.updatedEntries} jurnal, dan ${result.updatedVerifications} rapor bulanan.`;
      }

      setEditingRombel(null);
      setFeedbackMsg({
        type: 'success',
        text: `Data rombel "${cleanName}" berhasil diperbarui${cascadeReport}`,
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: `Gagal memperbarui rombel: ${err?.message || 'Kesalahan jaringan'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (rombel: RombelItem) => {
    setDeletingRombel(rombel);
    // Suggest first other rombel as fallback reassign
    const other = rombels.find((r) => r.id !== rombel.id && r.grade === rombel.grade) || rombels.find((r) => r.id !== rombel.id);
    setDeleteTargetRombel(other ? other.name : '');
  };

  // Submit Delete Rombel
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingRombel) return;

    const rombelName = deletingRombel.name;
    const activeStudentCount = studentCountByRombel.get(rombelName.toLowerCase()) || 0;

    setIsSubmitting(true);
    try {
      // 1. Reassign students if needed
      let reassignReport = '';
      if (activeStudentCount > 0) {
        const result = await onReassignOrDeleteRombel(
          rombelName, 
          deleteTargetRombel.trim() || undefined
        );
        reassignReport = deleteTargetRombel
          ? ` dan memindahkan ${result.updatedUsers} siswa ke rombel "${deleteTargetRombel}".`
          : ` dan mengosongkan rombel dari ${result.updatedUsers} siswa.`;
      }

      // 2. Remove rombel from list
      const updatedRombels = rombels.filter((r) => r.id !== deletingRombel.id);
      await onSaveRombels(updatedRombels);

      setDeletingRombel(null);
      setFeedbackMsg({
        type: 'success',
        text: `Rombel "${rombelName}" berhasil dihapus dari sistem${reassignReport}`,
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: `Gagal menghapus rombel: ${err?.message || 'Kesalahan jaringan'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export all rombels and their students to Excel
  const handleExportRombelsExcel = () => {
    const rombelSummaryRows = rombels.map((r, idx) => {
      const studentCount = studentCountByRombel.get(r.name.toLowerCase()) || 0;
      return {
        'No': idx + 1,
        'Nama Rombel': r.name,
        'Jenjang Kelas': `Kelas ${r.grade}`,
        'Jumlah Siswa Aktif': studentCount,
        'Wali Kelas': r.waliKelas || '-',
        'Keterangan': r.description || '-',
      };
    });

    const studentRows = students.map((s, idx) => ({
      'No': idx + 1,
      'Nama Siswa': s.name,
      'NISN': s.nisn || '-',
      'Jenjang': `Kelas ${s.kelas || '-'}`,
      'Rombel': s.rombel || '-',
      'Username': s.username,
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(rombelSummaryRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Master Data Rombel');

    const ws2 = XLSX.utils.json_to_sheet(studentRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Daftar Siswa per Rombel');

    XLSX.writeFile(wb, `Master_Data_Rombel_SMAN2_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. HEADER & KPI CARDS */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-950 p-5 sm:p-6 rounded-3xl text-white shadow-md relative overflow-hidden border border-purple-500/20">
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-purple-950 flex items-center gap-1.5 shadow-xs">
                <GraduationCap className="w-3.5 h-3.5 text-purple-950" />
                Manajemen Rombel
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-purple-100 border border-white/20">
                Tersinkronisasi Real-Time
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Kelola Data Rombongan Belajar (Rombel) & Kelas
            </h2>
            <p className="text-xs sm:text-sm text-purple-100/90 mt-1 max-w-2xl font-medium leading-relaxed">
              Tambah rombel baru, ubah nama/jenjang dengan pembaruan otomatis ke data siswa, dan hapus rombel dengan aman. Seluruh perubahan tersinkronkan ke Cloud Firestore.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl font-black text-xs bg-amber-400 hover:bg-amber-300 text-purple-950 shadow-md flex items-center gap-2 cursor-pointer transition-all border border-amber-300 ring-2 ring-amber-300/30"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Rombel Baru</span>
            </button>
            <button
              type="button"
              onClick={handleExportRombelsExcel}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-2 cursor-pointer transition-all shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Ekspor Rombel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Quick KPI stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="text-[10px] uppercase font-bold text-purple-200">Total Rombel Aktif</div>
            <div className="text-2xl font-black text-white mt-0.5 font-mono tabular-nums">{rombels.length}</div>
            <div className="text-[11px] text-purple-200/80">Seluruh jenjang</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="text-[10px] uppercase font-bold text-blue-200">Kelas 10</div>
            <div className="text-2xl font-black text-blue-300 mt-0.5 font-mono tabular-nums">{gradeCounts['10']}</div>
            <div className="text-[11px] text-blue-200/80">Rombongan Belajar</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="text-[10px] uppercase font-bold text-indigo-200">Kelas 11</div>
            <div className="text-2xl font-black text-indigo-300 mt-0.5 font-mono tabular-nums">{gradeCounts['11']}</div>
            <div className="text-[11px] text-indigo-200/80">Rombongan Belajar</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="text-[10px] uppercase font-bold text-amber-200">Kelas 12</div>
            <div className="text-2xl font-black text-amber-300 mt-0.5 font-mono tabular-nums">{gradeCounts['12']}</div>
            <div className="text-[11px] text-amber-200/80">Rombongan Belajar</div>
          </div>
        </div>
      </div>

      {/* Action / Notification Toast */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in duration-200 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs sm:text-sm font-semibold flex-1">{feedbackMsg.text}</div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TOOLBAR: FILTER JENJANG, PENCARIAN & VIEW MODE */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
          {/* Grade filter buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 hidden md:inline">
              Jenjang:
            </span>
            <button
              type="button"
              onClick={() => setSelectedGrade('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                selectedGrade === 'all'
                  ? 'bg-purple-700 text-white shadow-purple-600/25 ring-2 ring-purple-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
              }`}
            >
              <span>Semua Rombel</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                selectedGrade === 'all' ? 'bg-amber-400 text-purple-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {gradeCounts.all}
              </span>
            </button>

            {(['10', '11', '12'] as JenjangKelas[]).map((grade) => {
              const isActive = selectedGrade === grade;
              return (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setSelectedGrade(grade)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                    isActive
                      ? 'bg-purple-700 text-white shadow-purple-600/25 ring-2 ring-purple-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <span>Kelas {grade}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-amber-400 text-purple-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {gradeCounts[grade]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Tampilan Kartu Rombel"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid Kartu</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Tampilan Tabel Rapat"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Tabel Rapat</span>
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari rombel (mis. X MIPA 1, XI IPS, atau nama wali kelas)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. ROMBEL LISTING: GRID OR TABLE */}
      {/* ======================================================== */}
      {filteredRombels.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-white dark:bg-[#0f172a] border border-dashed border-slate-200 dark:border-slate-800 p-6">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Tidak Ada Rombel yang Sesuai
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `Tidak ditemukan rombel dengan kata kunci "${searchQuery}".`
              : 'Belum ada rombel untuk jenjang kelas yang dipilih.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-purple-700 text-white hover:bg-purple-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Rombel Sekarang</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRombels.map((rombel) => {
            const studentCount = studentCountByRombel.get(rombel.name.toLowerCase()) || 0;

            return (
              <div
                key={rombel.id}
                className="bg-white dark:bg-[#131d33] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      Kelas {rombel.grade}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>{studentCount} Siswa</span>
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                    {rombel.name}
                  </h3>

                  {rombel.waliKelas ? (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-600 dark:text-slate-400">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="line-clamp-1 font-medium">Wali Kelas: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{rombel.waliKelas}</strong></span>
                    </div>
                  ) : (
                    <div className="mt-2 text-[11px] text-slate-400 italic">
                      Wali kelas belum ditentukan
                    </div>
                  )}

                  {rombel.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                      {rombel.description}
                    </p>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingRombelStudents(rombel)}
                    className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/60 text-slate-700 dark:text-slate-200 hover:text-purple-700 dark:hover:text-purple-300 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span>Lihat Siswa ({studentCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(rombel)}
                    title="Edit Nama / Data Rombel"
                    className="p-2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenDelete(rombel)}
                    title="Hapus Rombel"
                    className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW (RESPONSIVE HORIZONTAL SCROLL) */
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="py-3.5 px-4">Nama Rombel</th>
                  <th className="py-3.5 px-3">Jenjang</th>
                  <th className="py-3.5 px-3 text-center">Jumlah Siswa</th>
                  <th className="py-3.5 px-4">Wali Kelas</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Keterangan</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                {filteredRombels.map((rombel) => {
                  const studentCount = studentCountByRombel.get(rombel.name.toLowerCase()) || 0;

                  return (
                    <tr
                      key={rombel.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-black text-slate-900 dark:text-slate-100 text-sm">
                        {rombel.name}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-black bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          Kelas {rombel.grade}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setViewingRombelStudents(rombel)}
                          className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 cursor-pointer inline-flex items-center gap-1"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{studentCount} Siswa</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        {rombel.waliKelas ? (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {rombel.waliKelas}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 hidden md:table-cell text-slate-500 dark:text-slate-400 text-xs">
                        {rombel.description || '-'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(rombel)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 cursor-pointer inline-flex items-center gap-1"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(rombel)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 cursor-pointer inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODAL: TAMBAH ROMBEL BARU */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-gradient-to-r from-purple-50/80 to-indigo-50/40 dark:from-slate-800 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Plus className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    Tambah Rombongan Belajar (Rombel) Baru
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Buat rombel baru untuk jenjang Kelas 10, 11, atau 12.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Rombel <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: X MIPA 3, XI IPS 2, XII BAHASA 1..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-semibold outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jenjang Kelas <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['10', '11', '12'] as JenjangKelas[]).map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => setFormGrade(grade)}
                      className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        formGrade === grade
                          ? 'bg-purple-700 text-white border-purple-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Kelas {grade}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Wali Kelas (Opsional)
                </label>
                <div className="space-y-2">
                  {teachers.length > 0 && (
                    <select
                      value={formWaliKelas}
                      onChange={(e) => setFormWaliKelas(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium outline-none cursor-pointer"
                    >
                      <option value="">-- Pilih dari Dewan Guru Terdaftar --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name} {t.nip ? `(NIP: ${t.nip})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    placeholder="Atau ketik nama wali kelas secara manual..."
                    value={formWaliKelas}
                    onChange={(e) => setFormWaliKelas(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan / Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Misal: Kurikulum Merdeka, Rombel Peminatan MIPA..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Rombel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL: EDIT DATA ROMBEL */}
      {/* ======================================================== */}
      {editingRombel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-gradient-to-r from-blue-50/80 to-purple-50/40 dark:from-slate-800 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Pencil className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    Edit Data Rombel: {editingRombel.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Ubah nama rombel, jenjang kelas, atau wali kelas pembimbing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRombel(null)}
                className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Rombel <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-semibold outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jenjang Kelas <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['10', '11', '12'] as JenjangKelas[]).map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => setFormGrade(grade)}
                      className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        formGrade === grade
                          ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Kelas {grade}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Wali Kelas
                </label>
                <div className="space-y-2">
                  {teachers.length > 0 && (
                    <select
                      value={formWaliKelas}
                      onChange={(e) => setFormWaliKelas(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium outline-none cursor-pointer"
                    >
                      <option value="">-- Pilih dari Dewan Guru Terdaftar --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name} {t.nip ? `(NIP: ${t.nip})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    placeholder="Nama wali kelas..."
                    value={formWaliKelas}
                    onChange={(e) => setFormWaliKelas(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              {/* Cascading Update Checkbox */}
              <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cascadeToStudents}
                    onChange={(e) => setCascadeToStudents(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <div className="text-slate-700 dark:text-slate-300">
                    <span className="font-bold text-blue-900 dark:text-blue-200">
                      Sinkronkan Otomatis ke Data Siswa ({studentCountByRombel.get(editingRombel.name.toLowerCase()) || 0} Siswa)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Jika dicentang, seluruh akun siswa, jurnal literasi, dan rapor bulanan yang terdaftar di rombel <strong>"{editingRombel.name}"</strong> akan diperbarui otomatis ke nama dan jenjang baru.
                    </p>
                  </div>
                </label>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRombel(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Memproses...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL: HAPUS DATA ROMBEL */}
      {/* ======================================================== */}
      {deletingRombel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-rose-50/70 dark:bg-rose-950/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                    Konfirmasi Hapus Rombel
                  </h3>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                    Rombel: <strong className="font-bold">{deletingRombel.name}</strong> (Kelas {deletingRombel.grade})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingRombel(null)}
                className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleDeleteSubmit} className="p-5 space-y-4">
              {(() => {
                const count = studentCountByRombel.get(deletingRombel.name.toLowerCase()) || 0;
                const otherRombels = rombels.filter((r) => r.id !== deletingRombel.id);

                return (
                  <>
                    {count > 0 ? (
                      <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs space-y-2">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Peringatan: Rombel Memiliki {count} Siswa Aktif</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          Terdapat <strong>{count} siswa</strong> yang saat ini terdaftar di rombel "{deletingRombel.name}". Anda dapat memindahkan siswa tersebut ke rombel lain sebelum dihapus.
                        </p>

                        {otherRombels.length > 0 && (
                          <div className="pt-2">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Pindahkan {count} Siswa ke Rombel:
                            </label>
                            <select
                              value={deleteTargetRombel}
                              onChange={(e) => setDeleteTargetRombel(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                            >
                              <option value="">-- Kosongkan Rombel Siswa (Tanpa Pindah) --</option>
                              {otherRombels.map((r) => (
                                <option key={r.id} value={r.name}>
                                  {r.name} (Kelas {r.grade})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Apakah Anda yakin ingin menghapus rombel <strong>"{deletingRombel.name}"</strong>? Rombel ini tidak memiliki siswa aktif. Tindakan ini permanen.
                      </p>
                    )}
                  </>
                );
              })()}

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingRombel(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menghapus...' : 'Ya, Hapus Rombel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. MODAL: LIHAT SISWA DI ROMBEL TERTENTU */}
      {/* ======================================================== */}
      {viewingRombelStudents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-gradient-to-r from-purple-50/80 to-blue-50/40 dark:from-slate-800 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Users className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                      Daftar Siswa: {viewingRombelStudents.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800">
                      Kelas {viewingRombelStudents.grade}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {viewingRombelStudents.waliKelas ? `Wali Kelas: ${viewingRombelStudents.waliKelas} • ` : ''}
                    Total: <strong className="font-bold text-slate-800 dark:text-slate-200">{getStudentsInRombel(viewingRombelStudents.name).length} Siswa Terdaftar</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingRombelStudents(null)}
                className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="p-4 sm:p-5 overflow-y-auto max-h-96">
              {getStudentsInRombel(viewingRombelStudents.name).length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">Belum ada siswa yang terdaftar di rombel ini.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Anda dapat menetapkan siswa ke rombel ini melalui menu "Daftar Pengguna Aktif" atau "Upload Excel".
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {getStudentsInRombel(viewingRombelStudents.name).map((student, idx) => {
                    const studentEntriesCount = entries.filter((e) => e.studentId === student.id).length;

                    return (
                      <div
                        key={student.id}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                              {student.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              NISN: {student.nisn || '-'} • @{student.username}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="inline-block px-2.5 py-0.5 rounded-md font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300">
                            {studentEntriesCount} Jurnal
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>{getStudentsInRombel(viewingRombelStudents.name).length} Siswa</span>
              <button
                type="button"
                onClick={() => setViewingRombelStudents(null)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
