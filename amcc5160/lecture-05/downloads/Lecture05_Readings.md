# AMCC 5160 · Lecture 05 — Reading guide

Two perspectives + one technical reading. For Quiz 05, reflect on any one of these three readings.

## Reading 1 / Artist interview: Art and the Age of AI: Holly Herndon & Mat Dryhurst With Hans Ulrich Obrist

Holly Herndon and Mat Dryhurst in conversation with Hans Ulrich Obrist · AnOther Magazine | September 12, 2024

https://www.anothermag.com/art-photography/15858/art-in-the-age-of-ai-holly-herndon-mat-dryhurst-with-hans-ulrich-obrist

**Task.** Read the conversation, focusing on what the artists say about training data, consent, and sharing a model of yourself.

Herndon and Dryhurst describe training their systems only on data they own or that people agreed to share, releasing Holly+ as a model of Herndon's voice that others can use, and building Spawning, including the tool "Have I Been Trained?", so artists can check and control whether their work is used for training.

**Questions to keep in mind**

- What do the artists mean by consensual training data?
- Why might an artist choose to share a model of their own voice or style?
- What would you want to control if someone trained a model on your work?

Connect this to the lecture's question, "Whose model is it?", and to the slides on memorized styles and concept ablation.

_This is an artists' perspective, not a neutral policy document. Agreement with the speakers is not required._

## Reading 2 / Arts education: From Creation to Curriculum: Examining the Role of Generative AI in Arts Universities

Atticus Sims · December 2024 | arXiv 2412.16531

https://arxiv.org/abs/2412.16531

**Task.** Read the abstract, the introduction, and the student case studies. Skim the technical sections.

Based on workshops that ended in a student exhibition, the paper argues that art students with no technical background can learn the full Stable Diffusion workflow, including LoRA fine-tuning and ControlNet, by making, reviewing results like a photographer's contact sheet, and refining. Case studies include a printmaking student who trained a LoRA on her own silk-screen prints.

**Questions to keep in mind**

- What did students train their LoRAs on, and why does that choice matter?
- How does the "contact sheet" habit help you judge generated images?
- Which part of this workflow would you use in Assignment 2?

This reading supports tonight's studio exercise: proposing a small dataset of your own images.

_The author's predictions about how quickly creative industries will adopt these tools are opinions, not established facts._

## Reading 3 / Technical reading: Multi-Concept Customization of Text-to-Image Diffusion

Nupur Kumari, Bingliang Zhang, Richard Zhang, Eli Shechtman, and Jun-Yan Zhu · CVPR 2023 | Custom Diffusion

https://arxiv.org/abs/2212.04488

**Task.** Read the abstract, the introduction, and the method overview. Look closely at the figures comparing Custom Diffusion, DreamBooth, and Textual Inversion. Equations are optional.

Custom Diffusion teaches a text-to-image model a new concept from a few images by updating only a small part of the model: the cross-attention key and value layers, plus a new word. Because the change is small, several separately learned concepts can be combined in one image.

**Questions to keep in mind**

- Which part of the model does Custom Diffusion change, and why that part?
- Why are regularization images used during training?
- What still goes wrong when two similar concepts are combined?

Most of tonight's technical slides come from this paper and from Jun-Yan Zhu's lecture based on it.

_You are not expected to reproduce the optimization or the equations._
