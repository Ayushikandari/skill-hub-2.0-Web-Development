const jwt = require("jsonwebtoken");
const { readDb } = require("./db");

const JWT_SECRET = process.env.JWT_SECRET || "skillhub-dev-secret";

function sanitizeUser(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = readDb();
    const user = db.users.find((entry) => entry.id === payload.sub);

    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `Only ${role}s can perform this action.` });
    }

    return next();
  };
}

module.exports = {
  createToken,
  authRequired,
  requireRole,
  sanitizeUser
};
