// ============================================================
// TIPUS I CONSTANTS
// ============================================================
/** @typedef {{ id:string, icon:string, name:string, amount:number }} Cost */
/** @typedef {{ id:string, icon:string, name:string, income:number, expense:number }} Revenue */
/** @typedef {{ id:string, name:string, amount:number }} Payment */

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
/** @type {Cost[]}    */ let costs    = [];
/** @type {Revenue[]} */ let revenues = [];
/** @type {Payment[]} */ let payments = [];
let pickerTarget  = null;
let _deletedEntry = null; // { type:'cost'|'rev', item, idx }
let _undoTimer    = null;
let _uid = 0;
function uid() { return 'u' + (++_uid); }

const FIELDS = [
    { id: 'numNinos', type: 'int' },
];

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
    _showUndoToast('Cost');
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
    _showUndoToast('Recaptació');
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
            <div class="field-wrap rev-net-wrap">
                <span class="rev-net${net < 0 ? ' negative' : ''}${item.income === 0 && item.expense === 0 ? ' zero' : ''}" id="revNet_${item.id}">${fmt(net)}</span>
                <span class="euro" id="revNetEuro_${item.id}" style="color:${item.income === 0 && item.expense === 0 ? 'rgba(52,199,89,0.3)' : net < 0 ? 'var(--red)' : 'var(--green)'};">€</span>
            </div>
        </div>`;
    _attachDragDrop(div, item.id, revenues, rerenderRevenueRows);
    document.getElementById('revenuesRows').appendChild(div);
    lucide.createIcons();
}

// ============================================================
// DRAG & DROP (compartit entre costos i recaptació)
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
// UNDO TOAST
// ============================================================
function _showUndoToast(label) {
    clearTimeout(_undoTimer);
    document.getElementById('undoToastLabel').textContent = label + ' eliminat';
    document.getElementById('undoToast').classList.add('show');
    _undoTimer = setTimeout(() => {
        document.getElementById('undoToast').classList.remove('show');
        _deletedEntry = null;
    }, 4000);
}

function undoDelete() {
    if (!_deletedEntry) return;
    clearTimeout(_undoTimer);
    document.getElementById('undoToast').classList.remove('show');
    const { type, item, idx } = _deletedEntry;
    _deletedEntry = null;
    if (type === 'cost')      { costs.splice(idx, 0, item);    rerenderCostRows(); }
    else if (type === 'rev')  { revenues.splice(idx, 0, item); rerenderRevenueRows(); }
    else                      { payments.splice(idx, 0, item); rerenderPaymentRows(); }
    updateAll();
}

// ============================================================
// PAGAMENTS DINÀMICS
// ============================================================
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
    _showUndoToast('Pagament');
}

function updatePaymentName(id, value) {
    const item = payments.find(p => p.id === id);
    if (item) { item.name = value; saveValues(); }
}

function updatePaymentAmount(id, rawValue) {
    const item = payments.find(p => p.id === id);
    if (item) { item.amount = parseInput(rawValue); updateAll(); }
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
                   value="${item.amount ? fmt(item.amount,2) : ''}"
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

// ============================================================
// SELECTOR D'ICONES
// ============================================================
function openIconPicker(id) {
    pickerTarget = id;
    const item    = costs.find(c => c.id === id) || revenues.find(r => r.id === id);
    const current = item?.icon ?? 'circle-dot';
    document.querySelectorAll('.icon-opt').forEach(b => b.classList.toggle('selected', b.dataset.icon === current));
    document.getElementById('iconPickerBackdrop').style.display = 'block';
    document.getElementById('iconPicker').style.display         = 'block';
}

function selectIcon(icon) {
    if (!pickerTarget) return;
    const isCost = costs.find(c => c.id === pickerTarget);
    const item   = isCost || revenues.find(r => r.id === pickerTarget);
    const sel    = isCost ? `[data-cost-id="${pickerTarget}"]` : `[data-rev-id="${pickerTarget}"]`;
    if (item) {
        item.icon = safeIcon(icon);
        const btn = document.querySelector(`${sel} .btn-icon-pick`);
        if (btn) { btn.innerHTML = `<i data-lucide="${item.icon}" style="width:16px;height:16px;"></i>`; lucide.createIcons(); }
    }
    closeIconPicker();
    saveValues();
}

function closeIconPicker() {
    document.getElementById('iconPickerBackdrop').style.display = 'none';
    document.getElementById('iconPicker').style.display         = 'none';
    pickerTarget = null;
}

// ============================================================
// COOKIES
// ============================================================
const COOKIE_CONSENT_KEY = 'excursio6_consent';
const COOKIE_DATA_KEY    = 'excursio6_data';
const COOKIE_DAYS        = 365;

function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax;Secure`;
}

