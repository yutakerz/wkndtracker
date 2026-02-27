// leaves.js

// --- CONFIGURATION ---
const LIMIT_ADMIN = 24;
const LIMIT_EMPLOYEE = 12;

// The 4 Original Admins
const ADMIN_EMAILS = [
    "suicoannaly@gmail.com",
    "cyrilbolico23@gmail.com",
    "kentgabitoya17@gmail.com",
    "onlymrsarmiento@gmail.com"
];

const TEAM_ROSTER = [
    { name: "Anna", email: "suicoannaly@gmail.com" },
    { name: "Cee", email: "cyrilbolico23@gmail.com" },
    { name: "Ian", email: "kentgabitoya17@gmail.com" },
    { name: "Renz", email: "onlymrsarmiento@gmail.com" },
    // ADD NEW EMPLOYEES HERE:
    { name: "Carryl", email: "carrylpolancos5@gmail.com" },
    { name: "Chariz", email: "cksiasongrados@gmail.com" },
    { name: "Jerome", email: "jeromeferdsaguilar@gmail.com" }
];

let allLeaves = [];
let editingLeaveId = null; 

// Helper: Check if user is Admin or Employee to get their specific limit
function getLimit(email) {
    return ADMIN_EMAILS.includes(email) ? LIMIT_ADMIN : LIMIT_EMPLOYEE;
}

// 1. OPEN THE PAGE
function openLeaves() {
    closeMenu();
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-links span').forEach(s => s.classList.remove('active'));
    
    const container = document.querySelector('.container'); 
    container.style.opacity = '0'; 
    container.style.transform = 'translateY(15px)';

    setTimeout(() => {
        document.getElementById('leaves').classList.add('active');
        container.style.opacity = '1'; 
        container.style.transform = 'translateY(0)';
    }, 300);

    fetchAllData();
}

// 2. FETCH ALL DATA
async function fetchAllData() {
    const emails = TEAM_ROSTER.map(u => u.email);
    const { data } = await _supabase.from('leaves').select('*').in('email', emails).order('start_date', { ascending: false });
    if (data) {
        allLeaves = data;
        renderDashboard();
    }
}

function renderDashboard() {
    renderTeamBalances();
    renderHistoryList();
}

// 3. RENDER TEAM BALANCES
function renderTeamBalances() {
    const list = document.getElementById('team-balance-list');
    list.innerHTML = '';
    const currentYear = new Date().getFullYear();

    TEAM_ROSTER.forEach(member => {
        let usedDays = 0;
        allLeaves.forEach(l => {
            const lYear = new Date(l.start_date).getFullYear();
            if (l.email === member.email && l.status !== 'cancelled' && lYear === currentYear) {
                usedDays += l.days_count;
            }
        });

        // Use helper to determine if this person has 12 or 24 limit
        const userLimit = getLimit(member.email);
        let remaining = Math.max(0, userLimit - usedDays);
        const balanceColor = remaining === 0 ? '#ff6b6b' : '#4ade80';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.padding = '6px 0';
        row.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        row.style.fontSize = '0.85rem';
        
        row.innerHTML = `
            <span style="color: #cbd5e1;">${member.name}</span>
            <span style="color: #cbd5e1; font-weight:700;">
                leave left: <span style="color: ${balanceColor}">${remaining}</span>
            </span>`;
        list.appendChild(row);
    });
}

