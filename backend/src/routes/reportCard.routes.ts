import { Router } from 'express';
import { PrismaClient, Trimester } from '@prisma/client';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { PdfGeneratorService } from '../services/pdfGenerator.service';

const router = Router();
const prisma = new PrismaClient();

// Route privée existante (Direction / Personnel) — INTACTE
router.get('/:studentId/pdf/:trimester', authenticateJWT, async (req, res) => {
  try {
    const { studentId, trimester } = req.params;
    const pdfBuffer = await PdfGeneratorService.generateReportCardPdf(
      studentId,
      trimester as Trimester
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Bulletin_${studentId}_${trimester}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur génération PDF', error: error.message });
  }
});

// NOUVEAU : Consultation parent par numéro matricule (lecture seule)
router.get('/public/:matricule', async (req, res) => {
  try {
    const matricule = req.params.matricule.trim();
    const trimester = ((req.query.trimester as string) || 'T1') as Trimester;

    const student = await prisma.student.findFirst({
      where: {
        matricule: { equals: matricule, mode: 'insensitive' },
      },
      include: {
        class: {
          include: {
            subjects: true,
            students: { select: { id: true } },
          },
        },
        grades: {
          where: { trimester },
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        message: 'Aucun élève trouvé avec ce numéro matricule. Vérifiez le matricule inscrit sur le reçu.',
      });
    }

    const rows = student.class.subjects.map((subj) => {
      const g = student.grades.find((gr) => gr.subjectId === subj.id);
      const interrogation = g?.interrogation ?? 0;
      const devoir1 = g?.devoir1 ?? 0;
      const devoir2 = g?.devoir2 ?? 0;
      const moyDev = (devoir1 + devoir2) / 2;
      const moyTrim = Number(((interrogation + 2 * moyDev) / 3).toFixed(2));
      const moyCoef = Number((moyTrim * subj.coefficient).toFixed(2));

      return {
        id: subj.id,
        name: subj.name,
        coefficient: subj.coefficient,
        interrogation,
        devoir1,
        devoir2,
        moyTrim,
        moyCoef,
        appreciation: g?.appreciation ?? '',
      };
    });

    const totalCoef = rows.reduce((acc, r) => acc + r.coefficient, 0);
    const totalMoyCoef = Number(rows.reduce((acc, r) => acc + r.moyCoef, 0).toFixed(2));
    const moyenneTrimestrielle = totalCoef > 0 ? Number((totalMoyCoef / totalCoef).toFixed(2)) : 0;

    res.json({
      student: {
        id: student.id,
        matricule: student.matricule,
        lastName: student.lastName,
        firstName: student.firstName,
        isRepeating: student.isRepeating,
        className: student.class.name,
        classSize: student.class.students.length,
      },
      trimester,
      rows,
      totalCoef,
      totalMoyCoef,
      moyenneTrimestrielle,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la recherche du bulletin', error: error.message });
  }
});

// NOUVEAU : Téléchargement PDF officiel pour les parents par matricule
router.get('/public/:matricule/pdf/:trimester', async (req, res) => {
  try {
    const matricule = req.params.matricule.trim();
    const { trimester } = req.params;

    const student = await prisma.student.findFirst({
      where: {
        matricule: { equals: matricule, mode: 'insensitive' },
      },
    });

    if (!student) {
      return res.status(404).json({ message: 'Élève introuvable.' });
    }

    const pdfBuffer = await PdfGeneratorService.generateReportCardPdf(
      student.id,
      trimester as Trimester
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Bulletin_${student.matricule}_${trimester}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur génération PDF', error: error.message });
  }
});

export default router;
