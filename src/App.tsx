import React, { useState, useEffect } from 'react';
import {
  LogOut, Users, BookOpen, FileText, Lock, Unlock, Mail, CheckCircle2,
  AlertCircle, Printer, UserPlus, PlusCircle, Save, Trash2, Edit3,
  ShieldCheck, Search, GraduationCap, ArrowLeft, Wallet, Receipt,
  BarChart3, Calendar, Sliders,
} from 'lucide-react';
import axios from 'axios';
import api from './services/api';

interface User {
  id: string;
  matricule: string;
  fullName: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'SECRETARY' | 'ACCOUNTANT';
  phone?: string;
  subjectsTaught?: {
    subjectId: string;
    subject: {
      id: string;
      name: string;
      class: { id: string; name: string };
    };
  }[];
}

interface PaymentRecord {
  id: string;
  receiptNumber: string;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  note?: string;
  paidAt: string;
}

interface Student {
  id: string;
  matricule: string;
  lastName: string;
  firstName: string;
  birthDate: string;
  gender: string;
  isRepeating: boolean;
  payments?: PaymentRecord[];
}

interface Subject {
  id: string;
  name: string;
  code: string;
  coefficient: number;
}

interface SchoolClass {
  id: string;
  name: string;
  cycle?: 'PRIMAIRE' | 'SECONDAIRE';
  tuitionFee?: number;
  inscriptionFee?: number;
  students: Student[];
  subjects: Subject[];
}

interface GeneralExpenseRecord {
  id: string;
  label: string;
  category: string;
  amount: number;
  paymentMethod: string;
  beneficiary?: string;
  reference?: string;
  expenseDate: string;
}

interface AccountingOverview {
  classes: SchoolClass[];
  expenses: GeneralExpenseRecord[];
  stats: {
    totalStudents: number;
    primaireStudents: number;
    secondaireStudents: number;
    boysCount: number;
    girlsCount: number;
    repeatingCount: number;
    totalExpectedRevenue: number;
    totalCollectedRevenue: number;
    totalRemainingRevenue: number;
    totalExpenses: number;
    netBalance: number;
    classStats: {
      id: string;
      name: string;
      cycle: 'PRIMAIRE' | 'SECONDAIRE';
      tuitionFee: number;
      inscriptionFee: number;
      studentCount: number;
      boys: number;
      girls: number;
      expected: number;
      collected: number;
      remaining: number;
    }[];
  };
}

interface GradeRecord {
  id?: string;
  subjectId: string;
  coefficient: number;
  interrogation: number;
  devoir1: number;
  devoir2: number;
  appreciation: string;
  status: string;
}

interface ParentBulletinData {
  student: {
    id: string;
    matricule: string;
    lastName: string;
    firstName: string;
    isRepeating: boolean;
    className: string;
    classSize: number;
  };
  trimester: 'T1' | 'T2' | 'T3';
  rows: {
    id: string;
    code?: string;
    name: string;
    coefficient: number;
    interrogation: number;
    devoir1: number;
    devoir2: number;
    moyTrim: number;
    moyCoef: number;
    appreciation: string;
  }[];
  totalCoef: number;
  totalMoyCoef: number;
  moyenneTrimestrielle: number;
}

const ACADEMIC_YEARS = ['2026-2027', '2027-2028', '2028-2029', '2029-2030'];

const OFFICIAL_SUBJECT_ORDER = [
  'LECT_ORT', 'COM_FR', 'HIST_GEO', 'LV1_ANG', 'LV2_ESP', 'MATH',
  'SVT', 'PHILO', 'PCT', 'INFO', 'ALL', 'ECO', 'EPS', 'COND',
];

