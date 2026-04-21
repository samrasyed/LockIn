const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  streak: {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastStudyDate: { type: Date, default: null }
  },
  totalStats: {
    totalMinutes: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
    avgFocusScore: { type: Number, default: 0 }
  },
  alarmSettings: {
    type: {
      type: String,
      enum: ['sound', 'voice', 'recording', 'silent'],
      default: 'voice'
    },
    volume: { type: Number, default: 0.8, min: 0, max: 1 },
    voiceType: { type: String, default: 'female' },
    customText: { type: String, default: 'Stay focused! Get back to studying!' },
    repeatFrequency: { type: Number, default: 30 },
    repeatCount: { type: Number, default: 3, min: 1, max: 5 },
    customAudioName: { type: String, default: '' },
    customAudioData: { type: String, default: '' },
    customAudioMimeType: { type: String, default: '' }
  },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
