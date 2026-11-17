import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, Trimester, ValidationStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

const verifyAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Accès non autorisé.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'csb_philadelphia_secret_2026');
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(403).json({ message: 'Session expirée, veuillez vous reconnecter.' });
  }
};

// 1. Récupérer toutes les classes et leurs élèves (2026-2027)
router.get('/classes', verifyAuth, async (_req: Request, res: Response) => {
  try {
    let year = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
    if (!year) {
      year = await prisma.academicYear.create({
        data: { name: '2026-2027', isCurrent: true },
      });
    }

    const classes = await prisma.class.findMany({
      where: { academicYearId: year.id },
      include: {
        students: { orderBy: { lastName: 'asc' } },
        subjects: { orderBy: { name: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du chargement des classes.', error });
  }
});

// 2. Créer une nouvelle classe avec les 14 disciplines officielles
router.post('/classes', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    let year = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
    if (!year) {
      year = await prisma.academicYear.create({
        data: { name: '2026-2027', isCurrent: true },
      });
    }

    const newClass = await prisma.class.create({
      data: { name, academicYearId: year.id },
    });

    const disciplines = [
      { name: 'Lecture/Ort.Gr', code: 'LECT_ORT', coefficient: 2 },
      { name: 'Com. Ecrite Comp. FR', code: 'COM_FR', coefficient: 2 },
      { name: 'Hist-Géo', code: 'HIST_GEO', coefficient: 2 },
      { name: 'LV1 /Anglais', code: 'LV1_ANG', coefficient: 2 },
      { name: 'LV2 / Esp', code: 'LV2_ESP', coefficient: 2 },
      { name: 'Mathématique', code: 'MATH', coefficient: 3 },
      { name: 'Biologie / SVT', code: 'SVT', coefficient: 2 },
      { name: 'Philosophie', code: 'PHILO', coefficient: 2 },
      { name: 'Physique Chimie / PCT', code: 'PCT', coefficient: 2 },
      { name: 'Informatique', code: 'INFO', coefficient: 1 },
      { name: 'Allemand', code: 'ALL', coefficient: 2 },
      { name: 'Economie', code: 'ECO', coefficient: 2 },
      { name: 'EPS', code: 'EPS', coefficient: 1 },
      { name: 'Conduite', code: 'COND', coefficient: 1 },
    ];

    for (const d of disciplines) {
      await prisma.subject.create({
        data: {
          name: d.name,
          code: d.code,
          coefficient: d.coefficient,
          classId: newClass.id,
        },
      });
    }

    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création de la classe.', error });
  }
});

// 3. Inscrire un nouvel élève dans une classe
router.post('/students', verifyAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role === 'TEACHER') {
      return res.status(403).json({ message: 'Accès refusé aux enseignants.' });
    }

    const { matricule, lastName, firstName, birthDate, gender, isRepeating, classId } = req.body;

    const student = await prisma.student.create({
      data: {
        matricule,
        lastName: lastName.toUpperCase(),
        firstName,
        birthDate: new Date(birthDate),
        gender,
        isRepeating: Boolean(isRepeating),
        classId,
      },
    });

    res.status(201).json(student);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Ce numéro matricule existe déjà.' });
    }
    res.status(500).json({ message: "Erreur lors de l'inscription de l'élève.", error });
  }
});

// 4. Modifier les informations d'un élève
router.put('/students/:id', verifyAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role === 'TEACHER') {
      return res.status(403).json({ message: 'Accès refusé aux enseignants.' });
    }
    const { id } = req.params;
    const { matricule, lastName, firstName, birthDate, gender, isRepeating } = req.body;

    const updated = await prisma.student.update({
      where: { id },
      data: {
        matricule,
        lastName: lastName.toUpperCase(),
        firstName,
        birthDate: new Date(birthDate),
        gender,
        isRepeating: Boolean(isRepeating),
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la modification de l'élève.", error });
  }
});

// 5. Supprimer un élève
router.delete('/students/:id', verifyAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Seul le Fondateur ou le Directeur peut supprimer un élève.' });
    }
    const { id } = req.params;
    await prisma.grade.deleteMany({ where: { studentId: id } });
    await prisma.reportCard.deleteMany({ where: { studentId: id } });
    await prisma.student.delete({ where: { id } });

    res.json({ message: 'Élève supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression de l'élève.", error });
  }
});

