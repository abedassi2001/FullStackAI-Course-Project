// backend/models/user.js

class User {
    constructor({ id, name, email, password, status = "active", role = "user" }) {
      // Private properties (use underscore to indicate they shouldn't be accessed directly)
      this._id = id;
      this._name = name;
      this._email = email;
      this._password = password; // should be hashed before storing in a real app
      this._status = status;     // "active" or "inactive"
      this._role = role;         // "user" or "admin"
    }
  
    // --- Getters ---
    get id() {
      return this._id;
    }
  
    get name() {
      return this._name;
    }
  
    get email() {
      return this._email;
    }
  
    get password() {
      return this._password;
    }
  
    get status() {
      return this._status;
    }
  
    get role() {
      return this._role;
    }
  
    // --- Setters ---
    set id(value) {
      if (!value) throw new Error("ID is required");
      this._id = value;
    }
  
    set name(value) {
      // Name must have at least 2 characters
      if (!value || value.length < 2) throw new Error("Name must have at least 2 characters");
      this._name = value;
    }
  
    set email(value) {
      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) throw new Error("Invalid email format");
      this._email = value;
    }
  
    set password(value) {
      // Password must be at least 6 characters long
      if (!value || value.length < 6) throw new Error("Password must be at least 6 characters long");
      this._password = value;
    }
  
    set status(value) {
      // Only "active" or "inactive" are allowed
      if (!["active", "inactive"].includes(value)) {
        throw new Error("Status must be either 'active' or 'inactive'");
      }
      this._status = value;
    }
  
    set role(value) {
      // Only "user" or "admin" are allowed
      if (!["user", "admin"].includes(value)) {
        throw new Error("Role must be either 'user' or 'admin'");
      }
      this._role = value;
    }
  
    // --- Public methods ---
    // Convert object to JSON without exposing the password
    toJSON() {
      return {
        id: this._id,
        name: this._name,
        email: this._email,
        status: this._status,
        role: this._role,
      };
    }
  
    // Check if a provided password matches the user's password
    // (⚠️ In a real app use bcrypt.compare for security)
    checkPassword(password) {
      return this._password === password;
    }
  }
  
  module.exports = User;
  