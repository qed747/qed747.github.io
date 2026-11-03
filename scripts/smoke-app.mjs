import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("index.html", "utf8");
const ids = Array.from(html.matchAll(/id="([^"]+)"/g)).map((match) => match[1]);
const store = new Map();

function makeElement(id) {
  return {
    id,
    value: id === "companyFilter" || id.endsWith("Filter") ? "All" : "",
    checked: false,
    dataset: {},
    style: {},
    children: [],
    listeners: {},
    addEventListener(eventName, handler) {
      this.listeners[eventName] = handler;
    },
    appendChild(child) {
      this.children.push(child);
    },
    querySelectorAll() {
      return [];
    },
    click() {
      if (this.listeners.click) this.listeners.click({ preventDefault() {} });
    },
    dispatch(eventName) {
      if (this.listeners[eventName]) this.listeners[eventName]({ preventDefault() {} });
    },
    set innerHTML(value) {
      this._innerHTML = value;
    },
    get innerHTML() {
      return this._innerHTML || "";
    },
    set textContent(value) {
      this._textContent = value;
    },
    get textContent() {
      return this._textContent || "";
    }
  };
}

for (const id of ids) store.set(id, makeElement(id));

const document = {
  addEventListener(event, callback) {
    if (event === "DOMContentLoaded") callback();
  },
  getElementById(id) {
    if (!store.has(id)) store.set(id, makeElement(id));
    return store.get(id);
  },
  createElement(tag) {
    return makeElement(tag);
  },
  querySelectorAll(selector) {
    if (selector === ".tab") {
      return [
        { dataset: { tab: "historical" }, classList: { toggle() {} }, addEventListener() {} },
        { dataset: { tab: "patterns" }, classList: { toggle() {} }, addEventListener() {} }
      ];
    }
    if (selector === ".tab-panel") {
      return [
        { id: "historical", classList: { toggle() {} } },
        { id: "patterns", classList: { toggle() {} } }
      ];
    }
    return [];
  }
};

const context = {
  window: {},
  document,
  Intl,
  Blob: function Blob() {},
  URL: { createObjectURL: () => "blob:smoke", revokeObjectURL() {} }
};

vm.createContext(context);
for (const file of ["data/cases.js", "data/sourceCoverage.js", "data/sourceIndex.js", "app.js"]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
}

store.get("searchInput").value = "DHL";
vm.runInContext("document.getElementById('runSearch').click()", context);
console.log("smoke-ok", store.get("caseList").innerHTML.includes("DHL"));

store.get("companyFilter").value = "Air Jamaica Ltd.";
store.get("searchInput").value = "Seagate";
vm.runInContext("document.getElementById('runSearch').click()", context);
console.log("stale-company-override-ok", store.get("caseList").innerHTML.includes("Seagate"));
store.get("companyFilter").value = "All";
store.get("searchInput").value = "Andrei Samuilovski";
vm.runInContext("document.getElementById('runSearch').click()", context);
console.log("legal-status-ok", store.get("caseList").innerHTML.includes("legal-status") && store.get("caseList").innerHTML.includes("Case summary"));
console.log("summary-provenance-ok", store.get("caseList").innerHTML.includes("Source-grounded") || store.get("caseList").innerHTML.includes("Limited-detail record"));

store.get("archetype").value = "dual_use";
store.get("destination").value = "China";
store.get("intermediary").value = "United Arab Emirates";
store.get("product").value = "semiconductors_ai";
store.get("classification").value = "eccn";
store.get("valueUsd").value = "";
store.get("advisorQuestion").value = "Can I export a TV from the US to Russia?";
store.get("advisorFocus").value = "triage";
store.get("advisorUseTransaction").checked = true;
store.get("advisorForm").dispatch("submit");
console.log("advisor-ok", store.get("advisorOutput").innerHTML.includes("Recommended Risk Management Response"));
console.log("advisor-russia-ok", store.get("advisorOutput").innerHTML.includes("High concern") && store.get("advisorOutput").innerHTML.includes("Russia"));
console.log("advisor-no-invented-value-ok", store.get("advisorOutput").innerHTML.includes("Not stated") && !store.get("advisorOutput").innerHTML.includes("$250,000"));
console.log("advisor-direct-answer-ok", store.get("advisorOutput").innerHTML.includes("Do not ship or approve as stated"));
