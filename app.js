// ============================================================
// TIPUS I CONSTANTS
// ============================================================
/** @typedef {{ id:string, icon:string, name:string, amount:number }} Cost */
/** @typedef {{ id:string, icon:string, name:string, income:number, expense:number }} Revenue */
/** @typedef {{ id:string, name:string, amount:number }} Payment */
/** @typedef {{ id:string, icon:string, name:string, count:number }} Participant */

const ICONS = [
    // Allotjament / espai
    'bed','house','hotel','building-2','tent',
    // Transport
    'bus','train','plane','ship','bicycle',
    // Persones
    'users','graduation-cap','baby','smile','heart',
    // Menjar
    'utensils','coffee','pizza','apple','gift',
    // Natura
    'mountain','trees','leaf','sun','flame',
    // Art / música
    'music','mic','film','palette','paintbrush',
    // Activitat / esport
    'trophy','dumbbell','camera','ticket','scissors',
    // Flora / festa
    'flower','flower-2','sparkles','party-popper','umbrella',
    // Escola / ciència
    'book','book-open','microscope','flag','star',
    // Diners / misc
    'coins','tag','shopping-cart','map-pin','circle-dot',
];
const COST_COLORS = ['#FF9500','#AF52DE','#007AFF','#FF3B30','#34C759','#FF6B35','#5856D6','#FF2D55'];

// ============================================================
// ESTAT
// ============================================================
/** @type {Cost[]}        */ let costs        = [];
/** @type {Revenue[]}     */ let revenues     = [];
/** @type {Payment[]}     */ let payments     = [];
/** @type {Participant[]} */ let participants = [];
let quotesMode     = 'participant';
let pickerTarget   = null;
let _deletedEntry  = null;
let _resetSnapshot = null;
let _toastTimer    = null;
let _uid = 0;
function uid() { return 'u' + (++_uid); }

const FIELDS = [];