function getCookie(name) {
    return document.cookie.split('; ').reduce((acc, c) => {
        const [k, v] = c.split('=');
        return k === name ? decodeURIComponent(v) : acc;
    }, null);
}

function hasConsent() { return getCookie(COOKIE_CONSENT_KEY) === 'yes'; }

function acceptCookies() { setCookie(COOKIE_CONSENT_KEY, 'yes', COOKIE_DAYS); hideCookieBanner(); showCookieSettingsBtn(); saveValues(); }
function declineCookies() { setCookie(COOKIE_CONSENT_KEY, 'no', 90); hideCookieBanner(); showCookieSettingsBtn(); }
function hideCookieBanner()     { document.getElementById('cookieBanner').classList.add('hidden-banner'); }
function showCookieBanner()     { document.getElementById('cookieBanner').classList.remove('hidden-banner'); document.getElementById('cookieSettingsBtn').style.display = 'none'; }
function showCookieSettingsBtn(){ document.getElementById('cookieSettingsBtn').style.display = 'flex'; }

function saveValues() {
    if (!hasConsent()) return;
    const data = {};
    FIELDS.forEach(f => { data[f.id] = readVal(f.id); });
    data._titol    = (document.getElementById('titolActivitat').innerText || '').trim();
    data._costs    = costs.map(c => ({ icon: c.icon, name: c.name, amount: c.amount }));
    data._revenues = revenues.map(r => ({ icon: r.icon, name: r.name, income: r.income, expense: r.expense }));
    data._payments = payments.map(p => ({ name: p.name, amount: p.amount }));
    setCookie(COOKIE_DATA_KEY, JSON.stringify(data), COOKIE_DAYS);
}

