import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post('/', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Aucun fichier n'a été uploadé" });
  }
  
  // Return the URL that can be used to access the file
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, name: req.file.originalname });
});

export default router;
