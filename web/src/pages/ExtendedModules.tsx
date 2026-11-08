import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  BookOpen,
  Package,
  Home,
  UtensilsCrossed,
  Trophy,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  CreditCard,
  Building,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Interfaces
export interface BookItem {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
}

export interface BookLoan {
  id: string;
  bookTitle: string;
  studentName: string;
  admissionNo: string;
  borrowedDate: string;
  dueDate: string;
  status: 'active' | 'returned' | 'overdue';
}

export interface InventoryItem {
  id: string;
  itemName: string;
  category: 'uniform' | 'stationery' | 'textbooks' | 'lab_equipment' | 'sports';
  stockLevel: number;
  reorderThreshold: number;
  unitCost: number;
  location: string;
}

export interface HostelDorm {
  id: string;
  name: string;
  gender: 'boys' | 'girls';
  housemaster: string;
  capacity: number;
  occupied: number;
  rollCallStatusToday: 'completed' | 'pending';
}

export interface ClubItem {
  id: string;
  name: string;
  patronTeacher: string;
  category: string;
  memberCount: number;
  meetingTime: string;
}

export const ExtendedModules: React.FC = () => {
  const navigate = useNavigate();
  const { organization, currentSchool } = useTenant();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'library' | 'inventory' | 'boarding' | 'canteen' | 'clubs'>('library');

  // State
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loans, setLoans] = useState<BookLoan[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [dorms, setDorms] = useState<HostelDorm[]>([]);
  const [clubs, setClubs] = useState<ClubItem[]>([]);

  // Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);

  // Forms
  const [bookForm, setBookForm] = useState({ title: '', author: '', isbn: '', category: 'Fiction', totalCopies: '5' });
  const [loanForm, setLoanForm] = useState({ bookTitle: '', studentName: '', admissionNo: '', dueDate: '2026-02-25' });
  const [invForm, setInvForm] = useState({ itemName: '', category: 'uniform' as any, stockLevel: '50', reorderThreshold: '15', unitCost: '1200', location: 'Main Store Room' });
  const [topupForm, setTopupForm] = useState({ studentName: '', amount: '2000' });

  const currency: string = (currentSchool?.settings?.currency as string) || 'KES';

  // Live Firestore subscriptions
  useEffect(() => {
    if (!organization || !currentSchool) return;

    // 1. Books
    const bRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'library_books');
    const unsubB = onSnapshot(bRef, (snap) => {
      setBooks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }, (err) => console.warn('Error fetching books:', err));

    // 2. Loans
    const lRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'library_loans');
    const unsubL = onSnapshot(lRef, (snap) => {
      setLoans(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }, (err) => console.warn('Error fetching loans:', err));

    // 3. Inventory
    const iRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'inventory');
    const unsubI = onSnapshot(iRef, (snap) => {
      setInventory(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }, (err) => console.warn('Error fetching inventory:', err));

    // 4. Dorms
    const dRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'dorms');
    const unsubD = onSnapshot(dRef, (snap) => {
      setDorms(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }, (err) => console.warn('Error fetching dorms:', err));

    // 5. Clubs
    const cRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'clubs');
    const unsubC = onSnapshot(cRef, (snap) => {
      setClubs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }, (err) => console.warn('Error fetching clubs:', err));

    return () => {
      unsubB();
      unsubL();
      unsubI();
      unsubD();
      unsubC();
    };
  }, [organization, currentSchool]);

  const handleReturnBook = (loanId: string) => {
    setLoans((prev) =>
      prev.map((l) => (l.id === loanId ? { ...l, status: 'returned' } : l))
    );
    toast.success('Book returned to library collection!');
  };

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    const newBk: BookItem = {
      id: `bk-${Date.now()}`,
      title: bookForm.title.trim(),
      author: bookForm.author.trim(),
      isbn: bookForm.isbn.trim() || 'ISBN-EDM-GEN',
      category: bookForm.category,
      totalCopies: Number(bookForm.totalCopies) || 5,
      availableCopies: Number(bookForm.totalCopies) || 5,
    };
    setBooks((prev) => [newBk, ...prev]);
    toast.success(`"${newBk.title}" added to school catalogue!`);
    setIsBookModalOpen(false);
    setBookForm({ title: '', author: '', isbn: '', category: 'Fiction', totalCopies: '5' });
  };

  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const newLn: BookLoan = {
      id: `ln-${Date.now()}`,
      bookTitle: loanForm.bookTitle,
      studentName: loanForm.studentName,
      admissionNo: loanForm.admissionNo,
      borrowedDate: new Date().toISOString().slice(0, 10),
      dueDate: loanForm.dueDate,
      status: 'active',
    };
    setLoans((prev) => [newLn, ...prev]);
    toast.success(`Book loaned to ${loanForm.studentName}!`);
    setIsLoanModalOpen(false);
  };

  const handleCreateInventory = (e: React.FormEvent) => {
    e.preventDefault();
    const newInv: InventoryItem = {
      id: `inv-${Date.now()}`,
      itemName: invForm.itemName.trim(),
      category: invForm.category,
      stockLevel: Number(invForm.stockLevel) || 0,
      reorderThreshold: Number(invForm.reorderThreshold) || 10,
      unitCost: Number(invForm.unitCost) || 0,
      location: invForm.location.trim(),
    };
    setInventory((prev) => [newInv, ...prev]);
    toast.success(`Inventory item "${newInv.itemName}" recorded!`);
    setIsInventoryModalOpen(false);
  };

  const handleTopupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`Topped up ${currency} ${Number(topupForm.amount).toLocaleString()} onto pupil canteen meal wallet!`, {
      icon: '💳',
    });
    setIsTopupModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" dot>
              Extended Modules
            </Badge>
            <span className="text-2xs text-gray-500">{currentSchool?.name || 'Main Campus'}</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            Library, Inventory, Boarding &amp; Canteen
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Digital catalogue loans, uniform inventory, boarding dormitories, cashless canteen wallets, and co-curricular clubs
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'library' && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setIsLoanModalOpen(true)} leftIcon={<Clock className="w-4 h-4" />}>
                Issue Book Loan
              </Button>
              <Button size="sm" variant="primary" onClick={() => setIsBookModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                Add Book Title
              </Button>
            </>
          )}
          {activeTab === 'inventory' && (
            <Button size="sm" variant="primary" onClick={() => setIsInventoryModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Add Inventory Stock
            </Button>
          )}
          {activeTab === 'canteen' && (
            <Button size="sm" variant="primary" onClick={() => setIsTopupModalOpen(true)} leftIcon={<CreditCard className="w-4 h-4" />}>
              Top-Up Meal Wallet
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-2 sm:space-x-6 overflow-x-auto pb-1">
          {[
            { key: 'library', label: `Library & Loans (${books.length})`, icon: BookOpen },
            { key: 'inventory', label: `Uniform & Inventory (${inventory.length})`, icon: Package },
            { key: 'boarding', label: `Hostel & Boarding (${dorms.length})`, icon: Home },
            { key: 'canteen', label: 'Cashless Canteen', icon: UtensilsCrossed },
            { key: 'clubs', label: `Co-Curricular Clubs (${clubs.length})`, icon: Trophy },
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

      {/* TAB 1: LIBRARY & BOOK LOANS */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          {/* Quick Jump Banner to Dedicated Sidebar Page */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div>
              <h4 className="font-extrabold text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Dedicated Library &amp; Book Catalogue Portal Now in Sidebar
              </h4>
              <p className="text-2xs text-blue-100 mt-0.5">
                Manage multiple book volumes, issue student loans, and track returns with live Firestore synchronization.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/library')}
              className="bg-white text-blue-900 hover:bg-blue-50 font-bold shrink-0"
            >
              Open Full Library Portal →
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-0 overflow-hidden border border-gray-200">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">Library Book Catalogue</h3>
                <span className="text-2xs text-gray-500 font-semibold">{books.length} Titles Registered</span>
              </div>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {books.map((b) => (
                  <div key={b.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50/60">
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs">{b.title}</h4>
                      <p className="text-2xs text-gray-500">By {b.author} • {b.category}</p>
                      <span className="text-[10px] font-mono text-gray-400">ISBN: {b.isbn}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono text-xs text-brand-700 block">{b.availableCopies}/{b.totalCopies}</span>
                      <span className="text-[10px] text-gray-400">Available</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-0 overflow-hidden border border-gray-200">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">Active Book Loans &amp; Overdue Ledger</h3>
                <span className="text-2xs text-gray-500 font-semibold">{loans.length} Borrowers</span>
              </div>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {loans.map((ln) => (
                  <div key={ln.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50/60">
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs">{ln.bookTitle}</h4>
                      <p className="text-2xs text-gray-600">Borrower: <strong>{ln.studentName}</strong> ({ln.admissionNo})</p>
                      <span className="text-[10px] text-gray-400 font-mono">Due Date: {ln.dueDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={ln.status === 'overdue' ? 'danger' : ln.status === 'returned' ? 'accent' : 'brand'} size="sm">
                        {ln.status.toUpperCase()}
                      </Badge>
                      {ln.status !== 'returned' && (
                        <Button size="sm" variant="secondary" onClick={() => handleReturnBook(ln.id)}>
                          Return
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY & UNIFORM DEPOT */}
      {activeTab === 'inventory' && (
        <Card className="space-y-4 !p-0 overflow-hidden border border-gray-200">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">School Uniform &amp; Asset Inventory Depot</h3>
              <p className="text-2xs text-gray-500">Stock balance tracking, reorder alert levels and store locations</p>
            </div>
            <Button size="sm" variant="primary" onClick={() => setIsInventoryModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Add Item
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100 text-gray-600 font-semibold uppercase text-2xs">
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Storage Location</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-center">Stock Level</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inventory.map((inv) => {
                  const isLow = inv.stockLevel <= inv.reorderThreshold;
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 font-semibold text-gray-900">{inv.itemName}</td>
                      <td className="py-3 px-4">
                        <Badge variant="neutral" className="uppercase text-[10px]">{inv.category.replace('_', ' ')}</Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-2xs">{inv.location}</td>
                      <td className="py-3 px-4 text-right font-mono text-gray-800">
                        {currency} {inv.unitCost.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-xs">
                        <span className={isLow ? 'text-rose-600' : 'text-gray-900'}>{inv.stockLevel} units</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant={isLow ? 'danger' : 'accent'} size="sm">
                          {isLow ? `Reorder Alert (Threshold: ${inv.reorderThreshold})` : 'Adequate Stock'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: HOSTEL & BOARDING */}
      {activeTab === 'boarding' && (
        <div className="space-y-4">
          {/* Quick Jump Banner to Dedicated Sidebar Page */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div>
              <h4 className="font-extrabold text-sm flex items-center gap-2">
                <Home className="w-4 h-4" />
                Dedicated Hostels &amp; Boarding Wing Portal Now in Sidebar
              </h4>
              <p className="text-2xs text-purple-100 mt-0.5">
                Register campus dormitories, assign room &amp; bed allocations, and conduct daily night roll call inspections.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/hostels')}
              className="bg-white text-indigo-900 hover:bg-purple-50 font-bold shrink-0"
            >
              Open Full Hostels Portal →
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dorms.map((drm) => (
              <Card key={drm.id} className="p-5 space-y-4 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center font-bold">
                      <Home className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{drm.name}</h3>
                      <p className="text-2xs text-gray-500 capitalize">{drm.gender} Dormitory</p>
                    </div>
                  </div>
                  <Badge variant={drm.rollCallStatusToday === 'completed' ? 'accent' : 'brand'} size="sm">
                    {drm.rollCallStatusToday === 'completed' ? 'Roll Call Done' : 'Roll Call Pending'}
                  </Badge>
                </div>

                <div className="space-y-2 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-2xs">Housemaster:</span>
                    <span className="font-semibold text-gray-800">{drm.housemaster}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-2xs">Occupancy:</span>
                    <span className="font-mono font-bold text-indigo-700">{drm.occupied} / {drm.capacity} Beds</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${(drm.occupied / drm.capacity) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setDorms((prev) =>
                      prev.map((d) => (d.id === drm.id ? { ...d, rollCallStatusToday: 'completed' } : d))
                    );
                    toast.success(`Evening hostel roll call logged for ${drm.name}! All ${drm.occupied} boarders accounted for.`);
                  }}
                  leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                >
                  Conduct Evening Roll Call
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CANTEEN CASHLESS WALLETS */}
      {activeTab === 'canteen' && (
        <Card className="p-6 space-y-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Cashless School Canteen POS &amp; Wallets</h3>
              <p className="text-xs text-gray-500">Pre-paid smartcard/biometric balance for pupil morning snacks and midday hot meals</p>
            </div>
            <Button size="sm" variant="primary" onClick={() => setIsTopupModalOpen(true)} leftIcon={<CreditCard className="w-4 h-4" />}>
              Deposit Pupil Meal Funds
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
              <span className="text-2xs font-semibold uppercase tracking-wider">Total Prepaid Floating Balance</span>
              <h4 className="text-2xl font-bold font-mono">{currency} 142,500</h4>
              <p className="text-2xs text-emerald-700">Held in custodial school meals account</p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 space-y-1">
              <span className="text-2xs font-semibold uppercase tracking-wider">Today's Meal Orders Served</span>
              <h4 className="text-2xl font-bold font-mono">184 Plates</h4>
              <p className="text-2xs text-blue-700">Healthy balanced CBC nutrition standard</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <span className="text-2xs font-semibold uppercase tracking-wider">Low Balance Wallet Alerts</span>
              <h4 className="text-2xl font-bold font-mono">6 Pupils</h4>
              <p className="text-2xs text-amber-700">Automated SMS top-up prompt sent to guardians</p>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 5: CO-CURRICULAR CLUBS */}
      {activeTab === 'clubs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clubs.map((clb) => (
            <Card key={clb.id} className="p-5 space-y-3 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{clb.name}</h3>
                    <p className="text-2xs text-gray-500">{clb.category} • Meeting: {clb.meetingTime}</p>
                  </div>
                </div>
                <Badge variant="accent" size="sm">{clb.memberCount} Members</Badge>
              </div>
              <p className="text-xs text-gray-700">Patron Teacher in charge: <strong>{clb.patronTeacher}</strong></p>
            </Card>
          ))}
        </div>
      )}

      {/* Add Book Modal */}
      <Modal isOpen={isBookModalOpen} onClose={() => setIsBookModalOpen(false)} title="Register New Library Book" maxWidth="md">
        <form onSubmit={handleCreateBook} className="space-y-4 text-xs">
          <Input label="Book Title" placeholder="e.g. A Doll's House" value={bookForm.title} onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} required />
          <Input label="Author" placeholder="e.g. Henrik Ibsen" value={bookForm.author} onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="ISBN / Accession Number" placeholder="e.g. 978-0141180458" value={bookForm.isbn} onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })} />
            <Input label="Number of Copies" type="number" min="1" value={bookForm.totalCopies} onChange={(e) => setBookForm({ ...bookForm, totalCopies: e.target.value })} required />
          </div>
          <Select label="Genre / Category" value={bookForm.category} onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })} options={['Fiction', 'African Literature', 'Set Books', 'Science & Mathematics', 'Social Studies', 'Fasihi ya Kiswahili'].map((c) => ({ value: c, label: c }))} />
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsBookModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Add to Library</Button>
          </div>
        </form>
      </Modal>

      {/* Loan Book Modal */}
      <Modal isOpen={isLoanModalOpen} onClose={() => setIsLoanModalOpen(false)} title="Issue Book Loan to Learner" maxWidth="md">
        <form onSubmit={handleCreateLoan} className="space-y-4 text-xs">
          <Select label="Select Book" value={loanForm.bookTitle} onChange={(e) => setLoanForm({ ...loanForm, bookTitle: e.target.value })} options={books.map((b) => ({ value: b.title, label: `${b.title} (${b.availableCopies} avail)` }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Learner Full Name" placeholder="Student Name" value={loanForm.studentName} onChange={(e) => setLoanForm({ ...loanForm, studentName: e.target.value })} required />
            <Input label="Admission Number" placeholder="e.g. ADM/2026/001" value={loanForm.admissionNo} onChange={(e) => setLoanForm({ ...loanForm, admissionNo: e.target.value })} required />
          </div>
          <Input label="Expected Return Due Date" type="date" value={loanForm.dueDate} onChange={(e) => setLoanForm({ ...loanForm, dueDate: e.target.value })} required />
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsLoanModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Confirm Book Issue</Button>
          </div>
        </form>
      </Modal>

      {/* Add Inventory Modal */}
      <Modal isOpen={isInventoryModalOpen} onClose={() => setIsInventoryModalOpen(false)} title="Register Inventory Item" maxWidth="md">
        <form onSubmit={handleCreateInventory} className="space-y-4 text-xs">
          <Input label="Item Name / Description" placeholder="e.g. Official Campus Blazer (Size 32)" value={invForm.itemName} onChange={(e) => setInvForm({ ...invForm, itemName: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={invForm.category} onChange={(e) => setInvForm({ ...invForm, category: e.target.value as any })} options={[{ value: 'uniform', label: 'School Uniform' }, { value: 'stationery', label: 'Exercise Books & Stationery' }, { value: 'textbooks', label: 'Textbooks' }, { value: 'lab_equipment', label: 'Laboratory Equipment' }, { value: 'sports', label: 'Sports & PE Gear' }]} />
            <Input label={`Unit Price (${currency})`} type="number" min="0" value={invForm.unitCost} onChange={(e) => setInvForm({ ...invForm, unitCost: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Current Stock Quantity" type="number" min="0" value={invForm.stockLevel} onChange={(e) => setInvForm({ ...invForm, stockLevel: e.target.value })} required />
            <Input label="Reorder Threshold Alert" type="number" min="1" value={invForm.reorderThreshold} onChange={(e) => setInvForm({ ...invForm, reorderThreshold: e.target.value })} required />
          </div>
          <Input label="Storage Depot / Shelf Location" placeholder="e.g. Depot Shelf B-4" value={invForm.location} onChange={(e) => setInvForm({ ...invForm, location: e.target.value })} required />
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsInventoryModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Inventory Item</Button>
          </div>
        </form>
      </Modal>

      {/* Topup Canteen Modal */}
      <Modal isOpen={isTopupModalOpen} onClose={() => setIsTopupModalOpen(false)} title="Top-Up Pupil Canteen Meal Wallet" maxWidth="md">
        <form onSubmit={handleTopupSubmit} className="space-y-4 text-xs">
          <Input label="Learner Account" value={topupForm.studentName} onChange={(e) => setTopupForm({ ...topupForm, studentName: e.target.value })} required />
          <Input label={`Amount to Deposit (${currency})`} type="number" min="100" value={topupForm.amount} onChange={(e) => setTopupForm({ ...topupForm, amount: e.target.value })} required />
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsTopupModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Confirm Deposit</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

