// backend/middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-please";

/**
 * Extract token from:
 *  - Authorization: Bearer <token>
 *  - x-access-token: <token>   (fallback)
 */
function getTokenFromReq(req) {
  const h = req.headers["authorization"] || "";
  if (h.startsWith("Bearer ")) return h.slice(7).trim();
  return (req.headers["x-access-token"] || "").trim();
}

/**
 * Require a valid JWT. If valid, attaches req.user = { sub, role }
 */
function requireAuth(req, res, next) {
  try {
    const token = getTokenFromReq(req);
    if (!token) return res.status(401).json({ error: "Missing token" });

    const payload = jwt.verify(token, JWT_SECRET);
    // payload contains whatever you signed: { sub, role, iat, exp }
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Require a specific role (e.g., 'admin')
 * Usage: router.get('/path', requireAuth, requireRole('admin'), handler)
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

module.exports = { requireAuth, requireRole };
