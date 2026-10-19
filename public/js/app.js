"use strict";

const monthNames = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];
const shortMonthNames = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];
const pageNames = {
  dashboard: ["ภาพรวมการเงิน", "ติดตามรายรับ รายจ่าย และยอดเงินของคุณในที่เดียว"],
  transactions: ["รายรับ–รายจ่าย", "บันทึก ค้นหา และจัดการรายการรายรับ–รายจ่ายในที่เดียว"],
  accounts: ["บัญชี", "สร้าง แก้ไข และดูยอดเงินคงเหลือของทุกบัญชี"],
  categories: ["หมวดหมู่", "สร้างและจัดการหมวดหมู่รายรับ–รายจ่าย"],
  budgets: ["งบประมาณ", "ตั้งงบประมาณรายเดือนและติดตามยอดใช้จริง"],
  reports: ["รายงาน", "วิเคราะห์รายรับ–รายจ่ายตามวัน หมวดหมู่ และเดือน"]
};

const byId = id => document.getElementById(id);
const money = satang => new Intl.NumberFormat("th-TH", {
  style: "currency", currency: "THB", minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(Number(satang) / 100);

function currentBangkokMonth() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit"
  }).formatToParts(new Date());
  const get = type => parts.find(part => part.type === type).value;
  return `${get("year")}-${get("month")}`;
}

function getPeriod() {
  const text = byId("monthPicker").value;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(text)) {
    throw new Error("โปรดเลือกเดือนและปีให้ถูกต้อง");
  }
  const [year, month] = text.split("-").map(Number);
  if (year < 2000 || year > 2100) {
    throw new Error("เลือกปีได้ระหว่าง ค.ศ. 2000–2100");
  }
  return { year, month };
}

async function fetchData(path, options = {}) {
  const response = await fetch(path, { cache: "no-store", ...options });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) {
    const explanation = json?.error?.message || json?.message || `HTTP ${response.status}`;
    throw new Error(explanation);
  }
  return json;
}

function updateMoney(id, satang) {
  const element = byId(id);
  element.textContent = money(satang);
  element.classList.toggle("negative", Number(satang) < 0);
}

