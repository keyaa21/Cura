document.addEventListener('DOMContentLoaded', () => {

    const authForm = document.getElementById('auth-form');
    const toggleBtn = document.getElementById('toggle-btn');
    const nameField = document.getElementById('name-field');
    const formTitle = document.getElementById('form-title');
    const formSubtitle = document.getElementById('form-subtitle');
    const submitBtn = document.getElementById('submit-btn');

    let isSignInMode = true;

    // Toggle between Sign In and Sign Up modes
    toggleBtn.addEventListener('click', () => {
        isSignInMode = !isSignInMode;

        nameField.classList.toggle('hidden', isSignInMode);
        formTitle.textContent = isSignInMode ? 'Sign In' : 'Create Account';
        formSubtitle.textContent = isSignInMode
            ? 'Enter your credentials to enter the portal'
            : 'Register as a new patient';
        submitBtn.textContent = isSignInMode ? 'Sign In' : 'Register';
        toggleBtn.textContent = isSignInMode ? 'Sign Up' : 'Sign In';
    });

    // Form Submission Logic
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('user-email').value;
        const password = document.getElementById('user-password').value;
        const fullName = document.getElementById('user-name').value;

        const endpoint = isSignInMode ? '/api/auth/login' : '/api/auth/register';
        const payload = isSignInMode
            ? { email, password }
            : { name: fullName, email, password, role: 'PATIENT' };

        try {
            const response = await fetch(`http://localhost:8080${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                alert(`Authentication Successful! Role: ${data.role || 'PATIENT'}`);
            } else {
                alert('Authentication failed. Check your email and password.');
            }
        } catch (err) {
            console.error(err);
            alert('Server connection error. Ensure Spring Boot is running.');
        }
    });
});