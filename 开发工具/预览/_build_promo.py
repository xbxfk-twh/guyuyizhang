"""Render a current-art 16:9 trailer from the game assets and captured UI.

The existing trailer is only used as the audio source. This script creates a
new video beside it and never overwrites the original. Requires Pillow/ffmpeg.
"""

from pathlib import Path
import subprocess
import sys

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / '孤屿遗章-游戏 - 发布'
ART = GAME / 'assets' / 'img'
WORK = ROOT / '开发工具' / '预览' / '_out' / 'promo-v2'
OLD = ROOT / '孤屿遗章_宣传片_16x9.mp4'
OUTPUT = ROOT / '孤屿遗章_宣传片_新版_16x9.mp4'
W, H = 1920, 1080
PAPER = (237, 229, 210)
FONT_TITLE = r'C:\Windows\Fonts\simkai.ttf'
FONT_BODY = r'C:\Windows\Fonts\simhei.ttf'


def font(path, size):
    return ImageFont.truetype(path, size)


def cover(path, mono=False):
    im = Image.open(path).convert('RGB')
    if mono:
        im = ImageOps.grayscale(im).convert('RGB')
    ratio = max(W / im.width, H / im.height)
    new = (round(im.width * ratio), round(im.height * ratio))
    im = im.resize(new, Image.Resampling.LANCZOS)
    left = (im.width - W) // 2
    top = (im.height - H) // 2
    return im.crop((left, top, left + W, top + H))


def shade(im, side='left', strength=225):
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = overlay.load()
    for x in range(W):
        t = x / (W - 1)
        if side == 'left':
            alpha = int(strength * (1 - t) ** 1.35 + 25)
        elif side == 'right':
            alpha = int(strength * t ** 1.35 + 25)
        else:
            alpha = 90
        for y in range(H):
            edge = max(0, abs(y - H / 2) / (H / 2) - 0.55)
            px[x, y] = (5, 8, 12, min(240, alpha + int(edge * 50)))
    return Image.alpha_composite(im.convert('RGBA'), overlay).convert('RGB')


def typography(im, number, kicker, heading, subtitle, side='left', accent=None):
    d = ImageDraw.Draw(im)
    x = 135 if side == 'left' else 1040
    color = accent or PAPER
    d.line((x, 158, x + 95, 158), fill=color, width=4)
    d.text((x, 184), f'{number:02d}  /  {kicker}', font=font(FONT_BODY, 30), fill=color,
           stroke_width=1, stroke_fill=(0, 0, 0))
    lines = heading.split('\n')
    y = 300 if len(lines) > 1 else 385
    for line in lines:
        d.text((x - 2, y), line, font=font(FONT_TITLE, 98), fill=PAPER,
               stroke_width=2, stroke_fill=(0, 0, 0))
        y += 125
    d.line((x, y + 14, x + 110, y + 14), fill=color, width=3)
    d.text((x, y + 48), subtitle, font=font(FONT_BODY, 35), fill=(231, 228, 219),
           stroke_width=1, stroke_fill=(0, 0, 0))
    return im


def footer(im, chapter):
    d = ImageDraw.Draw(im)
    d.text((135, 1002), '孤屿遗章  ·  一座岛，两段旅程', font=font(FONT_BODY, 23), fill=(225, 220, 207))
    d.text((1645, 1002), chapter, font=font(FONT_BODY, 22), fill=(225, 220, 207))
    return im


