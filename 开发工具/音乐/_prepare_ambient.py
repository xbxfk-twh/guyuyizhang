"""下载两种 CC0 实录环境音并转为低体积循环。来源记录随游戏分发。"""
from pathlib import Path
import urllib.request,zipfile,subprocess,shutil,json
ROOT=Path(__file__).resolve().parents[2]
cache=Path(__file__).parent/'ambient-sources';cache.mkdir(exist_ok=True)
out=ROOT/'孤屿遗章-游戏 - 发布/assets/audio/ambient';out.mkdir(parents=True,exist_ok=True)
ff=shutil.which('ffmpeg') or str(next((Path.home()/'AppData/Local/Microsoft/WinGet/Packages').glob('Gyan.FFmpeg*/ffmpeg-*/bin/ffmpeg.exe')))
def get(url,name):
    p=cache/name
    if not p.exists():
        with urllib.request.urlopen(url,timeout=40) as r:p.write_bytes(r.read())
    return p
rain=get('https://opengameart.org/sites/default/files/Rain%20MP3.zip','rain.zip')
with zipfile.ZipFile(rain) as z:
    names=[n for n in z.namelist() if n.lower().endswith('.mp3')]
    z.extract(names[0],cache)
    rain=cache/names[0]
wave=get('https://opengameart.org/sites/default/files/wave_01_cc0-18363__jasinski__alkaibeach.flac','waves.flac')
for name,p in [('rain',rain),('surf',wave)]:
    subprocess.run([ff,'-hide_banner','-loglevel','error','-y','-i',str(p),'-ac','1','-ar','44100','-b:a','96k','-af','alimiter=limit=0.8:level=false',str(out/f'{name}.mp3')],check=True)
    print('OK '+name,flush=True)
(out/'sources.json').write_text(json.dumps([
    {'file':'rain.mp3','author':'Ylmir','license':'CC0','url':'https://opengameart.org/content/rain-loopable'},
    {'file':'surf.mp3','author':'jasinski; submitted by qubodup','license':'CC0','url':'https://opengameart.org/content/beach-ocean-waves'}
],ensure_ascii=False,indent=2),encoding='utf-8')
