const express = require('express');

const router = express.Router();
const exerciseStates = new Map();

function nowMs() {
  return Date.now();
}

function getStateKey(sessionId, exerciseType, remoteAddr) {
  const sid = sessionId || remoteAddr || 'anonymous';
  return `${sid}:${exerciseType}`;
}

function getState(key, exerciseType) {
  if (!exerciseStates.has(key)) {
    exerciseStates.set(key, {
      repCounter: 0,
      stage: 'down',
      lastRepTime: 0,
      leftArmStage: 'down',
      rightArmStage: 'down',
      leftLegStage: 'down',
      rightLegStage: 'down',
      holdStart: 0,
      leftHoldStart: 0,
      rightHoldStart: 0,
      exerciseType,
    });
  }
  return exerciseStates.get(key);
}

function isPoint(p) {
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
}

function angle(a, b, c) {
  if (!isPoint(a) || !isPoint(b) || !isPoint(c)) return null;
  const bax = a.x - b.x;
  const bay = a.y - b.y;
  const bcx = c.x - b.x;
  const bcy = c.y - b.y;
  const dot = bax * bcx + bay * bcy;
  const magBA = Math.sqrt(bax * bax + bay * bay);
  const magBC = Math.sqrt(bcx * bcx + bcy * bcy);
  if (magBA === 0 || magBC === 0) return null;
  const cos = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return Math.acos(cos) * (180 / Math.PI);
}

function tryCountRep(state, currentTime, cooldown) {
  if (currentTime - state.lastRepTime > cooldown) {
    state.repCounter += 1;
    state.lastRepTime = currentTime;
    return true;
  }
  return false;
}

function processBicepCurl(landmarks, state, currentTime, cooldown, holdThreshold) {
  const left = angle(landmarks[11], landmarks[13], landmarks[15]);
  const right = angle(landmarks[12], landmarks[14], landmarks[16]);
  const result = { repCounter: state.repCounter, stage: state.stage, angles: {} };

  if (left != null) {
    result.angles.L = { value: left, position: landmarks[13] };
    if (left > 145) {
      state.leftArmStage = 'down';
      state.leftHoldStart = currentTime;
    }
    if (left < 50 && state.leftArmStage === 'down' && currentTime - state.leftHoldStart > holdThreshold) {
      state.leftArmStage = 'up';
      if (tryCountRep(state, currentTime, cooldown)) result.feedback = 'Left arm curl detected.';
    }
  }

  if (right != null) {
    result.angles.R = { value: right, position: landmarks[14] };
    if (right > 145) {
      state.rightArmStage = 'down';
      state.rightHoldStart = currentTime;
    }
    if (right < 50 && state.rightArmStage === 'down' && currentTime - state.rightHoldStart > holdThreshold) {
      state.rightArmStage = 'up';
      if (tryCountRep(state, currentTime, cooldown)) result.feedback = 'Right arm curl detected.';
    }
  }

  state.stage = state.leftArmStage === 'up' || state.rightArmStage === 'up' ? 'up' : 'down';
  result.repCounter = state.repCounter;
  result.stage = state.stage;
  return result;
}

function processSquat(landmarks, state, currentTime, cooldown) {
  const leftKnee = angle(landmarks[23], landmarks[25], landmarks[27]);
  const rightKnee = angle(landmarks[24], landmarks[26], landmarks[28]);
  const avg = leftKnee != null && rightKnee != null ? (leftKnee + rightKnee) / 2 : leftKnee ?? rightKnee;
  const result = { repCounter: state.repCounter, stage: state.stage, angles: {} };

  if (leftKnee != null) result.angles.L = { value: leftKnee, position: landmarks[25] };
  if (rightKnee != null) result.angles.R = { value: rightKnee, position: landmarks[26] };

  if (avg != null) {
    if (avg > 155) state.stage = 'up';
    if (avg < 95 && state.stage === 'up') {
      state.stage = 'down';
      if (tryCountRep(state, currentTime, cooldown)) result.feedback = 'Great squat rep!';
    }
  }
  result.repCounter = state.repCounter;
  result.stage = state.stage;
  return result;
}

function processPushup(landmarks, state, currentTime, cooldown) {
  const left = angle(landmarks[11], landmarks[13], landmarks[15]);
  const right = angle(landmarks[12], landmarks[14], landmarks[16]);
  const avg = left != null && right != null ? (left + right) / 2 : left ?? right;
  const result = { repCounter: state.repCounter, stage: state.stage, angles: {} };
  if (left != null) result.angles.L = { value: left, position: landmarks[13] };
  if (right != null) result.angles.R = { value: right, position: landmarks[14] };

  if (avg != null) {
    if (avg > 155) state.stage = 'up';
    if (avg < 95 && state.stage === 'up') {
      state.stage = 'down';
      if (tryCountRep(state, currentTime, cooldown)) result.feedback = 'Push-up counted.';
    }
  }

  result.repCounter = state.repCounter;
  result.stage = state.stage;
  return result;
}

