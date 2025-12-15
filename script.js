const GEMINI_API_KEY = 'AIzaSyCTOffIhfovXKLqCDnPUJgFmIBX05-LIpY';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

document.addEventListener("DOMContentLoaded", () => {
    startCamera();
    document
        .getElementById("modeDropdown")
        .addEventListener("change", checkMode);
    document
        .getElementById("documentUpload")
        .addEventListener("change", handleFileUpload);
    
    // Disable recording controls initially
    updateRecordingControlsState();
})

let mediaRecorder;
let recordedChunks = [];
let stream;
let isCameraOn = false;
let isRecording = false;
let isPaused = false;

// Speech recognition variables
let recognition = null;
let speechTranscript = '';
let isListening = false;

// Initialize speech recognition
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                speechTranscript += finalTranscript;
                console.log('Speech captured:', finalTranscript);
            }

            // Update UI to show we're listening
            updateTranscriptDisplay(speechTranscript, interimTranscript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                // Restart if no speech detected
                if (isListening && isRecording && !isPaused) {
                    recognition.start();
                }
            }
        };

        recognition.onend = () => {
            // Restart if we're still supposed to be listening
            if (isListening && isRecording && !isPaused) {
                recognition.start();
            }
        };
    } else {
        console.error('Speech recognition not supported');
        showNotification('Speech recognition not supported in this browser');
    }
}

function startListening() {
    if (!recognition) {
        initSpeechRecognition();
    }
    
    if (recognition && !isListening) {
        speechTranscript = '';
        isListening = true;
        recognition.start();
        console.log('Started listening...');
    }
}

function stopListening() {
    if (recognition && isListening) {
        isListening = false;
        recognition.stop();
        console.log('Stopped listening. Final transcript:', speechTranscript);
    }
}

function pauseListening() {
    if (recognition && isListening) {
        recognition.stop();
        console.log('Paused listening. Current transcript:', speechTranscript);
    }
}

function resumeListening() {
    if (recognition && isListening && isRecording && !isPaused) {
        recognition.start();
        console.log('Resumed listening...');
    }
}

function updateTranscriptDisplay(finalText, interimText) {
    let transcriptDiv = document.getElementById('transcriptDisplay');
    if (!transcriptDiv) {
        transcriptDiv = document.createElement('div');
        transcriptDiv.id = 'transcriptDisplay';
        transcriptDiv.style.overflowX = "normal";
        transcriptDiv.style.maxWidth = "100%";
        const controlPanel = document.getElementById('controlPanel');
        controlPanel.appendChild(transcriptDiv);
    }

    const displayText = finalText + (interimText ? `<span style="opacity: 0.5;">${interimText}</span>` : '');
    transcriptDiv.innerHTML = `
        <div style="background-color: rgba(149, 76, 46, 0.3); border: 2px solid var(--brown); border-radius: 8px; padding: 16px; margin-top: 16px; max-height: 200px; overflow-y: auto;">
            <h4 style="margin: 0 0 8px 0; color: var(--white);">What you're saying:</h4>
            <p style="margin: 0; line-height: 1.6; color: var(--white);">${displayText || '<em>Listening...</em>'}</p>
        </div>
    `;
}

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
    // Check if mode is selected
    const selectedMode = document.getElementById("modeDropdown").value;
    if (!selectedMode) {
        showNotification("Please select a speaking mode first!");
        return;
    }

    if (!isCameraOn) {
        console.log("Camera is not on");
        return;
    }
    
    if (!isRecording) {
        recordedChunks = [];
        
        const options = { mimeType: 'video/webm;codecs=vp9' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm;codecs=vp8';
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
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
            stopListening();
            updateRecordButton();
        };
        
        mediaRecorder.start();
        isRecording = true;
        isPaused = false;
        
        // Start speech recognition
        startListening();
        
        const videoElement = document.getElementById("videoPreview");
        videoElement.classList.add("recording");
        updateRecordButton();
    } else {
        if (isPaused) {
            mediaRecorder.resume();
            isPaused = false;
            resumeListening();
            const videoElement = document.getElementById("videoPreview");
            videoElement.classList.remove("paused");
            updateRecordButton();
        } else {
            mediaRecorder.pause();
            isPaused = true;
            pauseListening();
            const videoElement = document.getElementById("videoPreview");
            videoElement.classList.add("paused");
            updateRecordButton();
        }
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        stopListening();
    }
}

