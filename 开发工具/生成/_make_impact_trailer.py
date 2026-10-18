"""20-second, beat-cut game teaser. Original synth track; no narration."""
from pathlib import Path
import json, math, subprocess, wave
import numpy as np
from PIL import Image, ImageOps, ImageDraw, ImageFont, ImageEnhance

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'发行产物/itch.io英文发布素材'
OUT=BASE/'V2_紧凑无配音版'
WORK=OUT/'制作源文件'
WORK.mkdir(parents=True,exist_ok=True)
ART=ROOT/'孤屿遗章-游戏 - 发布/assets/img'
BEAT=60/144
FPS=30
# One edit every two beats, then four held beats for the reveal and title.
SHOTS=[
 ('title.png','NO RESCUE.',2,None),
 ('boss_wolf.png','ONLY YOU.',2,None),
 ('forest.png','SURVIVE.',2,'04-forest.png'),
 ('boss_spider.png','',2,None),
 ('camp.png','BUILD.',2,'02-camp.png'),
 ('forest.png','CRAFT.',2,'03-crafting.png'),
 ('boss_wolf.png','FIGHT.',2,'05-combat.png'),
 ('atlantis/shipwreck.png','',2,None),
 ('atlantis/habitat.png','GO DEEPER.',2,'06-underwater.png'),
 ('atlantis/abyss.png','',2,None),
 ('atlantis/sanctum.png','LOST SECRETS.',2,'07-ruins.png'),
 ('boss_sunken.png','',2,None),
 ('atlantis/city.png','',2,None),
 ('forest.png','ONE MORE DAY.',2,'04-forest.png'),
 ('boss_wolf.png','ONE MORE FIGHT.',2,'05-combat.png'),
 ('atlantis/sanctum.png','',2,None),
 ('title.png','THE ISLAND IS ONLY\nTHE BEGINNING.',4,None),
 ('atlantis/sanctum.png','DIVE INTO\nTHE UNKNOWN.',4,'07-ruins.png'),
 ('title.png','ISLE OF\nLOST CHAPTERS',4,None),
 ('atlantis/habitat.png','WOULD YOU\nDIVE IN?',4,None),
]
DURATION=sum(s[2] for s in SHOTS)*BEAT
FONTS={}
def font(n,serif=False):
 key=(n,serif)
 if key not in FONTS:FONTS[key]=ImageFont.truetype('C:/Windows/Fonts/georgiab.ttf' if serif else 'C:/Windows/Fonts/arialbd.ttf',n)
 return FONTS[key]
