const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const commandSlots = document.getElementById('commandSlots');
const runBtn = document.getElementById('runBtn');
const clearBtn = document.getElementById('clearBtn');
const currentLevelSpan = document.getElementById('currentLevel');
const starsSpan = document.getElementById('stars');

const GRID_SIZE = 40;
const COLS = canvas.width / GRID_SIZE;
const ROWS = canvas.height / GRID_SIZE;

let robot = { x: 1, y: 1 };
let star = { x: 8, y: 5 };
let obstacles = [];
let commands = [];
let currentLevel = 1;
let totalStars = 0;
let isRunning = false;

const levels = [
    {
        id: 1,
        robot: { x: 1, y: 1 },
        star: { x: 8, y: 5 },
        obstacles: [],
        maxCommands: 10,
        description: "Reach the star!"
    },
    {
        id: 2,
        robot: { x: 1, y: 1 },
        star: { x: 10, y: 7 },
        obstacles: [{ x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }],
        maxCommands: 12,
        description: "Avoid the walls!"
    },
    {
        id: 3,
        robot: { x: 0, y: 0 },
        star: { x: 14, y: 9 },
        obstacles: [
            { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 2 },
            { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 },
            { x: 11, y: 0 }, { x: 11, y: 1 }, { x: 11, y: 2 }
        ],
        maxCommands: 15,
        description: "Navigate the maze!"
    }
];

function initLevel(levelIndex) {
    const level = levels[levelIndex - 1];
    robot = { ...level.robot };
    star = { ...level.star };
    obstacles = [...level.obstacles];
    commands = [];
    updateCommandSlots();
    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(canvas.width, i * GRID_SIZE);
        ctx.stroke();
    }
    
    obstacles.forEach(obs => {
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(obs.x * GRID_SIZE + 2, obs.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
    });
    
    ctx.save();
    ctx.translate(star.x * GRID_SIZE + GRID_SIZE/2, star.y * GRID_SIZE + GRID_SIZE/2);
    ctx.rotate(Date.now() * 0.001);
    drawStar(0, 0, 5, GRID_SIZE/3, GRID_SIZE/6);
    ctx.restore();
    
    drawRobot(robot.x * GRID_SIZE + GRID_SIZE/2, robot.y * GRID_SIZE + GRID_SIZE/2);
}

function drawRobot(x, y) {
    ctx.fillStyle = '#3498db';
    ctx.fillRect(x - 15, y - 15, 30, 30);
    
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x - 10, y - 10, 8, 8);
    ctx.fillRect(x + 2, y - 10, 8, 8);
    
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(x, y + 5, 5, 0, Math.PI, false);
    ctx.fill();
    
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(x - 18, y - 5, 3, 0, Math.PI * 2);
    ctx.arc(x + 18, y - 5, 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / spikes;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    ctx.fill();
}

function updateCommandSlots() {
    commandSlots.innerHTML = '';
    const level = levels[currentLevel - 1];
    
    for (let i = 0; i < level.maxCommands; i++) {
        const slot = document.createElement('div');
        slot.className = 'command-slot';
        if (commands[i]) {
            slot.classList.add('filled');
            slot.textContent = getCommandSymbol(commands[i]);
        }
        slot.addEventListener('click', () => {
            if (commands[i]) {
                commands.splice(i, 1);
                updateCommandSlots();
            }
        });
        commandSlots.appendChild(slot);
    }
}

function getCommandSymbol(command) {
    const symbols = {
        'up': '↑',
        'down': '↓',
        'left': '←',
        'right': '→'
    };
    return symbols[command] || '';
}

function addCommand(command) {
    const level = levels[currentLevel - 1];
    if (commands.length < level.maxCommands) {
        commands.push(command);
        updateCommandSlots();
        playSound('click');
    }
}

function moveRobot(direction) {
    let newX = robot.x;
    let newY = robot.y;
    
    switch(direction) {
        case 'up': newY--; break;
        case 'down': newY++; break;
        case 'left': newX--; break;
        case 'right': newX++; break;
    }
    
    if (newX >= 0 && newX < COLS && newY >= 0 && newY < ROWS &&
        !obstacles.some(obs => obs.x === newX && obs.y === newY)) {
        robot.x = newX;
        robot.y = newY;
        return true;
    }
    return false;
}

async function runCommands() {
    if (isRunning || commands.length === 0) return;
    
    isRunning = true;
    runBtn.disabled = true;
    
    const level = levels[currentLevel - 1];
    robot = { ...level.robot };
    
    for (let i = 0; i < commands.length; i++) {
        draw();
        await sleep(500);
        
        if (!moveRobot(commands[i])) {
            playSound('bump');
            await shake();
        } else {
            playSound('move');
        }
        
        if (robot.x === star.x && robot.y === star.y) {
            await celebrate();
            levelComplete();
            break;
        }
    }
    
    isRunning = false;
    runBtn.disabled = false;
}

function levelComplete() {
    totalStars++;
    starsSpan.textContent = totalStars;
    playSound('success');
    
    if (currentLevel < levels.length) {
        currentLevel++;
        currentLevelSpan.textContent = currentLevel;
        setTimeout(() => {
            initLevel(currentLevel);
            commands = [];
            updateCommandSlots();
        }, 2000);
    } else {
        alert('Congratulations! You completed all levels! 🎉');
    }
}

async function celebrate() {
    const originalY = star.y;
    for (let i = 0; i < 10; i++) {
        star.y = originalY - Math.sin(i * 0.5) * 0.3;
        draw();
        await sleep(50);
    }
    star.y = originalY;
}

async function shake() {
    const originalX = robot.x;
    for (let i = 0; i < 6; i++) {
        robot.x = originalX + (i % 2 === 0 ? 0.1 : -0.1);
        draw();
        await sleep(50);
    }
    robot.x = originalX;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function playSound(type) {
    const audio = new Audio();
    audio.volume = 0.3;
    
    const frequencies = {
        'click': [800, 100],
        'move': [600, 150],
        'bump': [200, 200],
        'success': [800, 1000, 1200, 200]
    };
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const freq = frequencies[type];
    if (freq) {
        if (type === 'success') {
            oscillator.frequency.setValueAtTime(freq[0], audioContext.currentTime);
            oscillator.frequency.setValueAtTime(freq[1], audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(freq[2], audioContext.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
        } else {
            oscillator.frequency.value = freq[0];
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + freq[1] / 1000);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + freq[1] / 1000);
        }
    }
}

document.querySelectorAll('.command-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        addCommand(btn.dataset.command);
    });
});

runBtn.addEventListener('click', runCommands);

clearBtn.addEventListener('click', () => {
    commands = [];
    updateCommandSlots();
    initLevel(currentLevel);
    playSound('click');
});

document.addEventListener('keydown', (e) => {
    if (isRunning) return;
    
    const keyMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right'
    };
    
    const command = keyMap[e.key];
    if (command) {
        e.preventDefault();
        if (e.shiftKey) {
            addCommand(command);
        } else {
            const oldPos = { ...robot };
            if (moveRobot(command)) {
                playSound('move');
                draw();
                if (robot.x === star.x && robot.y === star.y) {
                    celebrate().then(() => levelComplete());
                }
            } else {
                playSound('bump');
                shake();
            }
        }
    }
});

initLevel(currentLevel);
draw();