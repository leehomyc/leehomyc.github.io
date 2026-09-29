# AMCC 5160 · Lecture 05 — Making the Model Yours

Study transcript · English narration with Chinese companion explanations (中文讲解). 29 September 2026.

Slides marked [CMU 16-726 L16] or [CMU 16-726 L20] are adapted from Jun-Yan Zhu, CMU 16-726 Learning-Based Image Synthesis, Lectures 16 and 20.

## 1. Making the Model Yours

Good evening, everyone, and welcome to Week 5 of AMCC 5160. Tonight's lecture is called Making the Model Yours: adaptation, creative workflows, and authorship. Over the last four weeks we looked at what generative models are and what they can do out of the box. Tonight we ask a different question: what happens when you stop using a model exactly as it was shipped, and start changing it — teaching it your character, your object, your style? And once you can do that, whose work is it? A quick reminder before we start: Assignment 1 is due tomorrow, the thirtieth of September, at 11:59 pm Hong Kong time. If you have questions about it, hold them for the break and I'll answer them then.

中文讲解：欢迎来到第五讲《让模型成为你的》：适配、创作工作流与作者身份。前四讲我们了解了生成模型本身能做什么；今天讨论当你开始改变模型——教它认识你的角色、物件或风格——会发生什么，以及这样产生的作品属于谁。提醒：作业一将于明天（9月30日）晚上11:59截止，相关问题请留到课间。

## 2. Two tracks, one question

Tonight has two tracks, and they are woven together. The technique track asks: how do you teach a model something it has never seen? We'll go from Textual Inversion, to DreamBooth, to Custom Diffusion, to LoRA and adapters, and finish with why all of this now runs on a laptop. The practice track asks: what happens to artists when models learn styles? We'll look at copyright and living artists, at models that memorize their training images, at making a model forget an artist, and at whose defaults a model carries. Both tracks are adapted from Jun-Yan Zhu's course at Carnegie Mellon, 16-726, with thanks. After each block of technique, we'll stop and look at what it means for artists.

中文讲解：今晚有两条交织的线索。技术线：如何教模型学会它从未见过的东西——从文本反演、DreamBooth、Custom Diffusion，到LoRA与适配器，以及为什么这些方法如今能在笔记本电脑上运行。实践线：当模型学会风格时，艺术家会面临什么——版权与在世艺术家、记忆训练图像、让模型遗忘，以及模型继承了谁的默认设定。两条线索均改编自朱俊彦在卡内基梅隆大学的课程16-726。

## 3. Whose model is it?

Let me start with one question, and I'd like you to hold on to it all evening. Whose model is it? A foundation model has seen billions of images, made by millions of people. You add twenty of your own images and fine-tune it. What comes out — whose work is that? Let's do a quick show of hands. Who thinks the output belongs mostly to the company that made the model? Mostly to you? Mostly to the people whose images were in the training data? There's no right answer yet. Remember where you put your hand, because we'll come back to this question at the very end, and I'd like to see if anyone changes their mind.

中文讲解：请把这个问题带在身边一整晚：模型属于谁？基础模型见过数十亿张图像，你再加入自己的二十张进行微调，生成的作品属于谁——模型公司、你，还是训练数据中的创作者？先举手表态，课程结束时我们会再问一次，看看有没有人改变想法。

## 4. What prompting alone could not fix

Let's connect this to your own work. Many of you are finishing Assignment 1 right now, and I've seen three problems again and again. First, drift: your character's face, costume or prop changes from shot to shot. Second, sameness: everything has the same glossy, default AI look. Third, absence: the thing you really want — your sketchbook, your street, your grandmother's teapot — simply isn't in the model, and no prompt will conjure it. Each of these maps to a technique tonight. Drift is solved by subject customization. Sameness is addressed by style adaptation. Absence is solved by teaching the model a personal concept. Tonight is about moving from prompting a model to shaping one.

中文讲解：联系你们的作业一，我反复看到三个问题：漂移——角色的脸、服装或道具在镜头间不断变化；雷同——所有画面都带着同一种光滑的默认"AI感"；缺失——你真正想要的东西（你的速写本、你的街道、祖母的茶壶）根本不在模型里。它们分别对应今晚的技术：主体定制、风格适配和个人概念。今晚的主题，是从"提示"模型走向"塑造"模型。

## 5. Large-scale text-to-image models [CMU 16-726 L16]

Here's a quick recap of where we are. Large text-to-image models come in a few families: diffusion models like DALL-E 2, Imagen and Stable Diffusion; autoregressive models like Parti; and GAN or masked models like GigaGAN and MUSE. You've seen these in Weeks 2 to 4. I won't go back into the architectures. The point of this slide is simply how good these general models have become: a teddy bear on a skateboard in Times Square, raccoons reading a newspaper on a subway — all from a sentence. So if they're so good, why would we ever need to change them?

中文讲解：快速回顾：大型文生图模型包括扩散模型（DALL-E 2、Imagen、Stable Diffusion）、自回归模型（Parti）以及GAN或掩码模型（GigaGAN、MUSE）。这张幻灯片的重点只是说明这些通用模型已经非常强大——一句话就能生成滑板上的泰迪熊。那么，为什么还需要修改它们？

## 6. Limitations of text-to-image models [CMU 16-726 L16]

Because they have two bottlenecks. The first is linguistic. Not everything you can see can be described in words. Try describing the exact line quality of your own drawing, or the precise face of a friend, in a prompt. You can't. The second bottleneck is data. Many things are simply not in the training set: personal things that aren't public, like your dog or your family's shop, and new things that haven't been made yet — the character you are inventing for your film. For artists, these two bottlenecks are exactly where the interesting work lives. What you want to make is usually personal, specific, or new.

中文讲解：因为它们有两个瓶颈。语言瓶颈：并非所有看得见的东西都能用文字描述，比如你自己线条的质感。数据瓶颈：很多东西不在训练集中——个人的、不公开的东西，以及尚未被创造出来的东西。对艺术家而言，这两个瓶颈恰恰是最有意思的创作空间。

## 7. Text-to-image isn't perfect: the moongate [CMU 16-726 L16]

Here's a concrete example from Jun-Yan's lecture. Ask Stable Diffusion for a photo of a moongate. On the left is what the model makes; on the right are real moongates. A moongate is a circular gateway in a garden wall — very familiar in Chinese garden design, and you can find them here in Hong Kong. The model's version is plausible but wrong. It doesn't really know the concept. I'd like you to think for a moment: what is your moongate? What is something culturally specific, or personal, that the model keeps getting wrong when you prompt for it?

中文讲解：例子：让Stable Diffusion生成"月洞门"的照片。左边是模型的结果，右边是真实的月洞门——中国园林中常见的圆形门洞，香港也能见到。模型的版本看似合理，却并不正确。想一想：你的"月洞门"是什么？有什么文化上特定或个人的东西，是模型总是画错的？

