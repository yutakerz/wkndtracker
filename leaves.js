// leaves.js

// --- CONFIGURATION ---
const MAX_LEAVES = 24;
// NOTE: Notification logic is handled by Supabase Edge Function (notify-leaves)

const TEAM_ROSTER = [
    { name: "Annaly Suico", email: "suicoannaly@gmail.com" },
    { name: "Cyril Bolico", email: "cyrilbolico23@gmail.com" },
    { name: "Kent Gabitoya", email: "kentgabitoya17@gmail.com" },
    { name: "Renz Sarmiento", email: "onlymrsarmiento@gmail.com" }
];

let allLeaves = [];
let editingLeaveId = null; 

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
    
    const { data } = await _supabase
        .from('leaves')
        .select('*')
        .in('email', emails)
        .order('start_date', { ascending: false });

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

        let remaining = MAX_LEAVES - usedDays;
        if (remaining < 0) remaining = 0;

        const balanceColor = remaining === 0 ? '#ff6b6b' : '#4ade80';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.padding = '8px 0';
        row.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        row.style.fontSize = '0.9rem';
        
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
        list.innerHTML = `<div style="text-align:center; padding:40px; color:#cbd5e1; font-size:0.8rem;">No leave history found.</div>`;
        return;
    }

    allLeaves.forEach(l => {
        const owner = TEAM_ROSTER.find(u => u.email === l.email);
        const ownerName = owner ? owner.name : l.email;

        let statusBadge = '', statusColor = '#94a3b8'; 
        const now = new Date(); now.setHours(0,0,0,0);
        const endDate = new Date(l.end_date);

        if (l.status === 'cancelled') { statusBadge = 'CANCELLED'; statusColor = '#ef4444'; } 
        else if (endDate < now) { statusBadge = 'DONE'; statusColor = '#22c55e'; } 
        else { statusBadge = 'PENDING'; statusColor = '#f59e0b'; }

        const sDate = new Date(l.start_date).toLocaleDateString();
        const eDate = new Date(l.end_date).toLocaleDateString();
        const dateDisplay = (sDate === eDate) ? sDate : `${sDate} - ${eDate}`;
        const dayLabel = l.days_count === 1 ? "Day" : "Days";

        const item = document.createElement('div');
        item.className = 'channel-row'; 
        item.style.padding = '15px';
        item.style.borderBottom = '1px solid #f1f5f9';
        item.style.cursor = 'pointer';
        item.onclick = () => openLeaveDetails(l);
        
        item.innerHTML = `
            <div>
                <b class="adaptive-name" style="font-size:0.85rem;">${ownerName}</b><br>
                <span style="font-size:0.75rem;">${dateDisplay}</span><br>
                <small style="color:#64748b">${l.days_count} ${dayLabel} | ${l.reason}</small>
            </div>
            <div style="text-align:right;">
                <span style="font-size:0.65rem; font-weight:700; background:${statusColor}20; color:${statusColor}; padding:4px 8px; border-radius:6px;">${statusBadge}</span>
            </div>`;
        list.appendChild(item);
    });
}

// 5. MODAL & EDIT LOGIC
function openAddLeaveModal() {
    editingLeaveId = null; 
    document.getElementById('leave-start').value = '';
    document.getElementById('leave-end').value = '';
    document.getElementById('leave-reason').value = '';
    
    const btn = document.querySelector('#add-leave-modal .btn-primary');
    btn.innerText = "Confirm Request";
    
    document.getElementById('add-leave-modal').style.display = 'flex';
}

