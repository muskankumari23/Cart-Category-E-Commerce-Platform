document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:5000/api/auth';
    
    // --- UTILITIES --- //
    
    // Show Alert Message
    const showAlert = (alertId, success, message) => {
        const alertBox = document.getElementById(alertId);
        if (!alertBox) return;

        alertBox.className = `alert-box alert-${success ? 'success' : 'error'}`;
        alertBox.innerHTML = `
            <i class="fa-solid fa-${success ? 'circle-check' : 'circle-exclamation'}"></i>
            <span>${message}</span>
        `;
        alertBox.style.display = 'flex';
        
        // Auto hide success alerts after 5 seconds if not verification link message
        if (success && !message.includes('email to verify')) {
            setTimeout(() => { alertBox.style.display = 'none'; }, 5000);
        }
    };
    // Form Loading State
    const toggleButtonLoading = (btnId, isLoading, originalText = '') => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        
        if (isLoading) {
            btn.dataset.originalText = btn.innerHTML;
            btn.classList.add('btn-loading');
            btn.disabled = true;
        } else {
            btn.classList.remove('btn-loading');
            btn.innerHTML = btn.dataset.originalText || originalText;
            btn.disabled = false;
        }
    };
    // Password Toggle Show/Hide
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });

    // Login Tab Switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    if (tabBtns.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active classes
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => {
                    c.classList.remove('active');
                    c.style.display = 'none';
                });
                
                // Add active to clicked
                btn.classList.add('active');
                
                // Show relative form
                const tabId = btn.getAttribute('data-tab');
                const content = document.getElementById(tabId === 'tab-phone' ? 'phone-login-form' : 'email-login-form');
                if (content) {
                    content.classList.add('active');
                    content.style.display = 'flex';
                }
            });
        });
    }

    // --- AUTH API ACTIONS --- //

    // 1. Email Login Flow
    const emailLoginForm = document.getElementById('email-login-form');
    if (emailLoginForm) {
        emailLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            if (!email || !password) {
                return showAlert('login-alert', false, 'Please enter email and password.');
            }

            toggleButtonLoading('email-submit-btn', true);

            try {
                const res = await fetch(`${API_BASE_URL}/login-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await res.json();
                
                if (data.success) {
                    localStorage.setItem('cart_token', data.data.token);
                    localStorage.setItem('cart_user', JSON.stringify(data.data.user));
                    showAlert('login-alert', true, 'Login successful! Redirecting...');
                    setTimeout(() => window.location.href = 'index.html', 1500);
                } else {
                    showAlert('login-alert', false, data.message);
                }
            } catch (err) {
                showAlert('login-alert', false, 'Unable to connect to server. Please try again.');
            } finally {
                toggleButtonLoading('email-submit-btn', false);
            }
        });
    }

    // 2. Phone Login Flow (OTP)
    const phoneLoginForm = document.getElementById('phone-login-form');
    let resendTimerInterval;

    if (phoneLoginForm) {
        const sendOtpBtn = document.getElementById('send-otp-btn');
        const verifyOtpBtn = document.getElementById('verify-otp-btn');
        const resendOtpBtn = document.getElementById('resend-otp-btn');
        const editPhoneBtn = document.getElementById('edit-phone');
        
        const step1 = document.getElementById('phone-step-1');
        const step2 = document.getElementById('phone-step-2');
        const phoneInput = document.getElementById('login-phone');
        const otpInput = document.getElementById('login-otp');
        const displayPhoneNum = document.getElementById('display-phone-num');
        const timerDisplay = document.getElementById('resend-timer');

        const startResendTimer = () => {
            let timeLeft = 30;
            resendOtpBtn.disabled = true;
            timerDisplay.style.display = 'inline';
            
            clearInterval(resendTimerInterval);
            resendTimerInterval = setInterval(() => {
                timeLeft--;
                timerDisplay.textContent = `Resend in 00:${timeLeft < 10 ? '0' : ''}${timeLeft}`;
                
                if (timeLeft <= 0) {
                    clearInterval(resendTimerInterval);
                    timerDisplay.style.display = 'none';
                    resendOtpBtn.disabled = false;
                }
            }, 1000);
        };

        const sendOtpRequest = async (phone) => {
            toggleButtonLoading(sendOtpBtn.id, true);
            
            try {
                const res = await fetch(`${API_BASE_URL}/send-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone })
                });
                const data = await res.json();
                
                if (data.success) {
                    showAlert('login-alert', true, `OTP sent successfully to console. (Demo)`);
                    step1.style.display = 'none';
                    step2.style.display = 'block';
                    displayPhoneNum.textContent = phone;
                    startResendTimer();
                } else {
                    showAlert('login-alert', false, data.message);
                }
            } catch (err) {
                showAlert('login-alert', false, 'Server connection failed.');
            } finally {
                toggleButtonLoading(sendOtpBtn.id, false);
            }
        };

        if (sendOtpBtn) {
            sendOtpBtn.addEventListener('click', () => {
                const phone = phoneInput.value.trim();
                const phoneRegex = /^[0-9]{10}$/;
                
                if (!phoneRegex.test(phone)) {
                    return showAlert('login-alert', false, 'Enter a valid 10-digit mobile number.');
                }
                sendOtpRequest(phone);
            });
        }

        if (editPhoneBtn) {
            editPhoneBtn.addEventListener('click', () => {
                step2.style.display = 'none';
                step1.style.display = 'block';
                document.getElementById('login-alert').style.display = 'none';
                clearInterval(resendTimerInterval);
            });
        }

        if (resendOtpBtn) {
            resendOtpBtn.addEventListener('click', () => {
                sendOtpRequest(phoneInput.value.trim());
            });
        }

        if (verifyOtpBtn) {
            verifyOtpBtn.addEventListener('click', async () => {
                const phone = phoneInput.value.trim();
                const otp = otpInput.value.trim();

                if (otp.length !== 6) {
                    return showAlert('login-alert', false, 'Enter valid 6-digit OTP.');
                }

                toggleButtonLoading(verifyOtpBtn.id, true);
                
                try {
                    const res = await fetch(`${API_BASE_URL}/verify-otp`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone, otp })
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                        localStorage.setItem('cart_token', data.data.token);
                        localStorage.setItem('cart_user', JSON.stringify(data.data.user));
                        showAlert('login-alert', true, 'Verification successful! Redirecting...');
                        setTimeout(() => window.location.href = 'index.html', 1500);
                    } else {
                        showAlert('login-alert', false, data.message);
                    }
                } catch (err) {
                    showAlert('login-alert', false, 'Verification failed. Try again.');
                } finally {
                    toggleButtonLoading(verifyOtpBtn.id, false);
                }
            });
        }
    }

    // 3. Signup Flow
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullName = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const phone = document.getElementById('signup-phone').value.trim();
            const password = document.getElementById('signup-password').value;
            const confirmPass = document.getElementById('signup-confirm-password').value;
            const termsChecked = document.getElementById('terms-check').checked;

            if (password !== confirmPass) {
                return showAlert('signup-alert', false, 'Passwords do not match.');
            }
            if (password.length < 6) {
                return showAlert('signup-alert', false, 'Password must be at least 6 characters.');
            }
            if (!/^[0-9]{10}$/.test(phone)) {
                return showAlert('signup-alert', false, 'Enter a valid 10-digit phone number.');
            }
            if (!termsChecked) {
                return showAlert('signup-alert', false, 'You must agree to the Terms & Conditions.');
            }

            toggleButtonLoading('signup-submit-btn', true);

            try {
                const res = await fetch(`${API_BASE_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullName, email, phone, password })
                });
                
                const data = await res.json();
                
                if (data.success) {
                    showAlert('signup-alert', true, data.message);
                    // Redirect to verification UI
                    setTimeout(() => window.location.href = 'verify.html', 3000);
                } else {
                    showAlert('signup-alert', false, data.message);
                }
            } catch (err) {
                showAlert('signup-alert', false, 'Registration failed. Server unreachable.');
            } finally {
                toggleButtonLoading('signup-submit-btn', false);
            }
        });
    }

    // 4. Forgot Password Flow
    const forgotForm = document.getElementById('forgot-password-form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value.trim();
            
            if (!email) return showAlert('forgot-alert', false, 'Please enter your email.');
            
            toggleButtonLoading('reset-btn', true);
            
            // Mock API Call
            setTimeout(() => {
                showAlert('forgot-alert', true, 'A password reset link has been sent to your email.');
                document.getElementById('forgot-email').value = '';
                toggleButtonLoading('reset-btn', false);
            }, 1500);
        });
    }

    // 5. Verify Resend Flow
    const resendVerificationBtn = document.getElementById('resend-verification-btn');
    if (resendVerificationBtn) {
        resendVerificationBtn.addEventListener('click', () => {
            const originalHTML = resendVerificationBtn.innerHTML;
            resendVerificationBtn.innerHTML = 'Sending...';
            resendVerificationBtn.disabled = true;

            setTimeout(() => {
                showAlert('verify-alert', true, 'A new verification link has been sent to your email. Check your inbox (or console in demo).');
                resendVerificationBtn.innerHTML = originalHTML;
                resendVerificationBtn.disabled = false;
            }, 1000);
        });
    }
});