## 8. Customization [CMU 16-726 L16]

The solution is called customization. We take a handful of real images of the concept — here just a few photos of moongates — and use them to update the model so that it learns this specific thing. Note how few images are needed. We're not training a model from scratch on millions of images. We're adjusting a model that already knows about gardens, walls, arches and circles, and showing it how those pieces fit together in this one concept.

中文讲解：解决方法叫做"定制"：用少量真实图片更新模型，让它学会这个具体概念。注意所需图片很少——我们不是从头训练，而是调整一个已经懂得园林、墙、拱门和圆形的模型，告诉它这些元素如何组合成这个概念。

## 9. The customized model [CMU 16-726 L16]

After customization, the same prompt — photo of a moongate — produces something that is clearly a moongate. And importantly, it is not copying any one of the training photos. It has learned the concept. It can place the gate in new lighting, new gardens, new compositions. That difference, between learning a concept and copying an image, is going to matter a great deal later tonight when we talk about memorization.

中文讲解：定制之后，同样的提示词能生成真正的月洞门，而且不是复制某一张训练照片——模型学会了这个概念，可以把它放进新的光线和构图中。"学会概念"与"复制图像"的区别，稍后讨论"记忆"问题时非常关键。

## 10. Unseen contexts [CMU 16-726 L16]

Here's the real test: unseen contexts. A moongate in snowy ice. None of the training photos show a moongate in snow. The customized model combines what it has just learned — the gate — with what it already knew — snow, ice, winter light. This recombination is what makes customization a creative tool rather than a copy machine. You teach the model one new word, and then you can use that word in sentences it has never seen.

中文讲解：真正的检验是未见过的情境：冰雪中的月洞门。训练照片里没有这样的场景，模型把新学的"门"与已有的"雪、冰、冬日光线"结合起来。这种重组让定制成为创作工具，而不是复印机。

## 11. No knowledge of personal concepts [CMU 16-726 L16]

Now a personal concept. This is Jun-Yan's dog, Stark. If you ask Stable Diffusion for a dark grey weimaraner, you get a weimaraner — a perfectly good one — but it will never be Stark. A description is not an identity. This is exactly the drift problem from your A1 films: you can describe your character in great detail, and the model will give you a different person who matches the description every time.

中文讲解：个人概念：这是朱俊彦的狗Stark。输入"一只深灰色魏玛犬"，模型会给你一只魏玛犬，但永远不是Stark。描述不等于身份——这正是作业一中角色漂移的问题。

## 12. Customization: V* dog [CMU 16-726 L16]

After customization we can write V-star dog wearing sunglasses, and we get Stark, specifically, wearing sunglasses. V-star is a new word we have taught the model. It doesn't exist in English; it's a token whose meaning is: this particular dog. Keep this idea of a new word in mind. It comes back directly in the first method, Textual Inversion, and later it becomes the trigger word you will see on almost every LoRA you download.

中文讲解：定制后，我们可以写"戴墨镜的V*狗"，得到的正是Stark。V*是我们教给模型的新词，意思是"这只特定的狗"。请记住这个"新词"的概念，它会在文本反演中再次出现，也就是你下载LoRA时看到的触发词。

## 13. Multiple concepts [CMU 16-726 L16]

And we can combine concepts: V-star dog wearing sunglasses in front of the moongate. Two customized concepts in one image. For filmmakers this is the dream: your character, in your location, in your style, shot after shot. It is also the hardest version of the problem, and we'll see later tonight where it still breaks. Before we go into how any of this works, let's pause and look at what customization means for the people whose work is being learned.

中文讲解：还可以组合概念："戴墨镜的V*狗站在月洞门前"。这对电影创作者是理想状态——你的角色、你的场景、你的风格，镜头之间保持一致；但它也是最难的情况。在讲解原理之前，先看看定制对被学习的创作者意味着什么。

## 14. Copyrights [CMU 16-726 L20]

This is our first practice block, and it's about copyright. I'll start with the same disclaimer Jun-Yan uses: I am not a lawyer. Copyright is about human creators' rights, there are many diverse opinions, and the legal landscape is changing month by month. What I can do tonight is help you recognise the questions, so that when you customize a model, you know what you are stepping into. Please don't take anything tonight as legal advice.

中文讲解：第一个实践单元：版权。和朱俊彦一样先声明：我不是律师。版权关乎人类创作者的权利，观点多样，法律环境也在不断变化。今晚的目的是帮助你们认识这些问题，而不是提供法律意见。

## 15. Copyrighted content? [CMU 16-726 L20]

Three kinds of content are at stake. First, copyrighted images, like news and sports photographs from Getty Images. Second, company IP and logos. Third, the artistic styles of living artists — here Greg Rutkowski, a fantasy illustrator whose name became one of the most common words in early Stable Diffusion prompts. For this class, the third one matters most. It is also legally the least settled, because in general a style on its own is not protected by copyright. Copyright protects specific works, not a manner of working. And yet, for a living artist, a model that produces endless work in their style can clearly feel like a loss.

中文讲解：涉及三类内容：受版权保护的图片（如Getty Images的体育照片）、公司知识产权与标志、以及在世艺术家的风格（如奇幻插画家Greg Rutkowski）。第三类对本课最重要，也最不明确——一般而言，风格本身不受版权保护，版权保护的是具体作品。但对在世艺术家来说，一个能无限产出其风格作品的模型显然是一种损失。

## 16. Ongoing legal battles (1) [CMU 16-726 L20]

These are headlines from some of the landmark cases from 2023. Getty Images sued Stability AI, the makers of Stable Diffusion, over the use of millions of its photographs in training. And a group of illustrators filed a lawsuit against Stability AI and Midjourney, arguing their work was used without permission. These headlines are from 2023, and these cases have moved on since then, so I'd encourage you to look up where they stand today. The point for us is that the question of what can be used for training is being argued in court right now.

中文讲解：这些是2023年部分标志性案件的新闻标题：Getty Images起诉Stability AI使用其数百万张照片训练；一群插画家起诉Stability AI和Midjourney未经许可使用其作品。这些案件此后已有进展，建议自行查阅最新情况。重点是：哪些内容可以用于训练，正在法庭上争论。

## 17. Ongoing legal battles (2) [CMU 16-726 L20]

Two more headlines, showing both sides of authorship. On the left: AI-created images losing a copyright test — in the US, images generated purely by AI have struggled to be registered, because copyright requires a human author. So the output may not be yours. On the right: a model reproducing a training image almost exactly. So the output may belong to someone else. Keep both of these in mind as we now go back to the technique and see how customization actually works.

中文讲解：另外两则新闻展示了作者身份的两面：纯AI生成的图像在美国难以获得版权登记，因为版权要求人类作者——作品可能不属于你；而模型有时几乎原样复现训练图像——作品可能属于别人。带着这两点，我们回到技术部分。

