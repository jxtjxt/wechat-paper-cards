import json,re,struct,sys,zipfile
from pathlib import Path

def package(root):
    root=Path(root).resolve()
    cards=sorted(p for p in root.glob('*.png') if re.fullmatch(r'\d{2}\.png',p.name))
    assert cards,'No numbered PNGs'
    assert [p.stem for p in cards]==[f'{i:02d}' for i in range(1,len(cards)+1)],'Non-contiguous card numbers'
    for p in cards:
        data=p.read_bytes()
        assert data[:8]==b'\x89PNG\r\n\x1a\n' and struct.unpack('>II',data[16:24])==(1080,1440),f'Invalid PNG: {p.name}'
        assert p.with_suffix('.html').is_file(),f'Missing editable HTML: {p.stem}'
    qa=json.loads((root/'layout-qa.json').read_text(encoding='utf-8-sig'))
    assert len(qa)==len(cards) and all(not x['violations'] for x in qa),'Layout QA failed'
    visual=json.loads((root/'visual-review.json').read_text(encoding='utf-8-sig'))
    assert visual.get('reviewed') is True,'Actual visual review required'
    for n in ['source.json','claim-ledger.json','preview.html','交付说明.md']:assert (root/n).is_file(),f'Missing {n}'
    copy=(root/'发布文案.txt').read_text(encoding='utf-8-sig')
    body=copy.split('发布文案：',1)[1].split('来源：',1)[0]
    chars=len(re.sub(r'\s','',body));assert 400<=chars<=600,f'Copy has {chars} characters'
    names=[p.name for p in cards]+['发布文案.txt','交付说明.md']
    dest=root/'公众号贴图上传包.zip'
    with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED) as z:
        for n in names:z.write(root/n,n)
    with zipfile.ZipFile(dest) as z:
        assert z.testzip() is None and z.namelist()==names
        assert all(z.read(n)==(root/n).read_bytes() for n in names)
    result=dict(card_count=len(cards),dimensions=[1080,1440],body_nonwhitespace_characters=chars,body_han_characters=len(re.findall(r'[\u4e00-\u9fff]',body)),zip_crc_ok=True,zip_content_matches=True,visual_review_recorded=True)
    (root/'delivery-qa.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':package(sys.argv[1])
