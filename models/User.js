const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
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
            trim: true
        },

        active: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }
    this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model("User", userSchema);