function loadSavedValues() {
    const raw = getCookie(COOKIE_DATA_KEY);
    if (!raw) return false;
    try {
        const d = JSON.parse(raw);
        FIELDS.forEach(f => {
            const v = d[f.id];
            if (v !== undefined && v !== 0) { const el = document.getElementById(f.id); el.value = v; formatField(el, f.type); }
        });
        if (d._titol) { document.getElementById('titolActivitat').textContent = d._titol; document.title = d._titol + ' - ComptesClars'; }
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
    const n        = Math.max(1, Math.round(readVal('numNinos')) || 1);
    const rec      = getRevenueNetTotal();
    const total    = getCostTotal();
    const net      = (total - rec) / n;
    const pagat    = getPaymentTotal();
    const pendent  = net - pagat;

    const numNinosEl = document.getElementById('numNinos');
    numNinosEl.classList.toggle('invalid', !!numNinosEl.dataset.dirty && readVal('numNinos') === 0);

    document.getElementById('totalPagat').textContent    = fmt(pagat);
    document.getElementById('totalBrut').textContent     = fmt(total);
    document.getElementById('totalRecNet').textContent   = fmt(rec);

    const hasData = total > 0 || rec > 0;
    const heroAPagarEuro  = document.getElementById('heroAPagarEuro');
    const heroPendentEl   = document.getElementById('heroPendent');
    const heroPendentEuro = document.getElementById('heroPendentEuro');

    if (!hasData) {
        document.getElementById('totalFinal').textContent = '—';
        document.getElementById('preuReal').textContent   = '—';
        document.getElementById('estalviTotal').textContent = '0,00 €';
        heroAPagarEuro.style.visibility  = 'hidden';
        heroPendentEl.textContent        = '—';
        heroPendentEl.style.color        = 'var(--text-secondary)';
        heroPendentEuro.style.visibility = 'hidden';
        document.getElementById('heroPlanificat').textContent = pagat > 0 ? fmt(pagat) + ' €' : '—';
    } else {
        document.getElementById('totalFinal').textContent   = fmt(Math.max(0, net));
        document.getElementById('preuReal').textContent     = fmt(total / n) + ' €';
        document.getElementById('estalviTotal').textContent = fmt(rec / n) + ' €';
        heroAPagarEuro.style.visibility  = 'visible';
        const pendentColor = (pendent <= 0 && net > 0) ? 'var(--green)' : 'var(--blue)';
        heroPendentEl.textContent        = fmt(Math.max(0, pendent));
        heroPendentEl.style.color        = pendentColor;
        heroPendentEuro.style.visibility = 'visible';
        heroPendentEuro.style.color      = pendentColor;
        document.getElementById('heroPlanificat').textContent = fmt(pagat) + ' €';
    }

    updateDistBar();

    const brut = total / n;
    const percEstalvi = brut > 0 ? Math.min(100, (rec / n) / brut * 100) : 0;
    document.getElementById('barEstalvi').style.width = percEstalvi + '%';

    const aviso = document.getElementById('avisoExcedente');
    if (pendent < 0) {
        aviso.classList.add('show');
        document.getElementById('excedentPerFamilia').textContent = fmt(Math.abs(pendent)) + ' €';
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
    const titol   = (document.getElementById('titolActivitat').innerText || '').trim() || 'Activitat';
    const n       = Math.max(1, Math.round(readVal('numNinos')) || 1);
    const rec     = getRevenueNetTotal();
    const total   = getCostTotal();
    const net     = (total - rec) / n;
    const pagat   = getPaymentTotal();
    const pendent = Math.max(0, net - pagat);

    const lines = [];

    // Capçalera
    lines.push(`*${titol}*`);
    lines.push(`👥 ${n} alumne${n !== 1 ? 's' : ''}`);
    lines.push('');

    // Preu principal
    lines.push(`💶 *A pagar per alumne: ${fmt(net)} €*`);
    if (rec > 0) lines.push(`Cost brut ${fmt(total / n)} € − ${fmt(rec / n)} € de recaptació`);
    lines.push('');

    // Pagaments
    if (payments.length > 0) {
        lines.push('📅 *Pagaments planificats:*');
        payments.forEach(p => lines.push(`▸ ${p.name || 'Pagament'}: ${fmt(p.amount)} €`));
        if (pendent > 0) lines.push(`▸ Pendent: ${fmt(pendent)} €`);
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

    _copyToClipboard(lines.join('\n')).then(() => {
        const btn = document.getElementById('btnCopiar');
        btn.innerHTML = '<i data-lucide="check" style="width:15px;height:15px;"></i>';
        btn.style.background = 'rgba(52,199,89,0.12)';
        btn.style.color = 'var(--green)';
        lucide.createIcons();
        setTimeout(() => {
            btn.innerHTML = '<i data-lucide="share-2" style="width:15px;height:15px;"></i>';
            btn.style.background = 'rgba(0,122,255,0.08)';
            btn.style.color = 'var(--blue)';
            lucide.createIcons();
        }, 2000);
    });
}

// ============================================================
// EXPORTAR / IMPORTAR
// ============================================================
function exportarDades() {
    const titol = (document.getElementById('titolActivitat').innerText || '').trim();
    const data  = {
        titol,
        alumnes:    readVal('numNinos') || 0,
        costos:     costs.map(c => ({ icon: c.icon, name: c.name, amount: c.amount })),
        recaptacio: revenues.map(r => ({ icon: r.icon, name: r.name, income: r.income, expense: r.expense })),
        pagaments:  payments.map(p => ({ name: p.name, amount: p.amount }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = (titol || 'comptesclars').toLowerCase().replace(/\s+/g, '-') + '.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

function importarDades(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        event.target.value = '';
        try {
            const d = JSON.parse(e.target.result);
            document.getElementById('costsRows').innerHTML    = ''; costs    = [];
            document.getElementById('revenuesRows').innerHTML = ''; revenues = [];
            document.getElementById('paymentsRows').innerHTML = ''; payments = [];
            FIELDS.forEach(f => { document.getElementById(f.id).value = ''; });
            if (d.titol)   { document.getElementById('titolActivitat').textContent = d.titol; document.title = d.titol + ' - ComptesClars'; }
            if (d.alumnes) { const el = document.getElementById('numNinos'); el.value = d.alumnes; formatField(el, 'int'); }
            if (Array.isArray(d.costos))     d.costos.forEach(c => addCostRow(c, true));
            if (Array.isArray(d.recaptacio)) d.recaptacio.forEach(r => addRevenueRow(r, true));
            if (Array.isArray(d.pagaments))  d.pagaments.forEach(p => addPaymentRow(p, true));
            updateAll(); saveValues();
            _showImportToast(true);
        } catch(err) {
            _showImportToast(false);
        }
    };
    reader.onerror = function() { event.target.value = ''; _showImportToast(false); };
    reader.readAsText(file);
}

function _showImportToast(ok) {
    const toast = document.getElementById('undoToast');
    const label = document.getElementById('undoToastLabel');
    label.textContent = ok ? 'Dades carregades correctament' : 'Error: fitxer no vàlid';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// REINICIAR
// ============================================================
let _resetTimer = null;
function confirmReset() {
    const btn = document.getElementById('btnReiniciar');
    if (_resetTimer) {
        clearTimeout(_resetTimer);
        _resetTimer = null;
        _resetBtnNormal(btn);
        resetToDefaults();
        return;
    }
    btn.style.background = 'rgba(255,59,48,0.1)';
    btn.style.borderColor = 'rgba(255,59,48,0.3)';
    btn.style.color       = 'var(--red)';
    btn.innerHTML = '<i data-lucide="alert-triangle" style="width:14px;height:14px;"></i> Segur?';
    lucide.createIcons();
    _resetTimer = setTimeout(() => { _resetTimer = null; _resetBtnNormal(btn); }, 3000);
}
function _resetBtnNormal(btn) {
    btn.style.background  = 'rgba(255,255,255,0.8)';
    btn.style.borderColor = 'rgba(0,0,0,0.08)';
    btn.style.color       = '#555';
    btn.innerHTML = '<i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> Reiniciar';
    lucide.createIcons();
}
function resetToDefaults() {
    FIELDS.forEach(f => { document.getElementById(f.id).value = ''; });
    document.getElementById('titolActivitat').textContent = '';
    document.title = 'ComptesClars';
    document.getElementById('costsRows').innerHTML    = ''; costs    = [];
    document.getElementById('revenuesRows').innerHTML = ''; revenues = [];
    document.getElementById('paymentsRows').innerHTML = ''; payments = [];
    updateAll();
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
    lucide.createIcons();

    FIELDS.forEach(f => {
        const el = document.getElementById(f.id);
        el.addEventListener('focus',   () => focusField(el));
        el.addEventListener('input',   updateAll);
        el.addEventListener('blur',    () => { el.dataset.dirty = 'true'; formatField(el, f.type); updateAll(); });
        el.addEventListener('keydown', e => { if (e.key === 'Enter') el.blur(); });
    });

    const titol = document.getElementById('titolActivitat');
    function syncTitol() {
        const text = (titol.innerText || '').trim();
        document.title = text ? text + ' - ComptesClars' : 'ComptesClars';
        saveValues();
    }
    titol.addEventListener('input',   syncTitol);
    titol.addEventListener('blur',    syncTitol);
    titol.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); titol.blur(); } });

    const consent = getCookie(COOKIE_CONSENT_KEY);
    if (consent !== null) {
        hideCookieBanner();
        showCookieSettingsBtn();
        if (consent === 'yes') loadSavedValues();
    }

    updateAll();
});
