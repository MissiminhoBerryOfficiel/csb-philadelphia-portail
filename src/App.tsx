import React, { useState, useEffect } from 'react';
import {
  LogOut,
  Users,
  BookOpen,
  FileText,
  Lock,
  Unlock,
  Mail,
  CheckCircle2,
  AlertCircle,
  Printer,
  UserPlus,
  PlusCircle,
  Save,
  Trash2,
  Edit3,
  ShieldCheck,
} from 'lucide-react';
import axios from 'axios';
import api from './services/api';

interface User {
  id: string;
  matricule: string;
  fullName: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'SECRETARY';
  phone?: string;
}

interface Student {
  id: string;
  matricule: string;
  lastName: string;
  firstName: string;
  birthDate: string;
  gender: string;
  isRepeating: boolean;
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
  students: Student[];
  subjects: Subject[];
}

interface GradeRecord {
  id?: string;
  subjectId: string;
  interrogation: number;
  devoir1: number;
  devoir2: number;
  appreciation: string;
  status: string;
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('fondateur@csbphiladelphia.bj');
  const [password, setPassword] = useState('SuperAdmin@2026!');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'inscription' | 'grades' | 'bulletins' | 'staff'>(
    'inscription'
  );
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [trimester, setTrimester] = useState<'T1' | 'T2' | 'T3'>('T1');

  const [newClassName, setNewClassName] = useState('');

  // Formulaire élève
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [matricule, setMatricule] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [birthDate, setBirthDate] = useState('2012-05-10');
  const [gender, setGender] = useState('F');
  const [isRepeating, setIsRepeating] = useState(false);

  // Gestion du personnel & enseignants
  const [staffList, setStaffList] = useState<User[]>([]);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('Prof@2026!');
  const [staffRole, setStaffRole] = useState<'TEACHER' | 'SECRETARY' | 'ADMIN'>('TEACHER');
  const [staffPhone, setStaffPhone] = useState('');

  const [gradesMap, setGradesMap] = useState<Record<string, GradeRecord>>({});

  const isDirection = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const canInscribe = isDirection || user?.role === 'SECRETARY';

  useEffect(() => {
    const savedUser = localStorage.getItem('csb_user');
    if (savedUser) {
      const parsed: User = JSON.parse(savedUser);
      setUser(parsed);
      if (parsed.role === 'TEACHER') setActiveTab('grades');
    }
  }, []);