// ============================================================
// FORMAT CATALÀ (3.125,48)
// ============================================================
function fmt(num, decimals = 2) {
    return num.toLocaleString('ca-ES', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/** Accepta "3.125,48", "3125,48" i "3125.48" → 3125.48 */
function parseInput(str) {
    if (!str || str.trim() === '') return 0;
    let s = str.trim();
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : Math.max(0, n);
}

function readVal(id) { return parseInput(document.getElementById(id).value); }

function formatField(input, type) {
    const n = parseInput(input.value);
    input.value = n === 0 ? '' : (type === 'int' ? fmt(n, 0) : fmt(n, 2));
}

function focusField(input) {
    const n = parseInput(input.value);
    input.value = n === 0 ? '' : n.toLocaleString('ca-ES', {
        minimumFractionDigits: 0, maximumFractionDigits: 2, useGrouping: false,
    }).replace('.', ',');
    setTimeout(() => input.select(), 0);
}

function safeIcon(icon) { return ICONS.includes(icon) ? icon : 'circle-dot'; }

function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
// PARTICIPANTS
// ============================================================
function getParticipantTotal() { return participants.reduce((s, p) => s + (p.count || 0), 0); }

function addParticipantRow(data = {}, skipUpdate = false) {
    if (!skipUpdate && participants.length > 0 && !participants[participants.length - 1].name.trim()) {
        document.querySelector(`.participant-row[data-part-id="${participants[participants.length-1].id}"] .concept-name`)?.focus();
        return;
    }
    const item = { id: uid(), icon: safeIcon(data.icon || 'users'), name: data.name || '', count: data.count || 0 };
    participants.push(item);
    renderParticipantRow(item);
    if (!skipUpdate) {
        updateAll();
        document.querySelector(`.participant-row[data-part-id="${item.id}"] .concept-name`)?.focus();
    }
}

function deleteParticipantRow(id) {
    const idx = participants.findIndex(p => p.id === id);
    if (idx === -1) return;
    _deletedEntry = { type: 'part', item: { ...participants[idx] }, idx };
    participants.splice(idx, 1);
    document.querySelector(`[data-part-id="${id}"]`)?.remove();
    updateAll();
    _showToast('Participant eliminat', true);
}

function updateParticipantName(id, value) {
    const item = participants.find(p => p.id === id);
    if (item) { item.name = value; saveValues(); }
}

function updateParticipantCount(id, rawValue) {
    const item = participants.find(p => p.id === id);
    if (item) { item.count = Math.round(parseInput(rawValue)); updateAll(); }
}

function blurParticipantCount(input, id) {
    formatField(input, 'int');
    updateParticipantCount(id, input.value);
}

function rerenderParticipantRows() {
    document.getElementById('participantsRows').innerHTML = '';
    participants.forEach(p => renderParticipantRow(p));
}

function renderParticipantRow(item) {
    const div = document.createElement('div');
    div.className = 'input-row participant-row';
    div.dataset.partId = item.id;
    div.draggable = true;
    div.innerHTML = `
        <button class="btn-drag" aria-label="Arrossegar per reordenar">
            <i data-lucide="grip-vertical" style="width:14px;height:14px;"></i>
        </button>
        <button class="btn-icon-pick" onclick="openIconPicker('${item.id}')" aria-label="Canviar icona">
            <i data-lucide="${item.icon}" style="width:16px;height:16px;"></i>
        </button>
        <input type="text" class="concept-name" placeholder="Nom del grup"
               value="${escHtml(item.name)}"
               oninput="updateParticipantName('${item.id}',this.value)"
               aria-label="Nom del grup">
        <div class="field-wrap">
            <input type="text" class="num-input blue" placeholder="0"
                   value="${item.count ? fmt(item.count, 0) : ''}"
                   inputmode="numeric" aria-label="Nombre de participants"
                   onfocus="focusField(this)"
                   oninput="updateParticipantCount('${item.id}',this.value)"
                   onblur="blurParticipantCount(this,'${item.id}')"
                   onkeydown="if(event.key==='Enter')this.blur()">
            <span class="euro" style="visibility:hidden;">€</span>
        </div>
        <button class="btn-del" onclick="deleteParticipantRow('${item.id}')" aria-label="Eliminar">
            <i data-lucide="x" style="width:13px;height:13px;"></i>
        </button>`;
    _attachDragDrop(div, item.id, participants, rerenderParticipantRows);
    document.getElementById('participantsRows').appendChild(div);
    lucide.createIcons();
}

// ============================================================
// COSTOS DINÀMICS
// ============================================================
function getCostTotal() { return costs.reduce((s, c) => s + c.amount, 0); }

function addCostRow(data = {}, skipUpdate = false) {
    if (!skipUpdate && costs.length > 0 && !costs[costs.length - 1].name.trim()) {
        document.querySelector(`.cost-row[data-cost-id="${costs[costs.length-1].id}"] .concept-name`)?.focus();
        return;
    }
    const item = { id: uid(), icon: safeIcon(data.icon || 'tag'), name: data.name || '', amount: data.amount || 0 };
    costs.push(item);
    renderCostRow(item);
    if (!skipUpdate) {
        updateAll();
        document.querySelector(`.cost-row[data-cost-id="${item.id}"] .concept-name`)?.focus();
    }
}

function deleteCostRow(id) {
    const idx = costs.findIndex(c => c.id === id);
    if (idx === -1) return;
    _deletedEntry = { type: 'cost', item: { ...costs[idx] }, idx };
    costs.splice(idx, 1);
    document.querySelector(`[data-cost-id="${id}"]`)?.remove();
    updateAll();
    _showToast('Cost eliminat', true);
}

function updateCostName(id, value) {
    const item = costs.find(c => c.id === id);
    if (item) { item.name = value; saveValues(); }
}

function updateCostAmount(id, rawValue) {
    const item = costs.find(c => c.id === id);
    if (item) { item.amount = parseInput(rawValue); updateAll(); }
}

function blurCostAmount(input, id) {
    formatField(input, 'dec');
    updateCostAmount(id, input.value);
}

function rerenderCostRows() {
    document.getElementById('costsRows').innerHTML = '';
    costs.forEach(c => renderCostRow(c));
}

function renderCostRow(item) {
    const div = document.createElement('div');
    div.className = 'input-row cost-row';
    div.dataset.costId = item.id;
    div.draggable = true;
    div.innerHTML = `
        <button class="btn-drag" aria-label="Arrossegar per reordenar">
            <i data-lucide="grip-vertical" style="width:14px;height:14px;"></i>
        </button>
        <button class="btn-icon-pick" onclick="openIconPicker('${item.id}')" aria-label="Canviar icona">
            <i data-lucide="${item.icon}" style="width:16px;height:16px;"></i>
        </button>
        <input type="text" class="concept-name" placeholder="Nom del cost"
               value="${escHtml(item.name)}"
               oninput="updateCostName('${item.id}',this.value)"
               aria-label="Nom del cost">
        <div class="field-wrap">
            <input type="text" class="num-input red" placeholder="0,00"
                   value="${item.amount ? fmt(item.amount,2) : ''}"
                   inputmode="decimal" aria-label="Import"
                   onfocus="focusField(this)"
                   oninput="updateCostAmount('${item.id}',this.value)"
                   onblur="blurCostAmount(this,'${item.id}')"
                   onkeydown="if(event.key==='Enter')this.blur()">
            <span class="euro" style="color:var(--red);">€</span>
        </div>
        <button class="btn-del" onclick="deleteCostRow('${item.id}')" aria-label="Eliminar">
            <i data-lucide="x" style="width:13px;height:13px;"></i>
        </button>`;
    _attachDragDrop(div, item.id, costs, rerenderCostRows);
    document.getElementById('costsRows').appendChild(div);
    lucide.createIcons();
}

// ============================================================
// RECAPTACIÓ DINÀMICA
// ============================================================
function getRevenueNetTotal() { return revenues.reduce((s, r) => s + r.income - r.expense, 0); }

function addRevenueRow(data = {}, skipUpdate = false) {
    if (!skipUpdate && revenues.length > 0 && !revenues[revenues.length - 1].name.trim()) {
        document.querySelector(`.revenue-row[data-rev-id="${revenues[revenues.length-1].id}"] .concept-name`)?.focus();
        return;
    }
    const item = { id: uid(), icon: safeIcon(data.icon || 'coins'), name: data.name || '', income: data.income || 0, expense: data.expense || 0 };
    revenues.push(item);
    renderRevenueRow(item);
    if (!skipUpdate) {
        updateAll();
        document.querySelector(`.revenue-row[data-rev-id="${item.id}"] .concept-name`)?.focus();
    }
}

function deleteRevenueRow(id) {
    const idx = revenues.findIndex(r => r.id === id);
    if (idx === -1) return;
    _deletedEntry = { type: 'rev', item: { ...revenues[idx] }, idx };
    revenues.splice(idx, 1);
    document.querySelector(`[data-rev-id="${id}"]`)?.remove();
    updateAll();
    _showToast('Recaptació eliminada', true);
}

function updateRevName(id, value) {
    const item = revenues.find(r => r.id === id);
    if (item) { item.name = value; saveValues(); }
}

function updateRevIncome(id, raw) {
    const item = revenues.find(r => r.id === id);
    if (item) { item.income = parseInput(raw); refreshRevNet(id); updateAll(); }
}

function blurRevIncome(input, id) { formatField(input, 'dec'); updateRevIncome(id, input.value); }

function updateRevExpense(id, raw) {
    const item = revenues.find(r => r.id === id);
    if (item) { item.expense = parseInput(raw); refreshRevNet(id); updateAll(); }
}

function blurRevExpense(input, id) {
    formatField(input, 'dec');
    const item = revenues.find(r => r.id === id);
    if (item) { item.expense = parseInput(input.value); refreshRevNet(id); updateAll(); }
}

function refreshRevNet(id) {
    const item    = revenues.find(r => r.id === id);
    const el      = document.getElementById('revNet_' + id);
    const euroEl  = document.getElementById('revNetEuro_' + id);
    if (!item || !el) return;
    const net  = item.income - item.expense;
    const zero = item.income === 0 && item.expense === 0;
    el.textContent = fmt(net);
    el.classList.toggle('negative', net < 0);
    el.classList.toggle('zero', zero);
    if (euroEl) euroEl.style.color = zero ? 'rgba(52,199,89,0.3)' : net < 0 ? 'var(--red)' : 'var(--green)';
}

function rerenderRevenueRows() {
    document.getElementById('revenuesRows').innerHTML = '';
    revenues.forEach(r => renderRevenueRow(r));
}

function renderRevenueRow(item) {
    const div = document.createElement('div');
    div.className = 'input-row revenue-row';
    div.dataset.revId = item.id;
    div.draggable = true;
    const net = item.income - item.expense;
    div.innerHTML = `
        <div class="rev-top">
            <button class="btn-drag" aria-label="Arrossegar">
                <i data-lucide="grip-vertical" style="width:14px;height:14px;"></i>
            </button>
            <button class="btn-icon-pick" onclick="openIconPicker('${item.id}')" aria-label="Canviar icona">
                <i data-lucide="${item.icon}" style="width:16px;height:16px;"></i>
            </button>
            <input type="text" class="concept-name" placeholder="Nom de la recaptació"
                   value="${escHtml(item.name)}"
                   oninput="updateRevName('${item.id}',this.value)"
                   aria-label="Nom de la recaptació">
            <div class="field-wrap rev-net-wrap">
                <span class="rev-net${net < 0 ? ' negative' : ''}${item.income === 0 && item.expense === 0 ? ' zero' : ''}" id="revNet_${item.id}">${fmt(net)}</span>
                <span class="euro" id="revNetEuro_${item.id}" style="color:${item.income === 0 && item.expense === 0 ? 'rgba(52,199,89,0.3)' : net < 0 ? 'var(--red)' : 'var(--green)'};">€</span>
            </div>
            <button class="btn-del" onclick="deleteRevenueRow('${item.id}')" aria-label="Eliminar">
                <i data-lucide="x" style="width:13px;height:13px;"></i>
            </button>
        </div>
        <div class="rev-bottom">
            <span class="field-sign pos">+</span>
            <input type="text" class="num-input green" placeholder="0,00"
                   value="${item.income ? fmt(item.income,2) : ''}"
                   inputmode="decimal" aria-label="Ingressos"
                   onfocus="focusField(this)"
                   oninput="updateRevIncome('${item.id}',this.value)"
                   onblur="blurRevIncome(this,'${item.id}')"
                   onkeydown="if(event.key==='Enter')this.blur()">
            <span class="euro" style="color:var(--green);">€</span>
            <span class="field-sign neg">−</span>
            <input type="text" class="num-input expense" placeholder="0,00"
                   value="${item.expense ? fmt(item.expense,2) : ''}"
                   inputmode="decimal" aria-label="Despeses"
                   onfocus="focusField(this)"
                   oninput="updateRevExpense('${item.id}',this.value)"
                   onblur="blurRevExpense(this,'${item.id}')"
                   onkeydown="if(event.key==='Enter')this.blur()">
            <span class="euro">€</span>
        </div>`;
    _attachDragDrop(div, item.id, revenues, rerenderRevenueRows);
    document.getElementById('revenuesRows').appendChild(div);
    lucide.createIcons();
}

// ============================================================
// DRAG & DROP (compartit entre totes les seccions)
// ============================================================
function _attachDragDrop(div, id, array, rerender) {
    div.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => div.classList.add('dragging'), 0);
    });
    div.addEventListener('dragend', () => {
        div.classList.remove('dragging');
        div.parentElement?.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
    div.addEventListener('dragover', e => {
        e.preventDefault();
        div.parentElement?.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        div.classList.add('drag-over');
    });
    div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
    div.addEventListener('drop', e => {
        e.preventDefault();
        div.classList.remove('drag-over');
        const fromId  = e.dataTransfer.getData('text/plain');
        if (fromId === id) return;
        const fromIdx = array.findIndex(x => x.id === fromId);
        const toIdx   = array.findIndex(x => x.id === id);
        if (fromIdx === -1 || toIdx === -1) return;
        array.splice(toIdx, 0, array.splice(fromIdx, 1)[0]);
        rerender();
        saveValues();
    });
}

// ============================================================
// TOAST
// ============================================================
function _showToast(msg, undo = false) {
    clearTimeout(_toastTimer);
    const toast  = document.getElementById('undoToast');
    const label  = document.getElementById('undoToastLabel');
    const btnDes = toast.querySelector('.btn-undo');
    label.textContent        = msg;
    btnDes.style.display     = undo ? '' : 'none';
    toast.classList.add('show');
    _toastTimer = setTimeout(() => {
        toast.classList.remove('show');
        if (!undo) _deletedEntry = null;
    }, undo ? 5000 : 2500);
}

function undoDelete() {
    clearTimeout(_toastTimer);
    document.getElementById('undoToast').classList.remove('show');
    document.querySelector('#undoToast .btn-undo').style.display = '';

    if (_resetSnapshot) {
        const d = _resetSnapshot; _resetSnapshot = null;
        document.getElementById('titolActivitat').innerText = d.titol;
        document.title = d.titol ? d.titol + ' · ComptesClars' : 'ComptesClars';
        quotesMode = d.quotesMode || 'participant'; _applyQuotesModeToggleUI();
        costs = []; revenues = []; payments = []; participants = [];
        document.getElementById('costsRows').innerHTML        = '';
        document.getElementById('revenuesRows').innerHTML     = '';
        document.getElementById('paymentsRows').innerHTML     = '';
        document.getElementById('participantsRows').innerHTML = '';
        d.participants.forEach(p => addParticipantRow(p, true));
        d.costos.forEach(c => addCostRow(c, true));
        d.recaptacio.forEach(r => addRevenueRow(r, true));
        d.pagaments.forEach(p => addPaymentRow(p, true));
        updateAll();
        return;
    }
    if (!_deletedEntry) return;
    const { type, item, idx } = _deletedEntry;
    _deletedEntry = null;
    if      (type === 'cost') { costs.splice(idx, 0, item);        rerenderCostRows(); }
    else if (type === 'rev')  { revenues.splice(idx, 0, item);     rerenderRevenueRows(); }
    else if (type === 'pay')  { payments.splice(idx, 0, item);     rerenderPaymentRows(); }
    else if (type === 'part') { participants.splice(idx, 0, item); rerenderParticipantRows(); }
    updateAll();
}

// ============================================================
// PAGAMENTS DINÀMICS
// ============================================================
function setQuotesMode(mode) {
    if (quotesMode === mode) return;
    quotesMode = mode;
    _applyQuotesModeToggleUI();
    rerenderPaymentRows();
    updateAll();
    saveValues();
}

function toggleQuotesMode() {
    setQuotesMode(quotesMode === 'participant' ? 'projecte' : 'participant');
}

function _applyQuotesModeToggleUI() {
    const btnP = document.getElementById('quotesModeBtn_participant');
    const btnPr = document.getElementById('quotesModeBtn_projecte');
    if (!btnP || !btnPr) return;
    btnP.classList.toggle('active', quotesMode === 'participant');
    btnPr.classList.toggle('active', quotesMode === 'projecte');
}

function getPaymentTotal() { return payments.reduce((s, p) => s + p.amount, 0); }

function addPaymentRow(data = {}, skipUpdate = false) {
    if (!skipUpdate && payments.length > 0 && !payments[payments.length - 1].name.trim()) {
        document.querySelector(`.payment-row[data-pay-id="${payments[payments.length-1].id}"] .concept-name`)?.focus();
        return;
    }
    const item = { id: uid(), name: data.name || '', amount: data.amount || 0 };
    payments.push(item);
    renderPaymentRow(item);
    if (!skipUpdate) {
        updateAll();
        document.querySelector(`.payment-row[data-pay-id="${item.id}"] .concept-name`)?.focus();
    }
}

function deletePaymentRow(id) {
    const idx = payments.findIndex(p => p.id === id);
    if (idx === -1) return;
    _deletedEntry = { type: 'pay', item: { ...payments[idx] }, idx };
    payments.splice(idx, 1);
    document.querySelector(`[data-pay-id="${id}"]`)?.remove();
    updateAll();
    _showToast('Pagament eliminat', true);
}

function updatePaymentName(id, value) {
    const item = payments.find(p => p.id === id);
    if (item) { item.name = value; saveValues(); }
}

function updatePaymentAmount(id, rawValue) {
    const item = payments.find(p => p.id === id);
    if (item) {
        const n = Math.max(1, getParticipantTotal());
        const raw = parseInput(rawValue);
        item.amount = quotesMode === 'projecte' ? raw / n : raw;
        updateAll();
    }
}

function blurPaymentAmount(input, id) {
    formatField(input, 'dec');
    updatePaymentAmount(id, input.value);
}

function rerenderPaymentRows() {
    document.getElementById('paymentsRows').innerHTML = '';
    payments.forEach(p => renderPaymentRow(p));
}

function renderPaymentRow(item) {
    const n = Math.max(1, getParticipantTotal());
    const displayAmount = quotesMode === 'projecte' ? item.amount * n : item.amount;
    const div = document.createElement('div');
    div.className = 'input-row payment-row';
    div.dataset.payId = item.id;
    div.draggable = true;
    div.innerHTML = `
        <button class="btn-drag" aria-label="Arrossegar per reordenar">
            <i data-lucide="grip-vertical" style="width:14px;height:14px;"></i>
        </button>
        <input type="text" class="concept-name" placeholder="Nom del pagament"
               value="${escHtml(item.name)}"
               oninput="updatePaymentName('${item.id}',this.value)"
               aria-label="Nom del pagament">
        <div class="field-wrap">
            <input type="text" class="num-input blue" placeholder="0,00"
                   value="${displayAmount ? fmt(displayAmount,2) : ''}"
                   inputmode="decimal" aria-label="Import"
                   onfocus="focusField(this)"
                   oninput="updatePaymentAmount('${item.id}',this.value)"
                   onblur="blurPaymentAmount(this,'${item.id}')"
                   onkeydown="if(event.key==='Enter')this.blur()">
            <span class="euro" style="color:var(--blue);">€</span>
        </div>
        <button class="btn-del" onclick="deletePaymentRow('${item.id}')" aria-label="Eliminar">
            <i data-lucide="x" style="width:13px;height:13px;"></i>
        </button>`;
    _attachDragDrop(div, item.id, payments, rerenderPaymentRows);
    document.getElementById('paymentsRows').appendChild(div);
    lucide.createIcons();
}

// ============================================================
// DISTRIBUCIÓ DE COSTOS
// ============================================================
function updateDistBar() {
    const total  = getCostTotal();
    const bar    = document.getElementById('distBar');
    const legend = document.getElementById('distLegend');
    const active = costs.filter(c => c.amount > 0);
    if (total > 0 && active.length > 0) {
        bar.innerHTML = active.map((c, i) =>
            `<div class="dist-seg" style="width:${c.amount/total*100}%;background:${COST_COLORS[i%COST_COLORS.length]};"></div>`
        ).join('');
        legend.innerHTML = active.map((c, i) =>
            `<span style="font-size:10px;font-weight:700;color:var(--text-secondary);display:flex;align-items:center;gap:5px;text-transform:uppercase;">
                <span style="width:10px;height:10px;border-radius:50%;background:${COST_COLORS[i%COST_COLORS.length]};display:inline-block;flex-shrink:0;"></span>
                ${escHtml(c.name || '—')}
            </span>`
        ).join('');
    } else {
        bar.innerHTML = '';
        legend.innerHTML = '<span style="font-size:10px;color:var(--text-secondary);">Sense dades</span>';
    }
}

function updateHeroBar(total, rec, pagat, n) {
    const bar      = document.getElementById('heroSegBar');
    const preuReal = total / n;
    if (preuReal <= 0) { bar.innerHTML = ''; return; }
    const recCov   = Math.min(rec / n, preuReal);
    const afterRec = Math.max(0, preuReal - recCov);
    const pagatCov = Math.min(pagat, afterRec);
    const pendCov  = afterRec - pagatCov;
    const pBlue  = pagatCov / preuReal * 100;
    const pGrey  = pendCov  / preuReal * 100;
    const pGreen = recCov   / preuReal * 100;
    bar.innerHTML =
        `<div class="dist-seg" style="width:${pBlue}%;background:var(--blue);"></div>` +
        `<div class="dist-seg" style="width:${pGrey}%;background:repeating-linear-gradient(45deg,var(--text-secondary),var(--text-secondary) 3px,#fff 3px,#fff 7px);"></div>` +
        `<div class="dist-seg" style="width:${pGreen}%;background:var(--green);"></div>`;
}

// ============================================================
// SELECTOR D'ICONES
// ============================================================
function openIconPicker(id) {
    pickerTarget = id;
    const item    = costs.find(c => c.id === id) || revenues.find(r => r.id === id) || participants.find(p => p.id === id);
    const current = item?.icon ?? 'circle-dot';
    document.querySelectorAll('.icon-opt').forEach(b => b.classList.toggle('selected', b.dataset.icon === current));
    document.getElementById('iconPickerBackdrop').style.display = 'block';
    document.getElementById('iconPicker').style.display         = 'block';
}

function selectIcon(icon) {
    if (!pickerTarget) return;
    const isCost = costs.find(c => c.id === pickerTarget);
    const isRev  = revenues.find(r => r.id === pickerTarget);
    const isPart = participants.find(p => p.id === pickerTarget);
    const item   = isCost || isRev || isPart;
    const sel    = isCost ? `[data-cost-id="${pickerTarget}"]`
                 : isRev  ? `[data-rev-id="${pickerTarget}"]`
                 :           `[data-part-id="${pickerTarget}"]`;
    if (item) {
        item.icon = safeIcon(icon);
        const btn = document.querySelector(`${sel} .btn-icon-pick`);
        if (btn) { btn.innerHTML = `<i data-lucide="${item.icon}" style="width:16px;height:16px;"></i>`; lucide.createIcons(); }
    }
    closeIconPicker();
    saveValues();
}

function openAbout() {
    document.getElementById('aboutBackdrop').style.display = 'block';
    document.getElementById('aboutModal').style.display    = 'block';
}
function closeAbout() {
    document.getElementById('aboutBackdrop').style.display = 'none';
    document.getElementById('aboutModal').style.display    = 'none';
}

function closeIconPicker() {
    document.getElementById('iconPickerBackdrop').style.display = 'none';
    document.getElementById('iconPicker').style.display         = 'none';
    pickerTarget = null;
}

// ============================================================
// EMMAGATZEMATGE LOCAL
// ============================================================
const STORAGE_KEY = 'comptesclars_data';

function saveValues() {
    const data = {
        _titol:        (document.getElementById('titolActivitat').innerText || '').trim(),
        _quotesMode:   quotesMode,
        _participants: participants.map(p => ({ icon: p.icon, name: p.name, count: p.count })),
        _costs:        costs.map(c => ({ icon: c.icon, name: c.name, amount: c.amount })),
        _revenues:     revenues.map(r => ({ icon: r.icon, name: r.name, income: r.income, expense: r.expense })),
        _payments:     payments.map(p => ({ name: p.name, amount: p.amount })),
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(_) {}
}

function loadSavedValues() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
        const d = JSON.parse(raw);
        if (d._titol) { document.getElementById('titolActivitat').textContent = d._titol; document.title = d._titol + ' - ComptesClars'; }
        if (d._quotesMode) { quotesMode = d._quotesMode; _applyQuotesModeToggleUI(); }
        if (Array.isArray(d._participants) && d._participants.length > 0) {
            document.getElementById('participantsRows').innerHTML = ''; participants = [];
            d._participants.forEach(p => addParticipantRow(p, true));
        }
        if (Array.isArray(d._costs)    && d._costs.length    > 0) { document.getElementById('costsRows').innerHTML    = ''; costs    = []; d._costs.forEach(c => addCostRow(c, true)); }
        if (Array.isArray(d._revenues) && d._revenues.length > 0) { document.getElementById('revenuesRows').innerHTML = ''; revenues = []; d._revenues.forEach(r => addRevenueRow(r, true)); }
        if (Array.isArray(d._payments) && d._payments.length > 0) { document.getElementById('paymentsRows').innerHTML = ''; payments = []; d._payments.forEach(p => addPaymentRow(p, true)); }
        return true;
    } catch(e) { return false; }
}

