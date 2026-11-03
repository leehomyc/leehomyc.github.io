import c2pa,json,io,sys
from PIL import Image
src,outd=sys.argv[1],sys.argv[2]
im=Image.open(src).convert('RGB');im=im.resize((1024,int(1024*im.height/im.width)))
im.save(outd+'/orig.jpg',quality=92)
manifest={"claim_generator_info":[{"name":"AMCC5160 class demo","version":"1.0"}],"title":"Starry Night (class demo)","format":"image/jpeg",
 "assertions":[{"label":"c2pa.actions","data":{"actions":[{"action":"c2pa.created","digitalSourceType":"http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia","softwareAgent":{"name":"Demo model v1"}}]}},
 {"label":"c2pa.training-mining","data":{"entries":{"c2pa.ai_generative_training":{"use":"notAllowed"}}}}]}
sign=open('chain.pem','rb').read();key=open('leaf.p8','rb').read()
info=c2pa.C2paSignerInfo(c2pa.C2paSigningAlg.ES256,sign,key,None)
signer=c2pa.Signer.from_info(info)
b=c2pa.Builder(manifest)
with open(outd+'/orig.jpg','rb') as s, open(outd+'/signed.jpg','wb') as d:
    b.sign(signer,'image/jpeg',s,d)
def rd(path):
    try:
        with open(path,'rb') as f:
            r=c2pa.Reader('image/jpeg' if path.endswith('jpg') else 'image/png',f)
            j=json.loads(r.json())
            vs=j.get('validation_status',[]) ; 
            vr=j.get('validation_results',{})
            am=j['manifests'][j['active_manifest']]
            return {'manifest':True,'state':j.get('validation_state'),'issues':[x.get('code') for x in vs],'failures':[x.get('code') for x in vr.get('activeManifest',{}).get('failure',[])], 'success':[x.get('code') for x in vr.get('activeManifest',{}).get('success',[])][:8],'title':am.get('title'),'signer':am.get('signature_info',{}).get('issuer'),'assertions':[a['label'] for a in am.get('assertions',[])],'full':j}
    except Exception as e:
        return {'manifest':False,'err':str(e)[:90]}
res={}
res['signed']=rd(outd+'/signed.jpg')
s=Image.open(outd+'/signed.jpg').convert('RGB')
s.save(outd+'/resaved.jpg',quality=92);res['re-save JPEG']=rd(outd+'/resaved.jpg')
s.save(outd+'/shot.png');res['screenshot (PNG)']=rd(outd+'/shot.png')
s.resize((512,int(512*s.height/s.width))).save(outd+'/small.jpg',quality=85);res['resize for upload']=rd(outd+'/small.jpg')
# tamper: change pixel bytes inside the JPEG entropy data, keep the manifest
raw=bytearray(open(outd+'/signed.jpg','rb').read())
i=int(len(raw)*0.8)
for k in range(i,i+400): raw[k]=raw[k]^0x01 if raw[k] not in (0xFF,0x00,0xFE) else raw[k]
open(outd+'/tamper.jpg','wb').write(raw);res['edit pixels, keep manifest']=rd(outd+'/tamper.jpg')
full=res['signed'].pop('full',None)
json.dump(full,open(outd+'/manifest.json','w'),indent=1)
for k,v in res.items():
    v.pop('full',None);print(k,json.dumps(v,ensure_ascii=False))
json.dump(res,open(outd+'/res.json','w'),indent=1)
