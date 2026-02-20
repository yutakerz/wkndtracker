// OneSignal Initialization
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
        appId: "ba0d22f1-127b-468c-9647-877e80574443",
    });
    console.log("OneSignal Initialized");
});

// --- PRIVACY: LIST OF EMAILS ALLOWED TO SEE EVERYTHING ---
const PRIVILEGED_EMAILS = [
    "suicoannaly@gmail.com",
    "cyrilbolico23@gmail.com",
    "kentgabitoya17@gmail.com",
    "onlymrsarmiento@gmail.com"
];

// Main App Logic
const S_URL = "https://jhoftcoroyjusugewowb.supabase.co"; 
const S_KEY = "sb_publishable_VzAlTOn_of3qNk4KWcK77A_Gj1dyBU7";
const _supabase = supabase.createClient(S_URL, S_KEY);

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/OneSignalSDKWorker.js')
    .then(() => console.log('PWA: Notification Worker Active'))
    .catch(err => console.error('Worker Error:', err));
}

async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            OneSignalDeferred.push(async function(OneSignal) {
                await OneSignal.Notifications.requestPermission();
                notify("Notifications Enabled!", "🔔");
            });
        } else {
            notify("Permission Denied", "🚫");
        }
    } catch (err) {
        console.error("Setup Error:", err);
        notify("Setup Failed", "❌");
    }
}

const KEY = "admin";
let loggedInUser = null;
let db = { chans: {Cash:0, GCash:0, Maya:0, BPI:0, Others:0}, logs: [], pos: localStorage.getItem('wknd_pos') || 0 };
let currentReportType = 'weekly';
let tempPhotos = [];
let currentSlot = 0;
let currentTypeContext = 'REVENUE';

let lbPhotos = [];
let lbIndex = 0;
let touchStartX = 0;

async function getPSTTime() {
    try {
        const response = await fetch('https://worldtimeapi.org/api/timezone/Asia/Manila');
        const data = await response.json();
        return new Date(data.datetime);
    } catch (e) {
        const d = new Date();
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        return new Date(utc + (3600000 * 8));
    }
}

function getShiftDate(dateObj) {
    const hour = dateObj.getHours();
    const date = new Date(dateObj);
    if (hour < 8) { date.setDate(date.getDate() - 1); }
    return date.toISOString().split('T')[0];
}

async function loginWithGoogle() {
    const { error } = await _supabase.auth.signInWithOAuth({ 
        provider: 'google', 
        options: { redirectTo: window.location.origin } 
    });
    if (error) {
        if (error.message.includes("authorized")) notify("You are not authorized!", "🚫");
        else notify("Login Failed: " + error.message, "❌");
    }
}

async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        loggedInUser = user;
        // 2. ADD THIS INSIDE checkUser(), right after 'loggedInUser = user;'
        if (!PRIVILEGED_EMAILS.includes(user.email)) {
            // Hide Overall Balance Card
            const balanceCard = document.querySelector('#dashboard .side-col .card.dark-card');
            if (balanceCard) balanceCard.style.display = 'none';

            // Hide Report Navigation Links (Day, Week, Month)
            // Nav Indices: 0=Home, 1=Day, 2=Week, 3=Month, 4=Menu
            const navLinks = document.querySelectorAll('.nav-links span');
            if (navLinks.length >= 4) {
                navLinks[1].style.display = 'none'; // Day
                navLinks[2].style.display = 'none'; // Week
                navLinks[3].style.display = 'none'; // Month
            }
            
            // Optional: Adjust nav width so it doesn't look empty
            const nav = document.querySelector('nav');
            if(nav) nav.style.minWidth = 'auto';
        }
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        OneSignalDeferred.push(function(OneSignal) {
            OneSignal.User.addTag("email", user.email);
        });
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('main-nav').style.display = 'flex';
        document.getElementById('app-content').style.display = 'block';
        await fetchCloudData();
        setupRealtime();
    } else {
        document.getElementById('splash').style.display = 'none';
    }
}

function setupRealtime() {
    _supabase.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => { fetchCloudData(); }).subscribe();
}

async function logout() { 
    document.getElementById('splash').style.display = 'flex';
    document.getElementById('splash-text').style.display = 'block';
    await _supabase.auth.signOut(); 
    location.reload(); 
}

