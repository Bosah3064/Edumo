import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
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
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Users,
  Bookmark,
  Calendar,
  Layers,
  Sparkles,
  Tag,
  Trash2,
  Check,
  Library as LibraryIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface BookItem {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  shelfLocation?: string;
  totalCopies: number;
  availableCopies: number;
  createdAt?: unknown;
}

export interface BookLoan {
  id: string;
  bookId?: string;
  bookTitle: string;
  studentName: string;
  admissionNo: string;
  borrowedDate: string;
  dueDate: string;
  status: 'active' | 'returned' | 'overdue';
  returnedDate?: string;
}

interface StudentOption {
  id: string;
  name: string;
  admissionNumber: string;
  className: string;
}

export const Library: React.FC = () => {
  const { organization, currentSchool } = useTenant();
  const { currentUser } = useAuth();

  // Active view: 'catalog' | 'loans'
  const [activeTab, setActiveTab] = useState<'catalog' | 'loans'>('catalog');

  // Real Books State
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [bookSearch, setBookSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Real Loans State
  const [loans, setLoans] = useState<BookLoan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [loanSearch, setLoanSearch] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState<'all' | 'active' | 'overdue' | 'returned'>('all');

  // Students for Loan Autocomplete
  const [students, setStudents] = useState<StudentOption[]>([]);

  // Add Book Modal State
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookIsbn, setBookIsbn] = useState('');
  const [bookCategory, setBookCategory] = useState('African Literature');
  const [bookShelf, setBookShelf] = useState('Shelf A-1');
  const [bookCopies, setBookCopies] = useState('10');
  const [savingBook, setSavingBook] = useState(false);

  // Issue Book Modal State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedStudentAdmission, setSelectedStudentAdmission] = useState('');
  const [customStudentName, setCustomStudentName] = useState('');
  const [loanDueDate, setLoanDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // 2 weeks default loan
    return d.toISOString().split('T')[0];
  });
  const [savingLoan, setSavingLoan] = useState(false);

  // 1. Listen to real library books in Firestore
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const booksRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'library_books'
    );

    const unsubBooks = onSnapshot(
      booksRef,
      (snap) => {
        const list: BookItem[] = snap.docs.map((d) => {
          const data = d.data();
          const total = Number(data.totalCopies) || 1;
          const avail = data.availableCopies !== undefined ? Number(data.availableCopies) : total;
          return {
            id: d.id,
            title: data.title || 'Untitled Book',
            author: data.author || 'Unknown Author',
            isbn: data.isbn || '',
            category: data.category || 'General',
            shelfLocation: data.shelfLocation || 'Main Stack',
            totalCopies: total,
            availableCopies: avail,
            createdAt: data.createdAt,
          };
        });

        // If collection is completely empty, provide standard initial catalog
        if (list.length === 0 && !snap.metadata.hasPendingWrites) {
          const initialCatalog: BookItem[] = [
            { id: 'bk-1', title: 'Things Fall Apart', author: 'Chinua Achebe', isbn: '978-0385474542', category: 'African Literature', shelfLocation: 'Section Lit-A', totalCopies: 25, availableCopies: 21 },
            { id: 'bk-2', title: 'The River and the Source', author: 'Margaret Ogola', isbn: '978-9966882059', category: 'Secondary Set Books', shelfLocation: 'Section Set-B', totalCopies: 40, availableCopies: 34 },
            { id: 'bk-3', title: 'Integrated Science for CBC Grade 7', author: 'KICD Kenya', isbn: '978-9966221087', category: 'CBC Curriculum', shelfLocation: 'Section CBC-7', totalCopies: 50, availableCopies: 47 },
            { id: 'bk-4', title: 'Kidagaa Kimemwozea', author: 'Ken Walibora', isbn: '978-9966100573', category: 'Fasihi ya Kiswahili', shelfLocation: 'Section Swa-1', totalCopies: 30, availableCopies: 28 },
            { id: 'bk-5', title: 'A Doll\'s House', author: 'Henrik Ibsen', isbn: '978-0486270623', category: 'Literature in English', shelfLocation: 'Section Drama-3', totalCopies: 35, availableCopies: 30 },
            { id: 'bk-6', title: 'Foundations of Pure Mathematics', author: 'J. K. Backhouse', isbn: '978-0582093553', category: 'STEM & Mathematics', shelfLocation: 'Section Sci-M', totalCopies: 20, availableCopies: 16 },
          ];
          setBooks(initialCatalog);
        } else {
          setBooks(list);
        }
        setLoadingBooks(false);
      },
      (err) => {
        console.warn('Error reading library books:', err);
        setLoadingBooks(false);
      }
    );

    return () => unsubBooks();
  }, [organization, currentSchool]);

  // 2. Listen to real book loans in Firestore
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const loansRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'library_loans'
    );

    const unsubLoans = onSnapshot(
      loansRef,
      (snap) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const list: BookLoan[] = snap.docs.map((d) => {
          const data = d.data();
          let status = data.status || 'active';
          if (status === 'active' && data.dueDate && data.dueDate < todayStr) {
            status = 'overdue';
          }
          return {
            id: d.id,
            bookId: data.bookId,
            bookTitle: data.bookTitle || 'Book Title',
            studentName: data.studentName || 'Student',
            admissionNo: data.admissionNo || '',
            borrowedDate: data.borrowedDate || todayStr,
            dueDate: data.dueDate || todayStr,
            status,
            returnedDate: data.returnedDate,
          };
        });

        if (list.length === 0 && !snap.metadata.hasPendingWrites) {
          const initialLoans: BookLoan[] = [
            { id: 'ln-1', bookTitle: 'Things Fall Apart', studentName: 'Kevin Kiprono', admissionNo: 'ADM/2026/002', borrowedDate: '2026-01-20', dueDate: '2026-02-03', status: 'overdue' },
            { id: 'ln-2', bookTitle: 'The River and the Source', studentName: 'Zawadi Achieng', admissionNo: 'ADM/2026/001', borrowedDate: '2026-02-01', dueDate: '2026-02-15', status: 'active' },
          ];
          setLoans(initialLoans);
        } else {
          setLoans(list);
        }
        setLoadingLoans(false);
      },
      (err) => {
        console.warn('Error reading library loans:', err);
        setLoadingLoans(false);
      }
    );

    return () => unsubLoans();
  }, [organization, currentSchool]);

  // 3. Listen to students for easy issuing
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

    const unsubStudents = onSnapshot(
      studentsRef,
      (snap) => {
        const list: StudentOption[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Learner',
            admissionNumber: data.admissionNumber || '',
            className: data.currentClassId || 'Grade 4',
          };
        });
        setStudents(list);
      },
      (err) => {
        console.warn('Error fetching students for library loans:', err);
      }
    );

    return () => unsubStudents();
  }, [organization, currentSchool]);

  // Handle Add Book
  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim()) {
      toast.error('Book title is required');
      return;
    }
    if (!organization || !currentSchool) return;

    setSavingBook(true);
    const toastId = toast.loading('Adding book to catalog...');

    try {
      const copiesNum = parseInt(bookCopies) || 1;
      const bookId = `bk-${Date.now()}`;
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'library_books',
        bookId
      );

      await setDoc(docRef, {
        title: bookTitle.trim(),
        author: bookAuthor.trim() || 'Unknown Author',
        isbn: bookIsbn.trim() || `ISBN-${Math.floor(100000000 + Math.random() * 900000000)}`,
        category: bookCategory,
        shelfLocation: bookShelf.trim() || 'General Shelves',
        totalCopies: copiesNum,
        availableCopies: copiesNum,
        createdAt: serverTimestamp(),
      });

      toast.success(`"${bookTitle.trim()}" added to library catalog!`, { id: toastId });
      setIsAddBookModalOpen(false);
      setBookTitle('');
      setBookAuthor('');
      setBookIsbn('');
      setBookCopies('10');
    } catch (err) {
      console.error('Error adding book:', err);
      toast.error('Failed to add book to catalog', { id: toastId });
    } finally {
      setSavingBook(false);
    }
  };

  // Handle Issue Book Loan
  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId) {
      toast.error('Please select a book to loan');
      return;
    }
    if (!selectedStudentAdmission && !customStudentName.trim()) {
      toast.error('Please select or specify a borrower');
      return;
    }
    if (!organization || !currentSchool) return;

    const targetBook = books.find((b) => b.id === selectedBookId);
    if (!targetBook) {
      toast.error('Selected book not found');
      return;
    }
    if (targetBook.availableCopies <= 0) {
      toast.error('All copies of this volume are currently loaned out');
      return;
    }

    setSavingLoan(true);
    const toastId = toast.loading('Registering book loan...');

    try {
      const loanId = `ln-${Date.now()}`;
      const matchedStudent = students.find((s) => s.admissionNumber === selectedStudentAdmission);
      const studentName = matchedStudent ? matchedStudent.name : customStudentName.trim();
      const admissionNo = matchedStudent ? matchedStudent.admissionNumber : 'GUEST-USER';

      // 1. Create Loan record
      const loanDocRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'library_loans',
        loanId
      );

      await setDoc(loanDocRef, {
        bookId: targetBook.id,
        bookTitle: targetBook.title,
        studentName,
        admissionNo,
        borrowedDate: new Date().toISOString().split('T')[0],
        dueDate: loanDueDate,
        status: 'active',
        createdAt: serverTimestamp(),
      });

      // 2. Decrement availableCopies in book document
      const bookDocRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'library_books',
        targetBook.id
      );

      await updateDoc(bookDocRef, {
        availableCopies: Math.max(0, targetBook.availableCopies - 1),
        updatedAt: serverTimestamp(),
      });

      toast.success(`Issued "${targetBook.title}" to ${studentName}!`, { id: toastId });
      setIsIssueModalOpen(false);
      setSelectedBookId('');
      setSelectedStudentAdmission('');
      setCustomStudentName('');
    } catch (err) {
      console.error('Error issuing book loan:', err);
      toast.error('Failed to issue book loan', { id: toastId });
    } finally {
      setSavingLoan(false);
    }
  };

  // Handle Return Book
  const handleReturnBook = async (loan: BookLoan) => {
    if (!organization || !currentSchool) return;
    const toastId = toast.loading(`Returning "${loan.bookTitle}"...`);

    try {
      // 1. Mark loan as returned
      const loanDocRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'library_loans',
        loan.id
      );

      await updateDoc(loanDocRef, {
        status: 'returned',
        returnedDate: new Date().toISOString().split('T')[0],
        updatedAt: serverTimestamp(),
      });

      // 2. Increment book availableCopies if bookId exists
      if (loan.bookId) {
        const bookDocRef = doc(
          db,
          'organizations',
          organization.id,
          'schools',
          currentSchool.id,
          'library_books',
          loan.bookId
        );
        const targetBook = books.find((b) => b.id === loan.bookId);
        if (targetBook) {
          await updateDoc(bookDocRef, {
            availableCopies: Math.min(targetBook.totalCopies, targetBook.availableCopies + 1),
            updatedAt: serverTimestamp(),
          });
        }
      }

      toast.success(`"${loan.bookTitle}" returned to circulation!`, { id: toastId });
    } catch (err) {
      console.error('Error returning book:', err);
      toast.error('Failed to mark book as returned', { id: toastId });
    }
  };

  // Metrics
  const totalVolumes = books.reduce((sum, b) => sum + b.totalCopies, 0);
  const availableVolumes = books.reduce((sum, b) => sum + b.availableCopies, 0);
  const activeLoansCount = loans.filter((l) => l.status === 'active').length;
  const overdueLoansCount = loans.filter((l) => l.status === 'overdue').length;

  // Filtered Books
  const filteredBooks = books.filter((b) => {
    const q = (bookSearch || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (b.title || '').toLowerCase().includes(q) ||
      (b.author || '').toLowerCase().includes(q) ||
      (b.isbn || '').toLowerCase().includes(q) ||
      ((b.shelfLocation || '').toLowerCase().includes(q));

    const matchesCat = categoryFilter === 'all' || b.category === categoryFilter;

    return matchesSearch && matchesCat;
  });

  // Filtered Loans
  const filteredLoans = loans.filter((l) => {
    const q = (loanSearch || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (l.bookTitle || '').toLowerCase().includes(q) ||
      (l.studentName || '').toLowerCase().includes(q) ||
      (l.admissionNo || '').toLowerCase().includes(q);

    const matchesStatus =
      loanStatusFilter === 'all' ||
      l.status === loanStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const categories = Array.from(new Set(books.map((b) => b.category).filter(Boolean)));

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-sm">
              <LibraryIcon className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">
              Library &amp; Media Resource Center
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Book cataloging, student book loans, CBC set books, and automated overdue tracking for <strong>{currentSchool?.name || 'School'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsIssueModalOpen(true)}
            leftIcon={<RotateCcw className="w-4 h-4 text-emerald-600" />}
            className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
          >
            Issue Book Loan
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddBookModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-sm"
          >
            Register New Book
          </Button>
        </div>
      </div>

      {/* TOP 4 VIBRANT GRADIENT METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Volumes */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-blue-100">
              Total Catalog Volumes
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{totalVolumes}</div>
            <p className="text-xs text-blue-100 mt-1 font-medium">
              {books.length} distinct book titles
            </p>
          </div>
        </div>

        {/* Card 2: Available Volumes */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-100">
              Available on Shelves
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{availableVolumes}</div>
            <p className="text-xs text-emerald-100 mt-1 font-medium">
              {totalVolumes > 0 ? Math.round((availableVolumes / totalVolumes) * 100) : 0}% ready for immediate checkout
            </p>
          </div>
        </div>

        {/* Card 3: Active Loans */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-purple-100">
              Active Student Loans
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{activeLoansCount}</div>
            <p className="text-xs text-purple-100 mt-1 font-medium">
              Currently in learners' hands
            </p>
          </div>
        </div>

        {/* Card 4: Overdue Tracking */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-pink-600 to-rose-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-rose-100">
              Overdue Returns
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{overdueLoansCount}</div>
            <p className="text-xs text-rose-100 mt-1 font-medium">
              {overdueLoansCount === 0 ? 'All book loans in good standing' : 'Past due loan notices required'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'catalog'
              ? 'border-[#1d5f99] text-[#1d5f99] bg-blue-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Book Catalog &amp; Stack ({books.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('loans')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'loans'
              ? 'border-[#1d5f99] text-[#1d5f99] bg-blue-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Active &amp; Overdue Loans ({loans.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: BOOK CATALOG                                          */}
      {/* ============================================================ */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card className="p-4 bg-white/80 backdrop-blur-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  placeholder="Search books by title, author, ISBN or shelf location..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {categories.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-bold text-slate-400 uppercase">Category:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-700"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </Card>

          {loadingBooks ? (
            <div className="py-16 text-center text-slate-400">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-xs font-semibold">Loading library catalog...</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <Card className="text-center py-12 text-slate-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <h3 className="text-base font-extrabold text-slate-900">No books found in catalog</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Add curriculum textbooks, set books, or reference volumes to start tracking lending.
              </p>
              <div className="mt-4">
                <Button size="sm" variant="primary" onClick={() => setIsAddBookModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                  Register First Book
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBooks.map((book) => {
                const availabilityPct = book.totalCopies > 0 ? Math.round((book.availableCopies / book.totalCopies) * 100) : 0;
                return (
                  <Card key={book.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-all border border-slate-200">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            {book.category}
                          </span>
                          <h3 className="font-extrabold text-slate-900 text-base mt-1.5 leading-snug">{book.title}</h3>
                          <p className="text-2xs font-semibold text-slate-500">By {book.author}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-[10px] font-bold text-slate-400 block">{book.isbn}</span>
                          <span className="text-2xs font-extrabold text-slate-700 block mt-1">{book.shelfLocation}</span>
                        </div>
                      </div>

                      {/* Stock availability */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                        <div className="flex justify-between text-2xs font-semibold">
                          <span className="text-slate-500">Availability in Stack</span>
                          <span className="font-extrabold text-slate-900">
                            {book.availableCopies} of {book.totalCopies} Available
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              book.availableCopies === 0
                                ? 'bg-rose-500'
                                : book.availableCopies < 5
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                            }`}
                            style={{ width: `${availabilityPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between gap-2">
                      <span className="text-2xs text-slate-400">
                        {book.totalCopies - book.availableCopies} currently loaned out
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={book.availableCopies === 0}
                        onClick={() => {
                          setSelectedBookId(book.id);
                          setIsIssueModalOpen(true);
                        }}
                        className="text-2xs py-1 h-7 font-bold"
                      >
                        Issue Copy
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: ACTIVE & OVERDUE LOANS                                */}
      {/* ============================================================ */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          {/* Loan Filter Bar */}
          <Card className="p-4 bg-white/80 backdrop-blur-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={loanSearch}
                  onChange={(e) => setLoanSearch(e.target.value)}
                  placeholder="Search loans by book, student name or admission number..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setLoanStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-colors ${
                    loanStatusFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({loans.length})
                </button>
                <button
                  onClick={() => setLoanStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-colors ${
                    loanStatusFilter === 'active'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Active ({activeLoansCount})
                </button>
                <button
                  onClick={() => setLoanStatusFilter('overdue')}
                  className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-colors ${
                    loanStatusFilter === 'overdue'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Overdue ({overdueLoansCount})
                </button>
                <button
                  onClick={() => setLoanStatusFilter('returned')}
                  className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-colors ${
                    loanStatusFilter === 'returned'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Returned
                </button>
              </div>
            </div>
          </Card>

          {/* Loans Table */}
          {loadingLoans ? (
            <div className="py-16 text-center text-slate-400">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-xs font-semibold">Loading student book loans...</p>
            </div>
          ) : filteredLoans.length === 0 ? (
            <Card className="text-center py-10 text-slate-500">
              <p className="text-xs font-semibold">No book loans match "{loanSearch || loanStatusFilter}"</p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10.5px]">
                    <th className="py-3 px-4">Book Title</th>
                    <th className="py-3 px-4">Learner / Borrower</th>
                    <th className="py-3 px-4">Borrowed Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{loan.bookTitle}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 block">{loan.studentName}</span>
                        <span className="font-mono text-2xs text-slate-500">{loan.admissionNo}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{loan.borrowedDate}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{loan.dueDate}</td>
                      <td className="py-3 px-4">
                        {loan.status === 'returned' ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Returned
                          </span>
                        ) : loan.status === 'overdue' ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3 h-3" /> Active Loan
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {loan.status !== 'returned' && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleReturnBook(loan)}
                            leftIcon={<Check className="w-3.5 h-3.5 text-emerald-600" />}
                            className="text-2xs py-1 h-7 font-bold border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                          >
                            Mark Returned
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: REGISTER NEW BOOK                                     */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAddBookModalOpen}
        onClose={() => setIsAddBookModalOpen(false)}
        title="Register Book into Catalog"
        description="Add curriculum textbooks, set books, or library literature."
      >
        <form onSubmit={handleAddBook} className="space-y-4">
          <Input
            label="Book Title"
            placeholder="e.g. Things Fall Apart, Grade 7 Integrated Science"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Author / Publisher"
              placeholder="e.g. Chinua Achebe, KICD"
              value={bookAuthor}
              onChange={(e) => setBookAuthor(e.target.value)}
              required
            />
            <Input
              label="ISBN or Barcode"
              placeholder="e.g. 978-0385474542"
              value={bookIsbn}
              onChange={(e) => setBookIsbn(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={bookCategory}
              onChange={(e) => setBookCategory(e.target.value)}
              options={[
                { label: 'African Literature', value: 'African Literature' },
                { label: 'Secondary Set Books', value: 'Secondary Set Books' },
                { label: 'CBC Curriculum', value: 'CBC Curriculum' },
                { label: 'Fasihi ya Kiswahili', value: 'Fasihi ya Kiswahili' },
                { label: 'STEM & Mathematics', value: 'STEM & Mathematics' },
                { label: 'Sciences & Nature', value: 'Sciences & Nature' },
                { label: 'General Fiction & Reference', value: 'General Reference' },
              ]}
            />
            <Input
              label="Total Volumes / Copies"
              type="number"
              value={bookCopies}
              onChange={(e) => setBookCopies(e.target.value)}
              min="1"
              max="500"
              required
            />
          </div>

          <Input
            label="Shelf Location"
            placeholder="e.g. Section Lit-A, Shelf 3"
            value={bookShelf}
            onChange={(e) => setBookShelf(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsAddBookModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={savingBook} leftIcon={<Plus className="w-4 h-4" />}>
              Save Book to Library
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: ISSUE BOOK LOAN                                       */}
      {/* ============================================================ */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Issue Book Loan to Learner"
        description="Record a volume checkout and specify due return date."
      >
        <form onSubmit={handleIssueBook} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Select Book Volume</label>
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            >
              <option value="">-- Choose a book title --</option>
              {books.map((b) => (
                <option key={b.id} value={b.id} disabled={b.availableCopies <= 0}>
                  {b.title} by {b.author} ({b.availableCopies} available)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Select Enrolled Learner</label>
            <select
              value={selectedStudentAdmission}
              onChange={(e) => {
                setSelectedStudentAdmission(e.target.value);
                const s = students.find((st) => st.admissionNumber === e.target.value);
                if (s) setCustomStudentName(s.name);
              }}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">-- Choose from student roster --</option>
              {students.map((s) => (
                <option key={s.id} value={s.admissionNumber}>
                  {s.name} ({s.admissionNumber} • {s.className})
                </option>
              ))}
            </select>
          </div>

          {!selectedStudentAdmission && (
            <Input
              label="Or Enter Borrower Name"
              placeholder="e.g. Samuel Mutiso (Staff or Guest)"
              value={customStudentName}
              onChange={(e) => setCustomStudentName(e.target.value)}
            />
          )}

          <Input
            label="Return Due Date"
            type="date"
            value={loanDueDate}
            onChange={(e) => setLoanDueDate(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={savingLoan} leftIcon={<Check className="w-4 h-4" />}>
              Issue Volume
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

