const mongoose = require('mongoose');

const distractionEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['phone_detected', 'face_not_detected', 'looking_away'],
    required: true
  },
  timestamp: { type: Number, required: true },
  duration: { type: Number, default: 0 }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [50, 'Subject name too long']
  },
  duration: { type: Number, required: true, min: 0 },
  focusScore: { type: Number, required: true, min: 0, max: 100 },
  timeBreakdown: {
    totalTime: { type: Number, default: 0, min: 0 },
    focusedTime: { type: Number, default: 0, min: 0 },
    phoneTime: { type: Number, default: 0, min: 0 },
    noFaceTime: { type: Number, default: 0, min: 0 }
  },
  distractions: [distractionEventSchema],
  distractionCount: {
    phoneDetected: { type: Number, default: 0 },
    faceNotDetected: { type: Number, default: 0 },
    lookingAway: { type: Number, default: 0 }
  },
  pomodoroSessions: { type: Number, default: 0 },
  notes: { type: String, maxlength: 500 },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

sessionSchema.pre('save', function(next) {
  if (this.$locals?.preserveFocusScore) {
    this.focusScore = Math.max(0, Math.min(100, Math.round(this.focusScore)));
    return next();
  }

  const totalTime = this.timeBreakdown?.totalTime || 0;
  if (totalTime > 0) {
    const focusedRatio = (this.timeBreakdown.focusedTime || 0) / totalTime;
    const phoneRatio = (this.timeBreakdown.phoneTime || 0) / totalTime;
    const noFaceRatio = (this.timeBreakdown.noFaceTime || 0) / totalTime;
    const weightedScore = (
      (focusedRatio * 100) -
      (phoneRatio * 120) -
      (noFaceRatio * 60)
    );
    this.focusScore = Math.max(0, Math.min(100, Math.round(weightedScore)));
    return next();
  }

  const penalty =
    (this.distractionCount.phoneDetected * 3) +
    (this.distractionCount.faceNotDetected * 2) +
    (this.distractionCount.lookingAway * 1);
  const maxPenalty = Math.max(this.duration * 2, 10);
  this.focusScore = Math.max(0, Math.round(100 - (penalty / maxPenalty) * 100));
  next();
});

module.exports = mongoose.model('Session', sessionSchema);
