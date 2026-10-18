"""Make promotional assets from isolated captures, without changing game code."""
import asyncio, json, math, subprocess, wave
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
import edge_tts

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '发行产物/itch.io英文发布素材'
WORK = OUT / '_制作源文件'
WORK.mkdir(exist_ok=True)
IMG = ROOT / '孤屿遗章-游戏 - 发布/assets/img'
FONT = 'C:/Windows/Fonts/arialbd.ttf'
SERIF = 'C:/Windows/Fonts/georgiab.ttf'
SCENES = [
 ('You survived the shipwreck. Now what?', 'THE SHIPWRECK\nWAS ONLY THE BEGINNING.', '01-title.png', 'title.png', 4.5),
 ('Hunger. Weather. One more day.', 'HUNGER. WEATHER.\nONE MORE DAY.', '04-forest.png', 'forest.png', 4),
 ('Build a home from nothing.', 'BUILD A HOME\nFROM NOTHING.', '02-camp.png', 'camp.png', 4),
 ('Craft your next chance.', 'CRAFT YOUR\nNEXT CHANCE.', '03-crafting.png', 'forest.png', 4),
 ('Fight for tomorrow.', 'FIGHT FOR\nTOMORROW.', '05-combat.png', 'forest.png', 4),
 ('Then look beneath the waves.', 'THEN LOOK\nBENEATH THE WAVES.', '06-underwater.png', 'atlantis/habitat.png', 4.5),
 ('A lost civilization is waiting.', 'A LOST CIVILIZATION\nIS WAITING.', '07-ruins.png', 'atlantis/sanctum.png', 4.5),
 ('Isle of Lost Chapters. Would you dive in?', 'WOULD YOU\nDIVE IN?', '07-ruins.png', 'title.png', 5.5),
]

def run(args):
 subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

def probe(p):
 return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))

def font(n, serif=False): return ImageFont.truetype(SERIF if serif else FONT,n)

def centered(d, xy, text, f, fill=(247,242,222), spacing=12):
 d.multiline_text(xy,text,font=f,fill=fill,anchor='mm',align='center',spacing=spacing,stroke_width=1,stroke_fill=(0,0,0))

async def voices():
 for i,(voice,*_) in enumerate(SCENES):
  dest=WORK/f'voice_{i}.mp3'
  if not dest.exists():
   try:
    await edge_tts.Communicate(voice,'en-US-GuyNeural',rate='+4%').save(str(dest))
   except Exception as e:
    print('Online TTS unavailable; using local English voice.', type(e).__name__, flush=True)
    wav=WORK/f'voice_{i}.wav'
    safe=voice.replace("'","''")
    wp=str(wav).replace("'","''")
    ps=f"Add-Type -AssemblyName System.Speech; $taskVoice=New-Object System.Speech.Synthesis.SpeechSynthesizer; $taskVoice.SelectVoice('Microsoft Zira Desktop'); $taskVoice.SetOutputToWaveFile('{wp}'); $taskVoice.Speak('{safe}'); $taskVoice.Dispose()"
    run(['powershell','-NoProfile','-Command',ps])
    run(['ffmpeg','-y','-i',str(wav),str(dest)])
  dur=float(probe(dest)['format']['duration'])
  if dur > SCENES[i][4]-.3:
   row=list(SCENES[i]);row[4]=math.ceil((dur+.5)*10)/10;SCENES[i]=tuple(row)
  print('Voice',i+1,'ready',dur,flush=True)

def background(asset,size):
 im=Image.open(IMG/asset).convert('RGB')
 im=ImageOps.fit(im,size,method=Image.Resampling.LANCZOS)
 return im

