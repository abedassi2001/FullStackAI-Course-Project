// response.js
// Utility to standardize API responses.
//
// Functions to implement:
// - success(res, data, message = "Success"): returns { success: true, message, data }
// - error(res, message = "Error", code = 500): returns { success: false, message }
//
// Example:
// exports.success = (res, data, message = "Success") => res.json({ success: true, message, data });
// exports.error = (res, message = "Error", code = 500) => res.status(code).json({ success: false, message });