## 18. Which parts shall we customize? [CMU 16-726 L16]

Back to technique. This is the central question of the technical half: which parts of the model shall we customize? A text-to-image model has, roughly, two places you can change. You can change the words — the text embedding that turns your prompt into numbers. Or you can change the picture-maker — the large network, the U-Net or transformer, that actually generates the image. Each method tonight is a different answer to this question, with different costs and different results.

中文讲解：回到技术。技术部分的核心问题：应该定制模型的哪一部分？大致有两处可改：一是"词语"，即把提示词转为数字的文本嵌入；二是"画师"，即真正生成图像的U-Net或Transformer。今晚的每种方法都是对这个问题的不同回答。

## 19. Textual Inversion: optimizing a text embedding [CMU 16-726 L16]

The first answer is Textual Inversion, by Rinon Gal and colleagues, published at ICLR 2023. Here the whole model stays frozen. Nothing inside the image generator changes. We only learn one new word — technically a vector in the text embedding space — so that when this word appears in a prompt, the model reproduces your images. Here's an analogy for the artists: you are not retraining the painter. You are inventing a new name for something, which the painter already half-understands, and teaching them what that name means.

中文讲解：第一种回答是文本反演（Gal等，ICLR 2023）：整个模型保持冻结，只学习一个新词——文本嵌入空间中的一个向量——使它出现在提示中时能复现你的图像。类比：你不是在重新训练画师，而是为一个画师已经半懂的东西起了新名字，并教会他这个名字的含义。

## 20. Textual Inversion results [CMU 16-726 L16]

Here are some results. Once the new word is learned, you can recombine it with ordinary words, just like any other word. Put the object on a beach, in a painting, as a toy. Because the model is untouched, it keeps all of its general knowledge, and the new word just points it towards a region it could already reach.

中文讲解：结果：新词学会后，可以像普通词一样与其他词组合——放在海滩上、画成油画、做成玩具。因为模型本身没有改变，它保留了全部通用知识。

## 21. Works well for artistic styles [CMU 16-726 L16]

And here is something very important for this class: Textual Inversion works well for artistic styles. Style is loose enough — colour, texture, stroke, mood — that a single learned vector can capture a good deal of it. I want to flag this because it is exactly why style mimicry became so easy so quickly. If one small vector can hold much of an artist's style, then anyone with a dozen images of that artist's work can bottle it.

中文讲解：对本课很重要的一点：文本反演很适合学习艺术风格。风格足够"宽松"，一个向量就能捕捉大部分。这正是风格模仿迅速变得容易的原因——任何人只要有十几张某位艺术家的作品，就能把其风格"装瓶"。

## 22. Cannot preserve object identity [CMU 16-726 L16]

But Textual Inversion has a limit: it cannot preserve object identity. Here are the target images of a particular cat, and the prompt S-star cat swimming in a pool. The result is a cat, but it's not this cat. The details that make an individual recognisable are too fine to squeeze into one word. For a recurring character in a film, that's not good enough.

中文讲解：但文本反演无法保持物体身份："游泳的S*猫"生成的是一只猫，却不是这只猫。个体特征太细微，无法压缩进一个词。对于电影中反复出现的角色，这还不够。

## 23. How to improve identity preservation? [CMU 16-726 L16]

So how do we improve identity preservation? If changing the word is not enough, we need to change the painter as well.

中文讲解：那么如何提升身份保持？如果只改"词语"不够，就必须连"画师"一起改。

## 24. DreamBooth: fine-tuning all the weights [CMU 16-726 L16]

That's DreamBooth, by Nataniel Ruiz and colleagues at Google, CVPR 2023. DreamBooth fine-tunes all the weights of the model on your few images. The training objective is the same denoising loss you saw in Week 3; we just apply it to your photos. I'll skip the equation. The problem is overfitting. After training on a few photos of one dog, the model starts to forget what other dogs look like, and its outputs lose variety. The fix is regularization: while training, you also show the model images it generated itself of the general class — ordinary dogs — so it keeps that knowledge.

中文讲解：这就是DreamBooth（Ruiz等，CVPR 2023）：用少量图片微调模型的全部权重，训练目标与第三讲的去噪损失相同。问题是过拟合：模型会忘记其他狗的样子，输出失去多样性。解决方法是正则化——训练时同时加入模型自己生成的同类图片（普通的狗），让它保留原有知识。

## 25. DreamBooth results [CMU 16-726 L16]

And the results are striking. The identity holds across very different scenes, poses and styles. This is the ancestor of nearly every consistent character feature you see in today's image and video tools. When a tool lets you upload photos of a person and then place them anywhere, some version of this idea is usually underneath.

中文讲解：结果非常惊人：身份在截然不同的场景、姿态和风格中都能保持。今天几乎所有图像与视频工具中的"角色一致性"功能，都源自这个思路。

## 26. DreamBooth applications [CMU 16-726 L16]

DreamBooth also enables some creative applications. Text-guided view synthesis: show the subject from the top, the bottom, or the back. Art renditions: the same dog painted in the style of Van Gogh, Michelangelo or Vermeer. And property modification: the same dog, but crossed with a panda, a lion or a hippo. Notice that the art renditions are exactly where the questions from our practice block come back: whose styles are being used here, and does it matter that these artists are long dead?

中文讲解：DreamBooth还有一些创意应用：文本引导的视角合成（从上方、下方、背后看主体）、艺术再现（梵高、米开朗基罗、维米尔风格的同一只狗）、属性修改（与熊猫、狮子、河马混合）。注意艺术再现正好回到实践单元的问题：用的是谁的风格？这些艺术家早已过世，这是否重要？

## 27. DreamBooth vs. Textual Inversion [CMU 16-726 L16]

Here's DreamBooth and Textual Inversion side by side. DreamBooth preserves the subject far better. A practical rule of thumb for your projects: if you want a style, a light method like Textual Inversion can be enough. If you want a specific character or object to stay the same across shots, you need a method that changes the model's weights.

中文讲解：DreamBooth与文本反演对比：DreamBooth对主体的保持好得多。实用经验：如果要学风格，轻量方法可能就够；如果要让特定角色或物件在镜头间保持一致，就需要改变模型权重的方法。

## 28. Memorized training images [CMU 16-726 L20]

Now our second practice block. Remember that DreamBooth overfits when trained on a few images, and starts reproducing them. Here is the same phenomenon, but at the scale of the whole internet. On the left is a real photograph of Ann Graham Lotz from the training data. On the right is what Stable Diffusion generates from her name. It's almost identical. This comes from work by Carlini and colleagues in 2023 on extracting training data from diffusion models. You can think of memorization as overfitting that nobody asked for.

中文讲解：第二个实践单元。DreamBooth用少量图片训练时会过拟合并复现它们；这里是同一现象在整个互联网规模上的表现。左边是训练数据中Ann Graham Lotz的真实照片，右边是Stable Diffusion根据她的名字生成的图像，几乎一模一样（Carlini等，2023）。可以把"记忆"理解为没人要求的过拟合。