async function fetchCloudData() {
    const { data, error } = await _supabase.from('transactions').select('*').order('id', { ascending: false });
    if (!error && data) {
        db.logs = data;
        db.chans = { Cash: 0, GCash: 0, Maya: 0, BPI: 0, Others: 0 };
        data.forEach(l => { 
            const val = parseFloat(l.amt || l.amount) || 0;
            const type = (l.type || "").trim().toUpperCase();
            const chan = (l.chan || "").trim();
            const desc = (l.desc || "");

            if (type === "REVENUE") { if (db.chans.hasOwnProperty(chan)) db.chans[chan] += val; }
            else if (type === "EXPENSE") { if (db.chans.hasOwnProperty(chan)) db.chans[chan] -= val; }
            else if (type === "TRANSFER") {
                const parts = desc.split(' to ');
                if (db.chans.hasOwnProperty(chan)) db.chans[chan] -= val;
                if (db.chans.hasOwnProperty(parts[1])) db.chans[parts[1]] += val;
            }
        });
        await sync();
        document.getElementById('splash').style.display = 'none';
    } else {
        document.getElementById('splash').style.display = 'none';
    }
}

async function updateLoyverse() {
    const amt = parseFloat(document.getElementById('loyverse-input').value);
    const chan = document.getElementById('loyverse-channel').value; 

    if(!amt && amt !== 0) return notify("Enter amount", "⚠️");

    document.getElementById('m-title').innerText = "Confirm Loyverse Update";
    document.getElementById('m-body').innerHTML = `<b>New Total:</b> ₱${amt.toLocaleString()}<br><b>Channel:</b> ${chan}<br><b>User:</b> ${loggedInUser.user_metadata.full_name}`;
    document.getElementById('m-imgs').innerHTML = ''; 
    document.getElementById('modal').style.display = 'flex';

    document.getElementById('m-confirm').onclick = async () => {
        const mConfirm = document.getElementById('m-confirm');
        const oldTxt = mConfirm.innerText; 
        mConfirm.innerText = "Processing..."; 
        mConfirm.disabled = true;

        const pstNow = await getPSTTime();
        const entry = { 
            type: 'POS_REF', 
            amt, 
            chan: chan, 
            desc: 'Loyverse (Shift Profit) Update', 
            staff: loggedInUser.user_metadata.full_name, 
            auth_user: loggedInUser.email, 
            google_name: loggedInUser.user_metadata.full_name, 
            time: pstNow.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}), 
            date: pstNow.toLocaleDateString(), 
            isoDate: getShiftDate(pstNow) 
        };

        const { error } = await _supabase.from('transactions').insert([entry]);
        
        mConfirm.innerText = oldTxt; 
        mConfirm.disabled = false;

        if (!error) { 
            closeModal();
            document.getElementById('loyverse-input').value = ''; 
            notify("Saved!"); 
            fetchCloudData(); 
        } else {
            notify("Error Saving", "❌");
        }
    };
}

