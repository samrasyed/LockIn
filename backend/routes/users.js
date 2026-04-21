const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.put('/alarm-settings', async (req, res) => {
  try {
    const {
      type,
      volume,
      voiceType,
      customText,
      repeatFrequency,
      repeatCount,
      customAudioName,
      customAudioData,
      customAudioMimeType
    } = req.body;

    const normalizedSettings = {
      type: type || 'voice',
      volume: volume ?? 0.8,
      voiceType: voiceType || 'female',
      customText: customText || 'Stay focused!',
      repeatFrequency: repeatFrequency ?? 30,
      repeatCount: Math.min(5, Math.max(1, repeatCount ?? 3)),
      customAudioName: customAudioName || '',
      customAudioData: customAudioData || '',
      customAudioMimeType: customAudioMimeType || ''
    };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { alarmSettings: normalizedSettings },
      { new: true }
    );
    res.json({ alarmSettings: user.alarmSettings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({}).select('name totalStats streak').sort({ 'totalStats.totalMinutes': -1 }).limit(10);
    res.json({ leaderboard: users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

module.exports = router;
