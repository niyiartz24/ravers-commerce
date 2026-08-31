const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// Local disk storage for the MVP. To move to Cloudinary/Supabase Storage
// later: swap `storage` for `multer.memoryStorage()` and, in the
// controller, upload `req.file.buffer` to the provider instead of reading
// from `req.file.path`. Nothing else in the request flow needs to change.
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'custom-orders');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomName}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error('Only JPG, PNG, WEBP, or PDF reference files are accepted.'));
  }
  cb(null, true);
}

const maxSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB) || 5;

const uploadReferenceImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMb * 1024 * 1024 },
}).single('referenceImage');

module.exports = { uploadReferenceImage, UPLOAD_DIR };
