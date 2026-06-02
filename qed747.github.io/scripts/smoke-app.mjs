import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("index.html", "utf8");
const ids = Array.from(html.matchAll(/id="([^"]+)"/g)).map((match) => match[1]);
const store = new Map();

function makeElement(id) {
  return {
    id,
    value: id === "companyFilter" || id.endsWith("Filter") ? "All" : "",
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
