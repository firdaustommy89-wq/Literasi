import React, { useState, useEffect } from 'react';
import { User, UserRole, LiteracyEntry, TeacherValidation, MonthlyVerification, SemesterType } from './types';
import { 
  getStoredUsers, 
  saveUsers, 
  getStoredEntries, 
  saveEntries, 
  getStoredCurrentUser, 
  saveCurrentUser,
  getStoredAcademicYear,
  saveAcademicYear,
  getStoredSemester,
  saveSemester
} from './utils/storage';
import { exportLiteracyToExcel } from './utils/export';
import { 
  fetchAllFromFirestore,
  subscribeUsers, 
  subscribeEntries, 
  subscribeMonthlyVerifications,
  saveMonthlyVerificationToFirestore,
  createEntryInFirestore, 
  updateEntryInFirestore, 
  saveUserToFirestore,
  saveBatchUsersToFirestore, 
  deleteUserFromFirestore,
  deleteBatchUsersFromFirestore,
  deleteEntryFromFirestore,
  saveBatchEntriesToFirestore,
  saveBatchMonthlyVerificationsToFirestore,
  signInWithGoogle, 
  signOutFirebase 
} from './firebase/service';
import { executeAcademicYearPromotion, synchronizeRombelAcrossAllData } from './utils/academicYearSync';
import { INITIAL_USERS, INITIAL_LITERACY_ENTRIES } from './data/initialData';
import { Navbar } from './components/Navbar';
import { LeftSidebarMenu } from './components/LeftSidebarMenu';
import { TopBarHeader } from './components/TopBarHeader';
import { RoleLoginPortal } from './components/RoleLoginPortal';
import { StudentJournalForm } from './components/StudentJournalForm';
import { TeacherValidationView } from './components/TeacherValidationView';
import { LeaderboardView } from './components/LeaderboardView';
import { AdminUploadView } from './components/AdminUploadView';
import { StudentHistoryView } from './components/StudentHistoryView';
import { ReportPrintView } from './components/ReportPrintView';
import { AuthModal } from './components/AuthModal';
import { EditProfileModal } from './components/EditProfileModal';
import { ValidationNotificationToast } from './components/ValidationNotificationToast';
import { playValidationChime } from './utils/sound';

