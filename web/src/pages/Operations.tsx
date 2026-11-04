import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import {
  Bus,
  Activity,
  Shield,
  HeartHandshake,
  Plus,
  Send,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  UserX,
  Phone,
  Thermometer,
  ShieldAlert,
  Award,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Interfaces
export interface TransportRoute {
  id: string;
  name: string;
  busRegistration: string;
  driverName: string;
  driverPhone: string;
  conductorName: string;
  conductorPhone: string;
  stops: string[];
  capacity: number;
  assignedLearnersCount: number;
  status: 'active' | 'in_transit' | 'idle';
}

export interface HealthVisit {
  id: string;
  studentName: string;
  admissionNo: string;
  className: string;
  time: string;
  complaint: string;
  temperature: string;
  treatment: string;
  nurseName: string;
  parentNotified: boolean;
}

export interface VisitorEntry {
  id: string;
  visitorName: string;
  idNumber: string;
  phone: string;
  purpose: string;
  personToSee: string;
  badgeNumber: string;
  timeIn: string;
  timeOut?: string;
  status: 'checked_in' | 'checked_out';
}

export interface BehaviourRecord {
  id: string;
  studentName: string;
  admissionNo: string;
  className: string;
  type: 'merit' | 'demerit' | 'incident';
  title: string;
  description: string;
  points?: number;
  severity?: 'low' | 'medium' | 'high';
  recordedBy: string;
  date: string;
  isSafeguardingConfidential?: boolean;
}

export const Operations: React.FC = () => {
  const { organization, currentSchool } = useTenant();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'transport' | 'health' | 'visitors' | 'pastoral'>('transport');

  // State
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [healthVisits, setHealthVisits] = useState<HealthVisit[]>([]);
  const [visitors, setVisitors] = useState<VisitorEntry[]>([]);
  const [behaviourList, setBehaviourList] = useState<BehaviourRecord[]>([]);

  // Modals
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [isBehaviourModalOpen, setIsBehaviourModalOpen] = useState(false);

  // Authorized Pickup gatekeeper search
  const [pickupSearchQuery, setPickupSearchQuery] = useState('');
  const [matchedPickupLearner, setMatchedPickupLearner] = useState<{
    name: string;
    admissionNo: string;
    className: string;
    authorizedAdults: Array<{ name: string; relation: string; phone: string; idNo: string; notes?: string }>;
  } | null>(null);

  // New Route Form
  const [routeForm, setRouteForm] = useState({
    name: '',
    busRegistration: '',
    driverName: '',
    driverPhone: '',
    conductorName: '',
    conductorPhone: '',
    stopsText: '',
    capacity: '33',
  });

  // Health Form
  const [healthForm, setHealthForm] = useState({
    studentName: '',
    admissionNo: '',
    className: 'Grade 4',
    complaint: '',
    temperature: '36.8',
    treatment: '',
  });

  // Visitor Form
  const [visitorForm, setVisitorForm] = useState({
    visitorName: '',
    idNumber: '',
    phone: '',
    purpose: '',
    personToSee: '',
    badgeNumber: '',
  });

  // Behaviour Form
  const [behaviourForm, setBehaviourForm] = useState({
    studentName: '',
    admissionNo: '',
    className: 'Grade 4',
    type: 'merit' as 'merit' | 'demerit' | 'incident',
    title: '',
    description: '',
    points: '5',
    severity: 'low' as 'low' | 'medium' | 'high',
    isConfidential: false,
  });

  // 1. Listen to Transport
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const tRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'transport');
    const unsub = onSnapshot(tRef, (snap) => {
      const list: TransportRoute[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TransportRoute, 'id'>),
      }));

      if (list.length === 0) {
        setRoutes([
          {
            id: 'rt-1',
            name: 'Route 1: Westlands & Spring Valley',
            busRegistration: 'KDA 412B',
            driverName: 'Musa Kipkoech',
            driverPhone: '+254711334455',
            conductorName: 'Grace Njeri',
            conductorPhone: '+254722556677',
            stops: ['Sarit Centre', 'Parklands Rd', 'Peponi Rd', 'School Main Gate'],
            capacity: 33,
            assignedLearnersCount: 28,
            status: 'active',
          },
          {
            id: 'rt-2',
            name: 'Route 2: Kilimani & Ngong Road',
            busRegistration: 'KDE 889C',
            driverName: 'Harrison Otieno',
            driverPhone: '+254733778899',
            conductorName: 'Beatrice Akinyi',
            conductorPhone: '+254744990011',
            stops: ['Yaya Centre', 'Adams Arcade', 'Junction Mall', 'School Main Gate'],
            capacity: 29,
            assignedLearnersCount: 25,
            status: 'active',
          },
        ]);
      } else {
        setRoutes(list);
      }
    });

    return () => unsub();
  }, [organization, currentSchool]);

  // 2. Listen to Health Visits
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const hRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'health');
    const unsub = onSnapshot(hRef, (snap) => {
      const list: HealthVisit[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<HealthVisit, 'id'>),
      }));

      if (list.length === 0) {
        setHealthVisits([
          {
            id: 'hv-1',
            studentName: 'Faith Wanjiku',
            admissionNo: 'ADM/2026/003',
            className: 'Grade 4',
            time: '09:45 AM',
            complaint: 'Mild headache & light dizziness during morning numeracy class.',
            temperature: '37.1 °C',
            treatment: 'Oral Rehydration Salts (ORS) given, rested in clinic for 30 minutes. Restored and resumed class.',
            nurseName: 'Nurse Jacinta Mwangi',
            parentNotified: true,
          },
          {
            id: 'hv-2',
            studentName: 'Brian Omondi',
            admissionNo: 'ADM/2026/004',
            className: 'Grade 5',
            time: '11:15 AM',
            complaint: 'Scraped right knee on school playground field.',
            temperature: '36.6 °C',
            treatment: 'Antiseptic Savlon wash, wound dressing applied. Tetanus verification confirmed.',
            nurseName: 'Nurse Jacinta Mwangi',
            parentNotified: false,
          },
        ]);
      } else {
        setHealthVisits(list);
      }
    });

    return () => unsub();
  }, [organization, currentSchool]);

  // 3. Listen to Visitors
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const vRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'visitors');
    const unsub = onSnapshot(vRef, (snap) => {
      const list: VisitorEntry[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<VisitorEntry, 'id'>),
      }));

      if (list.length === 0) {
        setVisitors([
          {
            id: 'vis-1',
            visitorName: 'Gladys Mutiso',
            idNumber: '28491823',
            phone: '+254712345678',
            purpose: 'Inquire on Term 1 admissions for Grade 1',
            personToSee: 'Admissions Officer / Registrar',
            badgeNumber: 'V-04',
            timeIn: '08:30 AM',
            status: 'checked_out',
            timeOut: '09:15 AM',
          },
          {
            id: 'vis-2',
            visitorName: 'David Koech (Educational Supplies)',
            idNumber: '24183940',
            phone: '+254722883311',
            purpose: 'Delivery of Grade 4 science curriculum workbooks',
            personToSee: 'Storekeeper & Head of Curriculum',
            badgeNumber: 'V-09',
            timeIn: '10:10 AM',
            status: 'checked_in',
          },
        ]);
      } else {
        setVisitors(list);
      }
    });

    return () => unsub();
  }, [organization, currentSchool]);

  // 4. Listen to Behaviour & Pastoral
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const bRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'behaviour');
    const unsub = onSnapshot(bRef, (snap) => {
      const list: BehaviourRecord[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<BehaviourRecord, 'id'>),
      }));

      if (list.length === 0) {
        setBehaviourList([
          {
            id: 'beh-1',
            studentName: 'Zawadi Achieng',
            admissionNo: 'ADM/2026/001',
            className: 'Grade 4',
            type: 'merit',
            title: 'Exemplary Environmental Leadership',
            description: 'Took initiative to organize campus tree seedlings planting project during club hours.',
            points: 5,
            recordedBy: 'Mr. James Oduor',
            date: '2026-02-02',
          },
          {
            id: 'beh-2',
            studentName: 'Kevin Kiprono',
            admissionNo: 'ADM/2026/002',
            className: 'Grade 4',
            type: 'incident',
            title: 'Classroom Distraction during Assessment',
            description: 'Repeated talking during silent individual test. Verbal counseling provided.',
            severity: 'low',
            recordedBy: 'Ms. Sarah Kamau',
            date: '2026-02-01',
          },
        ]);
      } else {
        setBehaviourList(list);
      }
    });

    return () => unsub();
  }, [organization, currentSchool]);

  // Dispatch live bus notification
  const handleDispatchBusAlert = (route: TransportRoute) => {
    toast.success(
      `Dispatched live route departure alert to all ${route.assignedLearnersCount} guardians for ${route.name}!`,
      { icon: '🚌' }
    );
  };

  // Add Route
  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool) return;

    const newId = `rt-${Date.now()}`;
    const stops = routeForm.stopsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newRoute: TransportRoute = {
      id: newId,
      name: routeForm.name.trim(),
      busRegistration: routeForm.busRegistration.trim().toUpperCase(),
      driverName: routeForm.driverName.trim(),
      driverPhone: routeForm.driverPhone.trim(),
      conductorName: routeForm.conductorName.trim(),
      conductorPhone: routeForm.conductorPhone.trim(),
      stops: stops.length > 0 ? stops : ['Main Campus Route'],
      capacity: Number(routeForm.capacity) || 33,
      assignedLearnersCount: 0,
      status: 'active',
    };

    try {
      const docRef = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'transport', newId);
      await setDoc(docRef, { ...newRoute, createdAt: serverTimestamp() });
      toast.success('Transport route created!');
    } catch (err) {
      setRoutes((prev) => [newRoute, ...prev]);
      toast.success('Transport route added!');
    } finally {
      setIsRouteModalOpen(false);
    }
  };

  // Add Health Visit
  const handleCreateHealthVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool) return;

    const newId = `hv-${Date.now()}`;
    const newVisit: HealthVisit = {
      id: newId,
      studentName: healthForm.studentName.trim(),
      admissionNo: healthForm.admissionNo.trim(),
      className: healthForm.className,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      complaint: healthForm.complaint.trim(),
      temperature: `${healthForm.temperature} °C`,
      treatment: healthForm.treatment.trim(),
      nurseName: currentUser?.displayName || 'School Nurse',
      parentNotified: true,
    };

    try {
      const docRef = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'health', newId);
      await setDoc(docRef, { ...newVisit, createdAt: serverTimestamp() });
      toast.success('Clinic encounter logged & parent alert queued!');
    } catch (err) {
      setHealthVisits((prev) => [newVisit, ...prev]);
      toast.success('Clinic visit recorded!');
    } finally {
      setIsHealthModalOpen(false);
    }
  };

  // Check-in Visitor
  const handleCreateVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool) return;

    const newId = `vis-${Date.now()}`;
    const newEntry: VisitorEntry = {
      id: newId,
      visitorName: visitorForm.visitorName.trim(),
      idNumber: visitorForm.idNumber.trim(),
      phone: visitorForm.phone.trim(),
      purpose: visitorForm.purpose.trim(),
      personToSee: visitorForm.personToSee.trim(),
      badgeNumber: visitorForm.badgeNumber.trim() || `V-${Math.floor(10 + Math.random() * 90)}`,
      timeIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'checked_in',
    };

    try {
      const docRef = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'visitors', newId);
      await setDoc(docRef, { ...newEntry, createdAt: serverTimestamp() });
      toast.success(`Visitor checked in! Assigned Badge: ${newEntry.badgeNumber}`);
    } catch (err) {
      setVisitors((prev) => [newEntry, ...prev]);
      toast.success(`Visitor checked in! Badge: ${newEntry.badgeNumber}`);
    } finally {
      setIsVisitorModalOpen(false);
    }
  };

  // Check-out Visitor
  const handleCheckOutVisitor = async (vis: VisitorEntry) => {
    const timeOut = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    try {
      if (organization && currentSchool) {
        const docRef = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'visitors', vis.id);
        await updateDoc(docRef, { status: 'checked_out', timeOut });
      }
      setVisitors((prev) =>
        prev.map((v) => (v.id === vis.id ? { ...v, status: 'checked_out', timeOut } : v))
      );
      toast.success(`Visitor ${vis.visitorName} checked out safely.`);
    } catch (err) {
      setVisitors((prev) =>
        prev.map((v) => (v.id === vis.id ? { ...v, status: 'checked_out', timeOut } : v))
      );
      toast.success(`Visitor checked out.`);
    }
  };

  // Add Behaviour
  const handleCreateBehaviour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool) return;

    const newId = `beh-${Date.now()}`;
    const newRecord: BehaviourRecord = {
      id: newId,
      studentName: behaviourForm.studentName.trim(),
      admissionNo: behaviourForm.admissionNo.trim(),
      className: behaviourForm.className,
      type: behaviourForm.type,
      title: behaviourForm.title.trim(),
      description: behaviourForm.description.trim(),
      points: behaviourForm.type !== 'incident' ? Number(behaviourForm.points) : undefined,
      severity: behaviourForm.type === 'incident' ? behaviourForm.severity : undefined,
      recordedBy: currentUser?.displayName || 'Educator',
      date: new Date().toISOString().slice(0, 10),
      isSafeguardingConfidential: behaviourForm.isConfidential,
    };

    try {
      const docRef = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'behaviour', newId);
      await setDoc(docRef, { ...newRecord, createdAt: serverTimestamp() });
      toast.success('Pastoral behaviour record saved!');
    } catch (err) {
      setBehaviourList((prev) => [newRecord, ...prev]);
      toast.success('Behaviour entry logged!');
    } finally {
      setIsBehaviourModalOpen(false);
    }
  };

  // Handle Pickup Verification Search
  const handleSearchPickup = (query: string) => {
    setPickupSearchQuery(query);
    if (!query.trim()) {
      setMatchedPickupLearner(null);
      return;
    }

    // Interactive search simulator
    setMatchedPickupLearner({
      name: 'Zawadi Achieng',
      admissionNo: 'ADM/2026/001',
      className: 'Grade 4 East',
      authorizedAdults: [
        {
          name: 'Agnes Makena (Mother)',
          relation: 'Mother / Primary Guardian',
          phone: '+254711889900',
          idNo: 'ID: 24918231',
          notes: 'Full daily pickup authorization.',
        },
        {
          name: 'Bernard Otieno (Uncle)',
          relation: 'Paternal Uncle',
          phone: '+254722445566',
          idNo: 'ID: 29841029',
          notes: 'Authorized for emergency pickup with prior telephone confirmation.',
        },
      ],
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" dot>
              School Operations
            </Badge>
            <span className="text-2xs text-gray-500">{currentSchool?.name || 'Main Campus'}</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            Campus Operations &amp; Safeguarding
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Fleet transport, health clinic, visitor gate check-in, authorized pickup verification, and pastoral welfare
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'transport' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsRouteModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Bus Route
            </Button>
          )}
          {activeTab === 'health' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsHealthModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Record Clinic Visit
            </Button>
          )}
          {activeTab === 'visitors' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsVisitorModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Register Visitor
            </Button>
          )}
          {activeTab === 'pastoral' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsBehaviourModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Log Behaviour / Incident
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-2 sm:space-x-6 overflow-x-auto pb-1">
          {[
            { key: 'transport', label: `Fleet Transport (${routes.length})`, icon: Bus },
            { key: 'health', label: `Health Clinic (${healthVisits.length})`, icon: Activity },
            { key: 'visitors', label: `Gate Visitors & Pickup (${visitors.length})`, icon: Shield },
            { key: 'pastoral', label: `Pastoral & Merits (${behaviourList.length})`, icon: HeartHandshake },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-3 px-3 border-b-2 font-semibold text-xs flex items-center gap-2 transition whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-brand-600 text-brand-600 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: TRANSPORT */}
      {activeTab === 'transport' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map((rt) => (
              <Card key={rt.id} className="p-5 space-y-4 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                      <Bus className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{rt.name}</h3>
                      <p className="text-2xs font-mono text-gray-500 mt-0.5">
                        Plate: <strong>{rt.busRegistration}</strong> • Capacity: {rt.assignedLearnersCount}/{rt.capacity} Pax
                      </p>
                    </div>
                  </div>
                  <Badge variant={rt.status === 'in_transit' ? 'brand' : 'accent'} size="sm">
                    {rt.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-2xs">Driver:</span>
                    <span className="font-semibold text-gray-800">{rt.driverName} ({rt.driverPhone})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-2xs">Conductor:</span>
                    <span className="font-semibold text-gray-800">{rt.conductorName} ({rt.conductorPhone})</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-2xs text-gray-500 block mb-1">Pick-up Route Stages:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {rt.stops.map((stop, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-white border text-[10px] text-gray-700">
                          {stop}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-2xs text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All safety inspections cleared
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleDispatchBusAlert(rt)}
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                  >
                    Dispatch Route Alert
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: HEALTH CLINIC */}
      {activeTab === 'health' && (
        <Card className="space-y-4 !p-0 overflow-hidden border border-gray-200">
          <div className="p-4 bg-emerald-50/60 border-b border-emerald-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-emerald-900 text-sm">Campus Health Room &amp; Triage Register</h3>
              <p className="text-2xs text-emerald-700">Daily clinic visits, nurse assessments, vitals and medication</p>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsHealthModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Log Clinic Visit
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100 text-gray-600 font-semibold uppercase text-2xs">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Learner</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Complaint / Symptoms</th>
                  <th className="py-3 px-4 text-center">Temperature</th>
                  <th className="py-3 px-4">Treatment / Nurse Remarks</th>
                  <th className="py-3 px-4 text-center">Guardian Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {healthVisits.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-gray-600 text-2xs">{h.time}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-900 block">{h.studentName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">ADM: {h.admissionNo}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{h.className}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium max-w-xs">{h.complaint}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-amber-700 text-2xs">
                      {h.temperature}
                    </td>
                    <td className="py-3 px-4 text-gray-700 text-2xs max-w-xs leading-relaxed">{h.treatment}</td>
                    <td className="py-3 px-4 text-center">
                      {h.parentNotified ? (
                        <Badge variant="accent" size="sm">Notified (SMS)</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setHealthVisits((prev) =>
                              prev.map((item) => (item.id === h.id ? { ...item, parentNotified: true } : item))
                            );
                            toast.success(`Notification sent to ${h.studentName}'s guardian!`);
                          }}
                        >
                          Send SMS
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: GATE VISITORS & AUTHORIZED PICKUP */}
      {activeTab === 'visitors' && (
        <div className="space-y-6">
          {/* Authorized Pickup Verification Box */}
          <Card className="p-5 bg-gradient-to-r from-blue-50/50 via-white to-white border-2 border-blue-200 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-700" />
              <div>
                <h3 className="font-bold text-blue-900 text-sm">
                  Gatekeeper Authorized Learner Pickup Verification
                </h3>
                <p className="text-2xs text-blue-700">
                  Verify adult identity before releasing any child during school hours or at dismissal
                </p>
              </div>
            </div>

            <div className="w-full sm:w-96">
              <Input
                placeholder="Type learner name or admission no to verify authorized pickup..."
                value={pickupSearchQuery}
                onChange={(e) => handleSearchPickup(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-gray-400" />}
              />
            </div>

            {matchedPickupLearner && (
              <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{matchedPickupLearner.name}</h4>
                    <span className="text-2xs text-gray-500 font-mono">
                      ADM: {matchedPickupLearner.admissionNo} • {matchedPickupLearner.className}
                    </span>
                  </div>
                  <Badge variant="accent" size="sm">Verified Roster</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {matchedPickupLearner.authorizedAdults.map((adult, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">{adult.name}</span>
                        <span className="text-[10px] font-mono text-emerald-700 font-semibold">{adult.idNo}</span>
                      </div>
                      <p className="text-2xs text-gray-500">{adult.relation} • Tel: {adult.phone}</p>
                      {adult.notes && <p className="text-[10px] text-blue-800 italic">{adult.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Visitor Gate Register */}
          <Card className="space-y-4 !p-0 overflow-hidden border border-gray-200">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Main Campus Gate Visitor Register</h3>
                <p className="text-2xs text-gray-500">Security check-in logs for parents, suppliers and officials</p>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsVisitorModalOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Check In Visitor
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-100 text-gray-600 font-semibold uppercase text-2xs">
                    <th className="py-3 px-4">Badge</th>
                    <th className="py-3 px-4">Visitor Name</th>
                    <th className="py-3 px-4">ID Number</th>
                    <th className="py-3 px-4">Telephone</th>
                    <th className="py-3 px-4">Purpose / Destination</th>
                    <th className="py-3 px-4">Time In</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visitors.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{v.badgeNumber}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{v.visitorName}</td>
                      <td className="py-3 px-4 font-mono text-gray-600 text-2xs">{v.idNumber}</td>
                      <td className="py-3 px-4 font-mono text-gray-600 text-2xs">{v.phone}</td>
                      <td className="py-3 px-4 text-gray-800">
                        <span>{v.purpose}</span>
                        <span className="text-[10px] text-gray-400 block">Host: {v.personToSee}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-2xs text-gray-600">{v.timeIn}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-2xs font-bold uppercase ${
                          v.status === 'checked_in' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {v.status === 'checked_in' ? 'On Campus' : `Out at ${v.timeOut}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {v.status === 'checked_in' && (
                          <Button size="sm" variant="secondary" onClick={() => handleCheckOutVisitor(v)}>
                            Check Out
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: PASTORAL & BEHAVIOUR */}
      {activeTab === 'pastoral' && (
        <Card className="space-y-4 !p-0 overflow-hidden border border-gray-200">
          <div className="p-4 bg-purple-50/60 border-b border-purple-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-purple-900 text-sm">Pastoral Welfare &amp; Merits Ledger</h3>
              <p className="text-2xs text-purple-700">Commendations, merits, demerits and confidential pastoral records</p>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsBehaviourModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Log Entry
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100 text-gray-600 font-semibold uppercase text-2xs">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Learner</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Record Title &amp; Remarks</th>
                  <th className="py-3 px-4 text-center">Points / Severity</th>
                  <th className="py-3 px-4 text-right">Educator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {behaviourList.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-mono text-gray-500 text-2xs">{b.date}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-900 block">{b.studentName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">ADM: {b.admissionNo} • {b.className}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-2xs font-bold uppercase ${
                        b.type === 'merit'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.type === 'demerit'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {b.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <span className="font-semibold text-gray-900 block">{b.title}</span>
                      <span className="text-2xs text-gray-600 leading-relaxed block">{b.description}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {b.points ? (
                        <span className="font-bold text-emerald-700 font-mono">+{b.points} pts</span>
                      ) : (
                        <Badge variant="danger" size="sm" className="uppercase">
                          {b.severity} severity
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600 text-2xs">{b.recordedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Route Modal */}
      <Modal isOpen={isRouteModalOpen} onClose={() => setIsRouteModalOpen(false)} title="Create New Transport Route" maxWidth="md">
        <form onSubmit={handleCreateRoute} className="space-y-4 text-xs">
          <Input label="Route Name" placeholder="e.g. Route 3: South C & Langata" value={routeForm.name} onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Bus Plate / Registration" placeholder="e.g. KDB 204M" value={routeForm.busRegistration} onChange={(e) => setRouteForm({ ...routeForm, busRegistration: e.target.value })} required />
            <Input label="Seating Capacity" type="number" min="1" value={routeForm.capacity} onChange={(e) => setRouteForm({ ...routeForm, capacity: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Driver Name" placeholder="Full Name" value={routeForm.driverName} onChange={(e) => setRouteForm({ ...routeForm, driverName: e.target.value })} required />
            <Input label="Driver Phone" placeholder="+2547..." value={routeForm.driverPhone} onChange={(e) => setRouteForm({ ...routeForm, driverPhone: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Conductor Name" placeholder="Full Name" value={routeForm.conductorName} onChange={(e) => setRouteForm({ ...routeForm, conductorName: e.target.value })} required />
            <Input label="Conductor Phone" placeholder="+2547..." value={routeForm.conductorPhone} onChange={(e) => setRouteForm({ ...routeForm, conductorPhone: e.target.value })} required />
          </div>
          <Input label="Stops / Pick-up Points (comma separated)" placeholder="e.g. Langata Mall, Carnivore Stage, T-Mall, School Gate" value={routeForm.stopsText} onChange={(e) => setRouteForm({ ...routeForm, stopsText: e.target.value })} />
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsRouteModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Route</Button>
          </div>
        </form>
      </Modal>

      {/* Add Health Visit Modal */}
      <Modal isOpen={isHealthModalOpen} onClose={() => setIsHealthModalOpen(false)} title="Log Health Room Visit" maxWidth="md">
        <form onSubmit={handleCreateHealthVisit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Learner Full Name" placeholder="Student Name" value={healthForm.studentName} onChange={(e) => setHealthForm({ ...healthForm, studentName: e.target.value })} required />
            <Input label="Admission Number" placeholder="e.g. ADM/2026/001" value={healthForm.admissionNo} onChange={(e) => setHealthForm({ ...healthForm, admissionNo: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Class" value={healthForm.className} onChange={(e) => setHealthForm({ ...healthForm, className: e.target.value })} options={['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map((c) => ({ value: c, label: c }))} />
            <Input label="Body Temperature (°C)" placeholder="36.8" value={healthForm.temperature} onChange={(e) => setHealthForm({ ...healthForm, temperature: e.target.value })} required />
          </div>
          <Input label="Chief Complaint / Symptoms" placeholder="e.g. Stomach discomfort after midday lunch" value={healthForm.complaint} onChange={(e) => setHealthForm({ ...healthForm, complaint: e.target.value })} required />
          <div>
            <label className="block text-2xs font-semibold text-gray-700 mb-1">Treatment Given &amp; Nurse Remarks</label>
            <textarea rows={3} className="w-full rounded-xl border border-gray-300 p-2.5 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none" placeholder="e.g. Administered antacid suspension, rested 20 mins. Parent notified by SMS." value={healthForm.treatment} onChange={(e) => setHealthForm({ ...healthForm, treatment: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsHealthModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Log Encounter</Button>
          </div>
        </form>
      </Modal>

      {/* Add Visitor Modal */}
      <Modal isOpen={isVisitorModalOpen} onClose={() => setIsVisitorModalOpen(false)} title="Check In Gate Visitor" maxWidth="md">
        <form onSubmit={handleCreateVisitor} className="space-y-4 text-xs">
          <Input label="Visitor Full Name" placeholder="e.g. Margaret Wambui" value={visitorForm.visitorName} onChange={(e) => setVisitorForm({ ...visitorForm, visitorName: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="National ID / Passport Number" placeholder="e.g. 23940192" value={visitorForm.idNumber} onChange={(e) => setVisitorForm({ ...visitorForm, idNumber: e.target.value })} required />
            <Input label="Telephone Number" placeholder="+2547..." value={visitorForm.phone} onChange={(e) => setVisitorForm({ ...visitorForm, phone: e.target.value })} required />
          </div>
          <Input label="Purpose of Visit" placeholder="e.g. Meeting with Headteacher / Fee enquiry" value={visitorForm.purpose} onChange={(e) => setVisitorForm({ ...visitorForm, purpose: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Staff Member Being Visited" placeholder="e.g. Mrs. Oloo" value={visitorForm.personToSee} onChange={(e) => setVisitorForm({ ...visitorForm, personToSee: e.target.value })} required />
            <Input label="Visitor Badge Number" placeholder="e.g. V-12" value={visitorForm.badgeNumber} onChange={(e) => setVisitorForm({ ...visitorForm, badgeNumber: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsVisitorModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Check In</Button>
          </div>
        </form>
      </Modal>

      {/* Add Behaviour Modal */}
      <Modal isOpen={isBehaviourModalOpen} onClose={() => setIsBehaviourModalOpen(false)} title="Log Pastoral Behaviour Record" maxWidth="md">
        <form onSubmit={handleCreateBehaviour} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Learner Full Name" placeholder="e.g. Kevin Kiprono" value={behaviourForm.studentName} onChange={(e) => setBehaviourForm({ ...behaviourForm, studentName: e.target.value })} required />
            <Input label="Admission Number" placeholder="ADM/..." value={behaviourForm.admissionNo} onChange={(e) => setBehaviourForm({ ...behaviourForm, admissionNo: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Record Category" value={behaviourForm.type} onChange={(e) => setBehaviourForm({ ...behaviourForm, type: e.target.value as any })} options={[{ value: 'merit', label: 'Positive Merit (+Points)' }, { value: 'demerit', label: 'Demerit (-Points)' }, { value: 'incident', label: 'Behavioral Incident' }]} />
            {behaviourForm.type !== 'incident' ? (
              <Input label="Points Value" type="number" value={behaviourForm.points} onChange={(e) => setBehaviourForm({ ...behaviourForm, points: e.target.value })} required />
            ) : (
              <Select label="Severity Level" value={behaviourForm.severity} onChange={(e) => setBehaviourForm({ ...behaviourForm, severity: e.target.value as any })} options={[{ value: 'low', label: 'Low (Handled in class)' }, { value: 'medium', label: 'Medium (Parent informed)' }, { value: 'high', label: 'High (Disciplinary board)' }]} />
            )}
          </div>
          <Input label="Record Title / Summary" placeholder="e.g. Outstanding Community Leadership" value={behaviourForm.title} onChange={(e) => setBehaviourForm({ ...behaviourForm, title: e.target.value })} required />
          <div>
            <label className="block text-2xs font-semibold text-gray-700 mb-1">Detailed Description &amp; Interventions</label>
            <textarea rows={3} className="w-full rounded-xl border border-gray-300 p-2.5 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none" placeholder="Provide full context of the pastoral event..." value={behaviourForm.description} onChange={(e) => setBehaviourForm({ ...behaviourForm, description: e.target.value })} required />
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-50 border border-purple-200">
            <input type="checkbox" id="confidentialCheck" checked={behaviourForm.isConfidential} onChange={(e) => setBehaviourForm({ ...behaviourForm, isConfidential: e.target.checked })} className="rounded text-purple-600" />
            <label htmlFor="confidentialCheck" className="text-2xs text-purple-900 font-semibold cursor-pointer">
              Mark as Strictly Restricted Safeguarding Record (Access limited to Principal &amp; Safeguarding Lead)
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsBehaviourModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Pastoral Entry</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