// ============================================================
// CÀLCUL PRINCIPAL
// ============================================================
function updateAll() {
    const n        = Math.max(1, getParticipantTotal());
    const rec      = getRevenueNetTotal();
    const total    = getCostTotal();
    const net            = (total - rec) / n;
    const pagat          = getPaymentTotal();
    const netEfectiu     = Math.max(0, net);
    const surplusRec     = Math.max(0, -net);
    const surplusPag     = pagat > 0 ? Math.max(0, pagat - netEfectiu) : 0;
    const totalSurplus   = surplusRec + surplusPag;
    const pendentEfectiu = Math.max(0, netEfectiu - pagat);

    document.getElementById('totalParticipants').textContent = fmt(getParticipantTotal(), 0);
    document.getElementById('totalPagat').textContent        = fmt(pagat);
    document.getElementById('totalBrut').textContent         = fmt(total);
    document.getElementById('totalRecNet').textContent       = fmt(rec);

    const totalPagatProjecteRow = document.getElementById('totalPagatProjecteRow');
    if (quotesMode === 'projecte') {
        document.getElementById('totalPagat').textContent = fmt(pagat * n);
        document.getElementById('totalQuotesLabel').textContent = 'Total quotes';
        if (pagat > 0) {
            document.getElementById('totalQuotesSecLabel').textContent = 'Total quotes participant';
            document.getElementById('totalPagatProjecte').textContent = fmt(pagat);
            totalPagatProjecteRow.style.display = '';
        } else {
            totalPagatProjecteRow.style.display = 'none';
        }
    } else {
        document.getElementById('totalQuotesLabel').textContent = 'Total quotes';
        if (n > 1 && pagat > 0) {
            document.getElementById('totalQuotesSecLabel').textContent = 'Total quotes projecte';
            document.getElementById('totalPagatProjecte').textContent = fmt(pagat * n);
            totalPagatProjecteRow.style.display = '';
        } else {
            totalPagatProjecteRow.style.display = 'none';
        }
    }

    const hasData = total > 0 || rec > 0;
    const heroAPagarEuro  = document.getElementById('heroAPagarEuro');
    const heroPendentEl   = document.getElementById('heroPendent');
    const heroPendentEuro = document.getElementById('heroPendentEuro');

    if (!hasData) {
        document.getElementById('totalFinal').textContent   = '—';
        document.getElementById('preuReal').textContent     = '—';
        document.getElementById('estalviTotal').textContent = '—';
        document.getElementById('heroPagat').textContent    = '—';
        document.getElementById('heroPendentLeg').textContent = '—';
        heroAPagarEuro.style.visibility  = 'hidden';
        heroPendentEl.textContent        = '—';
        heroPendentEl.style.color        = 'var(--text-secondary)';
        heroPendentEuro.style.visibility = 'hidden';
        document.getElementById('heroPlanificat').textContent = pagat > 0 ? fmt(pagat) + ' €' : '—';
    } else {
        document.getElementById('totalFinal').textContent     = fmt(Math.max(0, net));
        document.getElementById('preuReal').textContent       = fmt(total / n) + ' €';
        document.getElementById('estalviTotal').textContent   = fmt(Math.min(rec / n, total / n)) + ' €';
        document.getElementById('heroPagat').textContent      = fmt(pagat) + ' €';
        document.getElementById('heroPendentLeg').textContent = fmt(pendentEfectiu) + ' €';
        heroAPagarEuro.style.visibility  = 'visible';
        const isSurplus = totalSurplus > 0;
        const heroColor = (isSurplus || pendentEfectiu === 0) ? 'var(--green)' : 'var(--text-secondary)';
        document.getElementById('heroPendentLabel').textContent = isSurplus ? 'A favor' : 'Pendent';
        heroPendentEl.textContent        = fmt(isSurplus ? totalSurplus : pendentEfectiu);
        heroPendentEl.style.color        = heroColor;
        heroPendentEuro.style.visibility = 'visible';
        heroPendentEuro.style.color      = heroColor;
        document.getElementById('heroPlanificat').textContent = fmt(pagat) + ' €';
    }

    // Hero projecte
    document.getElementById('projCostos').textContent         = total > 0 ? fmt(total) : '—';
    document.getElementById('projCostosEuro').style.visibility = total > 0 ? 'visible' : 'hidden';
    document.getElementById('projRec').textContent            = rec > 0 ? fmt(rec) : '—';
    document.getElementById('projRecEuro').style.visibility   = rec > 0 ? 'visible' : 'hidden';
    document.getElementById('projQuotes').textContent         = pagat > 0 ? fmt(pagat * n) : '—';
    document.getElementById('projQuotesEuro').style.visibility = pagat > 0 ? 'visible' : 'hidden';
    const projSurplus = totalSurplus * n;
    const projPendent = pendentEfectiu * n;
    const projIsSurplus = projSurplus > 0;
    const projColor = (projIsSurplus || projPendent === 0) && hasData ? 'var(--green)' : 'var(--text-secondary)';
    document.getElementById('projSaldoLabel').textContent  = projIsSurplus ? 'A favor' : 'Pendent';
    document.getElementById('projSaldoLabel').style.color  = projColor;
    document.getElementById('projSaldo').textContent       = hasData ? fmt(projIsSurplus ? projSurplus : projPendent) : '—';
    document.getElementById('projSaldo').style.color       = projColor;
    document.getElementById('projSaldoEuro').style.visibility = hasData ? 'visible' : 'hidden';
    document.getElementById('projSaldoEuro').style.color   = projColor;

    updateDistBar();
    updateHeroBar(total, rec, pagat, n);

    const aviso = document.getElementById('avisoExcedente');
    if (totalSurplus > 0) {
        aviso.classList.add('show');
        const bothSurplus = surplusRec > 0 && surplusPag > 0;
        let html;
        if (bothSurplus) {
            html = `<p class="alert-title">Costos coberts i pagaments a favor 🎉</p>` +
                   `<p class="alert-body">Superàvit de recaptació per participant: <strong>${fmt(surplusRec)} €</strong></p>` +
                   `<p class="alert-body">Pagament a favor per participant: <strong>${fmt(surplusPag)} €</strong></p>` +
                   `<p class="alert-body">Total a favor per participant: <strong>${fmt(totalSurplus)} €</strong></p>` +
                   `<p class="alert-body">Total a favor del projecte: <strong>${fmt(totalSurplus * n)} €</strong></p>`;
        } else if (surplusRec > 0) {
            html = `<p class="alert-title">La recaptació supera els costos 🎉</p>` +
                   `<p class="alert-body">Superàvit de recaptació per participant: <strong>${fmt(surplusRec)} €</strong></p>` +
                   `<p class="alert-body">Superàvit de recaptació del projecte: <strong>${fmt(surplusRec * n)} €</strong></p>`;
        } else {
            html = `<p class="alert-title">Pagaments coberts 🎉</p>` +
                   `<p class="alert-body">Els pagaments planificats cobreixen el cost.</p>` +
                   `<p class="alert-body">A favor per participant: <strong>${fmt(surplusPag)} €</strong></p>` +
                   `<p class="alert-body">A favor del projecte: <strong>${fmt(surplusPag * n)} €</strong></p>`;
        }
        document.getElementById('avisoContent').innerHTML = html;
    } else {
        aviso.classList.remove('show');
    }

    saveValues();
}

