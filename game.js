// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Custom Phaser game class to work with the existing HTML layout
    class BalloonGame {
        constructor() {
            this.nextLetterIndex = 0; // Start with A (0 = A, 1 = B, etc.)
            this.activeBalloons = [];
            this.boundaryMargin = 20; // Reduced margin to make more of the screen available
            this.isInflatingBalloon = false; // Track if a balloon is currently inflating
            this.setupEventListeners();
            this.loadImages();
        }

        // Initialize by setting up event listeners
        setupEventListeners() {
            // Get HTML elements for pump components
            this.pumpContainer = document.querySelector('.pump-container');
            this.pumpHandle = document.getElementById('pump-handle');
            this.pumpOutput = document.getElementById('pump-output');
            this.pumpPipe = document.getElementById('pump-pipe');
            this.balloonsContainer = document.getElementById('balloons-container');
            
            // Add click listener to pump container
            this.pumpContainer.addEventListener('click', () => this.activatePump());
            
            // Set up animation frame
            this.isAnimating = false;
            this.isPumpAnimating = false;
            
            // Initialize window dimensions and boundaries
            this.updateWindowDimensions();
            window.addEventListener('resize', () => this.updateWindowDimensions());
        }
        
        // Update window dimensions when resized
        updateWindowDimensions() {
            // Use the entire window for boundaries
            this.windowWidth = window.innerWidth;
            this.windowHeight = window.innerHeight;
            
            // Define boundary box to cover the entire screen
            this.minX = this.boundaryMargin;
            this.maxX = this.windowWidth - this.boundaryMargin - 120;
            this.minY = this.boundaryMargin;
            this.maxY = this.windowHeight - this.boundaryMargin - 150;

            // Get pump position for calculating spawn point
            if (this.pumpPipe) {
                this.updatePumpPosition();
            }
        }

        // Update pump position (for balloon spawning)
        updatePumpPosition() {
            const pipeRect = this.pumpPipe.getBoundingClientRect();
            // Set spawn point to the end of the pipe (right side)
            this.pumpX = pipeRect.right - 15;
            this.pumpY = pipeRect.top + (pipeRect.height / 2) - 10;
        }
        
        // Activate the pump when clicked
        activatePump() {
            // Check if animation is already in progress
            if (this.isPumpAnimating || this.isInflatingBalloon) {
                return; // Don't allow new activation until current animation completes
            }
            
            // Set flag to prevent multiple activations
            this.isPumpAnimating = true;

            // Animate handle down
            this.pumpHandle.classList.add('pump-handle-down');
            
            // Animate output pulsing
            this.pumpOutput.classList.add('pump-output-pulse');
            
            // Remove animation classes after animation is complete to allow repeating
            setTimeout(() => {
                this.pumpHandle.classList.remove('pump-handle-down');
                this.pumpOutput.classList.remove('pump-output-pulse');
                this.isPumpAnimating = false;
                
                // Only start inflating if not already inflating another balloon
                if (!this.isInflatingBalloon) {
                    this.startInflatingBalloon();
                }
            }, 300); // Match animation duration
        }
        
        // Start the balloon inflation process
        startInflatingBalloon() {
            // Set inflating flag to prevent multiple inflations
            this.isInflatingBalloon = true;
            
            // Get the current letter in strict alphabetical order (A to Z)
            const letterIndex = this.nextLetterIndex % 26;
            const letterInfo = this.alphabetMap[letterIndex];
            
            // Move to next letter for next balloon
            this.nextLetterIndex = (this.nextLetterIndex + 1) % 26;
            
            // Choose a random balloon color
            const colorIndex = Math.floor(Math.random() * this.balloonColors.length);
            const balloonColor = this.balloonColors[colorIndex];
            
            // Update pump position to ensure accurate spawn
            this.updatePumpPosition();
            
            // Create balloon element
            const balloon = document.createElement('div');
            balloon.className = 'alphabet-balloon inflating-balloon';
            balloon.style.backgroundImage = `url('${this.balloonImage}')`;
            balloon.style.filter = `hue-rotate(${colorIndex * 45}deg)`;
            
            // Create letter image
            const letterImg = document.createElement('img');
            letterImg.src = letterInfo.path;
            letterImg.className = 'letter-image';
            letterImg.alt = letterInfo.key;
            balloon.appendChild(letterImg);
            
            // Get the pipe's exact position and dimensions
            const pipeRect = this.pumpPipe.getBoundingClientRect();
            
            // Position the balloon above the pipe end
            // The pipe is flipped horizontally, so we need to use the right edge
            const initialX = pipeRect.right - 20; // Right edge of pipe minus small offset since it's flipped
            const initialY = pipeRect.top - 100; // Position above the pipe by placing it 100px above the top edge
            
            // Start with a tiny balloon (scale near zero)
            balloon.style.left = initialX + 'px';
            balloon.style.top = initialY + 'px';
            balloon.style.transform = 'scale(0.1)'; // Start very small
            balloon.style.opacity = '0.7';
            balloon.style.transition = 'transform 1.5s ease-out, opacity 0.3s ease-in';
            
            // Add to container
            this.balloonsContainer.appendChild(balloon);
            
            // Assign a unique ID for the inflation process
            const balloonId = 'balloon-' + Date.now();
            balloon.id = balloonId;
            
            // Track inflation stages
            let inflationStage = 0;
            const totalStages = 3;
            const stageInterval = 400; // ms between inflation stages
            
            // Start inflation animation sequence
            const inflateSequence = setInterval(() => {
                inflationStage++;
                
                // Each stage the balloon gets bigger
                switch(inflationStage) {
                    case 1:
                        balloon.style.transform = 'scale(0.4)';
                        balloon.style.opacity = '0.8';
                        
                        // Add pulsing effect to simulate inflation
                        setTimeout(() => {
                            balloon.style.transform = 'scale(0.35)';
                        }, 200);
                        break;
                        
                    case 2:
                        balloon.style.transform = 'scale(0.7)';
                        balloon.style.opacity = '0.9';
                        
                        // Add pulsing effect
                        setTimeout(() => {
                            balloon.style.transform = 'scale(0.65)';
                        }, 200);
                        break;
                        
                    case 3:
                        // Final inflation to full size
                        balloon.style.transform = 'scale(1)';
                        balloon.style.opacity = '1';
                        
                        // Clear the interval as we've reached the final stage
                        clearInterval(inflateSequence);
                        
                        // After final inflation, release the balloon
                        setTimeout(() => {
                            this.releaseInflatedBalloon(balloon, balloonId, letterIndex, letterInfo, colorIndex, initialX, initialY);
                        }, 300);
                        break;
                }
            }, stageInterval);
        }
        
        // Release the fully inflated balloon into the scene
        releaseInflatedBalloon(balloon, balloonId, letterIndex, letterInfo, colorIndex, initialX, initialY) {
            try {
                // Create angle that sends balloons more toward the right side of the screen
                const angleRange = 90; // degrees - range from -45 to +45 from horizontal right
                const angle = ((Math.random() * angleRange) - (angleRange/2)) * (Math.PI / 180);
                const speed = 1.5 + Math.random() * 1.5;
                
                // Calculate velocity components - primary direction is right/horizontal from pipe
                const velocityX = Math.cos(angle) * speed; // Primary direction is right
                const velocityY = Math.sin(angle) * speed;
                
                // Store balloon info for animation
                this.activeBalloons.push({
                    id: balloonId,
                    element: balloon,
                    letterElement: balloon.querySelector('.letter-image'),
                    letterIndex: letterIndex,
                    letterKey: letterInfo.key,
                    colorIndex: colorIndex,
                    x: initialX,
                    y: initialY,
                    velocityX: velocityX,
                    velocityY: velocityY,
                    rotation: 0,
                    rotationSpeed: (Math.random() - 0.5) * 1.5, // Gentler rotation
                    radius: 85, // Balloon collision radius
                    mass: 1 + Math.random() * 0.5 // Variable mass for realistic collisions
                });
                
                // Remove inflation-specific styling
                balloon.classList.remove('inflating-balloon');
                balloon.style.transition = '';
                
                // Attach click event to pop balloon
                balloon.addEventListener('click', () => {
                    this.popBalloon(balloonId);
                });
                
                // Start animation if not already running
                if (!this.isAnimating) {
                    this.isAnimating = true;
                    requestAnimationFrame(() => this.animateBalloons());
                }
                
                console.log(`Released balloon with letter ${letterInfo.key} (${letterIndex + 1}/26)`);
                
                // Reset the inflating flag AFTER balloon is fully released
                this.isInflatingBalloon = false;
            } catch (error) {
                console.error('Error releasing balloon:', error);
                // Reset the flag in case of error to prevent lockup
                this.isInflatingBalloon = false;
            }
        }
        
        // Preload images
        loadImages() {
            // Create alphabetical mapping from A to Z
            this.alphabetMap = [];
            
            // The available letters we have images for
            const availableLetters = [
                { key: 'A', path: 'Graphics/Symbol 10001.png' },
                { key: 'B', path: 'Graphics/Symbol 10002.png' },
                { key: 'C', path: 'Graphics/Symbol 10003.png' },
                { key: 'D', path: 'Graphics/Symbol 10004.png' },
                { key: 'E', path: 'Graphics/Symbol 10005.png' },
                { key: 'F', path: 'Graphics/Symbol 10006.png' },
                { key: 'G', path: 'Graphics/Symbol 10007.png' },
                { key: 'H', path: 'Graphics/Symbol 10008.png' },
                { key: 'I', path: 'Graphics/Symbol 10009.png' },
                { key: 'J', path: 'Graphics/Symbol 10010.png' },
                { key: 'K', path: 'Graphics/Symbol 10011.png' },
                { key: 'L', path: 'Graphics/Symbol 10012.png' },
                { key: 'M', path: 'Graphics/Symbol 10013.png' },
                { key: 'N', path: 'Graphics/Symbol 10014.png' },
                { key: 'O', path: 'Graphics/Symbol 10015.png' },
                { key: 'P', path: 'Graphics/Symbol 10016.png' },
                { key: 'Q', path: 'Graphics/Symbol 10017.png' },
                { key: 'R', path: 'Graphics/Symbol 10018.png' },
                { key: 'S', path: 'Graphics/Symbol 10019.png' },
                { key: 'T', path: 'Graphics/Symbol 10020.png' },
                { key: 'U', path: 'Graphics/Symbol 10021.png' },
                { key: 'V', path: 'Graphics/Symbol 10022.png' },
                { key: 'W', path: 'Graphics/Symbol 10023.png' },
                { key: 'X', path: 'Graphics/Symbol 10024.png' },
                { key: 'Y', path: 'Graphics/Symbol 10025.png' },
                { key: 'Z', path: 'Graphics/Symbol 10026.png' }
            ];
            
            // Create the complete alphabet (A-Z)
            for (let i = 0; i < 26; i++) {
                const letterKey = String.fromCharCode(65 + i); // Get letter (A-Z)
                
                // Find exact match or use substitute
                const matchingLetter = availableLetters.find(l => l.key === letterKey);
                
                // Add to our map
                if (matchingLetter) {
                    // We have this exact letter
                    this.alphabetMap[i] = {
                        key: letterKey,
                        path: matchingLetter.path
                    };
                } else {
                    // We don't have this letter, use a substitute image but keep the correct key
                    const substituteIndex = i % availableLetters.length;
                    this.alphabetMap[i] = {
                        key: letterKey,
                        path: availableLetters[substituteIndex].path
                    };
                }
            }
            
            // Balloon image path
            this.balloonImage = 'Graphics/Symbol 100001.png';
            
            // Define balloon colors for tinting
            this.balloonColors = [
                '#FFFFFF', // white
                '#FF0000', // red
                '#00FF00', // green
                '#0000FF', // blue
                '#FFFF00', // yellow
                '#FF00FF', // magenta
                '#00FFFF', // cyan
                '#FF8000'  // orange
            ];
        }
        
        animateBalloons() {
            if (this.activeBalloons.length === 0) {
                this.isAnimating = false;
                return;
            }
            
            // First, update each balloon position
            this.activeBalloons.forEach(balloonInfo => {
                // Update position with slower movement
                balloonInfo.x += balloonInfo.velocityX * 0.6;
                balloonInfo.y += balloonInfo.velocityY * 0.6;

                // Random drift - very gentle
                if (Math.random() < 0.01) {
                    balloonInfo.velocityX += (Math.random() - 0.5) * 0.1;
                    balloonInfo.velocityY += (Math.random() - 0.5) * 0.1;
                }
                
                // Boundary checks with soft bounce
                if (balloonInfo.x < this.minX) {
                    balloonInfo.x = this.minX + 5;
                    balloonInfo.velocityX = Math.abs(balloonInfo.velocityX) * 0.9;
                } else if (balloonInfo.x > this.maxX) {
                    balloonInfo.x = this.maxX - 5;
                    balloonInfo.velocityX = -Math.abs(balloonInfo.velocityX) * 0.9;
                }
                
                if (balloonInfo.y < this.minY) {
                    balloonInfo.y = this.minY + 5;
                    balloonInfo.velocityY = Math.abs(balloonInfo.velocityY) * 0.9;
                } else if (balloonInfo.y > this.maxY) {
                    balloonInfo.y = this.maxY - 5;
                    balloonInfo.velocityY = -Math.abs(balloonInfo.velocityY) * 0.9;
                }
                
            });
            
            // Now check for collisions between balloons (only if we have more than one)
            if (this.activeBalloons.length > 1) {
                this.checkBalloonCollisions();
            }
            
            // Finally, update all balloon visual positions
            this.activeBalloons.forEach(balloonInfo => {
                // Update element position and rotation
                balloonInfo.element.style.left = balloonInfo.x + 'px';
                balloonInfo.element.style.top = balloonInfo.y + 'px';
                balloonInfo.element.style.transform = `rotate(${balloonInfo.rotation}deg)`;
            });
            
            // Continue animation
            requestAnimationFrame(() => this.animateBalloons());
        }
        
        // Check and handle collisions between all active balloons
        checkBalloonCollisions() {
            // Compare each balloon with every other balloon (avoid checking same pair twice)
            for (let i = 0; i < this.activeBalloons.length; i++) {
                for (let j = i + 1; j < this.activeBalloons.length; j++) {
                    const balloonA = this.activeBalloons[i];
                    const balloonB = this.activeBalloons[j];
                    
                    // Calculate distance between balloon centers
                    const dx = balloonA.x - balloonB.x;
                    const dy = balloonA.y - balloonB.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Calculate combined radii with NO adjustment to prevent overlap
                    const minDistance = balloonA.radius + balloonB.radius - 20; // Reduced overlap
                    
                    // If balloons are overlapping
                    if (distance < minDistance) {
                        // Handle collision physics
                        this.resolveBalloonCollision(balloonA, balloonB, dx, dy, distance);
                        
                        // Add a slight visual "bump" effect
                        const bumpScale = 1.05; // Scale up slightly on collision
                        balloonA.element.style.transition = "transform 0.1s ease-out";
                        balloonB.element.style.transition = "transform 0.1s ease-out";
                        
                        // Scale up both balloons slightly
                        setTimeout(() => {
                            balloonA.element.style.transform = `rotate(${balloonA.rotation}deg) scale(${bumpScale})`;
                            balloonB.element.style.transform = `rotate(${balloonB.rotation}deg) scale(${bumpScale})`;
                            
                            // Then scale back down
                            setTimeout(() => {
                                balloonA.element.style.transform = `rotate(${balloonA.rotation}deg) scale(1)`;
                                balloonB.element.style.transform = `rotate(${balloonB.rotation}deg) scale(1)`;
                                
                                // Remove transition to avoid affecting normal rotation
                                setTimeout(() => {
                                    balloonA.element.style.transition = "";
                                    balloonB.element.style.transition = "";
                                }, 100);
                            }, 100);
                        }, 0);
                    }
                }
            }
        }
        
        // Resolve collision between two balloons using conservation of momentum
        resolveBalloonCollision(balloonA, balloonB, dx, dy, distance) {
            // Calculate normalized collision vector
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Calculate relative velocity
            const vx = balloonA.velocityX - balloonB.velocityX;
            const vy = balloonA.velocityY - balloonB.velocityY;
            
            // Calculate relative velocity along collision normal
            const velocityAlongNormal = vx * nx + vy * ny;
            
            // If balloons are moving away from each other, no collision response needed
            if (velocityAlongNormal > 0) return;
            
            // Calculate restitution (bounciness)
            const restitution = 0.85; // Increased for more bouncy effect
            
            // Calculate impulse scalar
            const impulseMagnitude = -(1 + restitution) * velocityAlongNormal / 
                                    (1 / balloonA.mass + 1 / balloonB.mass);
            
            // Apply impulse to velocities
            const impulseX = impulseMagnitude * nx;
            const impulseY = impulseMagnitude * ny;
            
            // Update velocities with stronger impulse
            balloonA.velocityX += (impulseX / balloonA.mass) * 1.2;
            balloonA.velocityY += (impulseY / balloonA.mass) * 1.2;
            balloonB.velocityX -= (impulseX / balloonB.mass) * 1.2;
            balloonB.velocityY -= (impulseY / balloonB.mass) * 1.2;
            
            // Add more significant spin on collision for visual effect
            balloonA.rotationSpeed += (Math.random() - 0.5) * 0.8;
            balloonB.rotationSpeed += (Math.random() - 0.5) * 0.8;
            
            // Ensure balloons aren't stuck together by pushing them apart more forcefully
            const pushRatio = 0.5; // Increased from 0.2 to separate balloons more effectively
            const overlap = (balloonA.radius + balloonB.radius - distance) * pushRatio;
            
            // Push balloons apart proportionally with more force
            balloonA.x += nx * overlap * 1.1;
            balloonA.y += ny * overlap * 1.1;
            balloonB.x -= nx * overlap * 1.1;
            balloonB.y -= ny * overlap * 1.1;
        }
        
        popBalloon(balloonId) {
            try {
                // Find the balloon data
                const balloonIndex = this.activeBalloons.findIndex(b => b.id === balloonId);
                if (balloonIndex === -1) return;
                
                const balloonInfo = this.activeBalloons[balloonIndex];
                const balloon = balloonInfo.element;
                
                // Remove from active balloons
                this.activeBalloons.splice(balloonIndex, 1);
                
                // Get current position for the splash effect
                const currentX = parseFloat(balloon.style.left);
                const currentY = parseFloat(balloon.style.top);
                const colorIndex = balloonInfo.colorIndex;
                
                // Remove the balloon immediately
                this.balloonsContainer.removeChild(balloon);
                
                // Create color splash effect (no pictures)
                this.createColorSplash(currentX, currentY, colorIndex);
                
                console.log(`Popped balloon with letter ${balloonInfo.letterKey}`);
            } catch (error) {
                console.error('Error popping balloon:', error);
            }
        }
        
        createColorSplash(x, y, colorIndex) {
            try {
                const balloonColor = this.balloonColors[colorIndex];
                
                // Create lots of particles for a colorful splash effect
                this.createSplashParticles(x, y, colorIndex, 40); // Increased particle count
                
                // Create a central burst effect
                const centralBurst = document.createElement('div');
                centralBurst.className = 'central-burst';
                centralBurst.style.position = 'absolute';
                centralBurst.style.left = (x - 50) + 'px';
                centralBurst.style.top = (y - 50) + 'px';
                centralBurst.style.width = '100px';
                centralBurst.style.height = '100px';
                centralBurst.style.borderRadius = '50%';
                centralBurst.style.backgroundColor = balloonColor;
                centralBurst.style.opacity = '0.7';
                centralBurst.style.zIndex = '190';
                
                // Add to container
                this.balloonsContainer.appendChild(centralBurst);
                
                // Animate central burst
                let startTime = Date.now();
                const burstDuration = 300;
                
                const animateBurst = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / burstDuration, 1);
                    
                    // Scale up while fading out
                    const scale = 1 + progress * 1.5;
                    centralBurst.style.transform = `scale(${scale})`;
                    centralBurst.style.opacity = (0.7 * (1 - progress)).toString();
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateBurst);
                    } else {
                        this.balloonsContainer.removeChild(centralBurst);
                    }
                };
                
                requestAnimationFrame(animateBurst);
                
                console.log('Color splash created successfully');
            } catch (error) {
                console.error('Error creating color splash:', error);
            }
        }
        
        createSplashParticles(x, y, colorIndex, numParticles = 20) {
            const balloonColor = this.balloonColors[colorIndex];
            
            for (let i = 0; i < numParticles; i++) {
                const particle = document.createElement('div');
                particle.className = 'splash-particle';
                
                // Random position around the burst point
                const angle = Math.random() * Math.PI * 2;
                const distance = 10 + Math.random() * 80; // Varied distances
                const particleX = x + Math.cos(angle) * distance;
                const particleY = y + Math.sin(angle) * distance;
                
                // Randomize particle size
                const size = 3 + Math.random() * 8;
                
                // Style the particle
                particle.style.position = 'absolute';
                particle.style.left = particleX + 'px';
                particle.style.top = particleY + 'px';
                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
                particle.style.borderRadius = '50%';
                particle.style.backgroundColor = balloonColor;
                particle.style.opacity = '0.8';
                particle.style.zIndex = '190';
                
                // Add to container
                this.balloonsContainer.appendChild(particle);
                
                // Animate the particle with vanilla JS
                let startTime = Date.now();
                const duration = 300 + Math.random() * 400; // 0.3 to 0.7 seconds
                const initialX = particleX;
                const initialY = particleY;
                const finalX = initialX + (Math.random() - 0.5) * 150;
                const finalY = initialY + (Math.random() - 0.5) * 150;
                
                const animateParticle = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    // Easing function for smooth animation
                    const easing = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
                    
                    // Update position
                    particle.style.left = (initialX + (finalX - initialX) * easing) + 'px';
                    particle.style.top = (initialY + (finalY - initialY) * easing) + 'px';
                    particle.style.opacity = (0.8 * (1 - easing)).toString();
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateParticle);
                    } else {
                        this.balloonsContainer.removeChild(particle);
                    }
                };
                
                requestAnimationFrame(animateParticle);
            }
        }
    }

    // Initialize the balloon game
    try {
        const game = new BalloonGame();
        console.log("Balloon game initialized successfully");
    } catch (error) {
        console.error("Error initializing balloon game:", error);
    }
});
