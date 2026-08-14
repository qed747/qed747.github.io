import json
import re
import sys
from datetime import datetime
from pathlib import Path

import openpyxl


WORKBOOK = Path(r"G:\My Drive\TS_2026\TS_Data\Sanctions\2026\USG_Enforcement_Actions_Database_Updated_2026-07-22_Excel-Compatible.xlsx")
ROOT = Path(__file__).resolve().parents[1]


COUNTRY_FIXES = {
    "U.S.": "United States",
    "USA": "United States",
    "US": "United States",
    "UAE": "United Arab Emirates",
    "UK": "United Kingdom",
    "PRC": "China",
}

AGENCY_NAMES = {
    "Bureau of Industry and Security": "BIS",
    "Directorate of Defense Trade Controls": "DDTC",
    "Office of Foreign Assets Control": "OFAC",
    "Department of Justice": "DOJ",
}

RECENT_OFFICIAL_OVERLAY = [
    {
        "id": "doj-recent-2026-08-05-dimitri-beix",
        "date": "2026-08-05",
        "agency": "DOJ",
        "name": "Dimitri Beix",
        "countries": ["Dominica"],
        "productCategory": "defense_services",
        "products": ["Firearms, firearm components, and ammunition"],
        "disclosure": "Not specified",
        "posture": "Criminal guilty plea",
        "amountUsd": 0,
        "factors": ["no_license", "red_flags", "transshipment", "us_origin"],
        "summary": "DOJ announced a guilty plea involving illegal export of firearms, firearm components, and ammunition from the United States to Dominica without required licenses or authorization.",
        "sourceTitle": "DOJ press release, August 5, 2026",
        "sourceUrl": "https://www.justice.gov/usao-ct/pr/homeland-security-task-force-dominican-national-admits-role-firearms-trafficking-scheme",
        "recordType": "Recent official DOJ overlay",
        "codingStatus": "Official-source coded for model",
        "civilCriminal": "Criminal",
    },
    {
        "id": "doj-recent-2026-07-23-andrey-shevlyakov",
        "date": "2026-07-23",
        "agency": "DOJ",
        "name": "Andrey Shevlyakov",
        "countries": ["Estonia", "Russia"],
        "productCategory": "encryption_electronics",
        "products": ["Sensitive electronic components"],
        "disclosure": "Not specified",
        "posture": "Criminal guilty plea",
        "amountUsd": 1500000,
        "factors": ["management_awareness", "military_end_use", "no_license", "red_flags", "restricted_party", "transshipment", "us_origin"],
        "summary": "DOJ announced a guilty plea involving a procurement network that exported sensitive U.S. electronics for Russian military and government contractors; the defendant agreed to forfeit approximately $1.5 million.",
        "sourceTitle": "DOJ press release, July 23, 2026",
        "sourceUrl": "https://www.justice.gov/usao-edny/pr/estonian-national-pleads-guilty-exporting-electronics-benefit-russian-military",
        "recordType": "Recent official DOJ overlay",
        "codingStatus": "Official-source coded for model",
        "civilCriminal": "Criminal",
    },
]


def clean(value):
    if value is None:
        return ""
    text = str(value).strip()
    return "" if text.lower() in {"none", "nan", "n/a - administrative"} else text


