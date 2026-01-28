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

    // 1. Toggle the body class (Crucial for text colors)
    document.body.classList.toggle('dark', shouldBeDark);

    if (shouldBeDark) {
        // --- DARK MODE ACTIVE ---
        root.style.setProperty('--bg', '#0f172a'); 

        if (!existingStyle) {
            const style = document.createElement('style');
            style.id = 'dark-mode-style';
            style.innerHTML = `
                /* 1. Global Text */
                body { color: #f1f5f9 !important; }

                /* 2. Containers */
                .card, .filter-section, .table-wrap, .modal-content, .input-stack {
                    background-color: #1e293b !important;
                    border-color: #334155 !important;
                    color: #f1f5f9 !important;
                }

                /* 3. Navigation Bar */
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

                /* 4. BIG WHITE NUMBERS (The Fix) */
                /* Dashboard: Total Balance */
                #total-net, 
                /* Dashboard: Loyverse Input Card */
                #loyverse-display,
                /* Dashboard: Loyverse Side Card */
                #loyverse-net-display,
                /* Reports: Overall Balance Card (1st) */
                #rep-cards .card:first-child .net-total,
                /* Reports: Loyverse Profit Card (3rd) */
                #rep-cards .card:nth-child(3) .net-total { 
                    color: #ffffff !important; 
                }

                /* 5. GREEN NUMBERS (Shift Net & Channels) */
                #daily-net,
                .val,
                table td:nth-child(4), /* 'Out' column in table */
                #rep-cards .card:nth-child(2) .net-total {
                    color: #4ade80 !important;
                }

                /* 6. General Elements */
                .channel-row span, label, h1, h3, p, table td {
                    color: #f1f5f9 !important;
                }

                /* 7. Muted Text */
                h2, th, small { color: #94a3b8 !important; }
                
                /* 8. Form Inputs */
                input, select, textarea {
                    background-color: #334155 !important;
                    color: #ffffff !important;
                    border: 1px solid #475569 !important;
                }

                /* 9. Tables & Modals */
                th { background-color: #0f172a !important; border-bottom: 1px solid #334155 !important; }
                td { border-top: 1px solid #334155 !important; }
                #m-body { background-color: #0f172a !important; color: #f1f5f9 !important; }

                /* 10. EXPENSE NUMBERS (Stay Red) */
                #rep-cards .card:nth-child(4) .net-total {
                    color: #ff6b6b !important;
                }
                
                /* 11. ADAPTIVE NAMES */
                .adaptive-name { color: #ffffff !important; }
            `;
            document.head.appendChild(style);
        }
    } else {
        // --- LIGHT MODE (RESET) ---
        root.style.removeProperty('--bg');
        if (existingStyle) existingStyle.remove();
    }
}

// Watch for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('wknd_theme') === 'system' || !localStorage.getItem('wknd_theme')) {
        applyTheme();
    }
});

// Init on load
document.addEventListener('DOMContentLoaded', applyTheme);