// darkMode.js

function setTheme(mode) {
    localStorage.setItem('wknd_theme', mode);
    applyTheme();
}

function applyTheme() {
    const savedMode = localStorage.getItem('wknd_theme') || 'system';
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedMode === 'dark' || (savedMode === 'system' && systemDark);

    const root = document.documentElement;
    const existingStyle = document.getElementById('dark-mode-style');

    // --- THIS IS THE FIX YOU WERE MISSING ---
    // This adds the class="dark" to the <body> so your name becomes white!
    document.body.classList.toggle('dark', shouldBeDark); 

    if (shouldBeDark) {
        root.style.setProperty('--bg', '#0f172a'); 

        if (!existingStyle) {
            const style = document.createElement('style');
            style.id = 'dark-mode-style';
            style.innerHTML = `
                body { color: #f1f5f9 !important; }
                .card, .filter-section, .table-wrap, .modal-content, .input-stack {
                    background-color: #1e293b !important;
                    border-color: #334155 !important;
                    color: #f1f5f9 !important;
                }
                nav {
                    background: rgba(15, 23, 42, 0.85) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
                }
                .nav-links span { color: #94a3b8 !important; }
                .nav-links span.active {
                    background-color: #f1f5f9 !important;
                    color: #0f172a !important;
                }
                
                /* Make sure all Net Totals are visible */
                #total-net, #loyverse-display, #loyverse-net-display { color: #ffffff !important; }
                #daily-net, .val { color: #4ade80 !important; }
                
                input, select {
                    background-color: #334155 !important;
                    color: #ffffff !important;
                    border: 1px solid #475569 !important;
                }
                
                /* Modal Background Fix */
                #m-body { background-color: #0f172a !important; color: #f1f5f9 !important; }
                
                /* Ensure Adaptive Name is White in Dark Mode (Backup Force) */
                .adaptive-name { color: #ffffff !important; }
            `;
            document.head.appendChild(style);
        }
    } else {
        root.style.removeProperty('--bg');
        if (existingStyle) existingStyle.remove();
    }
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('wknd_theme') === 'system' || !localStorage.getItem('wknd_theme')) {
        applyTheme();
    }
});

document.addEventListener('DOMContentLoaded', applyTheme);