// 4. RENDER HISTORY LIST
function renderHistoryList() {
    const list = document.getElementById('leave-list');
    list.innerHTML = '';
    
    if (allLeaves.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:40px; color:#94a3b8; font-size:0.75rem;">No leave history found.</div>`;
        return;
    }

    allLeaves.forEach(l => {
        const owner = TEAM_ROSTER.find(u => u.email === l.email);
        const ownerName = owner ? owner.name : l.email;

        let statusBadge = '', statusColor = '#94a3b8'; 
        const now = new Date(); now.setHours(0,0,0,0);
        const startDate = new Date(l.start_date); startDate.setHours(0,0,0,0);
        const endDate = new Date(l.end_date); endDate.setHours(0,0,0,0);

        if (l.status === 'cancelled') { 
            statusBadge = 'CANCELLED'; statusColor = '#ef4444'; 
        } 
        else if (now >= startDate && now <= endDate) { 
            statusBadge = 'ON GOING'; statusColor = '#3b82f6'; // Blue
        }
        else if (endDate < now) { 
            statusBadge = 'DONE'; statusColor = '#22c55e'; 
        } 
        else { 
            statusBadge = 'PENDING'; statusColor = '#f59e0b'; 
        }

        const sStr = startDate.toLocaleDateString();
        const eStr = endDate.toLocaleDateString();
        const dateDisplay = (sStr === eStr) ? sStr : `${sStr} - ${eStr}`;
        const dayLabel = l.days_count === 1 ? "Day" : "Days";

        const item = document.createElement('div');
        item.className = 'channel-row'; 
        item.style.padding = '12px';
        item.style.borderBottom = '1px solid #f1f5f9';
        item.style.cursor = 'pointer';
        item.onclick = () => openLeaveDetails(l);
        
        item.innerHTML = `
            <div>
                <b class="adaptive-name" style="font-size:0.85rem;">${ownerName}</b><br>
                <span style="font-size:0.75rem;">${dateDisplay}</span><br>
                <small style="color:#64748b; font-size:0.7rem;">${l.days_count} ${dayLabel} | ${l.reason}</small>
            </div>
            <div style="text-align:right;">
                <span style="font-size:0.6rem; font-weight:700; background:${statusColor}20; color:${statusColor}; padding:3px 6px; border-radius:5px;">${statusBadge}</span>
            </div>`;
        list.appendChild(item);
    });
}

// 5. MODAL LOGIC
function openAddLeaveModal() {
    editingLeaveId = null; 
    document.getElementById('leave-start').value = '';
    document.getElementById('leave-end').value = '';
    document.getElementById('leave-reason').value = '';
    
    const btn = document.querySelector('#add-leave-modal .btn-primary');
    btn.innerText = "Confirm";
    document.getElementById('add-leave-modal').style.display = 'flex';
}

function openEditLeaveModal(leave) {
    editingLeaveId = leave.id; 
    document.getElementById('leave-start').value = leave.start_date;
    document.getElementById('leave-end').value = (leave.start_date === leave.end_date) ? '' : leave.end_date;
    document.getElementById('leave-reason').value = leave.reason;
    
    const btn = document.querySelector('#add-leave-modal .btn-primary');
    btn.innerText = "Save Changes";
    
    document.getElementById('leave-details-modal').style.display = 'none';
    document.getElementById('add-leave-modal').style.display = 'flex';
}

async function submitLeave() {
    const start = document.getElementById('leave-start').value;
    let end = document.getElementById('leave-end').value; 
    const reason = document.getElementById('leave-reason').value;
    
    if (!start || !reason) return notify("Fill required fields", "⚠️");
    if (!end) end = start; 

    if (new Date(start) > new Date(end)) return notify("Invalid dates", "⚠️");

    const reqS = new Date(start); reqS.setHours(0,0,0,0);
    const reqE = new Date(end); reqE.setHours(0,0,0,0);

    for (const l of allLeaves) {
        if (l.status === 'cancelled' || (editingLeaveId && l.id === editingLeaveId)) continue;
        const lS = new Date(l.start_date); lS.setHours(0,0,0,0);
        const lE = new Date(l.end_date); lE.setHours(0,0,0,0);
        if (reqS <= lE && reqE >= lS) return notify("Date already taken.", "⛔");
    }

    const daysRequested = calculateBusinessDays(start, end);
    let used = 0; const year = new Date().getFullYear();
    allLeaves.forEach(l => { 
        if(l.email === loggedInUser.email && l.status !== 'cancelled' && new Date(l.start_date).getFullYear() === year) {
            if (!editingLeaveId || l.id !== editingLeaveId) used += l.days_count; 
        }
    });
    
    // Check specific limit for the logged in user (12 or 24)
    const myLimit = getLimit(loggedInUser.email);
    if ((used + daysRequested) > myLimit) return notify(`Insufficient balance! (Max ${myLimit})`, "⛔");

    const btn = document.querySelector('#add-leave-modal .btn-primary');
    const oldTxt = btn.innerText; btn.innerText = "Saving..."; btn.disabled = true;

    const payload = { start_date: start, end_date: end, reason: reason, days_count: daysRequested };
    let res;
    
    if (editingLeaveId) res = await _supabase.from('leaves').update(payload).eq('id', editingLeaveId);
    else res = await _supabase.from('leaves').insert([{ ...payload, email: loggedInUser.email, status: 'active' }]);

    btn.innerText = oldTxt; btn.disabled = false;

    if (!res.error) {
        document.getElementById('add-leave-modal').style.display = 'none';
        notify(editingLeaveId ? "Updated!" : "Added!", "📅");
        fetchAllData();
    } else notify("Error saving", "❌");
}