## 29. How memorized images are found [CMU 16-726 L20]

How did the researchers find these memorized images? In three steps. First, identify images that are duplicated many times in the training data. Second, generate many images using the caption of each duplicated image as the prompt. Third, match the generated images against the originals. Many matched almost exactly. There is a lesson here for your own work: if your small training set contains duplicates, or near-duplicates, your LoRA is much more likely to copy them rather than learn from them. Curate your dataset carefully.

中文讲解：研究者如何找到被记忆的图像？三步：找出训练数据中大量重复的图像；用其标题作为提示生成许多图像；与原图比对。很多几乎完全一致。启示：如果你的小数据集中有重复或近似重复的图片，你的LoRA更可能复制而不是学习。请认真整理数据集。

## 30. Memorized style [CMU 16-726 L20]

Memorization isn't only about individual images. It can also be about style. On the left, a painting by Greg Rutkowski. On the right, Stable Diffusion's output for a painting of a boat on the water in the style of Greg Rutkowski. It's not a copy of any one painting, but the style is unmistakable. Rutkowski is a living illustrator, and he did not ask to become a prompt. Connect this back to the Textual Inversion slide: it works well for artistic styles. So I'll ask you: is this homage, is it mimicry, or is it something new?

中文讲解：记忆不只针对单张图像，也可能针对风格。左边是Greg Rutkowski的画作，右边是"Greg Rutkowski风格的水上小船"的生成结果——不是复制某一幅画，但风格一眼可辨。Rutkowski是在世插画家，他从未要求成为提示词。这是致敬、模仿，还是新的东西？

## 31. Memorized instances [CMU 16-726 L20]

And memorization can be about a specific individual. Here's Grumpy Cat, a famous internet cat. Ask Stable Diffusion for what a cute Grumpy cat, and you get Grumpy Cat. In a sense, the model has already been customized with Grumpy Cat, exactly the way we customized it with Jun-Yan's dog — but nobody chose to do it. Famous characters and people are pre-customized into the model, whether or not anyone agreed.

中文讲解：记忆也可能针对特定个体。网红猫Grumpy Cat：输入"一只可爱的Grumpy猫"，得到的就是Grumpy Cat。某种意义上，模型已经被"定制"了这只猫——就像我们定制朱俊彦的狗一样，只是没有人选择这样做。著名角色和人物已被预先定制进模型，无论是否有人同意。

## 32. Fine-tuning all model weights: the costs [CMU 16-726 L16]

Back to technique, and to the costs of DreamBooth. Fine-tuning all the model weights has three problems. Storage: about four gigabytes for every concept. Compute: it needs a lot of GPU memory and training time. And compositionality: it's hard to combine two separately trained models. If you want ten characters for a film, that is forty gigabytes of models that don't talk to each other.

中文讲解：回到技术，以及DreamBooth的代价：存储——每个概念约4GB；算力——需要大量显存和训练时间；组合性——两个分别训练的模型难以合并。如果一部电影需要十个角色，就是40GB互不相通的模型。

## 33. Analyzing the change in weights [CMU 16-726 L16]

So Jun-Yan's group did a nice piece of detective work. After fine-tuning, which weights actually changed the most? They measured the relative change in each type of layer: cross-attention, self-attention, and everything else. The answer is clear: the cross-attention layers change much more than the rest. You'll remember from Week 3 that cross-attention is where the words of your prompt meet the image. That suggests we might only need to train those layers.

中文讲解：朱俊彦团队做了一个巧妙的分析：微调后哪些权重变化最大？他们比较了交叉注意力、自注意力和其他层的相对变化，发现交叉注意力层变化远大于其他部分。第三讲讲过，交叉注意力正是提示词与图像相遇的地方——也许只需训练这些层。

## 34. Only fine-tune cross-attention layers [CMU 16-726 L16]

And that's Custom Diffusion, by Nupur Kumari and colleagues, CVPR 2023. Freeze everything except the key and value projections in the cross-attention layers — the orange blocks here. Everything in blue stays frozen. The result is a much smaller update, faster training, and, as we'll see, concepts that are much easier to combine.

中文讲解：这就是Custom Diffusion（Kumari等，CVPR 2023）：只训练交叉注意力中的键（K）和值（V）投影（图中橙色），其余全部冻结（蓝色）。更新量小得多，训练更快，概念也更容易组合。

## 35. How to prevent overfitting? [CMU 16-726 L16]

Overfitting still needs managing. After learning moongate, the fine-tuned model starts putting moongates into every image of the moon — sky full of stars and the moon, blood moon. The fix again is regularization images: real photos of related concepts, like the moon, included in training so the model keeps its general knowledge. For artists, here's how I'd put it: what you leave out of a dataset, and what you put next to it, matters as much as what you put in.

中文讲解：过拟合仍需处理：学会"月洞门"后，模型开始把月洞门放进所有关于月亮的图像。解决方法依然是正则化图片——加入相关概念（如月亮）的真实照片。对艺术家来说：数据集中留下什么、旁边放什么，与放进去什么同样重要。

## 36. Personalized concepts: the V* token [CMU 16-726 L16]

How do we describe a personalized concept in the prompt? With the same V-star modifier token we saw earlier, proposed by Textual Inversion. Custom Diffusion trains that new token together with the small weight update. So Custom Diffusion is really Textual Inversion plus a light fine-tune. In tools like ComfyUI and on model-sharing sites, you'll see this as the trigger word of a LoRA: the word you must include in your prompt to activate what it learned.

中文讲解：如何在提示中描述个人概念？使用文本反演提出的V*修饰词。Custom Diffusion把这个新词与少量权重更新一起训练——相当于文本反演加轻量微调。在ComfyUI和模型分享网站上，这就是LoRA的触发词：必须写进提示词才能激活它学到的内容。

## 37. Single concept results (1) [CMU 16-726 L16]

Some single-concept results. Here we have a few photos of a particular dog, and the result for V-star dog wearing headphones. The identity is held, and the model can still place the dog in a new situation it has never seen.

中文讲解：单概念结果：几张某只狗的照片，生成"戴耳机的V*狗"。身份得以保持，模型仍能把狗放进从未见过的情境。

## 38. Single concept results (2) [CMU 16-726 L16]

Another one: a watercolor painting of V-star tortoise plushy on a mountain. A personal object, a soft toy, rendered as a watercolour and placed on a mountain. So we get identity and a new style at once, from a model that was only lightly changed.

中文讲解：另一个例子："山上的V*乌龟毛绒玩具水彩画"。一个私人物件被画成水彩并放在山上——身份与新风格同时实现，而模型只做了轻微改动。

## 39. Results: a specific art style [CMU 16-726 L16]

