const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📁 Upload directory
const uploadDir = path.join(__dirname, "uploads");

// Ensure uploads folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 🔥 MULTER STORAGE (KEEP ORIGINAL NAME + SAFE)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/\s+/g, "_");
    const uniqueName = Date.now() + "-" + cleanName;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// 📤 Upload API
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    res.json({
      url: `/uploads/${req.file.filename}`,
      name: req.file.originalname
    });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// 📥 Serve uploaded files (VERY IMPORTANT FIX)
app.use("/uploads", express.static(uploadDir, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();

    // ✅ PDF fix (prevents download issue)
    if (ext === ".pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
    }

    // ✅ Images
    if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
      res.setHeader("Content-Disposition", "inline");
    }

    // ✅ Prevent caching issues during dev
    res.setHeader("Cache-Control", "no-store");
  }
}));

// 📄 Get document data
app.get("/doc/:id", (req, res) => {
  try {
    const filePath = path.join(__dirname, `data_${req.params.id}.json`);

    if (fs.existsSync(filePath)) {
      res.json(JSON.parse(fs.readFileSync(filePath)));
    } else {
      res.json({ content: "", files: [] });
    }

  } catch (err) {
    console.error("Read error:", err);
    res.status(500).json({ error: "Read failed" });
  }
});

// 💾 Save document data
app.post("/doc/:id", (req, res) => {
  try {
    const filePath = path.join(__dirname, `data_${req.params.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(req.body));
    res.send("saved");

  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ error: "Save failed" });
  }
});

// 🌐 Serve frontend files
app.use(express.static(__dirname));

// 🚫 FINAL fallback (SAFE VERSION)
app.get("/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 🚀 Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});