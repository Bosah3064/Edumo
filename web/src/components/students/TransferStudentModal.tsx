import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Building2, ArrowRight, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

interface StudentInfo {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  currentClassId?: string;
  gender?: string;
  boardingStatus?: 'day' | 'boarding';
  guardianPhone?: string;
  schoolEmail?: string;
}

interface SchoolBranch {
  id: string;
  name: string;
  code?: string;
}

interface TransferStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentInfo | null;
  orgId: string;
  currentSchoolId: string;
  availableSchools: SchoolBranch[];
  onTransferComplete?: () => void;
}

export const TransferStudentModal: React.FC<TransferStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  orgId,
  currentSchoolId,
  availableSchools,
  onTransferComplete,
}) => {
  const otherSchools = availableSchools.filter((s) => s.id !== currentSchoolId);
  const [targetSchoolId, setTargetSchoolId] = useState<string>(
    otherSchools[0]?.id || ''
  );
  const [reason, setReason] = useState('Relocation / Academic Stream Reassignment');
  const [transferring, setTransferring] = useState(false);

  if (!student) return null;

  const handleTransfer = async () => {
    if (!targetSchoolId) {
      toast.error('Please choose a destination campus');
      return;
    }

    const targetSchool = otherSchools.find((s) => s.id === targetSchoolId);
    if (!targetSchool) return;

    setTransferring(true);
    const toastId = toast.loading(`Transferring learner to ${targetSchool.name}...`);

    try {
      // 1. Create student document in target school
      const targetDocRef = doc(
        db,
        'organizations',
        orgId,
        'schools',
        targetSchoolId,
        'students',
        student.id
      );

      await setDoc(targetDocRef, {
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        currentClassId: student.currentClassId || 'Grade 4',
        gender: student.gender || 'unspecified',
        boardingStatus: student.boardingStatus || 'day',
        guardianPhone: student.guardianPhone || '',
        schoolEmail: student.schoolEmail || null,
        status: 'active',
        transferHistory: {
          transferredFromSchoolId: currentSchoolId,
          transferredAt: serverTimestamp(),
          reason,
        },
        createdAt: serverTimestamp(),
      });

      // 2. Mark original doc as transferred or remove from active branch
      const sourceDocRef = doc(
        db,
        'organizations',
        orgId,
        'schools',
        currentSchoolId,
        'students',
        student.id
      );
      await deleteDoc(sourceDocRef);

      toast.success(
        `Learner ${student.firstName} transferred to ${targetSchool.name} successfully!`,
        { id: toastId }
      );
      onClose();
      if (onTransferComplete) onTransferComplete();
    } catch (err) {
      console.error('Transfer error:', err);
      toast.error('Failed to transfer learner between branches', { id: toastId });
    } finally {
      setTransferring(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Inter-Branch Campus Transfer" maxWidth="lg">
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
          <Building2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">Inter-Branch Mobility (Master Spec Section 1 & 7.B):</span>{' '}
            Learner retains their academic identity, admission record, and history when transferred across group branches.
          </div>
        </div>

        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1">
          <div className="text-gray-500">Learner to Transfer:</div>
          <div className="font-bold text-gray-900 text-sm">
            {student.firstName} {student.lastName} ({student.admissionNumber})
          </div>
          <div className="text-gray-600">Current Class: {student.currentClassId || 'Grade 4'}</div>
        </div>

        {otherSchools.length === 0 ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>This organization currently has only 1 campus branch. Add another branch under <strong>Campuses</strong> to enable inter-branch transfers.</span>
          </div>
        ) : (
          <div className="space-y-3">
            <Select
              label="Destination Campus Branch"
              value={targetSchoolId}
              onChange={(e) => setTargetSchoolId(e.target.value)}
              options={otherSchools.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.code || 'CAMPUS'})`,
              }))}
            />

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reason for Campus Transfer
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <Button variant="ghost" onClick={onClose} disabled={transferring}>
            Cancel
          </Button>
          {otherSchools.length > 0 && (
            <Button
              variant="primary"
              onClick={handleTransfer}
              isLoading={transferring}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Confirm Transfer
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

