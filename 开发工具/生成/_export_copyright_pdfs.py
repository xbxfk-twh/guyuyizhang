"""Export the prepared copyright DOCX text to predictable A4 PDFs.

Word automation is not reliable on every workstation; these PDFs use the
bundled CJK font in PyMuPDF and preserve the 50-line source pages.
"""

from pathlib import Path

import pymupdf
from docx import Document


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '软著申请'
SOURCE = OUT / '源代码文档_v1.10.docx'
MANUAL = OUT / '软件说明书_v1.10.docx'
A4 = pymupdf.paper_rect('a4')
FONT = 'simfang'
FONT_FILE = r'C:\Windows\Fonts\simfang.ttf'


def export_source():
    paragraphs = [p.text for p in Document(SOURCE).paragraphs]
    if len(paragraphs) != 60 * 51:
        raise ValueError(f'Expected 60 pages of 51 paragraphs, got {len(paragraphs)}')
    pdf = pymupdf.open()
    for index in range(60):
        block = paragraphs[index * 51:(index + 1) * 51]
        page = pdf.new_page(width=A4.width, height=A4.height)
        page.insert_font(fontname=FONT, fontfile=FONT_FILE)
        page.insert_text((58, 58), block[0], fontsize=9, fontname=FONT)
        y = 76
        for line in block[1:]:
            page.insert_text((58, y), line, fontsize=7.5, fontname=FONT)
            y += 13.5
    pdf.save(OUT / '源代码文档_v1.10.pdf', garbage=4, deflate=True)
    pdf.close()


def wrap(text, font, size, width):
    if not text:
        return ['']
    lines, current = [], ''
    for char in text:
        candidate = current + char
        if current and font.text_length(candidate, fontsize=size) > width:
            lines.append(current)
            current = char
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def export_manual():
    paragraphs = [p.text for p in Document(MANUAL).paragraphs]
    pdf = pymupdf.open()
    font = pymupdf.Font(fontfile=FONT_FILE)
    page = pdf.new_page(width=A4.width, height=A4.height)
    page.insert_font(fontname=FONT, fontfile=FONT_FILE)
    y = 52
    for index, paragraph in enumerate(paragraphs):
        if not paragraph:
            y += 9
            continue
        is_title = index == 0
        is_heading = paragraph[:2] in ('一、', '二、', '三、', '四、', '五、', '六、')
        size = 16 if is_title else (11 if is_heading else 9.5)
        step = 23 if is_title else (19 if is_heading else 15)
        lines = wrap(paragraph, font, size, A4.width - 100)
        if y + len(lines) * step > A4.height - 48:
            page = pdf.new_page(width=A4.width, height=A4.height)
            page.insert_font(fontname=FONT, fontfile=FONT_FILE)
            y = 52
        for line in lines:
            x = (A4.width - font.text_length(line, fontsize=size)) / 2 if is_title else 50
            page.insert_text((x, y), line, fontsize=size, fontname=FONT)
            y += step
        y += 5 if is_heading else 2
    pdf.save(OUT / '软件说明书_v1.10.pdf', garbage=4, deflate=True)
    pdf.close()


if __name__ == '__main__':
    export_source()
    export_manual()
    for path in (OUT / '源代码文档_v1.10.pdf', OUT / '软件说明书_v1.10.pdf'):
        with pymupdf.open(path) as pdf:
            print(path.name, len(pdf), 'pages')
