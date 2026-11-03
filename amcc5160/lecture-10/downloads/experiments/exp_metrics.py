import torch,numpy as np,json,sys,cv2,glob
from PIL import Image,ImageFilter
from transformers import CLIPModel,CLIPProcessor
from safetensors.torch import load_file
from skimage.metrics import structural_similarity as ssim, peak_signal_noise_ratio as psnr
import torch.nn as nn
SP=sys.argv[1]
m=CLIPModel.from_pretrained('openai/clip-vit-large-patch14',use_safetensors=True).eval()
p=CLIPProcessor.from_pretrained('openai/clip-vit-large-patch14')
st=load_file(SP+'/exp/aes.safetensors')
net=nn.Sequential(nn.Linear(768,1024),nn.Dropout(.2),nn.Linear(1024,128),nn.Dropout(.2),nn.Linear(128,64),nn.Dropout(.1),nn.Linear(64,16),nn.Linear(16,1))
net.load_state_dict({k.replace('layers.',''):v for k,v in st.items()});net.eval()
@torch.no_grad()
def emb(im):
    x=p(images=im.convert('RGB'),return_tensors='pt')
    v=m.vision_model(**x).pooler_output; v=m.visual_projection(v)
    return v/v.norm(dim=-1,keepdim=True)
@torch.no_grad()
def aes(e): return float(net(e)[0,0])
base=Image.open(SP+'/img/starry.jpg').convert('RGB');base=base.resize((768,608))
a=np.array(base)
V={}
V['A original']=base
V['B shifted 8 px']=Image.fromarray(np.roll(a,8,axis=1))
V['C mirrored']=Image.fromarray(a[:,::-1])
_,e=cv2.imencode('.jpg',a[:,:,::-1],[cv2.IMWRITE_JPEG_QUALITY,8]);V['D JPEG, heavy']=Image.fromarray(cv2.imdecode(e,1)[:,:,::-1])
V['E blurred']=base.filter(ImageFilter.GaussianBlur(5))
hsv=np.array(base.convert('HSV'));hsv[...,0]=(hsv[...,0].astype(int)+85)%256;V['F recoloured']=Image.fromarray(hsv,'HSV').convert('RGB')
rng=np.random.default_rng(5);ps=38;H,W=a.shape[:2];H2,W2=H//ps*ps,W//ps*ps
t=[a[y:y+ps,x:x+ps] for y in range(0,H2,ps) for x in range(0,W2,ps)];idx=rng.permutation(len(t));g=a.copy()
c=0
for y in range(0,H2,ps):
    for x in range(0,W2,ps): g[y:y+ps,x:x+ps]=t[idx[c]];c+=1
V['G scrambled']=Image.fromarray(g)
ref=emb(base)
out={}
for k,im in V.items():
    b=np.array(im);e=emb(im)
    out[k]={'psnr':float(psnr(a,b)) if k[0]!='A' else None,'ssim':float(ssim(a,b,channel_axis=2)),'clip':float((ref*e).sum()),'aes':aes(e)}
    im.save(f"{SP}/exp/figs/var_{k[0]}.jpg",quality=92)
    print(k,out[k])
json.dump(out,open(SP+'/exp/metrics.json','w'),indent=1)
art={'Duchamp, Fountain (1917)':'fountain.jpg','Van Gogh, The Starry Night (1889)':'starry.jpg','Copley, A Boy with a Flying Squirrel (1765)':'copley.jpg','John Snow, cholera map (1854)':'snow.jpg','Obvious, Edmond de Belamy (2018)':'belamy.jpg','DALL·E 2, "soulless, bland stock photo" (2022)':'web/salv_kiss.png','Molnár plotter drawing (V&A)':'web/vam_og.jpg','Gaudette film still (2026)':'web/face_thr.jpg','Anadol, Dataland render (2026)':'web/dataland_hall.jpg','Hokusai, Great Wave (c.1831)':'wave.jpg','Allen, Théâtre D\'opéra Spatial (2022)':'theatre.jpg','Daumier, Nadar lithograph (1862)':'daumier.jpg'}
res={}
for k,f in art.items():
    try:
        im=Image.open(SP+'/img/'+f);res[k]=aes(emb(im))
    except Exception as ex: print('skip',k,str(ex)[:50])
# sanity anchors: plain grey, sunset gradient
g=Image.new('RGB',(512,512),(128,128,128));res['Flat grey square (control)']=aes(emb(g))
n=Image.fromarray(np.random.default_rng(1).integers(0,255,(512,512,3),dtype='uint8'));res['Random noise (control)']=aes(emb(n))
res=dict(sorted(res.items(),key=lambda x:-x[1]))
print(json.dumps(res,indent=1,ensure_ascii=False));json.dump(res,open(SP+'/exp/aes.json','w'),indent=1,ensure_ascii=False)