function downloadVideo(url) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${timestamp}.webm`;
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

// Update recording controls state based on mode selection
function updateRecordingControlsState() {
    const selectedMode = document.getElementById("modeDropdown").value;
    const controlButtons = document.querySelectorAll("#controlButtons #controlButton");
    
    controlButtons.forEach((button, index) => {
        // First two buttons are record/pause (only disable if no mode selected)
        if (index < 2) {
            if (!selectedMode) {
                button.style.opacity = "0.4";
                button.style.cursor = "not-allowed";
                button.style.pointerEvents = "none";
            } else {
                button.style.opacity = "1";
                button.style.cursor = "pointer";
                button.style.pointerEvents = "auto";
            }
        }
    });
}

function checkMode() {
    const selectedValue = document.getElementById("modeDropdown").value;
    const timedMode = document.getElementById("timedMode");

    timedMode.innerHTML = "";

    if (selectedValue === "timed") {
        createTimer(timedMode);
    }
    
    // Update recording controls state when mode changes
    updateRecordingControlsState();
}

/*timer*/
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

/*document upload*/
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const controlPanel = document.getElementById("controlPanel");
    
    const existingDisplay = document.getElementById("fileDisplayContainer");
    if (existingDisplay) {
        existingDisplay.remove();
    }

    const fileDisplayContainer = document.createElement("div");
    fileDisplayContainer.id = "fileDisplayContainer";

    const header = document.createElement("div");
    header.id = "fileDisplayHeader";

    const fileName = document.createElement("span");
    fileName.id = "fileName";
    fileName.textContent = file.name;

    const closeButton = document.createElement("button");
    closeButton.id = "closeFileButton";
    closeButton.textContent = "×";
    closeButton.onclick = () => {
        fileDisplayContainer.remove();
        document.getElementById("documentUpload").value = "";
    };

    header.appendChild(fileName);
    header.appendChild(closeButton);

    const contentArea = document.createElement("div");
    contentArea.id = "fileContentArea";

    const fileType = file.type;
    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileType.startsWith('image/')) {
        const img = document.createElement("img");
        img.id = "uploadedImage";
        img.src = URL.createObjectURL(file);
        contentArea.appendChild(img);
    } else if (fileType === 'application/pdf') {
        const pdfEmbed = document.createElement("embed");
        pdfEmbed.id = "uploadedPDF";
        pdfEmbed.src = URL.createObjectURL(file);
        pdfEmbed.type = "application/pdf";
        contentArea.appendChild(pdfEmbed);
    } else if (fileType === 'text/plain' || fileExtension === 'txt') {
        const reader = new FileReader();
        reader.onload = (e) => {
            const pre = document.createElement("pre");
            pre.id = "uploadedText";
            pre.textContent = e.target.result;
            contentArea.appendChild(pre);
        };
        reader.readAsText(file);
    } else if (fileExtension === 'docx' || fileExtension === 'doc') {
        const message = document.createElement("div");
        message.id = "docMessage";
        message.innerHTML = `
            <p>Document uploaded: <strong>${file.name}</strong></p>
            <p>Word documents cannot be previewed in the browser.</p>
            <p>File size: ${(file.size / 1024).toFixed(2)} KB</p>
        `;
        contentArea.appendChild(message);
    } else {
        const message = document.createElement("div");
        message.id = "docMessage";
        message.innerHTML = `
            <p>File uploaded: <strong>${file.name}</strong></p>
            <p>File type: ${fileType || 'Unknown'}</p>
            <p>File size: ${(file.size / 1024).toFixed(2)} KB</p>
        `;
        contentArea.appendChild(message);
    }

    fileDisplayContainer.appendChild(header);
    fileDisplayContainer.appendChild(contentArea);

    const uploadButton = document.getElementById("uploadButton");
    uploadButton.parentNode.insertBefore(fileDisplayContainer, uploadButton.nextSibling);
}


let userTopic = '';
let uploadedFileContent = '';
let debateHistory = [];
let recordingStartTime = null;
let totalPauseDuration = 0;
let pauseStartTime = null;

// Speaking tips for loading screen
const speakingTips = [
    "Maintain eye contact with your audience to build connection and trust.",
    "Use pauses effectively - silence can be powerful in emphasizing key points.",
    "Vary your tone and pace to keep your audience engaged.",
    "Use hand gestures naturally to emphasize your points.",
    "Stand with confident posture - shoulders back, feet shoulder-width apart.",
    "Practice the 'rule of three' - people remember things in groups of three.",
    "Start with a hook - a question, story, or surprising fact.",
    "End with a clear call-to-action or memorable conclusion.",
    "Breathe deeply before speaking to calm nerves and project your voice.",
    "Record yourself practicing - it reveals habits you might not notice."
];

// Add text input handler
const textInputElement = document.getElementById("textInput");
if (textInputElement) {
    textInputElement.addEventListener("keypress", (e) => {
        if (e.key === 'Enter') {
            handleTextInput();
        }
    });
}

function handleTextInput() {
    const textInput = document.getElementById("textInput");
    userTopic = textInput.value.trim();
    
    if (userTopic) {
        console.log("Topic set:", userTopic);
        showNotification("Topic set! Start recording when ready.");
    }
}

async function callGeminiAPI(prompt, systemInstruction = '') {
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                }
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else {
            console.error('Unexpected API response:', data);
            return 'Error: Could not generate response.';
        }
    } catch (error) {
        console.error('Gemini API Error:', error);
        return 'Error generating response. Please try again.';
    }
}

function showLoadingWithTips(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingContainer';
    loadingDiv.innerHTML = `
        <div class="loading-spinner"></div>
        <p class="loading-tip">${getRandomTip()}</p>
    `;
    container.appendChild(loadingDiv);

    // Rotate tips every 3 seconds
    const tipInterval = setInterval(() => {
        const tipElement = loadingDiv.querySelector('.loading-tip');
        if (tipElement) {
            tipElement.style.opacity = '0';
            setTimeout(() => {
                tipElement.textContent = getRandomTip();
                tipElement.style.opacity = '1';
            }, 300);
        }
    }, 3000);

    return { loadingDiv, tipInterval };
}

function getRandomTip() {
    return speakingTips[Math.floor(Math.random() * speakingTips.length)];
}

function removeLoading(loadingData) {
    if (!loadingData) return;
    if (loadingData.tipInterval) clearInterval(loadingData.tipInterval);
    if (loadingData.loadingDiv) loadingData.loadingDiv.remove();
}

async function generateRebuttal() {
    const mode = document.getElementById("modeDropdown").value;
    if (mode !== "debate") return;

    const debateMode = document.getElementById("debateMode");
    const loadingData = showLoadingWithTips("debateMode");

    const context = uploadedFileContent || userTopic || "the current topic";
    const userSpeech = speechTranscript.trim() || "No speech detected yet";
    
    // --- FIX 1: ADD LATEST SPEECH TO HISTORY *BEFORE* GENERATING REBUTTAL ---
    // The latest user speech is captured during the recording segment leading up to the PAUSE.
    // We add it to the history list that will be sent to the model.
    debateHistory.push(`User Speech (Last Segment): "${userSpeech}"`);
    
    const historyText = debateHistory.length > 0 
        ? `Previous exchanges (Speaker is YOU, Opponent is GEMINI):\n${debateHistory.join('\n')}\n\n` 
        : '';

    // --- REFINED PROMPT ---
    const prompt = `${historyText}
    The central topic for this debate is: **${context}**.
    
    The speaker (your opponent) has just completed their last segment. Their full argument for this segment was:
    "${userSpeech}"

    Provide a strong counter-argument or challenging question that directly responds to the content of the speaker's last segment (2-3 sentences max). Be specific and reference their points.`;

    const rebuttal = await callGeminiAPI(prompt, 
        "You are a skilled debater and the opponent in this session. Be respectful but highly challenging. Keep responses concise (2-3 sentences) and impactful. Directly address the speaker's last argument.");

    removeLoading(loadingData);

    const rebuttalDiv = document.createElement('div');
    rebuttalDiv.className = 'rebuttal-message';
    rebuttalDiv.innerHTML = `
        <h3>Opponent's Response:</h3>
        <p>${rebuttal}</p>
    `;
    debateMode.appendChild(rebuttalDiv);
    
    // --- FINAL HISTORY UPDATE ---
    // Now that the rebuttal is generated, add it to the history for the *next* turn.
    debateHistory.push(`Opponent Rebuttal: ${rebuttal}`);
    
    // Clear the transcript for the next segment
    speechTranscript = '';
    // Optional: You may want to update the transcript display to clear it here.
}

