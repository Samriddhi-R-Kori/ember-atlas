"""Read-only extraction. Source positions are 1-based, never experiment IDs."""
import csv
import hashlib
import io
import struct
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import date, datetime, time
import xlrd
import openpyxl
from openpyxl.utils import get_column_letter


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def scalar(value):
    return value.isoformat() if isinstance(value, (date, datetime, time)) else value


def missingness(value):
    if value is None or value == '':
        return 'blank'
    if isinstance(value, str):
        text = value.strip().lower()
        if text in ('-', '–', '—'):
            return 'source_dash'
        if text in ('n/a', 'na', 'none', '?', 'unknown'):
            return 'source_annotation'  # meaning must be reviewed, not guessed
        if text.startswith(('~', '≈')):
            return 'estimated'
    return 'observed'


def csv_data(path):
    raw = Path(path).read_bytes()
    try:
        text = raw.decode('utf-8')  # retain BOM as part of original header
        encoding = 'utf-8'
    except UnicodeDecodeError:
        text = raw.decode('cp1252')
        encoding = 'cp1252'
    reader = csv.reader(io.StringIO(text, newline=''))
    headers = next(reader)
    records = []
    previous = reader.line_num
    for index, values in enumerate(reader, 2):
        records.append({'row': index, 'line_start': previous + 1,
                        'line_end': reader.line_num, 'values': values})
        previous = reader.line_num
    return headers, records, encoding


def xls_formulas(book):
    """Keep BIFF token bytes even if xlrd cannot decompile a shared formula."""
    result = {}
    for name, start in zip(book.sheet_names(), book._sh_abs_posn):
        cells, shared = {}, []
        pos = start
        while pos + 4 <= len(book.mem):
            opcode, size = struct.unpack_from('<HH', book.mem, pos)
            data = bytes(book.mem[pos + 4:pos + 4 + size])
            pos += 4 + size
            if opcode == 0x0006:
                r, c = struct.unpack_from('<HH', data)
                count = struct.unpack_from('<H', data, 20)[0]
                tokens = data[22:22 + count]
                try:
                    formula = xlrd.formula.decompile_formula(
                        book, tokens, count, xlrd.formula.FMLA_TYPE_CELL, r, c)
                except (Exception, AssertionError) as exc:
                    formula = None
                    error = type(exc).__name__
                else:
                    error = None
                cells[(r + 1, c + 1)] = {
                    'formula': formula, 'formula_tokens_hex': tokens.hex(),
                    'decompile_error': error}
            elif opcode in (0x04BC, 0x0221):
                shared.append({'opcode': hex(opcode), 'payload_hex': data.hex()})
            if opcode == 0x000A:
                break
        result[name] = (cells, shared)
    return result


def extract_workbook(path, source):
    sheets, cells = [], []
    if path.suffix == '.xlsx':
        # Preserve raw XML value tokens (including Excel date/time serials).
        raw_xml = {}
        ns = {'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        with zipfile.ZipFile(path) as archive:
            workbook = ET.fromstring(archive.read('xl/workbook.xml'))
            rels = ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
            targets = {r.attrib['Id']:r.attrib['Target'] for r in rels}
            for sheet in workbook.find('s:sheets',ns):
                rid = sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
                target = targets[rid]
                member = target.lstrip('/') if target.startswith('/') else 'xl/'+target
                root = ET.fromstring(archive.read(member))
                raw_xml[sheet.attrib['name']] = {c.attrib['r']:{'xml_type':c.get('t'),
                    'xml_value':c.findtext('s:v',default=None,namespaces=ns),
                    'xml_formula':c.findtext('s:f',default=None,namespaces=ns)}
                    for c in root.findall('.//s:sheetData/s:row/s:c',ns)}
        formulas = openpyxl.load_workbook(path, data_only=False)
        cached = openpyxl.load_workbook(path, data_only=True)
        for ws in formulas:
            nonempty_rows = set()
            for row in ws:
                for cell in row:
                    if cell.value is None:
                        continue
                    nonempty_rows.add(cell.row)
                    is_formula = cell.data_type == 'f'
                    cells.append({'source': source, 'sheet': ws.title,
                                  'row': cell.row, 'column': cell.column,
                                  'coordinate': cell.coordinate,
                                  'value': scalar(cached[ws.title][cell.coordinate].value if is_formula else cell.value),
                                  'formula': cell.value if is_formula else None,
                                  'data_type': cell.data_type,
                                  'number_format': cell.number_format,
                                  **raw_xml[ws.title].get(cell.coordinate,{})})
            sheets.append({'source': source, 'sheet': ws.title,
                           'extent_rows': ws.max_row, 'extent_columns': ws.max_column,
                           'nonempty_rows': len(nonempty_rows),
                           'merged_ranges': [str(r) for r in ws.merged_cells.ranges]})
        formulas.close()
        cached.close()
    else:
        book = xlrd.open_workbook(path, on_demand=True, formatting_info=True)
        formula_data = xls_formulas(book)
        for ws in book.sheets():
            fs, shared = formula_data[ws.name]
            nonempty_rows = set()
            for r in range(ws.nrows):
                for c in range(ws.ncols):
                    cell = ws.cell(r, c)
                    if cell.ctype in (xlrd.XL_CELL_EMPTY, xlrd.XL_CELL_BLANK) and (r + 1, c + 1) not in fs:
                        continue
                    nonempty_rows.add(r)
                    value = cell.value
                    date_value = None
                    if cell.ctype == xlrd.XL_CELL_DATE:
                        date_value = xlrd.xldate.xldate_as_datetime(value, book.datemode).isoformat()
                    fmt = book.format_map.get(book.xf_list[cell.xf_index].format_key)
                    cells.append({'source': source, 'sheet': ws.name, 'row': r + 1,
                                  'column': c + 1, 'coordinate': f'{get_column_letter(c+1)}{r+1}',
                                  'value': value, 'data_type': cell.ctype,
                                  'number_format': fmt.format_str if fmt else None,
                                  'date_interpretation': date_value,
                                  **fs.get((r + 1, c + 1), {'formula': None})})
            sheets.append({'source': source, 'sheet': ws.name,
                           'extent_rows': ws.nrows, 'extent_columns': ws.ncols,
                           'nonempty_rows': len(nonempty_rows), 'date_mode': book.datemode,
                           'shared_formula_records': shared,
                           'merged_ranges': ws.merged_cells})
        book.release_resources()
    return sheets, cells