And a specific art style: painting of a dog in the style of V-star art, learned from drawings by Aaron Hertzmann. Hertzmann is a researcher and artist who writes a lot about AI and art. So I'd ask the room: what would you want to know, or to ask, before you trained a model on someone's drawings like this? Hold your answers. The next practice block is about exactly this.

中文讲解：特定艺术风格：从Aaron Hertzmann的素描中学习"V*艺术风格的狗"。Hertzmann是研究者兼艺术家，经常撰写关于AI与艺术的文章。在用别人的画作训练模型之前，你会想了解或询问什么？请保留你的答案，下一个实践单元正是讨论这个。

## 40. Two concept results: style + object [CMU 16-726 L16]

Custom Diffusion can also merge separately trained concepts. Here, V1-star art style painting of V2-star wooden pot: one concept is Hertzmann's drawing style, the other is a particular wooden pot. The merging uses a closed-form optimization which I'll skip. For a film, the idea is: one small adapter per character, one per look, combined at render time.

中文讲解：Custom Diffusion还能合并分别训练的概念："V1*艺术风格的V2*木盆画"——一个是Hertzmann的素描风格，一个是特定的木盆。合并使用闭式优化，这里略过。对电影而言：每个角色一个小适配器，每种画风一个，渲染时组合。

## 41. Qualitative comparison (multi-concept) [CMU 16-726 L16]

Here's a comparison for multiple concepts: V1-star flower in the V2-star wooden pot on a table. Custom Diffusion, DreamBooth and Textual Inversion. Custom Diffusion keeps both the specific flower and the specific pot. The others lose one or the other. Combining concepts is still the hardest case.

中文讲解：多概念对比："桌上V2*木盆中的V1*花"。Custom Diffusion同时保留了特定的花和盆，另外两种方法则丢失其一。组合概念仍然是最难的情况。

## 42. Limitations [CMU 16-726 L16]

An honest limitation: two similar subjects. A V1-star dog and a V2-star cat playing together: the features get blended, and you might get two cat-dogs. If your Assignment 2 involves two characters in one shot, expect to use the composition tools from Week 2 as well — ControlNet, regional prompting, inpainting — rather than relying on customization alone.

中文讲解：局限：两个相似的主体（V1*狗和V2*猫一起玩）会发生特征混合，可能得到两只"猫狗"。如果作业二的一个镜头中有两个角色，除了定制，还要用第二讲的构图工具——ControlNet、区域提示、局部重绘。

## 43. Memory requirement [CMU 16-726 L16]

Now memory. Each Custom Diffusion model takes about seventy-five megabytes, much less than four gigabytes but still sizeable. Jun-Yan's group analysed the difference between the pretrained and fine-tuned weights, and looked at its singular values — this curve. Almost all of the change is concentrated in a few directions. That means the update is effectively low-rank, and can be compressed a great deal.

中文讲解：存储方面：每个Custom Diffusion模型约75MB，比4GB小很多但仍不算小。分析预训练与微调权重之差的奇异值（这条曲线）发现，几乎所有变化集中在少数几个方向上——更新本质上是低秩的，可以大幅压缩。

## 44. Concept ablation [CMU 16-726 L20]

Now our third practice block, and it's the mirror image of everything we've just done. Customization teaches a model something new. Concept ablation makes it forget something. This is again from Nupur Kumari and colleagues, in 2023 — the same group behind Custom Diffusion. For artists, this is what an opt-out could look like inside the model itself.

中文讲解：第三个实践单元，是前面内容的镜像：定制教模型学会新东西，概念消融让模型忘记某些东西（Kumari等，2023，与Custom Diffusion同一团队）。对艺术家来说，这就是模型内部的"退出"机制可能的样子。

## 45. Concept ablation: the goal [CMU 16-726 L20]

The goal is simple. You type the same prompt, what a cute Grumpy cat, and instead of Grumpy Cat you get a random, ordinary cat. The specific identity is gone, but the general concept — cat — is kept. The model still works; it just can't produce that one thing.

中文讲解：目标很简单：输入同样的"一只可爱的Grumpy猫"，得到的是一只普通的随机猫。特定身份消失了，但"猫"这个一般概念保留。模型照常工作，只是无法生成那一样东西。

## 46. Concept ablation: intuition (1) [CMU 16-726 L20]

Here's an intuition for how this works, without the maths. Picture everything the model would draw for Grumpy Cat as a narrow hill — this green curve. All of its guesses are packed around one specific appearance.

中文讲解：不用数学的直觉：把模型对"Grumpy Cat"会画出的所有结果想象成一座狭窄的小山（绿色曲线）——所有猜测都集中在一种特定外观周围。

## 47. Concept ablation: intuition (2) [CMU 16-726 L20]

Ablation reshapes that narrow green hill so that it matches the wider blue hill of any cat. After ablation, asking for Grumpy Cat gives you the same variety you'd get from asking for a cat. It's done with a small fine-tune — like Custom Diffusion, but pointing the other way. The original lecture has several slides of equations here; we'll skip them.

中文讲解：消融把这座狭窄的绿色小山重塑为"任意猫"那座更宽的蓝色小山。之后请求Grumpy Cat，就会得到与请求"猫"一样的多样性。它通过一次小规模微调完成——像Custom Diffusion，只是方向相反。原讲义中的公式推导这里略过。

## 48. Ablating R2D2 (1) [CMU 16-726 L20]

Here's a copyrighted character: R2D2. On the left, Stable Diffusion for the future is now with this amazing home automation R2D2. On the right, the ablated model, which gives a generic household robot. The prompt still makes sense, but the protected character is gone.

中文讲解：受版权保护的角色：R2D2。左边原始模型根据"家居自动化R2D2"画出R2D2；右边消融后的模型画出一个普通家用机器人。提示依然合理，但受保护的角色消失了。

## 49. Ablating R2D2 (2) [CMU 16-726 L20]

Another R2D2 prompt: the possibilities are endless with this versatile R2D2. Again, the original model draws R2D2, and the ablated model draws a different robot. The ablation holds across prompts, not just for one sentence.

中文讲解：另一个R2D2提示："功能多样的R2D2，可能性无限"。原始模型画出R2D2，消融模型画出另一种机器人。消融效果在不同提示下都能保持，而不仅限于一句话。

## 50. Ablating Snoopy (1) [CMU 16-726 L20]

Now Snoopy. A devoted Snoopy accompanying its owner on a road trip. The original gives the cartoon character; the ablated model gives a real dog in a car. Let me ask you: is a model that can't draw Snoopy a better tool for artists, or a worse one? Think about it from Charles Schulz's point of view, and then from a fan artist's point of view.

中文讲解：史努比："忠诚的史努比陪主人公路旅行"。原始模型画出卡通角色，消融模型画出车里的一只真狗。问题：一个画不出史努比的模型，对艺术家是更好的工具还是更差的？分别从作者舒尔茨和同人创作者的角度想一想。

