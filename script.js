document.addEventListener("DOMContentLoaded", () => {
    startCamera();
})

let mediaRecorder;
let recordedChunks = [];
let stream;
let isCameraOn = false;

async function startCamera(){
    try{
        stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        const videoElement = document.getElementById("videoPreview");
        videoElement.srcObject = stream;
        videoElement.play();
        isCameraOn = true;
    } catch (error){
        console.error("Error accessing camera:", error);
    }
}

function startRecording(){
    if (!isCameraOn) {
        console.log("Camera is not on");
        return;
    }
    
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/mp4"
    });
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0){
            recordedChunks.push(event.data);
        }
    };
    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, {
            type: "video/mp4"
        });
        const url = URL.createObjectURL(blob);
        downloadVideo(url);
        const videoElement = document.getElementById("videoPreview");
        videoElement.classList.remove("recording");
    };
    mediaRecorder.start();
    const videoElement = document.getElementById("videoPreview");
    videoElement.classList.add("recording");
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

function downloadVideo(url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recording.mp4';
    a.click();
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        const videoElement = document.getElementById("videoPreview");
        videoElement.srcObject = null;
        isCameraOn = false;
    }
}

function toggleCamera() {
    if (isCameraOn) {
        stopCamera();
    } else {
        startCamera();
    }
}