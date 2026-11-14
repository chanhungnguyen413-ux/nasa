import hashlib
import json
from pathlib import Path
from urllib.parse import quote, unquote
import re

root = Path.cwd()
documents = json.loads((root / 'tmp/pdfs/extracted.json').read_text(encoding='utf-8'))
ocr = json.loads((root / 'tmp/pdfs/ocr.json').read_text(encoding='utf-8-sig'))

for document in documents:
    name = document['name']
    sections = [f'# {name}', '',
        '> Nội dung được chuyển từ PDF theo thứ tự trang, không tóm tắt. '
        'Ảnh từng trang giữ nguyên phần trình bày, hình ảnh, bảng biểu và chữ trong ảnh. '
        'Phần nhận dạng chữ từ ảnh (OCR) hỗ trợ tìm kiếm và có thể có sai sót; đối chiếu ảnh trang gốc khi cần.', '']
    for index, page in enumerate(document['pages'], 1):
        key = f'{name}_{index:02}'
        asset = root / 'markdown_assets' / f'{key}.png'
        assert asset.is_file()
        sections.extend([f'## Trang {index}', ''])
        if page['text']:
            sections.extend(['### Văn bản trích xuất từ PDF', '', '```text', page['text'], '```', ''])
        if name == 'Pre Hackathon Meetup.pptx' and index not in (2, 12, 14, 15):
            recognized = ocr.get(key, '')
            if recognized.strip():
                sections.extend(['### Chữ nhận dạng từ ảnh (OCR)', '', '```text', recognized, '```', ''])
        if page['links']:
            sections.extend(['### Liên kết trong trang gốc', ''])
            for link in page['links']:
                sections.append(f'- <{link}>')
            sections.append('')
        sections.extend(['### Ảnh trang gốc', '', f'![Trang {index}](markdown_assets/{quote(asset.name)})', ''])
    output = root / f'{name}.md'
    content = '\n'.join(sections)
    output.write_text(content, encoding='utf-8', newline='\n')
    saved = output.read_text(encoding='utf-8')
    assert len(re.findall(r'^## Trang \d+$', saved, re.M)) == len(document['pages'])
    for page in document['pages']:
        assert not page['text'] or page['text'] in saved
        for link in page['links']:
            assert link in saved
    for target in re.findall(r'!\[[^\]]*\]\(([^)]+)\)', saved):
        assert (root / unquote(target)).is_file()
    print(f'{output.name}: {len(document["pages"])} pages; {len(saved):,} characters; all extracted text, links and page images verified')

print('Original PDF SHA-256:')
for source in root.glob('*.pdf'):
    print(source.name, hashlib.sha256(source.read_bytes()).hexdigest())