## 51. Ablating Snoopy (2) [CMU 16-726 L20]

And another Snoopy prompt: a confident Snoopy standing tall and proud after a successful training session. Original: the cartoon Snoopy, rendered in 3D. Ablated: an ordinary dog standing on a road. The character is gone; the dog and the scene remain.

中文讲解：另一个史努比提示："训练成功后自信站立的史努比"。原始模型给出3D卡通史努比，消融模型给出站在路上的普通狗。角色消失了，狗和场景保留。

## 52. Ablating Van Gogh (1) [CMU 16-726 L20]

Now styles. Painting of olive trees in the style of Van Gogh. Van Gogh is in the public domain, so nobody actually needs to remove him, but he makes the effect easy to see. The olive trees stay. The swirling brushwork and the colours go.

中文讲解：风格："梵高风格的橄榄树"。梵高作品已进入公共领域，其实没人需要移除他，但他让效果一目了然——橄榄树还在，旋转的笔触和色彩消失了。

## 53. Ablating Van Gogh (2) [CMU 16-726 L20]

Painting of women working in the garden, in the style of Van Gogh. Look carefully at the zoomed-in regions. What exactly was removed? Colour, brushstroke, composition? This is a useful way to understand what a style is to a model: it's whatever changes when you take the name away.

中文讲解："梵高风格的花园中劳作的女性"。仔细看放大的区域：到底移除了什么？色彩、笔触还是构图？这是理解"风格对模型意味着什么"的好方法：拿掉名字后发生变化的，就是风格。

## 54. Ablating Greg Rutkowski (1) [CMU 16-726 L20]

And now a living artist again. A painting of a boat on the water in the style of Greg Rutkowski — the same prompt we saw on the memorized style slide. On the left, the original model; on the right, the ablated model. The boat and the water are still there. The Rutkowski look is gone.

中文讲解：再回到在世艺术家："Greg Rutkowski风格的水上小船"——与"记忆风格"那张幻灯片相同的提示。左边原始模型，右边消融模型：船和水还在，Rutkowski的画风消失了。

## 55. Ablating Greg Rutkowski (2) [CMU 16-726 L20]

Painting of a group of people on a dock by Greg Rutkowski. Here's the point I'd like you to take away. Removing one name from one model is not removing the influence. Anyone can still train a LoRA on Rutkowski's portfolio in an afternoon, using exactly the techniques from the first half of tonight. So ablation is a useful tool, but it doesn't settle the ethical question on its own.

中文讲解："Greg Rutkowski画的码头上的一群人"。要点：从一个模型中移除一个名字，并不等于移除影响。任何人仍可用今晚前半部分的技术，在一个下午内用Rutkowski的作品集训练一个LoRA。消融是有用的工具，但它本身并不能解决伦理问题。

## 56. Ablating memorized images (1) [CMU 16-726 L20]

Ablation can also fix memorization. This is a phone case design, New Orleans House Galaxy Case, that the model kept reproducing almost exactly. On the left, the real image; in the middle, the original model's outputs, which are nearly all copies; on the right, after ablation, varied designs.

中文讲解：消融还能修复记忆问题：一款手机壳设计被模型几乎原样复现。左边是真实图片，中间是原始模型几乎全是复制品的输出，右边是消融后多样化的设计。

## 57. Ablating memorized images (2) [CMU 16-726 L20]

And the memorized portrait of Ann Graham Lotz from earlier. The original model keeps reproducing the one photograph. After ablation, it generates varied portraits. So the same tool can protect an artist's style and a person's image.

中文讲解：之前被记忆的Ann Graham Lotz肖像：原始模型不断复现那一张照片，消融后生成多样的肖像。同一工具既能保护艺术家的风格，也能保护个人形象。

## 58. Ablating a composition of concepts [CMU 16-726 L20]

Finally, ablating a composition of concepts. Here the target is the combination kids with guns. The goal is to remove that combination while keeping kids on their own, and guns on their own. This is the mirror image of Custom Diffusion's multi-concept merging: instead of combining two concepts, you prevent one specific combination.

中文讲解：消融概念组合：目标是移除"拿枪的孩子"这一组合，同时保留单独的"孩子"和"枪"。这是Custom Diffusion多概念合并的镜像——不是组合两个概念，而是阻止某个特定组合。

## 59. Other works [CMU 16-726 L20]

For those of you who want to go deeper, here are two related papers: Erasing Concepts from Diffusion Models, by Gandikota and colleagues, and Forget-Me-Not, by Zhang and colleagues. Both are about making text-to-image models forget. They're good background if you're interested in the technical side of artists' rights.

中文讲解：想深入了解的同学可以阅读两篇相关论文：Gandikota等的《从扩散模型中擦除概念》和Zhang等的《Forget-Me-Not》，都是关于让文生图模型遗忘的研究，适合作为艺术家权利技术层面的背景。

## 60. Compressing fine-tuned weights [CMU 16-726 L16]

Back to technique for the last time. We saw that Custom Diffusion's update is low-rank. So we can compress it: keep only the top directions of change. Keeping the top twenty percent of the rank gives about fifteen megabytes, and even a rank-one update is around a tenth of a megabyte, and still captures a lot of the concept. That's why these adapters are small enough to share as files.

中文讲解：最后一次回到技术。Custom Diffusion的更新是低秩的，因此可以压缩：只保留最主要的变化方向。保留前20%的秩约15MB，即使秩为1的更新也只有约0.1MB，仍能捕捉概念的大部分。这就是适配器小到可以作为文件分享的原因。

## 61. Low-rank adaptation (LoRA) [CMU 16-726 L16]

And this brings us to LoRA, Low-Rank Adaptation, by Edward Hu, Yelong Shen and colleagues, ICLR 2022. It was invented for large language models, and brought to diffusion models by Simo Ryu. Here's an intuition: the original model is a huge sheet of numbers. LoRA adds a thin overlay made of two skinny matrices multiplied together. You train only the overlay. Swap overlays, keep the model. This is now the most common way that artists customize image and video models.

中文讲解：由此引出LoRA，低秩适配（Hu、Shen等，ICLR 2022）。它原本为大语言模型发明，由Simo Ryu引入扩散模型。直觉：原模型是一张巨大的数字表，LoRA在上面叠加一层由两个细长矩阵相乘构成的"薄膜"，只训练这层薄膜。换薄膜、不换模型——这是如今艺术家定制图像与视频模型最常用的方式。

## 62. Low-rank adaptation (SVDiff) [CMU 16-726 L16]

There are variations on this idea. SVDiff, by Han and colleagues, optimizes only the singular values of the weight matrices, which makes the update even smaller and makes it easier to compose multiple subjects, like a dog and a panda put together. You don't need to remember the details. The general idea is: find the smallest change to the model that captures what you want.

