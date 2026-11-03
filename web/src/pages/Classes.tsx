import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { BookOpen, Plus, Users, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

interface ClassItem {
  id: string;
  name: string;
  level: string;
  streams: string[];
  classTeacher: string;
  capacity: number;
  enrolled: number;
  learningAreas: string[];
}

export const Classes: React.FC = () => {
  const { organization, currentSchool } = useTenant();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentCountsByClass, setStudentCountsByClass] = useState<Record<string, number>>({});

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newLevel, setNewLevel] = useState('Upper Primary (CBC)');
  const [streamName, setStreamName] = useState('East');
  const [capacity, setCapacity] = useState('40');
  const [saving, setSaving] = useState(false);

  // 1. Listen to students to compute enrollment per class
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const studentsRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'students'
    );

    const unsubStudents = onSnapshot(studentsRef, (snap) => {
      const counts: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const classId = d.data().currentClassId;
        if (classId) {
          counts[classId] = (counts[classId] || 0) + 1;
        }
      });
      setStudentCountsByClass(counts);
    });

    return () => unsubStudents();
  }, [organization, currentSchool]);

  // 2. Listen to real-time classes in Firestore
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const classesRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'classes'
    );

    const unsubClasses = onSnapshot(
      classesRef,
      (snap) => {
        const list: ClassItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || 'Unnamed Class',
            level: data.level || 'Primary',
            streams: data.streams || ['East'],
            classTeacher: data.classTeacher || 'Unassigned',
            capacity: Number(data.capacity) || 40,
            enrolled: studentCountsByClass[data.name] || studentCountsByClass[d.id] || 0,
            learningAreas: data.learningAreas || ['Core Subjects'],
          };
        });

        setClasses(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching classes:', err);
        setLoading(false);
      }
    );

    return () => unsubClasses();
  }, [organization, currentSchool, studentCountsByClass]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !organization || !currentSchool) return;

    setSaving(true);
    const toastId = toast.loading('Creating class stream...');

    try {
      const classId = newClassName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'classes',
        classId
      );

      await setDoc(docRef, {
        name: newClassName.trim(),
        level: newLevel,
        streams: streamName.trim() ? [streamName.trim()] : ['East'],
        classTeacher: 'Unassigned',
        capacity: parseInt(capacity) || 40,
        learningAreas: ['Core Subjects', 'Literacy', 'Mathematics'],
        createdAt: serverTimestamp(),
      });

      toast.success(`${newClassName} added to academic structure!`, { id: toastId });
      setIsAddModalOpen(false);
      setNewClassName('');
    } catch (err) {
      console.error('Error adding class:', err);
      toast.error('Failed to create class', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            Classes, Streams & Curriculum
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Academic structure for {currentSchool?.name || 'Main Campus'} (
            {currentSchool?.curriculumType || 'CBC'})
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add New Class
        </Button>
      </div>

      {/* Classes Grid */}
      {classes.length === 0 ? (
        <Card className="text-center py-12 text-gray-500">
          <Layers className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <h3 className="text-base font-semibold text-gray-900">No classes configured yet</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Set up your grade levels, streams, and curriculum structure for {currentSchool?.name}.
          </p>
          <div className="mt-4">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsAddModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add First Class
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classes.map((cls) => (
            <Card key={cls.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-500/15 border border-brand-500/25 flex items-center justify-center text-brand-700">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{cls.name}</h3>
                      <p className="text-2xs text-gray-500">{cls.level}</p>
                    </div>
                  </div>

                  <Badge variant="brand" size="sm">
                    {cls.enrolled} / {cls.capacity} Enrolled
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4 overflow-hidden">
                  <div
                    className="bg-brand-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (cls.enrolled / cls.capacity) * 100)}%` }}
                  />
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-700">
                    <span className="text-gray-600">Class Teacher:</span>
                    <span className="font-medium text-gray-900">{cls.classTeacher}</span>
                  </div>

                  <div className="flex justify-between text-gray-700">
                    <span className="text-gray-600">Active Streams:</span>
                    <div className="flex gap-1">
                      {cls.streams.map((stream) => (
                        <span
                          key={stream}
                          className="px-2 py-0.5 rounded-md bg-gray-100 text-brand-700 border border-surface-700/60 font-medium text-2xs"
                        >
                          {stream}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-2xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">
                      Learning Areas / Subjects ({cls.learningAreas.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {cls.learningAreas.map((subj) => (
                        <span
                          key={subj}
                          className="text-2xs px-2 py-0.5 rounded-md bg-white text-gray-700 border border-surface-800"
                        >
                          {subj}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-surface-800 flex justify-end gap-2">
                <Button size="sm" variant="outline">
                  Manage Streams
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Class Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Class to Academic Structure"
        description="Creates class level and default stream in this campus"
        maxWidth="md"
      >
        <form onSubmit={handleAddClass} className="space-y-4 mt-2">
          <Input
            label="Class Name"
            placeholder="e.g. Grade 7 (Junior School)"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            required
          />

          <Select
            label="Curriculum Level"
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value)}
            options={[
              { label: 'Lower Primary (PP1 - Grade 3)', value: 'Lower Primary' },
              { label: 'Upper Primary (Grade 4 - 6)', value: 'Upper Primary (CBC)' },
              { label: 'Junior School (Grade 7 - 9)', value: 'Junior School' },
              { label: 'Senior Secondary', value: 'Senior Secondary' },
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Default Stream"
              placeholder="e.g. East"
              value={streamName}
              onChange={(e) => setStreamName(e.target.value)}
            />
            <Input
              label="Max Learner Capacity"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-surface-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Create Class
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