async function sync() {
    const pst = await getPSTTime();
    let sStart = new Date(pst); let sEnd = new Date(pst);
    if (pst.getHours() < 8) { 
        sStart.setDate(sStart.getDate() - 1); sStart.setHours(8, 0, 0, 0); 
        sEnd.setHours(7, 59, 59, 999); 
    } else { 
        sStart.setHours(8, 0, 0, 0); sEnd.setDate(sEnd.getDate() + 1); 
        sEnd.setHours(7, 59, 59, 999); 
    }

    let tr = 0, te = 0;
    db.logs.forEach(l => {
        const v = parseFloat(l.amt) || 0; const t = (l.type || "").toUpperCase();
        if (t === "REVENUE") tr += v; if (t === "EXPENSE") te += v;
    });

    // Safety check for Overall Stats
    const overall = document.getElementById('channel-stats-overall'); 
    if (overall) {
        overall.innerHTML = '';
        for (let [k, v] of Object.entries(db.chans)) { 
            if (k !== 'Others') overall.innerHTML += `<div class="channel-row"><span>${k}</span><span class="val">₱${v.toLocaleString()}</span></div>`; 
        }
    }

    const shift = db.logs.filter(l => { const d = new Date(l.date + " " + l.time); return d >= sStart && d <= sEnd; });
    let dRev = 0, dPos = 0;
    let cT = { Cash: 0, GCash: 0, Maya: 0, BPI: 0 };
    let cTLoy = { Cash: 0, GCash: 0, Maya: 0, BPI: 0 };

    shift.forEach(l => {
        const v = parseFloat(l.amt) || 0; const t = (l.type || "").toUpperCase(); const c = (l.chan || "").trim();
        if (t === "REVENUE") { dRev += v; if (cT.hasOwnProperty(c)) cT[c] += v; }
        if (t === "POS_REF") { dPos += v; if (cTLoy.hasOwnProperty(c)) cTLoy[c] += v; }
    });

    // Render Daily Breakdown
    const dailyD = document.getElementById('channel-stats-daily'); 
    if (dailyD) {
        dailyD.innerHTML = '';
        Object.entries(cT).forEach(([k, v]) => dailyD.innerHTML += `<div class="channel-row"><span>${k}</span><span class="val">₱${v.toLocaleString()}</span></div>`);
    }

    // Render Loyverse Breakdown
    const loyD = document.getElementById('channel-stats-loyverse-net'); 
    if (loyD) {
        loyD.innerHTML = '';
        Object.entries(cTLoy).forEach(([k, v]) => loyD.innerHTML += `<div class="channel-row"><span>${k}</span><span class="val">₱${v.toLocaleString()}</span></div>`);
    }

    // Safety set innerText for all displays
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    
    setTxt('total-net', "₱" + (tr - te).toLocaleString());
    setTxt('total-rev', "₱" + tr.toLocaleString());
    setTxt('total-exp', "₱" + te.toLocaleString());
    setTxt('daily-net', "₱" + dRev.toLocaleString());
    setTxt('loyverse-display', "₱" + dPos.toLocaleString());
    setTxt('loyverse-net-display', "₱" + dPos.toLocaleString());

    const log = document.getElementById('log-list'); 
    if (log) {
        log.innerHTML = '';
        if (shift.length === 0) log.innerHTML = `<div style="text-align:center; padding:15px; color:#94a3b8; font-size:0.75rem;">No transactions this shift</div>`;
        else {
            shift.forEach(l => {
                const v = parseFloat(l.amt) || 0; const t = (l.type || "").toUpperCase();
                let ch = t === "POS_REF" ? "L" : t[0];
                let sub = `${l.date} | ${l.time}`;
                if (t !== "TRANSFER") sub += ` | <b style="color:var(--primary)">${l.chan}</b>`;
                sub += ` | ${l.google_name || 'System'}`;
                log.innerHTML += `<div class="channel-row" style="border-bottom:1px solid #f1f5f9; padding:8px 0;"><div><b>${ch}</b> ${l.desc}<br><small style="color:#94a3b8">${sub}</small></div><div style="text-align:right"><b>₱${v.toLocaleString()}</b></div></div>`;
            });
        }
    }
    if (document.getElementById('report') && document.getElementById('report').classList.contains('active')) buildReport();
}

async function confirmTransfer() {
    const from = document.getElementById('tf-from').value;
    const to = document.getElementById('tf-to').value;
    const amt = parseFloat(document.getElementById('tf-amt').value);
    if(!amt || from === to) return notify("Invalid Transfer", "⚠️");
    const pstNow = await getPSTTime();
    document.getElementById('m-title').innerText = "Confirm Transfer";
    document.getElementById('m-body').innerHTML = `<b>Amt:</b> ₱${amt.toLocaleString()}<br><b>From:</b> ${from}<br><b>To:</b> ${to}`;
    document.getElementById('m-imgs').innerHTML = '';
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('m-confirm').onclick = async () => {
        const mConfirm = document.getElementById('m-confirm');
        const oldTxt = mConfirm.innerText; mConfirm.innerText = "Processing..."; mConfirm.disabled = true;
        const entry = { type: 'TRANSFER', amt, chan: from, desc: `Transfer from ${from} to ${to}`, staff: loggedInUser.user_metadata.full_name, auth_user: loggedInUser.email, google_name: loggedInUser.user_metadata.full_name, time: pstNow.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}), date: pstNow.toLocaleDateString(), isoDate: getShiftDate(pstNow) };
        const { error } = await _supabase.from('transactions').insert([entry]);
        mConfirm.innerText = oldTxt; mConfirm.disabled = false;
        if (!error) { 
            closeModal(); 
            notify("Saved!"); 
            document.getElementById('tf-amt').value=''; 
            fetchCloudData(); 
        }
        else notify("Error Saving", "❌");
    };
}