function renderTotals(data) {
  updateMoney("totalBalance", data.totalBalanceSatang);
  updateMoney("incomeValue", data.incomeSatang);
  updateMoney("expenseValue", data.expenseSatang);
  updateMoney("netValue", data.netSatang);
  byId("incomeCount").textContent = `${data.incomeCount ?? 0} รายการ`;
  byId("expenseCount").textContent = `${data.expenseCount ?? 0} รายการ`;
  byId("transactionCount").textContent = String(data.transactionCount ?? 0);
  byId("insightIncomeCount").textContent = String(data.incomeCount ?? 0);
  byId("insightExpenseCount").textContent = String(data.expenseCount ?? 0);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderChart(monthlyData) {
  const chart = byId("trendChart");
  chart.replaceChildren();
  if (!Array.isArray(monthlyData) || monthlyData.length === 0) {
    chart.append(createElement("p", "empty-message", "ไม่มีข้อมูลรายเดือน"));
    return;
  }

  const maximum = Math.max(1, ...monthlyData.flatMap(item => [
    Number(item.incomeSatang) || 0, Number(item.expenseSatang) || 0
  ]));
  chart.style.gridTemplateColumns = `repeat(${monthlyData.length}, minmax(0, 1fr))`;

  for (const item of monthlyData) {
    const column = createElement("div", "trend-month");
    const bars = createElement("div", "trend-bar-group");
    const entries = [
      ["income", Number(item.incomeSatang) || 0, "รายรับ"],
      ["expense", Number(item.expenseSatang) || 0, "รายจ่าย"]
    ];
    for (const [type, amount, label] of entries) {
      const bar = createElement("div", `trend-bar trend-bar--${type}`);
      bar.style.height = `${Math.max(1, Math.min(100, amount / maximum * 100))}%`;
      bar.title = `${label} ${monthNames[item.month - 1]} ${item.year}: ${money(amount)}`;
      bar.setAttribute("aria-label", bar.title);
      bars.append(bar);
    }
    column.append(bars, createElement("span", "trend-month-label", shortMonthNames[item.month - 1] || "—"));
    chart.append(column);
  }
}

function renderRecent(items) {
  const body = byId("recentTransactions");
  body.replaceChildren();
  if (!Array.isArray(items) || items.length === 0) {
    const row = document.createElement("tr");
    const cell = createElement("td", "empty-table", "ยังไม่มีรายการในเดือนนี้");
    cell.colSpan = 4;
    row.append(cell);
    body.append(row);
    return;
  }

  for (const item of items) {
    const row = document.createElement("tr");
    row.append(createElement("td", "date-cell", item.transactionDate || "—"));

    const description = document.createElement("td");
    description.append(createElement("span", "detail-main", item.category?.name || "ไม่ระบุหมวดหมู่"));
    if (item.note) description.append(createElement("span", "detail-note", item.note));
    row.append(description);

    row.append(createElement("td", "", item.account?.name || "ไม่ระบุบัญชี"));
    const income = item.type === "INCOME";
    const amount = createElement("td", `amount-col ${income ? "amount-income" : "amount-expense"}`,
      `${income ? "+" : "−"}${money(item.amountSatang)}`);
    row.append(amount);
    body.append(row);
  }
}

let latestRequest = 0;
async function loadDashboard() {
  const requestNumber = ++latestRequest;
  const refreshButton = byId("refreshButton");
  const message = byId("apiMessage");
  refreshButton.disabled = true;
  refreshButton.textContent = "กำลังโหลด...";
  message.hidden = true;
  try {
    const { year, month } = getPeriod();
    byId("selectedPeriod").textContent = `${monthNames[month - 1]} ${year}`;

    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDayNumber = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayNumber).padStart(2, "0")}`;

    const [overview, trends, transactions] = await Promise.all([
      fetchData(`/api/dashboard?month=${month}&year=${year}`),
      fetchData(`/api/dashboard/trends?month=${month}&year=${year}&months=6`),
      fetchData(`/api/transactions?startDate=${firstDay}&endDate=${lastDay}&page=1&limit=5&sort=newest`)
    ]);
    if (requestNumber !== latestRequest) return;

    renderTotals(overview.data);
    renderChart(trends.data.data);
    renderRecent(transactions.data);
    byId("lastUpdated").textContent = `อัปเดตล่าสุด ${new Date().toLocaleString("th-TH")}`;
  } catch (error) {
    if (requestNumber !== latestRequest) return;
    message.textContent = `โหลดข้อมูลไม่สำเร็จ: ${error.message} — ตรวจว่า npm run dev ยังทำงาน และ Phase 3/5 API ตอบกลับได้`;
    message.hidden = false;
    byId("lastUpdated").textContent = "ไม่สามารถอัปเดตข้อมูลล่าสุดได้";
  } finally {
    if (requestNumber === latestRequest) {
      refreshButton.disabled = false;
      refreshButton.textContent = "↻ รีเฟรช";
    }
  }
}

function navigate() {
  const requested = window.location.hash.replace(/^#/, "") || "dashboard";
  const page = Object.prototype.hasOwnProperty.call(pageNames, requested)
    ? requested : "dashboard";
  const [title, description] = pageNames[page];
  byId("pageTitle").textContent = title;
  byId("pageDescription").textContent = description;
  document.querySelector(".page-heading .eyebrow").textContent = `MYFINANCE / ${page.toUpperCase()}`;
  for (const name of Object.keys(pageNames)) {
    byId(`${name}Page`).hidden = name !== page;
  }
  const controls = {
    dashboard: "dashboardControls",
    transactions: "transactionControls",
    accounts: "accountControls",
    categories: "categoryControls",
    budgets: "budgetControls"
  };
  for (const id of Object.values(controls)) {
    byId(id).hidden = controls[page] !== id;
  }
  byId("apiMessage").hidden = true;
  if (page === "dashboard") loadDashboard();
  else if (page === "transactions") activateTransactionsPage();
  else if (page === "accounts") loadAccounts();
  else if (page === "categories") loadCategories();
  else if (page === "budgets") loadBudgets();
  else if (page === "reports") loadReports();
  for (const link of document.querySelectorAll(".nav-link")) {
    const active = link.dataset.page === page;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}

byId("monthPicker").value = currentBangkokMonth();
byId("refreshButton").addEventListener("click", loadDashboard);
byId("monthPicker").addEventListener("change", loadDashboard);
window.addEventListener("hashchange", navigate);

// -------- Phase 6 Part 2: Transactions frontend --------
const transactionState = {
  page: 1,
  limit: 10,
  items: [],
  accounts: [],
  categories: [],
  editingId: null,
  deletingId: null,
  loadSequence: 0
};

function setApiMessage(message, isError = false) {
  const notice = byId("apiMessage");
  notice.textContent = message;
  notice.hidden = !message;
  notice.classList.toggle("api-message--success", !isError);
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function setOptions(select, options, placeholder, previousValue = "") {
  select.replaceChildren(createOption("", placeholder));
  options.forEach(item => select.append(createOption(item.id, item.name)));
  if (options.some(item => item.id === previousValue)) {
    select.value = previousValue;
  }
}

function refreshFilterCategoryOptions() {
  const select = byId("filterCategory");
  const previous = select.value;
  const type = byId("filterType").value;
  const categories = transactionState.categories.filter(item => !type || item.type === type);
  setOptions(select, categories, "ทุกหมวดหมู่", previous);
}

function refreshFormCategoryOptions(keepValue = "") {
  const type = byId("transactionType").value;
  const categories = transactionState.categories.filter(item => item.type === type);
  setOptions(byId("transactionCategory"), categories,
    categories.length ? "เลือกหมวดหมู่" : "ไม่มีหมวดหมู่ประเภทนี้", keepValue);
}

async function loadTransactionLookups() {
  const [accountResult, categoryResult] = await Promise.all([
    fetchData("/api/accounts"),
    fetchData("/api/categories")
  ]);
  transactionState.accounts = Array.isArray(accountResult.data) ? accountResult.data : [];
  transactionState.categories = Array.isArray(categoryResult.data) ? categoryResult.data : [];

  setOptions(byId("filterAccount"), transactionState.accounts, "ทุกบัญชี", byId("filterAccount").value);
  refreshFilterCategoryOptions();
  setOptions(byId("transactionAccount"), transactionState.accounts, "เลือกบัญชี", byId("transactionAccount").value);
  refreshFormCategoryOptions(byId("transactionCategory").value);
}

function readTransactionFilters() {
  const fields = {
    search: byId("filterSearch").value.trim(),
    type: byId("filterType").value,
    accountId: byId("filterAccount").value,
    categoryId: byId("filterCategory").value,
    startDate: byId("filterStart").value,
    endDate: byId("filterEnd").value,
    sort: byId("filterSort").value
  };
  if (fields.startDate && fields.endDate && fields.startDate > fields.endDate) {
    throw new Error("วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด");
  }
  return fields;
}

function setTransactionTableMessage(message) {
  const body = byId("transactionsBody");
  const row = document.createElement("tr");
  const cell = createElement("td", "empty-table", message);
  cell.colSpan = 6;
  row.append(cell);
  body.replaceChildren(row);
}

function renderTransactionTable(items) {
  const body = byId("transactionsBody");
  body.replaceChildren();
  if (!items.length) {
    setTransactionTableMessage("ไม่มีรายการที่ตรงกับเงื่อนไข ลองเปลี่ยนตัวกรองหรือเพิ่มรายการใหม่");
    return;
  }
  for (const item of items) {
    const row = document.createElement("tr");
    row.append(createElement("td", "date-cell", item.transactionDate || "—"));
    const detail = document.createElement("td");
    detail.append(createElement("span", "detail-main", item.category?.name || "ไม่พบหมวดหมู่"));
    if (item.note) detail.append(createElement("span", "detail-note", item.note));
    row.append(detail);

    const isIncome = item.type === "INCOME";
    const typeCell = document.createElement("td");
    typeCell.append(createElement("span", `type-pill ${isIncome ? "type-pill--income" : "type-pill--expense"}`,
      isIncome ? "รายรับ" : "รายจ่าย"));
    row.append(typeCell);
    row.append(createElement("td", "", item.account?.name || "ไม่พบบัญชี"));
    row.append(createElement("td", `amount-col ${isIncome ? "amount-income" : "amount-expense"}`,
      `${isIncome ? "+" : "−"}${money(item.amountSatang)}`));

    const actionsCell = createElement("td", "actions-col");
    const actionGroup = createElement("div", "row-actions");
    const edit = createElement("button", "button-secondary button-tiny", "แก้ไข");
    edit.type = "button";
    edit.dataset.action = "edit";
    edit.dataset.id = item.id;
    edit.setAttribute("aria-label", `แก้ไขรายการ ${item.category?.name || item.id}`);
    const remove = createElement("button", "button-danger-outline button-tiny", "ลบ");
    remove.type = "button";
    remove.dataset.action = "delete";
    remove.dataset.id = item.id;
    remove.setAttribute("aria-label", `ลบรายการ ${item.category?.name || item.id}`);
    actionGroup.append(edit, remove);
    actionsCell.append(actionGroup);
    row.append(actionsCell);
    body.append(row);
  }
}

async function loadTransactions() {
  const sequence = ++transactionState.loadSequence;
  setTransactionTableMessage("กำลังโหลดรายการ...");
  try {
    const filters = readTransactionFilters();
    const query = new URLSearchParams({
      page: String(transactionState.page),
      limit: String(transactionState.limit),
      sort: filters.sort
    });
    for (const key of ["search", "type", "accountId", "categoryId", "startDate", "endDate"]) {
      if (filters[key]) query.set(key, filters[key]);
    }
    const response = await fetchData(`/api/transactions?${query.toString()}`);
    if (sequence !== transactionState.loadSequence) return;
    const pagination = response.pagination || {};
    const items = Array.isArray(response.data) ? response.data : [];
    transactionState.items = items;
    const pages = Number(pagination.totalPages) || 0;
    const total = Number(pagination.totalItems) || 0;
    const current = Number(pagination.page) || transactionState.page;

    // If a deletion emptied the last page, move back one page.
    if (total > 0 && items.length === 0 && transactionState.page > 1) {
      transactionState.page -= 1;
      return loadTransactions();
    }
    renderTransactionTable(items);
    byId("transactionTotal").textContent = `${total.toLocaleString("th-TH")} รายการ`;
    byId("transactionShowing").textContent = total
      ? `แสดง ${((current - 1) * transactionState.limit + 1).toLocaleString("th-TH")}–${((current - 1) * transactionState.limit + items.length).toLocaleString("th-TH")} จาก ${total.toLocaleString("th-TH")} รายการ`
      : "ไม่มีรายการที่ตรงกับตัวกรอง";
    byId("transactionPageLabel").textContent = `หน้า ${pages ? current : 0} / ${pages}`;
    byId("previousTransactionPage").disabled = current <= 1;
    byId("nextTransactionPage").disabled = pages === 0 || current >= pages;
  } catch (error) {
    if (sequence !== transactionState.loadSequence) return;
    setApiMessage(`โหลด Transactions ไม่สำเร็จ: ${error.message}`, true);
    setTransactionTableMessage("โหลดรายการไม่สำเร็จ กรุณาตรวจสอบตัวกรองหรือ API");
  }
}

async function activateTransactionsPage() {
  setApiMessage("");
  try {
    await loadTransactionLookups();
    if (window.location.hash.replace("#", "") !== "transactions") return;
    await loadTransactions();
  } catch (error) {
    if (window.location.hash.replace("#", "") !== "transactions") return;
    setApiMessage(`โหลดข้อมูลบัญชีหรือหมวดหมู่ไม่สำเร็จ: ${error.message}`, true);
    setTransactionTableMessage("โหลดข้อมูลพื้นฐานไม่สำเร็จ");
  }
}

function todayBangkok() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const take = type => parts.find(part => part.type === type).value;
  return `${take("year")}-${take("month")}-${take("day")}`;
}

function amountToSatang(value) {
  // Accept plain baht values with up to two decimal places (e.g. 120, 120.50, 0.25).
  const input = value.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(input)) {
    throw new Error("จำนวนเงินต้องเป็นบาทที่มากกว่า 0 และมีทศนิยมไม่เกิน 2 ตำแหน่ง เช่น 150.50");
  }
  const [baht, fractional = ""] = input.split(".");
  const satang = Number(baht) * 100 + Number(fractional.padEnd(2, "0"));
  if (!Number.isSafeInteger(satang) || satang <= 0) {
    throw new Error("จำนวนเงินไม่ถูกต้องหรือมีค่ามากเกินไป");
  }
  return satang;
}

function satangToBahtText(satang) {
  const amount = Number(satang);
  return `${Math.trunc(amount / 100)}.${String(amount % 100).padStart(2, "0")}`;
}

async function openTransactionForm(id = null) {
  try {
    setApiMessage("");
    await loadTransactionLookups();
    if (!transactionState.accounts.length) {
      throw new Error("ยังไม่มีบัญชี กรุณาสร้างบัญชีจาก Accounts API ก่อน");
    }
    if (!transactionState.categories.length) {
      throw new Error("ยังไม่มีหมวดหมู่ กรุณา Seed หรือสร้าง Categories ก่อน");
    }

    let transaction = null;
    if (id) {
      const response = await fetchData(`/api/transactions/${encodeURIComponent(id)}`);
      transaction = response.data;
    }
    transactionState.editingId = id;
    byId("transactionForm").reset();
    byId("transactionFormError").hidden = true;
    byId("transactionFormError").textContent = "";
    byId("transactionDialogTitle").textContent = id ? "แก้ไขรายการ" : "เพิ่มรายการใหม่";
    byId("saveTransactionButton").textContent = id ? "บันทึกการแก้ไข" : "บันทึกรายการ";
    byId("transactionType").value = transaction?.type || "EXPENSE";
    setOptions(byId("transactionAccount"), transactionState.accounts, "เลือกบัญชี", transaction?.accountId || "");
    refreshFormCategoryOptions(transaction?.categoryId || "");
    byId("transactionAmount").value = transaction ? satangToBahtText(transaction.amountSatang) : "";
    byId("transactionDate").value = transaction?.transactionDate || todayBangkok();
    byId("transactionNote").value = transaction?.note || "";
    byId("transactionDialog").showModal();
    byId("transactionAmount").focus();
  } catch (error) {
    setApiMessage(`เปิดฟอร์มไม่สำเร็จ: ${error.message}`, true);
  }
}

function readTransactionForm() {
  const accountId = byId("transactionAccount").value;
  const categoryId = byId("transactionCategory").value;
  const type = byId("transactionType").value;
  const transactionDate = byId("transactionDate").value;
  const note = byId("transactionNote").value.trim();
  if (!accountId || !categoryId || !transactionDate) {
    throw new Error("โปรดกรอกประเภท บัญชี หมวดหมู่ และวันที่ให้ครบถ้วน");
  }
  if (transactionState.categories.find(c => c.id === categoryId)?.type !== type) {
    throw new Error("ประเภทของรายการไม่ตรงกับหมวดหมู่");
  }
  return {
    accountId, categoryId, type,
    amountSatang: amountToSatang(byId("transactionAmount").value),
    transactionDate, note
  };
}

async function submitTransactionForm(event) {
  event.preventDefault();
  const errorBox = byId("transactionFormError");
  errorBox.hidden = true;
  const button = byId("saveTransactionButton");
  try {
    const data = readTransactionForm();
    const id = transactionState.editingId;
    button.disabled = true;
    button.textContent = "กำลังบันทึก...";
    await fetchData(id ? `/api/transactions/${encodeURIComponent(id)}` : "/api/transactions", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(data)
    });
    byId("transactionDialog").close();
    transactionState.page = 1;
    await loadTransactions();
    setApiMessage(id ? "แก้ไขรายการสำเร็จ" : "เพิ่มรายการสำเร็จ");
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = transactionState.editingId ? "บันทึกการแก้ไข" : "บันทึกรายการ";
  }
}

function openTransactionDelete(id) {
  const item = transactionState.items.find(row => row.id === id);
  if (!item) return;
  transactionState.deletingId = id;
  const summary = `${item.transactionDate} · ${item.category?.name || "รายการ"} · ${money(item.amountSatang)}`;
  byId("deleteTransactionSummary").textContent = summary;
  byId("deleteTransactionError").hidden = true;
  byId("deleteTransactionError").textContent = "";
  byId("deleteTransactionDialog").showModal();
}

async function confirmTransactionDelete() {
  const id = transactionState.deletingId;
  if (!id) return;
  const button = byId("confirmDeleteTransaction");
  button.disabled = true;
  button.textContent = "กำลังลบ...";
  try {
    await fetchData(`/api/transactions/${encodeURIComponent(id)}`, { method: "DELETE" });
    byId("deleteTransactionDialog").close();
    transactionState.deletingId = null;
    await loadTransactions();
    setApiMessage("ลบรายการถาวรเรียบร้อยแล้ว");
  } catch (error) {
    const box = byId("deleteTransactionError");
    box.textContent = `ลบไม่สำเร็จ: ${error.message}`;
    box.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "ลบรายการถาวร";
  }
}

function setupTransactionEvents() {
  byId("newTransactionButton").addEventListener("click", () => openTransactionForm());
  byId("transactionType").addEventListener("change", () => refreshFormCategoryOptions());
  byId("filterType").addEventListener("change", refreshFilterCategoryOptions);
  byId("transactionForm").addEventListener("submit", submitTransactionForm);
  byId("closeTransactionDialog").addEventListener("click", () => byId("transactionDialog").close());
  byId("cancelTransactionDialog").addEventListener("click", () => byId("transactionDialog").close());
  byId("transactionFilters").addEventListener("submit", event => {
    event.preventDefault();
    transactionState.page = 1;
    setApiMessage("");
    loadTransactions();
  });
  byId("resetFilters").addEventListener("click", () => {
    byId("transactionFilters").reset();
    refreshFilterCategoryOptions();
    transactionState.page = 1;
    setApiMessage("");
    loadTransactions();
  });
  byId("previousTransactionPage").addEventListener("click", () => {
    if (transactionState.page > 1) {
      transactionState.page -= 1;
      setApiMessage("");
      loadTransactions();
    }
  });
  byId("nextTransactionPage").addEventListener("click", () => {
    transactionState.page += 1;
    setApiMessage("");
    loadTransactions();
  });
  byId("transactionsBody").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "edit") openTransactionForm(button.dataset.id);
    if (button.dataset.action === "delete") openTransactionDelete(button.dataset.id);
  });
  byId("closeDeleteDialog").addEventListener("click", () => byId("deleteTransactionDialog").close());
  byId("cancelDeleteTransaction").addEventListener("click", () => byId("deleteTransactionDialog").close());
  byId("confirmDeleteTransaction").addEventListener("click", confirmTransactionDelete);
}

setupTransactionEvents();

// -------- Phase 6 Complete: Accounts, Categories, Budgets, Reports --------
const entityState = {
  accounts: [], categories: [], budgets: [],
  editingKind: null, editingId: null,
  deletingKind: null, deletingId: null,
  accountLoadId: 0, categoryLoadId: 0, budgetLoadId: 0, reportLoadId: 0
};

function tablePlaceholder(id, colspan, message) {
  const tr = document.createElement("tr");
  const td = createElement("td", "empty-table", message);
  td.colSpan = colspan;
  tr.append(td);
  byId(id).replaceChildren(tr);
}

function tableCell(text, className = "") {
  return createElement("td", className, text);
}

function actionButtons(id) {
  const td = createElement("td", "actions-col");
  const wrapper = createElement("div", "row-actions");
  for (const [action, label, css] of [
    ["edit", "แก้ไข", "button-secondary button-tiny"],
    ["delete", "ลบ", "button-danger-outline button-tiny"]
  ]) {
    const btn = createElement("button", css, label);
    btn.type = "button";
    btn.dataset.id = id;
    btn.dataset.action = action;
    btn.setAttribute("aria-label", `${label}ข้อมูลรายการนี้`);
    wrapper.append(btn);
  }
  td.append(wrapper);
  return td;
}

function statusPill(kind) {
  const labels = {
    INCOME: "รายรับ", EXPENSE: "รายจ่าย",
    CASH: "เงินสด", BANK: "ธนาคาร", EWALLET: "อีวอลเล็ต"
  };
  const extra = kind === "INCOME" ? "type-pill--income" :
    kind === "EXPENSE" ? "type-pill--expense" : "type-pill--neutral";
  return createElement("span", `type-pill ${extra}`, labels[kind] || kind);
}

async function loadAccounts() {
  const stamp = ++entityState.accountLoadId;
  tablePlaceholder("accountsBody", 5, "กำลังโหลดบัญชี...");
  setApiMessage("");
  try {
    const result = await fetchData("/api/accounts");
    if (stamp !== entityState.accountLoadId) return;
    const items = Array.isArray(result.data) ? result.data : [];
    entityState.accounts = items;
    byId("accountTotal").textContent = `${items.length.toLocaleString("th-TH")} บัญชี`;
    if (!items.length) {
      tablePlaceholder("accountsBody", 5, "ยังไม่มีบัญชี กด '+ เพิ่มบัญชี' เพื่อเริ่มใช้งาน");
      return;
    }
    const body = byId("accountsBody");
    body.replaceChildren();
    for (const item of items) {
      const row = document.createElement("tr");
      row.append(tableCell(item.name || "—", "detail-main"));
      const typ = document.createElement("td");
      typ.append(statusPill(item.type));
      row.append(typ);
      row.append(tableCell(money(item.initialBalanceSatang), "amount-col"));
      row.append(tableCell(money(item.currentBalanceSatang),
        `amount-col ${Number(item.currentBalanceSatang) < 0 ? "amount-expense" : ""}`));
      row.append(actionButtons(item.id));
      body.append(row);
    }
  } catch (error) {
    tablePlaceholder("accountsBody", 5, "โหลดบัญชีไม่สำเร็จ");
    setApiMessage(`โหลดบัญชีไม่สำเร็จ: ${error.message}`, true);
  }
}

async function loadCategories() {
  const stamp = ++entityState.categoryLoadId;
  tablePlaceholder("categoriesBody", 3, "กำลังโหลดหมวดหมู่...");
  setApiMessage("");
  try {
    const type = byId("categoryListType").value;
    const path = type ? `/api/categories?type=${type}` : "/api/categories";
    const result = await fetchData(path);
    if (stamp !== entityState.categoryLoadId) return;
    const items = Array.isArray(result.data) ? result.data : [];
    entityState.categories = items;
    byId("categoryTotal").textContent = `${items.length.toLocaleString("th-TH")} หมวดหมู่`;
    if (!items.length) {
      tablePlaceholder("categoriesBody", 3, "ไม่มีหมวดหมู่ตามตัวกรองที่เลือก");
      return;
    }
    const body = byId("categoriesBody");
    body.replaceChildren();
    for (const item of items) {
      const row = document.createElement("tr");
      row.append(tableCell(item.name || "—", "detail-main"));
      const typeCell = document.createElement("td");
      typeCell.append(statusPill(item.type));
      row.append(typeCell, actionButtons(item.id));
      body.append(row);
    }
  } catch (error) {
    tablePlaceholder("categoriesBody", 3, "โหลดหมวดหมู่ไม่สำเร็จ");
    setApiMessage(`โหลดหมวดหมู่ไม่สำเร็จ: ${error.message}`, true);
  }
}

async function loadBudgetCategories() {
  const response = await fetchData("/api/categories?type=EXPENSE");
  const items = Array.isArray(response.data) ? response.data : [];
  entityState.categories = items;
  setOptions(byId("budgetCategoryFilter"), items, "ทุกหมวดหมู่", byId("budgetCategoryFilter").value);
  setOptions(byId("entityBudgetCategory"), items, "เลือกหมวดหมู่", byId("entityBudgetCategory").value);
}

function selectedMonthValue(id) {
  const value = byId(id).value;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new Error("กรุณาเลือกเดือนและปีให้ถูกต้อง");
  }
  const [year, month] = value.split("-").map(Number);
  if (year < 2000 || year > 2100) throw new Error("เลือกปีได้ระหว่าง 2000–2100");
  return { year, month };
}

function renderBudgets(items) {
  const root = byId("budgetsGrid");
  root.replaceChildren();
  if (!items.length) {
    root.append(createElement("div", "panel empty-card", "ยังไม่มีงบประมาณในเดือนที่เลือก กด '+ ตั้งงบประมาณ' เพื่อเพิ่ม"));
    return;
  }
  for (const item of items) {
    const card = createElement("article", "panel budget-card");
    const head = createElement("div", "budget-card-head");
    const heading = createElement("div");
    heading.append(createElement("span", "eyebrow", `${monthNames[item.month - 1]} ${item.year}`));
    heading.append(createElement("h2", "", item.category?.name || "ไม่พบหมวดหมู่"));
    const labels = {
      WITHIN_BUDGET: "อยู่ในงบ", AT_LIMIT: "ใช้งบครบ", OVER_BUDGET: "เกินงบ"
    };
    const status = createElement("span", `budget-status status-${item.status || "WITHIN_BUDGET"}`,
      labels[item.status] || item.status || "ไม่ทราบสถานะ");
    head.append(heading, status);
    const amounts = createElement("div", "budget-amounts");
    for (const [label, value, classname] of [
      ["งบที่ตั้ง", item.limitSatang, ""],
      ["ใช้ไป", item.spentSatang, ""],
      ["คงเหลือ", item.remainingSatang, Number(item.remainingSatang) < 0 ? "amount-expense" : ""]
    ]) {
      const part = createElement("div", "budget-number");
      part.append(createElement("small", "", label), createElement("strong", classname, money(value)));
      amounts.append(part);
    }
    const usage = Number(item.usagePercent) || 0;
    const meter = createElement("div", "budget-progress");
    const filled = createElement("div", item.status === "OVER_BUDGET" ? "budget-progress-fill over" : "budget-progress-fill");
    filled.style.width = `${Math.max(0, Math.min(100, usage))}%`;
    meter.append(filled);
    meter.setAttribute("role", "progressbar");
    meter.setAttribute("aria-valuemin", "0");
    meter.setAttribute("aria-valuenow", String(Math.max(0, usage)));
    meter.setAttribute("aria-label", `ใช้งบ ${usage.toFixed(2)} เปอร์เซ็นต์`);
    const row = createElement("div", "budget-footer");
    row.append(createElement("span", "budget-usage", `ใช้ไป ${usage.toFixed(2)}%`));
    const actions = createElement("div", "row-actions");
    for (const [action, label, cl] of [["edit", "แก้ไข", "button-secondary button-tiny"], ["delete", "ลบ", "button-danger-outline button-tiny"]]) {
      const btn = createElement("button", cl, label);
      btn.type = "button";
      btn.dataset.action = action;
      btn.dataset.id = item.id;
      actions.append(btn);
    }
    row.append(actions);
    card.append(head, amounts, meter, row);
    root.append(card);
  }
}

async function loadBudgets() {
  const stamp = ++entityState.budgetLoadId;
  byId("budgetsGrid").replaceChildren(createElement("div", "panel empty-card", "กำลังโหลดงบประมาณ..."));
  setApiMessage("");
  try {
    const { year, month } = selectedMonthValue("budgetMonthFilter");
    await loadBudgetCategories();
    const params = new URLSearchParams({ month: String(month), year: String(year) });
    if (byId("budgetCategoryFilter").value) params.set("categoryId", byId("budgetCategoryFilter").value);
    const response = await fetchData(`/api/budgets?${params}`);
    if (stamp !== entityState.budgetLoadId) return;
    const items = Array.isArray(response.data) ? response.data : [];
    entityState.budgets = items;
    renderBudgets(items);
  } catch (error) {
    byId("budgetsGrid").replaceChildren(createElement("div", "panel empty-card", "โหลดงบประมาณไม่สำเร็จ"));
    setApiMessage(`โหลดงบประมาณไม่สำเร็จ: ${error.message}`, true);
  }
}

// Parse currency input without floating-point multiplication.
function bahtInputToSatang(raw, allowZero = false) {
  const text = String(raw).trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) {
    throw new Error("กรุณากรอกจำนวนเงินเป็นบาท เช่น 1500 หรือ 1500.50 (ทศนิยมสูงสุด 2 ตำแหน่ง)");
  }
  const [whole, cents = ""] = text.split(".");
  const amount = Number(whole) * 100 + Number(cents.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || (allowZero ? amount < 0 : amount <= 0)) {
    throw new Error(allowZero ? "ยอดตั้งต้นต้องไม่ติดลบและไม่เกินขอบเขตจำนวนเต็ม" : "จำนวนเงินต้องมากกว่า 0");
  }
  return amount;
}

function entityEndpoint(kind) {
  return kind === "account" ? "accounts" : kind === "category" ? "categories" : "budgets";
}

async function openEntityForm(kind, id = null) {
  entityState.editingKind = kind;
  entityState.editingId = id;
  const dialog = byId("entityDialog");
  const err = byId("entityFormError");
  err.hidden = true;
  err.textContent = "";
  byId("entityForm").reset();
  for (const k of ["account", "category", "budget"]) {
    byId(`${k}FormFields`).hidden = k !== kind;
  }
  const titleByKind = {account:"บัญชี",category:"หมวดหมู่",budget:"งบประมาณ"};
  byId("entityDialogTitle").textContent = `${id ? "แก้ไข" : "เพิ่ม"}${titleByKind[kind]}`;
  byId("entityEyebrow").textContent = kind.toUpperCase();
  byId("saveEntityButton").textContent = id ? "บันทึกการแก้ไข" : "บันทึก";
  try {
    if (kind === "budget") {
      const selected = byId("budgetMonthFilter").value || currentBangkokMonth();
      byId("entityBudgetMonth").value = selected;
      await loadBudgetCategories();
      if (!entityState.categories.length) {
        throw new Error("ยังไม่มีหมวดหมู่รายจ่าย กรุณาสร้างในหน้า หมวดหมู่ ก่อน");
      }
    }
    let item = null;
    if (id) {
      const response = await fetchData(`/api/${entityEndpoint(kind)}/${encodeURIComponent(id)}`);
      item = response.data;
    }
    if (kind === "account") {
      byId("entityAccountName").value = item?.name || "";
      byId("entityAccountType").value = item?.type || "CASH";
      byId("entityInitialBalance").value = item ? satangToBahtText(item.initialBalanceSatang) : "0.00";
    } else if (kind === "category") {
      byId("entityCategoryName").value = item?.name || "";
      byId("entityCategoryType").value = item?.type || "EXPENSE";
    } else {
      if (item) {
        byId("entityBudgetCategory").value = item.categoryId;
        byId("entityBudgetMonth").value = `${item.year}-${String(item.month).padStart(2, "0")}`;
        byId("entityBudgetLimit").value = satangToBahtText(item.limitSatang);
      }
    }
    dialog.showModal();
    const focusId = {account:"entityAccountName",category:"entityCategoryName",budget:"entityBudgetCategory"}[kind];
    byId(focusId).focus();
  } catch (error) {
    setApiMessage(`เปิดฟอร์มไม่สำเร็จ: ${error.message}`, true);
  }
}

function readEntityForm(kind) {
  if (kind === "account") {
    const name = byId("entityAccountName").value.trim();
    if (!name || name.length > 100) throw new Error("ชื่อบัญชีต้องมี 1–100 ตัวอักษร");
    return {
      name,
      type: byId("entityAccountType").value,
      initialBalanceSatang: bahtInputToSatang(byId("entityInitialBalance").value, true)
    };
  }
  if (kind === "category") {
    const name = byId("entityCategoryName").value.trim();
    if (!name || name.length > 100) throw new Error("ชื่อหมวดหมู่ต้องมี 1–100 ตัวอักษร");
    return {name, type: byId("entityCategoryType").value};
  }
  const categoryId = byId("entityBudgetCategory").value;
  if (!categoryId) throw new Error("กรุณาเลือกหมวดหมู่รายจ่าย");
  const {year, month} = selectedMonthValue("entityBudgetMonth");
  return {
    categoryId, month, year,
    limitSatang: bahtInputToSatang(byId("entityBudgetLimit").value)
  };
}

async function submitEntityForm(event) {
  event.preventDefault();
  const kind = entityState.editingKind;
  const id = entityState.editingId;
  const error = byId("entityFormError");
  error.hidden = true;
  const save = byId("saveEntityButton");
  try {
    const data = readEntityForm(kind);
    save.disabled = true;
    save.textContent = "กำลังบันทึก...";
    await fetchData(`/api/${entityEndpoint(kind)}${id ? `/${encodeURIComponent(id)}` : ""}`, {
      method: id ? "PUT" : "POST",
      headers: {"Content-Type":"application/json; charset=utf-8"},
      body: JSON.stringify(data)
    });
    byId("entityDialog").close();
    if (kind === "account") await loadAccounts();
    else if (kind === "category") await loadCategories();
    else await loadBudgets();
    setApiMessage(id ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มข้อมูลสำเร็จ");
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
  } finally {
    save.disabled = false;
    save.textContent = id ? "บันทึกการแก้ไข" : "บันทึก";
  }
}

function openEntityDelete(kind, id) {
  let item = null;
  if (kind === "account") item = entityState.accounts.find(x => x.id === id);
  else if (kind === "category") item = entityState.categories.find(x => x.id === id);
  else item = entityState.budgets.find(x => x.id === id);
  if (!item) return;
  entityState.deletingKind = kind;
  entityState.deletingId = id;
  const titleByKind = {account:"บัญชี",category:"หมวดหมู่",budget:"งบประมาณ"};
  byId("entityDeleteTitle").textContent = `ยืนยันลบ${titleByKind[kind]}`;
  byId("entityDeleteMessage").textContent = kind === "budget"
    ? "ลบงบประมาณนี้ถาวรหรือไม่? Transactions จะยังอยู่ตามเดิม"
    : "คุณต้องการลบข้อมูลนี้ถาวรหรือไม่? ระบบจะปฏิเสธการลบหากมีข้อมูลอื่นอ้างอิง";
  byId("entityDeleteSummary").textContent = kind === "budget"
    ? `${item.category?.name || "หมวดหมู่"} · ${monthNames[item.month - 1]} ${item.year} · ${money(item.limitSatang)}`
    : item.name;
  byId("entityDeleteError").hidden = true;
  byId("entityDeleteDialog").showModal();
}

async function confirmEntityDelete() {
  const kind = entityState.deletingKind;
  const id = entityState.deletingId;
  if (!kind || !id) return;
  const button = byId("confirmEntityDelete");
  button.disabled = true;
  button.textContent = "กำลังลบ...";
  try {
    await fetchData(`/api/${entityEndpoint(kind)}/${encodeURIComponent(id)}`, {method: "DELETE"});
    byId("entityDeleteDialog").close();
    entityState.deletingId = null;
    entityState.deletingKind = null;
    if (kind === "account") await loadAccounts();
    else if (kind === "category") await loadCategories();
    else await loadBudgets();
    setApiMessage("ลบข้อมูลสำเร็จ");
  } catch (error) {
    const errBox = byId("entityDeleteError");
    errBox.textContent = `ลบไม่สำเร็จ: ${error.message}`;
    errBox.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "ลบข้อมูล";
  }
}

function validateReportDates() {
  const start = byId("reportStart").value;
  const end = byId("reportEnd").value;
  if (!start || !end) throw new Error("กรุณาเลือกวันเริ่มต้นและวันสิ้นสุด");
  if (start > end) throw new Error("วันเริ่มต้นต้องไม่เกินวันสิ้นสุด");
  return {start, end};
}

function renderReportCategories(items) {
  const root = byId("reportCategoryBars");
  root.replaceChildren();
  if (!items.length) {
    root.append(createElement("p", "empty-message", "ไม่มีข้อมูลหมวดหมู่ในช่วงวันที่เลือก"));
    return;
  }
  for (const item of items) {
    const line = createElement("div", "category-bar-item");
    const header = createElement("div", "category-bar-header");
    const name = createElement("div", "category-bar-name");
    name.append(statusPill(item.type), createElement("span", "", item.categoryName || "ไม่พบหมวดหมู่"));
    header.append(name, createElement("strong", "", `${money(item.totalSatang)} · ${Number(item.percentage || 0).toFixed(2)}%`));
    const track = createElement("div", "category-bar-track");
    const bar = createElement("div", item.type === "INCOME" ? "category-bar-fill income" : "category-bar-fill expense");
    bar.style.width = `${Math.min(100, Math.max(0, Number(item.percentage) || 0))}%`;
    track.append(bar);
    line.append(header, track);
    root.append(line);
  }
}

async function loadReportRange() {
  const {start, end} = validateReportDates();
  const q = new URLSearchParams({ startDate: start, endDate: end });
  const catQ = new URLSearchParams(q);
  if (byId("reportType").value) catQ.set("type", byId("reportType").value);
  const [summary, breakdown] = await Promise.all([
    fetchData(`/api/reports/summary?${q}`),
    fetchData(`/api/reports/categories?${catQ}`)
  ]);
  updateMoney("reportIncome", summary.data.incomeSatang);
  updateMoney("reportExpense", summary.data.expenseSatang);
  updateMoney("reportNet", summary.data.netSatang);
  byId("reportCount").textContent = `${Number(summary.data.transactionCount || 0).toLocaleString("th-TH")} รายการ`;
  renderReportCategories(Array.isArray(breakdown.data.data) ? breakdown.data.data : []);
}

function renderMonthlyReport(data) {
  const list = Array.isArray(data) ? data : [];
  const chart = byId("reportMonthlyChart");
  const body = byId("reportMonthlyBody");
  chart.replaceChildren();
  body.replaceChildren();
  if (!list.length) {
    chart.append(createElement("p", "empty-message", "ไม่มีข้อมูลรายเดือน"));
    return;
  }
  const max = Math.max(1, ...list.flatMap(x => [Number(x.incomeSatang) || 0, Number(x.expenseSatang) || 0]));
  for (const item of list) {
    const group = createElement("div", "monthly-group");
    const bars = createElement("div", "monthly-group-bars");
    for (const [kind, val] of [["income", Number(item.incomeSatang) || 0], ["expense", Number(item.expenseSatang) || 0]]) {
      const bar = createElement("div", `monthly-bar ${kind}`);
      bar.style.height = `${Math.max(2, val / max * 100)}%`;
      bar.title = `${kind === "income" ? "รายรับ" : "รายจ่าย"} ${monthNames[item.month - 1]} ${item.year}: ${money(val)}`;
      bars.append(bar);
    }
    group.append(bars, createElement("span", "", shortMonthNames[item.month - 1]));
    chart.append(group);
    const row = document.createElement("tr");
    row.append(tableCell(monthNames[item.month - 1] || "—"));
    row.append(tableCell(money(item.incomeSatang), "amount-col amount-income"));
    row.append(tableCell(money(item.expenseSatang), "amount-col amount-expense"));
    row.append(tableCell(money(item.netSatang), `amount-col ${Number(item.netSatang) < 0 ? "amount-expense" : ""}`));
    body.append(row);
  }
}

async function loadMonthlyReport() {
  const year = Number(byId("reportYear").value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("กรุณาเลือกปี ค.ศ. ระหว่าง 2000–2100");
  }
  const result = await fetchData(`/api/reports/monthly?year=${year}`);
  renderMonthlyReport(result.data.data);
}

async function loadReports() {
  const stamp = ++entityState.reportLoadId;
  setApiMessage("");
  try {
    await Promise.all([loadReportRange(), loadMonthlyReport()]);
    if (stamp !== entityState.reportLoadId) return;
  } catch (error) {
    setApiMessage(`โหลดรายงานไม่สำเร็จ: ${error.message}`, true);
  }
}

function handleEntityTableClick(kind, event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "edit") openEntityForm(kind, button.dataset.id);
  else if (button.dataset.action === "delete") openEntityDelete(kind, button.dataset.id);
}

function initCompletedPages() {
  byId("budgetMonthFilter").value = currentBangkokMonth();
  byId("entityBudgetMonth").value = currentBangkokMonth();
  const today = todayBangkok();
  byId("reportStart").value = `${today.slice(0, 7)}-01`;
  byId("reportEnd").value = today;
  byId("reportYear").value = today.slice(0, 4);
  byId("newAccountButton").addEventListener("click", () => openEntityForm("account"));
  byId("newCategoryButton").addEventListener("click", () => openEntityForm("category"));
  byId("newBudgetButton").addEventListener("click", () => openEntityForm("budget"));
  byId("refreshAccounts").addEventListener("click", loadAccounts);
  byId("categoryListType").addEventListener("change", loadCategories);
  byId("budgetFilters").addEventListener("submit", e => {e.preventDefault(); loadBudgets();});
  byId("reportFilters").addEventListener("submit", e => {e.preventDefault(); loadReportRange().catch(err => setApiMessage(err.message, true));});
  byId("reportYearForm").addEventListener("submit", e => {e.preventDefault(); loadMonthlyReport().catch(err => setApiMessage(err.message, true));});
  byId("accountsBody").addEventListener("click", e => handleEntityTableClick("account", e));
  byId("categoriesBody").addEventListener("click", e => handleEntityTableClick("category", e));
  byId("budgetsGrid").addEventListener("click", e => handleEntityTableClick("budget", e));
  byId("entityForm").addEventListener("submit", submitEntityForm);
  byId("closeEntityDialog").addEventListener("click", () => byId("entityDialog").close());
  byId("cancelEntityDialog").addEventListener("click", () => byId("entityDialog").close());
  byId("closeEntityDelete").addEventListener("click", () => byId("entityDeleteDialog").close());
  byId("cancelEntityDelete").addEventListener("click", () => byId("entityDeleteDialog").close());
  byId("confirmEntityDelete").addEventListener("click", confirmEntityDelete);
}

initCompletedPages();
navigate();
