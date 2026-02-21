const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const db = require("./db");

const app = express();
const SECRET = process.env.JWT_SECRET || "secreto_super_seguro";

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());

/* ================= SERVIR FRONTEND ================= */
app.use(express.static(path.join(__dirname, "frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});
/* ================= SUBIDA DE IMÁGENES ================= */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

app.use("/uploads", express.static("uploads"));

/* ================= LOGIN ================= */
app.post("/login", (req, res) => {
  const { usuario, password } = req.body;

  db.query("SELECT * FROM usuarios WHERE usuario = ?", [usuario], async (err, results) => {
    if (err) return res.status(500).json({ mensaje: "Error servidor" });
    if (results.length === 0) return res.status(401).json({ mensaje: "Usuario no encontrado" });

    const user = results[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) return res.status(401).json({ mensaje: "Contraseña incorrecta" });

    const token = jwt.sign(
      { id: user.id, rol: user.rol },
      SECRET,
      { expiresIn: "2h" }
    );

    res.json({ token });
  });
});

/* ================= MIDDLEWARE AUTH ================= */
function verificarToken(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(403).json({ mensaje: "Token requerido" });

  const token = header.split(" ")[1];

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ mensaje: "Token inválido" });
    req.user = decoded;
    next();
  });
}

function soloAdmin(req, res, next) {
  if (req.user.rol !== "admin") {
    return res.status(403).json({ mensaje: "Acceso solo admin" });
  }
  next();
}

/* ================= PRODUCTOS PÚBLICOS ================= */
app.get("/productos-publicos", (req, res) => {
  db.query("SELECT * FROM productos", (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ mensaje: "Error al obtener productos" });
    }
    res.json(results);
  });
});

/* ================= PRODUCTOS ADMIN ================= */
app.get("/productos", verificarToken, soloAdmin, (req, res) => {
  db.query("SELECT * FROM productos", (err, results) => {
    if (err) return res.status(500).json({ mensaje: "Error" });
    res.json(results);
  });
});

app.post("/productos", verificarToken, soloAdmin, upload.single("imagen"), (req, res) => {
  const { nombre, precio, descripcion, stock, marca } = req.body;
  const imagen = req.file ? "/uploads/" + req.file.filename : null;

  db.query(
    "INSERT INTO productos (nombre, precio, descripcion, imagen, stock, marca) VALUES (?, ?, ?, ?, ?, ?)",
    [nombre, precio, descripcion, imagen, stock, marca],
    (err) => {
      if (err) return res.status(500).json({ mensaje: "Error al crear producto" });
      res.json({ mensaje: "Producto creado" });
    }
  );
});

app.put("/productos/:id", verificarToken, soloAdmin, upload.single("imagen"), (req, res) => {
  const { nombre, precio, descripcion, stock, marca } = req.body;
  const id = req.params.id;

  let query = "UPDATE productos SET nombre=?, precio=?, descripcion=?, stock=?, marca=?";
  const params = [nombre, precio, descripcion, stock, marca];

  if (req.file) {
    query += ", imagen=?";
    params.push("/uploads/" + req.file.filename);
  }

  query += " WHERE id=?";
  params.push(id);

  db.query(query, params, (err) => {
    if (err) return res.status(500).json({ mensaje: "Error al actualizar" });
    res.json({ mensaje: "Actualizado" });
  });
});

app.delete("/productos/:id", verificarToken, soloAdmin, (req, res) => {
  db.query("DELETE FROM productos WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ mensaje: "Error al eliminar" });
    res.json({ mensaje: "Eliminado" });
  });
});

/* ================= SERVIDOR ================= */
const PORT = process.env.PORT || 3000;

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

app.listen(PORT, () => {
  console.log("🚀 Backend corriendo en puerto", PORT);
});