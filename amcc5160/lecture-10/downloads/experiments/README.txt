AMCC 5160 Lecture 10: experiments run for this class, 3 November 2026.

These are demonstrations on one reproduction of each work, not studies.

exp_metrics.py  PSNR, SSIM, CLIP similarity and the LAION improved aesthetic predictor
                (sac+logos+ava1, ViT-L/14) on variants of The Starry Night and on works from the lecture.
                Results: metrics.json, aesthetic_scores.json
exp_c2pa.py     Signs an image with C2PA using a demo certificate, then re-saves, screenshots,
                resizes and edits it. Results: c2pa_results.json, c2pa_manifest.json
exp_wm.py       Embeds a 64-bit DWT-DCT watermark (invisible-watermark library) and tests it after
                common edits. This is not SynthID. Results: watermark.json

pip install c2pa-python invisible-watermark opencv-python-headless scikit-image transformers safetensors
For exp_c2pa.py, make your own certificate chain (chain.pem, leaf.p8) first. Do not reuse a demo key to sign real work.
