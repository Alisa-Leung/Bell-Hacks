document.addEventListener("DOMContentLoaded", () => {
    startCamera();
    const selectedElement = document.getElementById("modeDropdown")
    document
        .getElementById("modeDropdown")
        .addEventListener("change", checkMode);

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