中文讲解：这一思路还有变体：SVDiff（Han等）只优化权重矩阵的奇异值，更新更小，也更容易组合多个主体（如狗和熊猫）。细节无需记住，核心思想是：找到能实现目标的最小模型改动。

## 63. Optimization is too slow [CMU 16-726 L16]

But every method so far needs training. Minutes at best, sometimes hours, for each concept. For live performance, or for quick iteration in a studio, that's too slow. So can we skip the training entirely?

中文讲解：但到目前为止的每种方法都需要训练——每个概念至少几分钟，有时数小时。对于现场表演或工作室中的快速迭代，这太慢了。能否完全跳过训练？

## 64. Image Prompt Adapter (IP-Adapter) [CMU 16-726 L16]

Yes, with encoder-based methods. IP-Adapter, the Image Prompt Adapter, by Hu Ye and colleagues. Instead of training on your images, an image encoder turns a reference picture into a visual prompt in a single pass, and feeds it into the model's cross-attention alongside the text. It's instant, but less faithful than a trained LoRA. Most reference image features in today's video tools work roughly this way.

中文讲解：可以，用基于编码器的方法：IP-Adapter（图像提示适配器，Ye等）。它不在你的图片上训练，而是由图像编码器一次性把参考图转换为"视觉提示"，与文本一起输入模型的交叉注意力。即时生效，但不如训练好的LoRA忠实。如今视频工具中的"参考图"功能大多以类似方式工作。

## 65. IP-Adapter results [CMU 16-726 L16]

Here are IP-Adapter results. A single reference image steers the new generations. And because it enters through its own path, it can be combined with a text prompt, and with structure controls like ControlNet from Week 2.

中文讲解：IP-Adapter结果：一张参考图引导新的生成。由于它有独立的输入通道，可以与文本提示以及第二讲的ControlNet等结构控制结合使用。

## 66. Optimization + encoder (5–15 steps) [CMU 16-726 L16]

And there's a middle way: optimization plus an encoder. An encoder gives a good starting point from a single input image, and then only five to fifteen fine-tuning steps are needed, instead of thousands. Here one photo of a person, and one of a cat, become an astronaut, a watercolour painting, a charcoal sketch, and more. This work is again by Rinon Gal and colleagues.

中文讲解：还有折中方案：优化加编码器（Gal等）。编码器从单张图片给出良好起点，然后只需5到15步微调，而不是数千步。一张人像和一张猫的照片，就能变成宇航员、水彩画、炭笔素描等。

## 67. Smaller changes, fewer steps, smaller numbers

Let me add one slide of my own on why all of this now runs on a laptop. Three ideas, and I'll keep them at the level of intuition. Adapters: change less. LoRA trains a thin overlay, not the whole model, so the file you share is small. Distillation: step less. A student model learns to do in a few denoising steps what the teacher does in many, which gives near-real-time generation. Quantization: store less. Keep each number in the model with fewer bits — like saving a photo as a smaller JPEG — so it fits on a consumer GPU. For the technical students, Song Han's MIT course, EfficientML.ai, Lecture 16, covers this properly.

中文讲解：补充一张我自己的幻灯片：为什么这一切如今能在笔记本电脑上运行？三个直觉。适配器——改得更少：LoRA只训练薄膜，分享的文件很小。蒸馏——步数更少：学生模型学会用几步去噪完成老师需要很多步的工作，实现接近实时的生成。量化——存得更少：用更少的比特存每个数字，就像把照片存成更小的JPEG，从而装进消费级显卡。技术背景的同学可参考韩松的MIT课程EfficientML.ai第16讲。

## 68. Open or hosted? A creative trade-off

Now a practical choice for your projects: open model on your own machine, or hosted tool on the web? With an open model in something like ComfyUI, you can train your own LoRA with full control, your images stay on your machine, and your work is reproducible from the seed and the workflow file — but you need setup and a GPU, and quality is usually a step behind the frontier. A hosted tool is easy, often the best quality available, but your images are uploaded to a company, training options are limited, and results are often not reproducible. One more thing: your workflow file, your seeds and your model versions are also your documentation of AI use for Assignment 2. Please save them.

中文讲解：项目中的实际选择：本地开源模型还是网络托管工具？开源模型（如ComfyUI）可以完全自主地训练LoRA，图片留在本机，凭种子和工作流文件可复现，但需要配置和显卡，质量通常落后前沿一步。托管工具简单易用、质量常为最佳，但图片会上传给公司、训练选项有限、结果往往无法复现。另外，你的工作流文件、种子和模型版本也是作业二中AI使用情况的记录，请务必保存。

## 69. Content authenticity [CMU 16-726 L20]

Our last practice block starts with provenance. Content authenticity means proving what is real: recording how an image was captured, how it was edited, and how it was published and shared. The Content Authenticity Initiative, linked here, is one effort to attach this record to images. For your own work, this is the public version of documenting your AI use — the same idea as saving your workflow file. We'll come back to provenance in Week 9.

中文讲解：最后一个实践单元从"来源证明"开始。内容真实性意味着证明什么是真的：记录图像如何拍摄、如何编辑、如何发布与传播。内容真实性倡议（Content Authenticity Initiative）就是为图像附上这种记录的一项努力。对你们的创作而言，这是AI使用记录的公开版本，与保存工作流文件是同一个思路。第九讲会再讨论。

## 70. Biases [CMU 16-726 L20]

And finally, bias. Why does this belong in a lecture about customization? Because every base model's defaults come from someone else's dataset. When you prompt without customizing, you inherit those defaults. Fine-tuning on your own images is one of the ways artists can push back against them.

中文讲解：最后谈偏见。为什么它属于关于定制的一讲？因为每个基础模型的默认设定都来自别人的数据集。不做定制直接提示，就继承了这些默认设定；用自己的图片微调，是艺术家对抗这些默认设定的方式之一。

## 71. Danger and ethical concerns: PULSE (1) [CMU 16-726 L20]

Here's a well-known example from 2020. PULSE was a face super-resolution system: it takes a very low-resolution, pixelated face, like this input image, and searches a generative model for a sharp face that matches it when shrunk down. It produces a convincing, detailed face. The question is: where do those details come from? They can't come from the input, because the input doesn't contain them. They come from the model's training data.

中文讲解：一个2020年的著名例子：PULSE是人脸超分辨率系统，输入一张分辨率很低、像素化的人脸，在生成模型中搜索一张缩小后与之匹配的清晰人脸，生成逼真细致的面孔。问题是：这些细节从哪里来？不可能来自输入，因为输入中没有这些信息——它们来自模型的训练数据。

## 72. Danger and ethical concerns: PULSE (2) [CMU 16-726 L20]

And here is what that means in practice. The input is a pixelated photo of Barack Obama. The output is a white man. The system tended to turn faces of people of colour into white faces. The lesson isn't that one research system was flawed. It's that any generative model, asked to fill in missing information, will fill it in with what was most common in its training data. And that includes the models you're using for your films.

