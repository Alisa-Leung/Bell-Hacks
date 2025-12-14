const canvas = document.getElementById("particleCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener("resize", () => {
    canvas.width = window. innerWidth;
    canvas.height = window.innerHeight;
});

const particles = []
const particleCount = 80;
const connectionDistance = 150;
const particleSpeed = 0.5;
class Particle {
    constructor(){
        this.y = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * particleSpeed;
        this.vy = (Math.random())
    }
}