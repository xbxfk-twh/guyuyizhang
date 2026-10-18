"""生成角色短句 MP3；游戏运行时不调用语音服务。已有文件跳过，失败不覆盖。"""
import asyncio, json, re
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / '孤屿遗章-游戏 - 发布'
DATA = (SOURCE / 'js/data.js').read_text(encoding='utf-8')
MERCHANTS = json.loads(re.search(r'const MERCHANTS = (\{[\s\S]*?\n\});', DATA)[1])
LINES = json.loads(re.search(r'const LINGHUI_SPEECH = (\[[\s\S]*?\]);', DATA)[1])
VOICES = {
    'laochao': ('zh-CN-YunjianNeural', '-7%', '-12Hz'),
    'grocer': ('zh-CN-XiaoyiNeural', '+0%', '-3Hz'),
    'smith': ('zh-CN-YunjianNeural', '-8%', '+0Hz'),
    'informant': ('zh-CN-YunxiNeural', '-10%', '-5Hz'),
    'gourmet': ('zh-CN-YunyangNeural', '+0%', '+4Hz'),
    'black': ('zh-CN-YunxiNeural', '-12%', '-17Hz'),
    'fishman': ('zh-CN-XiaoxiaoNeural', '-10%', '-3Hz'),
    'atlTrade': ('zh-CN-YunyangNeural', '-12%', '-8Hz'),
    'linghui': ('zh-CN-XiaoxiaoNeural', '-3%', '+8Hz'),
}

async def main():
    out = SOURCE / 'assets/audio/voices'
    out.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(4)
    async def save(who, i, text):
        path = out / f'{who}-{i}.mp3'
        if who != 'fishman' and path.exists() and path.stat().st_size > 1000: return
        voice, rate, pitch = VOICES[who]
        async with sem:
            for attempt in range(3):
                try:
                    await asyncio.wait_for(edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(path)), 30)
                    print(f'OK {who}-{i}', flush=True)
                    return
                except Exception:
                    if attempt == 2: raise
                    await asyncio.sleep(1)
    jobs = [save(who, i, text) for who, info in MERCHANTS.items() for i, text in enumerate(info['lines'])]
    jobs += [save('linghui', i, text) for i, text in enumerate(LINES)]
    await asyncio.gather(*jobs)

if __name__ == '__main__': asyncio.run(main())