async function generateDebrief() {
    const controlPanel = document.getElementById("controlPanel");
    
    // Clear previous debrief
    const existingDebrief = document.getElementById("debriefContainer");
    if (existingDebrief) existingDebrief.remove();

    const debriefContainer = document.createElement('div');
    debriefContainer.id = 'debriefContainer';
    controlPanel.appendChild(debriefContainer);

    const loadingData = showLoadingWithTips("debriefContainer");

    const mode = document.getElementById("modeDropdown").value;
    const context = uploadedFileContent || userTopic || "general speaking";
    const duration = recordingStartTime ? Math.floor((Date.now() - recordingStartTime - totalPauseDuration) / 1000) : 0;
    const pauseCount = debateHistory.filter(h => h.includes('PAUSE')).length;
    const wordCount = speechTranscript.trim().split(/\s+/).length;

    const prompt = `Analyze this speaking session:
    - Mode: ${mode}
    - Topic: ${context}
    - Duration: ${Math.floor(duration / 60)} minutes ${duration % 60} seconds
    - Number of pauses: ${pauseCount}
    - Approximate word count: ${wordCount}
    ${debateHistory.length > 0 ? `- Debate exchanges: ${debateHistory.length / 2}` : ''}
    ${speechTranscript ? `\n- Speech content: "${speechTranscript.substring(0, 500)}..."` : ''}
    
    Provide a structured debrief with:
    1. Overall Assessment (1-2 sentences)
    2. Key Strengths (2-3 bullet points)
    3. Areas for Improvement (2-3 bullet points)
    4. Specific Recommendations (2-3 actionable tips)
    
    Keep it encouraging but honest.`;

    const debrief = await callGeminiAPI(prompt, 
        "You are an experienced public speaking coach. Provide constructive, actionable feedback based on what you observed.");

    removeLoading(loadingData);

    debriefContainer.innerHTML = `
        <div class="debrief-header">
            <h2>Speaking Debrief</h2>
            <button onclick="document.getElementById('debriefContainer').remove()">×</button>
        </div>
        <div class="debrief-content">
            ${formatDebrief(debrief)}
        </div>
    `;
}

