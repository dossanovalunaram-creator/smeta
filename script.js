(function () {
  "use strict";

  const itemsBody = document.querySelector("#items-body");
  const rowTemplate = document.querySelector("#item-row-template");
  const addItemButton = document.querySelector("#add-item");
  const grandTotal = document.querySelector("#grand-total");
  const dateInput = document.querySelector("#estimate-date");

  const moneyFormatter = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2
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
    const safeValue = Number.isFinite(value) ? value : 0;
    return `${moneyFormatter.format(safeValue)} ₸`;
  }

  function recalculate() {
    let total = 0;

    itemsBody.querySelectorAll(".item-row").forEach((row) => {
      const quantity = parseNumber(row.querySelector(".item-quantity").value);
      const price = parseNumber(row.querySelector(".item-price").value);
      const rowSum = quantity * price;
      const safeRowSum = Number.isFinite(rowSum) ? rowSum : 0;

      row.querySelector(".item-sum").textContent = formatMoney(safeRowSum);
      total += safeRowSum;
    });

    grandTotal.textContent = formatMoney(total);
  }

  function addItem(options = {}) {
    const fragment = rowTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".item-row");

    row.querySelector(".item-quantity").addEventListener("input", recalculate);
    row.querySelector(".item-price").addEventListener("input", recalculate);
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

  addItemButton.addEventListener("click", () => addItem({ focus: true }));

  setToday();
  addItem();
  recalculate();
})();