// ============================================================
// COPIAR RESUM
// ============================================================
function _copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }
    // Fallback: execCommand (HTTP, Firefox, Safari antics)
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve();
}

function copiarResum() {
    if (!costs.length && !revenues.length && !payments.length && !participants.length) return;
    const titol   = (document.getElementById('titolActivitat').innerText || '').trim() || 'Activitat';
    const n       = Math.max(1, getParticipantTotal());
    const rec     = getRevenueNetTotal();
    const total   = getCostTotal();
    const net            = (total - rec) / n;
    const pagat          = getPaymentTotal();
    const netEfectiu     = Math.max(0, net);
    const surplusRec     = Math.max(0, -net);
    const surplusPag     = pagat > 0 ? Math.max(0, pagat - netEfectiu) : 0;
    const totalSurplus   = surplusRec + surplusPag;
    const pendentEfectiu = Math.max(0, netEfectiu - pagat);

    const lines = [];

    // Capçalera
    lines.push(`*${titol}*`);
    lines.push('');

    // Participants
    const namedParts = participants.filter(p => p.name.trim() && p.count > 0);
    if (namedParts.length > 0) {
        lines.push('👥 *Participants*');
        namedParts.forEach(p => lines.push(`▸ ${p.name}: ${fmt(p.count, 0)}`));
        lines.push(`Total: ${fmt(n, 0)}`);
    } else {
        lines.push(`👥 ${n} participant${n !== 1 ? 's' : ''}`);
    }
    lines.push('');

    // Preu principal
    lines.push(`💶 *A pagar per participant: ${fmt(netEfectiu)} €*`);
    if (total > 0) lines.push(`▸ Cost real: ${fmt(total / n)} €`);
    if (rec > 0)   lines.push(`▸ Recaptació: ${fmt(rec / n)} €`);
    lines.push('');

    // Saldo a favor
    if (totalSurplus > 0) {
        const bothSurplus = surplusRec > 0 && surplusPag > 0;
        lines.push(`💚 *Saldo a favor: ${fmt(totalSurplus)} € per participant*`);
        if (bothSurplus) {
            lines.push(`▸ De recaptació: ${fmt(surplusRec)} €`);
            lines.push(`▸ De pagaments: ${fmt(surplusPag)} €`);
        }
        if (n > 1) lines.push(`Total a favor del projecte: ${fmt(totalSurplus * n)} €`);
        lines.push('');
    }

    // Pagaments
    if (payments.length > 0) {
        lines.push('📅 *Quotes:*');
        payments.forEach(p => lines.push(`▸ ${p.name || 'Pagament'}: ${fmt(p.amount)} €`));
        if (pendentEfectiu > 0) lines.push(`▸ Pendent: ${fmt(pendentEfectiu)} €`);
        lines.push(`Total per participant: ${fmt(pagat)} €`);
        if (n > 1) lines.push(`Total projecte: ${fmt(pagat * n)} €`);
    }

    // Recaptació (només si hi ha conceptes amb nom)
    const recNamed = revenues.filter(r => r.name.trim() && (r.income > 0 || r.expense > 0));
    if (recNamed.length > 0) {
        lines.push('');
        lines.push('🎯 *Recaptació:*');
        recNamed.forEach(r => lines.push(`▸ ${r.name}: ${fmt(r.income - r.expense)} €`));
        lines.push(`Total: ${fmt(rec)} €`);
    }

    // Costos
    const costsNamed = costs.filter(c => c.amount > 0);
    if (costsNamed.length > 0) {
        lines.push('');
        lines.push('📦 *Costos:*');
        costsNamed.forEach(c => lines.push(`▸ ${c.name || '—'}: ${fmt(c.amount)} €`));
        lines.push(`Total: ${fmt(total)} €`);
    }

    // Resum projecte
    if (total > 0 || rec > 0 || pagat > 0) {
        const projSurplus = totalSurplus * n;
        const projPendent = pendentEfectiu * n;
        const projIsSurplus = projSurplus > 0;
        lines.push('');
        lines.push('🗂 *Projecte*');
        if (total > 0)  lines.push(`▸ Costos: ${fmt(total)} €`);
        if (rec > 0)    lines.push(`▸ Recaptació: ${fmt(rec)} €`);
        if (pagat > 0)  lines.push(`▸ Quotes: ${fmt(pagat * n)} €`);
        if (projIsSurplus) lines.push(`Saldo a favor: ${fmt(projSurplus)} €`);
        else if (projPendent > 0) lines.push(`Pendent: ${fmt(projPendent)} €`);
    }

    lines.push('');
    lines.push('—');
    lines.push('_ComptesClars_');

    _copyToClipboard(lines.join('\n')).then(() => {
        _showToast('✓ Resum copiat');
        const btn = document.getElementById('btnCopiar');
        btn.innerHTML = '<i data-lucide="check" style="width:15px;height:15px;"></i>';
        btn.style.background = 'rgba(52,199,89,0.12)';
        btn.style.color = 'var(--green)';
        lucide.createIcons();
        setTimeout(() => {
            btn.innerHTML = '<i data-lucide="copy" style="width:15px;height:15px;"></i>';
            btn.style.background = 'rgba(0,0,0,0.05)';
            btn.style.color = 'var(--text-secondary)';
            lucide.createIcons();
        }, 2000);
    });
}

