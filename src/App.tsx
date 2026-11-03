import React, { useState, useEffect } from 'react';
import { User, UserRole, JenjangKelas, LiteracyEntry, TeacherValidation, MonthlyVerification, SemesterType, SchoolProfileSettings, DEFAULT_SCHOOL_PROFILE, RombelItem, JournalCutoffConfig } from './types';
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
  saveStoredRombels,
  getStoredJournalCutoff,
  saveStoredJournalCutoff,
  isXiMipaIpsBahasa
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
  saveJournalCutoffToFirestore,
  fetchJournalCutoffFromFirestore,
  subscribeJournalCutoff,
  dbBroadcastChannel,
  broadcastDatabaseChange,
  touchSyncBeacon,
  subscribeSyncBeacon,
  signInWithGoogle, 
  signOutFirebase 
} from './firebase/service';
import confetti from 'canvas-confetti';
import { pullAndSynchronizeAllJournalGrades, PullJournalGradesResult } from './utils/accumulation';
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
import { DashboardView } from './components/DashboardView';
import { HelpGuideModal } from './components/HelpGuideModal';
import { SchoolSettingsModal } from './components/SchoolSettingsModal';
import { ValidationNotificationToast } from './components/ValidationNotificationToast';
import { StudentSubmissionNotificationToast } from './components/StudentSubmissionNotificationToast';
import { playValidationChime, playNewSubmissionChime } from './utils/sound';
import { RombelProgressMonitoringView } from './components/RombelProgressMonitoringView';
import { LayoutDashboard, PenTool, CheckCircle2, History, Database, Trophy, Menu as MenuIcon, BarChart3 } from 'lucide-react';

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
  const [journalCutoff, setJournalCutoff] = useState<JournalCutoffConfig>(getStoredJournalCutoff);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    const user = getStoredCurrentUser();
    if (!user) return 'login-portal';
    return 'dashboard';
  });

  // Selected default role for login portal or auth modal
  const [loginRoleTarget, setLoginRoleTarget] = useState<UserRole>('siswa');

  // Modals & Navigation
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [showSchoolSettingsModal, setShowSchoolSettingsModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [isPullingGrades, setIsPullingGrades] = useState<boolean>(false);
  const [pullGradesResult, setPullGradesResult] = useState<PullJournalGradesResult | null>(null);
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

  // ========================================================
  // REAL-TIME NOTIFICATIONS FOR TEACHERS & ADMINS (STUDENT SUBMISSIONS)
  // ========================================================
  const [viewedSubmissionIds, setViewedSubmissionIds] = useState<string[]>(() => {
    const user = getStoredCurrentUser();
    if (!user || user.role === 'siswa') return [];
    try {
      const stored = localStorage.getItem(`siliterasi_viewed_submissions_${user.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [liveStudentSubmissionToast, setLiveStudentSubmissionToast] = useState<{
    entry: LiteracyEntry;
    id: string;
  } | null>(null);

  // Sync viewedSubmissionIds when currentUser changes
  useEffect(() => {
    if (currentUser?.role === 'guru' || currentUser?.role === 'admin') {
      try {
        const stored = localStorage.getItem(`siliterasi_viewed_submissions_${currentUser.id}`);
        setViewedSubmissionIds(stored ? JSON.parse(stored) : []);
      } catch {
        setViewedSubmissionIds([]);
      }
    } else {
      setViewedSubmissionIds([]);
    }
  }, [currentUser?.id, currentUser?.role]);

  // All pending submissions waiting for validation
  const pendingSubmissions = React.useMemo(() => {
    return entries.filter((e) => !e.teacherValidation);
  }, [entries]);

  // Unread submissions for teacher / admin
  const unreadSubmissions = React.useMemo(() => {
    const viewedSet = new Set(viewedSubmissionIds);
    return pendingSubmissions.filter((e) => !viewedSet.has(e.id));
  }, [pendingSubmissions, viewedSubmissionIds]);

  const unreadSubmissionCount = unreadSubmissions.length;

  // Real-time listener for newly submitted entries by students (for Guru and Admin)
  const prevPendingSubmissionIdsRef = React.useRef<Set<string>>(new Set());
  const isInitialSubmissionsMountRef = React.useRef<boolean>(true);

  useEffect(() => {
    const isStaff = currentUser?.role === 'guru' || currentUser?.role === 'admin';
    if (!isStaff) {
      prevPendingSubmissionIdsRef.current = new Set();
      isInitialSubmissionsMountRef.current = true;
      return;
    }

    const currentPendingIds = new Set(pendingSubmissions.map((e) => e.id));

    if (!isInitialSubmissionsMountRef.current) {
      const newlySubmitted = pendingSubmissions.filter(
        (e) => !prevPendingSubmissionIdsRef.current.has(e.id)
      );
      if (newlySubmitted.length > 0) {
        const newest = newlySubmitted[0];
        setLiveStudentSubmissionToast({
          entry: newest,
          id: newest.id,
        });
        playNewSubmissionChime();
      }
    } else {
      isInitialSubmissionsMountRef.current = false;
    }

    prevPendingSubmissionIdsRef.current = currentPendingIds;
  }, [pendingSubmissions, currentUser]);

  const handleMarkSingleSubmissionRead = (entryId: string) => {
    if (!currentUser) return;
    setViewedSubmissionIds((prev) => {
      if (prev.includes(entryId)) return prev;
      const updated = [...prev, entryId];
      try {
        localStorage.setItem(
          `siliterasi_viewed_submissions_${currentUser.id}`,
          JSON.stringify(updated)
        );
      } catch (err) {
        console.warn(err);
      }
      return updated;
    });
  };

  const handleMarkAllSubmissionsRead = () => {
    if (!currentUser) return;
    const allPendingIds = pendingSubmissions.map((e) => e.id);
    setViewedSubmissionIds(allPendingIds);
    try {
      localStorage.setItem(
        `siliterasi_viewed_submissions_${currentUser.id}`,
        JSON.stringify(allPendingIds)
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
      const [allData, academicConfig, schoolConfig, cloudRombels, cloudCutoff] = await Promise.all([
        fetchAllFromFirestore(),
        fetchAcademicSettingsFromFirestore(),
        fetchSchoolProfileFromFirestore(),
        fetchRombelsFromFirestore(),
        fetchJournalCutoffFromFirestore(),
      ]);

      if (allData.users && allData.users.length > 0) {
        setUsers(allData.users);
        saveUsers(allData.users);
      }
      if (allData.entries && allData.entries.length > 0) {
        setEntries(allData.entries);
        saveEntries(allData.entries);
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
      if (cloudCutoff) {
        setJournalCutoff(cloudCutoff);
        saveStoredJournalCutoff(cloudCutoff);
      }

      if (showLoadingState) {
        // Broadcast push notification to all other connected browsers & devices
        touchSyncBeacon('manual_sync').catch(() => {});
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
          saveUsers(fsUsers);
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
          saveEntries(fsEntries);
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
        const cleanRombels = cloudRombels.filter((r) => !isXiMipaIpsBahasa(r.name, undefined, r.name));
        setRombels(cleanRombels);
        saveStoredRombels(cleanRombels);
      }
    });

    // 8. Listen to real-time journal submission cut-off date across all devices
    const unsubCutoff = subscribeJournalCutoff((cloudCutoff) => {
      if (cloudCutoff) {
        setJournalCutoff(cloudCutoff);
        saveStoredJournalCutoff(cloudCutoff);
      }
    });

    // 9. Multi-device real-time sync beacon (instant push notification across all phones, tablets, laptops)
    const unsubBeacon = subscribeSyncBeacon((beacon) => {
      console.log('Multi-device sync trigger received:', beacon);
      syncLatestFromCloud(false);
    });

    // 10. Cross-tab/window BroadcastChannel synchronization
    const handleBroadcast = (event: MessageEvent) => {
      console.log('Local cross-tab sync received:', event.data?.type);
      syncLatestFromCloud(false);
    };
    if (dbBroadcastChannel) {
      dbBroadcastChannel.addEventListener('message', handleBroadcast);
    }

    // 11. Multi-device wake & tab focus listener: re-sync instantly when user switches back to browser tab
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
      unsubCutoff();
      unsubBeacon();
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
    setActiveTab('dashboard');
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

    // Persist to Cloud Firestore and broadcast across tabs
    try {
      await createEntryInFirestore(newEntry);
      broadcastDatabaseChange('entries');
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

  const handleUpdateJournalCutoff = async (newConfig: JournalCutoffConfig) => {
    setJournalCutoff(newConfig);
    saveStoredJournalCutoff(newConfig);
    try {
      await saveJournalCutoffToFirestore(newConfig);
    } catch (err) {
      console.warn('Failed to save journal cutoff to Firestore:', err);
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

  /**
   * Tarik dan akumulasi nilai jurnal dari isian seluruh murid dan guru
   */
  const handlePullAllJournalGrades = async (): Promise<PullJournalGradesResult | null> => {
    setIsPullingGrades(true);
    try {
      const result = pullAndSynchronizeAllJournalGrades(
        entries,
        users,
        monthlyVerifications,
        currentUser || undefined
      );

      // Local optimistic state update
      if (result.updatedEntries.length > 0) {
        setEntries((prev) => {
          const map = new Map(result.updatedEntries.map((e) => [e.id, e]));
          return prev.map((e) => map.get(e.id) || e);
        });
        saveBatchEntriesToFirestore(result.updatedEntries).catch((err) =>
          console.warn('Batch entries sync error:', err)
        );
      }

      if (result.generatedVerifications.length > 0) {
        setMonthlyVerifications((prev) => {
          const map = new Map(prev.map((v) => [`${v.studentId}_${v.monthKey}`, v]));
          result.generatedVerifications.forEach((gv) => {
            map.set(`${gv.studentId}_${gv.monthKey}`, gv);
          });
          return Array.from(map.values());
        });
        saveBatchMonthlyVerificationsToFirestore(result.generatedVerifications).catch((err) =>
          console.warn('Batch verifications sync error:', err)
        );
      }

      broadcastDatabaseChange('entries');
      broadcastDatabaseChange('verifications');

      setPullGradesResult(result);
      try {
        confetti({
          particleCount: 110,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ffffff']
        });
      } catch {
        // ignore
      }

      return result;
    } catch (err: any) {
      console.error('Failed to pull journal grades:', err);
      alert('Gagal mengambil nilai jurnal: ' + (err?.message || 'Kesalahan sistem'));
      return null;
    } finally {
      setIsPullingGrades(false);
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
    <div className="h-screen h-[100dvh] w-full flex flex-col lg:flex-row bg-slate-50 dark:bg-[#090e1a] institutional-grid-bg text-slate-900 dark:text-slate-100 relative transition-colors overflow-hidden select-none">
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

      {/* Real-time Toast Notification when Student submits a new journal (for Guru and Admin) */}
      {liveStudentSubmissionToast && (
        <StudentSubmissionNotificationToast
          entry={liveStudentSubmissionToast.entry}
          onViewEntry={() => {
            handleMarkSingleSubmissionRead(liveStudentSubmissionToast.entry.id);
            setActiveTab('validasi-guru');
          }}
          onClose={() => setLiveStudentSubmissionToast(null)}
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
        unreadStudentValidationCount={currentUser.role === 'siswa' ? unreadValidationCount : unreadSubmissionCount}
        studentValidatedEntriesCount={studentValidatedEntries.length}
        onOpenEditProfile={() => setShowEditProfileModal(true)}
        onOpenSchoolSettingsModal={() => setShowSchoolSettingsModal(true)}
        onOpenHelpModal={() => setShowHelpModal(true)}
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

      {/* Main Content Column (Locked strictly inside single screen viewport) */}
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        {/* Top Bar Header with Toggle & Page Context */}
        <TopBarHeader
          currentUser={currentUser}
          activeTab={activeTab}
          onNavigateTab={setActiveTab}
          entries={entries}
          users={users}
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
          unreadSubmissionCount={unreadSubmissionCount}
          pendingSubmissions={pendingSubmissions}
          onMarkAllSubmissionsRead={handleMarkAllSubmissionsRead}
          onMarkSingleSubmissionRead={handleMarkSingleSubmissionRead}
          onNavigateToValidasi={() => setActiveTab('validasi-guru')}
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
        />

        {/* Main Content Area with Smooth Fade-In Transition and Internal Scroll Container */}
        <main className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3 lg:p-4 scrollbar-thin">
          <div key={activeTab} className="animate-tab-fade w-full">
            {/* When user IS logged in */}
            {currentUser && (
              <>
                {/* 1. Primary Post-Login Dashboard View */}
                {activeTab === 'dashboard' && (
                  <DashboardView
                    currentUser={currentUser}
                    users={users}
                    entries={entries}
                    monthlyVerifications={monthlyVerifications}
                    rombels={rombels}
                    schoolProfile={schoolProfile}
                    academicYear={academicYear}
                    semester={semester}
                    journalCutoff={journalCutoff}
                    onUpdateJournalCutoff={handleUpdateJournalCutoff}
                    onNavigateTab={setActiveTab}
                    onOpenReportModal={handleOpenReportModal}
                    onExportExcel={handleExportExcel}
                    onOpenSchoolSettingsModal={() => setShowSchoolSettingsModal(true)}
                    unreadCount={unreadValidationCount}
                  />
                )}

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
                    onPullAllJournalGrades={handlePullAllJournalGrades}
                    isPullingGrades={isPullingGrades}
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
                    onPullAllJournalGrades={handlePullAllJournalGrades}
                    isPullingGrades={isPullingGrades}
                  />
                )}

                {/* Halaman Monitoring Progres Pengisian Jurnal per Rombel / Kelas (MENU UTAMA) */}
                {activeTab === 'monitoring-rombel' && (
                  <RombelProgressMonitoringView
                    currentUser={currentUser}
                    users={users}
                    entries={entries}
                    rombels={rombels}
                    schoolProfile={schoolProfile}
                    academicYear={academicYear}
                    semester={semester}
                    onOpenReportModal={handleOpenReportModal}
                    onNavigateTab={setActiveTab}
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
                  monthlyVerifications={monthlyVerifications}
                  onExportExcel={handleExportExcel}
                  onOpenReportModal={handleOpenReportModal}
                  onSyncAllGrades={handlePullAllJournalGrades}
                  isSyncingGrades={isPullingGrades}
                />
              </div>
            )}
          </div>
        </main>

      {/* Single-Screen Compact Status Bar Footer (no-print) */}
      <footer className="shrink-0 h-8 sm:h-8.5 px-3 sm:px-6 bg-white dark:bg-[#0c1424] border-t border-slate-200/80 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between no-print transition-colors z-10">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-slate-800 dark:text-slate-200 tracking-tight">SI-LITERASI</span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
          <span className="hidden sm:inline truncate">{schoolProfile.namaSekolah} — Sistem Penilaian Karakter Literasi</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isStaff && (
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={handleOpenReportModal}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold cursor-pointer transition-colors"
              >
                Rekap PDF
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                onClick={handleExportExcel}
                className="hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold cursor-pointer transition-colors"
              >
                Unduh Excel
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className="hover:text-amber-600 dark:hover:text-amber-400 font-semibold cursor-pointer transition-colors"
              >
                Top 3 Jenjang
              </button>
            </div>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {academicYear} • Sem {semester}
          </span>
        </div>
      </footer>

      {/* Mobile-First Bottom Quick Navigation Bar (< lg screens, fitted 1-tap UX) */}
      <nav aria-label="Navigasi Bawah Layar HP" className="lg:hidden shrink-0 h-14 bg-white/95 dark:bg-[#0c1424]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 z-20 shadow-lg no-print">
        {/* Tab 1: Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4.5 h-4.5 mb-0.5" />
          <span className="text-[9.5px] leading-tight">Beranda</span>
        </button>

        {/* Tab 2: Progres Rombel / Kelas (MENU UTAMA) */}
        <button
          onClick={() => setActiveTab('monitoring-rombel')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            activeTab === 'monitoring-rombel'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4.5 h-4.5 mb-0.5" />
          <span className="text-[9.5px] leading-tight font-semibold">Progres</span>
        </button>

        {/* Tab 2: Action based on Role */}
        {currentUser?.role === 'siswa' && (
          <button
            onClick={() => setActiveTab('input-jurnal')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
              activeTab === 'input-jurnal'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <PenTool className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Isi Jurnal</span>
          </button>
        )}

        {currentUser?.role === 'guru' && (
          <button
            onClick={() => setActiveTab('validasi-guru')}
            className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
              activeTab === 'validasi-guru'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Validasi</span>
            {pendingSubmissions.length > 0 && (
              <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            )}
          </button>
        )}

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('upload-admin')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
              activeTab === 'upload-admin'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Database className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Data Master</span>
          </button>
        )}

        {/* Tab 3: History / Leaderboard */}
        {currentUser?.role === 'siswa' ? (
          <button
            onClick={() => setActiveTab('jurnal-saya')}
            className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
              activeTab === 'jurnal-saya'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Jurnal Saya</span>
            {unreadValidationCount > 0 && (
              <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            )}
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Trophy className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Peringkat</span>
          </button>
        )}

        {/* Tab 4: Menu / Drawer Toggle */}
        <button
          onClick={handleToggleSidebar}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
        >
          <MenuIcon className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Menu</span>
        </button>
      </nav>
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

      {/* Help & Guide Center Modal */}
      <HelpGuideModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        defaultRole={currentUser?.role}
      />

      {/* Modal Ringkasan Pengambilan Nilai Jurnal Siswa & Guru */}
      {pullGradesResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-emerald-400/50 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                    Pengambilan Nilai Jurnal Berhasil!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Data jurnal murid & validasi guru telah direkapitulasi secara otomatis.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPullGradesResult(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                <div className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300">
                  Jurnal Diproses
                </div>
                <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {pullGradesResult.totalProcessedEntries}
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400/80">
                  {pullGradesResult.totalUpdatedEntries} entri diselaraskan
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40">
                <div className="text-[10px] font-bold uppercase text-blue-800 dark:text-blue-300">
                  Validasi Guru
                </div>
                <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-0.5">
                  {pullGradesResult.totalTeacherValidations}
                </div>
                <div className="text-[11px] text-blue-700 dark:text-blue-400/80">
                  Skor pembimbing terintegrasi
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40">
                <div className="text-[10px] font-bold uppercase text-purple-800 dark:text-purple-300">
                  Siswa Dinilai
                </div>
                <div className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-0.5">
                  {pullGradesResult.totalStudentsGraded}
                </div>
                <div className="text-[11px] text-purple-700 dark:text-purple-400/80">
                  Siswa aktif berliterasi
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                <div className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300">
                  Rapor Bulanan
                </div>
                <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-0.5">
                  {pullGradesResult.totalMonthlyVerifications}
                </div>
                <div className="text-[11px] text-amber-700 dark:text-amber-400/80">
                  Rekapitulasi nilai tuntas
                </div>
              </div>
            </div>

            {/* Predicate Breakdown */}
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                Sebaran Predikat Hasil Pengambilan Nilai:
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-emerald-100/70 text-emerald-900 font-extrabold">
                  <div>Predikat A</div>
                  <div className="text-base font-black">{pullGradesResult.predicatesCount.A}</div>
                </div>
                <div className="p-2 rounded-xl bg-blue-100/70 text-blue-900 font-extrabold">
                  <div>Predikat B</div>
                  <div className="text-base font-black">{pullGradesResult.predicatesCount.B}</div>
                </div>
                <div className="p-2 rounded-xl bg-amber-100/70 text-amber-900 font-extrabold">
                  <div>Predikat C</div>
                  <div className="text-base font-black">{pullGradesResult.predicatesCount.C}</div>
                </div>
                <div className="p-2 rounded-xl bg-rose-100/70 text-rose-900 font-extrabold">
                  <div>Predikat D</div>
                  <div className="text-base font-black">{pullGradesResult.predicatesCount.D}</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPullGradesResult(null);
                  setActiveTab('leaderboard');
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-300 text-blue-950 transition-colors cursor-pointer shadow-md shadow-amber-400/20"
              >
                Lihat Peringkat Top 3 🏆
              </button>
              <button
                type="button"
                onClick={() => setPullGradesResult(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
