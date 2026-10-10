const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true,
            minlength: 8
        },
        
        role: {
            type: String,
            enum: ["admin", "advisor", "student"],
            default: "student"
        },

        studentId: {
            type: String,
            trim: true,
            required: function () { return this.role === "student"; }
        },
        advisorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        active: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

userSchema.index({ studentId: 1 }, { unique: true, partialFilterExpression: { studentId: { $type: "string" } } });
userSchema.pre("validate", async function () {
    if (this.advisorId && this.isModified("advisorId")) {
        const advisor = await this.constructor.findOne({ _id: this.advisorId, role: "advisor", active: true });
        if (!advisor) this.invalidate("advisorId", "Advisor must be an active advisor account");
    }
});
userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }
    this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model("User", userSchema);
