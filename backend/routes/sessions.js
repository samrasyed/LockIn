const express = require('express');
const Session = require('../models/Session');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const formatLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

router.post('/', async (req, res) => {
  try {
    const {
      subject,
      duration,
      focusScore,
      timeBreakdown,
      distractions,
      distractionCount,
      pomodoroSessions,
      notes,
      startTime,
      endTime
    } = req.body;
    const session = new Session({
      userId: req.user._id,
      subject, duration,
      focusScore: typeof focusScore === 'number' ? focusScore : 0,
      timeBreakdown: timeBreakdown || {},
      distractions: distractions || [],
      distractionCount: distractionCount || {},
      pomodoroSessions: pomodoroSessions || 0,
      notes,
      startTime: new Date(startTime),
      endTime: new Date(endTime)
    });
    session.$locals = { preserveFocusScore: typeof focusScore === 'number' };
    await session.save();

    const user = await User.findById(req.user._id);
    user.totalStats.totalMinutes += duration;
    user.totalStats.totalSessions += 1;

    const allSessions = await Session.find({ userId: req.user._id });
    const avgScore = allSessions.reduce((sum, s) => sum + s.focusScore, 0) / allSessions.length;
    user.totalStats.avgFocusScore = Math.round(avgScore);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastStudy = user.streak.lastStudyDate ? new Date(user.streak.lastStudyDate) : null;

    if (lastStudy) {
      lastStudy.setHours(0, 0, 0, 0);
      const dayDiff = Math.floor((today - lastStudy) / (1000 * 60 * 60 * 24));
      if (dayDiff === 1) {
        user.streak.current += 1;
        if (user.streak.current > user.streak.longest) user.streak.longest = user.streak.current;
      } else if (dayDiff > 1) {
        user.streak.current = 1;
      }
    } else {
      user.streak.current = 1;
      user.streak.longest = 1;
    }
    user.streak.lastStudyDate = new Date();
    await user.save();

    res.status(201).json({ session, streak: user.streak });
  } catch (err) {
    console.error('Save session error:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join('. ') });
    }
    res.status(500).json({ error: 'Failed to save session.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { subject, limit = 20, page = 1 } = req.query;
    const filter = { userId: req.user._id };
    if (subject) filter.subject = subject;
    const sessions = await Session.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit));
    const total = await Session.countDocuments(filter);
    res.json({ sessions, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const subjectStats = await Session.aggregate([
      { $match: { userId } },
      { $group: { _id: '$subject', totalMinutes: { $sum: '$duration' }, avgFocusScore: { $avg: '$focusScore' }, sessionCount: { $sum: 1 } } },
      { $sort: { totalMinutes: -1 } }
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const dailyStats = await Session.aggregate([
      { $match: { userId, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalMinutes: { $sum: '$duration' },
          avgFocusScore: { $avg: '$focusScore' },
          sessionCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const recentSessions = await Session.find({ userId })
      .sort({ startTime: -1, createdAt: -1 })
      .lean();

    const todaySessions = recentSessions.filter(session => {
      const createdAt = new Date(session.createdAt);
      return createdAt >= startOfToday && createdAt <= endOfToday;
    });

    const todaySummary = {
      totalMinutes: todaySessions.reduce((sum, session) => sum + (session.duration || 0), 0),
      sessionCount: todaySessions.length,
      avgFocusScore: todaySessions.length
        ? Math.round(todaySessions.reduce((sum, session) => sum + (session.focusScore || 0), 0) / todaySessions.length)
        : 0
    };

    const dailyMap = new Map(
      dailyStats.map(day => [
        day._id,
        {
          date: day._id,
          totalMinutes: day.totalMinutes,
          avgFocusScore: Math.round(day.avgFocusScore || 0),
          sessionCount: day.sessionCount
        }
      ])
    );

    let runningStreak = 0;
    const streakHistory = [];
    for (let i = 0; i < 30; i += 1) {
      const day = new Date(thirtyDaysAgo);
      day.setDate(thirtyDaysAgo.getDate() + i);
      const key = formatLocalDateKey(day);
      const stats = dailyMap.get(key) || {
        date: key,
        totalMinutes: 0,
        avgFocusScore: 0,
        sessionCount: 0
      };

      runningStreak = stats.sessionCount > 0 ? runningStreak + 1 : 0;
      streakHistory.push({
        ...stats,
        streakCount: runningStreak
      });
    }

    res.json({
      subjectStats: subjectStats.map(subject => ({
        ...subject,
        avgFocusScore: Math.round(subject.avgFocusScore || 0)
      })),
      dailyStats: streakHistory,
      streakHistory,
      todaySummary,
      recentSessions
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

module.exports = router;