export default function App() {
  const [users, setUsers] = useState<User[]>(getStoredUsers);
  const [entries, setEntries] = useState<LiteracyEntry[]>(getStoredEntries);
  const [monthlyVerifications, setMonthlyVerifications] = useState<MonthlyVerification[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredCurrentUser);
  const [academicYear, setAcademicYear] = useState<string>(getStoredAcademicYear);
  const [semester, setSemester] = useState<SemesterType>(getStoredSemester);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    const user = getStoredCurrentUser();
    if (!user) return 'login-portal';
    if (user.role === 'guru') return 'validasi-guru';
    if (user.role === 'admin') return 'upload-admin';
    return 'input-jurnal';
  });

  // Selected default role for login portal or auth modal
  const [loginRoleTarget, setLoginRoleTarget] = useState<UserRole>('siswa');

  // Modals & Navigation
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // ========================================================
  // REAL-TIME NOTIFICATIONS & BADGES FOR STUDENT VALIDATIONS
  // ========================================================
  const [viewedValidationIds, setViewedValidationIds] = useState<string[]>(() => {
    const user = getStoredCurrentUser();
    if (!user || user.role !== 'siswa') return [];
    try {
      const stored = localStorage.getItem(`siliterasi_viewed_validations_${user.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [liveToastNotification, setLiveToastNotification] = useState<{
    entry: LiteracyEntry;
    id: string;
  } | null>(null);

  // Sync viewedValidationIds when currentUser changes
  useEffect(() => {
    if (currentUser?.role === 'siswa') {
      try {
        const stored = localStorage.getItem(`siliterasi_viewed_validations_${currentUser.id}`);
        setViewedValidationIds(stored ? JSON.parse(stored) : []);
      } catch {
        setViewedValidationIds([]);
      }
    } else {
      setViewedValidationIds([]);
    }
  }, [currentUser?.id, currentUser?.role]);

  // All validated entries for current student
  const studentValidatedEntries = React.useMemo(() => {
    if (!currentUser || currentUser.role !== 'siswa') return [];
    return entries.filter(
      (e) =>
        (e.studentId === currentUser.id || (currentUser.nisn && e.studentNisn === currentUser.nisn)) &&
        !!e.teacherValidation &&
        (e.totalFinalScore !== undefined || e.teacherValidation.validationScore !== undefined)
    );
  }, [entries, currentUser]);

  // Unread validated entries
  const unreadValidatedEntries = React.useMemo(() => {
    const viewedSet = new Set(viewedValidationIds);
    return studentValidatedEntries.filter((e) => !viewedSet.has(e.id));
  }, [studentValidatedEntries, viewedValidationIds]);

  const unreadValidationCount = unreadValidatedEntries.length;

  // Real-time listener for newly validated entries by teacher across sessions/devices
  const prevValidatedIdsRef = React.useRef<Set<string>>(new Set());
  const isInitialMountRef = React.useRef<boolean>(true);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'siswa') {
      prevValidatedIdsRef.current = new Set();
      isInitialMountRef.current = true;
      return;
    }

    const currentValidatedIds = new Set(studentValidatedEntries.map((e) => e.id));

    // If this is not the initial page mount, detect if any entry was newly validated!
    if (!isInitialMountRef.current) {
      const newlyValidated = studentValidatedEntries.filter(
        (e) => !prevValidatedIdsRef.current.has(e.id)
      );
      if (newlyValidated.length > 0) {
        const newest = newlyValidated[0];
        setLiveToastNotification({
          entry: newest,
          id: newest.id,
        });
        playValidationChime();
      }
    } else {
      isInitialMountRef.current = false;
    }

    prevValidatedIdsRef.current = currentValidatedIds;
  }, [studentValidatedEntries, currentUser]);

  const handleMarkSingleValidationRead = (entryId: string) => {
    if (!currentUser) return;
    setViewedValidationIds((prev) => {
      if (prev.includes(entryId)) return prev;
      const updated = [...prev, entryId];
      try {
        localStorage.setItem(
          `siliterasi_viewed_validations_${currentUser.id}`,
          JSON.stringify(updated)
        );
      } catch (err) {
        console.warn(err);
      }
      return updated;
    });
  };

  const handleMarkAllValidationsRead = () => {
    if (!currentUser) return;
    const allIds = studentValidatedEntries.map((e) => e.id);
    setViewedValidationIds(allIds);
    try {
      localStorage.setItem(
        `siliterasi_viewed_validations_${currentUser.id}`,
        JSON.stringify(allIds)
      );
    } catch (err) {
      console.warn(err);
    }
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  // Function to pull latest data from Cloud Firestore on demand or device wake
  const syncLatestFromCloud = async (showLoadingState = true) => {
    if (showLoadingState) setIsSyncing(true);
    try {
      const { users: fsUsers, entries: fsEntries } = await fetchAllFromFirestore();
      if (fsUsers) {
        setUsers(fsUsers);
      }
      if (fsEntries) {
        setEntries(fsEntries);
      }
    } catch (err) {
      console.warn('Sync cloud notice:', err);
    } finally {
      if (showLoadingState) {
        setTimeout(() => setIsSyncing(false), 500);
      }
    }
  };

  // Initial Firestore setup, immediate multi-device fetch, and real-time listeners
  useEffect(() => {
    // 1. Immediately fetch live data from Cloud Firestore for fresh devices/browsers
    syncLatestFromCloud(false);

    // 2. Listen to real-time users collection across all devices & browsers
    const unsubUsers = subscribeUsers(
      (fsUsers) => {
        if (fsUsers) {
          setUsers(fsUsers);
        }
      },
      (err) => console.warn('Firestore users subscription notice:', err)
    );

    // 3. Listen to real-time literacy entries collection across all devices & browsers
    const unsubEntries = subscribeEntries(
      (fsEntries) => {
        if (fsEntries) {
          setEntries(fsEntries);
        }
      },
      (err) => console.warn('Firestore entries subscription notice:', err)
    );

    // 4. Listen to real-time monthly verifications
    const unsubVerifications = subscribeMonthlyVerifications(
      (fsVerifications) => {
        if (fsVerifications) {
          setMonthlyVerifications(fsVerifications);
        }
      },
      (err) => console.warn('Firestore verifications subscription notice:', err)
    );

    // 5. Multi-device wake & tab focus listener: re-sync instantly when user switches back to browser tab
    const handleSyncOnWake = () => {
      if (!document.hidden) {
        syncLatestFromCloud(false);
      }
    };

    document.addEventListener('visibilitychange', handleSyncOnWake);
    window.addEventListener('focus', handleSyncOnWake);
    window.addEventListener('online', handleSyncOnWake);

    return () => {
      unsubUsers();
      unsubEntries();
      unsubVerifications();
      document.removeEventListener('visibilitychange', handleSyncOnWake);
      window.removeEventListener('focus', handleSyncOnWake);
      window.removeEventListener('online', handleSyncOnWake);
    };
  }, []);

  // Sync users & entries to local cache fallback
  useEffect(() => {
    saveUsers(users);
  }, [users]);

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  useEffect(() => {
    saveCurrentUser(currentUser);
  }, [currentUser]);

  // Handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'guru') {
      setActiveTab('validasi-guru');
    } else if (user.role === 'admin') {
      setActiveTab('upload-admin');
    } else {
      setActiveTab('input-jurnal');
    }
  };

  const handleLogout = async () => {
    try {
      await signOutFirebase();
    } catch (err) {
      console.warn('Sign out note:', err);
    }
    setCurrentUser(null);
    saveCurrentUser(null);
    setActiveTab('login-portal');
  };

  const handleGoogleSignIn = async () => {
    try {
      const { appUser } = await signInWithGoogle();
      handleLoginSuccess(appUser);
    } catch (err) {
      console.error('Google sign-in error:', err);
    }
  };

  const handleSubmitEntry = async (newEntry: LiteracyEntry) => {
    // Optimistic local state update ensuring no duplicate and immediate availability
    setEntries((prev) => {
      const exists = prev.some((e) => e.id === newEntry.id);
      return exists ? prev : [newEntry, ...prev];
    });

    // Persist to Cloud Firestore
    try {
      await createEntryInFirestore(newEntry);
    } catch (err) {
      console.error('Failed to create entry in Firestore:', err);
    }
  };

  const handleValidateEntry = async (
    entryId: string,
    validation: TeacherValidation,
    totalScore: number
  ) => {
    // Optimistic local state update
    const updated = entries.map((e) => {
      if (e.id === entryId) {
        return {
          ...e,
          teacherValidation: validation,
          totalFinalScore: totalScore,
        };
      }
      return e;
    });
    setEntries(updated);

    // Persist validation to Cloud Firestore
    try {
      await updateEntryInFirestore(entryId, {
        teacherValidation: validation,
        totalFinalScore: totalScore,
      });
    } catch (err) {
      console.error('Failed to update entry in Firestore:', err);
    }
  };

  const handleAddUsers = async (newUsers: User[]) => {
    // Penambahan akun secara massal hanya dapat dilakukan oleh Administrator
    if (newUsers.length > 1 && currentUser?.role !== 'admin') {
      alert('Akses Ditolak: Penambahan/impor massal data pengguna hanya dapat dilakukan oleh Administrator.');
      return;
    }

    // Avoid duplicate usernames
    const existingUsernames = new Set(users.map((u) => u.username.toLowerCase()));
    const filteredNew = newUsers.filter((u) => !existingUsernames.has(u.username.toLowerCase()));
    const merged = [...users, ...filteredNew];
    setUsers(merged);

    // Persist users to Cloud Firestore
    try {
      await saveBatchUsersToFirestore(filteredNew);
    } catch (err) {
      console.error('Failed to save users in Firestore:', err);
    }
  };

  const handleSaveOwnProfile = async (updatedUser: User) => {
    // Update local state for current user and users list
    setCurrentUser(updatedUser);
    saveCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

    // If student updated their name, synchronize their name on literacy entries
    if (updatedUser.role === 'siswa') {
      setEntries((prev) =>
        prev.map((e) =>
          e.studentId === updatedUser.id ? { ...e, studentName: updatedUser.name } : e
        )
      );
    }

    // Persist to Cloud Firestore
    try {
      await saveUserToFirestore(updatedUser);
    } catch (err) {
      console.error('Failed to save profile update to Firestore:', err);
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    if (currentUser?.role !== 'admin') {
      alert('Akses Ditolak: Data pengguna hanya dapat diubah oleh Administrator.');
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    try {
      await saveUserToFirestore(updatedUser);
    } catch (err) {
      console.error('Failed to update user in Firestore:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (currentUser?.role !== 'admin') {
      alert('Akses Ditolak: Data pengguna hanya dapat dihapus oleh Administrator.');
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    try {
      await deleteUserFromFirestore(userId);
    } catch (err) {
      console.error('Failed to delete user in Firestore:', err);
    }
  };

  const handleDeleteBatchUsers = async (userIds: string[]) => {
    if (currentUser?.role !== 'admin') {
      alert('Akses Ditolak: Hapus massal data pengguna hanya dapat dilakukan oleh Administrator.');
      return;
    }
    const idSet = new Set(userIds);
    setUsers((prev) => prev.filter((u) => !idSet.has(u.id)));
    try {
      await deleteBatchUsersFromFirestore(userIds);
    } catch (err) {
      console.error('Failed to batch delete users in Firestore:', err);
    }
  };

  const handleUpdateEntry = async (entryId: string, updates: Partial<LiteracyEntry>) => {
    if (currentUser?.role !== 'admin') {
      alert('Akses Ditolak: Data jurnal hanya dapat diperbarui oleh Administrator.');
      return;
    }
    setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, ...updates } : e)));
    try {
      await updateEntryInFirestore(entryId, updates);
    } catch (err) {
      console.error('Failed to update entry in Firestore:', err);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (currentUser?.role !== 'admin') {
      alert('Akses Ditolak: Data jurnal hanya dapat dihapus oleh Administrator.');
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    try {
      await deleteEntryFromFirestore(entryId);
    } catch (err) {
      console.error('Failed to delete entry from Firestore:', err);
    }
  };

  const handleSaveMonthlyVerification = async (verification: MonthlyVerification) => {
    setMonthlyVerifications((prev) => {
      const idx = prev.findIndex(
        (v) => v.id === verification.id || (v.studentId === verification.studentId && v.monthKey === verification.monthKey)
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = verification;
        return copy;
      }
      return [...prev, verification];
    });

    try {
      await saveMonthlyVerificationToFirestore(verification);
    } catch (err) {
      console.error('Failed to save monthly verification to Firestore:', err);
    }
  };

  // ========================================================
  // ACADEMIC YEAR SWITCH & ROMBEL SYNCHRONIZATION HANDLERS
  // ========================================================
  const handleUpdateAcademicYear = (newYear: string, newSemester: SemesterType) => {
    setAcademicYear(newYear);
    setSemester(newSemester);
    saveAcademicYear(newYear);
    saveSemester(newSemester);
  };

  const handleExecuteAcademicYearPromotion = async (
    newYear: string,
    newSemester: SemesterType
  ): Promise<{ success: boolean; message: string }> => {
    try {
      setIsSyncing(true);
      const result = executeAcademicYearPromotion(users, entries, monthlyVerifications, newYear);

      // Update in-memory state
      setUsers(result.updatedUsers);
      setEntries(result.updatedEntries);
      setMonthlyVerifications(result.updatedVerifications);
      setAcademicYear(newYear);
      setSemester(newSemester);

      // Save to localStorage
      saveUsers(result.updatedUsers);
      saveEntries(result.updatedEntries);
      saveAcademicYear(newYear);
      saveSemester(newSemester);

      // If current logged-in user is a student, update their profile too
      if (currentUser && currentUser.role === 'siswa') {
        const updatedSelf = result.updatedUsers.find((u) => u.id === currentUser.id);
        if (updatedSelf) {
          setCurrentUser(updatedSelf);
          saveCurrentUser(updatedSelf);
        }
      }

      // Sync to Cloud Firestore in batches
      await Promise.all([
        saveBatchUsersToFirestore(result.updatedUsers),
        saveBatchEntriesToFirestore(result.updatedEntries),
        saveBatchMonthlyVerificationsToFirestore(result.updatedVerifications),
      ]);

      return {
        success: true,
        message: `Kenaikan kelas sukses! ${result.stats.totalStudents} siswa dinaikkan ke TA ${newYear} (${newSemester}) dan ${result.totalDataSynced} data jurnal & rapor berhasil disinkronkan ke Cloud Firestore.`,
      };
    } catch (err: any) {
      console.error('Error executing academic year promotion:', err);
      return {
        success: false,
        message: `Gagal memproses kenaikan kelas: ${err?.message || 'Kesalahan jaringan'}`,
      };
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSynchronizeAllRombel = async (): Promise<{
    success: boolean;
    message: string;
    updatedEntries: number;
    updatedVerifications: number;
  }> => {
    try {
      setIsSyncing(true);
      const result = synchronizeRombelAcrossAllData(users, entries, monthlyVerifications);

      setEntries(result.syncedEntries);
      setMonthlyVerifications(result.syncedVerifications);
      saveEntries(result.syncedEntries);

      await Promise.all([
        saveBatchEntriesToFirestore(result.syncedEntries),
        saveBatchMonthlyVerificationsToFirestore(result.syncedVerifications),
      ]);

      return {
        success: true,
        message: `Sinkronisasi berhasil! ${result.entriesUpdatedCount} entri jurnal dan ${result.verificationsUpdatedCount} verifikasi bulanan diselaraskan dengan rombel siswa saat ini.`,
        updatedEntries: result.entriesUpdatedCount,
        updatedVerifications: result.verificationsUpdatedCount,
      };
    } catch (err: any) {
      console.error('Error synchronizing rombel:', err);
      return {
        success: false,
        message: `Gagal menyinkronkan data rombel: ${err?.message || 'Kesalahan jaringan'}`,
        updatedEntries: 0,
        updatedVerifications: 0,
      };
    } finally {
      setIsSyncing(false);
    }
  };

  const isStaff = !!currentUser && (currentUser.role === 'guru' || currentUser.role === 'admin');

  // Prevent students or unauthenticated users from staying on leaderboard
  useEffect(() => {
    if (activeTab === 'leaderboard' && !isStaff) {
      if (currentUser?.role === 'siswa') {
        setActiveTab('input-jurnal');
      } else {
        setActiveTab('login-portal');
      }
    }
  }, [activeTab, isStaff, currentUser]);

  const handleExportExcel = () => {
    if (!isStaff) return;
    exportLiteracyToExcel(entries, users);
  };

  const handleOpenReportModal = () => {
    if (!isStaff) return;
    setShowReportModal(true);
  };

  // Full-Screen DirectAdmin Login Portal (matching user's screenshot)
  if (!currentUser || activeTab === 'login-portal') {
    return (
      <RoleLoginPortal
        users={users}
        defaultRole={loginRoleTarget}
        onLoginSuccess={handleLoginSuccess}
        onRegisterStudent={(newSiswa) => handleAddUsers([newSiswa])}
        onGoogleSignIn={handleGoogleSignIn}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row theme-blue-yellow-canvas text-slate-900 relative">
      {/* Real-time Toast Notification when Teacher validates student journal */}
      {liveToastNotification && (
        <ValidationNotificationToast
          entry={liveToastNotification.entry}
          onViewEntry={() => {
            handleMarkSingleValidationRead(liveToastNotification.entry.id);
            setActiveTab('jurnal-saya');
          }}
          onClose={() => setLiveToastNotification(null)}
        />
      )}

      {/* Decorative ambient background glows in Blue and Yellow */}
      <div className="fixed top-0 right-10 w-[480px] h-[480px] bg-amber-400/25 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed top-24 left-6 w-[520px] h-[520px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed bottom-10 right-1/4 w-[480px] h-[480px] bg-amber-300/20 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 left-10 w-[500px] h-[500px] bg-blue-700/20 rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* Kumpulan Menu Blok Sebelah Kiri (Left Sidebar Block Menu) */}
      <LeftSidebarMenu
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onOpenReportModal={handleOpenReportModal}
        onExportExcel={handleExportExcel}
        isSyncing={isSyncing}
        onRefreshData={() => syncLatestFromCloud(true)}
        totalEntriesCount={entries.length}
        pendingValidationCount={entries.filter((e) => !e.teacherValidation).length}
        unreadStudentValidationCount={unreadValidationCount}
        studentValidatedEntriesCount={studentValidatedEntries.length}
        onOpenEditProfile={() => setShowEditProfileModal(true)}
        isOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        onSelectRoleLogin={(role) => {
          setLoginRoleTarget(role);
          setActiveTab('login-portal');
          if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setIsSidebarOpen(false);
          }
        }}
      />

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 w-full max-w-full flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Bar Header with Toggle & Page Context */}
        <TopBarHeader
          currentUser={currentUser}
          activeTab={activeTab}
          academicYear={academicYear}
          semester={semester}
          onOpenAcademicYearModal={() => setActiveTab('upload-admin')}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          onOpenEditProfile={() => setShowEditProfileModal(true)}
          onOpenAuthModal={(role) => {
            if (role) setLoginRoleTarget(role);
            setShowAuthModal(true);
          }}
          onRefreshData={() => syncLatestFromCloud(true)}
          isSyncing={isSyncing}
          onExportExcel={handleExportExcel}
          onOpenReportModal={handleOpenReportModal}
          unreadStudentValidationCount={unreadValidationCount}
          studentValidatedEntries={studentValidatedEntries}
          onNavigateToJurnalSaya={() => setActiveTab('jurnal-saya')}
          onMarkAllValidationsRead={handleMarkAllValidationsRead}
          onMarkSingleValidationRead={handleMarkSingleValidationRead}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-2 sm:p-4 lg:p-6 overflow-x-hidden">

        {/* When user IS logged in */}
        {currentUser && (
          <>
            {activeTab === 'input-jurnal' && currentUser.role === 'siswa' && (
              <StudentJournalForm
                currentUser={currentUser}
                entries={entries}
                onSubmitEntry={handleSubmitEntry}
                onViewHistory={() => setActiveTab('jurnal-saya')}
              />
            )}

            {activeTab === 'jurnal-saya' && currentUser.role === 'siswa' && (
              <StudentHistoryView
                currentUser={currentUser}
                entries={entries}
                monthlyVerifications={monthlyVerifications}
                onAddNewEntry={() => setActiveTab('input-jurnal')}
                unreadValidationIds={unreadValidatedEntries.map((e) => e.id)}
                onMarkSingleRead={handleMarkSingleValidationRead}
                onMarkAllRead={handleMarkAllValidationsRead}
              />
            )}

            {(activeTab === 'validasi-guru' || (currentUser.role === 'guru' && activeTab === 'input-jurnal')) && (
              <TeacherValidationView
                currentUser={currentUser}
                users={users}
                entries={entries}
                monthlyVerifications={monthlyVerifications}
                onValidateEntry={handleValidateEntry}
                onSaveMonthlyVerification={handleSaveMonthlyVerification}
                onExportExcel={handleExportExcel}
              />
            )}

            {activeTab === 'upload-admin' && currentUser.role === 'admin' && (
              <AdminUploadView
                currentUser={currentUser}
                users={users}
                entries={entries}
                monthlyVerifications={monthlyVerifications}
                academicYear={academicYear}
                semester={semester}
                onAddUsers={handleAddUsers}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                onDeleteBatchUsers={handleDeleteBatchUsers}
                onUpdateEntry={handleUpdateEntry}
                onDeleteEntry={handleDeleteEntry}
                onValidateEntry={handleValidateEntry}
                onSaveMonthlyVerification={handleSaveMonthlyVerification}
                onExportExcel={handleExportExcel}
                onUpdateAcademicYear={handleUpdateAcademicYear}
                onExecutePromotion={handleExecuteAcademicYearPromotion}
                onSynchronizeRombelOnly={handleSynchronizeAllRombel}
              />
            )}
          </>
        )}

        {/* Papan Peringkat Top 3 hanya dapat diakses oleh akun Guru dan Admin */}
        {activeTab === 'leaderboard' && isStaff && (
          <div className="relative">
            <LeaderboardView
              entries={entries}
              users={users}
              onExportExcel={handleExportExcel}
              onOpenReportModal={handleOpenReportModal}
            />
          </div>
        )}
      </main>

      {/* Footer (no-print) */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 no-print text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <span className="font-bold text-slate-800">SI-LITERASI</span>
            <span>•</span>
            <span>Sistem Penilaian Jurnal Literasi Siswa & Pembinaan Karakter</span>
          </div>
          {isStaff && (
            <div className="flex items-center gap-4">
              <button
                onClick={handleOpenReportModal}
                className="hover:text-indigo-600 transition-colors font-semibold cursor-pointer"
              >
                Cetak Rekap Nilai PDF
              </button>
              <span>•</span>
              <button
                onClick={handleExportExcel}
                className="hover:text-emerald-600 transition-colors font-semibold cursor-pointer"
              >
                Unduh Excel (.xlsx)
              </button>
              <span>•</span>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className="hover:text-amber-600 transition-colors font-semibold cursor-pointer"
              >
                Top 3 Jenjang 10, 11, 12
              </button>
            </div>
          )}
        </div>
      </footer>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        initialRole={loginRoleTarget}
        onClose={() => setShowAuthModal(false)}
        users={users}
        onSelectUser={handleLoginSuccess}
        onRegisterStudent={(newSiswa) => handleAddUsers([newSiswa])}
        onGoogleSignIn={handleGoogleSignIn}
      />

      {showReportModal && isStaff && (
        <ReportPrintView
          entries={entries}
          users={users}
          academicYear={academicYear}
          semester={semester}
          onClose={() => setShowReportModal(false)}
          onExportExcel={handleExportExcel}
        />
      )}

      {/* Edit Profile Modal for any logged in account */}
      <EditProfileModal
        isOpen={showEditProfileModal}
        currentUser={currentUser}
        onClose={() => setShowEditProfileModal(false)}
        onSaveProfile={handleSaveOwnProfile}
      />
    </div>
  );
}