function openEditLeaveModal(leave) {
    editingLeaveId = leave.id; 
    document.getElementById('leave-start').value = leave.start_date;
    document.getElementById('leave-end').value = leave.end_date;
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
    
    if (!start) return notify("Date is required", "⚠️");
    if (!reason) return notify("Reason is required", "⚠️");
    
    if (!end) end = start; 

    if (new Date(start) > new Date(end)) return notify("Invalid dates", "⚠️");

    // --- CONFLICT CHECKER (NEW) ---
    // Check if these dates overlap with ANY active leave from ANYONE
    const reqStart = new Date(start);
    const reqEnd = new Date(end);
    // Normalize time to ensure accurate comparison
    reqStart.setHours(0,0,0,0);
    reqEnd.setHours(0,0,0,0);

    for (const l of allLeaves) {
        // Skip cancelled leaves
        if (l.status === 'cancelled') continue;
        
        // Skip the specific leave we are currently editing (don't conflict with self)
        if (editingLeaveId && l.id === editingLeaveId) continue;

        const lStart = new Date(l.start_date);
        const lEnd = new Date(l.end_date);
        lStart.setHours(0,0,0,0);
        lEnd.setHours(0,0,0,0);

        // Check Overlap: (StartA <= EndB) AND (EndA >= StartB)
        if (reqStart <= lEnd && reqEnd >= lStart) {
            return notify("Someone already added on this date.", "⛔");
        }
    }
    // ------------------------------

    const daysRequested = calculateBusinessDays(start, end);
    
    let usedTotal = 0; const currentYear = new Date().getFullYear();
    allLeaves.forEach(l => { 
        if(l.email === loggedInUser.email && l.status !== 'cancelled' && new Date(l.start_date).getFullYear() === currentYear) {
            if (editingLeaveId && l.id === editingLeaveId) return; 
            usedTotal += l.days_count; 
        }
    });
    
    if ((usedTotal + daysRequested) > MAX_LEAVES) return notify(`Insufficient balance!`, "⛔");

    const btn = document.querySelector('#add-leave-modal .btn-primary');
    const oldTxt = btn.innerText; btn.innerText = "Saving..."; btn.disabled = true;

    let error = null;

    if (editingLeaveId) {
        const { error: err } = await _supabase.from('leaves').update({
            start_date: start, end_date: end, reason: reason, days_count: daysRequested
        }).eq('id', editingLeaveId);
        error = err;
    } else {
        const { error: err } = await _supabase.from('leaves').insert([{
            email: loggedInUser.email, start_date: start, end_date: end,
            reason: reason, days_count: daysRequested, status: 'active'
        }]);
        error = err;
    }

    btn.innerText = oldTxt; btn.disabled = false;

    if (!error) {
        document.getElementById('add-leave-modal').style.display = 'none';
        notify(editingLeaveId ? "Leave Updated!" : "Leave Requested!", "📅");
        fetchAllData();
    } else { notify("Error saving", "❌"); }
}

function openLeaveDetails(leave) {
    const modal = document.getElementById('leave-details-modal');
    const content = document.getElementById('leave-detail-content');
    const actions = document.getElementById('leave-actions');
    const title = document.getElementById('manage-leave-title');
    const now = new Date(); now.setHours(0,0,0,0);
    const startDate = new Date(leave.start_date);
    
    let statusText = "PENDING";
    if (leave.status === 'cancelled') statusText = "CANCELLED";
    else if (new Date(leave.end_date) < now) statusText = "DONE";

    const sDate = new Date(leave.start_date).toLocaleDateString();
    const eDate = new Date(leave.end_date).toLocaleDateString();
    const dateDisplay = (sDate === eDate) ? sDate : `${sDate} - ${eDate}`;
    const dayLabel = leave.days_count === 1 ? "Day" : "Days";

    content.innerHTML = `
        <div style="margin-bottom:8px"><b>Date:</b> ${dateDisplay}</div>
        <div style="margin-bottom:8px"><b>Duration:</b> ${leave.days_count} ${dayLabel}</div>
        <div style="margin-bottom:8px"><b>Status:</b> ${statusText}</div>
        <div><b>Reason:</b><br><span style="color:#64748b">${leave.reason}</span></div>`;

    actions.innerHTML = '';
    
    const isMine = leave.email === loggedInUser.email;

    if (isMine && leave.status !== 'cancelled' && startDate >= now) {
        title.style.display = 'block';
        const leaveJson = JSON.stringify(leave).replace(/"/g, '&quot;');
        actions.innerHTML = `
            <button class="btn btn-primary" style="margin-bottom:8px;" onclick="openEditLeaveModal(${leaveJson})">Edit Details</button>
            <button class="btn btn-danger" onclick="cancelLeave(${leave.id})">Cancel This Leave</button>
        `;
    } else {
        title.style.display = 'none';
        if (!isMine) {
             actions.innerHTML = `<div style="text-align:center; color:#94a3b8; font-size:0.8rem;">View Only</div>`;
        } else if(leave.status === 'cancelled') {
            actions.innerHTML = `<div style="text-align:center; color:#ef4444; font-size:0.8rem;">This leave was cancelled.</div>`;
        } else {
            actions.innerHTML = `<div style="text-align:center; color:#22c55e; font-size:0.8rem;">This leave is completed.</div>`;
        }
    }
    modal.style.display = 'flex';
}

async function cancelLeave(id) {
    if(!confirm("Are you sure?")) return;
    const { error } = await _supabase.from('leaves').update({ status: 'cancelled' }).eq('id', id);

    if (!error) {
        document.getElementById('leave-details-modal').style.display = 'none';
        notify("Leave Cancelled", "↩️");
        fetchAllData();
    } else { notify("Error", "❌"); }
}

function calculateBusinessDays(start, end) {
    const d1 = new Date(start); const d2 = new Date(end);
    return Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1; 
}