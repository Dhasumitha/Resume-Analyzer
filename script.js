// =====================================================
// RESUME ANALYZER - COMPLETE INTERACTIVE APPLICATION
// =====================================================

// Global variables
let selectedFile = null;
let analysisData = null;

// =====================================================
// INITIALIZATION
// =====================================================
const API_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    initializePageSpecificFeatures();
    initializeAnimations();
});

function initializeApp() {
    // Initialize navigation
    initializeNavigation();

    // Initialize scroll effects
    initializeScrollEffects();

    // Initialize tooltips and interactive elements
    initializeInteractiveElements();

    // Initialize logout functionality
    initializeLogout();

    // Initialize user avatar
    initializeUserAvatar();
}

// =====================================================
// NAVIGATION
// =====================================================
function initializeNavigation() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Add active state to navigation links
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPage) {
            link.classList.add('active');
        }
    });
}

// =====================================================
// FILE UPLOAD FUNCTIONALITY
// =====================================================
function initializeFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const dropzone = document.getElementById('dropzone');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const jobRoleSelect = document.getElementById('jobRole');

    if (!dropzone) return;

    // Click to browse files
    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            handleFileSelect(e.target.files);
        });
    }

    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        handleFileSelect(files);
    }, false);

    // Job role change handler
    if (jobRoleSelect) {
        jobRoleSelect.addEventListener('change', checkUploadFormCompletion);
    }

    // Analyze button handler
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', handleAnalyzeClick);
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleFileSelect(files) {
        if (files.length === 0) return;

        const file = files[0];
        const allowedTypes = ['application/pdf', 'text/plain', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        // Validate file type
        if (!allowedTypes.includes(file.type)) {
            showNotification('Please upload a PDF, DOC, DOCX, or TXT file only.', 'error');
            return;
        }

        // Validate file size
        if (file.size > maxSize) {
            showNotification('File size must be less than 5MB.', 'error');
            return;
        }

        // Store selected file
        selectedFile = file;

        // Update UI
        updateDropzoneUI(file);
        checkUploadFormCompletion();
        showNotification(`File "${file.name}" selected successfully!`, 'success');
    }

    function updateDropzoneUI(file) {
        const dropzoneTitle = dropzone.querySelector('.dropzone-title');
        const dropzoneText = dropzone.querySelector('.dropzone-text');
        const uploadIcon = dropzone.querySelector('.upload-icon');

        if (dropzoneTitle) {
            dropzoneTitle.innerHTML = `<strong>✓ ${file.name}</strong>`;
        }
        if (dropzoneText) {
            dropzoneText.textContent = `Size: ${(file.size / 1024).toFixed(2)} KB`;
        }

        dropzone.style.borderColor = '#10B981';
        dropzone.style.backgroundColor = '#D1FAE5';

        if (uploadIcon) {
            uploadIcon.style.animation = 'none';
        }
    }

    function checkUploadFormCompletion() {
        if (analyzeBtn && jobRoleSelect && fileInput) {
            const hasFile = selectedFile !== null;
            const hasJobRole = jobRoleSelect.value !== '';

            analyzeBtn.disabled = !(hasFile && hasJobRole);
        }
    }

    function handleAnalyzeClick(e) {
        e.preventDefault();

        if (!selectedFile || !jobRoleSelect.value) {
            showNotification('Please upload a file and select a job role.', 'error');
            return;
        }

        // Store analysis data in sessionStorage
        const analysisInfo = {
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            jobRole: jobRoleSelect.options[jobRoleSelect.selectedIndex].text,
            timestamp: new Date().toISOString()
        };
        sessionStorage.setItem('analysisData', JSON.stringify(analysisInfo));

        // Show loading state
        analyzeBtn.innerHTML = `
            <svg class="spinner" width="20" height="20" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" stroke="white" stroke-width="3" fill="none" 
                        stroke-dasharray="50" stroke-dashoffset="25">
                    <animateTransform attributeName="transform" type="rotate" 
                                    from="0 10 10" to="360 10 10" dur="1s" repeatCount="indefinite"/>
                </circle>
            </svg>
            Analyzing...
        `;
        analyzeBtn.disabled = true;

        // Simulate analysis with progress
        simulateAnalysisProgress();
    }

    function simulateAnalysisProgress() {
        const steps = [
            'Extracting text...',
            'Analyzing keywords...',
            'Checking ATS compatibility...',
            'Generating insights...',
            'Preparing report...'
        ];

        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                showNotification(steps[currentStep], 'info');
                currentStep++;
            } else {
                clearInterval(interval);

                // Actual API Call
                const formData = new FormData();
                formData.append('resume', selectedFile);
                formData.append('jobRole', jobRoleSelect.options[jobRoleSelect.selectedIndex].text);

                // Get auth token
                const session = JSON.parse(sessionStorage.getItem('session') || '{}');
                const token = session.access_token;

                fetch(`${API_BASE_URL}/api/resume/analyze`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                })
                    .then(response => {
                        if (!response.ok) {
                            return response.json().then(err => { throw new Error(err.message || 'Analysis failed') });
                        }
                        return response.json();
                    })
                    .then(data => {
                        // Update session storage with real analysis data
                        const analysisInfo = {
                            fileName: selectedFile.name,
                            fileSize: selectedFile.size,
                            jobRole: jobRoleSelect.options[jobRoleSelect.selectedIndex].text,
                            timestamp: new Date().toISOString(),
                            ...data // Merge API response
                        };
                        sessionStorage.setItem('analysisData', JSON.stringify(analysisInfo));
                        window.location.href = 'analysis.html';
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        showNotification('Analysis failed. Please try again.', 'error');
                        analyzeBtn.disabled = false;
                        analyzeBtn.innerHTML = originalBtnText; // Restore button text, assuming you saved it or can recreate it
                    });
            }
        }, 600);
    }
}

