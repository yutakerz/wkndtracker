// menu.js

function openMenu() {
    const menu = document.getElementById('menu-modal');
    if(menu) {
        menu.style.display = 'flex';
        // Sync the selector with current state when opening
        const currentMode = localStorage.getItem('wknd_theme') || 'system';
        document.getElementById('theme-selector').value = currentMode;
    }
}

function closeMenu() {
    const menu = document.getElementById('menu-modal');
    if(menu) menu.style.display = 'none';
}

// Close menu if clicking outside the box
window.addEventListener('click', function(e) {
    const menu = document.getElementById('menu-modal');
    if (e.target === menu) {
        closeMenu();
    }
});