const sortSubjectsOfficial = <T extends { code?: string; name: string }>(list: T[]): T[] => {
  return [...list].sort((a, b) => {
    const idxA = a.code ? OFFICIAL_SUBJECT_ORDER.indexOf(a.code) : -1;
    const idxB = b.code ? OFFICIAL_SUBJECT_ORDER.indexOf(b.code) : -1;
    if (idxA === -1 && idxB === -1) return a.name.localeCompare(b.name);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });
};

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedYear, setSelectedYear] = useState<string>('2026-2027');
  const [portalMode, setPortalMode] = useState<'staff' | 'parent'>('staff');
  const [parentMatricule, setParentMatricule] = useState('');
  const [parentTrimester, setParentTrimester] = useState<'T1' | 'T2' | 'T3'>('T1');
  const [parentBulletin, setParentBulletin] = useState<ParentBulletinData | null>(null);
  const [parentLoading, setParentLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<
    'inscription' | 'grades' | 'bulletins' | 'frmInscription' | 'fraisGeneraux' | 'stats' | 'staff'
  >('inscription');

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [trimester, setTrimester] = useState<'T1' | 'T2' | 'T3'>('T1');

  const [newClassName, setNewClassName] = useState('');
  const [newClassCycle, setNewClassCycle] = useState<'PRIMAIRE' | 'SECONDAIRE'>('SECONDAIRE');
  const [newClassInscriptionFee, setNewClassInscriptionFee] = useState('5000');
  const [newClassTuitionFee, setNewClassTuitionFee] = useState('60000');

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [matricule, setMatricule] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [birthDate, setBirthDate] = useState('2012-05-10');
  const [gender, setGender] = useState('F');
  const [isRepeating, setIsRepeating] = useState(false);

  const [accountingData, setAccountingData] = useState<AccountingOverview | null>(null);
  const [cycleFilter, setCycleFilter] = useState<'ALL' | 'PRIMAIRE' | 'SECONDAIRE'>('ALL');
  const [searchAccounting, setSearchAccounting] = useState('');
  const [payStudentId, setPayStudentId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payType, setPayType] = useState('SCOLARITE - 1ERE TRANCHE');
  const [payMethod, setPayMethod] = useState('ESPECES');
  const [payNote, setPayNote] = useState('');
  const [printedReceipt, setPrintedReceipt] = useState<any | null>(null);

  const [feeClassId, setFeeClassId] = useState('');
  const [feeCycle, setFeeCycle] = useState<'PRIMAIRE' | 'SECONDAIRE'>('SECONDAIRE');
  const [feeInscription, setFeeInscription] = useState('0');
  const [feeTuition, setFeeTuition] = useState('0');

  const [expLabel, setExpLabel] = useState('');
  const [expCategory, setExpCategory] = useState('SALAIRES & VACATIONS');
  const [expAmount, setExpAmount] = useState('');
  const [expMethod, setExpMethod] = useState('ESPECES');
  const [expBeneficiary, setExpBeneficiary] = useState('');
  const [expReference, setExpReference] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);

  // Gestion personnel + modification + attribution classes/matières
  const [staffList, setStaffList] = useState<User[]>([]);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<'TEACHER' | 'SECRETARY' | 'ACCOUNTANT' | 'ADMIN'>('TEACHER');
  const [staffPhone, setStaffPhone] = useState('');
  const [assigningTeacher, setAssigningTeacher] = useState<User | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const [gradesMap, setGradesMap] = useState<Record<string, GradeRecord>>({});

  const isDirection = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const canAccessAccounting = isDirection || isAccountant;
  const canInscribe = isDirection || user?.role === 'SECRETARY';

  useEffect(() => {
    const savedUser = localStorage.getItem('csb_user');
    if (savedUser) {
      const parsed: User = JSON.parse(savedUser);
      setUser(parsed);
      if (parsed.role === 'TEACHER') setActiveTab('grades');
      else if (parsed.role === 'ACCOUNTANT') setActiveTab('frmInscription');
    }
  }, []);

  const loadClasses = async (yr = selectedYear) => {
    try {
      const res = await api.get(`/academic/classes?year=${encodeURIComponent(yr)}`);
      const sortedClasses: SchoolClass[] = res.data.map((c: SchoolClass) => ({
        ...c,
        subjects: sortSubjectsOfficial(c.subjects || []),
      }));
      setClasses(sortedClasses);

      if (sortedClasses.length > 0) {
        const targetClass = sortedClasses.find((c) => c.id === selectedClassId) || sortedClasses[0];
        setSelectedClassId(targetClass.id);
        if (!feeClassId) {
          setFeeClassId(targetClass.id);
          setFeeCycle(targetClass.cycle || 'SECONDAIRE');
          setFeeInscription(String(targetClass.inscriptionFee || 0));
          setFeeTuition(String(targetClass.tuitionFee || 0));
        }
        if (targetClass.students.length > 0) {
          const targetStud = targetClass.students.find((s) => s.id === selectedStudentId) || targetClass.students[0];
          setSelectedStudentId(targetStud.id);
        } else {
          setSelectedStudentId('');
        }
      } else {
        setSelectedClassId('');
        setSelectedStudentId('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAccounting = async (yr = selectedYear) => {
    if (!user || user.role === 'TEACHER') return;
    try {
      const res = await api.get(`/accounting/overview?year=${encodeURIComponent(yr)}`);
      setAccountingData(res.data);
      if (res.data.classes?.length > 0) {
        const cls = res.data.classes.find((c: SchoolClass) => c.id === feeClassId) || res.data.classes[0];
        setFeeClassId(cls.id);
        setFeeCycle(cls.cycle || 'SECONDAIRE');
        setFeeInscription(String(cls.inscriptionFee || 0));
        setFeeTuition(String(cls.tuitionFee || 0));
      }
    } catch {
      setAccountingData(null);
    }
  };

  const loadStaff = async () => {
    if (!isDirection) return;
    try {
      const res = await api.get('/academic/staff');
      setStaffList(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      loadClasses(selectedYear);
      loadAccounting(selectedYear);
      if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
        loadStaff();
      }
    }
  }, [user, selectedYear]);

  const currentClass = classes.find((c) => c.id === selectedClassId);
  const currentStudent = currentClass?.students.find((s) => s.id === selectedStudentId);

  const loadStudentGrades = async (studId: string, trim: 'T1' | 'T2' | 'T3') => {
    if (!studId || !currentClass) return;
    try {
      const res = await api.get(`/academic/grades/${studId}/${trim}`);
      const map: Record<string, GradeRecord> = {};
      currentClass.subjects.forEach((subj) => {
        const found = res.data.find((g: any) => g.subjectId === subj.id);
        map[subj.id] = found
          ? {
              id: found.id,
              subjectId: subj.id,
              coefficient: subj.coefficient ?? 0,
              interrogation: found.interrogation ?? 0,
              devoir1: found.devoir1 ?? 0,
              devoir2: found.devoir2 ?? 0,
              appreciation: found.appreciation ?? '',
              status: found.status,
            }
          : {
              subjectId: subj.id,
              coefficient: subj.coefficient ?? 0,
              interrogation: 0,
              devoir1: 0,
              devoir2: 0,
              appreciation: '',
              status: 'DRAFT',
            };
      });
      setGradesMap(map);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedStudentId && currentClass) {
      loadStudentGrades(selectedStudentId, trimester);
    }
  }, [selectedStudentId, trimester, selectedClassId, classes]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user: loggedUser } = response.data;
      localStorage.setItem('csb_token', token);
      localStorage.setItem('csb_user', JSON.stringify(loggedUser));
      setUser(loggedUser);
      setEmail('');
      setPassword('');
      if (loggedUser.role === 'TEACHER') setActiveTab('grades');
      else if (loggedUser.role === 'ACCOUNTANT') setActiveTab('frmInscription');
      else setActiveTab('inscription');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Email ou mot de passe incorrect.');
      } else {
        setError('Erreur de connexion au serveur.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchParentBulletin = async (mat: string, trim: 'T1' | 'T2' | 'T3') => {
    if (!mat.trim()) return;
    setError('');
    setParentLoading(true);
    try {
      const res = await api.get(`/report-cards/public/${encodeURIComponent(mat.trim())}?trimester=${trim}`);
      setParentBulletin({ ...res.data, rows: sortSubjectsOfficial(res.data.rows || []) });
    } catch (err: unknown) {
      setParentBulletin(null);
      if (axios.isAxiosError(err)) setError(err.response?.data?.message || 'Matricule introuvable.');
      else setError('Impossible de joindre le serveur.');
    } finally {
      setParentLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('csb_token');
    localStorage.removeItem('csb_user');
    setUser(null);
    setEmail('');
    setPassword('');
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    try {
      const res = await api.post('/academic/classes', {
        name: newClassName.trim(),
        cycle: newClassCycle,
        inscriptionFee: Number(newClassInscriptionFee) || 0,
        tuitionFee: Number(newClassTuitionFee) || 0,
        yearName: selectedYear,
      });
      setNewClassName('');
      setSuccessMsg(`Classe "${res.data.name}" (${newClassCycle}) créée pour l'année ${selectedYear} !`);
      await loadClasses(selectedYear);
      await loadAccounting(selectedYear);
      setSelectedClassId(res.data.id);
    } catch {
      setError('Impossible de créer la classe.');
    }
  };

  const handleDeleteClass = async (cls: SchoolClass) => {
    if (!window.confirm(`Supprimer définitivement la classe "${cls.name}" et ses ${cls.students.length} élèves ?`)) return;
    setError('');
    setSuccessMsg('');
    try {
      await api.delete(`/academic/classes/${cls.id}`);
      setSuccessMsg(`Classe "${cls.name}" supprimée avec succès.`);
      setSelectedClassId('');
      await loadClasses(selectedYear);
      await loadAccounting(selectedYear);
    } catch {
      setError('Impossible de supprimer cette classe (vérifiez que le backend est à jour).');
    }
  };

  const handleResetClassCoefs = async () => {
    if (!currentClass) return;
    setError('');
    setSuccessMsg('');
    try {
      await api.post(`/academic/classes/${currentClass.id}/reset-coefs`);
      setSuccessMsg(`Tous les coefficients de la classe ${currentClass.name} ont été remis à 0 !`);
      await loadClasses(selectedYear);
    } catch {
      // Secours local immédiat même avant redéploiement backend
      setGradesMap((prev) => {
        const next: Record<string, GradeRecord> = {};
        Object.keys(prev).forEach((k) => {
          next[k] = { ...prev[k], coefficient: 0 };
        });
        return next;
      });
      setSuccessMsg('Coefficients remis à 0 à l’écran.');
    }
  };

  const handleInscribeOrUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!selectedClassId) {
      setError('Veuillez choisir une classe.');
      return;
    }
    try {
      if (editingStudentId) {
        const res = await api.put(`/academic/students/${editingStudentId}`, {
          matricule, lastName, firstName, birthDate, gender, isRepeating,
        });
        setSuccessMsg(`Informations de ${res.data.lastName} ${res.data.firstName} mises à jour !`);
        setEditingStudentId(null);
      } else {
        const res = await api.post('/academic/students', {
          matricule, lastName, firstName, birthDate, gender, isRepeating, classId: selectedClassId,
        });
        setSuccessMsg(`Élève ${res.data.lastName} ${res.data.firstName} inscrit avec succès (${selectedYear}) !`);
        setSelectedStudentId(res.data.id);
      }
      setMatricule('');
      setLastName('');
      setFirstName('');
      setIsRepeating(false);
      await loadClasses(selectedYear);
      await loadAccounting(selectedYear);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) setError(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    }
  };

  const startEditStudent = (st: Student) => {
    setEditingStudentId(st.id);
    setMatricule(st.matricule);
    setLastName(st.lastName);
    setFirstName(st.firstName);
    setBirthDate(st.birthDate ? st.birthDate.split('T')[0] : '2012-05-10');
    setGender(st.gender);
    setIsRepeating(st.isRepeating);
  };

  const handleDeleteStudent = async (st: Student) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer l'élève ${st.lastName} ${st.firstName} ?`)) return;
    try {
      await api.delete(`/academic/students/${st.id}`);
      setSuccessMsg(`Élève ${st.lastName} ${st.firstName} supprimé.`);
      await loadClasses(selectedYear);
      await loadAccounting(selectedYear);
    } catch {
      setError('Action réservée au Fondateur ou au Directeur.');
    }
  };

  const handleSaveClassFees = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeClassId) return;
    setError('');
    setSuccessMsg('');
    try {
      await api.put(`/accounting/classes/${feeClassId}/fees`, {
        cycle: feeCycle,
        inscriptionFee: Number(feeInscription) || 0,
        tuitionFee: Number(feeTuition) || 0,
      });
      setSuccessMsg('Tarifs et cycle de la classe enregistrés !');
      await loadClasses(selectedYear);
      await loadAccounting(selectedYear);
    } catch {
      setError('Veuillez vérifier que le serveur backend est bien redéployé sur Render.');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payStudentId || !payAmount) return;
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.post('/accounting/payments', {
        studentId: payStudentId,
        yearName: selectedYear,
        amount: Number(payAmount),
        paymentType: payType,
        paymentMethod: payMethod,
        note: payNote,
      });
      setPrintedReceipt(res.data);
      setPayAmount('');
      setPayNote('');
      setSuccessMsg(`Versement de ${Number(payAmount).toLocaleString()} FCFA enregistré !`);
      await loadAccounting(selectedYear);
    } catch {
      setError("Erreur lors de l'enregistrement du paiement.");
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expLabel || !expAmount) return;
    setError('');
    setSuccessMsg('');
    try {
      await api.post('/accounting/expenses', {
        yearName: selectedYear,
        label: expLabel,
        category: expCategory,
        amount: Number(expAmount),
        paymentMethod: expMethod,
        beneficiary: expBeneficiary,
        reference: expReference,
        expenseDate: expDate,
      });
      setExpLabel('');
      setExpAmount('');
      setExpBeneficiary('');
      setExpReference('');
      setSuccessMsg('Dépense enregistrée dans les Frais Généraux !');
      await loadAccounting(selectedYear);
    } catch {
      setError("Erreur lors de l'enregistrement de la dépense.");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Supprimer cette dépense des Frais Généraux ?')) return;
    try {
      await api.delete(`/accounting/expenses/${id}`);
      setSuccessMsg('Dépense supprimée.');
      await loadAccounting(selectedYear);
    } catch {
      setError('Suppression non autorisée.');
    }
  };

  const handleCreateOrUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      if (editingStaffId) {
        const res = await api.put(`/academic/staff/${editingStaffId}`, {
          fullName: staffName,
          email: staffEmail,
          password: staffPassword,
          role: staffRole,
          phone: staffPhone,
        });
        setSuccessMsg(`Coordonnées et accès de ${res.data.fullName} mis à jour !`);
        setEditingStaffId(null);
      } else {
        const res = await api.post('/academic/staff', {
          fullName: staffName,
          email: staffEmail,
          password: staffPassword,
          role: staffRole,
          phone: staffPhone,
        });
        setSuccessMsg(`Compte créé pour ${res.data.fullName} (${res.data.email}) !`);
      }
      setStaffName('');
      setStaffEmail('');
      setStaffPassword('');
      setStaffPhone('');
      await loadStaff();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) setError(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    }
  };

  const startEditStaff = (member: User) => {
    setEditingStaffId(member.id);
    setStaffName(member.fullName);
    setStaffEmail(member.email);
    setStaffPassword('');
    setStaffRole(member.role === 'SUPER_ADMIN' ? 'ADMIN' : member.role);
    setStaffPhone(member.phone || '');
    setError('');
    setSuccessMsg('');
  };

  const openAssignClassesModal = (member: User) => {
    setAssigningTeacher(member);
    const existingIds = (member.subjectsTaught || []).map((st) => st.subjectId);
    setSelectedSubjectIds(existingIds);
  };

  const handleSaveTeacherAssignments = async () => {
    if (!assigningTeacher) return;
    setError('');
    setSuccessMsg('');
    try {
      await api.post(`/academic/staff/${assigningTeacher.id}/assignments`, {
        subjectIds: selectedSubjectIds,
      });
      setSuccessMsg(`Classes et matières enregistrées pour ${assigningTeacher.fullName} !`);
      setAssigningTeacher(null);
      await loadStaff();
    } catch {
      setError("Erreur lors de l'attribution des classes.");
    }
  };

  const handleDeleteStaff = async (member: User) => {
    if (!window.confirm(`Supprimer l'accès de ${member.fullName} ?`)) return;
    try {
      await api.delete(`/academic/staff/${member.id}`);
      setSuccessMsg(`Accès de ${member.fullName} supprimé.`);
      await loadStaff();
    } catch {
      setError('Impossible de supprimer ce compte.');
    }
  };

  const updateLocalGrade = (
    subjectId: string,
    field: 'coefficient' | 'interrogation' | 'devoir1' | 'devoir2' | 'appreciation',
    value: string
  ) => {
    setGradesMap((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [field]:
          field === 'appreciation'
            ? value
            : field === 'coefficient'
            ? Math.max(0, parseFloat(value) || 0)
            : Math.min(20, Math.max(0, parseFloat(value) || 0)),
      },
    }));
  };

  const saveGradeRow = async (subjectId: string, lockAfterSave: boolean) => {
    if (!selectedStudentId) return;
    setError('');
    setSuccessMsg('');
    const row = gradesMap[subjectId];
    try {
      await api.post('/academic/grades/save', {
        studentId: selectedStudentId,
        subjectId,
        trimester,
        coefficient: row.coefficient,
        interrogation: row.interrogation,
        devoir1: row.devoir1,
        devoir2: row.devoir2,
        appreciation: row.appreciation,
        lockAfterSave,
      });
      setSuccessMsg(lockAfterSave ? 'Note et coefficient enregistrés et VERROUILLÉS !' : 'Brouillon enregistré.');
      await loadClasses(selectedYear);
      await loadStudentGrades(selectedStudentId, trimester);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) setError(err.response?.data?.message || 'Modification interdite.');
    }
  };

  const unlockGradeRow = async (gradeId?: string) => {
    if (!gradeId) return;
    try {
      await api.post(`/academic/grades/unlock/${gradeId}`);
      setSuccessMsg('Note déverrouillée par la Direction.');
      if (selectedStudentId) await loadStudentGrades(selectedStudentId, trimester);
    } catch {
      setError('Action réservée à la Direction.');
    }
  };

  if (!user) {
    if (portalMode === 'parent' && parentBulletin) {
      return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-6">
          <div className="max-w-4xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <button
              onClick={() => { setParentBulletin(null); setError(''); }}
              className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-[#0f294a] text-sm font-bold px-4 py-2 rounded-lg cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Changer de matricule
            </button>
            <div className="flex items-center gap-2">
              <select
                value={parentTrimester}
                onChange={(e) => {
                  const trim = e.target.value as 'T1' | 'T2' | 'T3';
                  setParentTrimester(trim);
                  fetchParentBulletin(parentBulletin.student.matricule, trim);
                }}
                className="border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm font-bold text-[#0f294a]"
              >
                <option value="T1">1er TRIMESTRE</option>
                <option value="T2">2ème TRIMESTRE</option>
                <option value="T3">3ème TRIMESTRE</option>
              </select>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 bg-[#0f294a] hover:bg-[#183d6d] text-white text-sm font-bold px-4 py-2 rounded-lg cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" /> Imprimer / PDF
              </button>
            </div>
          </div>

          <div className="bg-white max-w-4xl mx-auto p-6 border-2 border-black text-black font-sans text-xs shadow-lg">
            <div className="grid grid-cols-12 border-b-2 border-black pb-3 mb-3 items-center">
              <div className="col-span-8 flex items-start gap-3 border-r border-black pr-3">
                <img src="/logo-csb.png" alt="Logo" className="w-16 h-16 object-contain border border-slate-300" />
                <div className="text-center flex-1 leading-tight">
                  <p className="font-bold text-[11px] uppercase">REPUBLIQUE DU BENIN</p>
                  <p className="font-extrabold text-[13px] uppercase">COMPLEXE SCOLAIRE BILINGUE PHILADELPHIA</p>
                  <p className="italic text-[11px]">Sis à Golo-Lohoussa (Abomey-Calavi)</p>
                  <p className="text-[11px] font-medium mt-0.5">09 BP : 238 Cotonou</p>
                  <p className="text-[11px]">Tél : 01 97 95 75 63 / 01 61 31 99 68</p>
                  <p className="text-[11px] underline">e-mail : philavin2@gmail.com</p>
                </div>
              </div>
              <div className="col-span-4 pl-3 text-center">
                <div className="border border-black py-1.5 px-2 font-extrabold text-sm uppercase bg-slate-100">
                  BULLETIN DE NOTES
                </div>
                <div className="mt-3 text-xs font-bold">
                  Année scolaire : <span className="underline">{selectedYear}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 mb-3 text-xs">
              <div className="flex justify-between">
                <span>Nom et Prénoms : <strong className="uppercase">{parentBulletin.student.lastName} {parentBulletin.student.firstName}</strong></span>
                <span>Matricule : <strong>{parentBulletin.student.matricule}</strong></span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Classe : {parentBulletin.student.className}</span>
                <span>Effectif : {parentBulletin.student.classSize}</span>
                <span className="uppercase font-extrabold">
                  {parentBulletin.trimester === 'T1' ? '1er TRIMESTRE' : parentBulletin.trimester === 'T2' ? '2ème TRIMESTRE' : '3ème TRIMESTRE'}
                </span>
              </div>
            </div>

            <table className="w-full border-collapse border border-black text-[11px]">
              <thead>
                <tr className="bg-slate-100 font-bold text-center">
                  <th className="border border-black p-1.5 text-left w-44">DISCIPLINES</th>
                  <th className="border border-black p-1 w-10">COEF</th>
                  <th className="border border-black p-1 w-14">Moy. Des Inter</th>
                  <th className="border border-black p-1 w-12">Dev 1</th>
                  <th className="border border-black p-1 w-12">Dev 2</th>
                  <th className="border border-black p-1 w-14">Moy Trim</th>
                  <th className="border border-black p-1 w-14">Moy Coef</th>
                  <th className="border border-black p-1">App. des Prof</th>
                </tr>
              </thead>
              <tbody>
                {parentBulletin.rows.map((row) => (
                  <tr key={row.id} className="text-center">
                    <td className="border border-black px-1.5 py-1 text-left font-semibold">{row.name}</td>
                    <td className="border border-black p-1 font-bold">{row.coefficient}</td>
                    <td className="border border-black p-1">{row.interrogation.toFixed(2)}</td>
                    <td className="border border-black p-1">{row.devoir1.toFixed(2)}</td>
                    <td className="border border-black p-1">{row.devoir2.toFixed(2)}</td>
                    <td className="border border-black p-1 font-bold">{row.moyTrim.toFixed(2)}</td>
                    <td className="border border-black p-1 font-bold">{row.moyCoef.toFixed(2)}</td>
                    <td className="border border-black px-1.5 py-1 text-left italic">{row.appreciation}</td>
                  </tr>
                ))}
                <tr className="font-extrabold bg-slate-100 text-center">
                  <td className="border border-black px-1.5 py-1.5 text-left">TOTAL</td>
                  <td className="border border-black p-1.5">{parentBulletin.totalCoef}</td>
                  <td className="border border-black p-1.5 bg-slate-200" colSpan={4}></td>
                  <td className="border border-black p-1.5">{parentBulletin.totalMoyCoef}</td>
                  <td className="border border-black p-1.5 bg-slate-200"></td>
                </tr>
              </tbody>
            </table>

            <div className="border-x border-b border-black p-2 flex justify-between font-extrabold text-sm bg-slate-50">
              <span>Moyenne Trimestrielle</span>
              <span>{parentBulletin.moyenneTrimestrielle} / 20</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          <div className="bg-[#0f294a] text-white p-6 text-center border-b-4 border-amber-500">
            <img src="/logo-csb.png" alt="Logo CSB" className="w-20 h-20 object-contain mx-auto mb-3 bg-white rounded-full p-1.5 shadow" />
            <p className="text-[11px] tracking-widest text-amber-300 font-semibold">REPUBLIQUE DU BENIN</p>
            <h1 className="text-lg font-extrabold uppercase mt-0.5">COMPLEXE SCOLAIRE BILINGUE PHILADELPHIA</h1>
            <p className="text-xs text-slate-300 mt-1">Sis à Golo-Lohoussa (Abomey-Calavi) — 09 BP : 238 Cotonou</p>
            <p className="text-xs text-amber-400 font-medium mt-0.5">Tél : 01 97 95 75 63 / 01 61 31 99 68 • philavin2@gmail.com</p>
          </div>

          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setPortalMode('staff'); setError(''); }}
              className={`py-3 px-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                portalMode === 'staff' ? 'bg-white text-[#0f294a] border-b-2 border-[#0f294a]' : 'text-slate-500'
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Espace Personnel
            </button>
            <button
              type="button"
              onClick={() => { setPortalMode('parent'); setError(''); }}
              className={`py-3 px-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                portalMode === 'parent' ? 'bg-white text-[#0f294a] border-b-2 border-amber-500' : 'text-slate-500'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-amber-600" /> Espace Parents
            </button>
          </div>

          {portalMode === 'staff' ? (
            <form onSubmit={handleLogin} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border-l-4 border-red-600 p-3 rounded text-sm text-red-700">{error}</div>}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email de connexion</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mot de passe</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#0f294a] hover:bg-[#183d6d] text-white font-bold py-2.5 px-4 rounded-lg cursor-pointer">
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); fetchParentBulletin(parentMatricule, parentTrimester); }} className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
                Saisissez le <strong>numéro matricule</strong> de votre enfant pour consulter et imprimer son bulletin officiel.
              </div>
              {error && <div className="bg-red-50 border-l-4 border-red-600 p-3 rounded text-sm text-red-700">{error}</div>}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Numéro Matricule *</label>
                <input type="text" required placeholder="Ex: PHIL26-6e-001" value={parentMatricule} onChange={(e) => setParentMatricule(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Trimestre</label>
                <select value={parentTrimester} onChange={(e) => setParentTrimester(e.target.value as 'T1' | 'T2' | 'T3')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-[#0f294a]">
                  <option value="T1">1er TRIMESTRE</option>
                  <option value="T2">2ème TRIMESTRE</option>
                  <option value="T3">3ème TRIMESTRE</option>
                </select>
              </div>
              <button type="submit" disabled={parentLoading} className="w-full bg-amber-500 hover:bg-amber-600 text-[#0f294a] font-extrabold py-2.5 px-4 rounded-lg cursor-pointer">
                {parentLoading ? 'Recherche...' : 'Consulter le bulletin'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const subjects = sortSubjectsOfficial(currentClass?.subjects || []);
  const bulletinRows = subjects.map((s) => {
    const g = gradesMap[s.id] || { coefficient: 0, interrogation: 0, devoir1: 0, devoir2: 0, appreciation: '' };
    const coef = g.coefficient ?? 0;
    const moyDev = (g.devoir1 + g.devoir2) / 2;
    const moyTrim = Number(((g.interrogation + 2 * moyDev) / 3).toFixed(2));
    const moyCoef = Number((moyTrim * coef).toFixed(2));
    return { ...s, ...g, coefficient: coef, moyTrim, moyCoef };
  });

  const totalCoef = bulletinRows.reduce((acc, r) => acc + r.coefficient, 0);
  const totalMoyCoef = Number(bulletinRows.reduce((acc, r) => acc + r.moyCoef, 0).toFixed(2));
  const moyenneTrimestrielle = totalCoef > 0 ? Number((totalMoyCoef / totalCoef).toFixed(2)) : 0;

  const effectiveClasses: SchoolClass[] =
    accountingData?.classes && accountingData.classes.length > 0 ? accountingData.classes : classes;

  const allAccountingStudents = effectiveClasses.flatMap((cls) =>
    cls.students.map((st) => {
      const due = (cls.inscriptionFee || 0) + (cls.tuitionFee || 0);
      const paid = (st.payments || []).reduce((acc, p) => acc + p.amount, 0);
      return {
        ...st,
        classId: cls.id,
        className: cls.name,
        cycle: cls.cycle || 'SECONDAIRE',
        due,
        paid,
        remaining: Math.max(0, due - paid),
      };
    })
  );

  const filteredAccountingStudents = allAccountingStudents.filter((st) => {
    const matchesCycle = cycleFilter === 'ALL' || st.cycle === cycleFilter;
    const q = searchAccounting.toLowerCase();
    return matchesCycle && (!q || st.matricule.toLowerCase().includes(q) || st.lastName.toLowerCase().includes(q) || st.firstName.toLowerCase().includes(q) || st.className.toLowerCase().includes(q));
  });

  const computedClassStats = effectiveClasses.map((cls) => {
    const count = cls.students.length;
    const boys = cls.students.filter((s) => s.gender === 'M').length;
    const girls = cls.students.filter((s) => s.gender === 'F').length;
    const expected = count * ((cls.tuitionFee || 0) + (cls.inscriptionFee || 0));
    const collected = cls.students.reduce((sum, st) => sum + (st.payments || []).reduce((pSum, p) => pSum + p.amount, 0), 0);
    return {
      id: cls.id, name: cls.name, cycle: cls.cycle || 'SECONDAIRE', studentCount: count, boys, girls, expected, collected, remaining: Math.max(0, expected - collected),
    };
  });

  const statsSummary = {
    totalStudents: computedClassStats.reduce((s, c) => s + c.studentCount, 0),
    primaireStudents: computedClassStats.filter((c) => c.cycle === 'PRIMAIRE').reduce((s, c) => s + c.studentCount, 0),
    secondaireStudents: computedClassStats.filter((c) => c.cycle !== 'PRIMAIRE').reduce((s, c) => s + c.studentCount, 0),
    boysCount: computedClassStats.reduce((s, c) => s + c.boys, 0),
    girlsCount: computedClassStats.reduce((s, c) => s + c.girls, 0),
    totalCollectedRevenue: computedClassStats.reduce((s, c) => s + c.collected, 0),
    totalExpenses: accountingData?.stats.totalExpenses || 0,
    netBalance: computedClassStats.reduce((s, c) => s + c.collected, 0) - (accountingData?.stats.totalExpenses || 0),
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-[#0f294a] text-white flex flex-col justify-between print:hidden">
        <div>
          <div className="p-4 border-b border-slate-700 flex items-center gap-3">
            <img src="/logo-csb.png" alt="Logo CSB" className="w-12 h-12 object-contain bg-white rounded-full p-1 shrink-0" />
            <div>
              <h2 className="font-bold text-xs leading-tight">CSB PHILADELPHIA</h2>
              <p className="text-[10px] text-amber-400 mt-0.5">{user.role}</p>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-slate-700 bg-[#0a1d36]">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-amber-300 mb-1">
              <Calendar className="w-3.5 h-3.5" /> Année Scolaire
            </label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full bg-[#163863] text-white border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-bold">
              {ACADEMIC_YEARS.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
            </select>
          </div>

          <nav className="p-3 flex md:flex-col gap-1.5 overflow-x-auto">
            {canInscribe && (
              <button onClick={() => setActiveTab('inscription')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap cursor-pointer ${activeTab === 'inscription' ? 'bg-amber-500 text-[#0f294a] font-bold' : 'text-slate-300 hover:bg-white/10'}`}>
                <UserPlus className="w-4 h-4" /> Inscriptions & Classes
              </button>
            )}
            {user.role !== 'ACCOUNTANT' && (
              <button onClick={() => setActiveTab('grades')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap cursor-pointer ${activeTab === 'grades' ? 'bg-amber-500 text-[#0f294a] font-bold' : 'text-slate-300 hover:bg-white/10'}`}>
                <BookOpen className="w-4 h-4" /> Saisie des Notes
              </button>
            )}
            {user.role !== 'TEACHER' && user.role !== 'ACCOUNTANT' && (
              <button onClick={() => setActiveTab('bulletins')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap cursor-pointer ${activeTab === 'bulletins' ? 'bg-amber-500 text-[#0f294a] font-bold' : 'text-slate-300 hover:bg-white/10'}`}>
                <FileText className="w-4 h-4" /> Bulletin Officiel
              </button>
            )}
            {(canAccessAccounting || user.role === 'SECRETARY') && (
              <button onClick={() => setActiveTab('frmInscription')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap cursor-pointer ${activeTab === 'frmInscription' ? 'bg-amber-500 text-[#0f294a] font-bold' : 'text-slate-300 hover:bg-white/10'}`}>
                <Wallet className="w-4 h-4" /> frmInscription (Scolarité)
              </button>
            )}
            {canAccessAccounting && (
              <button onClick={() => setActiveTab('fraisGeneraux')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap cursor-pointer ${activeTab === 'fraisGeneraux' ? 'bg-amber-500 text-[#0f294a] font-bold' : 'text-slate-300 hover:bg-white/10'}`}>
                <Receipt className="w-4 h-4" /> Frais Généraux
              </button>
            )}
            {(canAccessAccounting || user.role === 'SECRETARY') && (
              <button onClick={() => setActiveTab('stats')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap cursor-pointer ${activeTab === 'stats' ? 'bg-amber-500 text-[#0f294a] font-bold' : 'text-slate-300 hover:bg-white/10'}`}>
                <BarChart3 className="w-4 h-4" /> Statistiques & Effectifs
              </button>
            )}
            {isDirection && (
              <button onClick={() => setActiveTab('staff')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap cursor-pointer ${activeTab === 'staff' ? 'bg-amber-500 text-[#0f294a] font-bold' : 'text-slate-300 hover:bg-white/10'}`}>
                <ShieldCheck className="w-4 h-4" /> Équipe & Enseignants
              </button>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-700">
          <p className="text-xs font-semibold truncate mb-2">{user.fullName}</p>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold cursor-pointer">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        {error && <div className="mb-4 bg-red-50 border-l-4 border-red-600 p-3 rounded flex items-center gap-2 text-sm text-red-700 print:hidden"><AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span></div>}
        {successMsg && <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded flex items-center gap-2 text-sm text-emerald-800 print:hidden"><CheckCircle2 className="w-5 h-5 shrink-0" /><span>{successMsg}</span></div>}

        {(activeTab === 'inscription' || activeTab === 'grades' || activeTab === 'bulletins') && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-wrap gap-4 items-center justify-between print:hidden">
            <div className="flex flex-wrap gap-3 items-center">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase">
                  {user.role === 'TEACHER' ? 'Mes Classes Attribuées' : `Classe (${selectedYear})`}
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setSelectedClassId(cid);
                    const cls = classes.find((c) => c.id === cid);
                    setSelectedStudentId(cls?.students[0]?.id || '');
                  }}
                  className="border rounded-lg px-3 py-1.5 text-sm font-semibold text-[#0f294a]"
                >
                  {classes.map((c) => <option key={c.id} value={c.id}>[{c.cycle || 'SECONDAIRE'}] {c.name} ({c.students.length} élèves)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Élève</label>
                <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm font-semibold text-[#0f294a]">
                  {currentClass?.students.map((s) => <option key={s.id} value={s.id}>{s.lastName} {s.firstName} ({s.matricule})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Trimestre</label>
                <select value={trimester} onChange={(e) => setTrimester(e.target.value as 'T1' | 'T2' | 'T3')} className="border rounded-lg px-3 py-1.5 text-sm font-semibold text-[#0f294a]">
                  <option value="T1">1er TRIMESTRE</option>
                  <option value="T2">2ème TRIMESTRE</option>
                  <option value="T3">3ème TRIMESTRE</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 1 : INSCRIPTION & CLASSES (AVEC SUPPRESSION DE CLASSE) */}
        {activeTab === 'inscription' && canInscribe && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg text-[#0f294a] mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                {editingStudentId ? `Modifier : ${lastName} ${firstName}` : `Inscrire un Élève en : ${currentClass?.name || ''} (${selectedYear})`}
              </h3>
              <form onSubmit={handleInscribeOrUpdateStudent} className="space-y-4 text-sm">
                <div>
                  <label className="block font-semibold mb-1">Numéro Matricule *</label>
                  <input type="text" required placeholder="Ex: PHIL26-6e-001" value={matricule} onChange={(e) => setMatricule(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Nom *</label>
                    <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border rounded-lg px-3 py-2 uppercase" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Prénoms *</label>
                    <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Date de naissance *</label>
                    <input type="date" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Sexe *</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                      <option value="F">Féminin (F)</option>
                      <option value="M">Masculin (M)</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="repeat" checked={isRepeating} onChange={(e) => setIsRepeating(e.target.checked)} />
                  <label htmlFor="repeat" className="font-medium">Élève Redoublant(e)</label>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-[#0f294a] hover:bg-[#183d6d] text-white font-bold py-2.5 rounded-lg cursor-pointer">
                    {editingStudentId ? 'Enregistrer les modifications' : "Enregistrer l'inscription"}
                  </button>
                  {editingStudentId && (
                    <button type="button" onClick={() => { setEditingStudentId(null); setMatricule(''); setLastName(''); setFirstName(''); }} className="px-4 py-2.5 border rounded-lg font-semibold cursor-pointer">Annuler</button>
                  )}
                </div>
              </form>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-base text-[#0f294a] mb-3 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-emerald-600" /> Ouvrir une classe ({selectedYear})
                </h3>
                <form onSubmit={handleCreateClass} className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Cycle *</label>
                      <select value={newClassCycle} onChange={(e) => setNewClassCycle(e.target.value as 'PRIMAIRE' | 'SECONDAIRE')} className="w-full border rounded-lg px-3 py-2">
                        <option value="PRIMAIRE">PRIMAIRE (CI - CM2)</option>
                        <option value="SECONDAIRE">SECONDAIRE (6ème - Tle)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Nom de la classe *</label>
                      <input type="text" required placeholder="Ex: CI, 6ème, 3ème..." value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Frais Inscription (FCFA)</label>
                      <input type="number" value={newClassInscriptionFee} onChange={(e) => setNewClassInscriptionFee(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Scolarité Annuelle (FCFA)</label>
                      <input type="number" value={newClassTuitionFee} onChange={(e) => setNewClassTuitionFee(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-sm cursor-pointer">
                    Créer la classe pour {selectedYear}
                  </button>
                </form>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="font-bold text-base text-[#0f294a] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#0f294a]" /> Inscrits en {currentClass?.name} ({currentClass?.students.length || 0})
                  </h3>
                  {isDirection && currentClass && (
                    <button
                      onClick={() => handleDeleteClass(currentClass)}
                      className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer cette classe
                    </button>
                  )}
                </div>
                <ul className="divide-y text-sm">
                  {currentClass?.students.map((st) => (
                    <li key={st.id} className="py-2.5 flex justify-between items-center gap-2">
                      <div>
                        <strong className="font-mono text-xs text-slate-500 mr-2">{st.matricule}</strong>
                        <strong>{st.lastName}</strong> {st.firstName} ({st.gender})
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => startEditStudent(st)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"><Edit3 className="w-4 h-4" /></button>
                        {isDirection && <button onClick={() => handleDeleteStudent(st)} className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 2 : SAISIE DES NOTES & COEFFICIENTS */}
        {activeTab === 'grades' && (
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-lg text-[#0f294a]">
                  Saisie des Notes & Coefficients — {currentStudent?.lastName} {currentStudent?.firstName}
                </h3>
                <p className="text-xs text-slate-500">
                  {user.role === 'TEACHER'
                    ? 'Espace enseignant : saisissez le coefficient et les notes uniquement pour vos matières attribuées.'
                    : `Chaque enseignant saisit le coefficient de sa matière (${currentClass?.name}).`}
                </p>
              </div>
              {isDirection && currentClass && (
                <button
                  onClick={handleResetClassCoefs}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  Mettre tous les coefs à 0
                </button>
              )}
            </div>

            {subjects.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-sm text-amber-900">
                Aucune matière attribuée sur cette classe pour le moment. Contactez la Direction pour qu'elle vous attribue vos classes et matières dans <strong>Équipe & Enseignants</strong>.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase border-b">
                      <th className="py-2 px-2">Discipline</th>
                      <th className="py-2 px-2 text-center">Coef</th>
                      <th className="py-2 px-2 text-center">Interro</th>
                      <th className="py-2 px-2 text-center">Dev 1</th>
                      <th className="py-2 px-2 text-center">Dev 2</th>
                      <th className="py-2 px-2">Appréciation</th>
                      <th className="py-2 px-2 text-center">Action / Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {subjects.map((subj) => {
                      const g = gradesMap[subj.id] || { coefficient: 0, interrogation: 0, devoir1: 0, devoir2: 0, appreciation: '', status: 'DRAFT' };
                      const isLocked = g.status === 'LOCKED' || g.status === 'VALIDATED';
                      const readOnly = isLocked && !isDirection;

                      return (
                        <tr key={subj.id} className={isLocked ? 'bg-slate-50' : ''}>
                          <td className="py-2 px-2 font-semibold text-[#0f294a]">{subj.name}</td>
                          <td className="py-2 px-2 text-center">
                            <input type="number" step="1" min="0" disabled={readOnly} value={g.coefficient} onChange={(e) => updateLocalGrade(subj.id, 'coefficient', e.target.value)} className="w-14 border border-amber-400 bg-amber-50/40 font-bold text-[#0f294a] rounded px-1 py-1 text-center disabled:bg-slate-200" />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input type="number" step="0.25" disabled={readOnly} value={g.interrogation} onChange={(e) => updateLocalGrade(subj.id, 'interrogation', e.target.value)} className="w-16 border rounded px-1 py-1 text-center disabled:bg-slate-200" />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input type="number" step="0.25" disabled={readOnly} value={g.devoir1} onChange={(e) => updateLocalGrade(subj.id, 'devoir1', e.target.value)} className="w-16 border rounded px-1 py-1 text-center disabled:bg-slate-200" />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input type="number" step="0.25" disabled={readOnly} value={g.devoir2} onChange={(e) => updateLocalGrade(subj.id, 'devoir2', e.target.value)} className="w-16 border rounded px-1 py-1 text-center disabled:bg-slate-200" />
                          </td>
                          <td className="py-2 px-2">
                            <input type="text" disabled={readOnly} placeholder="Bien, Très Bien..." value={g.appreciation} onChange={(e) => updateLocalGrade(subj.id, 'appreciation', e.target.value)} className="w-28 border rounded px-2 py-1 disabled:bg-slate-200" />
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            {isLocked ? (
                              <div className="inline-flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded"><Lock className="w-3 h-3" /> Verrouillé</span>
                                {isDirection && (
                                  <>
                                    <button onClick={() => saveGradeRow(subj.id, true)} className="p-1 bg-[#0f294a] text-white rounded cursor-pointer"><Save className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => unlockGradeRow(g.id)} className="p-1 bg-emerald-600 text-white rounded cursor-pointer"><Unlock className="w-3.5 h-3.5" /></button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <button onClick={() => saveGradeRow(subj.id, true)} className="inline-flex items-center gap-1 bg-[#0f294a] hover:bg-[#183d6d] text-white text-xs font-bold px-2.5 py-1 rounded cursor-pointer">
                                <Save className="w-3 h-3 text-amber-400" /> Valider & Verrouiller
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ONGLET 3 : BULLETIN OFFICIEL */}
        {activeTab === 'bulletins' && currentStudent && (
          <div className="space-y-4">
            <div className="flex justify-end print:hidden">
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-[#0f294a] text-white text-sm font-bold px-4 py-2 rounded-lg cursor-pointer">
                <Printer className="w-4 h-4 text-amber-400" /> Imprimer / PDF
              </button>
            </div>

            <div className="bg-white max-w-4xl mx-auto p-6 border-2 border-black text-black font-sans text-xs">
              <div className="grid grid-cols-12 border-b-2 border-black pb-3 mb-3 items-center">
                <div className="col-span-8 flex items-start gap-3 border-r border-black pr-3">
                  <img src="/logo-csb.png" alt="Logo" className="w-16 h-16 object-contain border border-slate-300" />
                  <div className="text-center flex-1 leading-tight">
                    <p className="font-bold text-[11px] uppercase">REPUBLIQUE DU BENIN</p>
                    <p className="font-extrabold text-[13px] uppercase">COMPLEXE SCOLAIRE BILINGUE PHILADELPHIA</p>
                    <p className="italic text-[11px]">Sis à Golo-Lohoussa (Abomey-Calavi)</p>
                    <p className="text-[11px] font-medium mt-0.5">09 BP : 238 Cotonou</p>
                    <p className="text-[11px]">Tél : 01 97 95 75 63 / 01 61 31 99 68</p>
                    <p className="text-[11px] underline">e-mail : philavin2@gmail.com</p>
                  </div>
                </div>
                <div className="col-span-4 pl-3 text-center">
                  <div className="border border-black py-1.5 px-2 font-extrabold text-sm uppercase bg-slate-100">BULLETIN DE NOTES</div>
                  <div className="mt-3 text-xs font-bold">Année scolaire : <span className="underline">{selectedYear}</span></div>
                </div>
              </div>

              <div className="space-y-1.5 mb-3 text-xs">
                <div className="flex justify-between">
                  <span>Nom et Prénoms : <strong className="uppercase">{currentStudent.lastName} {currentStudent.firstName}</strong></span>
                  <span>Matricule : <strong>{currentStudent.matricule}</strong></span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Classe : {currentClass?.name}</span>
                  <span>Effectif : {currentClass?.students.length}</span>
                  <span className="uppercase font-extrabold">{trimester === 'T1' ? '1er TRIMESTRE' : trimester === 'T2' ? '2ème TRIMESTRE' : '3ème TRIMESTRE'}</span>
                </div>
              </div>

              <table className="w-full border-collapse border border-black text-[11px]">
                <thead>
                  <tr className="bg-slate-100 font-bold text-center">
                    <th className="border border-black p-1.5 text-left w-44">DISCIPLINES</th>
                    <th className="border border-black p-1 w-10">COEF</th>
                    <th className="border border-black p-1 w-14">Moy. Des Inter</th>
                    <th className="border border-black p-1 w-12">Dev 1</th>
                    <th className="border border-black p-1 w-12">Dev 2</th>
                    <th className="border border-black p-1 w-14">Moy Trim</th>
                    <th className="border border-black p-1 w-14">Moy Coef</th>
                    <th className="border border-black p-1">App. des Prof</th>
                  </tr>
                </thead>
                <tbody>
                  {bulletinRows.map((row) => (
                    <tr key={row.id} className="text-center">
                      <td className="border border-black px-1.5 py-1 text-left font-semibold">{row.name}</td>
                      <td className="border border-black p-1 font-bold">{row.coefficient}</td>
                      <td className="border border-black p-1">{row.interrogation.toFixed(2)}</td>
                      <td className="border border-black p-1">{row.devoir1.toFixed(2)}</td>
                      <td className="border border-black p-1">{row.devoir2.toFixed(2)}</td>
                      <td className="border border-black p-1 font-bold">{row.moyTrim.toFixed(2)}</td>
                      <td className="border border-black p-1 font-bold">{row.moyCoef.toFixed(2)}</td>
                      <td className="border border-black px-1.5 py-1 text-left italic">{row.appreciation}</td>
                    </tr>
                  ))}
                  <tr className="font-extrabold bg-slate-100 text-center">
                    <td className="border border-black px-1.5 py-1.5 text-left">TOTAL</td>
                    <td className="border border-black p-1.5">{totalCoef}</td>
                    <td className="border border-black p-1.5 bg-slate-200" colSpan={4}></td>
                    <td className="border border-black p-1.5">{totalMoyCoef}</td>
                    <td className="border border-black p-1.5 bg-slate-200"></td>
                  </tr>
                </tbody>
              </table>

              <div className="border-x border-b border-black p-2 flex justify-between font-extrabold text-sm bg-slate-50">
                <span>Moyenne Trimestrielle</span>
                <span>{moyenneTrimestrielle} / 20</span>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 4 : frmInscription */}
        {activeTab === 'frmInscription' && (
          <div className="space-y-6">
            {printedReceipt && (
              <div className="bg-white max-w-lg mx-auto p-5 border-2 border-black text-xs space-y-2 shadow-md">
                <div className="flex justify-between items-center border-b border-black pb-2">
                  <div>
                    <p className="font-extrabold uppercase">CSB PHILADELPHIA</p>
                    <p className="text-[11px]">REÇU DE PAIEMENT — {selectedYear}</p>
                  </div>
                  <strong className="font-mono">{printedReceipt.receiptNumber}</strong>
                </div>
                <p>Élève : <strong>{printedReceipt.student?.lastName} {printedReceipt.student?.firstName}</strong> ({printedReceipt.student?.matricule})</p>
                <p>Classe : <strong>{printedReceipt.student?.class?.name}</strong> • Motif : <strong>{printedReceipt.paymentType}</strong></p>
                <p className="text-sm font-extrabold">Montant versé : {Number(printedReceipt.amount).toLocaleString()} FCFA ({printedReceipt.paymentMethod})</p>
                <div className="flex justify-end gap-2 pt-2 print:hidden">
                  <button onClick={() => window.print()} className="bg-[#0f294a] text-white px-3 py-1 rounded font-bold cursor-pointer">Imprimer le reçu</button>
                  <button onClick={() => setPrintedReceipt(null)} className="border px-3 py-1 rounded cursor-pointer">Fermer</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg text-[#0f294a] mb-3 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-600" /> frmInscription — Encaisser un versement ({selectedYear})
                </h3>
                <form onSubmit={handleRecordPayment} className="space-y-3 text-sm">
                  <div>
                    <label className="block font-semibold mb-1">Élève inscrit ({allAccountingStudents.length}) *</label>
                    <select required value={payStudentId} onChange={(e) => setPayStudentId(e.target.value)} className="w-full border rounded-lg px-3 py-2 font-semibold text-[#0f294a]">
                      <option value="">-- Sélectionner un élève --</option>
                      {allAccountingStudents.map((st) => (
                        <option key={st.id} value={st.id}>
                          [{st.cycle} - {st.className}] {st.lastName} {st.firstName} ({st.matricule}) — Reste: {st.remaining.toLocaleString()} F
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Montant versé (FCFA) *</label>
                      <input type="number" required min="100" placeholder="Ex: 25000" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full border rounded-lg px-3 py-2 font-bold" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Mode de paiement</label>
                      <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                        <option value="ESPECES">Espèces (Caisse)</option>
                        <option value="MTN_MOMO">MTN MoMo</option>
                        <option value="MOOV_MONEY">Moov Money</option>
                        <option value="VIREMENT">Virement / Chèque</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Libellé / Tranche</label>
                    <select value={payType} onChange={(e) => setPayType(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                      <option value="FRAIS D'INSCRIPTION">Frais d'Inscription</option>
                      <option value="SCOLARITE - 1ERE TRANCHE">Scolarité — 1ère Tranche</option>
                      <option value="SCOLARITE - 2EME TRANCHE">Scolarité — 2ème Tranche</option>
                      <option value="SCOLARITE - 3EME TRANCHE">Scolarité — 3ème Tranche</option>
                      <option value="SOLDE COMPLET">Solde Complet</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg cursor-pointer">
                    Valider le paiement & Générer le reçu
                  </button>
                </form>
              </div>

              {canAccessAccounting && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-base text-[#0f294a] mb-3">Tarifs & Cycle par classe ({selectedYear})</h3>
                  <form onSubmit={handleSaveClassFees} className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">Classe</label>
                        <select
                          value={feeClassId}
                          onChange={(e) => {
                            const cls = effectiveClasses.find((c) => c.id === e.target.value);
                            setFeeClassId(e.target.value);
                            if (cls) {
                              setFeeCycle(cls.cycle || 'SECONDAIRE');
                              setFeeInscription(String(cls.inscriptionFee || 0));
                              setFeeTuition(String(cls.tuitionFee || 0));
                            }
                          }}
                          className="w-full border rounded-lg px-3 py-2 font-semibold"
                        >
                          {effectiveClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Cycle</label>
                        <select value={feeCycle} onChange={(e) => setFeeCycle(e.target.value as 'PRIMAIRE' | 'SECONDAIRE')} className="w-full border rounded-lg px-3 py-2">
                          <option value="PRIMAIRE">PRIMAIRE</option>
                          <option value="SECONDAIRE">SECONDAIRE</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">Frais Inscription (FCFA)</label>
                        <input type="number" value={feeInscription} onChange={(e) => setFeeInscription(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Scolarité Annuelle (FCFA)</label>
                        <input type="number" value={feeTuition} onChange={(e) => setFeeTuition(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-[#0f294a] hover:bg-[#183d6d] text-white font-bold py-2 rounded-lg cursor-pointer">
                      Enregistrer les tarifs de la classe
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="font-bold text-base text-[#0f294a]">
                  Suivi en direct des élèves inscrits ({filteredAccountingStudents.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  <select value={cycleFilter} onChange={(e) => setCycleFilter(e.target.value as 'ALL' | 'PRIMAIRE' | 'SECONDAIRE')} className="border rounded-lg px-3 py-1.5 text-xs font-bold">
                    <option value="ALL">Tous les cycles (Primaire + Secondaire)</option>
                    <option value="PRIMAIRE">Cycle Primaire uniquement</option>
                    <option value="SECONDAIRE">Cycle Secondaire uniquement</option>
                  </select>
                  <input type="text" placeholder="Rechercher nom, matricule..." value={searchAccounting} onChange={(e) => setSearchAccounting(e.target.value)} className="border rounded-lg px-3 py-1.5 text-xs" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase border-b">
                      <th className="p-2">Matricule</th>
                      <th className="p-2">Élève</th>
                      <th className="p-2">Cycle / Classe</th>
                      <th className="p-2 text-right">Total Dû</th>
                      <th className="p-2 text-right">Payé</th>
                      <th className="p-2 text-right">Reste à Payer</th>
                      <th className="p-2 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAccountingStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50">
                        <td className="p-2 font-mono">{st.matricule}</td>
                        <td className="p-2 font-bold text-[#0f294a]">{st.lastName} {st.firstName}</td>
                        <td className="p-2"><span className="px-2 py-0.5 rounded bg-slate-200 font-semibold mr-1">{st.cycle}</span>{st.className}</td>
                        <td className="p-2 text-right">{st.due.toLocaleString()} F</td>
                        <td className="p-2 text-right font-bold text-emerald-700">{st.paid.toLocaleString()} F</td>
                        <td className="p-2 text-right font-bold text-red-600">{st.remaining.toLocaleString()} F</td>
                        <td className="p-2 text-center">
                          {st.remaining === 0 && st.due > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">SOLDÉ</span>
                          ) : (
                            <button onClick={() => setPayStudentId(st.id)} className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold cursor-pointer hover:bg-amber-200">Encaisser</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 5 : FRAIS GÉNÉRAUX */}
        {activeTab === 'fraisGeneraux' && canAccessAccounting && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg text-[#0f294a] mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-600" /> Enregistrer un Frais Général ({selectedYear})
              </h3>
              <form onSubmit={handleRecordExpense} className="space-y-3 text-sm">
                <div>
                  <label className="block font-semibold mb-1">Catégorie de dépense *</label>
                  <select value={expCategory} onChange={(e) => setExpCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                    <option value="SALAIRES & VACATIONS">Salaires & Vacations Enseignants</option>
                    <option value="FOURNITURES & PEDAGOGIE">Fournitures, Craies & Imprimerie</option>
                    <option value="EAU & ELECTRICITE">Eau & Électricité (SBEE / SONEB)</option>
                    <option value="ENTRETIEN & REPARATIONS">Entretien & Réparations Bâtiments</option>
                    <option value="ADMINISTRATION & DIVERS">Administration & Frais Divers</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Libellé exact *</label>
                  <input type="text" required placeholder="Ex: Achat cartons de craies" value={expLabel} onChange={(e) => setExpLabel(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Montant (FCFA) *</label>
                    <input type="number" required min="1" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} className="w-full border rounded-lg px-3 py-2 font-bold" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Date *</label>
                    <input type="date" required value={expDate} onChange={(e) => setExpDate(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Bénéficiaire</label>
                    <input type="text" value={expBeneficiary} onChange={(e) => setExpBeneficiary(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Mode règlement</label>
                    <select value={expMethod} onChange={(e) => setExpMethod(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                      <option value="ESPECES">Espèces</option>
                      <option value="MOBILE_MONEY">Mobile Money</option>
                      <option value="CHEQUE_VIREMENT">Chèque / Virement</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-[#0f294a] hover:bg-[#183d6d] text-white font-bold py-2.5 rounded-lg cursor-pointer">
                  Enregistrer la dépense
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                <h3 className="font-bold text-base text-[#0f294a]">Journal des Frais Généraux ({selectedYear})</h3>
                <div className="text-sm font-extrabold text-red-700 bg-red-50 px-3 py-1 rounded-lg">
                  Total Frais Généraux : {statsSummary.totalExpenses.toLocaleString()} FCFA
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 uppercase border-b">
                      <th className="p-2">Date</th>
                      <th className="p-2">Catégorie</th>
                      <th className="p-2">Libellé</th>
                      <th className="p-2">Bénéficiaire</th>
                      <th className="p-2 text-right">Montant</th>
                      <th className="p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(accountingData?.expenses || []).map((exp) => (
                      <tr key={exp.id}>
                        <td className="p-2 whitespace-nowrap">{new Date(exp.expenseDate).toLocaleDateString('fr-FR')}</td>
                        <td className="p-2 font-semibold">{exp.category}</td>
                        <td className="p-2">{exp.label}</td>
                        <td className="p-2 text-slate-500">{exp.beneficiary || '-'}</td>
                        <td className="p-2 text-right font-bold text-red-600">{exp.amount.toLocaleString()} F</td>
                        <td className="p-2 text-center">
                          <button onClick={() => handleDeleteExpense(exp.id)} className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 6 : STATISTIQUES & EFFECTIFS */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-lg text-[#0f294a]">
                Tableau de Statistiques d'Effectifs & Trésorerie — Année {selectedYear}
              </h3>
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-[#0f294a] text-white text-xs font-bold px-3 py-2 rounded-lg cursor-pointer print:hidden">
                <Printer className="w-4 h-4 text-amber-400" /> Imprimer le bilan
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase">Effectif Total École</p>
                <p className="text-2xl font-extrabold text-[#0f294a] mt-1">{statsSummary.totalStudents} élèves</p>
                <p className="text-[11px] text-slate-500 mt-1">{statsSummary.boysCount} Garçons • {statsSummary.girlsCount} Filles</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-blue-700 uppercase">Cycle Primaire</p>
                <p className="text-2xl font-extrabold text-blue-900 mt-1">{statsSummary.primaireStudents} élèves</p>
                <p className="text-[11px] text-slate-500 mt-1">Maternelle / CI au CM2</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-amber-700 uppercase">Cycle Secondaire</p>
                <p className="text-2xl font-extrabold text-amber-900 mt-1">{statsSummary.secondaireStudents} élèves</p>
                <p className="text-[11px] text-slate-500 mt-1">6ème à la Terminale</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-emerald-700 uppercase">Solde Net en Caisse</p>
                <p className="text-xl font-extrabold text-emerald-800 mt-1">{statsSummary.netBalance.toLocaleString()} F</p>
                <p className="text-[11px] text-slate-500 mt-1">Recettes ({statsSummary.totalCollectedRevenue.toLocaleString()} F) - Frais ({statsSummary.totalExpenses.toLocaleString()} F)</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
              <h4 className="font-bold text-sm text-[#0f294a] mb-3 uppercase">
                Répartition détaillée des effectifs et encaissements par classe ({selectedYear})
              </h4>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 uppercase border-b">
                    <th className="p-2">Cycle</th>
                    <th className="p-2">Classe</th>
                    <th className="p-2 text-center">Garçons</th>
                    <th className="p-2 text-center">Filles</th>
                    <th className="p-2 text-center">Total Effectif</th>
                    <th className="p-2 text-right">Attendu (FCFA)</th>
                    <th className="p-2 text-right">Encaissé (FCFA)</th>
                    <th className="p-2 text-right">Reste à Recouvrer</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {computedClassStats.map((row) => (
                    <tr key={row.id}>
                      <td className="p-2 font-semibold">{row.cycle}</td>
                      <td className="p-2 font-bold text-[#0f294a]">{row.name}</td>
                      <td className="p-2 text-center">{row.boys}</td>
                      <td className="p-2 text-center">{row.girls}</td>
                      <td className="p-2 text-center font-extrabold">{row.studentCount}</td>
                      <td className="p-2 text-right">{row.expected.toLocaleString()} F</td>
                      <td className="p-2 text-right font-bold text-emerald-700">{row.collected.toLocaleString()} F</td>
                      <td className="p-2 text-right font-bold text-red-600">{row.remaining.toLocaleString()} F</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ONGLET 7 : ÉQUIPE & ENSEIGNANTS (CREATION + MODIFICATION + ATTRIBUTION CLASSES/MATIERES) */}
        {activeTab === 'staff' && isDirection && (
          <div className="space-y-6">
            {assigningTeacher && (
              <div className="bg-white p-6 rounded-xl shadow-md border-2 border-amber-400">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-base text-[#0f294a] flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-amber-600" />
                    Attribuer les classes et matières de : {assigningTeacher.fullName}
                  </h3>
                  <button onClick={() => setAssigningTeacher(null)} className="text-xs font-bold text-slate-500 hover:text-black cursor-pointer">
                    Fermer
                  </button>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Cochez les matières que cet enseignant enseigne dans ses différentes classes (1, 2 ou 3 classes). Lorsqu'il se connectera, il ne verra que ces classes et ces matières.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto pr-1">
                  {classes.map((cls) => (
                    <div key={cls.id} className="border rounded-lg p-3 bg-slate-50">
                      <p className="font-bold text-xs text-[#0f294a] uppercase border-b pb-1 mb-2">
                        {cls.name} ({cls.cycle || 'SECONDAIRE'})
                      </p>
                      <div className="space-y-1.5">
                        {sortSubjectsOfficial(cls.subjects).map((subj) => {
                          const checked = selectedSubjectIds.includes(subj.id);
                          return (
                            <label key={subj.id} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSubjectIds((prev) => [...prev, subj.id]);
                                  } else {
                                    setSelectedSubjectIds((prev) => prev.filter((id) => id !== subj.id));
                                  }
                                }}
                              />
                              <span>{subj.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setAssigningTeacher(null)} className="px-4 py-2 border rounded-lg text-xs font-bold cursor-pointer">
                    Annuler
                  </button>
                  <button onClick={handleSaveTeacherAssignments} className="px-4 py-2 bg-[#0f294a] text-white rounded-lg text-xs font-bold cursor-pointer">
                    Enregistrer les classes & matières
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg text-[#0f294a] mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  {editingStaffId
                    ? `Modifier les accès de : ${staffName}`
                    : 'Créer un compte Personnel (Enseignant, Secrétaire, Comptable)'}
                </h3>
                <form onSubmit={handleCreateOrUpdateStaff} className="space-y-4 text-sm">
                  <div>
                    <label className="block font-semibold mb-1">Nom & Prénoms *</label>
                    <input type="text" required placeholder="Ex: Eliane AKPO (Français 6ème)" value={staffName} onChange={(e) => setStaffName(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Email de connexion *</label>
                    <input type="email" required value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">
                        {editingStaffId ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe *'}
                      </label>
                      <input
                        type="text"
                        required={!editingStaffId}
                        placeholder={editingStaffId ? 'Laisser vide pour garder' : 'Définir mot de passe'}
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Rôle *</label>
                      <select value={staffRole} onChange={(e) => setStaffRole(e.target.value as 'TEACHER' | 'SECRETARY' | 'ACCOUNTANT' | 'ADMIN')} className="w-full border rounded-lg px-3 py-2">
                        <option value="TEACHER">Enseignant (Saisie Notes)</option>
                        <option value="SECRETARY">Secrétariat (Inscriptions)</option>
                        <option value="ACCOUNTANT">Comptable (frmInscription & Frais Généraux)</option>
                        <option value="ADMIN">Directeur / Censeur</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Téléphone</label>
                    <input type="text" placeholder="Ex: 0169894149" value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-[#0f294a] hover:bg-[#183d6d] text-white font-bold py-2.5 rounded-lg cursor-pointer">
                      {editingStaffId ? 'Enregistrer les modifications' : "Créer l'accès de travail"}
                    </button>
                    {editingStaffId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStaffId(null);
                          setStaffName('');
                          setStaffEmail('');
                          setStaffPassword('');
                          setStaffPhone('');
                        }}
                        className="px-4 py-2.5 border rounded-lg font-semibold cursor-pointer"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-base text-[#0f294a] mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#0f294a]" /> Personnel ayant accès au portail ({staffList.length})
                </h3>
                <ul className="divide-y text-sm">
                  {staffList.map((member) => (
                    <li key={member.id} className="py-3 flex justify-between items-start gap-2">
                      <div>
                        <strong className="block text-[#0f294a]">{member.fullName}</strong>
                        <span className="text-xs text-slate-500 block">
                          {member.email} {member.phone ? `• ${member.phone}` : ''} •{' '}
                          <span className="font-bold text-amber-700">{member.role}</span>
                        </span>
                        {member.role === 'TEACHER' && (
                          <span className="text-[11px] text-emerald-700 font-semibold">
                            {(member.subjectsTaught || []).length} matière(s) attribuée(s)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {member.role === 'TEACHER' && (
                          <button
                            onClick={() => openAssignClassesModal(member)}
                            title="Attribuer ses classes et matières"
                            className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-xs font-bold cursor-pointer"
                          >
                            Classes
                          </button>
                        )}
                        <button
                          onClick={() => startEditStaff(member)}
                          title="Modifier coordonnées / mot de passe"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {user.role === 'SUPER_ADMIN' && member.id !== user.id && (
                          <button
                            onClick={() => handleDeleteStaff(member)}
                            title="Supprimer cet accès"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
