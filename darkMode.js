// darkMode.js

// 1. Theme Logic
function setTheme(mode) {
    localStorage.setItem('wknd_theme', mode);
    applyTheme();
}

function applyTheme() {
    // Default to 'light' so users aren't shocked by dark mode on first visit
    const mode = localStorage.getItem('wknd_theme') || 'light'; 
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Logic: Dark mode only activates if user chose 'dark' OR 'system' is dark
    const isDark = mode === 'dark' || (mode === 'system' && systemDark);
    
    const selector = document.getElementById('theme-selector');
    if(selector) selector.value = mode;

    const root = document.documentElement;
    const existingStyle = document.getElementById('dark-mode-style');

    if (isDark) {
        // --- DARK MODE ON ---
        root.style.setProperty('--bg', '#0f172a'); 

        if (!existingStyle) {
            const style = document.createElement('style');
            style.id = 'dark-mode-style';
            style.innerHTML = `
                /* GLOBAL TEXT */
                body { color: #f1f5f9 !important; }

                /* CONTAINERS */
                .card, .filter-section, .table-wrap, .modal-content, .input-stack, #menu-modal .modal-content {
                    background-color: #1e293b !important;
                    border-color: #334155 !important;
                    color: #f1f5f9 !important;
                }

                /* FROSTED NAV */
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

                /* WHITE NUMBERS (Big Balances) */
                #total-net, #loyverse-display,
                #rep-cards .card:first-child .net-total,
                #rep-cards .card:nth-child(3) div:not(h2) { 
                    color: #ffffff !important; 
                }

                /* GREEN NUMBERS */
                #daily-net, .val, table td:nth-child(4),
                #rep-cards .card:nth-child(2) .net-total {
                    color: #4ade80 !important;
                }

                /* TEXT & INPUTS */
                .channel-row span, label, h1, h3, p, table td { color: #f1f5f9 !important; }
                h2, th, small { color: #94a3b8 !important; }
                
                input, select {
                    background-color: #334155 !important;
                    color: #ffffff !important;
                    border: 1px solid #475569 !important;
                }

                /* TABLES & MODALS */
                th { background-color: #0f172a !important; border-bottom: 1px solid #334155 !important; }
                td { border-top: 1px solid #334155 !important; }
                #m-body { background-color: #0f172a !important; color: #f1f5f9 !important; }

                /* EXCEPTIONS */
                #rep-cards .card:nth-child(4) .net-total,
                #rep-cards .card:nth-child(4) div { color: #ff6b6b !important; }
            `;
            document.head.appendChild(style);
        }
    } else {
        // --- LIGHT MODE ---
        root.style.removeProperty('--bg');
        if (existingStyle) existingStyle.remove();
    }
}

// Listen for system changes (only affects 'system' mode)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('wknd_theme') === 'system') applyTheme();
});

// Init
document.addEventListener('DOMContentLoaded', applyTheme);