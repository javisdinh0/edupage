// Cấu hình từng lớp do trang index.html khai báo (window.DONGPHUC = { lop, namHoc, gasUrl, chung }).
const CFG = window.DONGPHUC || {};
const CHUNG = CFG.chung || '.';
const GAS_WEB_APP_URL = CFG.gasUrl || '';

const SIZES = ['Số 5', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL'];

// size: true = chọn size; false = chỉ chọn số lượng (may đo)
const ITEMS = [
    { key: 'ao_len_dai', name: 'Áo len dài tay', unit: 'chiếc', img: CHUNG + '/anh/ao-len-dai.jpg', size: true, table: 'ao', shift: -1, note: 'Đăng ký nhỏ đi 1 size so với các loại áo đồng phục khác.' },
    { key: 'gile_len', name: 'Áo gile len', unit: 'chiếc', img: CHUNG + '/anh/gile-len.jpg', size: true, table: 'ao', shift: -1, note: 'Đăng ký nhỏ đi 1 size so với các loại áo đồng phục khác.' },
    { key: 'gile_vai', name: 'Áo gile (vải)', unit: 'chiếc', img: CHUNG + '/anh/gile-vai.jpg', size: true, table: 'ao' },
    { key: 'bo_ni', name: 'Bộ nỉ mùa đông', unit: 'bộ', img: CHUNG + '/anh/bo-ni.jpg', size: true, table: 'ni' },
    { key: 'vest', name: 'Áo vest (may đo)', unit: 'chiếc', img: CHUNG + '/anh/vest.jpg', size: false, def: 1, max: 2, note: 'Bắt buộc, mỗi học sinh thường 1 áo. Chỉ chọn số lượng — nhà may sẽ đến đo trực tiếp.' }
];

// ===== Bảng tra (số liệu từ bảng size của nhà cung cấp, đơn vị cm / kg) =====
const HW_TABLE = [
    ['Số 5', '140-145', '40-45'], ['XS', '140-145', '45-50'], ['S', '150-155', '50-55'], ['M', '158-160', '55-60'],
    ['L', '165-170', '60-65'], ['XL', '172-176', '65-70'], ['2XL', '178-180', '70-75'], ['3XL', '178-180', '75-80'],
    ['4XL', '178-180', '80-85'], ['5XL', '178-180', '85-90'], ['6XL', '178-180', '90-95'], ['7XL', '178-180', '95-100']
];
// size, dài áo, vòng ngực, vai
const AO_TABLE = [
    ['Số 5', 55, 70, 33], ['XS', 60, 76, 36], ['S', 64, 80, 36], ['M', 66, 86, 38], ['L', 68, 90, 40], ['XL', 70, 94, 42],
    ['2XL', 72, 98, 44], ['3XL', 73, 102, 46], ['4XL', 75, 106, 48], ['5XL', 77, 110, 50], ['6XL', 80, 114, 52], ['7XL', 80, 118, 54]
];
// size, vòng ngực, vai, dài quần, vòng bụng, vòng mông
const NI_TABLE = [
    ['Số 5', 70, 33, 80, 64, 70], ['XS', 76, 36, 92, 72, 80], ['S', 80, 36, 94, 76, 84], ['M', 86, 38, 95, 80, 88],
    ['L', 90, 40, 97, 84, 92], ['XL', 94, 42, 98, 88, 96], ['2XL', 98, 44, 100, 92, 100], ['3XL', 102, 48, 101, 96, 104],
    ['4XL', 106, 48, 102, 100, 108], ['5XL', 110, 50, 102, 104, 112], ['6XL', 114, 52, 106, 108, 116], ['7XL', 118, 54, 108, 112, 118]
];
const TABLES = {
    ao: { head: ['Size', 'Dài áo', 'Vòng ngực', 'Vai'], rows: AO_TABLE },
    ni: { head: ['Size', 'Vòng ngực', 'Vai', 'Dài quần', 'Vòng bụng', 'Vòng mông'], rows: NI_TABLE }
};

function tableHtml(t, id) {
    return `<table class="size-table lookup" data-for="${id}" style="font-size:.85rem"><thead><tr>${t.head.map(h => `<th style="padding:.4rem">${h}</th>`).join('')}</tr></thead>
        <tbody>${t.rows.map(r => `<tr data-size="${r[0]}">${r.map(c => `<td style="padding:.4rem">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

document.getElementById('hwTable').innerHTML = tableHtml({ head: ['Size', 'Chiều cao (cm)', 'Cân nặng (kg)'], rows: HW_TABLE }, 'hw');

document.getElementById('aoTable').innerHTML = tableHtml(TABLES.ao, 'modal-ao');
document.getElementById('niTable').innerHTML = tableHtml(TABLES.ni, 'modal-ni');

function toggleOrig(id, btn) {
    const img = document.getElementById(id);
    const show = img.classList.toggle('hidden') === false;
    btn.textContent = show ? 'Ẩn ảnh gốc' : 'Xem ảnh gốc để đối chiếu';
}

const itemsEl = document.getElementById('items');
itemsEl.innerHTML = ITEMS.map(it => {
    const max = it.max || 3;
    const qty = Array.from({ length: max + 1 }, (_, n) =>
        `<option value="${n}"${n === (it.def || 0) ? ' selected' : ''}>${n === 0 ? 'Không' : n}</option>`).join('') + '<option value="other">Khác</option>';
    const size = it.size
        ? `<div class="control-group"><label>Size:</label>
            <select name="${it.key}_size" class="uniform-size-select"><option value="">Chọn size</option>${SIZES.map(s => `<option>${s}</option>`).join('')}</select></div>`
        : '';
    return `<div class="clothing-item" data-key="${it.key}">
        <h4>${it.name}</h4>
        <img src="${it.img}" alt="${it.name}" loading="lazy" style="width:100%;max-width:420px;border-radius:8px;cursor:zoom-in;display:block;margin:0 auto .75rem" onclick="openImg(this)">
        ${it.note ? `<p class="field-hint">${it.note}</p>` : ''}
        <div class="item-controls">
            <div class="control-group"><label>Số lượng:</label><select name="${it.key}_qty">${qty}</select>
                <input type="number" name="${it.key}_qty_other" min="1" max="99" placeholder="Nhập số lượng" class="qty-other" style="display:none;margin-top:.5rem"></div>
            ${size}
        </div>
        ${it.size ? '<p class="size-error-msg" style="display:none">Vui lòng chọn size.</p>' : ''}
        ${it.table ? `<details style="margin-top:.5rem"><summary style="cursor:pointer;color:var(--primary-color);font-weight:500">Bảng tra số đo (cm)</summary>${tableHtml(TABLES[it.table], it.key)}</details>` : ''}
    </div>`;
}).join('');

const form = document.getElementById('registrationForm');

const FONT = '"Times New Roman", Times, serif';

// Vẽ ảnh biên nhận (canvas) — học sinh xuất trình để nhận đồ
function drawReceipt(d, timeStr) {
    const rows = ITEMS.filter(it => Number(d[it.key + '_qty']) > 0);
    const total = rows.reduce((n, it) => n + Number(d[it.key + '_qty']), 0);
    const W = 800, S = 2, pad = 40, rowH = 42;
    const info = [
        ['Họ tên học sinh', d.fullName], ['Lớp', d.class], ['Giới tính', d.gender],
        ['Email đăng ký', d.email],
        ['Chiều cao', d.height ? d.height + ' cm' : 'Không nhập'],
        ['Cân nặng', d.weight ? d.weight + ' kg' : 'Không nhập'],
        ['Ngày giờ đăng ký', timeStr]
    ];
    const H = 250 + info.length * 36 + (rows.length + 2) * rowH + (d.note ? 70 : 0) + 120;
    const c = document.createElement('canvas');
    c.width = W * S; c.height = H * S;
    const g = c.getContext('2d');
    g.scale(S, S);
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#1e3a5f'; g.lineWidth = 3; g.strokeRect(10, 10, W - 20, H - 20);

    const text = (t, x, y, size, weight, color, align) => {
        g.font = `${weight || 'normal'} ${size}px ${FONT}`;
        g.fillStyle = color || '#000'; g.textAlign = align || 'left';
        g.fillText(t, x, y);
    };
    const fit = (t, maxW) => { while (g.measureText(t).width > maxW && t.length > 1) t = t.slice(0, -2) + '…'; return t; };

    let y = 70;
    text('BIÊN NHẬN ĐĂNG KÝ ĐỒNG PHỤC MÙA ĐÔNG', W / 2, y, 26, 'bold', '#1e3a5f', 'center'); y += 32;
    text('Lớp ' + CFG.lop + ' — Năm học ' + CFG.namHoc, W / 2, y, 18, 'normal', '#333', 'center'); y += 28;
    g.fillStyle = '#fef3c7'; g.fillRect(pad, y, W - 2 * pad, 38);
    text('Học sinh cần giữ phiếu này hoặc hình ảnh để nhận đồ', W / 2, y + 26, 20, 'bold', '#b45309', 'center'); y += 38 + 34;

    info.forEach(([k, v]) => {
        text(k + ':', pad, y, 19, 'bold', '#000');
        g.font = `normal 19px ${FONT}`;
        text(fit(String(v), W - pad - 240), 240, y, 19, 'normal', '#000');
        y += 36;
    });
    y += 6;

    const cols = [pad, 400, 580, W - pad]; // Món | Size | Số lượng
    const cell = (t, i, yy, bold, align) => {
        const x = align === 'center' ? (cols[i] + cols[i + 1]) / 2 : cols[i] + 10;
        text(t, x, yy + 28, 18, bold ? 'bold' : 'normal', '#000', align);
    };
    const line = yy => { g.strokeStyle = '#555'; g.lineWidth = 1; g.beginPath(); g.moveTo(pad, yy); g.lineTo(W - pad, yy); g.stroke(); };
    const top = y;
    g.fillStyle = '#e2e8f0'; g.fillRect(pad, y, W - 2 * pad, rowH);
    cell('Món', 0, y, true); cell('Size', 1, y, true, 'center'); cell('Số lượng', 2, y, true, 'center'); y += rowH;
    rows.forEach(it => {
        line(y);
        cell(it.name, 0, y); cell(it.size ? d[it.key + '_size'] : 'Nhà may đo', 1, y, false, 'center');
        cell(d[it.key + '_qty'] + ' ' + it.unit, 2, y, false, 'center'); y += rowH;
    });
    line(y);
    g.fillStyle = '#e2e8f0'; g.fillRect(pad, y, W - 2 * pad, rowH);
    cell('Tổng số', 0, y, true); cell(String(total), 2, y, true, 'center'); y += rowH;
    g.strokeStyle = '#555'; g.lineWidth = 1;
    g.strokeRect(pad, top, W - 2 * pad, y - top);
    [1, 2].forEach(i => { g.beginPath(); g.moveTo(cols[i], top); g.lineTo(cols[i], y); g.stroke(); });

    if (d.note) { y += 34; text('Ghi chú: ' + fit(d.note, W - 2 * pad - 80), pad, y, 17, 'italic', '#444'); }
    y += 40;
    text('Giữ phiếu này đến ngày nhận đồ.', W / 2, y, 17, 'italic', '#555', 'center');
    return c;
}

function showReceipt(d, canvas) {
    const img = document.getElementById('receiptImg');
    img.src = canvas.toDataURL('image/png');
    const name = 'Bien_nhan_dong_phuc_' + (d.fullName || 'hoc_sinh').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/[^a-zA-Z0-9]+/g, '_') + '.png';
    document.getElementById('btnSaveReceipt').onclick = () => {
        canvas.toBlob(async blob => {
            const file = new File([blob], name, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try { await navigator.share({ files: [file], title: 'Biên nhận đồng phục' }); return; } catch (e) { if (e.name === 'AbortError') return; }
            }
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = name;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        }, 'image/png');
    };
}

form.addEventListener('submit', function (e) {
    e.preventDefault();
    let ok = true, first = null;
    const fail = el => { ok = false; if (!first) first = el; };

    form.querySelectorAll('.form-group').forEach(g => {
        const inp = g.querySelector('input[required]');
        if (!inp) return;
        const bad = inp.type === 'radio' ? !g.querySelector('input:checked') : (!inp.checkValidity() || !inp.value.trim());
        g.classList.toggle('error', bad);
        if (bad) fail(g);
    });
    form.querySelectorAll('.clothing-item').forEach(item => {
        const q = item.querySelector('select[name$="_qty"]');
        const s = item.querySelector('select[name$="_size"]');
        const o = item.querySelector('.qty-other');
        const badQty = q.value === 'other' && !(parseInt(o.value, 10) >= 1);
        o.style.borderColor = badQty ? '#dc2626' : '';
        if (badQty) fail(item);
        const bad = s && q.value !== '0' && !s.value;
        item.classList.toggle('item-error', !!bad);
        const m = item.querySelector('.size-error-msg');
        if (m) m.style.display = bad ? 'block' : 'none';
        if (bad) fail(item);
    });
    if (!ok) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

    const d = Object.fromEntries(new FormData(form).entries());
    d.height = calcHeight.value.trim();
    d.weight = calcWeight.value.trim();
    ITEMS.forEach(it => {
        if (d[it.key + '_qty'] === 'other') d[it.key + '_qty'] = String(parseInt(d[it.key + '_qty_other'], 10));
        delete d[it.key + '_qty_other'];
    });
    const timeStr = new Date().toLocaleString('vi-VN', { hour12: false });
    const receiptCanvas = drawReceipt(d, timeStr);
    if (!ITEMS.some(it => d[it.key + '_qty'] !== '0') && !confirm('Bạn chưa đăng ký món nào. Vẫn gửi?')) return;
    if (!GAS_WEB_APP_URL) { alert('Trang chưa được cấu hình địa chỉ máy chủ (gasUrl).'); return; }

    const btn = form.querySelector('.btn-submit');
    const txt = btn.textContent;
    const errBox = document.getElementById('submitError');
    errBox.classList.add('hidden');
    btn.textContent = 'Đang gửi...';
    btn.disabled = true;
    const payload = JSON.stringify(Object.assign({ receipt: receiptCanvas.toDataURL('image/png'), submittedAt: timeStr, lop: CFG.lop }, d));

    // Gửi tối đa 3 lần (đăng ký lặp cùng email + họ tên chỉ ghi đè, không tạo dòng thừa)
    sendWithRetry(payload, 3).then(res => {
        showReceipt(d, receiptCanvas);
        form.style.display = 'none';
        document.querySelector('.form-header').style.display = 'none';
        document.getElementById('successMessage').classList.remove('hidden');
        window.scrollTo(0, 0);
    }).catch(err => {
        errBox.textContent = 'Chưa gửi được đăng ký: ' + err.message + ' Dữ liệu của bạn vẫn còn trên form — bấm "Gửi đăng ký" để thử lại.';
        errBox.classList.remove('hidden');
        errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        btn.textContent = txt;
        btn.disabled = false;
    });
});

async function sendWithRetry(payload, tries) {
    let last = 'Lỗi không xác định.';
    for (let i = 1; i <= tries; i++) {
        try {
            const r = await fetch(GAS_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: payload });
            const j = await r.json();
            if (j && j.status === 'success') return j;
            last = (j && j.message) || 'Máy chủ từ chối đăng ký.';
            if (j && j.permanent) break; // lỗi dữ liệu: thử lại cũng không khác
        } catch (e) {
            last = 'Không kết nối được máy chủ (kiểm tra mạng).';
        }
        if (i < tries) await new Promise(r => setTimeout(r, 1500 * i));
    }
    throw new Error(last);
}

document.getElementById('btnClear').addEventListener('click', () => {
    if (confirm('Xóa toàn bộ thông tin đã nhập?')) location.reload();
});

function openModal(id) { document.getElementById(id).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModalBtn(id) { document.getElementById(id).classList.add('hidden'); document.body.style.overflow = ''; }
function closeModal(ev, id) { if (ev.target.id === id) closeModalBtn(id); }
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay').forEach(m => closeModalBtn(m.id));
});

// ===== Tô sáng dòng size đang chọn trong bảng tra =====
function highlightRow(key) {
    const sel = document.querySelector(`select[name="${key}_size"]`);
    document.querySelectorAll(`.lookup[data-for="${key}"] tr[data-size]`).forEach(tr => {
        tr.style.background = sel && tr.dataset.size === sel.value ? '#fef08a' : '';
    });
}
document.querySelectorAll('.uniform-size-select').forEach(sel => {
    const key = sel.name.replace(/_size$/, '');
    sel.addEventListener('change', () => { highlightRow(key); sel.closest('.clothing-item').classList.remove('item-error'); });
});

// ===== Công cụ gợi ý size (cân nặng quyết định, chiều cao để đối chiếu) =====
const SIZE_CHART = [
    { size: 'XS', wMin: 40, wMax: 50, hMin: 138, hMax: 150 },
    { size: 'S', wMin: 50, wMax: 55, hMin: 148, hMax: 157 },
    { size: 'M', wMin: 55, wMax: 60, hMin: 155, hMax: 163 },
    { size: 'L', wMin: 60, wMax: 65, hMin: 161, hMax: 171 },
    { size: 'XL', wMin: 65, wMax: 70, hMin: 169, hMax: 178 },
    { size: '2XL', wMin: 70, wMax: 75, hMin: 176, hMax: 182 },
    { size: '3XL', wMin: 75, wMax: 80, hMin: 176, hMax: 183 },
    { size: '4XL', wMin: 80, wMax: 85, hMin: 176, hMax: 184 },
    { size: '5XL', wMin: 85, wMax: 90, hMin: 176, hMax: 185 },
    { size: '6XL', wMin: 90, wMax: 95, hMin: 176, hMax: 186 }
];
const calcHeight = document.getElementById('calcHeight');
const calcWeight = document.getElementById('calcWeight');
const calcResult = document.getElementById('calcResult');
const calcError = document.getElementById('calcError');
const sizeDisplay = document.getElementById('suggestedSizeDisplay');
const btnA = document.getElementById('btnApplySize');
const btnB = document.getElementById('btnApplySizeAlt');
let sizeA = '', sizeB = '';

function calcWarn(msg) { calcResult.style.display = 'none'; calcError.textContent = msg; calcError.style.display = 'block'; sizeA = sizeB = ''; }

function calculateSize() {
    const h = parseFloat(calcHeight.value), w = parseFloat(calcWeight.value);
    if (!h || !w) return calcWarn('Nhập cả chiều cao và cân nặng để xem gợi ý.');
    const byW = SIZE_CHART.find(s => w >= s.wMin && w < s.wMax);
    if (!byW) return calcWarn('Số đo nằm ngoài bảng size tiêu chuẩn. Vui lòng xem bảng tra và tự chọn size.');
    sizeA = byW.size; sizeB = '';
    btnB.style.display = 'none'; btnA.textContent = 'Áp dụng';
    sizeDisplay.innerHTML = `<span class="size-badge">${byW.size}</span>`;
    if (!(h >= byW.hMin && h <= byW.hMax)) {
        const byH = SIZE_CHART.find(s => h >= s.hMin && h <= s.hMax);
        if (!byH || byH.size === byW.size) return calcWarn('Chiều cao và cân nặng chênh lệch lớn so với bảng size. Vui lòng tự chọn size.');
        sizeB = byH.size;
        sizeDisplay.innerHTML = `<span class="size-badge">${byW.size}</span> hoặc <span class="size-badge">${byH.size}</span>`;
        btnA.textContent = `Áp dụng size ${byW.size}`;
        btnB.textContent = `Áp dụng size ${byH.size}`;
        btnB.style.display = 'inline-block';
    }
    calcError.style.display = 'none';
    calcResult.style.display = 'flex';
}
calcHeight.addEventListener('input', calculateSize);
calcWeight.addEventListener('input', calculateSize);

function applySize(base) {
    if (!base) return;
    ITEMS.forEach(it => {
        if (!it.size) return;
        const sel = document.querySelector(`select[name="${it.key}_size"]`);
        const i = Math.max(0, SIZES.indexOf(base) + (it.shift || 0));
        sel.value = SIZES[i];
        sel.dispatchEvent(new Event('change'));
    });
    alert(`Đã áp dụng size ${base} (áo len / gile len giảm 1 size). Bạn có thể chỉnh lại từng món.`);
}
btnA.addEventListener('click', () => applySize(sizeA));
btnB.addEventListener('click', () => applySize(sizeB));

// Chọn "Khác" -> hiện ô nhập số lượng
document.querySelectorAll('select[name$="_qty"]').forEach(sel => {
    sel.addEventListener('change', () => {
        const o = sel.parentElement.querySelector('.qty-other');
        o.style.display = sel.value === 'other' ? 'block' : 'none';
        if (sel.value === 'other') o.focus();
    });
});

// Tự chọn size thủ công (không cần nhập chiều cao / cân nặng)
const manualSize = document.getElementById('manualSize');
SIZES.forEach(sz => manualSize.add(new Option(sz, sz)));
document.getElementById('btnApplyManual').addEventListener('click', () => {
    if (!manualSize.value) { alert('Vui lòng chọn size muốn áp dụng.'); return; }
    applySize(manualSize.value);
});

// Bấm ảnh -> popup xem lớn, nút × (hoặc Esc / bấm nền) để đóng
function openImg(img) {
    document.getElementById('modalImg').src = img.src;
    document.getElementById('modalImgTitle').textContent = img.alt || 'Xem ảnh';
    openModal('modal-img');
}
