import React, { useState, useEffect } from 'react';
import { User, UserRole, LiteracyEntry, TeacherValidation, MonthlyVerification } from './types';
import { 
  getStoredUsers, 
  saveUsers, 
  getStoredEntries, 
  saveEntries, 
  getStoredCurrentUser, 
  saveCurrentUser
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
  signInWithGoogle, 
  signOutFirebase 
} from './firebase/service';
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

export default function App() {
  const [users, setUsers] = useState<User[]>(getStoredUsers);
  const [entries, setEntries] = useState<LiteracyEntry[]>(getStoredEntries);
  const [monthlyVerifications, setMonthlyVerifications] = useState<MonthlyVerification[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredCurrentUser);
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row theme-blue-yellow-canvas text-slate-900 relative">
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
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Bar Header with Toggle & Page Context */}
        <TopBarHeader
          currentUser={currentUser}
          activeTab={activeTab}
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
        />

        {/* Main Content Area */}
        <main className="flex-1 p-2 sm:p-4 lg:p-6 overflow-x-hidden">
        {/* If no user is logged in, or tab is login-portal: show Role Login Portal */}
        {(!currentUser || activeTab === 'login-portal') && (
          <RoleLoginPortal
            users={users}
            defaultRole={loginRoleTarget}
            onLoginSuccess={handleLoginSuccess}
            onRegisterStudent={(newSiswa) => handleAddUsers([newSiswa])}
            onGoogleSignIn={handleGoogleSignIn}
          />
        )}

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
                onAddUsers={handleAddUsers}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                onDeleteBatchUsers={handleDeleteBatchUsers}
                onUpdateEntry={handleUpdateEntry}
                onDeleteEntry={handleDeleteEntry}
                onValidateEntry={handleValidateEntry}
                onSaveMonthlyVerification={handleSaveMonthlyVerification}
                onExportExcel={handleExportExcel}
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
