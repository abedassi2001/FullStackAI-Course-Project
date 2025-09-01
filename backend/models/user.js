// backend/models/user.js
const mongoose = require("mongoose");

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
    password: { type: String, required: true, minlength: 3 }, // (بدون hashing حالياً)
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

// اخفاء الحقول الحسّاسة بالشكل الافتراضي
userSchema.method("toJSON", function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
});

const UserModel = mongoose.model("User", userSchema);
module.exports = UserModel;