def command(args):
 r=subprocess.run(args,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 if r.returncode:raise RuntimeError(r.stderr.decode('utf-8',errors='replace')[-3000:])

def music():
 sr=48000;n=round((DURATION+.3)*sr);audio=np.zeros(n);rng=np.random.default_rng(88)
 def add(start,length,maker,gain):
  k=round(start*sr);ln=min(round(length*sr),n-k)
  if ln<=0:return
  u=np.arange(ln)/sr;audio[k:k+ln]+=gain*maker(u)
 totalbeats=round(DURATION/BEAT)
 for b in range(totalbeats):
  at=b*BEAT
  # Low punch / heartbeat kicks, dry snare on alternating beats.
  add(at,.32,lambda u:np.sin(2*np.pi*(43*u+42*(1-np.exp(-u*28))/28))*np.exp(-u*13),.53)
  if b%2:
   add(at,.18,lambda u:rng.normal(0,1,len(u))*np.exp(-u*30)+.22*np.sin(2*np.pi*180*u)*np.exp(-u*20),.16)
  for sub in (0,.5):
   add(at+sub*BEAT,.055,lambda u:np.diff(rng.normal(0,1,len(u)+1))*np.exp(-u*90),.018 if b<32 else .026)
  # D minor ostinato with gated bass, rising octave for the underwater reveal.
  notes=[73.416,73.416,87.307,65.406,73.416,110,87.307,65.406]
  hz=notes[b%8]*(2 if 16<=b<32 else 1)
  add(at,BEAT*.85,lambda u,hz=hz:(np.sin(2*np.pi*hz*u)+.2*np.sin(2*np.pi*hz*3*u))*(1-np.exp(-u*100))*np.exp(-u*9),.18)
  for sub in (0,.5):
   hz2=[293.665,349.228,440,523.251][b%4]
   add(at+sub*BEAT,BEAT*.45,lambda u,hz2=hz2:np.sin(2*np.pi*hz2*u)*np.exp(-u*35)*(1-np.exp(-u*200)),.06)
 for beat in (0,8,16,24,32,40,44):
  add(beat*BEAT,1.0,lambda u:(rng.normal(0,.4,len(u))+np.sin(2*np.pi*36*u))*np.exp(-u*5),.18)
 # Short whoosh leads into each four-beat reveal. No silent gap between shots.
 for beat in (16,32,36,40,44):
  add(beat*BEAT-.22,.22,lambda u:rng.normal(0,.25,len(u))*(u/.22)**2,.2)
 t=np.arange(n)/sr
 audio+=.022*np.sin(2*np.pi*36.708*t)
 audio=np.tanh(audio*1.2)*.82
 audio*=np.minimum(1,t/.025)*np.minimum(1,((DURATION+.15-t)/.18).clip(0,1))
 stereo=np.column_stack((audio,np.roll(audio,7)*.985))
 with wave.open(str(WORK/'原创紧张节拍_144BPM.wav'),'wb') as w:
  w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((stereo.clip(-1,1)*32767).astype('<i2').tobytes())
 command(['ffmpeg','-y','-i',str(WORK/'原创紧张节拍_144BPM.wav'),'-af','loudnorm=I=-14:TP=-1.5:LRA=7,volume=0.75','-t',str(DURATION),'-c:a','aac','-b:a','256k',str(WORK/'音乐.m4a')])

def template(i,vertical):
 asset,text,beats,screen=SHOTS[i];w,h=(1080,1920) if vertical else (1920,1080)
 source=Image.open(ART/asset).convert('RGB')
 bg=ImageOps.fit(source,(round(w*1.25),round(h*1.25)),method=Image.Resampling.LANCZOS)
 bg=ImageEnhance.Contrast(bg).enhance(1.13)
 overlay=Image.new('RGBA',(w,h));d=ImageDraw.Draw(overlay)
 # Visible gameplay panels are larger and unframed; hero shots use full-bleed art.
 if screen:
  sw=1000 if vertical else 1420;sh=round(sw*9/16)
  sc=Image.open(BASE/'screenshots'/screen).convert('RGB').resize((sw,sh),Image.Resampling.LANCZOS)
  x=(w-sw)//2;y=700 if vertical else 90
  d.rectangle((x-6,y-6,x+sw+6,y+sh+6),fill=(8,8,8,235))
  overlay.paste(sc,(x,y));d=ImageDraw.Draw(overlay)
 if text:
  serif=i==18
  size=(110 if vertical else 104) if i<16 else ((89 if vertical else 105) if not serif else (100 if vertical else 128))
  f=font(size,serif)
  maxwidth=w-110
  while d.multiline_textbbox((0,0),text,font=f,spacing=13)[2]>maxwidth:
   size-=2;f=font(size,serif)
  y=450 if vertical and screen else (h*.53 if vertical else (910 if screen else h*.53))
  box=d.multiline_textbbox((w/2,y),text,font=f,anchor='mm',align='center',spacing=13)
  d.rectangle((0,box[1]-28,w,box[3]+28),fill=(6,8,8,178 if i<18 else 215))
  d.multiline_text((w/2,y),text,font=f,anchor='mm',align='center',spacing=13,fill=(246,242,224),stroke_width=2,stroke_fill=(0,0,0))
 if i==18:
  d.text((w/2,h*.73),'A SURVIVAL ADVENTURE',font=font(38 if vertical else 44),anchor='mm',fill=(222,215,193))
 if i==19:
  d.text((w/2,h*.78),'ISLE OF LOST CHAPTERS',font=font(40 if vertical else 50,True),anchor='mm',fill=(244,238,211))
 # A small consistent brand mark, not a repeated full poster.
 if i<18:d.text((60,h-105),'ISLE OF LOST CHAPTERS',font=font(25 if vertical else 29),fill=(236,231,211))
 return bg,overlay

def render(vertical):
 w,h=(1080,1920) if vertical else (1920,1080)
 name='Isle_of_Lost_Chapters_V2_Shorts_NoVoice.mp4' if vertical else 'Isle_of_Lost_Chapters_V2_Trailer_NoVoice.mp4'
 temp=WORK/('vertical_video.mp4' if vertical else 'horizontal_video.mp4')
 cmd=['ffmpeg','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{w}x{h}','-r',str(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p',str(temp)]
 log=open(WORK/('vertical_encoder.log' if vertical else 'horizontal_encoder.log'),'wb')
 proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=log)
 count=0;beatpos=0;preview=[]
 try:
  for i,shot in enumerate(SHOTS):
   bg,overlay=template(i,vertical);end=round((beatpos+shot[2])*BEAT*FPS);frames=end-count
   for f in range(frames):
    p=f/max(1,frames-1);ease=1-(1-p)**2
    scale=1.04+.14*ease if i%2==0 else 1.21-.14*ease
    cw=int(w/scale);ch=int(h/scale)
    cx=bg.width/2+(i%3-1)*w*.025*ease;cy=bg.height/2+(i%2-.5)*h*.02*ease
    frame=bg.crop((int(cx-cw/2),int(cy-ch/2),int(cx+cw/2),int(cy+ch/2))).resize((w,h),Image.Resampling.BILINEAR).convert('RGBA')
    # Subtle impact vignette at the cut; never alternate full white/black frames.
    shade=34+round(30*math.exp(-f/2.5));frame=Image.alpha_composite(frame,Image.new('RGBA',(w,h),(0,0,0,shade)))
    frame=Image.alpha_composite(frame,overlay)
    if i in (4,8,12,16) and f<3:
     d=ImageDraw.Draw(frame);d.rectangle((0,h//2-2,w,h//2+2),fill=(240,231,205,255))
    if f==frames//2:
     thumb=frame.convert('RGB');thumb.save(WORK/f'{"v" if vertical else "h"}_shot_{i:02d}.jpg',quality=88);preview.append(thumb.resize((216,384) if vertical else (384,216)))
    proc.stdin.write(frame.convert('RGB').tobytes());count+=1
   beatpos+=shot[2];print(('V' if vertical else 'H'),i+1,'/',len(SHOTS),flush=True)
 finally:proc.stdin.close()
 code=proc.wait();log.close()
 if code:raise RuntimeError(f'Encoder returned {code}')
 command(['ffmpeg','-y','-i',str(temp),'-i',str(WORK/'音乐.m4a'),'-map','0:v','-map','1:a','-c','copy','-shortest','-movflags','+faststart',str(OUT/name)])
 if vertical:
  sheet=Image.new('RGB',(1080,1536))
  for i,im in enumerate(preview):sheet.paste(im,((i%5)*216,(i//5)*384))
  sheet.save(OUT/'V2分镜预览.jpg',quality=90)
 print('READY',name,flush=True)

if __name__=='__main__':
 music();render(True);render(False)
 results=[]
 for path in OUT.glob('*.mp4'):
  command(['ffmpeg','-v','error','-i',str(path),'-f','null','NUL'])
  data=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,width,height,r_frame_rate','-of','json',str(path)]))
  results.append({'file':path.name,'full_decode':'PASS','parameters':data})
 (OUT/'验证记录.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
 (OUT/'V2制作说明.md').write_text('# V2 紧凑无配音版\n\n- 20秒、20个镜头、144BPM原创程序合成节拍。前16镜头每两拍约0.83秒切换，结尾每四拍约1.67秒。\n- 删除配音、空白等待、重复海报式布局；大画面推拉、直接切镜、短字卡、少量局部线状光效；没有高频全屏频闪。\n- 真实游戏截图与既有游戏美术混剪，不是连续实机录像。\n- 输出1080×1920 Shorts和1920×1080横屏，30fps，H.264/AAC；完整解码检查在验证记录.json。\n- 旧视频CLdCaFLhGaw仍保持私享；这次仅重剪，没有上传、公开或删除平台内容。\n',encoding='utf-8')
