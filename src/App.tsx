import React, { useState, useEffect } from 'react';
import { User, UserRole, JenjangKelas, LiteracyEntry, TeacherValidation, MonthlyVerification, SemesterType, SchoolProfileSettings, DEFAULT_SCHOOL_PROFILE, RombelItem } from './types';
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
  saveSemester,
  getStoredSchoolProfile,
  saveSchoolProfile,
  getStoredRombels,
  saveStoredRombels
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
  saveAcademicSettingsToFirestore,
  fetchAcademicSettingsFromFirestore,
  subscribeAcademicSettings,
  saveSchoolProfileToFirestore,
  fetchSchoolProfileFromFirestore,
  subscribeSchoolProfile,
  saveRombelsToFirestore,
  fetchRombelsFromFirestore,
  subscribeRombels,
  dbBroadcastChannel,
  broadcastDatabaseChange,
  signInWithGoogle, 
  signOutFirebase 
} from './firebase/service';
import { useTheme } from './utils/theme';
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
import { SchoolSettingsModal } from './components/SchoolSettingsModal';
import { ValidationNotificationToast } from './components/ValidationNotificationToast';
import { playValidationChime } from './utils/sound';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [users, setUsers] = useState<User[]>(getStoredUsers);
  const [entries, setEntries] = useState<LiteracyEntry[]>(getStoredEntries);
  const [monthlyVerifications, setMonthlyVerifications] = useState<MonthlyVerification[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredCurrentUser);
  const [academicYear, setAcademicYear] = useState<string>(getStoredAcademicYear);
  const [semester, setSemester] = useState<SemesterType>(getStoredSemester);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfileSettings>(getStoredSchoolProfile);
  const [rombels, setRombels] = useState<RombelItem[]>(() => getStoredRombels(users));
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
  const [showSchoolSettingsModal, setShowSchoolSettingsModal] = useState<boolean>(false);
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
      const [allData, academicConfig, schoolConfig, cloudRombels] = await Promise.all([
        fetchAllFromFirestore(),
        fetchAcademicSettingsFromFirestore(),
        fetchSchoolProfileFromFirestore(),
        fetchRombelsFromFirestore(),
      ]);

      if (allData.users && allData.users.length > 0) {
        setUsers(allData.users);
      }
      if (allData.entries) {
        setEntries(allData.entries);
      }
      if (cloudRombels && cloudRombels.length > 0) {
        setRombels(cloudRombels);
        saveStoredRombels(cloudRombels);
      }
      if (academicConfig?.academicYear) {
        setAcademicYear(academicConfig.academicYear);
        saveAcademicYear(academicConfig.academicYear);
      }
      if (academicConfig?.semester) {
        setSemester(academicConfig.semester);
        saveSemester(academicConfig.semester);
      }
      if (schoolConfig) {
        setSchoolProfile(schoolConfig);
        saveSchoolProfile(schoolConfig);
      }
    } catch (err) {
      console.warn('Sync cloud notice:', err);
    } finally {
      if (showLoadingState) {
        setTimeout(() => setIsSyncing(false), 500);
      }
    }
  };

  // Initial Firestore setup, immediate multi-device fetch, and real-time listeners across all devices & browsers
  useEffect(() => {
    // 1. Immediately fetch live data from Cloud Firestore for fresh devices/browsers
    syncLatestFromCloud(false);

    // 2. Listen to real-time users collection across all devices & browsers
    const unsubUsers = subscribeUsers(
      (fsUsers) => {
        if (fsUsers && fsUsers.length > 0) {
          setUsers(fsUsers);
          // If current logged-in user exists in updated Firestore data, synchronize their active session
          setCurrentUser((current) => {
            if (!current) return null;
            const updated = fsUsers.find((u) => u.id === current.id);
            if (updated) {
              saveCurrentUser(updated);
              return updated;
            }
            return current;
          });
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

    // 5. Listen to real-time academic settings across all devices
    const unsubAcademic = subscribeAcademicSettings((config) => {
      if (config?.academicYear) {
        setAcademicYear(config.academicYear);
        saveAcademicYear(config.academicYear);
      }
      if (config?.semester) {
        setSemester(config.semester);
        saveSemester(config.semester);
      }
    });

    // 6. Listen to real-time school profile settings across all devices
    const unsubSchool = subscribeSchoolProfile((profile) => {
      if (profile) {
        setSchoolProfile(profile);
        saveSchoolProfile(profile);
      }
    });

    // 7. Listen to real-time rombel master data across all devices
    const unsubRombels = subscribeRombels((cloudRombels) => {
      if (cloudRombels && cloudRombels.length > 0) {
        setRombels(cloudRombels);
        saveStoredRombels(cloudRombels);
      }
    });

    // 8. Cross-tab/window BroadcastChannel synchronization
    const handleBroadcast = () => {
      syncLatestFromCloud(false);
    };
    if (dbBroadcastChannel) {
      dbBroadcastChannel.addEventListener('message', handleBroadcast);
    }

    // 9. Periodic automated background sync heartbeat (every 25 seconds)
    const heartbeatTimer = setInterval(() => {
      syncLatestFromCloud(false);
    }, 25000);

    // 10. Multi-device wake & tab focus listener: re-sync instantly when user switches back to browser tab
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
      unsubAcademic();
      unsubSchool();
      unsubRombels();
      clearInterval(heartbeatTimer);
      if (dbBroadcastChannel) {
        dbBroadcastChannel.removeEventListener('message', handleBroadcast);
      }
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

  const handleSaveSchoolProfile = async (updated: SchoolProfileSettings) => {
    setSchoolProfile(updated);
    saveSchoolProfile(updated);
    try {
      await saveSchoolProfileToFirestore(updated);
    } catch (err) {
      console.warn('Failed to save school profile to Firestore:', err);
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
    saveAcademicSettingsToFirestore({
      academicYear: newYear,
      semester: newSemester,
      updatedBy: currentUser?.name || 'Administrator',
    }).catch((err) => console.warn('Failed to sync academic settings to Firestore:', err));
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

      // Sync to Cloud Firestore in batches and sync academic settings doc
      await Promise.all([
        saveBatchUsersToFirestore(result.updatedUsers),
        saveBatchEntriesToFirestore(result.updatedEntries),
        saveBatchMonthlyVerificationsToFirestore(result.updatedVerifications),
        saveAcademicSettingsToFirestore({
          academicYear: newYear,
          semester: newSemester,
          updatedBy: currentUser?.name || 'Administrator',
        }),
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

  // ========================================================
  // ROMBEL CRUD & DATA CASCADING HANDLERS
  // ========================================================
  const handleSaveRombels = (newRombels: RombelItem[]) => {
    setRombels(newRombels);
    saveStoredRombels(newRombels);
    saveRombelsToFirestore(newRombels).catch((err) => console.warn('Save rombels to firestore notice:', err));
    broadcastDatabaseChange('rombels');
  };

  const handleCascadeUpdateRombel = async (
    oldRombelName: string,
    newRombelName: string,
    newGrade: JenjangKelas
  ): Promise<{ updatedUsers: number; updatedEntries: number; updatedVerifications: number }> => {
    setIsSyncing(true);
    try {
      // 1. Update rombels list
      const updatedRombelsList = rombels.map((r) =>
        r.name.toLowerCase() === oldRombelName.toLowerCase()
          ? { ...r, name: newRombelName, grade: newGrade }
          : r
      );
      setRombels(updatedRombelsList);
      saveStoredRombels(updatedRombelsList);
      await saveRombelsToFirestore(updatedRombelsList);

      // 2. Cascade to students
      let updatedUsersCount = 0;
      const modifiedUsers: User[] = [];
      const newUsers = users.map((u) => {
        if (u.role === 'siswa' && u.rombel && u.rombel.trim().toLowerCase() === oldRombelName.trim().toLowerCase()) {
          updatedUsersCount++;
          const updatedUser: User = {
            ...u,
            rombel: newRombelName,
            kelas: newGrade,
          };
          modifiedUsers.push(updatedUser);
          return updatedUser;
        }
        return u;
      });

      if (modifiedUsers.length > 0) {
        setUsers(newUsers);
        saveUsers(newUsers);
        await saveBatchUsersToFirestore(modifiedUsers);
      }

      // 3. Cascade to literacy entries
      let updatedEntriesCount = 0;
      const modifiedEntries: LiteracyEntry[] = [];
      const newEntries = entries.map((e) => {
        if (e.studentRombel && e.studentRombel.trim().toLowerCase() === oldRombelName.trim().toLowerCase()) {
          updatedEntriesCount++;
          const updatedEntry: LiteracyEntry = {
            ...e,
            studentRombel: newRombelName,
            studentKelas: newGrade,
          };
          modifiedEntries.push(updatedEntry);
          return updatedEntry;
        }
        return e;
      });

      if (modifiedEntries.length > 0) {
        setEntries(newEntries);
        saveEntries(newEntries);
        await saveBatchEntriesToFirestore(modifiedEntries);
      }

      // 4. Cascade to monthly verifications
      let updatedVerificationsCount = 0;
      const modifiedVerifications: MonthlyVerification[] = [];
      const newVerifications = monthlyVerifications.map((v) => {
        if (v.studentRombel && v.studentRombel.trim().toLowerCase() === oldRombelName.trim().toLowerCase()) {
          updatedVerificationsCount++;
          const updatedV: MonthlyVerification = {
            ...v,
            studentRombel: newRombelName,
            studentKelas: newGrade,
          };
          modifiedVerifications.push(updatedV);
          return updatedV;
        }
        return v;
      });

      if (modifiedVerifications.length > 0) {
        setMonthlyVerifications(newVerifications);
        await saveBatchMonthlyVerificationsToFirestore(modifiedVerifications);
      }

      broadcastDatabaseChange('rombels');
      return {
        updatedUsers: updatedUsersCount,
        updatedEntries: updatedEntriesCount,
        updatedVerifications: updatedVerificationsCount,
      };
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReassignOrDeleteRombel = async (
    rombelToDelete: string,
    targetRombel?: string
  ): Promise<{ updatedUsers: number; updatedEntries: number }> => {
    setIsSyncing(true);
    try {
      // 1. Remove from rombels
      const filteredRombels = rombels.filter((r) => r.name.toLowerCase() !== rombelToDelete.toLowerCase());
      setRombels(filteredRombels);
      saveStoredRombels(filteredRombels);
      await saveRombelsToFirestore(filteredRombels);

      // 2. Reassign students
      let updatedUsersCount = 0;
      const modifiedUsers: User[] = [];
      const newUsers = users.map((u) => {
        if (u.role === 'siswa' && u.rombel && u.rombel.trim().toLowerCase() === rombelToDelete.trim().toLowerCase()) {
          updatedUsersCount++;
          const targetRombelObj = targetRombel ? rombels.find((r) => r.name.toLowerCase() === targetRombel.toLowerCase()) : null;
          const updatedUser: User = {
            ...u,
            rombel: targetRombel || '',
            kelas: targetRombelObj ? targetRombelObj.grade : u.kelas,
          };
          modifiedUsers.push(updatedUser);
          return updatedUser;
        }
        return u;
      });

      if (modifiedUsers.length > 0) {
        setUsers(newUsers);
        saveUsers(newUsers);
        await saveBatchUsersToFirestore(modifiedUsers);
      }

      // 3. Reassign entries if target rombel specified
      let updatedEntriesCount = 0;
      if (targetRombel) {
        const targetRombelObj = rombels.find((r) => r.name.toLowerCase() === targetRombel.toLowerCase());
        const modifiedEntries: LiteracyEntry[] = [];
        const newEntries = entries.map((e) => {
          if (e.studentRombel && e.studentRombel.trim().toLowerCase() === rombelToDelete.trim().toLowerCase()) {
            updatedEntriesCount++;
            const updatedEntry: LiteracyEntry = {
              ...e,
              studentRombel: targetRombel,
              studentKelas: targetRombelObj ? targetRombelObj.grade : e.studentKelas,
            };
            modifiedEntries.push(updatedEntry);
            return updatedEntry;
          }
          return e;
        });
        if (modifiedEntries.length > 0) {
          setEntries(newEntries);
          saveEntries(newEntries);
          await saveBatchEntriesToFirestore(modifiedEntries);
        }
      }

      broadcastDatabaseChange('rombels');
      return { updatedUsers: updatedUsersCount, updatedEntries: updatedEntriesCount };
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
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-[#090e1a] institutional-grid-bg text-slate-900 dark:text-slate-100 relative transition-colors">
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
        theme={theme}
        onToggleTheme={toggleTheme}
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
          schoolName={schoolProfile.namaSekolah}
          onOpenSchoolSettingsModal={() => setShowSchoolSettingsModal(true)}
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
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
        />

        {/* Main Content Area with Smooth Fade-In Transition on Tab Change */}
        <main className="flex-1 p-2 sm:p-4 lg:p-6 overflow-x-hidden">
          <div key={activeTab} className="animate-tab-fade w-full">
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
                    rombels={rombels}
                    onSaveRombels={handleSaveRombels}
                    onCascadeUpdateRombel={handleCascadeUpdateRombel}
                    onReassignOrDeleteRombel={handleReassignOrDeleteRombel}
                    academicYear={academicYear}
                    semester={semester}
                    schoolProfile={schoolProfile}
                    onOpenSchoolSettingsModal={() => setShowSchoolSettingsModal(true)}
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
          </div>
        </main>

      {/* Footer (no-print) */}
      <footer className="bg-white dark:bg-[#0c1424] border-t border-slate-200 dark:border-slate-800 py-6 px-4 no-print text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <span className="font-bold text-slate-800 dark:text-slate-100">SI-LITERASI</span>
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
          schoolProfile={schoolProfile}
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

      {/* School & Official Settings Modal */}
      <SchoolSettingsModal
        isOpen={showSchoolSettingsModal}
        onClose={() => setShowSchoolSettingsModal(false)}
        currentProfile={schoolProfile}
        onSaveProfile={handleSaveSchoolProfile}
      />
    </div>
  );
}