function compartirLink() {
    if (!costs.length && !revenues.length && !payments.length && !participants.length) return;
    const titol = (document.getElementById('titolActivitat').innerText || '').trim();
    const data  = {
        titol,
        participants: participants.map(p => ({ icon: p.icon, name: p.name, count: p.count })),
        costos:     costs.map(c => ({ icon: c.icon, name: c.name, amount: c.amount })),
        recaptacio: revenues.map(r => ({ icon: r.icon, name: r.name, income: r.income, expense: r.expense })),
        pagaments:  payments.map(p => ({ name: p.name, amount: p.amount }))
    };
    if (quotesMode !== 'participant') data.quotesMode = quotesMode;
    const json = JSON.stringify(data);
    let encoded;
    try { encoded = LZString.compressToEncodedURIComponent(json); } catch(_) {}
    if (!encoded) encoded = btoa(unescape(encodeURIComponent(json)));
    const url = location.origin + location.pathname + '?d=' + encoded;
    _copyToClipboard(url).then(() => {
        _showToast('✓ Enllaç copiat');
        const btn = document.getElementById('btnCompartirLink');
        btn.innerHTML = '<i data-lucide="check" style="width:15px;height:15px;"></i>';
        btn.style.background = 'rgba(52,199,89,0.12)';
        btn.style.color = 'var(--green)';
        lucide.createIcons();
        setTimeout(() => {
            btn.innerHTML = '<i data-lucide="link" style="width:15px;height:15px;"></i>';
            btn.style.background = 'rgba(0,0,0,0.05)';
            btn.style.color = 'var(--text-secondary)';
            lucide.createIcons();
        }, 2000);
    });
}