def composition(i,vertical):
 voice,title,shot,asset,duration=SCENES[i]
 w,h=(1080,1920) if vertical else (1920,1080)
 im=background(asset,(w,h)).convert('RGBA')
 # Darken for the bold caption while preserving the actual game screenshot.
 shade=Image.new('RGBA',(w,h),(9,13,14,95));im=Image.alpha_composite(im,shade)
 arr=np.zeros((h,w,4),dtype=np.uint8);arr[:,:,3]=(140*(np.abs(np.arange(h)-h*.5)/(h*.5))[:,None]).astype('uint8')
 im=Image.alpha_composite(im,Image.fromarray(arr));d=ImageDraw.Draw(im)
 if vertical:
  centered(d,(w/2,155),'ISLE OF LOST CHAPTERS',font(33,True))
  d.line((390,210,690,210),fill=(177,169,141),width=2)
  centered(d,(w/2,425),title,font(74),spacing=18)
  screen=Image.open(OUT/'screenshots'/shot).convert('RGBA').resize((1000,563),Image.Resampling.LANCZOS)
  im.paste(screen,(40,750));d=ImageDraw.Draw(im)
  d.rectangle((37,747,1043,1316),outline=(213,204,176),width=3)
  centered(d,(w/2,1390),'SURVIVE  ·  BUILD  ·  DISCOVER',font(31))
  if i==7:
   centered(d,(w/2,1580),'Isle of\nLost Chapters',font(69,True),spacing=5)
  else:
   centered(d,(w/2,1640),['THE FIRST DAY','MAKE EVERY CHOICE COUNT','YOUR CAMP. YOUR STORY.','PREPARE FOR THE UNKNOWN','THE ISLAND FIGHTS BACK','BEYOND THE SHORE','UNCOVER ITS SECRETS'][i],font(27),fill=(201,199,188))
  centered(d,(w/2,1770),'ENGLISH + SIMPLIFIED CHINESE',font(25))
  d.rectangle((60,1825,1020,1830),fill=(85,86,78));d.rectangle((60,1825,60+int(960*(i+1)/8),1830),fill=(229,216,176))
 else:
  screen=Image.open(OUT/'screenshots'/shot).convert('RGBA').resize((1520,855),Image.Resampling.LANCZOS)
  im.paste(screen,(200,65));d=ImageDraw.Draw(im)
  d.rectangle((198,63,1722,922),outline=(213,204,176),width=2)
  d.rectangle((0,770,w,h),fill=(10,13,13,235))
  centered(d,(w/2,870),title.replace('\n',' '),font(57))
  centered(d,(w/2,990),'ISLE OF LOST CHAPTERS  ·  SURVIVE / BUILD / DISCOVER',font(31,True))
 im.convert('RGB').save(WORK/f'{"v" if vertical else "h"}_{i}.png')

def stamp(t):
 ms=int(round(t*1000));return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}'

def soundtrack():
 sr=44100;dur=sum(s[4] for s in SCENES);n=int((dur+.1)*sr);t=np.arange(n)/sr
 rng=np.random.default_rng(12026);audio=np.zeros(n,dtype=np.float64)
 # Original minor-key arpeggio, soft pad and beat; no sampled third-party music.
 for start in np.arange(0,dur,.5):
  k=int(start*sr);ln=min(int(.9*sr),n-k);u=np.arange(ln)/sr
  notes=[146.832,174.614,220,261.626,220,174.614,130.813,164.814]
  hz=notes[int(start*2)%8];env=(1-np.exp(-u*35))*np.exp(-u*5)
  audio[k:k+ln]+=.055*(np.sin(2*np.pi*hz*u)+.2*np.sin(2*np.pi*hz*2*u))*env
  if int(start*2)%2==0:
   audio[k:k+ln]+=.055*np.sin(2*np.pi*(52*u+18*(1-np.exp(-u*15))/15))*np.exp(-u*20)
 audio+=.024*np.sin(2*np.pi*73.416*t)*(1+.2*np.sin(t*.7))
 audio+=rng.normal(0,.004,n)
 audio*=np.minimum(1,t/1.5)*np.minimum(1,(dur-t).clip(0)/1.8)
 stereo=np.stack((audio,audio*.96),axis=1)
 with wave.open(str(WORK/'music_original.wav'),'wb') as f:
  f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes((stereo.clip(-1,1)*32767).astype('<i2').tobytes())
 args=['ffmpeg','-y','-i',str(WORK/'music_original.wav')]
 for i in range(len(SCENES)):args+=['-i',str(WORK/f'voice_{i}.mp3')]
 filters=[];pos=0;labels=['[0:a]']
 for i,s in enumerate(SCENES):
  delay=int((pos+.15)*1000);filters.append(f'[{i+1}:a]adelay={delay}|{delay},volume=1.1[a{i}]');labels.append(f'[a{i}]');pos+=s[4]
 filters.append(''.join(labels)+f'amix=inputs={len(labels)}:duration=first:normalize=0,alimiter=limit=0.92,loudnorm=I=-16:TP=-1.5:LRA=9[out]')
 args+=['-filter_complex',';'.join(filters),'-map','[out]','-c:a','aac','-b:a','192k',str(WORK/'soundtrack.m4a')];run(args)
 text=[];pos=0
 for i,s in enumerate(SCENES):
  text.append(f'{i+1}\n{stamp(pos)} --> {stamp(pos+s[4])}\n{s[0]}\n');pos+=s[4]
 (OUT/'字幕_EN.srt').write_text('\n'.join(text),encoding='utf-8')

