import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import gradeRoutes from './routes/grade.routes';
import reportCardRoutes from './routes/reportCard.routes';
import studentRoutes from './routes/student.routes';
import academicRoutes from './routes/academic.routes';
import accountingRoutes from './routes/accounting.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/report-cards', reportCardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/accounting', accountingRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', establishment: 'CSB PHILADELPHIA', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`[CSB PHILADELPHIA] Serveur actif sur le port ${PORT}`);
});
