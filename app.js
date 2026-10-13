document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const authCard = document.getElementById('authCard');
    const dashboardCard = document.getElementById('dashboardCard');
    const loadingBar = document.getElementById('loadingBar');
    const formViewsSlider = document.getElementById('formViewsSlider');
    
    // View 1 (Email) Elements
    const emailView = document.getElementById('emailView');
    const emailForm = document.getElementById('emailForm');
    const emailInput = document.getElementById('emailInput');
    const emailError = document.getElementById('emailError');
    const emailNextBtn = document.getElementById('emailNextBtn');
    
    // OAuth UI Elements
    const gisGoogleBtn = document.getElementById('gisGoogleBtn');
    const envWarning = document.getElementById('envWarning');
    
    // View 2 (Password) Elements
    const passwordView = document.getElementById('passwordView');
    const passwordForm = document.getElementById('passwordForm');
    const passwordInput = document.getElementById('passwordInput');
    const passwordError = document.getElementById('passwordError');
    const passwordNextBtn = document.getElementById('passwordNextBtn');
    const backToEmailBtn = document.getElementById('backToEmailBtn');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const avatarIcon = document.getElementById('avatarIcon');
    
    // Dashboard Elements
    const signOutBtn = document.getElementById('signOutBtn');
    const dashboardName = document.getElementById('dashboardName');
    const dashboardEmail = document.getElementById('dashboardEmail');
    const dashboardAvatar = document.getElementById('dashboardAvatar');
    const gaugeFill = document.getElementById('gaugeFill');
    const gaugeVal = document.getElementById('gaugeVal');
    const sessionLocation = document.getElementById('sessionLocation');
    const confettiCanvas = document.getElementById('confettiCanvas');

    // State Variables
    let userEmailAddress = '';
    let userDisplayName = '';
    let googleClientId = '';

    // ==========================================
    // 1. THEME TOGGLER (Light/Dark Mode)
    // ==========================================
    const savedTheme = localStorage.getItem('google-auth-theme') || 'light';
    setTheme(savedTheme);

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    });

    function setTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
        }
        localStorage.setItem('google-auth-theme', theme);
        
        // Re-render Google Sign in button to match theme if Client ID is active
        if (googleClientId && window.google) {
            initRealGoogleOauth();
        }
    }

    // ==========================================
    // 2. BOOTSTRAP GOOGLE CLIENT ID
    // ==========================================
    
    // Query backend to read environment parameters
    fetch('/api/auth/config')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.clientId) {
                googleClientId = data.clientId;
                console.log(`[Google Auth] Client ID loaded from backend: ${googleClientId.substring(0, 15)}...`);
                // Wait briefly for GIS client SDK to load, then initialize
                setTimeout(initRealGoogleOauth, 200);
            } else {
                console.warn(`[Google Auth] Client ID missing in server .env configuration.`);
                showConfigWarning();
            }
        })
        .catch(err => {
            console.error(`[Google Auth] Failed to check backend configurations:`, err);
            showConfigWarning();
        });

    function showConfigWarning() {
        envWarning.classList.remove('hidden');
        gisGoogleBtn.classList.add('hidden');
        
        // Disable forms since real OAuth credentials are required
        emailInput.disabled = true;
        emailNextBtn.disabled = true;
    }

    function initRealGoogleOauth() {
        if (!googleClientId) return;

        if (typeof window.google === 'undefined' || typeof window.google.accounts === 'undefined') {
            console.warn("Google API SDK script not ready yet. Retrying in 500ms...");
            setTimeout(initRealGoogleOauth, 500);
            return;
        }

        try {
            const isDark = document.body.classList.contains('dark-mode');
            
            // 1. Initialize Client SDK instance
            window.google.accounts.id.initialize({
                client_id: googleClientId,
                callback: handleRealGoogleCredential
            });

            // 2. Render standard Google Login button inside layout
            window.google.accounts.id.renderButton(
                gisGoogleBtn,
                { 
                    theme: isDark ? 'filled_blue' : 'outline', 
                    size: 'large', 
                    width: '370',
                    shape: 'pill'
                }
            );
        } catch (err) {
            console.error("GIS Button rendering exception:", err);
            showConfigWarning();
        }
    }

    // ----------------------------------------------------
    // SECURE REAL OAUTH TOKEN SIGNATURE API POST
    // ----------------------------------------------------
    function handleRealGoogleCredential(response) {
        showLoading(true);
        console.log(`[OAuth Frontend] Submitting identity token credentials to server backend...`);

        fetch('/api/auth/google', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                token: response.credential
            })
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(errData => { throw new Error(errData.error || 'Identity verification failed') });
            }
            return res.json();
        })
        .then(data => {
            showLoading(false);
            console.log(`[OAuth Frontend] Server authorized session for:`, data.user.email);
            loginToDashboard(data.user);
        })
        .catch(err => {
            showLoading(false);
            console.error(`[OAuth Frontend] Server authorization exception:`, err);
            alert(`Real OAuth Verification Failed: ${err.message}. Check your server logs.`);
        });
    }

    // ==========================================
    // 3. MAIN FORM STEP: EMAIL NEXT
    // ==========================================
    emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        validateEmailStep();
    });

    function validateEmailStep() {
        const emailVal = emailInput.value.trim();
        emailInput.parentElement.classList.remove('error');
        emailError.classList.remove('show');
        emailError.textContent = '';

        if (!emailVal) {
            showInputError(emailInput, emailError, 'Enter an email or phone number');
            return;
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const phoneRegex = /^\+?[0-9\s\-]{8,15}$/;

        const isValidEmail = emailRegex.test(emailVal);
        const isValidPhone = phoneRegex.test(emailVal);

        if (!isValidEmail && !isValidPhone) {
            showInputError(emailInput, emailError, 'Enter a valid email address or phone number');
            return;
        }

        showLoading(true);
        emailNextBtn.disabled = true;

        setTimeout(() => {
            showLoading(false);
            emailNextBtn.disabled = false;
            
            userEmailAddress = isValidEmail ? emailVal : `${emailVal}@gmail.com`;
            const namePart = userEmailAddress.split('@')[0];
            userDisplayName = namePart
                .split(/[\._-]/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            // Setup Profile UI
            profileName.textContent = userDisplayName;
            profileEmail.textContent = userEmailAddress;
            avatarIcon.textContent = userDisplayName.charAt(0).toUpperCase();
            avatarIcon.style.backgroundImage = ''; // Clear photo

            slideViews('forward');
            passwordInput.focus();
        }, 1200);
    }

    function showInputError(inputEl, errorEl, message) {
        inputEl.parentElement.classList.add('error');
        errorEl.textContent = message;
        errorEl.classList.add('show');
        inputEl.parentElement.style.animation = 'shake 0.3s ease-in-out';
        setTimeout(() => {
            inputEl.parentElement.style.animation = '';
        }, 300);
    }

    // ==========================================
    // 4. MAIN FORM STEP: PASSWORD SUBMIT
    // ==========================================
    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        validatePasswordStep();
    });

    function validatePasswordStep() {
        const passVal = passwordInput.value;
        passwordInput.parentElement.classList.remove('error');
        passwordError.classList.remove('show');
        passwordError.textContent = '';

        if (!passVal) {
            showInputError(passwordInput, passwordError, 'Enter a password');
            return;
        }

        if (passVal.length < 6) {
            showInputError(passwordInput, passwordError, 'Wrong password. Try again or click Forgot password.');
            return;
        }

        showLoading(true);
        passwordNextBtn.disabled = true;

        setTimeout(() => {
            showLoading(false);
            passwordNextBtn.disabled = false;
            
            loginToDashboard({
                name: userDisplayName,
                email: userEmailAddress,
                avatarLetter: userDisplayName.charAt(0).toUpperCase(),
                picture: null
            });
        }, 1500);
    }

    // Trigger dashboard state
    function loginToDashboard(user) {
        authCard.style.display = 'none';
        dashboardCard.classList.remove('hidden');
        
        // Populate profile cards
        dashboardName.textContent = user.name;
        dashboardEmail.textContent = user.email;
        
        // Profile picture vs profile letter fallback
        if (user.picture) {
            dashboardAvatar.textContent = '';
            dashboardAvatar.style.backgroundImage = `url('${user.picture}')`;
            dashboardAvatar.style.backgroundSize = 'cover';
        } else {
            dashboardAvatar.textContent = user.avatarLetter;
            dashboardAvatar.style.backgroundImage = '';
            dashboardAvatar.style.backgroundColor = 'var(--google-blue)';
        }

        // Set Location
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const region = tz.split('/')[1] || tz;
            const cleanRegion = region.replace('_', ' ');
            sessionLocation.textContent = `${cleanRegion} • Active now`;
        } catch (err) {
            sessionLocation.textContent = 'Bengaluru, India • Active now';
        }

        // Transition animations
        setTimeout(() => {
            dashboardCard.classList.add('show');
            
            // Gauge scoring anim
            gaugeFill.style.strokeDashoffset = '0';
            
            let count = 0;
            const countInterval = setInterval(() => {
                count += 2;
                gaugeVal.textContent = `${count}%`;
                if (count >= 100) {
                    clearInterval(countInterval);
                }
            }, 20);

            runConfettiCelebration();
        }, 50);
    }

    // Toggle Password visibility
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        const eyeOpen = togglePasswordBtn.querySelector('.eye-open');
        const eyeClosed = togglePasswordBtn.querySelector('.eye-closed');
        eyeOpen.classList.toggle('hidden');
        eyeClosed.classList.toggle('hidden');
    });

    // Back to email screen
    backToEmailBtn.addEventListener('click', () => {
        slideViews('backward');
        passwordInput.value = '';
        passwordInput.parentElement.classList.remove('error');
        passwordError.classList.remove('show');
        setTimeout(() => {
            emailInput.focus();
        }, 400);
    });

    // Helper functions
    function showLoading(isActive) {
        if (isActive) {
            loadingBar.classList.add('active');
        } else {
            loadingBar.classList.remove('active');
        }
    }

    function slideViews(direction) {
        if (direction === 'forward') {
            formViewsSlider.style.transform = 'translateX(-50%)';
            emailView.classList.remove('active');
            passwordView.classList.add('active');
        } else {
            formViewsSlider.style.transform = 'translateX(0)';
            passwordView.classList.remove('active');
            emailView.classList.add('active');
        }
    }

    // ==========================================
    // 5. SIGN OUT FLOW
    // ==========================================
    signOutBtn.addEventListener('click', () => {
        dashboardCard.classList.remove('show');
        
        // If logged in via GSI SDK, revoke session
        if (googleClientId && window.google) {
            try {
                window.google.accounts.id.disableAutoSelect();
            } catch (err) {
                console.log("Failed to disable GSI auto select on sign-out:", err);
            }
        }

        setTimeout(() => {
            dashboardCard.classList.add('hidden');
            authCard.style.display = 'flex';
            
            // Reset state
            slideViews('backward');
            emailInput.value = '';
            passwordInput.value = '';
            gaugeFill.style.strokeDashoffset = '126';
            gaugeVal.textContent = '0%';
            emailInput.focus();
        }, 450);
    });

    // ==========================================
    // 6. CUSTOM CANVAS CONFETTI
    // ==========================================
    function runConfettiCelebration() {
        const ctx = confettiCanvas.getContext('2d');
        let animationFrameId;
        
        const resizeCanvas = () => {
            confettiCanvas.width = dashboardCard.clientWidth;
            confettiCanvas.height = dashboardCard.clientHeight;
        };
        resizeCanvas();

        const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];
        const particleCount = 120;
        const particles = [];

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: confettiCanvas.width / 2,
                y: confettiCanvas.height - 20,
                radius: Math.random() * 5 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                speedX: (Math.random() - 0.5) * 12,
                speedY: -(Math.random() * 12 + 6),
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                opacity: 1,
                friction: 0.98,
                gravity: 0.3
            });
        }

        function drawFrame() {
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            let activeParticles = 0;

            particles.forEach((p) => {
                if (p.opacity <= 0) return;
                activeParticles++;

                p.speedX *= p.friction;
                p.speedY += p.gravity;
                p.x += p.speedX;
                p.y += p.speedY;
                p.rotation += p.rotationSpeed;
                
                if (p.y > confettiCanvas.height / 2) {
                    p.opacity -= 0.015;
                }

                ctx.save();
                ctx.globalAlpha = p.opacity;
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.rect(-p.radius, -p.radius / 2, p.radius * 2, p.radius);
                ctx.fill();
                
                ctx.restore();
            });

            if (activeParticles > 0) {
                animationFrameId = requestAnimationFrame(drawFrame);
            } else {
                cancelAnimationFrame(animationFrameId);
                ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            }
        }

        drawFrame();

        setTimeout(() => {
            cancelAnimationFrame(animationFrameId);
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }, 5000);
    }
});

// Inline shaker style
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
}
`;
document.head.appendChild(styleSheet);