中文讲解：实际后果：输入是奥巴马的像素化照片，输出却是一名白人男性。该系统倾向于把有色人种的面孔变成白人面孔。教训不是某个研究系统有缺陷，而是任何生成模型在补全缺失信息时，都会用训练数据中最常见的内容来填补——包括你们拍电影时使用的模型。

## 73. Bias in GAN models [CMU 16-726 L20]

This study, by Maluleke and colleagues in 2022, looked at bias in GANs through the lens of race. They compared the racial composition of the training data with that of the generated images. They found that generative models can preserve or even amplify the imbalance in their training data — they don't just copy it.

中文讲解：Maluleke等人2022年的研究从种族角度考察GAN中的偏见，比较训练数据与生成图像的种族构成，发现生成模型会保留甚至放大训练数据中的不平衡，而不仅仅是复制它。

## 74. The truncation trick reduces diversity [CMU 16-726 L20]

One reason is shown here: the truncation trick. It's a common setting that improves image quality by pulling samples towards the average. But pulling towards the average also reduces diversity, and the pie charts show the majority group growing as truncation increases. A technical setting that looks purely about quality turns out to have a social effect.

中文讲解：原因之一是"截断技巧"：一种通过把样本拉向平均值来提升图像质量的常用设置。但拉向平均值也会减少多样性——饼图显示，随着截断增强，多数群体的比例越来越高。一个看似只关乎质量的技术设置，产生了社会影响。

## 75. Bias in text-to-image models [CMU 16-726 L20]

And in text-to-image models: images for the word manager are mostly white men in suits, and images for Native Americans are mostly headdresses. Think back to the moongate at the start of tonight: whose culture is missing, or flattened, in your model? And could your own carefully built dataset correct it?

中文讲解：文生图模型中："经理"一词生成的图像大多是穿西装的白人男性，"美洲原住民"生成的大多是羽毛头饰。回想今晚开头的月洞门：你的模型中缺失或扁平化了谁的文化？你精心构建的数据集能否纠正它？

## 76. Quick fixes or long-term solutions? [CMU 16-726 L20]

Companies have tried quick fixes. For DALL-E 2, OpenAI changed how prompts are handled, so that a photo of a CEO produces a more diverse set of people. The slide ends with a good question: are these quick fixes, or long-term solutions? For artists, the long-term answer may partly lie in the techniques from tonight: building your own data, and shaping your own models.

中文讲解：公司尝试过快速修复：OpenAI为DALL-E 2调整了提示处理方式，使"CEO的照片"生成更多样的人群。幻灯片以一个好问题结尾：这是快速修复，还是长期解决方案？对艺术家来说，长期答案也许部分在于今晚的技术：构建自己的数据，塑造自己的模型。

## 77. Studio: propose a dataset of your own

Now it's your turn. We'll take twenty minutes for a studio exercise, and it's the starting point for Assignment 2, due on the thirty-first of October. Propose a dataset of your own. One: choose fifteen to twenty images that you made, or that you have the right to use — drawings, photos, stills from your A1 film. Two: decide whether you are teaching a subject, like a character or an object, or a style. Three: write one caption and choose a trigger word. What did you choose not to label? Four: name one image you left out, and why. Five: write one sentence on consent — whose work or likeness is in this set? I'll ask two or three of you to share at the end.

中文讲解：现在轮到你们：20分钟的工作室练习，也是作业二（10月31日截止）的起点。提出一个属于你自己的数据集：一、选15到20张你自己创作或有权使用的图片——素描、照片、作业一的画面；二、决定要教模型一个主体（角色或物件）还是一种风格；三、写一条图片说明并选一个触发词——你选择不标注什么？四、说出你排除的一张图片及原因；五、用一句话说明同意问题：这个数据集中包含了谁的作品或肖像？最后会请两三位同学分享。

## 78. Whose model is it — now?

Let's go back to where we started: whose model is it now? Three questions. First: if a LoRA is only a few megabytes on top of a model trained on billions of images, how much of the output is yours? Second: a model can learn Greg Rutkowski's style, and it can be made to forget it. Who should decide which? Third: would you share a LoRA of your own style, and on what terms? Let's do the show of hands again. Did anyone change their answer from the start of the evening? These three questions are also good material for your reflection in Quiz 5.

中文讲解：回到开头的问题：现在，模型属于谁？三个问题：一、如果LoRA只是训练于数十亿图像的模型之上的几MB，输出有多少属于你？二、模型可以学会Greg Rutkowski的风格，也可以被要求忘记它——应该由谁来决定？三、你会分享自己风格的LoRA吗？条件是什么？再举一次手，有没有人改变了开头的答案？这三个问题也适合用于小测五的反思题。

## 79. Three readings

Here are this week's three readings, following the same pattern as before: two perspectives and one technical reading. Reading one is a conversation between the artists Holly Herndon and Mat Dryhurst and the curator Hans Ulrich Obrist, in AnOther magazine, about art and AI and training only on consenting data. Reading two is a paper on how an arts university taught students to train their own models. Reading three is the technical one: Multi-Concept Customization of Text-to-Image Diffusion, the Custom Diffusion paper by Kumari and colleagues, which much of tonight's technical material comes from. Quiz 5 will be on the course site. And again: Assignment 1 is due tomorrow at 11:59 pm.

中文讲解：本周三篇阅读，延续"两种观点加一篇技术阅读"的模式。阅读一：艺术家Holly Herndon与Mat Dryhurst和策展人Hans Ulrich Obrist在AnOther杂志上关于艺术、AI以及只使用经同意数据进行训练的对话。阅读二：一篇关于艺术院校如何教学生训练自己模型的论文。阅读三：技术阅读，Kumari等人的Custom Diffusion论文《文生图扩散模型的多概念定制》，今晚大部分技术内容出自此文。小测五在课程网站上。再次提醒：作业一明晚11:59截止。

## 80. Credits and sources

Finally, credits. The technique slides tonight are adapted, with thanks, from Jun-Yan Zhu's CMU course 16-726, Learning-Based Image Synthesis, Lecture 16. The art and society slides are adapted from Lecture 20 of the same course, Visual Forensics and Societal Impacts. The figures come from the papers cited on each slide. The efficiency material draws on Song Han's MIT course. Thank you all. Good luck with Assignment 1 tomorrow, and see you next week, when we move into video: time, motion and cinematography.

中文讲解：致谢：今晚的技术幻灯片改编自朱俊彦在卡内基梅隆大学的课程16-726《基于学习的图像合成》第16讲；艺术与社会部分改编自同一课程第20讲《视觉取证与社会影响》。图片来自各幻灯片所引用的论文，效率部分参考了韩松的MIT课程。谢谢大家，祝作业一顺利，下周我们进入视频：时间、运动与电影语言。