async function confirmEntry(type) {
    let amtInput = document.getElementById(type === 'REVENUE' ? 'rev-amt' : 'exp-amt').value;
    let amt = parseFloat(amtInput) || 0;
    let staffInput = document.getElementById(type === 'REVENUE' ? 'rev-staff' : 'exp-staff').value;
    let chan = document.getElementById(type === 'REVENUE' ? 'rev-channel' : 'exp-channel').value;
    let desc = type === 'REVENUE' ? "Daily Sales Inflow" : document.getElementById('exp-desc').value;
    if(type === 'EXPENSE' && !amtInput) return notify("Fill all fields!", "⚠️");
    if(!staffInput) return notify("Name is required!", "⚠️");
    const pstNow = await getPSTTime();
    document.getElementById('m-title').innerText = "Confirm " + type;
    document.getElementById('m-body').innerHTML = `<b>Amt:</b> ₱${amt.toLocaleString()}<br><b>Staff:</b> ${staffInput}<br><b>Channel:</b> ${chan}<br>${type === 'EXPENSE' ? `<b>Details:</b> ${desc}` : ''}`;
    
    const imgContainer = document.getElementById('m-imgs'); imgContainer.innerHTML = '';
    tempPhotos.forEach(p => { if(p) imgContainer.innerHTML += `<img src="${p}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;">`; });
    
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('m-confirm').onclick = async () => {
        const mConfirm = document.getElementById('m-confirm');
        const oldTxt = mConfirm.innerText; mConfirm.innerText = "Processing..."; mConfirm.disabled = true;
        notify("Syncing...", "⏳");
        let urls = []; for(let p of tempPhotos) { if(p) { const url = await uploadPhoto(p); if(url) urls.push(url); } }
        const entry = { type: type.toUpperCase(), amt, chan, desc, staff: staffInput, auth_user: loggedInUser.email, google_name: loggedInUser.user_metadata.full_name, photos: urls, time: pstNow.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}), date: pstNow.toLocaleDateString(), isoDate: getShiftDate(pstNow) };
        const { error } = await _supabase.from('transactions').insert([entry]);
        mConfirm.innerText = oldTxt; mConfirm.disabled = false;
        if (!error) { 
            closeModal(); 
            notify("Saved!"); 
            clearForm(); 
            fetchCloudData(); 
        }
        else notify("Error Saving", "❌");
    };
}