function processShoulderPress(landmarks, state, currentTime, cooldown) {
  const left = angle(landmarks[13], landmarks[11], landmarks[23]);
  const right = angle(landmarks[14], landmarks[12], landmarks[24]);
  const avg = left != null && right != null ? (left + right) / 2 : left ?? right;
  const result = { repCounter: state.repCounter, stage: state.stage, angles: {} };
  if (left != null) result.angles.L = { value: left, position: landmarks[11] };
  if (right != null) result.angles.R = { value: right, position: landmarks[12] };

  if (avg != null) {
    if (avg < 55) state.stage = 'down';
    if (avg > 105 && state.stage === 'down') {
      state.stage = 'up';
      if (tryCountRep(state, currentTime, cooldown)) result.feedback = 'Shoulder press counted.';
    }
  }

  result.repCounter = state.repCounter;
  result.stage = state.stage;
  return result;
}

function processTricepExtension(landmarks, state, currentTime, cooldown) {
  const left = angle(landmarks[11], landmarks[13], landmarks[15]);
  const right = angle(landmarks[12], landmarks[14], landmarks[16]);
  const avg = left != null && right != null ? (left + right) / 2 : left ?? right;
  const result = { repCounter: state.repCounter, stage: state.stage, angles: {} };
  if (left != null) result.angles.L = { value: left, position: landmarks[13] };
  if (right != null) result.angles.R = { value: right, position: landmarks[14] };

  if (avg != null) {
    if (avg < 70) state.stage = 'down';
    if (avg > 150 && state.stage === 'down') {
      state.stage = 'up';
      if (tryCountRep(state, currentTime, cooldown)) result.feedback = 'Tricep extension counted.';
    }
  }

  result.repCounter = state.repCounter;
  result.stage = state.stage;
  return result;
}

function processLunge(landmarks, state, currentTime, cooldown) {
  const left = angle(landmarks[23], landmarks[25], landmarks[27]);
  const right = angle(landmarks[24], landmarks[26], landmarks[28]);
  const minKnee = left != null && right != null ? Math.min(left, right) : left ?? right;
  const result = { repCounter: state.repCounter, stage: state.stage, angles: {} };
  if (left != null) result.angles.L = { value: left, position: landmarks[25] };
  if (right != null) result.angles.R = { value: right, position: landmarks[26] };

  if (minKnee != null) {
    if (minKnee > 145) state.stage = 'up';
    if (minKnee < 95 && state.stage === 'up') {
      state.stage = 'down';
      if (tryCountRep(state, currentTime, cooldown)) result.feedback = 'Lunge counted.';
    }
  }

  result.repCounter = state.repCounter;
  result.stage = state.stage;
  return result;
}

function processRussianTwist(landmarks, state, currentTime, cooldown) {
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const midShoulder = isPoint(leftShoulder) && isPoint(rightShoulder)
    ? { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 }
    : null;
  const midHip = isPoint(leftHip) && isPoint(rightHip)
    ? { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 }
    : null;

  const result = { repCounter: state.repCounter, stage: state.stage, angles: {} };
  if (!midShoulder || !midHip) return result;

  const torsoX = midShoulder.x - midHip.x;
  result.angles.C = { value: Math.abs(torsoX) * 1000, position: midShoulder };

  if (torsoX < -0.06) state.stage = 'left';
  if (torsoX > 0.06 && state.stage === 'left') {
    state.stage = 'right';
    if (tryCountRep(state, currentTime, cooldown)) result.feedback = 'Russian twist counted.';
  }

  result.repCounter = state.repCounter;
  return result;
}

router.post('/process_landmarks', (req, res) => {
  try {
    const landmarks = Array.isArray(req.body?.landmarks) ? req.body.landmarks : [];
    const exerciseType = String(req.body?.exerciseType || 'bicepCurl');
    const sessionId = String(req.body?.sessionId || '');

    const key = getStateKey(sessionId, exerciseType, req.ip);
    const state = getState(key, exerciseType);
    const currentTime = nowMs();
    const cooldown = 1000;
    const holdThreshold = 500;

    let result = { repCounter: state.repCounter, stage: state.stage, feedback: '' };
    switch (exerciseType) {
      case 'squat':
        result = processSquat(landmarks, state, currentTime, cooldown);
        break;
      case 'pushup':
        result = processPushup(landmarks, state, currentTime, cooldown);
        break;
      case 'shoulderPress':
        result = processShoulderPress(landmarks, state, currentTime, cooldown);
        break;
      case 'tricepExtension':
        result = processTricepExtension(landmarks, state, currentTime, cooldown);
        break;
      case 'lunge':
        result = processLunge(landmarks, state, currentTime, cooldown);
        break;
      case 'russianTwist':
        result = processRussianTwist(landmarks, state, currentTime, cooldown);
        break;
      case 'bicepCurl':
      default:
        result = processBicepCurl(landmarks, state, currentTime, cooldown, holdThreshold);
        break;
    }

    return res.json(result);
  } catch (error) {
    console.error('RepBot processing error:', error);
    return res.status(500).json({ error: String(error?.message || error) });
  }
});

module.exports = router;
