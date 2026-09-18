"""按"实际显示尺寸"给素材降采样，专治手机端内存被杀（WebView 内存到一两百兆就被系统干掉）。

原则：只压"文件尺寸远大于显示尺寸"的图，主视觉（场景、大地图）不动，避免看起来变糊。
  items / items-accent : 图标 32~96px 显示 → 长边 256
  endings              : .ending-img 只有 min(320px,60vw) → 长边 512
  identities           : 身份选择界面 ~200px → 长边 768
  enemies              : 战斗弹窗里最高 250px → 长边 512
  build                : 营地/地图精灵最大约 550~800px → 长边 768
  atlantis             : 海底场景 1536×1024，屏幕宽度最多 1280~2340 → 长边 1280

原图会整份备份到 归档/素材实验/原图备份_降采样前/（保持目录结构），随时能回滚。
用法：python 开发工具/生成/_shrink_images.py        （先看报告）
      python 开发工具/生成/_shrink_images.py --go   （真的压）
"""
import os, sys, shutil
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
IMG = os.path.join(ROOT, '孤屿遗章-游戏 - 发布', 'assets', 'img')
BACKUP = os.path.join(ROOT, '归档', '素材实验', '原图备份_降采样前')

CAPS = {
    'items': 256, 'items-accent': 256, 'endings': 512, 'identities': 768,
    'enemies': 512, 'build': 768, 'atlantis': 1280, 'anim': 512,
    'items/cut': 256,
}

def cap_for(rel):
    rel = rel.replace('\\', '/')
    parts = rel.split('/')
    if len(parts) >= 2 and parts[0] == 'items' and parts[1] == 'cut':
        return 256
    top = parts[0] if len(parts) > 1 else ''
    return CAPS.get(top, 0)          # 0 = 不动（根目录下的场景图/大地图）

def main():
    go = '--go' in sys.argv
    before = after = 0
    px_before = px_after = 0
    changed = []
    for cur, dirs, files in os.walk(IMG):
        for f in sorted(files):
            if not f.lower().endswith('.png'):
                continue
            p = os.path.join(cur, f)
            rel = os.path.relpath(p, IMG)
            cap = cap_for(rel)
            size = os.path.getsize(p)
            before += size
            try:
                im = Image.open(p)
            except Exception as e:
                print('读不了 %s: %s' % (rel, e)); after += size; continue
            w, h = im.size
            px_before += w * h
            if not cap:
                after += size; px_after += w * h; continue
            if max(w, h) <= cap:
                after += size; px_after += w * h
                continue
            scale = cap / float(max(w, h))
            nw, nh = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
            if go:
                dst = os.path.join(BACKUP, rel)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                if not os.path.exists(dst):
                    shutil.copy2(p, dst)
                im2 = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
                im2 = im2.resize((nw, nh), Image.LANCZOS)
                im2.save(p, optimize=True)
                newsize = os.path.getsize(p)
            else:
                newsize = size * (nw * nh) / float(w * h)   # 估算
            after += newsize
            px_after += nw * nh
            changed.append((rel, w, h, nw, nh, size, newsize))
    print('%-46s %13s -> %13s   %9s -> %9s' % ('file', 'old px', 'new px', 'old KB', 'new KB'))
    for rel, w, h, nw, nh, s0, s1 in changed:
        print('%-46s %6dx%-6d -> %5dx%-5d   %8.1f -> %8.1f' % (rel, w, h, nw, nh, s0 / 1024, s1 / 1024))
    print('\\n共处理 %d 张' % len(changed))
    print('磁盘：%.1f MB -> %.1f MB' % (before / 1048576, after / 1048576))
    print('解码内存（宽×高×4，全部加载）：%.0f MB -> %.0f MB' % (px_before * 4 / 1048576, px_after * 4 / 1048576))
    if not go:
        print('（这是预估。加 --go 才会真的压，原图会备份到 归档/素材实验/原图备份_降采样前/）')
    else:
        print('原图已备份到 ' + BACKUP)

main()
