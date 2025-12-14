document.addEventListener("DOMContentLoaded", () => {
    startCamera();
    document
        .getElementById("modeDropdown")
        .addEventListener("change", checkMode);

})

let mediaRecorder;
let recordedChunks = [];
let stream;
let isCameraOn = false;
let isRecording = false;
let isPaused = false;

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

function toggleRecording(){
    if (!isCameraOn) {
        console.log("Camera is not on");
        return;
    }
    
    if (!isRecording) {
        recordedChunks = [];
        
        const options = { mimeType: 'video/mp4;codecs=vp9' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/mp4;codecs=vp8';
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/mp4';
            }
        }
        
        mediaRecorder = new MediaRecorder(stream, options);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0){
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, {
                type: mediaRecorder.mimeType
            });
            const url = URL.createObjectURL(blob);
            downloadVideo(url);
            const videoElement = document.getElementById("videoPreview");
            videoElement.classList.remove("recording");
            videoElement.classList.remove("paused");
            isRecording = false;
            isPaused = false;
            updateRecordButton();
        };
        
        mediaRecorder.start();
        isRecording = true;
        isPaused = false;
        
        const videoElement = document.getElementById("videoPreview");
        videoElement.classList.add("recording");
        updateRecordButton();
    } else {
        if (isPaused) {
            mediaRecorder.resume();
            isPaused = false;
            const videoElement = document.getElementById("videoPreview");
            videoElement.classList.remove("paused");
            updateRecordButton();
        } else {
            mediaRecorder.pause();
            isPaused = true;
            const videoElement = document.getElementById("videoPreview");
            videoElement.classList.add("paused");
            updateRecordButton();
        }
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

function downloadVideo(url) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${timestamp}.mp4`;
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

// Helper function to update button image
function updateRecordButton() {
    const recordButton = document.getElementById('recordPauseButton');
    if (!recordButton) return;
    if (!isRecording) {
        recordButton.src = 'imgs/record.png';
    } else if (isPaused) {
        recordButton.src = 'imgs/resume.png';
    } else {
        recordButton.src = 'imgs/pause.png';
    }
}

function checkMode() {
    const selectedValue = document.getElementById("modeDropdown").value;
    const timedMode = document.getElementById("timedMode");

    timedMode.innerHTML = "";

    if (selectedValue === "timed") {
        createTimer(timedMode);
    }
}

function createTimer(parent) {
    const container = document.createElement("div");
    container.id = "timerContainer";

    const display = document.createElement("div");
    display.id = "timerDisplay";
    display.textContent = "05:00";

    const selectorContainer = document.createElement("div");

    const timeInput = document.createElement("input");
    timeInput.type = "number";
    timeInput.min = "1";
    timeInput.value = "5";

    const label = document.createElement("span");
    label.textContent = " minutes";

    const buttonContainer = document.createElement("div");

    const startBtn = document.createElement("button");
    startBtn.textContent = "Start";

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "Reset";

    let timeLeft = 300;
    let timerId = null;
    let running = false;

    function update() {
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        display.textContent =
            `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    startBtn.onclick = () => {
        if (running) {
            clearInterval(timerId);
            startBtn.textContent = "Resume";
        } else {
            if (timeLeft === 0) {
                timeLeft = parseInt(timeInput.value) * 60;
                update();
            }

            timerId = setInterval(() => {
                timeLeft--;
                update();

                if (timeLeft <= 0) {
                    clearInterval(timerId);
                    alert("Time's up!");
                }
            }, 1000);

            startBtn.textContent = "Pause";
        }
        running = !running;
    };

    resetBtn.onclick = () => {
        clearInterval(timerId);
        timeLeft = parseInt(timeInput.value) * 60;
        running = false;
        startBtn.textContent = "Start";
        update();
    };

    selectorContainer.append(timeInput, label);
    buttonContainer.append(startBtn, resetBtn);
    container.append(display, selectorContainer, buttonContainer);
    parent.appendChild(container);
}