async function compartirLinkCurt() {
    if (!costs.length && !revenues.length && !payments.length && !participants.length) return;
    const btn = document.getElementById('btnCompartirLinkCurt');
    btn.innerHTML = '<i data-lucide="loader" style="width:15px;height:15px;"></i>';
    btn.style.background = 'rgba(0,0,0,0.05)';
    btn.style.color = 'var(--text-secondary)';
    lucide.createIcons();

    try {
        const titol = (document.getElementById('titolActivitat').innerText || '').trim();
        const data = {
            titol,
            participants: participants.map(p => ({ icon: p.icon, name: p.name, count: p.count })),
            costos:     costs.map(c => ({ icon: c.icon, name: c.name, amount: c.amount })),
            recaptacio: revenues.map(r => ({ icon: r.icon, name: r.name, income: r.income, expense: r.expense })),
            pagaments:  payments.map(p => ({ name: p.name, amount: p.amount }))
        };
        if (quotesMode !== 'participant') data.quotesMode = quotesMode;

        const res = await fetch('/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const { id } = await res.json();
        const url = location.origin + location.pathname + '?s=' + id;
        await _copyToClipboard(url);
        _showToast('✓ Enllaç copiat');
        btn.innerHTML = '<i data-lucide="check" style="width:15px;height:15px;"></i>';
        btn.style.background = 'rgba(52,199,89,0.12)';
        btn.style.color = 'var(--green)';
        lucide.createIcons();
        setTimeout(() => {
            btn.innerHTML = '<i data-lucide="link" style="width:15px;height:15px;"></i>';
            btn.style.background = 'rgba(0,0,0,0.05)';
            btn.style.color = 'var(--text-secondary)';
            lucide.createIcons();
        }, 2000);
    } catch (e) {
        _showToast('✗ Error: ' + (e.message || 'desconegut'));
        btn.innerHTML = '<i data-lucide="link" style="width:15px;height:15px;"></i>';
        btn.style.background = 'rgba(0,0,0,0.05)';
        btn.style.color = 'var(--text-secondary)';
        lucide.createIcons();
    }
}

// ============================================================
// DARK MODE
// ============================================================
const DARK_KEY = 'comptesclars_dark';

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode', !isDark);
    try { localStorage.setItem(DARK_KEY, isDark ? 'dark' : 'light'); } catch(_) {}
    const wrap = document.getElementById('menuDarkModeIconWrap');
    const label = document.getElementById('menuDarkModeText');
    if (wrap) {
        wrap.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}" style="width:15px;height:15px;"></i>`;
        lucide.createIcons();
    }
    if (label) label.textContent = isDark ? ' Mode clar' : ' Mode fosc';
}

function initDarkMode() {
    let mode = null;
    try { mode = localStorage.getItem(DARK_KEY); } catch(_) {}
    const isDark = mode === 'dark' || (mode === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.body.classList.add('dark-mode');
    const wrap = document.getElementById('menuDarkModeIconWrap');
    const label = document.getElementById('menuDarkModeText');
    if (wrap) wrap.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}" style="width:15px;height:15px;"></i>`;
    if (label) label.textContent = isDark ? ' Mode clar' : ' Mode fosc';
    lucide.createIcons();
}

// ============================================================
// MENÚ HEADER
// ============================================================
function toggleHeaderMenu() {
    const menu = document.getElementById('headerMenu');
    menu.classList.toggle('open');
}
function closeHeaderMenu() {
    document.getElementById('headerMenu').classList.remove('open');
}
document.addEventListener('click', function(e) {
    const menu = document.getElementById('headerMenu');
    if (menu && menu.classList.contains('open') && !menu.parentElement.contains(e.target)) {
        menu.classList.remove('open');
    }
});