def framed_photo(im, path, box, border=PAPER):
    x, y, w, h = box
    photo = Image.open(path).convert('RGB')
    ratio = min(w / photo.width, h / photo.height)
    size = (round(photo.width * ratio), round(photo.height * ratio))
    photo = photo.resize(size, Image.Resampling.LANCZOS)
    shadow = Image.new('RGBA', (w + 28, h + 28), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle((14, 14, w + 13, h + 13), fill=(0, 0, 0, 180))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    im.paste(shadow.convert('RGB'), (x + 8, y + 12))
    d = ImageDraw.Draw(im)
    d.rectangle((x - 12, y - 12, x + w + 12, y + h + 12), fill=border)
    d.rectangle((x, y, x + w, y + h), fill=(15, 16, 18))
    im.paste(photo, (x + (w - photo.width) // 2, y + (h - photo.height) // 2))


def save(n, im):
    path = WORK / f'slide_{n:02d}.png'
    im.save(path, optimize=True)
    return path


def build_slides():
    WORK.mkdir(parents=True, exist_ok=True)
    slides = []

    im = shade(cover(ART / 'map-pack/island/sea.jpg', mono=True), 'center')
    d = ImageDraw.Draw(im)
    title = '孤 屿 遗 章'
    box = d.textbbox((0, 0), title, font=font(FONT_TITLE, 154))
    d.text(((W - box[2]) / 2, 365), title, font=font(FONT_TITLE, 154), fill=PAPER,
           stroke_width=3, stroke_fill=(0, 0, 0))
    d.line((650, 580, 1270, 580), fill=PAPER, width=3)
    d.text((630, 625), '一场海难，一段无人替你写下的旅程', font=font(FONT_BODY, 41), fill=PAPER)
    slides.append(save(0, im))

    im = shade(cover(ART / 'comic/4_sink.png', mono=True), 'left')
    slides.append(save(1, footer(typography(im, 1, '海难', '从风暴中\n醒来', '活下去，是故事的第一步。'), '序章')))

    im = shade(cover(ART / 'map-pack/island/forest.jpg', mono=True), 'left')
    framed_photo(im, ART / 'identities/fisher.png', (1250, 215, 470, 470))
    slides.append(save(2, footer(typography(im, 2, '身份', '选择你的\n来路', '不同的身份，另一种活法。'), '孤岛')))

    im = shade(cover(ART / 'map-pack/island/shore.jpg', mono=True), 'left')
    framed_photo(im, ART / 'identities/linghui.png', (1180, 126, 540, 650), border=(239, 240, 240))
    slides.append(save(3, footer(typography(im, 3, '灵灰', '海风里，\n有人同行', '灵灰 · 来自北方海域的鲸鱼娘。', accent=(145, 206, 234)), '孤岛')))

    im = shade(cover(ROOT / '回归测试/_out/room-dense-desktop.png'), 'left', 220)
    slides.append(save(4, footer(typography(im, 4, '营地', '把营地\n变成家', '一件件家具，慢慢搭出自己的住处。'), '生存')))

    im = shade(cover(ART / 'map-pack/island/quarry.jpg', mono=True), 'left', 230)
    framed_photo(im, ROOT / '回归测试/_out/tour-07-craft.png', (780, 270, 1020, 500))
    slides.append(save(5, footer(typography(im, 5, '制造', '从双手\n到工坊', '采集、制造、装备，步步向前。'), '生存')))

    im = shade(cover(ART / 'seasons/winter-mono.png'), 'left', 235)
    slides.append(save(6, footer(typography(im, 6, '四季', '风雪将至', '昼夜与季节，改变每一天的选择。'), '生存')))

    im = shade(cover(ART / 'map-pack/island/grassland.jpg', mono=True), 'left', 245)
    framed_photo(im, ART / 'enemies/wolf.png', (1250, 230, 430, 460), border=(208, 205, 195))
    slides.append(save(7, footer(typography(im, 7, '战斗', '黑夜并不\n安静', '野兽、海盗与遗迹守卫在前方等你。'), '孤岛')))

    im = shade(cover(ART / 'map-pack/island/sea.jpg', mono=True), 'left', 230)
    slides.append(save(8, footer(typography(im, 8, '远航', '驶向海的\n另一边', '木筏起航，地图仍未写完。'), '远航')))

    im = shade(cover(ART / 'map-pack/atlantis/city.jpg'), 'left', 235)
    slides.append(save(9, footer(typography(im, 9, '第二章', '潜入失落的\n海底文明', '黑白之外，深海还有另一种光。', accent=(138, 220, 231)), '深海')))

    im = shade(cover(ART / 'map-pack/atlantis/sanctum.jpg'), 'left', 240)
    slides.append(save(10, footer(typography(im, 10, '结局', '每个选择\n都有终点', '归乡，或成为孤岛传说的一部分。', accent=(155, 223, 235)), '终章')))

    im = shade(cover(ART / 'endings/ending_s.png', mono=True), 'center', 150)
    d = ImageDraw.Draw(im)
    title = '孤 屿 遗 章'
    box = d.textbbox((0, 0), title, font=font(FONT_TITLE, 150))
    d.text(((W - box[2]) / 2, 340), title, font=font(FONT_TITLE, 150), fill=PAPER,
           stroke_width=3, stroke_fill=(0, 0, 0))
    d.line((685, 565, 1235, 565), fill=PAPER, width=3)
    call = '在 TapTap 搜索《孤屿遗章》'
    box = d.textbbox((0, 0), call, font=font(FONT_BODY, 48))
    d.text(((W - box[2]) / 2, 620), call, font=font(FONT_BODY, 48), fill=PAPER)
    slides.append(save(11, im))
    return slides


def render(slides):
    ffmpeg = 'ffmpeg'
    segment = 5.65
    transition = 0.5
    args = [ffmpeg, '-y', '-hide_banner', '-loglevel', 'error']
    for slide in slides:
        args += ['-loop', '1', '-framerate', '30', '-t', str(segment), '-i', str(slide)]
    args += ['-i', str(OLD)]
    parts = []
    for i in range(len(slides)):
        zoom = '1+0.038*on/169' if i % 2 == 0 else '1.038-0.038*on/169'
        parts.append(
            f'[{i}:v]zoompan=z=\'{zoom}\':'
            f'x=\'iw/2-iw/zoom/2\':y=\'ih/2-ih/zoom/2\':'
            f'd=1:s=1920x1080:fps=30,trim=duration={segment},'
            f'setpts=PTS-STARTPTS,format=yuv420p[s{i}]'
        )
    current = 's0'
    for i in range(1, len(slides)):
        output = f'x{i}'
        offset = round(i * (segment - transition), 3)
        parts.append(f'[{current}][s{i}]xfade=transition=fade:duration={transition}:offset={offset}[{output}]')
        current = output
    args += ['-filter_complex', ';'.join(parts), '-map', f'[{current}]', '-map', f'{len(slides)}:a:0',
             '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
             '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(OUTPUT)]
    subprocess.run(args, check=True)
    return OUTPUT


if __name__ == '__main__':
    try:
        slides = build_slides()
        print(f'{len(slides)} current-art slides rendered', flush=True)
        print(render(slides), flush=True)
    except Exception as exc:
        print(f'PROMO BUILD FAILED: {exc}', file=sys.stderr)
        raise
