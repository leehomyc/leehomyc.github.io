# AMCC 5160 · Lecture 05 — Reading guide

One artist, one art-and-tech paper, one technique paper. All three connect directly to the lecture slides. For Quiz 05, reflect on any one of these three readings.

## Reading 1 / Art: This artist is dominating AI-generated art. And he’s not happy about it.

Melissa Heikkilä · MIT Technology Review | September 16, 2022

https://www.technologyreview.com/2022/09/16/1059598/this-artist-is-dominating-ai-generated-art-and-hes-not-happy-about-it/

**Task.** Read the article (about 10 minutes). Connect it to the “memorized style” slides.

Greg Rutkowski is a Polish illustrator known for fantasy landscapes painted in a classical style. His name was used as a prompt about 93,000 times with Stable Diffusion, far more than famous names such as Picasso. At first he thought it might bring him new viewers; then he found AI images carrying his name that he never made, and worried that his real work would become hard to find.

**Questions to keep in mind**

- Why did so many people type Rutkowski's name into their prompts?
- What exactly worries him: copying, credit, income, or something else?
- Is using an artist's name in a prompt homage, mimicry, or something new?

Tonight's slides showed Stable Diffusion imitating his style, and then a model that was made to forget it.

_This is a news report from 2022. The legal cases and the tools have changed since._

## Reading 2 / Art + tech: Ablating Concepts in Text-to-Image Diffusion Models

Nupur Kumari, Bingliang Zhang, Sheng-Yu Wang, Eli Shechtman, Richard Zhang, and Jun-Yan Zhu · ICCV 2023 | Project page

https://www.cs.cmu.edu/~concept-ablation/

**Task.** Read the abstract on the project page and look closely at the before-and-after figures. You do not need to read the method.

The paper shows how to make a text-to-image model “forget” one thing — a living artist's style, a copyrighted character, or a memorized photo — while keeping everything else. Ask for Grumpy Cat and you get an ordinary cat; ask for a painting in Greg Rutkowski's style and the style is gone.

**Questions to keep in mind**

- Pick one before-and-after pair. What exactly changed?
- Who should decide what a model is made to forget?
- Does removing an artist's name from one model protect the artist?

This is the method behind tonight's R2D2, Snoopy, Van Gogh and Greg Rutkowski slides.

_The equations are optional. The figures are the reading._

## Reading 3 / Technique: Multi-Concept Customization of Text-to-Image Diffusion (Custom Diffusion)

Nupur Kumari, Bingliang Zhang, Richard Zhang, Eli Shechtman, and Jun-Yan Zhu · CVPR 2023 | Project page

https://www.cs.cmu.edu/~custom-diffusion/

**Task.** Read the abstract on the project page and look at the results. Compare Custom Diffusion with DreamBooth and Textual Inversion.

Custom Diffusion teaches a model a new concept — a pet, an object, a style — from only a few photos, by changing just a small part of the model and adding a new word such as “V* dog”. Because the change is small, two separately learned concepts can be combined in one image.

**Questions to keep in mind**

- How many images does the model need to learn a new concept?
- What is the new word V* for?
- Which example would be most useful for your own film?

Most of tonight's customization slides — the moongate, Jun-Yan's dog, the wooden pot — come from this paper.

_You are not expected to understand the optimization._