function openLeaveDetails(leave) {
    const modal = document.getElementById('leave-details-modal');
    const content = document.getElementById('leave-detail-content');
    const actions = document.getElementById('leave-actions');
    const title = document.getElementById('manage-leave-title');
    
    const now = new Date(); now.setHours(0,0,0,0);
    const startDate = new Date(leave.start_date); startDate.setHours(0,0,0,0);
    const endDate = new Date(leave.end_date); endDate.setHours(0,0,0,0);
    
    const owner = TEAM_ROSTER.find(u => u.email === leave.email);
    const ownerName = owner ? owner.name : leave.email;

    let statusText = "PENDING";
    let statusColor = '#f59e0b';
    if (leave.status === 'cancelled') {
        statusText = "CANCELLED";
        statusColor = '#ef4444';
    } else if (now >= startDate && now <= endDate) {
        statusText = "ON GOING";
        statusColor = '#3b82f6';
    } else if (endDate < now) {
        statusText = "DONE";
        statusColor = '#22c55e';
    }

    const sStr = startDate.toLocaleDateString();
    const eStr = endDate.toLocaleDateString();
    const dateDisplay = (sStr === eStr) ? sStr : `${sStr} - ${eStr}`;
    const dayLabel = leave.days_count === 1 ? "Day" : "Days";

    // Format created_at date
    const createdDate = new Date(leave.created_at);
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
    const formattedCreatedDate = createdDate.toLocaleString('en-US', options).replace(' at ', ', ');

    content.innerHTML = `
        <div style="margin-bottom:10px; border-bottom:1px solid rgba(0,0,0,0.05); padding-bottom:8px;">
            <b class="adaptive-name" style="font-size:1rem;">${ownerName}</b>
        </div>
        <div style="margin-bottom:6px"><b>Date of Leave:</b> ${dateDisplay}</div>
        <div style="margin-bottom:6px"><b>Duration:</b> ${leave.days_count} ${dayLabel}</div>
        <div style="margin-bottom:6px"><b>Status:</b> <span style="color:${statusColor}; font-weight:bold;">${statusText}</span></div>
        <div style="margin-bottom:6px"><b>Date added:</b> ${formattedCreatedDate}</div>
        <div><b>Reason:</b><br><span style="color:#64748b; font-size:0.85rem;">${leave.reason}</span></div>`;

    actions.innerHTML = '';
    const isMine = leave.email === loggedInUser.email;

    if (isMine && leave.status !== 'cancelled' && startDate >= now) {
        title.style.display = 'block';
        const leaveJson = JSON.stringify(leave).replace(/"/g, '&quot;');
        actions.innerHTML = `
            <button class="btn btn-primary" style="padding:10px; font-size:0.85rem; margin-bottom:8px;" onclick="openEditLeaveModal(${leaveJson})">Edit Details</button>
            <button class="btn btn-danger" style="padding:10px; font-size:0.85rem; width:100%;" onclick="cancelLeave(${leave.id})">Cancel Leave</button>`;
    } else {
        title.style.display = 'none';
        const msg = !isMine ? "View Only" : (leave.status === 'cancelled' ? "Cancelled" : "Completed");
        actions.innerHTML = `<div style="text-align:center; color:#94a3b8; font-size:0.8rem;">${msg}</div>`;
    }
    modal.style.display = 'flex';
}

async function cancelLeave(id) {
    if(!confirm("Are you sure?")) return;
    const { error } = await _supabase.from('leaves').update({ status: 'cancelled' }).eq('id', id);
    if (!error) {
        document.getElementById('leave-details-modal').style.display = 'none';
        notify("Cancelled", "↩️");
        fetchAllData();
    } else notify("Error", "❌");
}

function calculateBusinessDays(start, end) {
    const d1 = new Date(start); const d2 = new Date(end);
    return Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1; 
}