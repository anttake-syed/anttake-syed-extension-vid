import { enumerateDevices, populateDeviceSelect } from './get-media-devices.js';

const $ = id => document.getElementById(id);
let audioCtx, animFrame;
let currentMicStream = null;
let currentCamStream = null;

async function requestPermissions() {
  $('requestBtn').style.display = 'none';
  $('errorBox').style.display = 'none';
  $('feedsGrid').style.display = 'grid';
  
  try {
    // Parse target from URL
    const urlParams = new URLSearchParams(window.location.search);
    const target = urlParams.get('target');

    const constraints = {
      audio: target === 'mic' || target === 'both' || !target,
      video: target === 'cam' || target === 'both' || !target
    };

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      // If asking for both failed (e.g. no camera attached), try just audio if they didn't specifically ask for cam
      if (err.name === 'NotFoundError' && constraints.video && target !== 'cam') {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        throw err;
      }
    }

    if (stream.getAudioTracks().length > 0) currentMicStream = new MediaStream(stream.getAudioTracks());
    if (stream.getVideoTracks().length > 0) currentCamStream = new MediaStream(stream.getVideoTracks());
    
    // Success!
    $('successBox').style.display = 'flex';
    
    // Handle Video
    const videoTrack = currentCamStream.getVideoTracks()[0];
    if (videoTrack) {
      $('camStatus').textContent = 'ACTIVE';
      $('camStatus').className = 'status-badge active';
      $('camVideo').srcObject = currentCamStream;
    }
    
    // Handle Audio
    const audioTrack = currentMicStream.getAudioTracks()[0];
    if (audioTrack) {
      $('micStatus').textContent = 'ACTIVE';
      $('micStatus').className = 'status-badge active';
      startVisualizer(currentMicStream);
    }

    // Now that permissions are granted, enumerate specific devices to fill the dropdowns
    // Device labels will be available because permissions were just granted.
    const devices = await enumerateDevices();
    $('micSelect').disabled = false;
    $('camSelect').disabled = false;
    populateDeviceSelect($('micSelect'), devices.audioInputs, 'Microphone');
    populateDeviceSelect($('camSelect'), devices.videoInputs, 'Camera');
    
    // Auto-select the currently active tracks if they match deviceIds
    if (audioTrack && audioTrack.getSettings().deviceId) {
      $('micSelect').value = audioTrack.getSettings().deviceId;
    }
    if (videoTrack && videoTrack.getSettings().deviceId) {
      $('camSelect').value = videoTrack.getSettings().deviceId;
    }

    // Save state to extension storage to auto-turn on the requested toggle
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const updates = {};
      if (target === 'mic' || target === 'both' || !target) {
        if (currentMicStream) {
          updates.recMic = true;
          updates.micPermissionGranted = true;
        }
      }
      if (target === 'cam' || target === 'both' || !target) {
        if (currentCamStream) {
          updates.recCam = true;
          updates.camPermissionGranted = true;
        }
      }
      chrome.storage.local.set(updates);
    }

  } catch (err) {
    // Error handling
    $('errorBox').style.display = 'flex';
    $('feedsGrid').style.display = 'none';
    $('requestBtn').style.display = 'flex';
    $('requestBtn').querySelector('span:last-child').textContent = 'Try Again';
    
    if (err.name === 'NotAllowedError') {
      $('errorText').innerHTML = '<strong>Permission Blocked.</strong><br>Please click the lock icon in the address bar and allow Camera and Microphone access.';
    } else if (err.name === 'NotFoundError') {
      $('errorText').innerHTML = '<strong>Device Not Found.</strong><br>Could not find a camera or microphone attached to this computer.';
    } else {
      $('errorText').innerHTML = `<strong>Error:</strong> ${err.message}`;
    }
  }
}

// Allow user to switch inputs via dropdowns
$('micSelect').addEventListener('change', async (e) => {
  const deviceId = e.target.value;
  if (!deviceId) return;
  
  if (currentMicStream) currentMicStream.getTracks().forEach(t => t.stop());
  if (audioCtx) { audioCtx.close(); audioCtx = null; }
  if (animFrame) cancelAnimationFrame(animFrame);
  
  try {
    currentMicStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } });
    startVisualizer(currentMicStream);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ selectedMicId: deviceId });
    }
  } catch (err) {
    console.error("Failed to switch mic:", err);
  }
});

$('camSelect').addEventListener('change', async (e) => {
  const deviceId = e.target.value;
  if (!deviceId) return;
  
  if (currentCamStream) currentCamStream.getTracks().forEach(t => t.stop());
  
  try {
    currentCamStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
    $('camVideo').srcObject = currentCamStream;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ selectedCamId: deviceId });
    }
  } catch (err) {
    console.error("Failed to switch camera:", err);
  }
});

function startVisualizer(stream) {
  audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const src = audioCtx.createMediaStreamSource(stream);
  const an = audioCtx.createAnalyser();
  an.fftSize = 256;
  src.connect(an);
  
  const buf = new Uint8Array(an.frequencyBinCount);
  const canvas = $('micCanvas');
  const ctx = canvas.getContext('2d');
  
  function draw() {
    animFrame = requestAnimationFrame(draw);
    an.getByteTimeDomainData(buf);
    
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buf.length);
    const pct = Math.min(rms * 4, 1);
    
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#10b981';
    const barH = pct * canvas.height;
    ctx.fillRect(0, canvas.height - barH, canvas.width, barH);
    
    $('volFill').style.width = Math.round(pct * 100) + '%';
  }
  draw();
}

window.addEventListener('beforeunload', () => {
  if (animFrame) cancelAnimationFrame(animFrame);
  if (currentMicStream) currentMicStream.getTracks().forEach(t => t.stop());
  if (currentCamStream) currentCamStream.getTracks().forEach(t => t.stop());
  if (audioCtx) audioCtx.close();
});

// Setup click listener
$('requestBtn').addEventListener('click', requestPermissions);
