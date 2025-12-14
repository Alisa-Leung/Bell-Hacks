document.addEventListener("DOMContentLoaded", () => {
    startCamera();
})

let mediaRecorder;
let recordedChunks = [];
let stream;

async function startCamera(){
    try{
        stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        const videoElement = document.getElementById("videoPreview");
        videoElement.srcObject = stream;
        videoElement.play();
    } catch (error){
        console.error("Error accessing camera:", error);
    }
}

function startRecording(){
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm"
    });
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0){
            recordedChunks.push(event.data);
        }
    };
    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, {
            type: "video/webm"
        });
        const url = URL.createObjectURL(blob);
        downloadVideo(url);
    };
    mediaRecorder.start();
}
function downloadVideo(url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recording.webm';
    a.click();
}
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}