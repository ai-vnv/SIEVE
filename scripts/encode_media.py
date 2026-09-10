"""Encode small, silent MP4/GIFs; annotation values come from checked results."""
import hashlib,json,subprocess,os
from pathlib import Path

def ff(*args):subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*args],check=True)
media=Path(os.environ.get('SIEVE_MEDIA_DIR','media'));cache=Path(os.environ.get('SIEVE_MEDIA_CACHE','.media-cache')); h=json.loads(Path('results/haulage-summary.json').read_text());by={r['policy']:r for r in h['summary']}
font=next((p for p in [Path('/System/Library/Fonts/Supplemental/Times New Roman.ttf'),Path('/usr/share/fonts/truetype/msttcorefonts/Times_New_Roman.ttf')] if p.exists()),None)
if font is None:raise RuntimeError('Install Times New Roman to reproduce the media typography.')
ff('-framerate','20','-i',str(cache/'frames/%05d.jpg'),'-c:v','libx264','-preset','slow','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(media/'haulage-clean.mp4'))
co=by['coordinated'];fast=by['fast'];blanket=by['blanket']
labels=[(0,6,'Loading | 240 t payload','Human clearance overlaps segregated loading'),(6,14,'Hauling | condition-aware coordination',f"{co['throughputTph']['mean']:,.0f} t/h | {co['averageMovingKph']['mean']:.1f} km/h mean moving speed"),(14,20,'Unloading | crusher and stockpile',f"{co['meanCycleMin']['mean']:.2f} min mean cycle | no collisions observed"),(20,24,'Return | productivity and safety',f"Fast: {fast['throughputTph']['mean']:,.0f} t/h, {fast['collisions']['mean']:.2f} collisions/shift | Blanket: {blanket['throughputTph']['mean']:,.0f} t/h")]
# Render text with Pillow: this also works with FFmpeg builds without drawtext.
from PIL import Image,ImageDraw,ImageFont
out=cache/'annotated';out.mkdir(exist_ok=True)
title_font=ImageFont.truetype(str(font),30);detail_font=ImageFont.truetype(str(font),24);scope_font=ImageFont.truetype(str(font),21)
overlays=[]
for start,end,title,detail in labels:
 layer=Image.new('RGBA',(960,540),(0,0,0,0));d=ImageDraw.Draw(layer)
 d.rectangle((0,0,960,86),fill=(23,43,49,232));d.rectangle((0,502,960,540),fill=(23,43,49,232))
 d.text((24,9),title,font=title_font,fill='white');d.text((24,49),detail,font=detail_font,fill='white')
 d.text((24,510),'Synthetic illustration | metrics: 200 simulated 8 h shifts per strategy | not field evidence',font=scope_font,fill='white')
 assert d.textlength(detail,font=detail_font)<=912,'Annotation exceeds frame width'
 overlays.append((start,end,layer))
for i,frame in enumerate(sorted((cache/'frames').glob('*.jpg'))):
 t=i/20;layer=next(layer for start,end,layer in overlays if start<=t<end)
 with Image.open(frame) as source:Image.alpha_composite(source.convert('RGBA'),layer).convert('RGB').save(out/frame.name,quality=92)
ff('-framerate','20','-i',str(out/'%05d.jpg'),'-c:v','libx264','-preset','slow','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(media/'haulage-annotated.mp4'))
for name in ['clean','annotated']:
 # 12-second preview covers the whole 24-second montage, at twice its presentation speed.
 ff('-i',str(media/f'haulage-{name}.mp4'),'-filter_complex','[0:v]setpts=0.5*PTS,fps=6,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5', '-loop','0',str(media/f'haulage-{name}.gif'))
ff('-i',str(media/'haulage-clean.mp4'),'-ss','8','-frames:v','1',str(media/'poster.jpg'))
records=[]
for p in media.iterdir():
 if p.suffix in ['.mp4','.gif']:
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=width,height,codec_name','-of','json',str(p)],text=True))
  assert p.stat().st_size<6_000_000,(p,p.stat().st_size)
  records.append({'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),**probe})
(media/'encoding-manifest.json').write_text(json.dumps({'metricsSource':'results/haulage-summary.json','metricsSHA256':hashlib.sha256(Path('results/haulage-summary.json').read_bytes()).hexdigest(),'clips':records},indent=2)+'\n')
print(json.dumps(records,indent=2))