async function uploadPhoto(base64) {
    try {
        const blob = await (await fetch(base64)).blob();
        const fileName = `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const { error } = await _supabase.storage.from('receipts').upload(`public/${fileName}`, blob, { contentType: 'image/jpeg' });
        if (error) throw error;
        return _supabase.storage.from('receipts').getPublicUrl(`public/${fileName}`).data.publicUrl;
    } catch (e) { return null; }
}

function handleTouchStart(e) { touchStartX = e.changedTouches[0].screenX; }
function handleTouchEnd(e) {
    let touchEndX = e.changedTouches[0].screenX;
    if (touchEndX < touchStartX - 50) navLightbox(1);
    if (touchEndX > touchStartX + 50) navLightbox(-1);
}
function openLightbox(urls, index) { lbPhotos = urls; lbIndex = index; document.getElementById('lightbox').style.display = 'flex'; updateLightboxImage(); }
function updateLightboxImage() { document.getElementById('lightbox-img').src = lbPhotos[lbIndex]; }
function navLightbox(dir) { lbIndex += dir; if(lbIndex < 0) lbIndex = lbPhotos.length - 1; if(lbIndex >= lbPhotos.length) lbIndex = 0; updateLightboxImage(); }
function closeLightbox() { document.getElementById('lightbox').style.display = 'none'; }

function switchView(id, el) {
    const container = document.querySelector('.container'); container.style.opacity = '0'; container.style.transform = 'translateY(15px)';
    setTimeout(() => {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-links span').forEach(s => s.classList.remove('active'));
        const target = id === 'dashboard' ? 'dashboard' : (id === 'leaves' ? 'leaves' : 'report');
        document.getElementById(target).classList.add('active'); 
        if(el) el.classList.add('active'); // 'el' check added in case called programmatically
        
        if(id !== 'dashboard' && id !== 'leaves') { 
            currentReportType = id.toLowerCase(); 
            setupFilterUI(currentReportType); 
        }
        
        // SCROLL TO TOP FIX (Since container now handles scroll)
        container.scrollTop = 0;

        container.style.opacity = '1'; container.style.transform = 'translateY(0)';
    }, 300);
}

function clickInput(slot, type) { currentSlot = slot; currentTypeContext = type; document.getElementById('photo-input').click(); }
function handlePhoto(input) {
    if(!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        tempPhotos[currentSlot] = e.target.result;
        const prefix = currentTypeContext === 'REVENUE' ? 'rev' : 'exp';
        const slotEl = document.getElementById(`${prefix}-slot-${currentSlot}`);
        slotEl.innerHTML = `<img src="${e.target.result}">`;
        slotEl.classList.add('has-img');
    };
    reader.readAsDataURL(input.files[0]);
}

async function setupFilterUI(type) {
    const dIn = document.getElementById('filter-date'); 
    const mIn = document.getElementById('filter-month'); 
    const weekContainer = document.getElementById('week-range-container');
    const searchContainer = document.getElementById('search-container'); // NEW

    const pstNow = await getPSTTime();
    const todayPST = pstNow.toISOString().split('T')[0];

    // 1. Hide everything by default
    dIn.style.display = "none"; 
    mIn.style.display = "none";
    weekContainer.style.display = "none";
    searchContainer.style.display = "none"; // Hide search box
    
    // 2. Clear any existing search to keep the UI clean when switching tabs
    document.getElementById('report-search').value = '';
    document.getElementById('rep-cards').style.display = 'grid';

    let labelText = "Daily Transaction";
    
    if(type === 'monthly') { 
        labelText = "Monthly Transaction"; 
        mIn.style.display = "block"; 
        mIn.value = todayPST.substring(0,7); 
    } 
    else if (type === 'weekly') { 
        labelText = "Weekly Transaction"; 
        weekContainer.style.display = "flex"; 
    }
    else { 
        // THIS IS THE DAILY SECTION
        labelText = "Daily Transaction";
        dIn.style.display = "block"; 
        dIn.value = todayPST;
        
        // ONLY SHOW SEARCH HERE
        searchContainer.style.display = "block"; 
    }
    
    document.getElementById('table-label').innerText = labelText; 
    buildReport();
}

async function globalSearch() {
    const keyword = document.getElementById('report-search').value.toLowerCase();
    const table = document.getElementById('main-table');
    const cards = document.getElementById('rep-cards');

    // If search is empty, go back to the normal report view
    if (!keyword) {
        cards.style.display = "grid";
        buildReport();
        return;
    }

    // Hide the summary cards during search to focus on table results
    cards.style.display = "none";
    document.getElementById('table-label').innerText = `Search Results for: "${keyword}"`;

    let bodyHtml = "";
    const isPrivileged = PRIVILEGED_EMAILS.includes(loggedInUser.email);

    // Filter through EVERY log in the database
    const results = db.logs.filter(l => {
        // 1. Privacy Check: Employees only search their own records
        const creator = l.auth_user || l.email;
        if (!isPrivileged && creator !== loggedInUser.email) return false;

        // 2. Keyword Check: Look in Staff, Description, Channel, and Date
        const searchString = `${l.staff} ${l.desc} ${l.chan} ${l.date} ${l.type} ${l.google_name}`.toLowerCase();
        return searchString.includes(keyword);
    });

    // Render the search results in the Daily format (detailed)
    results.forEach(l => {
        const val = parseFloat(l.amt || l.amount) || 0; 
        const t = (l.type || "").trim().toUpperCase();
        
        // Handle photo lightboxes
        let photoHtml = ''; 
        if(l.photos && Array.isArray(l.photos)) { 
            const photosJson = JSON.stringify(l.photos).replace(/"/g, '&quot;'); 
            l.photos.forEach((p, idx) => { 
                if(p) photoHtml += `<img src="${p}" style="width:30px;height:30px;object-fit:cover;margin-right:2px;border-radius:3px;border:1px solid #ddd;cursor:pointer;" onclick="openLightbox(${photosJson}, ${idx})">`; 
            }); 
        }

        const inAmt = (t === "REVENUE" || t === "TRANSFER") ? '₱'+val.toLocaleString() : '-';
        const outAmt = (t === "EXPENSE" || t === "TRANSFER" || t === "POS_REF") ? '₱'+val.toLocaleString() : '-';
        const typeLabel = t === 'POS_REF' ? 'L' : (t === 'REVENUE' ? 'R' : (t === 'EXPENSE' ? 'E' : 'T'));

        bodyHtml += `<tr><td>${l.date}<br><small>${l.time}</small></td><td><b>${typeLabel}</b></td><td>${l.staff}</td><td><small>${l.google_name || 'System'}</small></td><td>${l.desc}</td><td>${l.chan}</td><td>${inAmt}</td><td>${outAmt}</td><td>${photoHtml}</td></tr>`;
    });

    table.innerHTML = `<thead><tr><th>Date & Time</th><th>Type</th><th>Admin</th><th>Verified User</th><th>Details</th><th>Chan</th><th>In</th><th>Out</th><th>Pics</th></tr></thead><tbody>${bodyHtml}</tbody>`;
}

function updateReportFilter() { buildReport(); }

function buildReport() {
    const table = document.getElementById('main-table'); 
    let sRev = 0, sExp = 0, tPos = 0; 
    let cumTr = 0, cumTe = 0; 
    
    const dVal = document.getElementById('filter-date').value; 
    const startVal = document.getElementById('filter-date-start').value; 
    const endVal = document.getElementById('filter-date-end').value; 
    const mVal = document.getElementById('filter-month').value;

    let shiftStart, shiftEnd;

    if (currentReportType === 'daily') {
        let selectedDate = new Date(dVal);
        const now = new Date(); 
        const isSameDay = selectedDate.toDateString() === now.toDateString();

        if (isSameDay && now.getHours() < 8) {
            selectedDate.setDate(selectedDate.getDate() - 1);
        }

        const y = selectedDate.getFullYear();
        const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const d = String(selectedDate.getDate()).padStart(2, '0');
        
        shiftStart = new Date(`${y}-${m}-${d}T08:00:00`);
        shiftEnd = new Date(shiftStart.getTime() + (24 * 60 * 60 * 1000) - 1);
    } 
    else if (currentReportType === 'weekly') {
        shiftStart = new Date(startVal);
        shiftStart.setHours(8, 0, 0, 0);
        
        shiftEnd = new Date(endVal);
        shiftEnd.setDate(shiftEnd.getDate() + 1);
        shiftEnd.setHours(7, 59, 59, 999);
    } 
    else if (currentReportType === 'monthly') {
        const [year, month] = mVal.split('-');
        shiftStart = new Date(year, month - 1, 1, 8, 0, 0);
        shiftEnd = new Date(year, month, 1, 7, 59, 59, 999);
    }

    let balanceBeforeReport = 0;
    let repChansOverall = { Cash:0, GCash:0, Maya:0, BPI:0 }; 
    let repChansShift = { Cash:0, GCash:0, Maya:0, BPI:0 }; 
    let repChansExp = { Cash:0, GCash:0, Maya:0, BPI:0 };
    
    // 1. ADDED: Container for Loyverse Channels
    let repChansLoy = { Cash:0, GCash:0, Maya:0, BPI:0 };
    
    let aggData = {}; 

    db.logs.forEach(l => {
        const val = parseFloat(l.amt || l.amount) || 0; 
        const t = (l.type || "").trim().toUpperCase(); 
        const c = (l.chan || "").trim();
        const entryTimestamp = new Date(l.date + " " + l.time);

        let rDate = new Date(entryTimestamp);
        if (rDate.getHours() < 8) {
            rDate.setDate(rDate.getDate() - 1);
        }

        const y = rDate.getFullYear();
        const m = String(rDate.getMonth() + 1).padStart(2, '0');
        const d = String(rDate.getDate()).padStart(2, '0');
        const groupDate = `${y}-${m}-${d}`;

        // CUMULATIVE CALCULATION
        if (entryTimestamp <= shiftEnd) {
            if (t === "REVENUE") {
                cumTr += val;
                if (repChansOverall.hasOwnProperty(c)) repChansOverall[c] += val;
            } else if (t === "EXPENSE") {
                cumTe += val;
                if (repChansOverall.hasOwnProperty(c)) repChansOverall[c] -= val;
            } else if (t === "TRANSFER") {
                const parts = (l.desc || "").split(' to ');
                const toChan = parts[1];
                if (repChansOverall.hasOwnProperty(c)) repChansOverall[c] -= val;
                if (repChansOverall.hasOwnProperty(toChan)) repChansOverall[toChan] += val;
            }
        }

        // PERIOD AGGREGATION
        let inRange = entryTimestamp >= shiftStart && entryTimestamp <= shiftEnd;
        if(inRange) {
            if(t === "REVENUE") { 
                sRev += val; 
                if(repChansShift.hasOwnProperty(c)) repChansShift[c] += val; 
            }
            else if (t === "EXPENSE") {
                sExp += val; 
                if(repChansExp.hasOwnProperty(c)) {
                    repChansExp[c] += val; 
                }
            }
            else if (t === "POS_REF") { 
                tPos += val;
                // 2. ADDED: Populate Loyverse Channels
                if(repChansLoy.hasOwnProperty(c)) {
                    repChansLoy[c] += val;
                }
            }

            if (currentReportType !== 'daily' && t !== 'TRANSFER') {
                if (!aggData[groupDate]) aggData[groupDate] = { date: groupDate, net: 0, sNet: 0, loy: 0, exp: 0 };
                if (t === "REVENUE") { aggData[groupDate].sNet += val; aggData[groupDate].net += val; }
                if (t === "EXPENSE") { aggData[groupDate].exp += val; aggData[groupDate].net -= val; }
                if (t === "POS_REF") { aggData[groupDate].loy += val; }
            }
        }
    });

    let currentBal = (cumTr - cumTe); 
    let tableRows = [];
    
    Object.keys(aggData).sort().reverse().forEach(dateKey => {
        let day = aggData[dateKey];
        tableRows.push({
            date: day.date,
            bal: currentBal, 
            sNet: day.sNet,
            loy: day.loy,
            exp: day.exp
        });
        currentBal -= day.net;
    });

    let loyverseLabel = currentReportType === 'daily' ? "Loyverse Profit (Today)" : (currentReportType === 'weekly' ? "Loyverse Profit (This Week)" : "Loyverse Profit (This Month)");
    let expenseLabel = currentReportType === 'daily' ? "Period Expense Daily" : (currentReportType === 'weekly' ? "Period Expense Weekly" : "Period Expense Monthly");
    let balanceLabel = "Overall Balance & Channels " + (currentReportType === 'daily' ? "(Today)" : (currentReportType === 'weekly' ? "(On this Week)" : "(On this Month)"));
    
    let overallChanHtml = ''; for(let [k,v] of Object.entries(repChansOverall)) { overallChanHtml += `<div class="channel-row"><span>${k}</span> <span class="val">₱${v.toLocaleString()}</span></div>`; }
    let shiftChanHtml = ''; for(let [k,v] of Object.entries(repChansShift)) { shiftChanHtml += `<div class="channel-row"><span>${k}</span> <span class="val">₱${v.toLocaleString()}</span></div>`; }

    let expChanHtml = ''; 
    ['Cash', 'GCash', 'Maya', 'BPI'].forEach(k => {
        const v = repChansExp[k] || 0;
        expChanHtml += `<div class="channel-row"><span>${k}</span> <span class="val">₱${v.toLocaleString()}</span></div>`;
    });

    // 3. ADDED: Generate Loyverse HTML Loop
    let loyChanHtml = ''; 
    ['Cash', 'GCash', 'Maya', 'BPI'].forEach(k => {
        const v = repChansLoy[k] || 0;
        loyChanHtml += `<div class="channel-row"><span>${k}</span> <span class="val">₱${v.toLocaleString()}</span></div>`;
    });
    
// Update the HTML generation for the cards
    document.getElementById('rep-cards').innerHTML = `
        <div class="card"><h2 style="color:#64748b">${balanceLabel}</h2><div class="net-total" style="color:#1e293b; font-size: 1.6rem;">₱${(cumTr - cumTe).toLocaleString()}</div><div style="display:flex; justify-content: space-between; font-size: 0.65rem; color:#94a3b8; margin-bottom: 8px; border-bottom:1px solid #eee; padding-bottom:8px;"><span>Rev: <b style="color:var(--success)">₱${cumTr.toLocaleString()}</b></span><span>Exp: <b style="color:var(--danger)">₱${cumTe.toLocaleString()}</b></span></div>${overallChanHtml}</div>
        <div class="card"><h2 style="color: #64748b;">Shift Net</h2><div class="net-total" style="font-size: 1.6rem; color: var(--success);">₱${sRev.toLocaleString()}</div><div style="margin-bottom: 8px; border-bottom: 1px solid #eee;"></div>${shiftChanHtml}</div>
        
        <div class="card">
            <h2 style="color: #64748b;">${loyverseLabel}</h2>
            <div class="net-total" style="font-size:1.6rem; font-weight:800; color:#1e293b;">₱${tPos.toLocaleString()}</div>
            <div style="margin-bottom: 8px; border-bottom: 1px solid #eee; margin-top: 8px;"></div>
            ${loyChanHtml}
        </div>
        
        <div class="card">
            <h2 style="color: #64748b;">${expenseLabel}</h2>
            <div class="net-total" style="font-size:1.6rem; font-weight:800; color:var(--danger);">₱${sExp.toLocaleString()}</div>
            <div style="margin-bottom: 8px; border-bottom: 1px solid #eee; margin-top: 8px;"></div>
            ${expChanHtml}
        </div>`;

    if (currentReportType === 'daily') {
        let bodyHtml = "";
        db.logs.filter(l => {
            const ts = new Date(l.date + " " + l.time);
            return ts >= shiftStart && ts <= shiftEnd;
        }).forEach(l => {
            const val = parseFloat(l.amt || l.amount) || 0; 
            const t = (l.type || "").trim().toUpperCase();
            let photoHtml = ''; 
            if(l.photos && Array.isArray(l.photos)) { 
                const photosJson = JSON.stringify(l.photos).replace(/"/g, '&quot;'); 
                l.photos.forEach((p, idx) => { if(p) photoHtml += `<img src="${p}" style="width:30px;height:30px;object-fit:cover;margin-right:2px;border-radius:3px;border:1px solid #ddd;cursor:pointer;" onclick="openLightbox(${photosJson}, ${idx})">`; }); 
            }
            const inAmt = (t === "REVENUE" || t === "TRANSFER") ? '₱'+val.toLocaleString() : '-';
            const outAmt = (t === "EXPENSE" || t === "TRANSFER" || t === "POS_REF") ? '₱'+val.toLocaleString() : '-';
            const typeLabel = t === 'POS_REF' ? 'L' : (t === 'REVENUE' ? 'R' : (t === 'EXPENSE' ? 'E' : 'T'));
            bodyHtml += `<tr><td>${l.date}<br><small>${l.time}</small></td><td><b>${typeLabel}</b></td><td>${l.staff}</td><td><small>${l.google_name || 'System'}</small></td><td>${l.desc}</td><td>${l.chan}</td><td>${inAmt}</td><td>${outAmt}</td><td>${photoHtml}</td></tr>`;
        });
        table.innerHTML = `<thead><tr><th>Date & Time</th><th>Type</th><th>Admin</th><th>Verified User</th><th>Details</th><th>Chan</th><th>In</th><th>Out</th><th>Pics</th></tr></thead><tbody>${bodyHtml}</tbody>`;
    } else {
        let bodyHtml = "";
        tableRows.forEach(row => { 
            bodyHtml += `<tr><td>${row.date}</td><td><b>₱${row.bal.toLocaleString()}</b></td><td>₱${row.sNet.toLocaleString()}</td><td>₱${row.loy.toLocaleString()}</td><td>₱${row.exp.toLocaleString()}</td></tr>`; 
        });
        table.innerHTML = `<thead><tr><th>Date</th><th>Balance Check</th><th>Shift Net</th><th>Loyverse Profit</th><th>Daily Exp</th></tr></thead><tbody>${bodyHtml}</tbody>`;
    }
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
function closePwd() { document.getElementById('pwd-modal').style.display = 'none'; document.getElementById('p-input').value=''; }
function clearForm() { 
    document.getElementById('rev-amt').value=''; document.getElementById('exp-amt').value=''; document.getElementById('exp-desc').value='';
    document.getElementById('rev-staff').value=''; document.getElementById('exp-staff').value=''; 
    tempPhotos = []; 
    for(let i=0; i<4; i++) { 
        const revSlot = document.getElementById(`rev-slot-${i}`);
        const expSlot = document.getElementById(`exp-slot-${i}`);
        if(revSlot) { revSlot.innerHTML = ''; revSlot.classList.remove('has-img'); }
        if(expSlot) { expSlot.innerHTML = ''; expSlot.classList.remove('has-img'); }
    } 
}
function notify(m, i) { const a = document.getElementById('cool-alert'); document.getElementById('alert-icon').innerText = i || "✅"; document.getElementById('alert-msg').innerText = m; a.classList.add('show'); setTimeout(()=>a.classList.remove('show'), 3000); }

// Wait for all external scripts (Supabase, OneSignal) to be ready
window.addEventListener('load', () => {
    checkUser();
});
