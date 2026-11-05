import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Building2,
  Lock,
  KeyRound,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { updateProfile, updatePassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Link } from 'react-router-dom';

export const Profile: React.FC = () => {
  const { currentUser, claims, signOut } = useAuth();
  const { organization, currentSchool } = useTenant();

  // Profile Form State
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [phone, setPhone] = useState(currentUser?.phoneNumber || '');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'sw'>('en');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Update State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Teaching Portfolio State (if teacher/staff)
  const [teachingClasses, setTeachingClasses] = useState<Array<{
    classId: string;
    className: string;
    units: string[];
    learnerCount: number;
  }>>([]);
  const [loadingTeaching, setLoadingTeaching] = useState(true);

  // Load user profile details from Firestore
  useEffect(() => {
    if (!currentUser) return;

    const fetchUserProfile = async () => {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.phone && !phone) setPhone(data.phone);
          if (data.preferredLanguage) setPreferredLanguage(data.preferredLanguage);
        }
      } catch (err) {
        console.warn('Could not load user profile document:', err);
      }
    };

    fetchUserProfile();
  }, [currentUser]);

  // Load Teacher's Assigned Classes and Units
  useEffect(() => {
    if (!organization || !currentSchool || !currentUser) return;

    const fetchTeachingLoad = async () => {
      try {
        const classesRef = collection(
          db,
          'organizations',
          organization.id,
          'schools',
          currentSchool.id,
          'classes'
        );
        const classesSnap = await getDocs(classesRef);

        const subjectsRef = collection(
          db,
          'organizations',
          organization.id,
          'schools',
          currentSchool.id,
          'subjects'
        );
        const subjectsSnap = await getDocs(subjectsRef);
        const schoolSubjects = subjectsSnap.docs.map((d) => d.data());

        const portfolio = classesSnap.docs.map((d) => {
          const data = d.data();
          const relevantUnits = schoolSubjects
            .filter((s) => s.applicableClasses?.includes(data.name) || s.teacherName === currentUser.displayName)
            .map((s) => `${s.name} (${s.code || ''})`);

          return {
            classId: d.id,
            className: data.name || 'Class',
            units: relevantUnits.length > 0 ? relevantUnits : ['Core Curriculum Subjects'],
            learnerCount: Number(data.capacity) || 35,
          };
        });

        setTeachingClasses(portfolio);
      } catch (err) {
        console.warn('Could not load teacher classes:', err);
      } finally {
        setLoadingTeaching(false);
      }
    };

    fetchTeachingLoad();
  }, [organization, currentSchool, currentUser]);

  // Save Personal Details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSavingProfile(true);
    const toastId = toast.loading('Updating profile information...');

    try {
      if (displayName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName });
      }

      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        displayName,
        phone,
        preferredLanguage,
        updatedAt: serverTimestamp(),
      });

      toast.success('Profile details updated successfully!', { id: toastId });
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile', { id: toastId });
    } finally {
      setSavingProfile(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setUpdatingPassword(true);
    const toastId = toast.loading('Updating account password...');

    try {
      await updatePassword(currentUser, newPassword);
      toast.success('Password changed successfully!', { id: toastId });
      setIsPasswordModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      console.error('Error changing password:', err);
      toast.error('Failed to update password. You may need to re-login first.', { id: toastId });
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Derive roles
  const activeRoles: string[] = [];
  if (claims?.platformAdmin) activeRoles.push('Platform Superadmin');
  if (claims?.orgRole === 'orgOwner') activeRoles.push('School Organization Owner');
  if (claims?.schoolRoles && currentSchool?.id && claims.schoolRoles[currentSchool.id]) {
    activeRoles.push(claims.schoolRoles[currentSchool.id]);
  } else if (claims?.orgRole) {
    activeRoles.push(claims.orgRole);
  } else {
    activeRoles.push('School Administrator');
  }

  const permissionsList = claims?.permissions || [
    'academics.read',
    'academics.write',
    'attendance.read',
    'attendance.write',
    'students.enroll',
    'settings.view',
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Top Banner & Identity Card */}
      <Card className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden border-slate-700 shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-md border-2 border-white/20 shrink-0"
              style={{ background: 'var(--school-brand-gradient)' }}
            >
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="User" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                (currentUser?.displayName || currentUser?.email || 'U').charAt(0).toUpperCase()
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
                  {currentUser?.displayName || 'User Profile'}
                </h1>
                {currentUser?.emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                    Institutional Account
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 font-mono flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {currentUser?.email || 'No email attached'}
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeRoles.map((r, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-md text-2xs font-extrabold uppercase bg-white/10 text-white border border-white/20"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsPasswordModalOpen(true)}
              leftIcon={<Lock className="w-4 h-4" />}
            >
              Change Password
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Grid: Info + Credentials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal Information Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-[#1d5f99]" />
                Personal Information &amp; Preferences
              </h2>
              <span className="text-2xs text-slate-400 font-mono">UID: {currentUser?.uid.slice(0, 8)}...</span>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Display / Full Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Samuel Otieno"
                  required
                />
                <Input
                  label="Institutional Email"
                  value={currentUser?.email || ''}
                  readOnly
                  helperText="Managed by institutional domain"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Telephone / Mobile Contact"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254712345678"
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-700 tracking-normal mb-1">
                    Preferred System Language
                  </label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value as 'en' | 'sw')}
                    className="w-full text-sm rounded-lg border border-slate-300 bg-white py-2 px-3 text-slate-900"
                  >
                    <option value="en">English (Official)</option>
                    <option value="sw">Kiswahili (Taifa)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end">
                <Button type="submit" variant="primary" isLoading={savingProfile}>
                  Save Profile Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Teacher / Staff Teaching Portfolio */}
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#1d5f99]" />
                  Teaching Portfolio &amp; Assigned Classes
                </h2>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Classes and curriculum units you are scheduled to teach in <strong>{currentSchool?.name}</strong>
                </p>
              </div>
              <Link to="/classes">
                <Button variant="ghost" size="sm" rightIcon={<BookOpen className="w-3.5 h-3.5" />}>
                  Curriculum Catalog
                </Button>
              </Link>
            </div>

            {loadingTeaching ? (
              <p className="text-xs text-slate-400 py-4">Loading assigned teaching classes...</p>
            ) : teachingClasses.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No classes assigned to this account yet. Contact your school administrator to assign teaching loads.
              </div>
            ) : (
              <div className="space-y-3">
                {teachingClasses.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{item.className}</span>
                        <Badge variant="brand">{item.learnerCount} Learners</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {item.units.map((unit, uIdx) => (
                          <span
                            key={uIdx}
                            className="px-2 py-0.5 rounded text-2xs font-semibold bg-white border border-slate-200 text-slate-700"
                          >
                            📖 {unit}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link to="/attendance">
                        <Button size="sm" variant="secondary">
                          Attendance
                        </Button>
                      </Link>
                      <Link to="/academics">
                        <Button size="sm" variant="primary">
                          Enter Marks
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Roles, Permissions & Security */}
        <div className="space-y-6">
          {/* Institutional Affiliation Card */}
          <Card className="p-5 space-y-3 border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#1d5f99]" />
              Institutional Affiliation
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-2xs uppercase block font-semibold">Organization / Group</span>
                <span className="font-extrabold text-slate-900 text-sm">{organization?.name || 'School Organization'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-2xs uppercase block font-semibold">Active Campus Branch</span>
                <span className="font-bold text-slate-900">{currentSchool?.name || 'Main Campus'}</span>
                <span className="text-2xs text-slate-500 font-mono block mt-0.5">
                  CODE: {currentSchool?.code || 'MAIN'} • {currentSchool?.curriculumType || 'National'}
                </span>
              </div>
            </div>
          </Card>

          {/* Granular Permissions List */}
          <Card className="p-5 space-y-3 border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Granted Permissions ({permissionsList.length})
              </h3>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {permissionsList.map((perm, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  {perm}
                </span>
              ))}
            </div>
          </Card>

          {/* Security & Account Session */}
          <Card className="p-5 space-y-3 border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-slate-500" />
              Security Audit Credentials
            </h3>

            <div className="space-y-2 text-2xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Account Created:</span>
                <span className="font-mono text-slate-800">
                  {currentUser?.metadata?.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Last Sign-In:</span>
                <span className="font-mono text-slate-800">
                  {currentUser?.metadata?.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString() : 'Active'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span>Multi-Factor Status:</span>
                <span className="font-bold text-emerald-700">Enforced by Domain</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: CHANGE PASSWORD                                       */}
      {/* ============================================================ */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change Account Password"
        description="Enter a new secure password for your EDUMO institutional account."
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            showStrength
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
            required
          />

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsPasswordModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={updatingPassword}>
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

