(function () {
  "use strict";

  const itemsBody = document.querySelector("#items-body");
  const page = document.querySelector(".page");
  const rowTemplate = document.querySelector("#item-row-template");
  const addItemButton = document.querySelector("#add-item");
  const toggleCatalogButton = document.querySelector("#toggle-catalog");
  const closeCatalogButton = document.querySelector("#close-catalog");
  const catalogPanel = document.querySelector("#service-catalog");
  const catalogForm = document.querySelector("#catalog-form");
  const catalogNameInput = document.querySelector("#catalog-name");
  const catalogUnitInput = document.querySelector("#catalog-unit");
  const catalogPriceInput = document.querySelector("#catalog-price");
  const catalogEmpty = document.querySelector("#catalog-empty");
  const catalogList = document.querySelector("#catalog-list");
  const discountRateInput = document.querySelector("#discount-rate");
  const vatRateInput = document.querySelector("#vat-rate");
  const currencySelect = document.querySelector("#currency");
  const subtotalOutput = document.querySelector("#subtotal");
  const discountRow = document.querySelector("#discount-row");
  const discountAmountOutput = document.querySelector("#discount-amount");
  const discountedRow = document.querySelector("#discounted-row");
  const discountedTotalOutput = document.querySelector("#discounted-total");
  const vatRow = document.querySelector("#vat-row");
  const vatAmountOutput = document.querySelector("#vat-amount");
  const grandTotal = document.querySelector("#grand-total");
  const dateInput = document.querySelector("#estimate-date");
  const senderInput = document.querySelector('[name="sender"]');
  const recipientInput = document.querySelector('[name="recipient"]');
  const estimateNumberInput = document.querySelector('[name="estimate-number"]');
  const commentInput = document.querySelector("#estimate-comment");
  const printButton = document.querySelector("#print-estimate");
  const copyButton = document.querySelector("#copy-estimate");
  const newEstimateButton = document.querySelector("#new-estimate");
  const copyStatus = document.querySelector("#copy-status");
  const copyFallback = document.querySelector("#copy-fallback");
  const copyText = document.querySelector("#copy-text");
  const printEstimateNumber = document.querySelector("#print-estimate-number");
  const printEstimateDate = document.querySelector("#print-estimate-date");
  const printCommentText = document.querySelector("#print-comment-text");

  const moneyFormatter = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0
  });
  const quantityFormatter = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2
  });
  const STORAGE_KEY = "estimate-draft-v1";
  const CATALOG_STORAGE_KEY = "estimate-service-catalog-v1";
  let copyStatusTimer;
  let services = [];

  function parseNumber(value) {
    const normalized = String(value)
      .trim()
      .replace(/\s+/g, "")
      .replace(",", ".");
    const number = Number(normalized);

    return Number.isFinite(number) ? number : 0;
  }

  function formatMoney(value) {
    const safeValue = Number.isFinite(value) ? Math.round(value) : 0;
    return `${moneyFormatter.format(safeValue)} ${currencySelect.value}`;
  }

  function formatQuantity(value) {
    const safeValue = Number.isFinite(value) ? value : 0;
    return quantityFormatter.format(safeValue);
  }

  function handleNumericInput(event) {
    const input = event.currentTarget;
    const normalizedValue = input.value.replace(/^(-?)0+(?=\d)/, "$1");

    if (normalizedValue !== input.value) {
      input.value = normalizedValue;
    }

    recalculate();
  }

  function setupNumericInput(input) {
    input.addEventListener("focus", () => {
      if (input.value === "0") {
        input.select();
      }
    });
    input.addEventListener("input", handleNumericInput);
  }

  function recalculate() {
    let subtotal = 0;

    itemsBody.querySelectorAll(".item-row").forEach((row) => {
      const quantity = parseNumber(row.querySelector(".item-quantity").value);
      const price = parseNumber(row.querySelector(".item-price").value);
      const rowSum = quantity * price;
      const safeRowSum = Number.isFinite(rowSum) ? Math.round(rowSum) : 0;

      row.querySelector(".item-sum").textContent = formatMoney(safeRowSum);
      subtotal += safeRowSum;
    });

    const discountRate = parseNumber(discountRateInput.value);
    const vatRate = parseNumber(vatRateInput.value);
    const discountAmount = Math.round(subtotal * discountRate / 100);
    const discountedTotal = subtotal - discountAmount;
    const vatAmount = Math.round(discountedTotal * vatRate / 100);
    const total = discountedTotal + vatAmount;

    subtotalOutput.textContent = formatMoney(subtotal);
    discountAmountOutput.textContent = formatMoney(discountAmount);
    discountedTotalOutput.textContent = formatMoney(discountedTotal);
    vatAmountOutput.textContent = formatMoney(vatAmount);
    grandTotal.textContent = formatMoney(total);

    const hasDiscount = discountAmount !== 0;
    discountRow.hidden = !hasDiscount;
    discountedRow.hidden = !hasDiscount;
    vatRow.hidden = vatAmount === 0;
  }

  function addItem(options = {}) {
    const fragment = rowTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".item-row");
    const values = options.values || {};
    const nameInput = row.querySelector(".item-name");
    const quantityInput = row.querySelector(".item-quantity");
    const unitInput = row.querySelector(".item-unit");
    const priceInput = row.querySelector(".item-price");

    nameInput.value = typeof values.name === "string" ? values.name : "";
    quantityInput.value = typeof values.quantity === "string" ? values.quantity : "";
    priceInput.value = typeof values.price === "string" ? values.price : "";
    unitInput.value = typeof values.unit === "string" ? values.unit : unitInput.options[0].value;

    if (!unitInput.value) {
      unitInput.value = unitInput.options[0].value;
    }

    setupNumericInput(quantityInput);
    setupNumericInput(priceInput);
    row.querySelector(".remove-item").addEventListener("click", () => {
      row.remove();
      recalculate();
      saveDraft();
    });

    row.addEventListener("keydown", (event) => {
      const isLastRow = row === itemsBody.lastElementChild;
      const isInteractiveChoice = event.target instanceof HTMLSelectElement;

      if (event.key === "Enter" && isLastRow && !isInteractiveChoice) {
        event.preventDefault();
        addItem({ focus: true });
        saveDraft();
      }
    });

    itemsBody.appendChild(fragment);

    if (options.focus) {
      nameInput.focus();
    }

    return row;
  }

  function setToday() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    dateInput.value = `${year}-${month}-${day}`;
  }

  function formatPrintDate(value) {
    const dateParts = value.split("-");

    if (dateParts.length !== 3) {
      return "—";
    }

    return `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;
  }

  function updatePrintDocument() {
    printEstimateNumber.textContent = estimateNumberInput.value.trim() || "—";
    printEstimateDate.textContent = formatPrintDate(dateInput.value);
    printCommentText.textContent = commentInput.value.trim() || "—";
  }

  function createServiceId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function saveServiceCatalog() {
    try {
      localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(services));
    } catch (error) {
      // Каталог остаётся доступен до закрытия страницы, если хранилище недоступно.
    }
  }

  function loadServiceCatalog() {
    try {
      const savedCatalog = JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY) || "[]");

      if (!Array.isArray(savedCatalog)) {
        return;
      }

      services = savedCatalog
        .filter((service) => service && typeof service.name === "string" && service.name.trim())
        .map((service) => {
          const allowedUnits = ["шт", "час", "услуга"];
          const price = Number(service.price);

          return {
            id: typeof service.id === "string" ? service.id : createServiceId(),
            name: service.name.trim(),
            unit: allowedUnits.includes(service.unit) ? service.unit : "шт",
            price: Number.isFinite(price) ? price : 0
          };
        });
    } catch (error) {
      services = [];
    }
  }

  function addServiceToEstimate(service) {
    const row = addItem({
      values: {
        name: service.name,
        quantity: "1",
        unit: service.unit,
        price: moneyFormatter.format(service.price)
      }
    });

    recalculate();
    saveDraft();
    row.querySelector(".item-quantity").focus();
    row.querySelector(".item-quantity").select();
  }

  function removeService(serviceId) {
    const service = services.find((item) => item.id === serviceId);

    if (!service || !window.confirm(`Удалить услугу «${service.name}» из каталога?`)) {
      return;
    }

    services = services.filter((item) => item.id !== serviceId);
    saveServiceCatalog();
    renderServiceCatalog();
  }

  function renderServiceCatalog() {
    catalogList.replaceChildren();
    catalogEmpty.hidden = services.length > 0;

    services.forEach((service) => {
      const item = document.createElement("li");
      const info = document.createElement("div");
      const name = document.createElement("strong");
      const details = document.createElement("span");
      const actions = document.createElement("div");
      const useButton = document.createElement("button");
      const removeButton = document.createElement("button");

      item.className = "catalog-item";
      info.className = "catalog-service-info";
      actions.className = "catalog-item-actions";
      name.textContent = service.name;
      details.textContent = `${service.unit} · ${formatMoney(service.price)}`;

      useButton.className = "button button--secondary";
      useButton.type = "button";
      useButton.textContent = "Добавить в смету";
      useButton.addEventListener("click", () => addServiceToEstimate(service));

      removeButton.className = "remove-service";
      removeButton.type = "button";
      removeButton.setAttribute("aria-label", `Удалить услугу ${service.name}`);
      removeButton.textContent = "×";
      removeButton.addEventListener("click", () => removeService(service.id));

      info.append(name, details);
      actions.append(useButton, removeButton);
      item.append(info, actions);
      catalogList.append(item);
    });
  }

  function setCatalogOpen(isOpen) {
    catalogPanel.hidden = !isOpen;
    toggleCatalogButton.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
      catalogNameInput.focus();
    } else {
      toggleCatalogButton.focus();
    }
  }

  function addService(event) {
    event.preventDefault();
    const name = catalogNameInput.value.trim();

    if (!name) {
      catalogNameInput.focus();
      return;
    }

    services.push({
      id: createServiceId(),
      name,
      unit: catalogUnitInput.value,
      price: parseNumber(catalogPriceInput.value)
    });

    saveServiceCatalog();
    renderServiceCatalog();
    catalogForm.reset();
    catalogNameInput.focus();
  }

  function getDraftData() {
    const items = Array.from(itemsBody.querySelectorAll(".item-row"), (row) => ({
      name: row.querySelector(".item-name").value,
      quantity: row.querySelector(".item-quantity").value,
      unit: row.querySelector(".item-unit").value,
      price: row.querySelector(".item-price").value
    }));

    return {
      sender: senderInput.value,
      recipient: recipientInput.value,
      estimateNumber: estimateNumberInput.value,
      date: dateInput.value,
      discountRate: discountRateInput.value,
      vatRate: vatRateInput.value,
      currency: currencySelect.value,
      comment: commentInput.value,
      items
    };
  }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(getDraftData()));
    } catch (error) {
      // Приложение продолжает работать, даже если хранилище браузера недоступно.
    }
  }

  function restoreDraft() {
    let draft;

    try {
      const savedDraft = localStorage.getItem(STORAGE_KEY);

      if (!savedDraft) {
        return false;
      }

      draft = JSON.parse(savedDraft);
    } catch (error) {
      return false;
    }

    if (!draft || typeof draft !== "object") {
      return false;
    }

    senderInput.value = typeof draft.sender === "string" ? draft.sender : "";
    recipientInput.value = typeof draft.recipient === "string" ? draft.recipient : "";
    estimateNumberInput.value = typeof draft.estimateNumber === "string" ? draft.estimateNumber : "";
    dateInput.value = typeof draft.date === "string" ? draft.date : "";
    discountRateInput.value = typeof draft.discountRate === "string" ? draft.discountRate : "0";
    vatRateInput.value = typeof draft.vatRate === "string" ? draft.vatRate : "0";
    commentInput.value = typeof draft.comment === "string" ? draft.comment : "";

    if (typeof draft.currency === "string") {
      currencySelect.value = draft.currency;
    }

    if (!currencySelect.value) {
      currencySelect.selectedIndex = 0;
    }

    itemsBody.replaceChildren();

    if (Array.isArray(draft.items) && draft.items.length > 0) {
      draft.items.forEach((item) => addItem({ values: item }));
    } else {
      addItem();
    }

    return true;
  }

  function getNextEstimateNumber(value) {
    const currentNumber = value.trim();
    const numberParts = currentNumber.match(/^(.*?)(\d+)$/);

    if (!numberParts) {
      return "1";
    }

    const prefix = numberParts[1];
    const digits = numberParts[2];
    const nextNumber = Number(digits) + 1;

    if (!Number.isSafeInteger(nextNumber)) {
      return "1";
    }

    return `${prefix}${String(nextNumber).padStart(digits.length, "0")}`;
  }

  function createNewEstimate() {
    const confirmed = window.confirm("Очистить текущую смету и создать новую?");

    if (!confirmed) {
      return;
    }

    const nextEstimateNumber = getNextEstimateNumber(estimateNumberInput.value);

    senderInput.value = "";
    recipientInput.value = "";
    estimateNumberInput.value = nextEstimateNumber;
    discountRateInput.value = "0";
    vatRateInput.value = "0";
    currencySelect.selectedIndex = 0;
    commentInput.value = "";
    itemsBody.replaceChildren();
    addItem();
    setToday();
    copyStatus.hidden = true;
    copyFallback.hidden = true;
    recalculate();
    updatePrintDocument();
    saveDraft();
    senderInput.focus();
  }

  function buildShareText() {
    const estimateNumber = estimateNumberInput.value.trim() || "—";
    const lines = [`Смета № ${estimateNumber} от ${formatPrintDate(dateInput.value)}`];

    itemsBody.querySelectorAll(".item-row").forEach((row) => {
      const name = row.querySelector(".item-name").value.trim();
      const quantityValue = row.querySelector(".item-quantity").value;
      const priceValue = row.querySelector(".item-price").value;

      if (!name && !quantityValue.trim() && !priceValue.trim()) {
        return;
      }

      const quantity = parseNumber(quantityValue);
      const price = parseNumber(priceValue);
      const unit = row.querySelector(".item-unit").value;
      const rowSum = Math.round(quantity * price);

      lines.push(`• ${name || "Без названия"} — ${formatQuantity(quantity)} ${unit} × ${formatMoney(price)} = ${formatMoney(rowSum)}`);
    });

    if (!discountRow.hidden) {
      lines.push(`Скидка ${formatQuantity(parseNumber(discountRateInput.value))}%: ${discountAmountOutput.textContent}`);
    }

    if (!vatRow.hidden) {
      lines.push(`НДС ${formatQuantity(parseNumber(vatRateInput.value))}%: ${vatAmountOutput.textContent}`);
    }

    lines.push(`Итого к оплате: ${grandTotal.textContent}`);
    return lines.join("\n");
  }

  function showCopySuccess() {
    window.clearTimeout(copyStatusTimer);
    copyFallback.hidden = true;
    copyStatus.hidden = false;
    copyStatusTimer = window.setTimeout(() => {
      copyStatus.hidden = true;
    }, 2000);
  }

  function showCopyFallback(text) {
    window.clearTimeout(copyStatusTimer);
    copyStatus.hidden = true;
    copyText.value = text;
    copyFallback.hidden = false;
    copyText.focus();
    copyText.select();
  }

  async function copyEstimate() {
    const shareText = buildShareText();

    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        throw new Error("Clipboard API is unavailable");
      }

      await navigator.clipboard.writeText(shareText);
      showCopySuccess();
    } catch (error) {
      showCopyFallback(shareText);
    }
  }

  addItemButton.addEventListener("click", () => {
    addItem({ focus: true });
    saveDraft();
  });
  toggleCatalogButton.addEventListener("click", () => setCatalogOpen(catalogPanel.hidden));
  closeCatalogButton.addEventListener("click", () => setCatalogOpen(false));
  catalogForm.addEventListener("submit", addService);
  setupNumericInput(discountRateInput);
  setupNumericInput(vatRateInput);
  setupNumericInput(catalogPriceInput);
  currencySelect.addEventListener("change", recalculate);
  currencySelect.addEventListener("change", renderServiceCatalog);
  printButton.addEventListener("click", () => {
    updatePrintDocument();
    window.print();
  });
  copyButton.addEventListener("click", copyEstimate);
  newEstimateButton.addEventListener("click", createNewEstimate);
  page.addEventListener("input", saveDraft);
  page.addEventListener("change", saveDraft);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !catalogPanel.hidden) {
      setCatalogOpen(false);
    }
  });
  window.addEventListener("beforeprint", updatePrintDocument);

  if (!restoreDraft()) {
    setToday();
    addItem();
  }

  recalculate();
  updatePrintDocument();
  loadServiceCatalog();
  renderServiceCatalog();
})();
