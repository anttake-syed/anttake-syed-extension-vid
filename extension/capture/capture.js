export async function startCapture(videoEl) {
    try {
        //Request.webcam + microphone

        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        })

        //Show preview in the video element if needed

        if (videoEl) {
            videoEl.srcObject = stream
            videoEl.play()
        }

        const recordChunks = []
        const mediaRecorder = new MediaRecorder(stream)

        // Collect the recorded data

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) recordChunks.push(event.data)
        }
    mediaRecorder.start()

    // Return a stop function that resolves to the blob

        const stop = () => new Promise((resolve) => {
            mediaRecorder.onstop =() => {
                const blob = new Blob(recordChunks, { type: 'video/webm'})
                // Stop all tracks to release camera/mic

                stream.getTracks().forEach(track => track.stop())
                resolve(blob)
            }
            mediaRecorder.stop()
        })
        return { stop }
    } catch (err) {
    console.error('Error starting capture:', err);
    throw err;
  }

}