// ============================================================
// EXPORTAR / IMPORTAR
// ============================================================
function exportarDades() {
    if (!costs.length && !revenues.length && !payments.length && !participants.length) return;
    const titol = (document.getElementById('titolActivitat').innerText || '').trim();
    const data  = {
        titol,
        participants: participants.map(p => ({ icon: p.icon, name: p.name, count: p.count })),
        costos:     costs.map(c => ({ icon: c.icon, name: c.name, amount: c.amount })),
        recaptacio: revenues.map(r => ({ icon: r.icon, name: r.name, income: r.income, expense: r.expense })),
        pagaments:  payments.map(p => ({ name: p.name, amount: p.amount }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    const ara  = new Date();
    const ts   = ara.getFullYear().toString() +
                 String(ara.getMonth()+1).padStart(2,'0') +
                 String(ara.getDate()).padStart(2,'0') + '-' +
                 String(ara.getHours()).padStart(2,'0') +
                 String(ara.getMinutes()).padStart(2,'0');
    const slug = (titol || '')
        .toLowerCase()
        .replace(/[àáâä]/g,'a').replace(/[èéêë]/g,'e').replace(/[ìíîï]/g,'i')
        .replace(/[òóôö]/g,'o').replace(/[ùúûü]/g,'u').replace(/[ç]/g,'c')
        .replace(/[ñ]/g,'n').replace(/·l/g,'l').replace(/[^a-z0-9]+/g,'-')
        .replace(/^-+|-+$/g,'');
    a.download = 'comptesclars' + (slug ? '_' + slug : '') + '_' + ts + '.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    _showToast('✓ Dades exportades');
}

const _iconPngCache = {};
async function _iconPng(iconName, color) {
    const key = iconName + color;
    if (_iconPngCache[key]) return _iconPngCache[key];
    const div = document.createElement('div');
    div.style.cssText = 'position:absolute;visibility:hidden;width:24px;height:24px;overflow:hidden;';
    div.innerHTML = `<i data-lucide="${iconName}" style="width:24px;height:24px;color:${color}"></i>`;
    document.body.appendChild(div);
    lucide.createIcons({ nodes: [div.querySelector('i')] });
    const svg = div.querySelector('svg');
    if (!svg) { document.body.removeChild(div); return null; }
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgStr = new XMLSerializer().serializeToString(svg);
    document.body.removeChild(div);
    const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = 24; c.height = 24;
            c.getContext('2d').drawImage(img, 0, 0, 24, 24);
            const dataUrl = c.toDataURL('image/png');
            _iconPngCache[key] = dataUrl;
            resolve(dataUrl);
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

async function exportarPDF() {
    if (!costs.length && !revenues.length && !payments.length && !participants.length) return;
    if (!window.jspdf) { _showToast('Error: jsPDF no disponible'); return; }

    // ── Valors computats ──────────────────────────────────────────────────────
    const titol        = (document.getElementById('titolActivitat').innerText || '').trim() || 'Activitat';
    const n            = Math.max(1, getParticipantTotal());
    const rec          = getRevenueNetTotal();
    const total        = getCostTotal();
    const net          = (total - rec) / n;
    const pagat        = getPaymentTotal();
    const netEfectiu   = Math.max(0, net);
    const surplusRec   = Math.max(0, -net);
    const surplusPag   = pagat > 0 ? Math.max(0, pagat - netEfectiu) : 0;
    const totalSurplus = surplusRec + surplusPag;
    const pendentEfectiu = Math.max(0, netEfectiu - pagat);

    // ── Filename ──────────────────────────────────────────────────────────────
    const ara  = new Date();
    const ts   = ara.getFullYear().toString() +
                 String(ara.getMonth()+1).padStart(2,'0') +
                 String(ara.getDate()).padStart(2,'0') + '-' +
                 String(ara.getHours()).padStart(2,'0') +
                 String(ara.getMinutes()).padStart(2,'0');
    const slug = (titol === 'Activitat' ? '' : titol)
        .toLowerCase()
        .replace(/[àáâä]/g,'a').replace(/[èéêë]/g,'e').replace(/[ìíîï]/g,'i')
        .replace(/[òóôö]/g,'o').replace(/[ùúûü]/g,'u').replace(/[ç]/g,'c')
        .replace(/[ñ]/g,'n').replace(/·l/g,'l').replace(/[^a-z0-9]+/g,'-')
        .replace(/^-+|-+$/g,'');
    const filename = 'comptesclars' + (slug ? '_' + slug : '') + '_' + ts + '.pdf';

    // ── jsPDF setup ───────────────────────────────────────────────────────────
    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const PW   = 210;   // page width
    const PH   = 297;   // page height
    const CW   = 95;    // content width (centered, ~mobile width)
    const ML   = (PW - CW) / 2;  // left margin (~57.5mm)
    const XR   = ML + CW;        // right edge x
    let y      = 0;

    // Colors
    const BLUE  = [0,   122, 255];
    const GREEN = [52,  199, 89];
    const RED   = [255, 59,  48];
    const TEXT  = [28,  28,  30];
    const GREY  = [142, 142, 147];
    const LINE  = [220, 220, 225];

    // ── Helpers ───────────────────────────────────────────────────────────────
    function nl(h) {
        y += h;
        if (y > PH - 16) { doc.addPage(); y = 16; }
    }
    function hr(before = 3, after = 4) {
        y += before;
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.25);
        doc.line(ML, y, XR, y);
        y += after;
    }
    function sectionTitle(text) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GREY);
        doc.text(text.toUpperCase(), ML, y);
        nl(6);
    }
    function rowLR(label, value, vColor, size = 9, xOffset = 0) {
        doc.setFontSize(size);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GREY);
        doc.text(label, ML + xOffset, y, { maxWidth: CW * 0.6 - xOffset });
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...(vColor || TEXT));
        doc.text(value, XR, y, { align: 'right' });
    }
    function rowTotal(label, value, vColor) {
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.2);
        doc.line(ML, y, XR, y);
        y += 3;
        rowLR(label, value, vColor, 8.5);
    }

    // ── HEADER ────────────────────────────────────────────────────────────────
    y = 15;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GREY);
    doc.text('ComptesClars', ML, y);
    doc.text(ara.toLocaleDateString('ca-ES', { day:'2-digit', month:'long', year:'numeric' }), XR, y, { align:'right' });
    nl(10);

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT);
    doc.text(titol, ML, y);
    nl(10);

    // ── HERO PARTICIPANT ──────────────────────────────────────────────────────
    doc.setFillColor(240, 247, 255);
    doc.roundedRect(ML, y, CW, 30, 3, 3, 'F');
    y += 8;

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT);
    doc.text(fmt(netEfectiu) + ' €', ML + 5, y);

    const isSurplus  = totalSurplus > 0;
    const pendLabel  = isSurplus ? 'A favor' : 'Pendent';
    const pendVal    = isSurplus ? totalSurplus : pendentEfectiu;
    const pendColor  = (isSurplus || pendentEfectiu === 0) ? GREEN : GREY;
    doc.setTextColor(...pendColor);
    doc.text(fmt(pendVal) + ' €', XR - 5, y, { align: 'right' });
    nl(6);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GREY);
    doc.text('A PAGAR', ML + 5, y);
    doc.text(pendLabel.toUpperCase(), XR - 5, y, { align: 'right' });
    nl(5);

    doc.setFontSize(8);
    doc.setTextColor(...BLUE);
    doc.text('Quotes: ' + fmt(pagat) + ' €', ML + 5, y);
    doc.setTextColor(...GREY);
    doc.text('Preu real: ' + fmt(total / n) + ' €', XR - 5, y, { align: 'right' });
    nl(12);

    // ── ALERTA SURPLUS ────────────────────────────────────────────────────────
    if (totalSurplus > 0) {
        doc.setFillColor(240, 255, 244);
        doc.roundedRect(ML, y, CW, 12, 2, 2, 'F');
        doc.setDrawColor(...GREEN);
        doc.setLineWidth(0.8);
        doc.line(ML, y, ML, y + 12);
        y += 4.5;
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 122, 58);
        const txt = (surplusRec > 0 && surplusPag > 0)
            ? 'Costos coberts i pagaments a favor · ' + fmt(totalSurplus) + ' € a favor'
            : surplusRec > 0
            ? 'La recaptació supera els costos · ' + fmt(totalSurplus) + ' € a favor'
            : 'Pagaments coberts · ' + fmt(totalSurplus) + ' € a favor';
        doc.text(txt, ML + 4, y);
        nl(10);
    }

    // ── TOTALS PROJECTE ───────────────────────────────────────────────────────
    hr();
    sectionTitle('Projecte');

    [
        { label: 'Costos',     val: total > 0 ? fmt(total) + ' €' : '—', color: RED,   x: ML,        align: 'left'   },
        { label: 'Recaptació', val: rec > 0   ? fmt(rec)   + ' €' : '—', color: GREEN, x: ML + CW/2, align: 'center' },
        { label: 'Quotes',     val: pagat > 0 ? fmt(pagat * n) + ' €' : '—', color: BLUE, x: XR,     align: 'right'  },
    ].forEach(c => {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GREY);
        doc.text(c.label.toUpperCase(), c.x, y, { align: c.align });
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...c.color);
        doc.text(c.val, c.x, y + 6, { align: c.align });
    });
    nl(12);

    const projSurp   = totalSurplus * n;
    const projPend   = pendentEfectiu * n;
    const projIsSurp = projSurp > 0;
    rowLR(
        (projIsSurp ? 'A favor del projecte' : 'Pendent del projecte'),
        fmt(projIsSurp ? projSurp : projPend) + ' €',
        (projIsSurp || projPend === 0) && (total > 0 || rec > 0) ? GREEN : GREY
    );
    nl(8);

    // ── PARTICIPANTS ──────────────────────────────────────────────────────────
    if (participants.length > 0) {
        hr();
        sectionTitle('Participants');
        for (const p of participants) {
            const ico = await _iconPng(p.icon, '#8E8E93');
            if (ico) doc.addImage(ico, 'PNG', ML, y - 3.5, 3.5, 3.5);
            rowLR(p.name || '—', fmt(p.count, 0) + ' persones', TEXT, 9, ico ? 5 : 0);
            nl(6);
        }
        rowTotal('Total', fmt(n, 0) + ' persones', TEXT);
        nl(8);
    }

    // ── QUOTES ────────────────────────────────────────────────────────────────
    if (payments.length > 0) {
        hr();
        sectionTitle('Quotes');
        payments.forEach(p => {
            const displayAmt = quotesMode === 'projecte' ? p.amount * n : p.amount;
            rowLR(p.name || '—', fmt(displayAmt) + ' €', BLUE);
            nl(6);
        });
        rowTotal('Total quotes', fmt(pagat * n) + ' €', BLUE);
        nl(8);
    }

    // ── RECAPTACIÓ ────────────────────────────────────────────────────────────
    const recRows = revenues.filter(r => r.name.trim() && (r.income > 0 || r.expense > 0));
    if (recRows.length > 0) {
        hr();
        sectionTitle('Recaptació');
        for (const r of recRows) {
            const netR = r.income - r.expense;
            const ico = await _iconPng(r.icon, '#8E8E93');
            if (ico) doc.addImage(ico, 'PNG', ML, y - 3.5, 3.5, 3.5);
            rowLR(r.name, fmt(netR) + ' €', netR < 0 ? RED : GREEN, 9, ico ? 5 : 0);
            nl(6);
        }
        rowTotal('Total net recaptat', fmt(rec) + ' €', GREEN);
        nl(8);
    }

    // ── COSTOS ────────────────────────────────────────────────────────────────
    const costRows = costs.filter(c => c.amount > 0);
    if (costRows.length > 0) {
        hr();
        sectionTitle('Costos');
        for (const c of costRows) {
            const ico = await _iconPng(c.icon, '#8E8E93');
            if (ico) doc.addImage(ico, 'PNG', ML, y - 3.5, 3.5, 3.5);
            rowLR(c.name || '—', fmt(c.amount) + ' €', RED, 9, ico ? 5 : 0);
            nl(6);
        }
        rowTotal('Total costos', fmt(total) + ' €', RED);
        nl(8);
    }

    // ── FOOTER ────────────────────────────────────────────────────────────────
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GREY);
    doc.text('ComptesClars · comptesclars.pages.dev · by hrodres', PW / 2, PH - 10, { align: 'center' });

    doc.save(filename);
    _showToast('✓ PDF exportat');
}

