import cv2,numpy as np,sys,json
from imwatermark import WatermarkEncoder,WatermarkDecoder
from PIL import Image
import io
src=sys.argv[1]; out=sys.argv[2]
im=Image.open(src).convert('RGB'); im=im.resize((1024,int(1024*im.height/im.width)))
bgr=cv2.cvtColor(np.array(im),cv2.COLOR_RGB2BGR)
msg=b'AMCC5160'  # 64 bits
bits=len(msg)*8
enc=WatermarkEncoder(); enc.set_watermark('bytes',msg)
w=enc.encode(bgr,'dwtDct')
psnr=cv2.PSNR(bgr,w)
def acc(img):
    d=WatermarkDecoder('bits',bits)
    b=np.array(d.decode(img,'dwtDct')).astype(int)
    t=np.array([int(x) for x in ''.join(f'{c:08b}' for c in msg)])
    return float((b==t).mean())
def jpeg(img,q):
    ok,e=cv2.imencode('.jpg',img,[cv2.IMWRITE_JPEG_QUALITY,q]);return cv2.imdecode(e,1)
h,W=w.shape[:2]
tests={'no change':w,'JPEG q90':jpeg(w,90),'JPEG q50':jpeg(w,50),
 'resize 50%':cv2.resize(w,(W//2,h//2),interpolation=cv2.INTER_AREA),
 'resize 50% + back':cv2.resize(cv2.resize(w,(W//2,h//2),interpolation=cv2.INTER_AREA),(W,h),interpolation=cv2.INTER_CUBIC),
 'crop 10% edges':w[h//10:h-h//10,W//10:W-W//10],
 'rotate 2°':cv2.warpAffine(w,cv2.getRotationMatrix2D((W/2,h/2),2,1),(W,h)),
 'brighten 20%':np.clip(w.astype(float)*1.2,0,255).astype('uint8'),
 'blur σ=2':cv2.GaussianBlur(w,(0,0),2),
 'flip':w[:,::-1],
}
r={k:acc(v) for k,v in tests.items()}
r2={'psnr_embed':psnr,'acc':r,'unmarked_control':acc(bgr)}
json.dump(r2,open(out,'w'),indent=1,ensure_ascii=False);print(r2)
