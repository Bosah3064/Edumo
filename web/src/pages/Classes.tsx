import React, { useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { BookOpen, Plus, Users, Award, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const { currentSchool } = useTenant();

  const [classes, setClasses] = useState<ClassItem[]>([
    {
      id: 'cls-1',
      name: 'Grade 1',
      level: 'Lower Primary',
      streams: ['East', 'West'],
      classTeacher: 'Jane Muthoni',
      capacity: 60,
      enrolled: 48,
      learningAreas: ['Literacy', 'Mathematics', 'Environmental', 'Creative Arts'],
    },
    {
      id: 'cls-2',
      name: 'Grade 2',
      level: 'Lower Primary',
      streams: ['East'],
      classTeacher: 'Alice Wanjira',
      capacity: 40,
      enrolled: 35,
      learningAreas: ['Literacy', 'Mathematics', 'Environmental', 'Creative Arts'],
    },
    {
      id: 'cls-3',
      name: 'Grade 3',
      level: 'Lower Primary',
      streams: ['East', 'West'],
      classTeacher: 'Daniel Kiprotich',
      capacity: 60,
      enrolled: 52,
      learningAreas: ['English', 'Kiswahili', 'Mathematics', 'Science'],
    },
    {
      id: 'cls-4',
      name: 'Grade 4',
      level: 'Upper Primary (CBC)',
      streams: ['East', 'West'],
      classTeacher: 'Peter Kamau',
      capacity: 70,
      enrolled: 62,
      learningAreas: [
        'English',
        'Kiswahili',
        'Mathematics',
        'Science & Tech',
        'Agriculture',
        'Social Studies',
      ],
    },
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newLevel, setNewLevel] = useState('Upper Primary (CBC)');
  const [streamName, setStreamName] = useState('East');
  const [capacity, setCapacity] = useState('40');

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName) return;

    const newClass: ClassItem = {
      id: `cls-${Date.now()}`,
      name: newClassName,
      level: newLevel,
      streams: [streamName],
      classTeacher: 'Unassigned',
      capacity: parseInt(capacity) || 40,
      enrolled: 0,
      learningAreas: ['Core Subjects'],
    };

    setClasses((prev) => [...prev, newClass]);
    toast.success(`${newClassName} added to academic structure!`);
    setIsAddModalOpen(false);
    setNewClassName('');
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
            <Button type="submit" variant="primary">
              Create Class
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
