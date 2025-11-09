// --- Game Variables ---
let ballX, ballY;        
let ballVX = 4, ballVY = 4;
let ballRadius = 10;

let paddleX;             
let paddleW = 100;
let paddleH = 50;

let targetW = 60;        // ⬅️ Basket Width Decreased
let targetH = 30;        // ⬅️ Basket Height Decreased
let targetX, targetY;
let targetVX = 1.5;      // ⬅️ Added speed for Basket movement

let score = 0;
let lives = 3;             
let gameSpeedMultiplier = 1.0;

// --- Gyroscope Variables ---
let permissionGranted = false;
let gyroGamma = 0;       
let gyroBeta = 0;        
let isBallInAir = false; 
const GYRO_SENSITIVITY = 0.08; // ⬅️ Slightly increased sensitivity for testing

// =========================================================================

function setup() {
    createCanvas(400, 600); 
    
    targetX = width / 2;
    targetY = 50;
    
    resetGame();
    
    textAlign(CENTER, CENTER);
    textSize(24);
    
    // Check for iOS 13+ permission required for device orientation
    if (typeof(DeviceOrientationEvent) !== 'undefined' && typeof(DeviceOrientationEvent.requestPermission) === 'function') {
        let button = createButton('Allow Sensor Access');
        button.style('font-size', '18px');
        button.center();
        button.mousePressed(requestAccess);
    } else {
        permissionGranted = true;
    }
}

// Function to request access for iOS 13+
function requestAccess() {
    DeviceOrientationEvent.requestPermission()
        .then(response => {
            if (response == 'granted') {
                permissionGranted = true;
            }
            this.remove(); 
        })
        .catch(console.error);
}

// =========================================================================

function draw() {
    background(20); 
    
    if (permissionGranted) {
        moveTargetBasket(); // ⬅️ New function called to move the basket
        drawTargetBasket(); 
        movePaddle();
        moveBall();
        checkCollision();
        drawShapes();
        displayScore();
    } else {
        fill(255);
        text('Tap "Allow Sensor Access" to Start', width / 2, height / 2);
    }
}

// =========================================================================
// --- MOVEMENT AND LOGIC ---

function moveTargetBasket() {
    targetX += targetVX;

    // Bounce basket off the side walls
    if (targetX < targetW / 2 + 5 || targetX > width - targetW / 2 - 5) {
        targetVX *= -1;
    }
}

function movePaddle() {
    paddleX = constrain(mouseX, paddleW / 2, width - paddleW / 2);
}

function moveBall() {
    // Apply speed multiplier to velocity
    ballX += ballVX * gameSpeedMultiplier;
    ballY += ballVY * gameSpeedMultiplier;

    // Apply Gyroscope Influence (only when ball is in the air)
    if (isBallInAir) {
        // Gyro Influence is handled by the deviceMoved function below
        // The values are simply added to the ball's velocity here:
        ballVX += gyroGamma;
        ballVY += gyroBeta;
        
        // Cap the speed to keep it manageable
        ballVX = constrain(ballVX, -10 * gameSpeedMultiplier, 10 * gameSpeedMultiplier); 
        ballVY = constrain(ballVY, -10 * gameSpeedMultiplier, 10 * gameSpeedMultiplier);
    }

    // Bounce off left/right walls
    if (ballX < ballRadius || ballX > width - ballRadius) {
        ballVX *= -1;
    }

    // Bounce off top wall
    if (ballY < ballRadius) {
        ballVY *= -1;
    } 
    
    // Loss of Life Condition (missed the paddle)
    else if (ballY > height) {
        lives -= 1; 
        
        if (lives <= 0) {
            gameOver(); 
        } else {
            resetBall(); 
        }
    }
}

function checkCollision() {
    // 1. Paddle (Triangle) Collision Check
    let paddleTopY = height - paddleH; 
    
    if (ballY + ballRadius > paddleTopY && ballY + ballRadius < paddleTopY + paddleH && 
        ballX > paddleX - paddleW / 2 && ballX < paddleX + paddleW / 2) {
        
        ballVY *= -1;
        isBallInAir = true; 

        // Increase difficulty and score
        gameSpeedMultiplier += 0.05;
        score += 10;
    }

    // 2. Target (Basket) Collision Check
    if (ballX > targetX - targetW / 2 && ballX < targetX + targetW / 2 &&
        ballY - ballRadius < targetY + targetH / 2 && ballY - ballRadius > targetY - targetH / 2) {
        
        score += 100; // Bonus points
        ballVY *= -1; // Bounce off the target
        isBallInAir = true; 
    }
}

// =========================================================================
// --- DRAWING AND GAME STATE ---

function drawShapes() {
    noStroke();
    
    // Draw Circle (Ball) - Green
    fill(0, 255, 0); 
    ellipse(ballX, ballY, ballRadius * 2);

    // Draw Triangle (Paddle) - Red
    fill(255, 0, 0);
    triangle(
        paddleX - paddleW / 2, height, 
        paddleX + paddleW / 2, height, 
        paddleX, height - paddleH 
    );
}

function drawTargetBasket() {
    // Draw Rectangle (Target/Basket) - Blue with black stroke
    fill(0, 0, 255); 
    stroke(0); // Black stroke
    strokeWeight(3); // Thicker line for rim effect
    rectMode(CENTER);
    rect(targetX, targetY, targetW, targetH);
    noStroke(); // Turn off stroke for other shapes
}

function displayScore() {
    fill(255);
    text(`Score: ${score}`, 50, 20);
    text(`Lives: ${lives}`, width - 50, 20);
}

function gameOver() {
    noLoop(); 
    fill(255, 0, 0);
    textSize(48);
    text("GAME OVER", width / 2, height / 2);
    textSize(24);
    text(`Final Score: ${score}`, width / 2, height / 2 + 50); 
    text("Click to Restart", width / 2, height / 2 + 90);
}

function resetBall() {
    ballX = width / 2;
    ballY = height / 2;
    gameSpeedMultiplier = 1.0; 
    ballVX = random([-4, 4]); 
    ballVY = 4;
    isBallInAir = false; 
}

function resetGame() {
    score = 0;
    lives = 3;
    paddleX = width / 2;
    resetBall();
}

function mouseClicked() {
    if (!isLooping()) {
        resetGame();
        loop();
    }
}

// =========================================================================
// --- GYROSCOPE FIX: Using deviceMoved() for reliable mobile control ---
// This function is often more reliable than a simple event listener in p5.js/browser environments.

function deviceMoved() {
    if (!permissionGranted) return;
    
    // Get the acceleration data from the device
    // accelerationX and accelerationY represent the tilt on a phone
    
    // Map the acceleration data to the gyro influence variables
    // Constrain the force to prevent wild movement
    gyroGamma = constrain(accelerationX * GYRO_SENSITIVITY, -0.2, 0.2); // X-axis influence
    gyroBeta = constrain(accelerationY * GYRO_SENSITIVITY, -0.2, 0.2); // Y-axis influence
}