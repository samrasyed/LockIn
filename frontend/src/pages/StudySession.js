import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getApiErrorMessage } from '../utils/apiError';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Target } from 'lucide-react';

const DEFAULT_ALARM_SETTINGS = {
  type: 'voice',
  volume: 0.8,
  voiceType: 'female',
  customText: 'Stay focused! Get back to studying!',
  repeatFrequency: 30,
  repeatCount: 3,
  customAudioName: '',
  customAudioData: '',
  customAudioMimeType: ''
};

export default function StudySession() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const detectionRef = useRef(null);
  const detectionLoopActiveRef = useRef(false);
  const detectionInFlightRef = useRef(false);
  const startTimeRef = useRef(null);
  const latestSecondsRef = useRef(0);
  const faceMissingSinceRef = useRef(null);
  const lastAlertAtRef = useRef({ phone: 0, noFace: 0 });
  const alertTimeoutRef = useRef(null);
  const speechTimeoutRef = useRef(null);
  const customAudioRef = useRef(null);
  const focusScoreRef = useRef(100);
  const liveMetricsRef = useRef({
    totalTime: 0,
    focusedTime: 0,
    phoneTime: 0,
    noFaceTime: 0
  });
  const lastDetectionAtRef = useRef(null);
  const lastBehaviorRef = useRef('focused');

  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [subject, setSubject] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [alert, setAlert] = useState(null);
  const [stats, setStats] = useState({ phone: 0, noFace: 0 });
  const [distractions, setDistractions] = useState([]);
  const [focusLevel, setFocusLevel] = useState('good');
  const [focusScore, setFocusScore] = useState(100);
  const [models, setModels] = useState(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState(false);
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [pomodoroPhase, setPomodoroPhase] = useState('work');
  const [cameraError, setCameraError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [alarmSettings, setAlarmSettings] = useState(DEFAULT_ALARM_SETTINGS);
  const [savingAlarm, setSavingAlarm] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState({
    totalTime: 0,
    focusedTime: 0,
    phoneTime: 0,
    noFaceTime: 0
  });

  useEffect(() => {
    latestSecondsRef.current = seconds;
  }, [seconds]);

  const computeTimeBasedFocusScore = useCallback((metrics) => {
    const totalTime = Math.max(metrics.totalTime, 1);
    const focusedRatio = metrics.focusedTime / totalTime;
    const phoneRatio = metrics.phoneTime / totalTime;
    const noFaceRatio = metrics.noFaceTime / totalTime;
    const weightedScore = (
      (focusedRatio * 100) -
      (phoneRatio * 120) -
      (noFaceRatio * 60)
    );
    return Math.max(0, Math.min(100, weightedScore));
  }, []);

  const pushBehaviorTime = useCallback((behavior, elapsedMs) => {
    if (elapsedMs <= 0) return;

    const nextMetrics = { ...liveMetricsRef.current };
    nextMetrics.totalTime += elapsedMs;

    if (behavior === 'phone') {
      nextMetrics.phoneTime += elapsedMs;
    } else if (behavior === 'noFace') {
      nextMetrics.noFaceTime += elapsedMs;
    } else {
      nextMetrics.focusedTime += elapsedMs;
    }

    liveMetricsRef.current = nextMetrics;
    setLiveMetrics(nextMetrics);

    const targetScore = computeTimeBasedFocusScore(nextMetrics);
    const smoothedScore = (focusScoreRef.current * 0.7) + (targetScore * 0.3);
    focusScoreRef.current = smoothedScore;
    setFocusScore(Math.round(smoothedScore));
  }, [computeTimeBasedFocusScore]);

  useEffect(() => {
    if (user?.alarmSettings) {
      setAlarmSettings({
        ...DEFAULT_ALARM_SETTINGS,
        ...user.alarmSettings
      });
    }
  }, [user]);

  // Pomodoro timer
  useEffect(() => {
    if (!isActive || !pomodoroMode) return;
    const interval = setInterval(() => {
      setPomodoroSeconds(prev => {
        if (prev <= 1) {
          const nextPhase = pomodoroPhase === 'work' ? 'break' : 'work';
          setPomodoroPhase(nextPhase);
          toast.success(nextPhase === 'break' ? '🎉 Break time! 5 minutes.' : '📚 Back to work!');
          return nextPhase === 'work' ? 25 * 60 : 5 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, pomodoroMode, pomodoroPhase]);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const stopCustomAudio = useCallback(() => {
    if (customAudioRef.current) {
      customAudioRef.current.pause();
      customAudioRef.current.currentTime = 0;
      customAudioRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCustomAudio();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopCustomAudio]);

  const playBuiltInAlarm = useCallback((type, repeatCount = 3, volume = 0.8) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const safeVolume = Math.min(1, Math.max(0, volume));
      const cycles = Math.min(5, Math.max(1, repeatCount));

      if (type === 'phone') {
        Array.from({ length: cycles }).forEach((_, cycleIndex) => {
          const cycleOffset = cycleIndex * 0.7;
          [0, 0.18, 0.36].forEach(delay => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(1200, ctx.currentTime + cycleOffset + delay);
            gain.gain.setValueAtTime(Math.max(0.2, safeVolume), ctx.currentTime + cycleOffset + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cycleOffset + delay + 0.14);
            osc.start(ctx.currentTime + cycleOffset + delay);
            osc.stop(ctx.currentTime + cycleOffset + delay + 0.14);
          });
        });
      } else {
        Array.from({ length: cycles }).forEach((_, cycleIndex) => {
          const cycleOffset = cycleIndex * 0.8;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, ctx.currentTime + cycleOffset);
          osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + cycleOffset + 0.5);
          gain.gain.setValueAtTime(Math.max(0.2, safeVolume), ctx.currentTime + cycleOffset);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cycleOffset + 0.6);
          osc.start(ctx.currentTime + cycleOffset);
          osc.stop(ctx.currentTime + cycleOffset + 0.6);
        });
      }
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }, []);

  const playCustomRecording = useCallback((audioData, mimeType, repeatCount = 3, volume = 0.8) => {
    if (!audioData) return;

    stopCustomAudio();

    const media = document.createElement(
      mimeType?.startsWith('video/') ? 'video' : 'audio'
    );
    media.src = audioData;
    media.preload = 'auto';
    media.volume = Math.min(1, Math.max(0, volume));
    media.muted = false;
    media.playsInline = true;
    customAudioRef.current = media;

    let playCount = 0;
    const maxPlays = Math.min(5, Math.max(1, repeatCount));

    const playNext = () => {
      if (playCount >= maxPlays || !detectionLoopActiveRef.current) {
        stopCustomAudio();
        return;
      }

      playCount += 1;
      media.currentTime = 0;
      media.play().catch(err => {
        console.warn('Custom media playback failed:', err);
        stopCustomAudio();
      });
    };

    media.onended = playNext;
    playNext();
  }, [stopCustomAudio]);

  const handleAudioImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!(file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
      toast.error('Please choose an audio or video file.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Please choose a file smaller than 15 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAlarmSettings(prev => ({
        ...prev,
        type: 'recording',
        customAudioName: file.name,
        customAudioData: reader.result,
        customAudioMimeType: file.type
      }));
      toast.success(
        file.type.startsWith('video/')
          ? 'Video imported. Its audio track will be used as the alarm.'
          : 'Audio imported for the alarm.'
      );
    };
    reader.onerror = () => {
      toast.error('Could not read the selected media file.');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const saveAlarmSettings = async () => {
    setSavingAlarm(true);
    try {
      const payload = {
        ...alarmSettings,
        repeatCount: Math.min(5, Math.max(1, Number(alarmSettings.repeatCount) || 3)),
        volume: Math.min(1, Math.max(0, Number(alarmSettings.volume) || 0))
      };
      const res = await api.put('/users/alarm-settings', payload);
      setAlarmSettings({
        ...DEFAULT_ALARM_SETTINGS,
        ...res.data.alarmSettings
      });
      updateUser({ alarmSettings: res.data.alarmSettings });
      toast.success('Alarm settings saved.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save alarm settings.');
    } finally {
      setSavingAlarm(false);
    }
  };

  const triggerAlarmPreview = () => {
    const message = alarmSettings.customText?.trim() || 'Stay focused! Get back to studying!';
    showAlert('phone', message, true);
  };

  // Load TensorFlow models
  const loadModels = async () => {
    setModelsLoading(true);
    try {
      const tf = await import('@tensorflow/tfjs');
      await import('@tensorflow/tfjs-backend-webgl');
      await tf.setBackend('webgl');
      await tf.ready();
      const [blazeface, cocoSsd] = await Promise.all([
        import('@tensorflow-models/blazeface'),
        import('@tensorflow-models/coco-ssd')
      ]);
      const [faceModel, objModel] = await Promise.all([
        blazeface.load(),
        cocoSsd.load()
      ]);
      setModels({ face: faceModel, obj: objModel });
      toast.success('AI models loaded! 🤖');
    } catch (err) {
      toast.error('AI models failed. Basic session will continue.');
      console.error(err);
    } finally {
      setModelsLoading(false);
    }
  };

  // Start webcam
  const startCamera = async () => {
    try {
      setCameraError(null);
      setCameraReady(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current.play();
            setCameraReady(true);
          } catch (e) {
            console.error('Play failed:', e);
          }
        };
        videoRef.current.oncanplay = async () => {
          try {
            await videoRef.current.play();
            setCameraReady(true);
          } catch (e) {
            console.error('Canplay error:', e);
          }
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Camera access denied. Please allow camera in browser settings.');
      toast.error('Camera access denied!');
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  // Show alert with 3 warning triggers using built-in sound, voice, or imported recording.
  const showAlert = useCallback((type, message, force = false) => {
    const now = Date.now();
    const cooldown = type === 'phone' ? 2500 : 5000;

    if (!force && now - lastAlertAtRef.current[type] < cooldown) {
      return;
    }

    lastAlertAtRef.current[type] = now;
    setAlert({ type, message });
    setFocusLevel(type === 'phone' ? 'danger' : 'warning');

    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopCustomAudio();

    const repeatCount = Math.min(5, Math.max(1, Number(alarmSettings.repeatCount) || 3));
    const volume = Math.min(1, Math.max(0, Number(alarmSettings.volume) || 0.8));
    const textToSpeak = alarmSettings.customText?.trim() || message;

    if (alarmSettings.type === 'recording' && alarmSettings.customAudioData) {
      playCustomRecording(
        alarmSettings.customAudioData,
        alarmSettings.customAudioMimeType,
        repeatCount,
        volume
      );
    } else if (alarmSettings.type === 'voice' && window.speechSynthesis) {
      speechTimeoutRef.current = setTimeout(() => {
        const synth = window.speechSynthesis;
        const voices = synth.getVoices();
        const preferredVoice = voices.find(voice =>
          alarmSettings.voiceType === 'male'
            ? /male|david|mark|guy/i.test(voice.name)
            : /female|zira|samantha|aria/i.test(voice.name)
        );
        let remaining = repeatCount;

        const speakNext = () => {
          if (remaining <= 0 || (!detectionLoopActiveRef.current && !force)) {
            return;
          }

          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.rate = 0.92;
          utterance.volume = volume;
          utterance.pitch = type === 'phone' ? 1.2 : 1.0;
          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }
          utterance.onend = () => {
            remaining -= 1;
            if (remaining > 0) {
              speakNext();
            }
          };
          utterance.onerror = () => {
            remaining = 0;
          };
          synth.speak(utterance);
        };

        speakNext();
      }, 250);
    } else if (alarmSettings.type !== 'silent') {
      playBuiltInAlarm(type, repeatCount, volume);
    }

    alertTimeoutRef.current = setTimeout(() => {
      setAlert(null);
      setFocusLevel('good');
    }, 5000);
  }, [alarmSettings, playBuiltInAlarm, playCustomRecording, stopCustomAudio]);

  // AI Detection loop
  const runDetection = useCallback(async () => {
    if (!models || !videoRef.current || detectionInFlightRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2 || video.paused || video.ended) return;

    detectionInFlightRef.current = true;

    try {
      const [faces, objects] = await Promise.all([
        models.face.estimateFaces(video, false),
        models.obj.detect(video)
      ]);

      const now = Date.now();
      const elapsedMs = lastDetectionAtRef.current ? now - lastDetectionAtRef.current : 0;
      const faceFound = faces.length > 0;
      const phoneFound = objects.some(o => o.class === 'cell phone' && o.score >= 0.2);
      const phoneMessage = alarmSettings.customText?.trim() || 'Phone detected! Put it down and focus!';
      const noFaceMessage = alarmSettings.customText?.trim() || 'Stay focused! I cannot see you!';
      const behavior = phoneFound ? 'phone' : faceFound ? 'focused' : 'noFace';

      pushBehaviorTime(lastBehaviorRef.current, elapsedMs);
      lastDetectionAtRef.current = now;
      lastBehaviorRef.current = behavior;

      if (phoneFound) {
        faceMissingSinceRef.current = null;
        showAlert('phone', phoneMessage);
        setStats(p => ({ ...p, phone: p.phone + 1 }));
        setDistractions(p => [...p, { type: 'phone_detected', timestamp: latestSecondsRef.current, duration: 0 }]);
      } else if (!faceFound) {
        if (!faceMissingSinceRef.current) {
          faceMissingSinceRef.current = now;
        }

        if (now - faceMissingSinceRef.current >= 5000) {
          showAlert('noFace', noFaceMessage);
          setStats(p => ({ ...p, noFace: p.noFace + 1 }));
          setDistractions(p => [...p, { type: 'face_not_detected', timestamp: latestSecondsRef.current, duration: 0 }]);
        } else {
          setFocusLevel('warning');
        }
      } else {
        faceMissingSinceRef.current = null;
        setFocusLevel('good');
      }
    } catch (err) {
      console.warn('Detection error:', err);
    } finally {
      detectionInFlightRef.current = false;
    }
  }, [alarmSettings.customText, models, pushBehaviorTime, showAlert]);

  // Start detection loop with faster polling for quicker phone pickup alerts.
  useEffect(() => {
    if (isActive && models && cameraReady) {
      detectionLoopActiveRef.current = true;

      const loop = async () => {
        if (!detectionLoopActiveRef.current) {
          return;
        }

        await runDetection();

        if (detectionLoopActiveRef.current) {
          detectionRef.current = setTimeout(loop, 250);
        }
      };

      loop();
    }

    return () => {
      detectionLoopActiveRef.current = false;
      detectionInFlightRef.current = false;
      clearTimeout(detectionRef.current);
    };
  }, [isActive, models, cameraReady, runDetection]);

  // Session timer
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => setSeconds(p => p + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive]);

  // Start session
  const startSession = async () => {
    if (!subjectInput.trim()) {
      toast.error('Please enter a subject first!');
      return;
    }
    setSubject(subjectInput);
    setSeconds(0);
    setStats({ phone: 0, noFace: 0 });
    setDistractions([]);
    setFocusScore(100);
    setLiveMetrics({
      totalTime: 0,
      focusedTime: 0,
      phoneTime: 0,
      noFaceTime: 0
    });
    faceMissingSinceRef.current = null;
    lastAlertAtRef.current = { phone: 0, noFace: 0 };
    focusScoreRef.current = 100;
    liveMetricsRef.current = {
      totalTime: 0,
      focusedTime: 0,
      phoneTime: 0,
      noFaceTime: 0
    };
    lastDetectionAtRef.current = null;
    lastBehaviorRef.current = 'focused';
    startTimeRef.current = new Date();
    setIsActive(true);
    await startCamera();
    loadModels();
    toast.success('Session started! Stay focused!');
  };

  // End session and save
  const endSession = async () => {
    const now = Date.now();
    if (lastDetectionAtRef.current) {
      pushBehaviorTime(lastBehaviorRef.current, now - lastDetectionAtRef.current);
      lastDetectionAtRef.current = now;
    }

    setIsActive(false);
    detectionLoopActiveRef.current = false;
    stopCamera();
    stopCustomAudio();
    clearInterval(timerRef.current);
    clearTimeout(detectionRef.current);
    clearTimeout(alertTimeoutRef.current);
    clearTimeout(speechTimeoutRef.current);
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    const elapsedSeconds = startTimeRef.current
      ? Math.max(seconds, Math.round((Date.now() - startTimeRef.current.getTime()) / 1000))
      : seconds;
    const duration = Math.max(1, Math.ceil(elapsedSeconds / 60));
    const finalMetrics = liveMetricsRef.current;
    const finalFocusScore = Math.round(computeTimeBasedFocusScore(finalMetrics));
    if (elapsedSeconds < 1) {
      toast.error('Start the session before saving.');
      navigate('/dashboard');
      return;
    }

    try {
      await api.post('/sessions', {
        subject,
        duration,
        focusScore: finalFocusScore,
        timeBreakdown: {
          totalTime: Math.round(finalMetrics.totalTime / 1000),
          focusedTime: Math.round(finalMetrics.focusedTime / 1000),
          phoneTime: Math.round(finalMetrics.phoneTime / 1000),
          noFaceTime: Math.round(finalMetrics.noFaceTime / 1000)
        },
        distractions,
        distractionCount: {
          phoneDetected: stats.phone,
          faceNotDetected: stats.noFace,
          lookingAway: 0
        },
        startTime: startTimeRef.current,
        endTime: new Date()
      });
      toast.success(`Great session! ${duration} minute${duration === 1 ? '' : 's'} saved!`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save session.'));
    }
    navigate('/dashboard');
  };

  const focusColor = focusLevel === 'good' ? '#00e5a0' : focusLevel === 'warning' ? '#ffa502' : '#ff4757';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.logo} style={{ display: 'flex', alignItems: 'center', gap: '8px', ...styles.logo }}>
          <Target size={24} color="#00e5a0" strokeWidth={2.5} /> LockIn
        </span>
        <button style={styles.backBtn} onClick={() => { stopCamera(); stopCustomAudio(); navigate('/dashboard'); }}>
          ← Dashboard
        </button>
      </div>

      <div style={styles.content}>
        {!isActive ? (
          <div style={styles.setupCard}>
            <h1 style={styles.setupTitle}>Start a Study Session</h1>
            <p style={styles.setupSubtitle}>AI will monitor your focus in real-time 🤖</p>
            <input
              style={styles.subjectInput}
              placeholder="What are you studying? (e.g. Math, DSA)"
              value={subjectInput}
              onChange={e => setSubjectInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && startSession()}
            />
            <div style={styles.toggleRow}>
              <span style={styles.toggleLabel}>🍅 Pomodoro Mode (25/5 min)</span>
              <div
                style={{ ...styles.toggle, background: pomodoroMode ? '#00e5a0' : '#1d2940' }}
                onClick={() => setPomodoroMode(!pomodoroMode)}
              >
                <div style={{ ...styles.toggleKnob, transform: pomodoroMode ? 'translateX(24px)' : 'translateX(0)' }} />
              </div>
            </div>
            <div style={styles.settingsCard}>
              <div style={styles.settingsTitle}>Alarm Customization</div>
              <div style={styles.settingsGrid}>
                <label style={styles.fieldLabel}>
                  Alarm Type
                  <select
                    style={styles.selectInput}
                    value={alarmSettings.type}
                    onChange={e => setAlarmSettings(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="voice">Voice words</option>
                    <option value="sound">Built-in buzzer</option>
                    <option value="recording">Imported recording</option>
                    <option value="silent">Popup only</option>
                  </select>
                </label>
                <label style={styles.fieldLabel}>
                  Trigger Count
                  <input
                    style={styles.textInput}
                    type="number"
                    min="1"
                    max="5"
                    value={alarmSettings.repeatCount}
                    onChange={e => setAlarmSettings(prev => ({ ...prev, repeatCount: e.target.value }))}
                  />
                </label>
                <label style={styles.fieldLabel}>
                  Volume
                  <input
                    style={styles.rangeInput}
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={alarmSettings.volume}
                    onChange={e => setAlarmSettings(prev => ({ ...prev, volume: e.target.value }))}
                  />
                </label>
                <label style={styles.fieldLabel}>
                  Voice Type
                  <select
                    style={styles.selectInput}
                    value={alarmSettings.voiceType}
                    onChange={e => setAlarmSettings(prev => ({ ...prev, voiceType: e.target.value }))}
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </label>
              </div>
              <label style={styles.fieldLabel}>
                Custom Warning Words
                <textarea
                  style={styles.textArea}
                  rows={3}
                  placeholder="Type the exact warning you want to hear."
                  value={alarmSettings.customText}
                  onChange={e => setAlarmSettings(prev => ({ ...prev, customText: e.target.value }))}
                />
              </label>
              <label style={styles.fieldLabel}>
                Import Your Recording
                <input
                  style={styles.fileInput}
                  type="file"
                  accept="audio/*,video/*,.mp3,.mp4,.wav,.m4a,.webm,.mov"
                  onChange={handleAudioImport}
                />
              </label>
              {alarmSettings.customAudioName && (
                <div style={styles.audioNote}>Loaded: {alarmSettings.customAudioName}</div>
              )}
              <div style={styles.settingsActions}>
                <button type="button" style={styles.secondaryBtn} onClick={triggerAlarmPreview}>
                  Test Alarm
                </button>
                <button type="button" style={styles.secondaryBtn} onClick={saveAlarmSettings} disabled={savingAlarm}>
                  {savingAlarm ? 'Saving...' : 'Save Alarm'}
                </button>
              </div>
            </div>
            <button style={styles.startBtn} onClick={startSession}>
              🚀 Start Session
            </button>
            <div style={styles.featureList}>
              <div style={styles.feature}>👁️ Face detection</div>
              <div style={styles.feature}>📱 Phone detection</div>
              <div style={styles.feature}>🔊 Sound + voice alerts</div>
              <div style={styles.feature}>📊 Focus score</div>
            </div>
          </div>
        ) : (
          <div style={styles.sessionLayout}>
            <div style={styles.cameraSection}>
              <div style={{ ...styles.cameraWrapper, borderColor: focusColor, boxShadow: `0 0 30px ${focusColor}40` }}>
                {cameraError ? (
                  <div style={styles.cameraError}>
                    <div style={{ fontSize: 48 }}>📷</div>
                    <p>{cameraError}</p>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    muted={true}
                    autoPlay={true}
                    playsInline={true}
                    style={styles.video}
                  />
                )}
                <div style={{ ...styles.focusBadge, background: focusColor }}>
                  {focusLevel === 'good' ? '✅ Focused' : focusLevel === 'warning' ? '⚠️ Warning' : '🚨 ALERT'}
                </div>
                {!cameraReady && !cameraError && (
                  <div style={styles.loadingOverlay}>📷 Starting camera...</div>
                )}
                {modelsLoading && (
                  <div style={{ ...styles.loadingOverlay, bottom: 50 }}>⏳ Loading AI models...</div>
                )}
              </div>

              {alert && (
                <div style={{
                  ...styles.alertBox,
                  borderColor: alert.type === 'phone' ? '#ff4757' : '#ffa502',
                  background: alert.type === 'phone' ? 'rgba(255,71,87,0.1)' : 'rgba(255,165,2,0.1)',
                  animation: 'pulse 0.5s ease'
                }}>
                  <span style={{ fontSize: 32 }}>{alert.type === 'phone' ? '📱' : '👀'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: alert.type === 'phone' ? '#ff4757' : '#ffa502' }}>
                      {alert.type === 'phone' ? '🚨 PHONE DETECTED!' : '⚠️ FACE NOT VISIBLE!'}
                    </div>
                    <div style={styles.alertText}>{alert.message}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.statsPanel}>
              <div style={styles.timerCard}>
                <div style={styles.timerLabel}>
                  {pomodoroMode ? `🍅 ${pomodoroPhase === 'work' ? 'Focus Time' : 'Break Time'}` : '⏱️ Session Time'}
                </div>
                <div style={styles.timerDisplay}>
                  {pomodoroMode ? formatTime(pomodoroSeconds) : formatTime(seconds)}
                </div>
                {pomodoroMode && <div style={styles.totalTime}>Total: {formatTime(seconds)}</div>}
              </div>

              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>📚 Studying</div>
                <div style={styles.infoValue}>{subject}</div>
              </div>

              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>📊 Distractions</div>
                <div style={styles.distractionRow}>
                  <span>📱 Phone detected</span>
                  <span style={{ color: stats.phone > 0 ? '#ff4757' : '#00e5a0', fontWeight: 700 }}>{stats.phone}</span>
                </div>
                <div style={styles.distractionRow}>
                  <span>👤 Face not seen</span>
                  <span style={{ color: stats.noFace > 0 ? '#ffa502' : '#00e5a0', fontWeight: 700 }}>{stats.noFace}</span>
                </div>
              </div>

              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>🎯 Focus Score</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 800, color: focusColor }}>
                  {focusScore}%
                </div>
              </div>

              <button style={styles.endBtn} onClick={endSession}>
                ⏹️ End & Save Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#080b12', color: '#e8eaf0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0d1117' },
  logo: { fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#00e5a0' },
  backBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8892a4', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 },
  content: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
  setupCard: { maxWidth: 560, margin: '0 auto', background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: 40, textAlign: 'center' },
  setupTitle: { fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, margin: '0 0 8px' },
  setupSubtitle: { color: '#8892a4', marginBottom: 32, marginTop: 0 },
  subjectInput: { width: '100%', background: '#131a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px', color: '#e8eaf0', fontSize: 15, outline: 'none', marginBottom: 16, boxSizing: 'border-box' },
  toggleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '12px 16px', background: '#131a24', borderRadius: 10 },
  toggleLabel: { color: '#e8eaf0', fontSize: 14 },
  toggle: { width: 48, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative', transition: 'background 0.3s' },
  toggleKnob: { position: 'absolute', top: 2, left: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'transform 0.3s' },
  settingsCard: { textAlign: 'left', background: '#131a24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18, marginBottom: 20 },
  settingsTitle: { fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 14, color: '#f5f7fb' },
  settingsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#c7d0dd', marginBottom: 14 },
  selectInput: { width: '100%', background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 14px', color: '#e8eaf0', fontSize: 14, outline: 'none' },
  textInput: { width: '100%', background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 14px', color: '#e8eaf0', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  rangeInput: { width: '100%', accentColor: '#00e5a0' },
  textArea: { width: '100%', background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 14px', color: '#e8eaf0', fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'vertical' },
  fileInput: { color: '#c7d0dd' },
  audioNote: { fontSize: 12, color: '#00e5a0', marginTop: -6, marginBottom: 14 },
  settingsActions: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  secondaryBtn: { background: 'transparent', color: '#e8eaf0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  startBtn: { width: '100%', background: '#00e5a0', color: '#080b12', border: 'none', borderRadius: 12, padding: '16px', fontSize: 17, fontWeight: 800, cursor: 'pointer', fontFamily: 'Syne, sans-serif', marginBottom: 24 },
  featureList: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, textAlign: 'left' },
  feature: { background: '#131a24', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#8892a4' },
  sessionLayout: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' },
  cameraSection: { display: 'flex', flexDirection: 'column', gap: 16 },
  cameraWrapper: { position: 'relative', borderRadius: 16, overflow: 'hidden', border: '3px solid', transition: 'all 0.5s', background: '#000' },
  video: { width: '100%', display: 'block', minHeight: 420, objectFit: 'cover', transform: 'scaleX(-1)', background: '#000' },
  cameraError: { minHeight: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8892a4', gap: 12 },
  focusBadge: { position: 'absolute', top: 16, left: 16, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, color: '#080b12' },
  loadingOverlay: { position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', color: '#00e5a0', padding: '8px 20px', borderRadius: 20, fontSize: 13, whiteSpace: 'nowrap' },
  alertBox: { border: '2px solid', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 },
  alertText: { fontSize: 14, color: '#e8eaf0', marginTop: 4 },
  statsPanel: { display: 'flex', flexDirection: 'column', gap: 16 },
  timerCard: { background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 24, textAlign: 'center' },
  timerLabel: { color: '#8892a4', fontSize: 13, marginBottom: 8 },
  timerDisplay: { fontFamily: 'Syne, sans-serif', fontSize: 52, fontWeight: 800, color: '#00e5a0', letterSpacing: 2 },
  totalTime: { color: '#8892a4', fontSize: 12, marginTop: 4 },
  infoCard: { background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20 },
  infoLabel: { color: '#8892a4', fontSize: 12, marginBottom: 8 },
  infoValue: { fontWeight: 700, fontSize: 16 },
  distractionRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, borderBottom: '1px solid rgba(255,255,255,0.05)' },
  endBtn: { background: '#ff4757', color: 'white', border: 'none', borderRadius: 12, padding: '16px', fontSize: 16, fontWeight: 700, cursor: 'pointer', width: '100%', fontFamily: 'Syne, sans-serif' }
};