  const loadClasses = async () => {
    try {
      const res = await api.get('/academic/classes');
      setClasses(res.data);
      if (res.data.length > 0) {
        const targetClass =
          res.data.find((c: SchoolClass) => c.id === selectedClassId) || res.data[0];
        setSelectedClassId(targetClass.id);
        if (targetClass.students.length > 0) {
          const targetStud =
            targetClass.students.find((s: Student) => s.id === selectedStudentId) ||
            targetClass.students[0];
          setSelectedStudentId(targetStud.id);
        } else {
          setSelectedStudentId('');
        }
      }
    } catch (e) {
      console.error(e);
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
      loadClasses();
      if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
        loadStaff();
      }
    }
  }, [user]);

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
              interrogation: found.interrogation ?? 0,
              devoir1: found.devoir1 ?? 0,
              devoir2: found.devoir2 ?? 0,
              appreciation: found.appreciation ?? '',
              status: found.status,
            }
          : {
              subjectId: subj.id,
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
      if (loggedUser.role === 'TEACHER') setActiveTab('grades');
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

  const handleLogout = () => {
    localStorage.removeItem('csb_token');
    localStorage.removeItem('csb_user');
    setUser(null);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    try {
      const res = await api.post('/academic/classes', { name: newClassName.trim() });
      setNewClassName('');
      setSuccessMsg(`Classe "${res.data.name}" créée avec les 14 matières officielles !`);
      await loadClasses();
      setSelectedClassId(res.data.id);
    } catch {
      setError('Impossible de créer la classe.');
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
          matricule,
          lastName,
          firstName,
          birthDate,
          gender,
          isRepeating,
        });
        setSuccessMsg(`Informations de ${res.data.lastName} ${res.data.firstName} mises à jour !`);
        setEditingStudentId(null);
      } else {
        const res = await api.post('/academic/students', {
          matricule,
          lastName,
          firstName,
          birthDate,
          gender,
          isRepeating,
          classId: selectedClassId,
        });
        setSuccessMsg(`Élève ${res.data.lastName} ${res.data.firstName} inscrit avec succès !`);
        setSelectedStudentId(res.data.id);
      }
      setMatricule('');
      setLastName('');
      setFirstName('');
      setIsRepeating(false);
      await loadClasses();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Erreur lors de l'enregistrement.");
      }
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
    if (!window.confirm(`Voulez-vous vraiment supprimer l'élève ${st.lastName} ${st.firstName} ?`)) {
      return;
    }
    try {
      await api.delete(`/academic/students/${st.id}`);
      setSuccessMsg(`Élève ${st.lastName} ${st.firstName} supprimé.`);
      await loadClasses();
    } catch {
      setError('Action réservée au Fondateur ou au Directeur.');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.post('/academic/staff', {
        fullName: staffName,
        email: staffEmail,
        password: staffPassword,
        role: staffRole,
        phone: staffPhone,
      });
      setSuccessMsg(`Compte créé pour ${res.data.fullName} (${res.data.email}) !`);
      setStaffName('');
      setStaffEmail('');
      setStaffPhone('');
      await loadStaff();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Erreur lors de la création du compte.');
      }
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
    field: 'interrogation' | 'devoir1' | 'devoir2' | 'appreciation',
    value: string
  ) => {
    setGradesMap((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [field]:
          field === 'appreciation'
            ? value
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
        interrogation: row.interrogation,
        devoir1: row.devoir1,
        devoir2: row.devoir2,
        appreciation: row.appreciation,
        lockAfterSave,
      });
      setSuccessMsg(
        lockAfterSave
          ? 'Note enregistrée et VERROUILLÉE ! Seul le Directeur peut désormais la modifier.'
          : 'Brouillon enregistré.'
      );
      await loadStudentGrades(selectedStudentId, trimester);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Modification interdite.');
      }
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

  // ÉCRAN DE CONNEXION
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          <div className="bg-[#0f294a] text-white p-6 text-center border-b-4 border-amber-500">
            <img
              src="/logo-csb.png"
              alt="Logo CSB"
              className="w-20 h-20 object-contain mx-auto mb-3 bg-white rounded-full p-1.5 shadow"
            />
            <p className="text-[11px] tracking-widest text-amber-300 font-semibold">
              REPUBLIQUE DU BENIN
            </p>
            <h1 className="text-lg font-extrabold uppercase mt-0.5">
              COMPLEXE SCOLAIRE BILINGUE PHILADELPHIA
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Sis à Golo-Lohoussa (Abomey-Calavi) — 09 BP : 238 Cotonou
            </p>
            <p className="text-xs text-amber-400 font-medium mt-0.5">
              Tél : 01 97 95 75 63 / 01 61 31 99 68 • philavin2@gmail.com
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-600 p-3 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Email de connexion
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0f294a] hover:bg-[#183d6d] text-white font-bold py-2.5 px-4 rounded-lg cursor-pointer"
            >
              {loading ? 'Connexion...' : 'Se connecter (Année 2026-2027)'}
            </button>

            <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEmail('fondateur@csbphiladelphia.bj');
                  setPassword('SuperAdmin@2026!');
                }}
                className="p-2 border rounded hover:bg-amber-50 text-left cursor-pointer"
              >
                <strong className="text-[#0f294a] block">Fondateur (Contrôle Total)</strong>
                <span className="text-[11px] text-slate-500">fondateur@csbphiladelphia.bj</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('directeur@csbphiladelphia.bj');
                  setPassword('Directeur@2026!');
                }}
                className="p-2 border rounded hover:bg-amber-50 text-left cursor-pointer"
              >
                <strong className="text-[#0f294a] block">Directeur (Validation)</strong>
                <span className="text-[11px] text-slate-500">directeur@csbphiladelphia.bj</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('secretariat@csbphiladelphia.bj');
                  setPassword('Secretaire@2026!');
                }}
                className="p-2 border rounded hover:bg-amber-50 text-left cursor-pointer"
              >
                <strong className="text-[#0f294a] block">Secrétariat (Inscriptions)</strong>
                <span className="text-[11px] text-slate-500">secretariat@csbphiladelphia.bj</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('prof.koffi@csbphiladelphia.bj');
                  setPassword('Prof@2026!');
                }}
                className="p-2 border rounded hover:bg-amber-50 text-left cursor-pointer"
              >
                <strong className="text-[#0f294a] block">Enseignant (Saisie Mobile)</strong>
                <span className="text-[11px] text-slate-500">prof.koffi@csbphiladelphia.bj</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const subjects = currentClass?.subjects || [];
  const bulletinRows = subjects.map((s) => {
    const g = gradesMap[s.id] || { interrogation: 0, devoir1: 0, devoir2: 0, appreciation: '' };
    const moyDev = (g.devoir1 + g.devoir2) / 2;
    const moyTrim = Number(((g.interrogation + 2 * moyDev) / 3).toFixed(2));
    const moyCoef = Number((moyTrim * s.coefficient).toFixed(2));
    return { ...s, ...g, moyTrim, moyCoef };
  });

  const totalCoef = bulletinRows.reduce((acc, r) => acc + r.coefficient, 0);
  const totalMoyCoef = Number(bulletinRows.reduce((acc, r) => acc + r.moyCoef, 0).toFixed(2));
  const moyenneTrimestrielle = totalCoef > 0 ? Number((totalMoyCoef / totalCoef).toFixed(2)) : 0;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Barre latérale avec Logo du CSB PHILADELPHIA */}
      <aside className="w-full md:w-64 bg-[#0f294a] text-white flex flex-col justify-between print:hidden">
        <div>
          <div className="p-4 border-b border-slate-700 flex items-center gap-3">
            <img
              src="/logo-csb.png"
              alt="Logo CSB"
              className="w-12 h-12 object-contain bg-white rounded-full p-1 shrink-0"
            />
            <div>
              <h2 className="font-bold text-xs leading-tight">CSB PHILADELPHIA</h2>
              <p className="text-[10px] text-amber-400 mt-0.5">2026-2027 • {user.role}</p>
            </div>
          </div>

          <nav className="p-3 flex md:flex-col gap-2 overflow-x-auto">
            {canInscribe && (
              <button
                onClick={() => setActiveTab('inscription')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap cursor-pointer ${
                  activeTab === 'inscription'
                    ? 'bg-amber-500 text-[#0f294a] font-bold'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Inscriptions & Classes
              </button>
            )}

            <button
              onClick={() => setActiveTab('grades')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap cursor-pointer ${
                activeTab === 'grades'
                  ? 'bg-amber-500 text-[#0f294a] font-bold'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Saisie des Notes
            </button>

            {user.role !== 'TEACHER' && (
              <button
                onClick={() => setActiveTab('bulletins')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap cursor-pointer ${
                  activeTab === 'bulletins'
                    ? 'bg-amber-500 text-[#0f294a] font-bold'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <FileText className="w-4 h-4" />
                Bulletin Officiel
              </button>
            )}

            {isDirection && (
              <button
                onClick={() => setActiveTab('staff')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap cursor-pointer ${
                  activeTab === 'staff'
                    ? 'bg-amber-500 text-[#0f294a] font-bold'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Équipe & Enseignants
              </button>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-700">
          <p className="text-xs font-semibold truncate mb-2">{user.fullName}</p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Espace principal */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-600 p-3 rounded flex items-center gap-2 text-sm text-red-700 print:hidden">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded flex items-center gap-2 text-sm text-emerald-800 print:hidden">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Barre de sélection Classe / Élève / Trimestre */}
        {activeTab !== 'staff' && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-wrap gap-4 items-center justify-between print:hidden">
            <div className="flex flex-wrap gap-3 items-center">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Classe</label>
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
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.students.length} élèves)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Élève</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="border rounded-lg px-3 py-1.5 text-sm font-semibold text-[#0f294a]"
                >
                  {currentClass?.students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.lastName} {s.firstName} ({s.matricule})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Trimestre</label>
                <select
                  value={trimester}
                  onChange={(e) => setTrimester(e.target.value as 'T1' | 'T2' | 'T3')}
                  className="border rounded-lg px-3 py-1.5 text-sm font-semibold text-[#0f294a]"
                >
                  <option value="T1">1er TRIMESTRE</option>
                  <option value="T2">2ème TRIMESTRE</option>
                  <option value="T3">3ème TRIMESTRE</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 1 : INSCRIPTION, MODIFICATION & SUPPRESSION DES ÉLÈVES */}
        {activeTab === 'inscription' && canInscribe && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg text-[#0f294a] mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                {editingStudentId
                  ? `Modifier l'élève : ${lastName} ${firstName}`
                  : `Inscrire un Élève en : ${currentClass?.name}`}
              </h3>

              <form onSubmit={handleInscribeOrUpdateStudent} className="space-y-4 text-sm">
                <div>
                  <label className="block font-semibold mb-1">Numéro Matricule *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: PHIL26-6e-001"
                    value={matricule}
                    onChange={(e) => setMatricule(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Nom *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Prénoms *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Date de naissance *</label>
                    <input
                      type="date"
                      required
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Sexe *</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="F">Féminin (F)</option>
                      <option value="M">Masculin (M)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="repeat"
                    checked={isRepeating}
                    onChange={(e) => setIsRepeating(e.target.checked)}
                  />
                  <label htmlFor="repeat" className="font-medium">
                    Élève Redoublant(e)
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-[#0f294a] hover:bg-[#183d6d] text-white font-bold py-2.5 rounded-lg cursor-pointer"
                  >
                    {editingStudentId
                      ? 'Enregistrer les modifications'
                      : "Enregistrer l'inscription"}
                  </button>
                  {editingStudentId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStudentId(null);
                        setMatricule('');
                        setLastName('');
                        setFirstName('');
                      }}
                      className="px-4 py-2.5 border rounded-lg font-semibold cursor-pointer"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="space-y-6">
              {isDirection && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-base text-[#0f294a] mb-3 flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-emerald-600" />
                    Ouvrir une nouvelle classe (2026-2027)
                  </h3>
                  <form onSubmit={handleCreateClass} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: 6ème, 5ème, 4ème, 2nde D..."
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-sm cursor-pointer"
                    >
                      Créer
                    </button>
                  </form>
                </div>
              )}

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-base text-[#0f294a] mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#0f294a]" />
                  Liste des inscrits en {currentClass?.name} ({currentClass?.students.length || 0})
                </h3>
                <ul className="divide-y text-sm">
                  {currentClass?.students.map((st) => (
                    <li key={st.id} className="py-2.5 flex justify-between items-center gap-2">
                      <div>
                        <strong className="font-mono text-xs text-slate-500 mr-2">
                          {st.matricule}
                        </strong>
                        <strong>{st.lastName}</strong> {st.firstName} ({st.gender})
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => startEditStudent(st)}
                          title="Modifier cet élève"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {isDirection && (
                          <button
                            onClick={() => handleDeleteStudent(st)}
                            title="Supprimer cet élève"
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

        {/* ONGLET 2 : SAISIE & VERROUILLAGE DES NOTES */}
        {activeTab === 'grades' && (
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="mb-4">
              <h3 className="font-bold text-lg text-[#0f294a]">
                Saisie des Notes — {currentStudent?.lastName} {currentStudent?.firstName}
              </h3>
              <p className="text-xs text-slate-500">
                Une fois verrouillée par le professeur, seul le Fondateur ou le Directeur peut déverrouiller/corriger la note.
              </p>
            </div>

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
                    const g = gradesMap[subj.id] || {
                      interrogation: 0,
                      devoir1: 0,
                      devoir2: 0,
                      appreciation: '',
                      status: 'DRAFT',
                    };
                    const isLocked = g.status === 'LOCKED' || g.status === 'VALIDATED';
                    const readOnly = isLocked && !isDirection;

                    return (
                      <tr key={subj.id} className={isLocked ? 'bg-slate-50' : ''}>
                        <td className="py-2 px-2 font-semibold text-[#0f294a]">{subj.name}</td>
                        <td className="py-2 px-2 text-center">{subj.coefficient}</td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            step="0.25"
                            disabled={readOnly}
                            value={g.interrogation}
                            onChange={(e) =>
                              updateLocalGrade(subj.id, 'interrogation', e.target.value)
                            }
                            className="w-16 border rounded px-1 py-1 text-center disabled:bg-slate-200"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            step="0.25"
                            disabled={readOnly}
                            value={g.devoir1}
                            onChange={(e) => updateLocalGrade(subj.id, 'devoir1', e.target.value)}
                            className="w-16 border rounded px-1 py-1 text-center disabled:bg-slate-200"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            step="0.25"
                            disabled={readOnly}
                            value={g.devoir2}
                            onChange={(e) => updateLocalGrade(subj.id, 'devoir2', e.target.value)}
                            className="w-16 border rounded px-1 py-1 text-center disabled:bg-slate-200"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            disabled={readOnly}
                            placeholder="Bien, Très Bien..."
                            value={g.appreciation}
                            onChange={(e) =>
                              updateLocalGrade(subj.id, 'appreciation', e.target.value)
                            }
                            className="w-28 border rounded px-2 py-1 disabled:bg-slate-200"
                          />
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          {isLocked ? (
                            <div className="inline-flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                                <Lock className="w-3 h-3" /> Verrouillé
                              </span>
                              {isDirection && (
                                <>
                                  <button
                                    onClick={() => saveGradeRow(subj.id, true)}
                                    title="Enregistrer correction Direction"
                                    className="p-1 bg-[#0f294a] text-white rounded cursor-pointer"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => unlockGradeRow(g.id)}
                                    title="Déverrouiller pour le prof"
                                    className="p-1 bg-emerald-600 text-white rounded cursor-pointer"
                                  >
                                    <Unlock className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => saveGradeRow(subj.id, true)}
                              className="inline-flex items-center gap-1 bg-[#0f294a] hover:bg-[#183d6d] text-white text-xs font-bold px-2.5 py-1 rounded cursor-pointer"
                            >
                              <Save className="w-3 h-3 text-amber-400" />
                              Valider & Verrouiller
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ONGLET 3 : BULLETIN OFFICIEL */}
        {activeTab === 'bulletins' && currentStudent && (
          <div className="space-y-4">
            <div className="flex justify-end print:hidden">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 bg-[#0f294a] text-white text-sm font-bold px-4 py-2 rounded-lg cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                Imprimer / PDF
              </button>
            </div>

            <div className="bg-white max-w-4xl mx-auto p-6 border-2 border-black text-black font-sans text-xs">
              <div className="grid grid-cols-12 border-b-2 border-black pb-3 mb-3 items-center">
                <div className="col-span-8 flex items-start gap-3 border-r border-black pr-3">
                  <img
                    src="/logo-csb.png"
                    alt="Logo"
                    className="w-16 h-16 object-contain border border-slate-300"
                  />
                  <div className="text-center flex-1 leading-tight">
                    <p className="font-bold text-[11px] uppercase">REPUBLIQUE DU BENIN</p>
                    <p className="font-extrabold text-[13px] uppercase">
                      COMPLEXE SCOLAIRE BILINGUE PHILADELPHIA
                    </p>
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
                    Année scolaire : <span className="underline">2026 - 2027</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 mb-3 text-xs">
                <div className="flex justify-between">
                  <span>
                    Nom et Prénoms :{' '}
                    <strong className="uppercase">
                      {currentStudent.lastName} {currentStudent.firstName}
                    </strong>
                  </span>
                  <span>
                    Matricule : <strong>{currentStudent.matricule}</strong>
                  </span>
                </div>
                <div>
                  Redoublant (e) : &nbsp; OUI{' '}
                  <span className="inline-block w-3.5 h-3.5 border border-black align-middle text-center font-bold">
                    {currentStudent.isRepeating ? '✓' : ''}
                  </span>{' '}
                  &nbsp;&nbsp; NON{' '}
                  <span className="inline-block w-3.5 h-3.5 border border-black align-middle text-center font-bold">
                    {!currentStudent.isRepeating ? '✓' : ''}
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Classe : {currentClass?.name}</span>
                  <span>Effectif : {currentClass?.students.length}</span>
                  <span className="uppercase font-extrabold">
                    {trimester === 'T1'
                      ? '1er TRIMESTRE'
                      : trimester === 'T2'
                      ? '2ème TRIMESTRE'
                      : '3ème TRIMESTRE'}
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
                  {bulletinRows.map((row) => (
                    <tr key={row.id} className="text-center">
                      <td className="border border-black px-1.5 py-1 text-left font-semibold">
                        {row.name}
                      </td>
                      <td className="border border-black p-1 font-bold">{row.coefficient}</td>
                      <td className="border border-black p-1">{row.interrogation.toFixed(2)}</td>
                      <td className="border border-black p-1">{row.devoir1.toFixed(2)}</td>
                      <td className="border border-black p-1">{row.devoir2.toFixed(2)}</td>
                      <td className="border border-black p-1 font-bold">{row.moyTrim.toFixed(2)}</td>
                      <td className="border border-black p-1 font-bold">{row.moyCoef.toFixed(2)}</td>
                      <td className="border border-black px-1.5 py-1 text-left italic">
                        {row.appreciation}
                      </td>
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

              <div className="grid grid-cols-12 border-x border-b border-black text-[11px]">
                <div className="col-span-3 border-r border-black p-2 font-extrabold flex items-center justify-center bg-slate-100">
                  BILAN DU TRIMESTRE
                </div>
                <div className="col-span-9 p-2 space-y-1">
                  <p>
                    Moyenne du trimestre : <strong>{moyenneTrimestrielle} / 20</strong>
                  </p>
                  <p>Effectif de la classe : <strong>{currentClass?.students.length}</strong></p>
                </div>
              </div>

              {trimester === 'T3' && (
                <div className="grid grid-cols-12 border-x border-b border-black text-[11px]">
                  <div className="col-span-3 border-r border-black p-2 font-extrabold flex items-center justify-center bg-slate-100">
                    BILAN ANNUEL
                  </div>
                  <div className="col-span-9 p-2 space-y-1">
                    <p>Moy. 3ème Trme : <strong>{moyenneTrimestrielle} / 20</strong></p>
                    <p>Décision de fin d'année : ........................................</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-12 border-x border-b border-black text-[11px]">
                <div className="col-span-6 border-r border-black p-2.5 space-y-1">
                  <p className="font-extrabold underline text-center mb-1">
                    Décision du Conseil des Professeurs
                  </p>
                  <div className="flex justify-between">
                    <span>Tableau d'honneur</span>
                    <span className="inline-block w-4 h-4 border border-black text-center font-bold">
                      {moyenneTrimestrielle >= 12 ? '✓' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Encouragements</span>
                    <span className="inline-block w-4 h-4 border border-black text-center font-bold">
                      {moyenneTrimestrielle >= 14 ? '✓' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Félicitation</span>
                    <span className="inline-block w-4 h-4 border border-black text-center font-bold">
                      {moyenneTrimestrielle >= 16 ? '✓' : ''}
                    </span>
                  </div>
                </div>
                <div className="col-span-6 p-2.5 flex flex-col justify-between">
                  <p className="font-extrabold underline text-center">
                    Appréciation du Chef d'Établissement
                  </p>
                  <p className="text-right font-bold mt-8">Le Directeur</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 4 : GESTION DE L'ÉQUIPE & ENSEIGNANTS (EXCLUSIF DIRECTION) */}
        {activeTab === 'staff' && isDirection && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg text-[#0f294a] mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                Créer un compte Enseignant ou Secrétaire
              </h3>

              <form onSubmit={handleCreateStaff} className="space-y-4 text-sm">
                <div>
                  <label className="block font-semibold mb-1">Nom & Prénoms *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Prof. AGBO Kodjo"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Email de connexion *</label>
                  <input
                    type="email"
                    required
                    placeholder="Ex: prof.agbo@csbphiladelphia.bj"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Mot de passe *</label>
                    <input
                      type="text"
                      required
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Rôle *</label>
                    <select
                      value={staffRole}
                      onChange={(e) =>
                        setStaffRole(e.target.value as 'TEACHER' | 'SECRETARY' | 'ADMIN')
                      }
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="TEACHER">Enseignant (Saisie Notes)</option>
                      <option value="SECRETARY">Secrétariat (Inscriptions)</option>
                      <option value="ADMIN">Directeur / Censeur</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Téléphone</label>
                  <input
                    type="text"
                    placeholder="Ex: 01 97 XX XX XX"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#0f294a] hover:bg-[#183d6d] text-white font-bold py-2.5 rounded-lg cursor-pointer"
                >
                  Créer l'accès de travail
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-base text-[#0f294a] mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#0f294a]" />
                Personnel ayant accès au portail ({staffList.length})
              </h3>
              <ul className="divide-y text-sm">
                {staffList.map((member) => (
                  <li key={member.id} className="py-2.5 flex justify-between items-center gap-2">
                    <div>
                      <strong className="block text-[#0f294a]">{member.fullName}</strong>
                      <span className="text-xs text-slate-500">
                        {member.email} •{' '}
                        <span className="font-bold text-amber-700">{member.role}</span>
                      </span>
                    </div>
                    {user.role === 'SUPER_ADMIN' && member.id !== user.id && (
                      <button
                        onClick={() => handleDeleteStaff(member)}
                        title="Supprimer cet accès"
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;