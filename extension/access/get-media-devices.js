// extension/js/get-media-devices.js
// Handles enumerating and selecting media devices (microphones and cameras)

export async function enumerateDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.warn("enumerateDevices() not supported.");
    return { audioInputs: [], videoInputs: [] };
  }
  
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');
    const videoInputs = devices.filter(device => device.kind === 'videoinput');
    
    return { audioInputs, videoInputs };
  } catch (err) {
    console.error("Error enumerating devices:", err);
    return { audioInputs: [], videoInputs: [] };
  }
}

export function populateDeviceSelect(selectEl, devices, defaultLabel) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  
  if (devices.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No devices found';
    selectEl.appendChild(opt);
    selectEl.disabled = true;
    return;
  }
  
  selectEl.disabled = false;
  devices.forEach((device, index) => {
    const opt = document.createElement('option');
    opt.value = device.deviceId;
    // Sometimes device labels are empty until permission is fully granted
    opt.textContent = device.label || `${defaultLabel} ${index + 1}`;
    selectEl.appendChild(opt);
  });
}
