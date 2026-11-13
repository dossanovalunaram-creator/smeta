(function () {
  "use strict";

  const itemsBody = document.querySelector("#items-body");
  const rowTemplate = document.querySelector("#item-row-template");
  const addItemButton = document.querySelector("#add-item");
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
  const estimateNumberInput = document.querySelector('[name="estimate-number"]');
  const commentInput = document.querySelector("#estimate-comment");
  const printButton = document.querySelector("#print-estimate");
  const printEstimateNumber = document.querySelector("#print-estimate-number");
  const printEstimateDate = document.querySelector("#print-estimate-date");
  const printCommentText = document.querySelector("#print-comment-text");

  const moneyFormatter = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0
  });

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

    setupNumericInput(row.querySelector(".item-quantity"));
    setupNumericInput(row.querySelector(".item-price"));
    row.querySelector(".remove-item").addEventListener("click", () => {
      row.remove();
      recalculate();
    });

    row.addEventListener("keydown", (event) => {
      const isLastRow = row === itemsBody.lastElementChild;
      const isInteractiveChoice = event.target instanceof HTMLSelectElement;

      if (event.key === "Enter" && isLastRow && !isInteractiveChoice) {
        event.preventDefault();
        addItem({ focus: true });
      }
    });

    itemsBody.appendChild(fragment);

    if (options.focus) {
      row.querySelector(".item-name").focus();
    }
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

  addItemButton.addEventListener("click", () => addItem({ focus: true }));
  setupNumericInput(discountRateInput);
  setupNumericInput(vatRateInput);
  currencySelect.addEventListener("change", recalculate);
  printButton.addEventListener("click", () => {
    updatePrintDocument();
    window.print();
  });
  window.addEventListener("beforeprint", updatePrintDocument);

  setToday();
  addItem();
  recalculate();
  updatePrintDocument();
})();
