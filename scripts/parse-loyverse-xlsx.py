#!/usr/bin/env python3
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"


def col_to_idx(ref: str) -> int:
    letters = re.match(r"^[A-Z]+", ref).group(0)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def parse(path: str):
    with zipfile.ZipFile(path) as z:
        strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            ss_root = ET.fromstring(z.read("xl/sharedStrings.xml").decode("utf-8"))
            for si in ss_root.findall(f"{{{NS}}}si"):
                txt = "".join(t.text or "" for t in si.iter(f"{{{NS}}}t"))
                strings.append(txt)

        sheet_root = ET.fromstring(z.read("xl/worksheets/sheet1.xml").decode("utf-8"))

    rows = []
    for row in sheet_root.iter(f"{{{NS}}}row"):
        row_map = {}
        for c in row.findall(f"{{{NS}}}c"):
            r = c.get("r")
            idx = col_to_idx(r)
            t = c.get("t")
            v = c.find(f"{{{NS}}}v")
            val = v.text if v is not None else ""
            if t == "s":
                val = strings[int(val)]
            row_map[idx] = val
        rows.append(row_map)

    if not rows:
        return []

    header_map = rows[0]
    max_idx = max(header_map.keys()) if header_map else 0
    headers = [header_map.get(i, "") for i in range(max_idx + 1)]

    def col(name_prefix: str):
        for i, h in enumerate(headers):
            if h.startswith(name_prefix):
                return i
        return None

    idx_sku = col("SKU")
    idx_name = col("Name")
    idx_cost = col("Cost")
    idx_price = col("Price [")
    idx_stock = col("In stock [")
    idx_barcode = col("Barcode")
    idx_category = col("Category")

    items = []
    for r in rows[1:]:
        name = (r.get(idx_name) or "").strip() if idx_name is not None else ""
        if not name:
            continue
        price_raw = r.get(idx_price) if idx_price is not None else None
        try:
            price = float(price_raw) if price_raw not in (None, "") else 0.0
        except ValueError:
            price = 0.0
        cost_raw = r.get(idx_cost) if idx_cost is not None else None
        try:
            cost = float(cost_raw) if cost_raw not in (None, "") else 0.0
        except ValueError:
            cost = 0.0
        stock_raw = r.get(idx_stock) if idx_stock is not None else None
        try:
            stock = int(float(stock_raw)) if stock_raw not in (None, "") else 0
        except ValueError:
            stock = 0
        items.append({
            "name": name,
            "sku": (r.get(idx_sku) or "").strip() if idx_sku is not None else "",
            "barcode": (r.get(idx_barcode) or "").strip() if idx_barcode is not None else "",
            "category": (r.get(idx_category) or "").strip() if idx_category is not None else "",
            "costPrice": cost,
            "sellPrice": price,
            "openingStock": stock,
        })
    return items


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "/home/joram/Downloads/export_items-4.xlsx"
    print(json.dumps(parse(path), indent=2))