def video(vertical):
 prefix='v' if vertical else 'h';w,h=(1080,1920) if vertical else (1920,1080)
 for i,s in enumerate(SCENES):
  composition(i,vertical)
  # Gentle camera move, 30fps, with all captions in the safe area.
  vf=f"scale={w*2}:{h*2},zoompan=z='min(zoom+0.00015,1.022)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={round(s[4]*30)}:s={w}x{h}:fps=30,format=yuv420p"
  run(['ffmpeg','-y','-i',str(WORK/f'{prefix}_{i}.png'),'-vf',vf,'-c:v','libx264','-preset','veryfast','-crf','20','-an',str(WORK/f'{prefix}_{i}.mp4')])
  print(prefix,'Scene',i+1,'rendered',flush=True)
 concat=WORK/f'{prefix}_concat.txt';concat.write_text('\n'.join(f"file '{prefix}_{i}.mp4'" for i in range(len(SCENES))),encoding='ascii')
 name='Isle_of_Lost_Chapters_Shorts_EN.mp4' if vertical else 'Isle_of_Lost_Chapters_Trailer_EN.mp4'
 run(['ffmpeg','-y','-f','concat','-safe','0','-i',str(concat),'-i',str(WORK/'soundtrack.m4a'),'-map','0:v','-map','1:a','-c','copy','-shortest','-movflags','+faststart',str(OUT/name)])
 data=probe(OUT/name);(WORK/f'{prefix}_verification.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
 print(name,'READY',flush=True)

def covers():
 for size,name in [((630,500),'cover_itch_630x500.png'),((1280,720),'thumbnail_youtube_1280x720.jpg')]:
  w,h=size;im=background('title.png',size).convert('RGBA');im=Image.alpha_composite(im,Image.new('RGBA',size,(8,12,12,105)));d=ImageDraw.Draw(im)
  centered(d,(w/2,h*.43),'Isle of\nLost Chapters',font(round(w*.081),True),spacing=8)
  d.line((w*.22,h*.67,w*.78,h*.67),fill=(219,211,184),width=2)
  centered(d,(w/2,h*.77),'THE ISLAND IS ONLY\nTHE FIRST CHAPTER.',font(round(w*.031)),spacing=8)
  im.convert('RGB').save(OUT/name)

if __name__=='__main__':
 asyncio.run(voices());soundtrack();covers();video(True);video(False)
 (OUT/'制作说明.md').write_text('# 英文宣传素材制作说明\n\n'+
  '- 视频使用真实游戏场景截图，独立 Chrome 测试存档布置了营地与后期场景。不是连续游玩录像。\n'+
  '- 共八段，开头海难悬念，接求生、营地、制造、战斗与海底文明，再以问题收尾。\n'+
  '- 动态镜头、英文大字幕、合成英文旁白；音乐为本次程序合成，无第三方歌曲。\n'+
  '- 输出竖屏1080×1920和横屏1920×1080，30fps，H.264视频/AAC音频。\n'+
  '- 没有上传平台、没有改游戏逻辑、没有重新打包。视频不包含私人凭据或真实玩家存档。\n'+
  '- 发布素材可直接使用，但作品所含既有美术等素材的许可仍按原项目记录处理；程序原创音乐不能替代全部素材授权核查。\n\n'+
  '## 分镜与旁白\n\n'+'\n'.join(f'{i+1}. {s[4]:g} 秒：{s[0]}' for i,s in enumerate(SCENES))+ '\n',encoding='utf-8')
