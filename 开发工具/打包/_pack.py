# 打包：zip 顶层必须是单个英文文件夹 guyuyizhang，路径用正斜杠（平台上传要求）
# 版本号在下面这一行改；同时记得改 index.html 的 BUILD_VER（两者要一致，回归里有断言盯着）
import os, zipfile, zlib, hashlib

VER = 'v1.08'
SRC = r'C:\Users\34297\Desktop\孤屿遗章\孤屿遗章-游戏 - 发布'
OUT = r'C:\Users\34297\Desktop\孤屿遗章\孤屿遗章_发布版_' + VER + '.zip'
TOP = 'guyuyizhang'

files = []
for root, dirs, fs in os.walk(SRC):
    dirs[:] = sorted(d for d in dirs if d not in ('.git', '__pycache__'))
    for f in sorted(fs):
        p = os.path.join(root, f)
        rel = os.path.relpath(p, SRC).replace('\\', '/')
        files.append((p, TOP + '/' + rel))
files.sort(key=lambda t: t[1])

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p, arc in files:
        z.write(p, arc)

# ---- 校验 ----
problems = []
with zipfile.ZipFile(OUT) as z:
    names = z.namelist()
    infos = z.infolist()
    if any('\\' in n for n in names):
        problems.append('zip 里有反斜杠路径')
    if len(set(n.split('/')[0] for n in names)) != 1 or names[0].split('/')[0] != TOP:
        problems.append('顶层目录不是单一 %s' % TOP)
    if len(names) != len(files):
        problems.append('文件数不符：zip %d vs 源 %d' % (len(names), len(files)))
    for (p, arc), info in zip(files, infos):
        if info.filename != arc:
            problems.append('条目顺序/名字对不上：%s' % info.filename)
            break
        if info.CRC != zlib.crc32(open(p, 'rb').read()):
            problems.append('内容校验失败：%s' % arc)
    for n in names:
        if n.endswith('/') or n.split('/')[-1] == '':
            problems.append('空的目录条目：' + n)

size = os.path.getsize(OUT)
ext = {}
for n in names:
    e = os.path.splitext(n)[1].lower() or '(none)'
    ext[e] = ext.get(e, 0) + 1

print('输出：', OUT)
print('大小：%.2f MB' % (size / 1048576))
print('条目数：', len(names))
print('顶层：', sorted(set(n.split('/')[0] for n in names)))
print('类型分布：', dict(sorted(ext.items(), key=lambda kv: -kv[1])))
key = ['guyuyizhang/index.html', 'guyuyizhang/js/game.js', 'guyuyizhang/css/style.css',
       'guyuyizhang/assets/img/items/blueBull.png', 'guyuyizhang/assets/img/items/zhangLaoJi.png',
       'guyuyizhang/assets/img/items/smokedFish.png', 'guyuyizhang/assets/img/items/fossil.png']
missing = [k for k in key if k not in names]
print('关键文件缺失：', missing or '无')
print('校验结果：', '全部通过' if not problems else problems[:5])
print('zip 大小写校验（前 8 位 sha256）：', hashlib.sha256(open(OUT, 'rb').read()).hexdigest()[:8])