// =====================================================
// AUTHENTICATION FORMS
// =====================================================
function initializeAuthForms() {
    // If user is already logged in, redirect to dashboard
    if (sessionStorage.getItem('userData')) {
        window.location.href = 'dashboard.html';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // Password toggle functionality
    initializePasswordToggles();

    // Social Login functionality
    initializeSocialLogin();
}

function initializeSocialLogin() {
    const googleBtn = document.getElementById('googleLoginBtn');
    const linkedinBtn = document.getElementById('linkedinLoginBtn');

    if (googleBtn) {
        googleBtn.addEventListener('click', () => handleSocialLogin('Google'));
    }

    if (linkedinBtn) {
        linkedinBtn.addEventListener('click', () => handleSocialLogin('LinkedIn'));
    }
}

function handleSocialLogin(provider) {
    showNotification(`Connecting to ${provider}...`, 'info');

    // Simulate API call and delay
    setTimeout(() => {
        const userData = {
            username: `User_${provider}`,
            email: `user@${provider.toLowerCase()}.com`,
            role: 'Software Engineer'
        };
        sessionStorage.setItem('userData', JSON.stringify(userData));

        showNotification(`Successfully logged in with ${provider}!`, 'success');

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }, 1500);
}

function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Validate inputs
    if (!validateEmail(email)) {
        showNotification('Please enter a valid email address.', 'error');
        return;
    }

    if (password.length < 8) {
        showNotification('Password must be at least 8 characters.', 'error');
        return;
    }

    // API Call for Login
    showNotification('Signing in...', 'info');

    fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.message || 'Login failed') });
            }
            return response.json();
        })
        .then(data => {
            sessionStorage.setItem('userData', JSON.stringify(data.user));
            sessionStorage.setItem('session', JSON.stringify(data.session)); // Store session
            showNotification('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        })
        .catch(error => {
            console.error('Login error:', error);

            let errorMessage = error.message;
            if (error.message === 'Failed to fetch') {
                errorMessage = 'Unable to connect to server. Make sure the server is running on port 3000.';
            }

            showNotification(errorMessage, 'error');
        });
}

function handleSignup(e) {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate inputs
    if (fullName.trim().length < 2) {
        showNotification('Please enter your full name.', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showNotification('Please enter a valid email address.', 'error');
        return;
    }

    if (password.length < 8) {
        showNotification('Password must be at least 8 characters.', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }

    // API Call for Signup
    showNotification('Creating your account...', 'info');

    fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fullName, email, password }),
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.message || 'Signup failed')
                });
            }
            return response.json();
        })
        .then(data => {
            // Always save user data and redirect to dashboard
            sessionStorage.setItem('userData', JSON.stringify(data.user));
            if (data.session) {
                sessionStorage.setItem('session', JSON.stringify(data.session));
            }
            showNotification('Account created successfully! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        })
        .catch(error => {
            console.error('Signup error:', error);

            // Provide more helpful error messages
            let errorMessage = error.message;
            if (error.message === 'Failed to fetch') {
                errorMessage = 'Unable to connect to server. Make sure the server is running on port 3000.';
            } else if (error.message.includes('already exists')) {
                errorMessage = 'This email is already registered. Please login or use a different email.';
            }

            showNotification(errorMessage, 'error');
        });
}

function initializePasswordToggles() {
    const passwordToggles = document.querySelectorAll('.password-toggle');

    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const input = toggle.closest('.password-input-container')?.querySelector('input') ||
                toggle.previousElementSibling;

            if (input) {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';

                toggle.innerHTML = isPassword ?
                    `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 4C5 4 1 10 1 10s4 6 9 6 9-6 9-6-4-6-9-6z"/>
                        <line x1="2" y1="2" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
                    </svg>` :
                    `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 4C5 4 1 10 1 10s4 6 9 6 9-6 9-6-4-6-9-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/>
                    </svg>`;
            }
        });
    });
}

