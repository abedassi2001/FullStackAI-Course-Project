// backend/models/user.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, minlength: 2, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: { type: String, required: true, minlength: 3 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

// ✅ Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // only hash if password is new/modified

  try {
    const salt = await bcrypt.genSalt(10); // 10 rounds
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ✅ Add method to compare passwords (used for login)
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ✅ Hide sensitive fields in JSON
userSchema.method("toJSON", function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
});

const UserModel = mongoose.model("User", userSchema);
module.exports = UserModel;
