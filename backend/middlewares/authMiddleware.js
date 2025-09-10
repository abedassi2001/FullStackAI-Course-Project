// backend/middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-please";

/** Extract token from:
 *  - Authorization: Bearer <token>
 *  - x-access-token: <token>
 *  - Cookie "token" (optional)
 */
function getTokenFromReq(req) {
  const h = req.headers["authorization"] || req.headers["Authorization"] || "";
  if (typeof h === "string" && h.startsWith("Bearer ")) return h.slice(7).trim();
  const x = req.headers["x-access-token"];
  if (typeof x === "string" && x.trim()) return x.trim();
  if (req.cookies?.token) return String(req.cookies.token).trim();
  return null;
}

/** Require a valid JWT. Attaches req.user with both id and _id for compatibility. */
function requireAuth(req, res, next) {
  try {
    const token = getTokenFromReq(req);
    if (!token) return res.status(401).json({ error: "Missing token" });

    const payload = jwt.verify(token, JWT_SECRET);
    // Accept any of these claim names from your login signer
    const uid = payload.sub || payload.id || payload._id;
    if (!uid) return res.status(401).json({ error: "Invalid token payload" });

    req.user = {
      id: String(uid),
      _id: String(uid),          // <— compatibility with code that uses _id
      role: payload.role || "user",
      email: payload.email,      // optional if you include it when signing
      name: payload.name,        // optional
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Role guard (optional) */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

module.exports = { requireAuth, requireRole };
