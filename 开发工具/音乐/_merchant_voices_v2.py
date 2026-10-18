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
    'laochao': ('zh-CN-YunxiNeural', '-3%', '-2Hz'),
    'grocer': ('zh-CN-XiaoxiaoNeural', '+3%', '+1Hz'),
    'smith': ('zh-CN-YunjianNeural', '+0%', '-2Hz'),
    'informant': ('zh-CN-YunxiNeural', '+2%', '+0Hz'),
    'gourmet': ('zh-CN-YunxiNeural', '+5%', '+2Hz'),
    'black': ('zh-CN-YunxiNeural', '-3%', '-4Hz'),
    'fishman': ('zh-CN-XiaoyiNeural', '-2%', '+0Hz'),
    'atlTrade': ('zh-CN-YunxiNeural', '-2%', '-1Hz'),
    'linghui': ('zh-CN-XiaoxiaoNeural', '+1%', '+3Hz'),
}

async def main():
    out = ROOT / '回归测试/_out/voices-v2'
    out.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(4)
    async def save(who, i, text):
        path = out / f'{who}-{i}.mp3'
        if path.exists() and path.stat().st_size > 1000: return
        voice, rate, pitch = VOICES[who]
        async with sem:
            for attempt in range(3):
                try:
                    await asyncio.wait_for(edge_tts.Communicate(text.replace('，','， ').replace('。','。 '), voice, rate=rate, pitch=pitch).save(str(path)), 30)
                    print(f'OK {who}-{i}', flush=True)
                    return
                except Exception:
                    if attempt == 2: raise
                    await asyncio.sleep(1)
    jobs = [save(who, i, text) for who, info in MERCHANTS.items() for i, text in enumerate(info['lines'])]
    jobs += [save('linghui', i, text) for i, text in enumerate(LINES)]
    await asyncio.gather(*jobs)

if __name__ == '__main__': asyncio.run(main())