function formatDebrief(text) {
    // Convert markdown-style formatting to HTML
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n- /g, '<li>')
        .replace(/\n/g, '<br>')
        .replace(/(\d+\. )/g, '<br><strong>$1</strong>');
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Store original functions
const _originalToggleRecording = window.toggleRecording;
const _originalStopRecording = window.stopRecording;
const _originalHandleFileUpload = window.handleFileUpload;

// Override toggleRecording
window.toggleRecording = function() {
    const previouslyRecording = isRecording;
    const previouslyPaused = isPaused;
    
    _originalToggleRecording();
    
    // Track recording start time
    if (isRecording && !previouslyRecording) {
        recordingStartTime = Date.now();
        debateHistory = [];
        totalPauseDuration = 0;
        speechTranscript = '';
    }
    
    // Generate rebuttal when paused in debate mode
    if (isRecording && isPaused && !previouslyPaused) {
        pauseStartTime = Date.now();
        debateHistory.push('PAUSE');
        generateRebuttal();
    }
    
    // Track pause duration when resuming
    if (isRecording && !isPaused && previouslyPaused && pauseStartTime) {
        totalPauseDuration += (Date.now() - pauseStartTime);
        pauseStartTime = null;
    }
};

// Override stopRecording
window.stopRecording = function() {
    const wasRecording = isRecording;
    _originalStopRecording();
    
    if (wasRecording && recordingStartTime) {
        setTimeout(() => {
            generateDebrief();
        }, 1000);
    }
};

// Override handleFileUpload to extract content
window.handleFileUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Extract text content for API
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (file.type === 'text/plain' || fileExtension === 'txt') {
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedFileContent = e.target.result;
        };
        reader.readAsText(file);
    } else if (file.type === 'application/pdf') {
        uploadedFileContent = `PDF document: ${file.name}`;
    }
    
    // Call original function
    _originalHandleFileUpload(event);
};