// =====================================================
// ANALYSIS PAGE
// =====================================================
function initializeAnalysisPage() {
    // Animate score circle
    animateScoreCircle();

    // Load analysis data
    loadAnalysisData();

    // Add skill tag interactions
    initializeSkillTags();

    // Initialize download report functionality
    initializeDownloadReport();
}

function animateScoreCircle() {
    const scoreCircle = document.querySelector('.score-circle');
    if (!scoreCircle) return;

    const scoreValue = document.querySelector('.score-value');
    const scoreRing = document.querySelector('.score-ring-progress');

    if (scoreValue && scoreRing) {
        const targetScore = 85;
        const radius = 85;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (targetScore / 100) * circumference;

        // Animate the number
        animateNumber(scoreValue, 0, targetScore, 2000);

        // Animate the ring
        scoreRing.style.strokeDasharray = circumference;
        scoreRing.style.strokeDashoffset = circumference;

        setTimeout(() => {
            scoreRing.style.transition = 'stroke-dashoffset 2s ease-in-out';
            scoreRing.style.strokeDashoffset = offset;
        }, 100);
    }
}

function animateNumber(element, start, end, duration) {
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const value = Math.floor(start + (end - start) * easeOutCubic(progress));
        element.textContent = value;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function loadAnalysisData() {
    const data = sessionStorage.getItem('analysisData');
    if (data) {
        analysisData = JSON.parse(data);
        console.log('Analysis data loaded:', analysisData);
    }
}

function initializeSkillTags() {
    const skillTags = document.querySelectorAll('.skill-tag');

    skillTags.forEach(tag => {
        tag.addEventListener('click', () => {
            tag.style.transform = 'scale(1.05)';
            setTimeout(() => {
                tag.style.transform = '';
            }, 200);
        });
    });
}

// =====================================================
// LOGOUT FUNCTIONALITY
// =====================================================
function initializeLogout() {
    const logoutBtns = document.querySelectorAll('#logoutBtn');

    logoutBtns.forEach(btn => {
        btn.addEventListener('click', handleLogout);
    });
}

function handleLogout() {
    // Show confirmation
    if (confirm('Are you sure you want to logout?')) {
        // Clear session data
        sessionStorage.removeItem('userData');
        sessionStorage.removeItem('analysisData');

        // Show notification
        showNotification('Logged out successfully! Redirecting...', 'success');

        // Redirect to login after delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}

// =====================================================
// USER AVATAR FUNCTIONALITY
// =====================================================
function initializeUserAvatar() {
    const userData = sessionStorage.getItem('userData');
    if (userData) {
        const user = JSON.parse(userData);
        updateUserAvatar(user);
    }
}

function updateUserAvatar(user) {
    const userAvatarImgs = document.querySelectorAll('#userAvatarImg');
    const username = user.username || 'User';
    const initial = username.charAt(0).toUpperCase();

    userAvatarImgs.forEach(img => {
        // Create personalized avatar with user's initial
        img.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23667eea'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='white' font-size='16' font-family='Arial' font-weight='bold'%3E${initial}%3C/text%3E%3C/svg%3E`;
    });
}

// =====================================================
// EDIT PROFILE FUNCTIONALITY
// =====================================================
function initializeEditProfile() {
    const editProfileBtn = document.getElementById('editProfileBtn');
    const modal = document.getElementById('editProfileModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const modalOverlay = document.getElementById('modalOverlay');
    const profileForm = document.getElementById('profileForm');

    if (!editProfileBtn || !modal) return;

    // Open modal
    editProfileBtn.addEventListener('click', () => {
        openEditProfileModal();
    });

    // Close modal handlers
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeEditProfileModal);
    }
    if (cancelModalBtn) {
        cancelModalBtn.addEventListener('click', closeEditProfileModal);
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeEditProfileModal);
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeEditProfileModal();
        }
    });

    // Handle form submission
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    function openEditProfileModal() {
        // Load current user data from session or DOM
        const userData = sessionStorage.getItem('userData');
        let username = '';
        let email = '';
        let role = '';

        if (userData) {
            const user = JSON.parse(userData);
            username = user.username || '';
            email = user.email || '';
            role = user.role || '';
        } else {
            // Fallback to currently displayed values
            username = document.querySelector('.profile-name')?.textContent.trim() || '';
            email = document.getElementById('profileEmailDisplay')?.textContent.trim() || '';
            role = document.querySelector('.profile-title')?.textContent.trim() || '';
        }

        document.getElementById('profileUsername').value = username;
        document.getElementById('profileEmail').value = email;
        document.getElementById('profileRole').value = role;

        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeEditProfileModal() {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }

    function handleProfileUpdate(e) {
        e.preventDefault();

        const username = document.getElementById('profileUsername').value;
        const email = document.getElementById('profileEmail').value;
        const role = document.getElementById('profileRole').value;

        // Validate
        if (!validateEmail(email)) {
            showNotification('Please enter a valid email address.', 'error');
            return;
        }
        // API Call via Fetch
        const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
        const session = JSON.parse(sessionStorage.getItem('session') || '{}');
        const token = session.access_token;
        const originalEmail = userData.email;

        fetch(`${API_BASE_URL}/api/user/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                email: originalEmail || email,
                newEmail: email,
                username,
                role
            }),
        })
            .then(response => response.json())
            .then(data => {
                if (data.user) {
                    sessionStorage.setItem('userData', JSON.stringify(data.user));
                    updateDashboardUI(data.user);
                    updateUserAvatar(data.user);
                    showNotification('Profile updated successfully!', 'success');
                    closeEditProfileModal();
                } else {
                    showNotification('Failed to update profile', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error updating profile', 'error');
            });
    }
}

// =====================================================
// SETTINGS FUNCTIONALITY
// =====================================================
function initializeSettings() {
    const settingsBtn = document.getElementById('settingsBtn');

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            // For now, settings opens the edit profile modal
            // In the future, you can create a separate settings modal
            const editProfileBtn = document.getElementById('editProfileBtn');
            if (editProfileBtn) {
                editProfileBtn.click();
            }
        });
    }
}

// =====================================================
// DASHBOARD PAGE
// =====================================================
function initializeDashboard() {
    // Load user data
    const userData = sessionStorage.getItem('userData');
    if (userData) {
        const user = JSON.parse(userData);
        updateDashboardUI(user);
    }

    // Initialize edit profile
    initializeEditProfile();

    // Initialize settings button
    initializeSettings();

    // Animate progress bars
    animateProgressBars();
}

function updateDashboardUI(user) {
    // Update welcome message
    const welcomeTitle = document.querySelector('.welcome-title');
    if (welcomeTitle && user.username) {
        welcomeTitle.textContent = `Welcome, ${user.username}`;
    }

    // Update profile name
    const profileName = document.querySelector('.profile-name');
    if (profileName && user.username) {
        profileName.textContent = user.username;
    }

    // Update profile email
    const profileEmailDisplay = document.getElementById('profileEmailDisplay');
    if (profileEmailDisplay && user.email) {
        profileEmailDisplay.textContent = user.email;
    }

    // Update profile role
    const profileTitle = document.querySelector('.profile-title');
    if (profileTitle && user.role) {
        profileTitle.textContent = user.role;
    }
}

function animateProgressBars() {
    const strengthFill = document.querySelector('.strength-fill');
    if (strengthFill) {
        const targetWidth = strengthFill.style.width;
        strengthFill.style.width = '0%';

        setTimeout(() => {
            strengthFill.style.width = targetWidth;
        }, 300);
    }

    const metricBars = document.querySelectorAll('.metric-bar-fill');
    metricBars.forEach((bar, index) => {
        const targetWidth = bar.style.width;
        bar.style.width = '0%';

        setTimeout(() => {
            bar.style.width = targetWidth;
        }, 300 + (index * 100));
    });
}

// =====================================================
// ANIMATIONS
// =====================================================
function initializeAnimations() {
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements
    const animatedElements = document.querySelectorAll(
        '.card, .activity-item, .suggestion-item, .profile-card, .upload-section'
    );

    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `opacity 0.6s ease ${index * 0.05}s, transform 0.6s ease ${index * 0.05}s`;
        observer.observe(el);
    });
}

function initializeScrollEffects() {
    let lastScroll = 0;
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (navbar) {
            if (currentScroll > lastScroll && currentScroll > 100) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }
        }

        lastScroll = currentScroll;
    });
}

// =====================================================
// INTERACTIVE ELEMENTS
// =====================================================
function initializeInteractiveElements() {
    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', createRipple);
    });

    // Add hover effects to cards
    const cards = document.querySelectorAll('.card, .profile-card, .activity-item');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-4px)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = '';
        });
    });
}

function createRipple(e) {
    const button = e.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);

    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// =====================================================
// NOTIFICATIONS
// =====================================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };
    return icons[type] || icons.info;
}

// =====================================================
// MY RESUMES FUNCTIONALITY
// =====================================================
function initializeMyResumes() {
    loadResumeStats();
    loadResumes();
    initializeResumeSearch();
}

function loadResumeStats() {
    const resumes = getStoredResumes();
    const totalResumes = resumes.length;
    const analyzedResumes = resumes.filter(r => r.analyzed).length;
    const avgScore = analyzedResumes > 0
        ? Math.round(resumes.filter(r => r.score).reduce((sum, r) => sum + r.score, 0) / analyzedResumes)
        : 0;

    // Update stats
    const totalElement = document.getElementById('totalResumes');
    const analyzedElement = document.getElementById('analyzedResumes');
    const avgScoreElement = document.getElementById('avgScore');

    if (totalElement) totalElement.textContent = totalResumes;
    if (analyzedElement) analyzedElement.textContent = analyzedResumes;
    if (avgScoreElement) avgScoreElement.textContent = avgScore;
}

function loadResumes() {
    const container = document.getElementById('resumesContainer');
    const emptyState = document.getElementById('emptyState');
    const resumes = getStoredResumes();

    if (!container) return;

    if (resumes.length === 0) {
        container.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    container.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';

    // Sort by date (newest first)
    resumes.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    container.innerHTML = resumes.map(resume => createResumeCard(resume)).join('');

    // Add event listeners
    resumes.forEach(resume => {
        const viewBtn = document.getElementById(`view-${resume.id}`);
        const deleteBtn = document.getElementById(`delete-${resume.id}`);

        if (viewBtn) {
            viewBtn.addEventListener('click', () => viewResumeAnalysis(resume.id));
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteResume(resume.id));
        }
    });
}

function createResumeCard(resume) {
    const date = new Date(resume.uploadDate);
    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const scoreColor = resume.score >= 80 ? '#10B981' : resume.score >= 60 ? '#F59E0B' : '#EF4444';
    const scoreLabel = resume.score >= 80 ? 'Excellent' : resume.score >= 60 ? 'Good' : 'Needs Work';

    return `
        <div class="resume-card">
            <div class="resume-card-header">
                <div class="resume-icon">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <rect x="6" y="4" width="20" height="24" rx="2" fill="#E3F2FD"/>
                        <rect x="6" y="4" width="20" height="24" rx="2" stroke="#007BFF" stroke-width="2"/>
                        <line x1="10" y1="10" x2="22" y2="10" stroke="#007BFF" stroke-width="2"/>
                        <line x1="10" y1="15" x2="18" y2="15" stroke="#007BFF" stroke-width="2"/>
                        <line x1="10" y1="20" x2="20" y2="20" stroke="#007BFF" stroke-width="2"/>
                    </svg>
                </div>
                <div class="resume-info">
                    <h3 class="resume-name">${resume.fileName}</h3>
                    <p class="resume-meta">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
                            <path d="M7 0a7 7 0 100 14A7 7 0 007 0zm0 13A6 6 0 117 1a6 6 0 010 12zm.5-10h-1v5.5h4v-1h-3V3z"/>
                        </svg>
                        ${formattedDate}
                    </p>
                </div>
            </div>

            <div class="resume-details">
                <div class="resume-detail">
                    <span class="detail-label">Job Role</span>
                    <span class="detail-value">${resume.jobRole}</span>
                </div>
                <div class="resume-detail">
                    <span class="detail-label">File Size</span>
                    <span class="detail-value">${formatFileSize(resume.fileSize)}</span>
                </div>
            </div>

            ${resume.analyzed ? `
                <div class="resume-score">
                    <div class="score-circle-small" style="border-color: ${scoreColor};">
                        <span class="score-number-small" style="color: ${scoreColor};">${resume.score}</span>
                    </div>
                    <div class="score-info-small">
                        <span class="score-label-small">${scoreLabel}</span>
                        <span class="score-sublabel">ATS Score</span>
                    </div>
                </div>
            ` : `
                <div class="resume-pending">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="#F59E0B">
                        <path d="M10 0a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm1-13H9v6h2V5zm0 8H9v2h2v-2z"/>
                    </svg>
                    <span>Analysis Pending</span>
                </div>
            `}

            <div class="resume-actions">
                <button class="btn btn-primary btn-sm" id="view-${resume.id}">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 2C4.5 2 1.5 5 1.5 8s3 6 6.5 6 6.5-3 6.5-6-3-6-6.5-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/>
                        <circle cx="8" cy="8" r="2"/>
                    </svg>
                    View Analysis
                </button>
                <button class="btn btn-outline btn-sm" id="delete-${resume.id}">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
                        <path fill-rule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                    </svg>
                    Delete
                </button>
            </div>
        </div>
    `;
}

function getStoredResumes() {
    const resumes = localStorage.getItem('myResumes');
    return resumes ? JSON.parse(resumes) : [];
}

function saveResume(resumeData) {
    const resumes = getStoredResumes();
    resumes.push(resumeData);
    localStorage.setItem('myResumes', JSON.stringify(resumes));
}

function deleteResume(id) {
    if (!confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
        return;
    }

    let resumes = getStoredResumes();
    resumes = resumes.filter(r => r.id !== id);
    localStorage.setItem('myResumes', JSON.stringify(resumes));

    showNotification('Resume deleted successfully!', 'success');
    loadResumeStats();
    loadResumes();
}

function viewResumeAnalysis(id) {
    const resumes = getStoredResumes();
    const resume = resumes.find(r => r.id === id);

    if (!resume) {
        showNotification('Resume not found!', 'error');
        return;
    }

    if (!resume.analyzed) {
        showNotification('This resume has not been analyzed yet. Please upload and analyze it first.', 'warning');
        return;
    }

    // Store the resume data for analysis page
    sessionStorage.setItem('analysisData', JSON.stringify({
        fileName: resume.fileName,
        fileSize: resume.fileSize,
        jobRole: resume.jobRole,
        timestamp: resume.uploadDate
    }));

    window.location.href = 'analysis.html';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function initializeResumeSearch() {
    const searchInput = document.getElementById('resumeSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const resumeCards = document.querySelectorAll('.resume-card');

        resumeCards.forEach(card => {
            const fileName = card.querySelector('.resume-name').textContent.toLowerCase();
            const jobRole = card.querySelector('.detail-value').textContent.toLowerCase();

            if (fileName.includes(searchTerm) || jobRole.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

// Helper function to add resume when analyzing
function addResumeToStorage(fileName, fileSize, jobRole) {
    const resumeData = {
        id: 'resume_' + Date.now(),
        fileName: fileName,
        fileSize: fileSize,
        jobRole: jobRole,
        uploadDate: new Date().toISOString(),
        analyzed: true,
        score: 85 // This would come from actual analysis
    };
    saveResume(resumeData);
}

// =====================================================
// NOTIFICATIONS
// =====================================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };
    return icons[type] || icons.info;
}
function initializeDownloadReport() {
    const downloadBtn = document.querySelector('.header-actions .btn-primary');

    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleDownloadReport);
    }
}

function handleDownloadReport() {
    showNotification('Preparing your report...', 'info');

    // Get analysis data
    const data = sessionStorage.getItem('analysisData');
    let analysisInfo = data ? JSON.parse(data) : {
        fileName: 'resume.pdf',
        jobRole: 'Software Engineer',
        timestamp: new Date().toISOString()
    };

    // Get user data
    const userData = sessionStorage.getItem('userData');
    let user = userData ? JSON.parse(userData) : { username: 'User', email: 'user@example.com', role: 'Software Engineer' };

    // Generate report content
    const reportContent = generateReportHTML(analysisInfo, user);

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(reportContent);
    printWindow.document.close();

    // Wait for content to load then trigger print
    setTimeout(() => {
        printWindow.print();
        showNotification('Report ready for download!', 'success');
    }, 500);
}

function generateReportHTML(analysisInfo, user) {
    const date = new Date(analysisInfo.timestamp);
    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Resume Analysis Report</title>
            <meta charset="UTF-8">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    padding: 40px;
                    background: white;
                }
                
                .header {
                    border-bottom: 4px solid #007BFF;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                
                .logo {
                    font-size: 24px;
                    font-weight: bold;
                    color: #007BFF;
                    margin-bottom: 10px;
                }
                
                .report-title {
                    font-size: 32px;
                    font-weight: 700;
                    color: #1a1a1a;
                    margin-bottom: 10px;
                }
                
                .report-meta {
                    font-size: 14px;
                    color: #666;
                }
                
                .section {
                    margin: 30px 0;
                    page-break-inside: avoid;
                }
                
                .section-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #007BFF;
                    margin-bottom: 15px;
                    border-left: 4px solid #007BFF;
                    padding-left: 12px;
                }
                
                .score-box {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    border-radius: 12px;
                    text-align: center;
                    margin: 20px 0;
                }
                
                .score-number {
                    font-size: 72px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                
                .score-label {
                    font-size: 18px;
                    opacity: 0.9;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin: 20px 0;
                }
                
                .info-item {
                    padding: 12px;
                    background: #f8f9fa;
                    border-radius: 8px;
                }
                
                .info-label {
                    font-size: 12px;
                    color: #666;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                }
                
                .info-value {
                    font-size: 16px;
                    font-weight: 600;
                    color: #1a1a1a;
                }
                
                .skill-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin: 15px 0;
                }
                
                .skill-tag {
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 500;
                }
                
                .skill-tag.matched {
                    background: #d1fae5;
                    color: #065f46;
                }
                
                .skill-tag.missing {
                    background: #fee2e2;
                    color: #991b1b;
                }
                
                .skill-tag.partial {
                    background: #fef3c7;
                    color: #92400e;
                }
                
                .suggestion-list {
                    list-style: none;
                }
                
                .suggestion-item {
                    padding: 15px;
                    margin: 10px 0;
                    background: #f8f9fa;
                    border-left: 4px solid #007BFF;
                    border-radius: 4px;
                }
                
                .suggestion-title {
                    font-weight: 600;
                    color: #1a1a1a;
                    margin-bottom: 8px;
                }
                
                .suggestion-desc {
                    font-size: 14px;
                    color: #666;
                    line-height: 1.5;
                }
                
                .metric-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 0;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .metric-label {
                    font-weight: 500;
                    color: #4b5563;
                }
                
                .metric-value {
                    font-weight: 600;
                    color: #007BFF;
                    font-size: 18px;
                }
                
                .footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid #e5e7eb;
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                }
                
                @media print {
                    body {
                        padding: 20px;
                    }
                    
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">📄 ResumeAnalyzer</div>
                <h1 class="report-title">Resume Analysis Report</h1>
                <div class="report-meta">
                    Generated on ${formattedDate} | Report for ${user.username}
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">Overall Score</h2>
                <div class="score-box">
                    <div class="score-number">85</div>
                    <div class="score-label">OUT OF 100</div>
                </div>
                <p style="margin-top: 15px; font-size: 15px; color: #4b5563;">
                    Great job! Your resume is highly optimized for this role. With a few improvements, 
                    you can reach an even higher score.
                </p>
            </div>
            
            <div class="section">
                <h2 class="section-title">Analysis Details</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Resume File</div>
                        <div class="info-value">${analysisInfo.fileName}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Target Role</div>
                        <div class="info-value">${analysisInfo.jobRole}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Analysis Date</div>
                        <div class="info-value">${formattedDate}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">ATS Compatibility</div>
                        <div class="info-value">89%</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">Performance Metrics</h2>
                <div class="metric-row">
                    <span class="metric-label">Overall Match Score</span>
                    <span class="metric-value">85%</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Keyword Relevance</span>
                    <span class="metric-value">88%</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">ATS Compatibility</span>
                    <span class="metric-value">89%</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Format Quality</span>
                    <span class="metric-value">92%</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Content Strength</span>
                    <span class="metric-value">82%</span>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">Skill Analysis</h2>
                <h3 style="font-size: 14px; color: #666; margin: 15px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Matched Skills</h3>
                <div class="skill-tags">
                    <span class="skill-tag matched">React.js</span>
                    <span class="skill-tag matched">TypeScript</span>
                    <span class="skill-tag matched">Tailwind CSS</span>
                    <span class="skill-tag matched">UI/UX Design</span>
                    <span class="skill-tag matched">Git</span>
                    <span class="skill-tag matched">Agile</span>
                </div>
                
                <h3 style="font-size: 14px; color: #666; margin: 25px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Missing / Low Match</h3>
                <div class="skill-tags">
                    <span class="skill-tag missing">AWS Lambda</span>
                    <span class="skill-tag missing">GraphQL</span>
                    <span class="skill-tag partial">Docker</span>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">Improvement Suggestions</h2>
                <ul class="suggestion-list">
                    <li class="suggestion-item">
                        <div class="suggestion-title">1. Add Quantitative Achievements</div>
                        <p class="suggestion-desc">
                            Instead of "Improved website performance," use "Optimized page load speed by 45% 
                            using code-splitting and image lazy loading."
                        </p>
                    </li>
                    <li class="suggestion-item">
                        <div class="suggestion-title">2. Incorporate Missing Keywords</div>
                        <p class="suggestion-desc">
                            The job description emphasizes "Cloud infrastructure." Mention your experience 
                            with AWS services more explicitly in the skills section.
                        </p>
                    </li>
                    <li class="suggestion-item">
                        <div class="suggestion-title">3. Format Consistency</div>
                        <p class="suggestion-desc">
                            Standardize the date formats throughout your experience list (e.g., use "Jun 2021" 
                            instead of "06/21").
                        </p>
                    </li>
                    <li class="suggestion-item">
                        <div class="suggestion-title">4. Strengthen Professional Summary</div>
                        <p class="suggestion-desc">
                            Include your total years of experience and your core specialization in the first 
                            sentence of your summary.
                        </p>
                    </li>
                </ul>
            </div>
            
            <div class="section">
                <h2 class="section-title">Summary</h2>
                <p style="font-size: 15px; color: #4b5563; line-height: 1.7;">
                    Your resume shows strong proficiency in frontend technologies. To reach 95%, consider 
                    adding more quantitative metrics to your professional experience and including missing 
                    backend certifications. Focus on cloud infrastructure keywords and ensure consistent 
                    formatting throughout your document.
                </p>
            </div>
            
            <div class="footer">
                <p>This report was generated by ResumeAnalyzer - AI-Powered Resume Optimization</p>
                <p style="margin-top: 5px;">© 2024 ResumeAnalyzer. All rights reserved.</p>
            </div>
        </body>
        </html>
    `;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// =====================================================
// PAGE-SPECIFIC INITIALIZATION
// =====================================================
function initializePageSpecificFeatures() {
    const path = window.location.pathname;
    const currentPage = path.substring(path.lastIndexOf('/') + 1).split('?')[0].split('#')[0] || 'index.html';

    // Public pages (no auth required)
    const publicPages = ['index.html', 'login.html', 'signup.html'];

    // Protected pages (auth required)
    const protectedPages = ['dashboard.html', 'upload.html', 'analysis.html', 'my-resumes.html'];

    // Check if page is protected and user is not logged in
    if (protectedPages.includes(currentPage)) {
        const userData = sessionStorage.getItem('userData');
        if (!userData) {
            // Redirect to login if not authenticated
            window.location.href = 'index.html';
            return;
        }
    }

    // Redirect logged-in users away from auth pages to dashboard
    if (publicPages.includes(currentPage)) {
        const userData = sessionStorage.getItem('userData');
        if (userData) {
            window.location.href = 'dashboard.html';
            return;
        }
    }

    // Feature detection: Initialize features if key elements exist
    if (document.getElementById('editProfileBtn')) {
        initializeEditProfile();
        initializeSettings();
    }

    switch (currentPage) {
        case 'index.html':
            // Only initialize auth forms if not logged in
            if (!sessionStorage.getItem('userData')) {
                initializeAuthForms();
            }
            break;
        case 'login.html':
        case 'signup.html':
            initializeAuthForms();
            break;
        case 'dashboard.html':
            initializeDashboard();
            break;
        case 'upload.html':
            initializeFileUpload();
            break;
        case 'analysis.html':
            initializeAnalysisPage();
            break;
        case 'my-resumes.html':
            initializeMyResumes();
            break;
    }
}

// Add CSS for notifications and ripple effect
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateX(400px);
        transition: transform 0.3s ease;
        z-index: 10000;
        min-width: 300px;
    }

    .notification.show {
        transform: translateX(0);
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .notification-icon {
        font-size: 20px;
        font-weight: bold;
    }

    .notification-message {
        font-size: 14px;
        font-weight: 500;
    }

    .notification-success {
        background: #10B981;
        color: white;
    }

    .notification-error {
        background: #EF4444;
        color: white;
    }

    .notification-info {
        background: #3B82F6;
        color: white;
    }

    .notification-warning {
        background: #F59E0B;
        color: white;
    }

    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }

    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }

    .spinner {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .navbar {
        transition: transform 0.3s ease;
    }
`;
document.head.appendChild(style);


