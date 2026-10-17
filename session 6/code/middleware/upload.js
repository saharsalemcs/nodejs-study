const multer = require("multer");
const appError = require("../utils/appError");

const EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("FILE", file);
    cb(null, "uploads");
  },

  filename: (req, file, cb) => {
    const fileName = `user-${Date.now()}${EXT[file.mimetype]}`;
    cb(null, fileName);
  },
});

fileFilter = (req, file, cb) => {
  if (EXT[file.mimetype]) return cb(null, true);

  cb(appError.create("file must be an image", 400));
};

const upload = multer({
  storage: storage,
  fileFilter,
  limits: { fileSize: 1 * 1024 * 1024, files: 3 },
  defParamCharset: "utf8",
});

module.exports = upload;