def number(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    cleaned = re.sub(r"[^0-9.\-]", "", str(value))
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def date_iso(value, fallback_year=""):
    if isinstance(value, datetime):
        return value.date().isoformat()
    text = clean(value)
    if re.fullmatch(r"\d{8}", text):
        return f"{text[:4]}-{text[4:6]}-{text[6:8]}"
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            pass
    year = clean(fallback_year)
    return f"{year}-01-01" if year else ""


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", clean(value).lower()).strip("-")[:90] or "record"


def split_list(value):
    text = clean(value)
    if not text:
        return []
    parts = re.split(r";|,|\band\b", text)
    out = []
    for part in parts:
        item = clean(part)
        if not item or item.lower() in {"multiple", "not stated in source"}:
            continue
        out.append(COUNTRY_FIXES.get(item, item))
    return sorted(set(out))


def extract_notes_field(notes, label):
    match = re.search(rf"{label}\s*:\s*([^.;]+(?:; [^.;]+)*)", clean(notes), flags=re.I)
    return match.group(1).strip() if match else ""


def countries_from_ear(row):
    explicit = extract_notes_field(row.get("Notes"), "Countries/nexus")
    if explicit:
        return split_list(explicit)
    return split_list(row.get("Current Parent HQ Country"))


def normalize_agency(value):
    text = clean(value)
    for long_name, short in AGENCY_NAMES.items():
        if long_name.lower() in text.lower():
            return short
    if "security" in text.lower() and "bureau" in text.lower():
        return "BIS"
    if "defense trade" in text.lower():
        return "DDTC"
    if "ofac" in text.lower():
        return "OFAC"
    if "justice" in text.lower() or text.upper() == "DOJ":
        return "DOJ"
    return text or "Unknown"


def product_category(*values):
    text = " ".join(clean(v).lower() for v in values)
    if any(x in text for x in ["semiconductor", "advanced computing", "huawei", "chip", "wafer"]):
        return "semiconductors_ai"
    if any(x in text for x in ["aerospace", "aircraft", "aviation", "missile", "satellite", "usml category viii"]):
        return "aerospace_aviation"
    if any(x in text for x in ["defense", "itar", "usml", "military", "technical data"]):
        return "defense_services"
    if any(x in text for x in ["oil", "gas", "energy", "petroleum", "liquefied"]):
        return "oil_gas_energy"
    if any(x in text for x in ["bank", "securities", "financial", "brokerage", "payment", "debt"]):
        return "financial_services"
    if any(x in text for x in ["freight", "shipping", "logistics", "shipment", "carrier"]):
        return "maritime_logistics"
    if any(x in text for x in ["software", "sensor", "electronics", "thermal", "camera", "telecom", "encryption"]):
        return "encryption_electronics"
    if any(x in text for x in ["service", "consulting", "training", "advisory"]):
        return "services"
    return "controlled_goods"


def factors_from_text(row, text):
    haystack = text.lower()
    factors = []
    if "vsd: yes" in haystack or clean(row.get("Voluntary Disclosure?")).lower().startswith("yes"):
        factors.append("voluntary_disclosure")
    if "remed" in haystack or "compliance" in haystack or "cooperat" in haystack:
        factors.append("remediation")
    if any(x in haystack for x in ["sdn", "entity list", "blocked", "restricted party", "huawei", "smic"]):
        factors.append("restricted_party")
    if any(x in haystack for x in ["military", "defense", "itar", "usml", "aeca"]):
        factors.append("military_end_use")
    if any(x in haystack for x in ["unlicensed", "without a license", "license", "authorization"]):
        factors.append("no_license")
    if any(x in haystack for x in ["transshipment", "transshipped", "distributor", "reexport", "retransfer", "through"]):
        factors.append("transshipment")
    if any(x in haystack for x in ["evasion", "conceal", "false", "red flag", "reckless"]):
        factors.append("red_flags")
    if any(x in haystack for x in ["management", "actual knowledge", "knew", "awareness"]):
        factors.append("management_awareness")
    if any(x in haystack for x in ["compliance failure", "inadequate compliance", "screening", "recordkeeping", "controls"]):
        factors.append("weak_controls")
    if any(x in haystack for x in ["u.s.", "united states", "us-origin", "u.s.-origin"]):
        factors.append("us_origin")
    return sorted(set(factors))


def disclosure_status(value, notes=""):
    text = f"{clean(value)} {clean(notes)}".lower()
    if "vsd: yes" in text or text.startswith("yes") or "voluntary self" in text:
        return "Voluntary self-disclosure"
    if "vsd: no" in text or text.startswith("no"):
        return "No voluntary self-disclosure"
    return "Not specified"


def row_dict(headers, row):
    return {headers[i]: row[i] for i in range(min(len(headers), len(row))) if headers[i]}


def ofac_record(row, index):
    name = clean(row.get("Individual/Company"))
    if not name:
        return None
    date = date_iso(row.get("Announcement Date"), row.get("Year"))
    text = " ".join(clean(row.get(k)) for k in row)
    penalty = number(row.get("Penalty")) or 0
    countries = split_list(row.get("Countries Involved"))
    items = clean(row.get("Items/Technology Involved")) or clean(row.get("Item(s) Exported/ Other Violations"))
    factors = factors_from_text(row, text)
    if clean(row.get("Egregious Case?")).lower().startswith("yes"):
        factors.append("management_awareness")
    if clean(row.get("SDN Individual or Entity?")).lower().startswith("yes"):
        factors.append("restricted_party")
    if clean(row.get("Items Eligble for License?")).lower().startswith("no"):
        factors.append("no_license")
    return {
        "id": f"ofac-workbook-{date}-{index}-{slug(name)}",
        "date": date,
        "agency": "OFAC",
        "name": name,
        "countries": countries,
        "productCategory": product_category(row.get("Industry"), items, row.get("Sanctions Regime")),
        "products": [x for x in [items, clean(row.get("Item(s) Exported/ Other Violations"))] if x],
        "disclosure": disclosure_status(row.get("Voluntary Disclosure?")),
        "posture": "OFAC civil penalty/settlement",
        "amountUsd": penalty,
        "factors": sorted(set(factors)),
        "summary": clean(row.get("Item(s) Exported/ Other Violations")) or f"OFAC enforcement action involving {name}.",
        "sourceTitle": f"Workbook OFAC {clean(row.get('Year'))} enforcement action",
        "sourceUrl": "https://ofac.treasury.gov/civil-penalties-and-enforcement-information",
        "recordType": "Workbook normalized case",
        "codingStatus": "Workbook-coded for model",
        "violationCount": number(row.get("# of violations")),
        "sanctionsRegime": clean(row.get("Sanctions Regime")),
        "egregious": clean(row.get("Egregious Case?")),
    }


def ear_itar_record(row, index):
    name = clean(row.get("Company"))
    if not name:
        return None
    agency = normalize_agency(row.get("Agency2"))
    date = date_iso(row.get("Penalty Date"), row.get("Year"))
    text = " ".join(clean(row.get(k)) for k in row)
    amount = number(row.get("Penalty Amount Adjusted For Eliminating Multiple Counting"))
    if amount is None:
        amount = number(row.get("Penalty Amount")) or 0
    goods = clean(row.get("Goods/Items"))
    desc = clean(row.get("Description"))
    notes = clean(row.get("Notes"))
    return {
        "id": f"ear-itar-workbook-{date}-{index}-{slug(name)}",
        "date": date,
        "agency": agency,
        "name": name,
        "countries": countries_from_ear(row),
        "productCategory": product_category(row.get("NAICS Translation"), row.get("Current Parent Specific Industry"), goods, desc, notes),
        "products": [x for x in [goods, clean(row.get("Secondary Offense"))] if x],
        "disclosure": disclosure_status("", notes),
        "posture": clean(row.get("Prosecution Agreement")) or clean(row.get("Action Type")) or "Enforcement action",
        "amountUsd": amount,
        "factors": factors_from_text(row, text),
        "summary": desc or clean(row.get("Primary Offense")) or f"{agency} enforcement action involving {name}.",
        "sourceTitle": clean(row.get("Case ID")) or f"Workbook {agency} enforcement action",
        "sourceUrl": clean(row.get("Info Source")),
        "recordType": "Workbook normalized case",
        "codingStatus": "Workbook-coded for model",
        "civilCriminal": clean(row.get("Civil/Criminal")),
        "caseId": clean(row.get("Case ID")),
    }


def logistics_record(row, index):
    name = clean(row.get("Company"))
    if not name:
        return None
    agency = normalize_agency(row.get("U.S. Agency"))
    year = clean(row.get("Year ")) or clean(row.get("Year"))
    text = " ".join(clean(row.get(k)) for k in row)
    return {
        "id": f"logistics-workbook-{year}-{index}-{slug(name)}",
        "date": f"{year}-01-01" if year else "",
        "agency": agency,
        "name": name,
        "countries": split_list(row.get("Nationality")),
        "productCategory": "maritime_logistics",
        "products": ["Logistics / freight / shipping services"],
        "disclosure": "Not specified",
        "posture": "Logistics enforcement action",
        "amountUsd": number(row.get("Fine")) or 0,
        "factors": factors_from_text(row, text + " logistics shipment freight"),
        "summary": f"Logistics enforcement action involving {name}.",
        "sourceTitle": "Workbook logistics enforcement row",
        "sourceUrl": "",
        "recordType": "Workbook normalized case",
        "codingStatus": "Workbook-coded for model",
    }


def load_records():
    wb = openpyxl.load_workbook(WORKBOOK, read_only=True, data_only=True)
    records = []
    sheet_counts = {}
    for sheet, builder in [("OFAC", ofac_record), ("EAR-ITAR", ear_itar_record), ("Logistics", logistics_record)]:
        ws = wb[sheet]
        rows = ws.iter_rows(values_only=True)
        headers = [clean(x) for x in next(rows)]
        count = 0
        for index, row in enumerate(rows, start=2):
            record = builder(row_dict(headers, row), index)
            if record and record["name"]:
                records.append(record)
                count += 1
        sheet_counts[sheet] = count
    records.extend(RECENT_OFFICIAL_OVERLAY)
    sheet_counts["Recent DOJ"] = len(RECENT_OFFICIAL_OVERLAY)
    return records, sheet_counts


def js_write(path, variable, value):
    Path(path).write_text(f"window.{variable} = {json.dumps(value, indent=2, ensure_ascii=False)};\n", encoding="utf-8")


def main():
    if not WORKBOOK.exists():
        print(f"Workbook not found: {WORKBOOK}", file=sys.stderr)
        return 1
    records, sheet_counts = load_records()
    records.sort(key=lambda x: (x.get("date") or "", x.get("name") or ""), reverse=True)
    source_index = [
        {
            "id": record["id"],
            "date": record["date"],
            "agency": record["agency"],
            "name": record["name"],
            "amountUsd": record["amountUsd"],
            "recordType": record["recordType"],
            "codingStatus": record["codingStatus"],
            "countries": record.get("countries", []),
            "disclosure": record.get("disclosure", "Not specified"),
            "aggravatingFactors": [record.get("factors", [])],
            "sourceTitle": record.get("sourceTitle", ""),
            "sourceUrl": record.get("sourceUrl", ""),
        }
        for record in records
    ]
    coverage = [
        {
            "agency": "OFAC",
            "source": "Workbook OFAC sheet",
            "scope": "OFAC civil penalties and settlements through workbook update",
            "indexedRecords": sheet_counts.get("OFAC", 0),
            "indexedPeriod": "Workbook updated 2026-07-22",
            "status": "Loaded and normalized for Bayesian scoring",
            "notes": "Rows mapped from workbook fields including penalty, regime, VSD, countries, items, SDN flag, and egregious-case flag.",
            "sourceUrl": "https://ofac.treasury.gov/civil-penalties-and-enforcement-information",
        },
        {
            "agency": "BIS/DDTC/DOJ",
            "source": "Workbook EAR-ITAR sheet",
            "scope": "Export-control, ITAR, administrative, civil, and criminal enforcement actions",
            "indexedRecords": sheet_counts.get("EAR-ITAR", 0),
            "indexedPeriod": "Workbook updated 2026-07-22",
            "status": "Loaded and normalized for Bayesian scoring",
            "notes": "Rows mapped from workbook fields including agency, case ID, goods, description, source URL, country nexus from notes, VSD, and penalty amount.",
            "sourceUrl": "",
        },
        {
            "agency": "Logistics",
            "source": "Workbook Logistics sheet",
            "scope": "Logistics-specific enforcement rows",
            "indexedRecords": sheet_counts.get("Logistics", 0),
            "indexedPeriod": "Workbook updated 2026-07-22",
            "status": "Loaded and normalized for Bayesian scoring",
            "notes": "Rows mapped as logistics/freight/shipping cases.",
            "sourceUrl": "",
        },
        {
            "agency": "DOJ",
            "source": "Recent official DOJ export-control feed",
            "scope": "Post-workbook DOJ export-control and sanctions news checked against justice.gov",
            "indexedRecords": sheet_counts.get("Recent DOJ", 0),
            "indexedPeriod": "Official DOJ feed checked 2026-08-14",
            "status": "Loaded and normalized for Bayesian scoring",
            "notes": "Recent post-workbook DOJ matters are normalized as overlay records so the scoring model includes the latest official entries identified after the July 22 workbook update.",
            "sourceUrl": "https://www.justice.gov/nsd/export-control-news",
        },
    ]
    js_write(ROOT / "data" / "cases.js", "SANCTIONS_CASES", records)
    js_write(ROOT / "data" / "sourceIndex.js", "SOURCE_INDEX", [])
    js_write(ROOT / "data" / "sourceCoverage.js", "SOURCE_COVERAGE", coverage)
    print(json.dumps({"records": len(records), "sheet_counts": sheet_counts}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