// 6. Charger les notes d'un élève pour un trimestre
router.get('/grades/:studentId/:trimester', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { studentId, trimester } = req.params;
    const grades = await prisma.grade.findMany({
      where: { studentId, trimester: trimester as Trimester },
      include: { subject: true },
    });
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du chargement des notes.', error });
  }
});

// 7. Enregistrer & Verrouiller les notes
router.post('/grades/save', verifyAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { studentId, subjectId, trimester, interrogation, devoir1, devoir2, appreciation, lockAfterSave } = req.body;

    const existing = await prisma.grade.findUnique({
      where: {
        studentId_subjectId_trimester: {
          studentId,
          subjectId,
          trimester: trimester as Trimester,
        },
      },
    });

    if (
      existing &&
      (existing.status === ValidationStatus.VALIDATED ||
        existing.status === ValidationStatus.LOCKED ||
        existing.status === ValidationStatus.PENDING_VALIDATION) &&
      user.role === 'TEACHER'
    ) {
      return res.status(403).json({
        message: 'Note verrouillée ! Seul le Fondateur ou le Directeur peut corriger cette note.',
      });
    }

    const moyDev = (Number(devoir1) + Number(devoir2)) / 2;
    const calculatedMoy = Number(((Number(interrogation) + 2 * moyDev) / 3).toFixed(2));
    const nextStatus = lockAfterSave ? ValidationStatus.LOCKED : ValidationStatus.DRAFT;

    const saved = await prisma.grade.upsert({
      where: {
        studentId_subjectId_trimester: {
          studentId,
          subjectId,
          trimester: trimester as Trimester,
        },
      },
      update: {
        interrogation: Number(interrogation),
        devoir1: Number(devoir1),
        devoir2: Number(devoir2),
        calculatedMoy,
        appreciation,
        status: nextStatus,
      },
      create: {
        studentId,
        subjectId,
        trimester: trimester as Trimester,
        interrogation: Number(interrogation),
        devoir1: Number(devoir1),
        devoir2: Number(devoir2),
        calculatedMoy,
        appreciation,
        status: nextStatus,
      },
    });

    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la sauvegarde de la note.', error });
  }
});

// 8. Déverrouiller une note (Exclusif Super Admin / Directeur)
router.post('/grades/unlock/:gradeId', verifyAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Action réservée au Fondateur ou au Directeur.' });
    }

    const { gradeId } = req.params;
    const unlocked = await prisma.grade.update({
      where: { id: gradeId },
      data: { status: ValidationStatus.MODIFICATION_ALLOWED },
    });

    res.json(unlocked);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du déverrouillage.', error });
  }
});

// 9. Lister tous les membres du personnel (Enseignants, Secrétariat, Direction)
router.get('/staff', verifyAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Accès réservé à la Direction.' });
    }
    const staff = await prisma.user.findMany({
      select: { id: true, matricule: true, fullName: true, email: true, role: true, phone: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du chargement du personnel.', error });
  }
});

// 10. Créer un nouveau compte Enseignant ou Secrétaire
router.post('/staff', verifyAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Action réservée au Fondateur ou au Directeur.' });
    }

    const { fullName, email, password, role, phone } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const count = await prisma.user.count();

    const newStaff = await prisma.user.create({
      data: {
        matricule: `CSB-PERS-00${count + 1}`,
        fullName,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role || 'TEACHER',
        phone: phone || '',
      },
    });

    res.status(201).json({
      id: newStaff.id,
      matricule: newStaff.matricule,
      fullName: newStaff.fullName,
      email: newStaff.email,
      role: newStaff.role,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }
    res.status(500).json({ message: 'Erreur lors de la création du compte.', error });
  }
});

// 11. Supprimer un compte Enseignant/Secrétaire
router.delete('/staff/:id', verifyAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Seul le Fondateur peut supprimer un compte.' });
    }
    const { id } = req.params;
    if (id === user.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }
    await prisma.teacherSubject.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Compte supprimé.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression.', error });
  }
});

export default router;
