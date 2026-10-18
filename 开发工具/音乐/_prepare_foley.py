"""精选 Kenney CC0 音效，转成适配 iOS 的 MP3，保留来源与许可。"""
import json, shutil, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
DEST = ROOT / '孤屿遗章-游戏 - 发布/assets/audio/sfx'
SOUNDS = {
    'click':('interface','click_003.ogg'), 'pickup':('rpg','handleSmallLeather.ogg'),
    'trade':('rpg','handleCoins2.ogg'), 'good':('interface','confirmation_002.ogg'),
    'work':('rpg','chop.ogg'), 'build':('rpg','metalPot1.ogg'),
    'travel':('rpg','footstep02.ogg'), 'swing':('rpg','knifeSlice.ogg'),
    'clash':('rpg','metalClick.ogg'), 'hit':('impact','impactPunch_medium_002.ogg'),
    'critical':('impact','impactPunch_heavy_002.ogg'), 'guard':('impact','impactMetal_medium_001.ogg'),
    'dodge':('rpg','cloth2.ogg'), 'bow':('interface','pluck_002.ogg'),
    'lotteryTick':('casino','chips-collide-2.ogg'), 'lotteryStart':('casino','dice-shake-1.ogg'),
    'lotteryEmpty':('interface','back_002.ogg'), 'lotteryWin':('interface','confirmation_004.ogg'),
}

def main():
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        ffmpeg = str(next((Path.home()/'AppData/Local/Microsoft/WinGet/Packages').glob('Gyan.FFmpeg*/ffmpeg*/bin/ffmpeg.exe')))
    DEST.mkdir(parents=True, exist_ok=True)
    manifest = []
    for target,(pack,name) in SOUNDS.items():
        source = next((HERE/'kenney'/pack).rglob(name))
        # 短瞬态保留起音，峰值限幅；不把噪声硬拉到满音量。
        subprocess.run([ffmpeg,'-y','-loglevel','error','-i',str(source),'-af','alimiter=limit=0.82:level=false','-ac','1','-ar','44100','-b:a','96k',str(DEST/(target+'.mp3'))], check=True)
        manifest.append({'file':target+'.mp3','original':name,'pack':pack,'license':'CC0','source':'https://kenney.nl/assets/'+{'rpg':'rpg-audio','interface':'interface-sounds','casino':'casino-audio','impact':'impact-sounds'}[pack]})
    (DEST/'sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    for pack in ('rpg','interface','casino','impact'):
        for source in (HERE/'kenney'/pack).rglob('*'):
            if source.is_file() and 'license' in source.name.lower():
                shutil.copy2(source,DEST/(pack+'-LICENSE.txt'))
                break
    print('Prepared',len(manifest),'CC0 samples')

if __name__ == '__main__': main()