function importarDades(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        event.target.value = '';
        try {
            const d = JSON.parse(e.target.result);
            document.getElementById('costsRows').innerHTML        = ''; costs        = [];
            document.getElementById('revenuesRows').innerHTML     = ''; revenues     = [];
            document.getElementById('paymentsRows').innerHTML     = ''; payments     = [];
            document.getElementById('participantsRows').innerHTML = ''; participants = [];
            if (d.titol) { document.getElementById('titolActivitat').textContent = d.titol; document.title = d.titol + ' - ComptesClars'; }
            if (d.quotesMode) { quotesMode = d.quotesMode; } else { quotesMode = 'participant'; }
            _applyQuotesModeToggleUI();
            if (Array.isArray(d.participants) && d.participants.length > 0) {
                d.participants.forEach(p => addParticipantRow(p, true));
            }
            if (Array.isArray(d.costos))     d.costos.forEach(c => addCostRow(c, true));
            if (Array.isArray(d.recaptacio)) d.recaptacio.forEach(r => addRevenueRow(r, true));
            if (Array.isArray(d.pagaments))  d.pagaments.forEach(p => addPaymentRow(p, true));
            updateAll(); saveValues();
            _showToast('✓ Dades importades');
        } catch(err) {
            _showToast('Error: fitxer no vàlid');
        }
    };
    reader.onerror = function() { event.target.value = ''; _showToast('Error: fitxer no vàlid'); };
    reader.readAsText(file);
}

// ============================================================
// REINICIAR
// ============================================================
function confirmReset() {
    closeHeaderMenu();
    _resetSnapshot = {
        titol:        document.getElementById('titolActivitat').innerText,
        quotesMode,
        participants: participants.map(p => ({ ...p })),
        costos:       costs.map(c => ({ ...c })),
        recaptacio:   revenues.map(r => ({ ...r })),
        pagaments:    payments.map(p => ({ ...p }))
    };
    document.getElementById('titolActivitat').textContent = '';
    document.title = 'ComptesClars';
    quotesMode = 'participant'; _applyQuotesModeToggleUI();
    document.getElementById('participantsRows').innerHTML = ''; participants = [];
    document.getElementById('costsRows').innerHTML        = ''; costs        = [];
    document.getElementById('revenuesRows').innerHTML     = ''; revenues     = [];
    document.getElementById('paymentsRows').innerHTML     = ''; payments     = [];
    updateAll();
    _showToast('Dades reiniciades', true);
}

// ============================================================
// INICI
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('iconGrid');
    ICONS.forEach(icon => {
        const btn = document.createElement('button');
        btn.className = 'icon-opt';
        btn.dataset.icon = icon;
        btn.setAttribute('aria-label', icon);
        btn.onclick = () => selectIcon(icon);
        btn.innerHTML = `<i data-lucide="${icon}" style="width:18px;height:18px;"></i>`;
        grid.appendChild(btn);
    });
    initDarkMode();
    lucide.createIcons();

    const titol = document.getElementById('titolActivitat');
    function syncTitol() {
        const text = (titol.innerText || '').trim();
        document.title = text ? text + ' - ComptesClars' : 'ComptesClars';
        saveValues();
    }
    titol.addEventListener('input',   syncTitol);
    titol.addEventListener('blur',    syncTitol);
    titol.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); titol.blur(); } });

    function _applySharedData(d) {
        costs = []; revenues = []; payments = []; participants = [];
        document.getElementById('costsRows').innerHTML        = '';
        document.getElementById('revenuesRows').innerHTML     = '';
        document.getElementById('paymentsRows').innerHTML     = '';
        document.getElementById('participantsRows').innerHTML = '';
        if (d.titol) document.getElementById('titolActivitat').innerText = d.titol;
        if (d.quotesMode) { quotesMode = d.quotesMode; _applyQuotesModeToggleUI(); }
        if (Array.isArray(d.participants) && d.participants.length > 0) {
            d.participants.forEach(p => addParticipantRow(p, true));
        }
        if (Array.isArray(d.costos))     d.costos.forEach(c => addCostRow(c, true));
        if (Array.isArray(d.recaptacio)) d.recaptacio.forEach(r => addRevenueRow(r, true));
        if (Array.isArray(d.pagaments))  d.pagaments.forEach(p => addPaymentRow(p, true));
    }

    const _sMatch = location.search.match(/[?&]s=([^&]*)/);
    const shortId = _sMatch ? _sMatch[1] : null;

    const _dMatch = location.search.match(/[?&]d=([^&]*)/);
    const urlParam = _dMatch ? _dMatch[1] : null;

    if (shortId) {
        fetch('/share/' + shortId)
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(d => {
                _applySharedData(d);
                saveValues();
                updateAll();
            })
            .catch(() => {
                _showToast('✗ Enllaç no trobat o caducat');
                loadSavedValues();
                updateAll();
            });
    } else if (urlParam) {
        let urlLoaded = false;
        try {
            let jsonStr = typeof LZString !== 'undefined'
                ? LZString.decompressFromEncodedURIComponent(urlParam)
                : null;
            if (!jsonStr) jsonStr = decodeURIComponent(escape(atob(urlParam)));
            const d = JSON.parse(jsonStr);
            _applySharedData(d);
            urlLoaded = true;
        } catch(_) {}
        if (urlLoaded) {
            history.replaceState(null, '', location.pathname);
            saveValues();
        } else {
            loadSavedValues();
        }
        updateAll();
    } else {
        loadSavedValues();
        updateAll();
    }
});
