// darkMode.js
const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

function handleThemeChange(e) {
    const root = document.documentElement;
    const existingStyle = document.getElementById('dark-mode-style');

    if (e.matches) {
        // --- DARK MODE ON ---
        root.style.setProperty('--bg', '#0f172a'); 

        if (!existingStyle) {
            const style = document.createElement('style');
            style.id = 'dark-mode-style';
            style.innerHTML = `
                /* 1. Global Body */
                body { color: #f1f5f9 !important; }

                /* 2. Containers */
                .card, .filter-section, .table-wrap, .modal-content, .input-stack {
                    background-color: #1e293b !important;
                    border-color: #334155 !important;
                    color: #f1f5f9 !important;
                }

                /* 3. FROSTED MENU BAR */
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

                /* 4. WHITE NUMBERS (Overall Balance & Loyverse Only) */
                #total-net, 
                #loyverse-display,
                #rep-cards .card:first-child .net-total,
                #rep-cards .card:nth-child(3) div:not(h2) { 
                    color: #ffffff !important; 
                }

                /* 5. GREEN NUMBERS (Shift Net & Channels) */
                #daily-net,
                .val,
                table td:nth-child(4),
                #rep-cards .card:nth-child(2) .net-total {
                    color: #4ade80 !important;
                }

                /* 6. General Text */
                .channel-row span, label, h1, h3, p, table td {
                    color: #f1f5f9 !important;
                }

                /* 7. Sub-text (Light Gray) */
                h2, th, small { color: #94a3b8 !important; }
                
                /* 8. Inputs */
                input, select {
                    background-color: #334155 !important;
                    color: #ffffff !important;
                    border: 1px solid #475569 !important;
                }

                /* 9. Table & Modal */
                th { background-color: #0f172a !important; border-bottom: 1px solid #334155 !important; }
                td { border-top: 1px solid #334155 !important; }
                #m-body { background-color: #0f172a !important; color: #f1f5f9 !important; }

                /* 10. PERIOD EXPENSE EXCLUSION (Stay Red) */
                #rep-cards .card:nth-child(4) .net-total,
                #rep-cards .card:nth-child(4) div {
                    color: #ff6b6b !important;
                }
            `;
            document.head.appendChild(style);
        }

    } else {
        // --- LIGHT MODE (RESET) ---
        root.style.removeProperty('--bg');
        if (existingStyle) existingStyle.remove();
    }
}

// Listen for system changes
darkModeMediaQuery.addEventListener('change', handleThemeChange);

// Run check on load
document.addEventListener('DOMContentLoaded', () => {
    handleThemeChange(darkModeMediaQuery);
});