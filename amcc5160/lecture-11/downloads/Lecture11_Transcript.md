# AMCC 5160 · Lecture 11 transcript

The Semester in One Evening: a review of Lectures 01–10 · 10 November 2026

## 1. The Semester in One Evening

Good evening, and welcome to Week 11. This is our last lecture before the final presentations, so tonight I won't add anything new. We'll look back instead. For ten weeks we've moved fast: neurons, diffusion, editing, customization, minute-long video, sound, avatars, worlds, robots, and critique. Tonight we connect them. For about an hour I'll take you back through the semester along four threads, and on most slides you'll see small pictures of the original slides from earlier lectures, with the lecture and slide number. Those are your study links: every one of them is clickable on the course website. After the break we have the last weekly presentations.

欢迎来到第十一周。这是期末展示前的最后一讲，今晚不讲新内容，而是回顾。十周里我们讲了神经网络、扩散、编辑、定制、一分钟视频、声音、数字人、世界模型、机器人和评论。今晚用大约一小时，沿四条主线把它们串起来。大多数幻灯片上都有之前课程原始幻灯片的小图，标着第几讲第几页，网站上都可以直接点开复习。休息之后是最后一轮每周展示。

Revisit: L01 · 1 (How machines learn to make moving worlds), L03 · 1 (Inside the generator), L05 · 1 (Making the Model Yours), L07 · 1 (What's New in AI Motion), L08 · 1 (When AI Video Learned to Talk), L09 · 1 (Worlds You Can Walk Into, Robots That Learn by Watching)

## 2. Tonight: one hour, four threads

Here's the plan. Five minutes to lay the whole semester on one line. Then four threads, each about ten to thirteen minutes. Thread one: how a generator works. Thread two: control, which means editing and making a model your own. Thread three: time, which takes us through minute-long video, sound, live characters and worlds. Thread four: judgment, meaning how we look, measure, show and sign. We finish with a ten-minute game and a checklist for your final presentation. One request: keep a pen out. On several slides I'll ask you to diagnose something before I give the answer.

今晚的安排：五分钟把整个学期放在一条线上；然后四条主线，每条十到十三分钟。主线一：生成器怎么工作。主线二：控制，也就是编辑和把模型变成你的。主线三：时间，包括长视频、声音、实时角色和世界。主线四：判断，怎么看、怎么量、怎么展示、怎么署名。最后十分钟做个小游戏，并给期末展示一张清单。请准备好笔，有几页我会先让你们诊断再给答案。

## 3. Ten Tuesdays on one line

Here are ten Tuesdays on one line, one sentence each. Week 1: a generated video is a learned prediction about change. Week 2: write the edit contract, meaning what changes, what stays and what adapts. Week 3: the model predicts and the sampler takes a step; seed, guidance and steps are different knobs. Week 4: video has two kinds of time, and the artist's intention comes first. Week 5: whose model is it? Week 6, Yaofu's talk: store less, using fewer bits per number. Week 7: the unit of AI video became the scene, and tools can vanish. Week 8: sound and picture share one clock, and we asked who the performer is. Week 9: add an action and video becomes a place. Week 10: is it AI, is it good, is it fair, is it allowed? If you can say these ten sentences and give an example for each, you're in good shape.

十个星期二，一句话一个。第1周：生成视频是对变化的学习预测。第2周：写编辑契约，改什么、保留什么、什么随之调整。第3周：模型预测，采样器走一步；种子、引导、步数是不同的旋钮。第4周：视频有两种时间，艺术意图在先。第5周：模型是谁的？第6周（Yaofu）：用更少的比特存储。第7周：AI视频的单位变成了场景，工具会消失。第8周：声音和画面共用一个时钟，表演者是谁？第9周：加入动作，视频就变成了地方。第10周：是AI吗？好吗？公平吗？允许吗？能说出这十句话并各举一例，就准备得不错了。

## 4. Four questions kept coming back

Looking back, almost every lecture answered one of four questions. How does it work? That was weeks 1, 3 and 4. How do I control it? Weeks 2 and 5. What happens over time, when a clip becomes a minute, gets a voice, or becomes a world you can walk in? Weeks 7, 8 and 9. And is it any good, and is it mine? That one ran under weeks 5, 8 and 10. These are tonight's four threads. Notice that the last question is the one you'll answer in front of the class on November 17 or 24.

回头看，几乎每一讲都在回答四个问题之一。它怎么工作？第1、3、4周。我怎么控制它？第2、5周。随着时间会发生什么：片段变成一分钟、有了声音、变成能走进去的世界？第7、8、9周。它好吗？它是我的吗？这一问贯穿第5、8、10周。这就是今晚的四条主线。最后一个问题，你们将在11月17日或24日的期末展示中亲自回答。

Revisit: L01 · 8 (Every generator can be read through four stages), L02 · 9 (The edit contract), L07 · 7 (The unit of AI video is now the scene), L10 · 13 (The most useful slide tonight: four questions people mix up)

## 5. How a generator works

Thread one: how a generator works. We built this in three passes. In Lecture 1 we went from a single neuron to video foundation models. In Lecture 3 we opened the generator and did the arithmetic by hand. In Lecture 4 we stretched it across time. Here's the goal for the next twelve minutes: you should be able to draw the pipeline of any model on a napkin and say where a given failure probably comes from.

主线一：生成器怎么工作。我们分三次搭起来：第1讲从单个神经元讲到视频基础模型；第3讲打开生成器，用手算；第4讲把它延伸到时间上。接下来十二分钟的目标：能在一张餐巾纸上画出任何模型的流程，并说出某个问题大概出在哪一步。

Revisit: L01 · 8 (Every generator can be read through four stages), L03 · 21 (The model predicts. The sampler takes a step.), L04 · 9 (A video has two kinds of time)

## 6. Every generator in four stages

This is the map from Lecture 1, and it held all semester. Data supplies examples. Representation decides what becomes compact and comparable: latents and tokens. The model learns relationships in that representation. Sampling turns what was learned into one particular output. The useful part is the debugging question. When a face drifts, ask which stage it is: missing data, a weak identity representation, too little temporal modelling, or an inference setting? And remember Lecture 4: data is never neutral. Filtering decides what reaches training, so a model's defaults reflect choices other people made.

这是第1讲的地图，整个学期都适用。数据提供例子；表示决定什么被压缩、可比较（潜变量和token）；模型在这个表示里学习关系；采样把学到的东西变成一个具体输出。最有用的是诊断问题：脸漂移了，是哪一步？缺数据、身份表示弱、时间建模不足，还是推理设置？也记住第4讲：数据从不中立，筛选决定了什么进入训练，所以模型的默认结果反映了别人的选择。

Revisit: L01 · 8 (Every generator can be read through four stages), L04 · 15 (Training data shapes the result), L04 · 16 (A closer look at data filtering)

## 7. Compress first, then create

Why do all these models work in a compressed space? Count. A ten-second clip at twenty-four frames per second is two hundred and forty frames before any sound. Attention compares every token with every other token, so cost grows with the square of length. Lecture 7's rule of thumb: six times the length means roughly thirty-six times the comparisons. So a video VAE squeezes space and time first. MiniMax H3 reported sixteen times spatial and four times temporal compression, and then groups the latent into patch tokens, small blocks of space-time. Bigger patches are cheaper but lose fine motion and text. That trade-off decided which details survived in your Assignment 1 films.

为什么这些模型都在压缩空间里工作？算一算：十秒、每秒24帧，就是240帧，还没算声音。注意力让每个token和所有token比较，成本随长度平方增长；第7讲的经验法则：长度六倍，比较次数约三十六倍。所以视频VAE先压缩空间和时间，MiniMax H3报告空间16倍、时间4倍压缩，再切成时空小块token。块越大越便宜，但会丢细微运动和文字。这个取舍决定了你们作业一里哪些细节留了下来。

Revisit: L01 · 43 (Time adds another expensive axis), L01 · 44 (Compress space and time before the transformer), L07 · 9 (Why five seconds was the limit)

## 8. Learn to remove noise, then learn how to move

Now the core idea from Lecture 3, with the numbers we did by hand. Training adds noise to a clean image: a weighted clean value plus weighted noise. With a clean value of point eight, noise of minus point two, and weights point six and point eight, we got point three two. The network learns to predict the noise, or, in flow matching, the direction of movement from noise to data: the target minus the starting noise. At generation time there is no target. We follow the learned directions. And keep the division of labour from Lecture 3: the model predicts, the sampler takes the step. Change the sampler and the same network can give a different picture.

第3讲的核心，用我们手算过的数字。训练时给干净图像加噪：干净值加权加噪声加权。干净值0.8、噪声-0.2、权重0.6和0.8，结果是0.32。网络学会预测噪声，或者在流匹配里预测从噪声到数据的方向：目标减起点噪声。生成时没有目标，只是沿着学到的方向走。记住分工：模型负责预测，采样器负责走一步。换采样器，同一个网络也可能给出不同的图。

Revisit: L03 · 13 (Clean image plus noise), L03 · 44 (Flow matching: learning how to move), L03 · 21 (The model predicts. The sampler takes a step.)

## 9. Attention: every token chooses what matters

The second engine part is attention. Each token makes a query, a key and a value. Queries ask, keys match, values contribute, and the softmax weights sum to one. In Lecture 1 the example was a red scarf: a token in frame twenty can attend to the tokens that carried the scarf earlier. Cross-attention is how words reach image regions, which is why Lecture 5's Custom Diffusion only fine-tuned the key and value projections of cross-attention and still learned a new concept. In Lecture 4 we split it into spatial attention within a frame and temporal attention across frames. One warning from that lecture still matters: attention connects features, but it doesn't guarantee understanding.

第二个部件是注意力。每个token生成query、key、value：query提问，key匹配，value贡献，softmax权重之和为一。第1讲的例子是红围巾：第20帧的token可以关注之前带着围巾的token。交叉注意力让文字作用到图像区域，所以第5讲的Custom Diffusion只微调交叉注意力的key和value，就能学会新概念。第4讲把它分成帧内的空间注意力和跨帧的时间注意力。那一讲的提醒仍然重要：注意力连接特征，但不保证理解。

Revisit: L01 · 26 (Queries ask; keys match; values contribute), L04 · 12 (Spatial attention and temporal attention), L05 · 34 (Only fine-tune cross-attention layers)

## 10. Three knobs, three different jobs

These are the three knobs you touched in every assignment. The seed is an address into a repeatable random process, not an instruction. Seed forty-two doesn't mean wide shot. To repeat a result, save the whole workflow, not just the seed. Guidance pushes past the prompted prediction: unconditioned plus scale times the difference. With predictions of two and three, a scale of four gives six, outside the range. That's why strong guidance burns colours and makes samples look alike. Steps set how accurately you follow the learned field, not whether the field is right. Fifty steps won't fix a wrong hand. And a distilled model trained for one to four steps is a different system, not a slow model stopped early.

这是每次作业都碰到的三个旋钮。种子是可重复随机过程的地址，不是指令，42号种子不代表远景；要复现结果，保存整个工作流，而不只是种子。引导会越过有条件预测：无条件加上尺度乘以差值。预测值2和3，尺度4得到6，超出了范围，所以强引导会让颜色过饱和、样本趋同。步数决定你沿学到的场走得多准，不决定场本身对不对，50步修不好错的手。为一到四步蒸馏训练的模型是另一个系统，不是提前停下的慢模型。

Revisit: L03 · 48 (Different seeds can give different pictures), L03 · 54 (A small guidance calculation), L03 · 64 (Some models need only a few steps)

## 11. Diagnose it: which knob, or no knob at all?

Pen out. Four symptoms from real student logs this term. One: same prompt, but every run gives a completely different composition. Two: the subject is unmistakable, but colours are burnt and every sample looks the same. Three: the result is fine, but it takes forty seconds and you need it live in a gallery. Four: a character's face changes after she turns away and turns back. For each one, write down which knob you'd touch, or whether it isn't a knob at all. Thirty seconds. Then compare with your neighbour.

拿出笔。四个症状，来自本学期同学的记录。一：同一个提示词，每次构图完全不同。二：主体非常明显，但颜色过饱和，每个样本都一样。三：效果可以，但要40秒，而你需要在展厅里实时运行。四：角色转身再转回来，脸变了。每个写下你会调哪个旋钮，或者它根本不是旋钮问题。三十秒，然后和旁边同学对一下。

Revisit: L03 · 58 (Discussion 3: Clear subject, wrong mood), L07 · 22 (Test it yourself: does she come back the same?)

## 12. Diagnosis: three knobs and one memory problem

Here are the answers. A is the seed: fix it for comparisons and record the whole workflow; use references when you need a particular layout. B is guidance set too high: lower the scale and compare across the same list of seeds, changing one variable at a time, as Lecture 1 asked. C is cost: a distilled model, fewer steps, quantization from Yaofu's talk, or a smaller resolution, and you measure seconds, not step counts. D is the trick question. It isn't a knob. It's memory over time: the representation and the context window. That's Thread 3, where the same problem shows up in long video, in world models and in robots.

答案。A是种子：比较时固定它，记录完整工作流；需要特定构图就用参考图。B是引导太高：降低尺度，在同一组种子上比较，一次只改一个变量，正如第1讲要求的。C是成本：蒸馏模型、更少步数、Yaofu讲的量化，或降低分辨率，并且要测秒数而不是步数。D是陷阱题：不是旋钮问题，是时间上的记忆，即表示和上下文窗口。这是主线三，同一个问题出现在长视频、世界模型和机器人中。

Revisit: L03 · 49 (How to repeat a result), L03 · 63 (Generation cost: count model evaluations), L09 · 19 (Under the hood: why the world must come back the same)

## 13. Control: editing and making it yours

Thread two: control. In Lecture 2 we edited a ceramic pear through a gallery, a forest and a moving camera. In Lecture 5 we went one level deeper and changed the model itself. One idea links them: before you touch a tool, say what information is missing. Then choose the control that carries that information, and check that the output actually respected it.

主线二：控制。第2讲我们编辑一只陶瓷梨，从展厅到森林再到移动镜头。第5讲更深一层，直接改变模型本身。连接两者的是一个想法：动工具之前，先说清楚缺的是什么信息，然后选择能传达这个信息的控制方式，再检查输出是否真的遵守了它。

Revisit: L02 · 9 (The edit contract), L02 · 30 (ControlNet: add spatial conditioning), L05 · 24 (DreamBooth: fine-tuning all the weights)

## 14. The edit contract: change, keep, adapt

Remember the pear. The gallery becomes a forest. The edit contract had three columns. Change: the environment. Keep: the pear's identity, its pedestal, the framing. Adapt: the light and the reflections, because a bright gallery window reflected in a dark forest would be faithful and wrong. Then Lecture 2's subtle point: "keep it the same" has two meanings. Semantic sameness means a visitor recognizes the same sculpture. Exact sameness means identical pixels in a region, and only copying or compositing can promise that. Write this contract before you generate, and check each column separately afterwards. It works for a still image, a video shot, and a game asset in Assignment 3.

还记得那只梨吗？展厅变成森林。编辑契约有三栏。改变：环境。保留：梨的身份、底座、构图。调整：光线和反射，因为在黑暗森林里保留明亮展厅窗户的倒影，忠实却是错的。第2讲还有一个细节：“保持不变”有两种意思。语义上相同，观众认出是同一件雕塑；精确相同，某区域像素完全一样，只有复制或合成才能保证。生成前写好契约，生成后逐栏检查。静态图、视频镜头、作业三的游戏素材都适用。

Revisit: L02 · 9 (The edit contract), L02 · 10 (An invariant can be semantic or exact)

## 15. Choose a control by the information that is missing

Here's Lecture 2's rule as a table. Text says what should change. A mask says where change is allowed, though it won't fix seams or reflections on its own. A spatial condition, meaning edges, depth or pose through ControlNet, says what shape or structure to follow. ControlNet keeps the pretrained path frozen and adds a trainable copy joined by zero-initialized convolutions. A reference image, through IP-Adapter, carries appearance that words can't describe precisely, instantly but less faithfully. And when a concept has to recur across many shots, you adapt the weights with LoRA or DreamBooth. The mistake to avoid is adding adjectives when the missing information is spatial.

第2讲的规则做成表。文字说明改什么；遮罩说明哪里允许改，但它本身不解决接缝和反射；空间条件（ControlNet的边缘、深度、姿态）说明要遵循的形状结构，ControlNet冻结原模型，加一个由零初始化卷积连接的可训练副本；参考图（IP-Adapter）传达文字说不清的外观，即时但不够忠实；概念需要在多个镜头中反复出现时，就用LoRA或DreamBooth调整权重。要避免的错误：缺的是空间信息，却还在加形容词。

Revisit: L02 · 29 (Different controls carry different information), L02 · 30 (ControlNet: add spatial conditioning), L05 · 64 (Image Prompt Adapter (IP-Adapter))

## 16. Making the model yours: what actually gets trained?

Lecture 5 in one table: the key question is what gets trained. Textual Inversion keeps the whole model frozen and learns one new word, an embedding. It's good for styles and weak on identity. DreamBooth fine-tunes all the weights and preserves identity best, but it overfits, so you regularize with images of the general class. Custom Diffusion trains only the key and value projections in cross-attention, so the update is small and concepts combine. LoRA adds a thin overlay of two skinny matrices: for a 4096 by 4096 layer at rank sixteen, that's about 131 thousand numbers instead of 16.8 million. IP-Adapter trains nothing per subject; an encoder turns your reference into a visual prompt. The rule of thumb from that night: a style can live in a word, but a character who must stay the same across shots needs a change to the weights.

第5讲一张表：关键是训练了什么。Textual Inversion冻结整个模型，只学一个新词（嵌入），适合风格，身份保持弱。DreamBooth微调全部权重，身份保持最好，但会过拟合，需要用同类别图像正则化。Custom Diffusion只训练交叉注意力的key和value，更新小，概念能组合。LoRA加一层由两个窄矩阵组成的薄层：4096×4096的层、秩16，约13.1万个数，而不是1678万。IP-Adapter不针对主体训练，编码器把参考图变成视觉提示。那晚的经验：风格可以放在一个词里，但要跨镜头保持同一个角色，就需要改权重。

Revisit: L05 · 27 (DreamBooth vs. Textual Inversion), L05 · 61 (Low-rank adaptation (LoRA)), L02 · 35 (LoRA: low-rank adaptation)

## 17. A video edit must survive the next frame

Then the edit has to move. In Lecture 2's third part, a video edit has to keep its promises in the next frame. Three lessons. Consistency isn't stillness: the stem may hide during a turn, but it shouldn't change colour without a reason. Four good frames can hide a bad video, so a contact sheet is publicity stills, not the performance, and you review full playback around turns and occlusions. And the frozen video wins the wrong test: a naive frame-difference score prefers a video that never moves. That was our first meeting with a metric that rewards the wrong thing. Keep it in mind, because Thread 4 is built on it.

编辑还要动起来。第2讲第三部分：视频编辑要在下一帧继续兑现承诺。三点：一致不等于静止，转身时梗可以被挡住，但不该无故变色；四张好帧可以掩盖一段坏视频，联系表只是剧照，不是表演，要完整播放，重点看转身和遮挡；静止的视频赢了错误的测试，简单的帧差分数会偏爱不动的视频。这是我们第一次遇到奖励错误东西的指标，记住它，主线四就建立在这上面。

Revisit: L02 · 76 (Consistency is not stillness), L02 · 80 (Four good frames can hide a bad video), L02 · 94 (The frozen video wins the wrong test)

## 18. Whose model is it?

Lecture 5 began with a show of hands, and I asked you to remember where you put your hand. A foundation model has seen billions of images by millions of people. You add twenty of yours and fine-tune it. Whose work is the output: the company's, yours, or the people in the training data? That night we saw how memorized images are found, how a living artist's style becomes a prompt word, and how concept ablation can make a model forget Greg Rutkowski while keeping the boat and the water. Hold your answer. We'll come back to it in Thread 4 with consent, and you'll need it for your credit block.

第5讲开头举过手，我请你们记住手举在哪里。基础模型看过数百万人的数十亿张图，你加二十张自己的图微调，输出是谁的作品：公司的、你的，还是训练数据里那些人的？那晚我们看到如何发现被记忆的图像、在世艺术家的风格如何变成提示词、概念消除如何让模型忘掉Greg Rutkowski却保留船和水。先留着你的答案，主线四讲同意时再回来，你的署名块也需要它。

Revisit: L05 · 3 (Whose model is it?), L05 · 30 (Memorized style), L05 · 54 (Ablating Greg Rutkowski (1))

## 19. Time: minutes, voices, worlds

Thread three: time. These three lectures felt like three different subjects: long video and dance in Lecture 7, sound and live avatars in Lecture 8, worlds and robots in Lecture 9. They're one subject. Each time, a model has to keep producing the next moment while staying consistent with everything before it, often under a real-time budget. So in this thread I'll show you one problem and one toolkit that kept coming back.

主线三：时间。这三讲看起来是三个话题：第7讲的长视频和舞蹈，第8讲的声音和实时数字人，第9讲的世界和机器人。其实是同一个话题：模型要不断生成下一刻，同时与之前的一切保持一致，而且常常有实时预算。所以这条主线我要讲一个反复出现的问题和一套反复出现的工具。

Revisit: L07 · 16 (Helios: a minute of video, in real time), L08 · 19 (Inside LTX-2: two streams, one clock), L09 · 17 (Genie at play time: three parts in a loop)

## 20. From the shot to the scene

Lecture 7 in four numbers. In 2024 a typical clip was about five seconds. Early this year Seedance 2.0 reached about fifteen. By summer, Seedance 2.5, Wan 3.0 and Kling 4.0 were at thirty seconds in one pass, long enough for an entrance, an exchange and an exit. And Helios, an open research model, made about a minute at about nineteen and a half frames per second on one H100, close to real time. There were two routes: denoise all frames at once, which is consistent but expensive, or write forward in time, autoregressively, like a language model writes words, which can stream but has to fight drift. The question we asked was what the director's job becomes when one generation is a whole scene.

第7讲的四个数字：2024年典型片段约5秒；今年初Seedance 2.0约15秒；到夏天，Seedance 2.5、Wan 3.0、Kling 4.0一次生成30秒，够一个进场、一段交流、一个退场；开源研究模型Helios在一块H100上以约每秒19.5帧生成约一分钟，接近实时。两条路线：所有帧一起去噪，一致但贵；或者像语言模型写字一样按时间向前自回归，可以流式但要对抗漂移。我们当时问：一次生成就是一整场戏时，导演做什么？

Revisit: L07 · 7 (The unit of AI video is now the scene), L07 · 10 (Two ways to make a long video), L07 · 16 (Helios: a minute of video, in real time)

## 21. Drift: one problem in three costumes

This is the slide I most want you to remember tonight. In Lecture 7, long video drifts: the model trains on perfect previous frames but generates from its own imperfect ones. That's the train-test gap, or exposure bias. Self Forcing trains on its own rollouts, and Helios shows the model drifted video on purpose. In Lecture 9, a world model forgets: turn away from the red door, turn back, and it's blue. Genie 3 holds about a minute of visual memory. Also in Lecture 9, a robot copying an expert makes a small error, lands somewhere the expert never went, and makes a bigger one. It's the same shape three times: you train on clean data and then live on your own mistakes. The fixes rhyme too: train on your own outputs, keep a memory, and practise.

今晚我最希望你们记住这一页。第7讲：长视频漂移，模型用完美的前一帧训练，却用自己不完美的帧生成，这就是训练-测试差距（暴露偏差）；Self Forcing用自己的生成结果训练，Helios故意给模型看漂移的视频。第9讲：世界模型会忘记，转身再转回来，红门变蓝了，Genie 3的视觉记忆约一分钟。还是第9讲：模仿专家的机器人犯一个小错，到了专家没去过的地方，犯更大的错。同一个形状出现三次：在干净数据上训练，却生活在自己的错误里。解决办法也押韵：用自己的输出训练、保持记忆、练习。

Revisit: L07 · 21 (Under the hood: the train-test gap), L09 · 19 (Under the hood: why the world must come back the same), L09 · 48 (Under the hood: small mistakes compound)

## 22. The real-time toolkit, gathered from four lectures

And here's the toolkit that kept coming back. Change less: adapters like LoRA. Step less: distillation, a student that jumps where the teacher would land. Helios went from about fifty steps to three, and TalkingMachines from twenty-four model evaluations to two. Store less: quantization, Yaofu's Week 6 talk, eight or four bits per number. Remember smartly: generate in chunks, look only backwards, and keep a KV cache so the past isn't recomputed. Why it matters: at twenty-five frames per second you have forty milliseconds per frame, and in conversation people expect a reply in about two hundred milliseconds. Lecture 9 added the payoff: Gaussian splats went from about 0.07 to over a hundred frames per second. Speed changes what something is.

这是反复出现的工具箱。改得更少：LoRA等适配器。走得更少：蒸馏，学生直接跳到老师会到的地方；Helios从约50步到3步，TalkingMachines从24次模型计算到2次。存得更少：量化，第6周Yaofu的讲座，每个数用8位或4位。聪明地记忆：分块生成、只往回看、保留KV缓存，不重算过去。为什么重要：每秒25帧，每帧只有40毫秒；对话中人们期待约200毫秒内回应。第9讲的回报：高斯泼溅从约每秒0.07帧到100帧以上。速度改变了东西的性质。

Revisit: L05 · 67 (Smaller changes, fewer steps, smaller numbers), L07 · 15 (Under the hood: the KV cache), L08 · 65 (Three tricks you already know)

## 23. Sound shares the clock

Lecture 8 started with film theory. Michel Chion's synchresis: when a sound and an image happen at the same instant, your brain welds them into one event. That's why Foley works and why bad lip-sync hurts. Then the architecture. There are four ways to wire sound and picture: picture first, sound first, two towers, or one sequence. LTX-2 uses two towers: a fourteen-billion-parameter video stream and a five-billion audio stream that look at each other in every block using only time positions, so a token at two seconds attends to audio at two seconds. That shared clock is the whole trick. And the fastest human quality check: watch p, b and m, where the lips must close.

第8讲从电影理论开始：Michel Chion的“同步融合”，声音和画面同时发生，大脑就把它们焊成一个事件，所以拟音有效，糟糕的口型同步让人难受。然后是架构：声音和画面有四种接法，先画后声、先声后画、双塔、单一序列。LTX-2是双塔：140亿参数的视频流和50亿参数的音频流在每个块里互相关注，只用时间位置，两秒处的视频token关注两秒处的音频。共享时钟就是全部诀窍。最快的人工检查：看p、b、m，嘴唇必须闭合。

Revisit: L08 · 6 (Synchresis: why sound is half the picture), L08 · 19 (Inside LTX-2: two streams, one clock), L08 · 41 (Sounds you can see: phonemes → visemes)

## 24. Generate the small thing, render the big thing

Here's a pattern that showed up in three lectures without being named. VASA-1 doesn't generate pixels for a talking face. It generates a tiny motion code for head pose and expression, then renders frames from your photo, which is why it runs at forty frames per second. Genie learned actions nobody labelled by squeezing the change between two frames into one of only eight codes, which turned out to mean left, right and jump. Gaussian splats put soft blobs only where something exists instead of asking a network about empty air. In each case the creative and technical win came from choosing what to represent. When your own project is too slow or unstable, ask what the small thing is.

这个模式在三讲中出现过，但没有命名。VASA-1不为说话的脸生成像素，它生成一个很小的运动编码（头部姿态和表情），再从你的照片渲染帧，所以能达到每秒40帧。Genie把两帧之间的变化压缩到仅八个代码之一，学会了没人标注的动作，结果对应左、右、跳。高斯泼溅只在有东西的地方放柔和的小球，而不是向网络询问空气。每次的创意和技术突破都来自选择表示什么。你的项目太慢或不稳定时，问问：那个“小东西”是什么？

Revisit: L08 · 47 (How VASA-1 works: generate motion, not pixels), L09 · 16 (Under the hood: where do the actions come from?), L09 · 34 (Under the hood: only put stuff where stuff is)

## 25. Add an action, and video becomes a place

Lecture 9's one-line definition, from CMU: a world model takes the state of the world and an action, and predicts the next state. A video model answers "what happens next?" A world model answers "what happens next if I do this?" That one input turns film into game. Then two camps: draw the next frame, like Genie, which feels alive but forgets and gives you nothing to export, or build geometry and render it, like Marble or Atlas, which gives you a file you can open in Blender but is mostly static. Then robots: λ0 learned mostly from human video and reached 62.5 percent on four real tasks, against 40 for the strongest baseline. That's impressive, and also far from good enough for a home. Copying plateaus around eighty percent. Practice, meaning reinforcement learning, is how robots get past it.

第9讲CMU的一句话定义：世界模型输入世界状态和动作，预测下一个状态。视频模型回答“接下来会怎样”，世界模型回答“如果我这样做，接下来会怎样”。一个输入把电影变成游戏。两个阵营：画下一帧（如Genie），有生命感但会忘、没东西可导出；或者建几何再渲染（如Marble、Atlas），得到可在Blender打开的文件，但大多是静态的。机器人方面：λ0主要从人类视频学习，在四个真实任务上达到62.5%，最强基线是40%。令人印象深刻，但离家用还很远。模仿学习在约80%停滞，练习（强化学习）才能突破。

Revisit: L09 · 8 (What is a world model?), L09 · 27 (Pixels or geometry? Two ways to make a world), L09 · 53 (λ0, by the numbers)

## 26. Tools vanish. Keep your sources.

The last stop in this thread is about time in a different sense: how long your work survives. Sora became a product in December 2024. OpenAI announced its shutdown in March, the app closed in April, and the API was switched off on September 24th. It lasted about eighteen months as a product. So, from Lecture 7: keep your sources, not just your outputs. One folder per project, with a README that gives the model, version, date and settings, plus folders for prompts, references with credits, raw generations including the interesting failures, and the edit. Pin versions: the exact model ID and, for open weights, the commit hash. This isn't busywork. It's half your A2 report, and it's the evidence for your final presentation.

这条主线的最后一站，讲另一种意义上的时间：你的作品能活多久。Sora于2024年12月成为产品，OpenAI今年3月宣布关闭，4月关闭应用，9月24日关闭API，作为产品存在约十八个月。所以第7讲说：保存来源，而不只是输出。每个项目一个文件夹：README写模型、版本、日期、设置；prompts、带署名的refs、包括有趣失败的raw、edit文件夹。锁定版本：准确的模型ID，开源权重记下commit哈希。这不是杂务，它是作业二报告的一半，也是期末展示的证据。

Revisit: L07 · 59 (Eighteen months as a product), L07 · 65 (A project folder that survives), L07 · 66 (Useful: pin your versions)

## 27. Judgment: looking, measuring, signing

Thread four: judgment. Last week was the explicit lecture, but you were circling this question from Lecture 2 on. In Lecture 4 I said a technical score answers only a narrow question. In Lecture 5 we asked whose model it is. In Lecture 8 a model beat real video on a lip-sync score. Tonight we put those pieces in one place, because your final presentation is, in the end, an argument that your work is good and that it's honestly yours.

主线四：判断。上周是专门讲这个的，但从第2讲开始我们就一直在绕着这个问题：第4讲说技术分数只回答一个狭窄的问题；第5讲问模型是谁的；第8讲一个模型在口型同步分数上胜过了真实视频。今晚把这些放在一起，因为你的期末展示归根结底是一个论证：你的作品是好的，而且诚实地属于你。

Revisit: L10 · 13 (The most useful slide tonight: four questions people mix up), L10 · 31 (Worked example: the copycat gets a perfect score), L10 · 65 (Under the hood: C2PA in four steps)

## 28. Four questions people mix up

Last week's most useful slide, with the whole semester mapped onto it. Is it AI? That's fact, answered with evidence: credentials, watermarks, the maker's log. Is it good? Judgment, answered by looking and arguing. No machine settles it, and Lecture 4 already warned that a score answers a narrow question. Is it fair? Ethics: whose data, whose consent, whose likeness, whose job. That was Lectures 5, 8 and 9. Is it allowed? Law, and it differs by country and by festival: the lawsuits in Lecture 5, the SAG-AFTRA contract in Lecture 8, the EU's Article 50 last week. Most online fights happen because someone asks question two and someone else answers question three. In your final presentation, say which question you're answering.

上周最有用的一页，加上整个学期的对应。是AI吗？事实问题，用证据回答：凭证、水印、创作者的记录。好吗？判断问题，靠观看和论证，没有机器能裁定，第4讲已提醒分数只回答狭窄的问题。公平吗？伦理问题：谁的数据、谁的同意、谁的肖像、谁的工作，即第5、8、9讲。允许吗？法律问题，因国家和电影节而异：第5讲的诉讼、第8讲的SAG-AFTRA合同、上周的欧盟第50条。网上大多数争吵是因为有人问第二个问题，别人回答了第三个。期末展示时，请说明你在回答哪个问题。

Revisit: L10 · 13 (The most useful slide tonight: four questions people mix up), L04 · 44 (A technical score answers a narrow question)

## 29. Every score we met, and its trap

Here's every score we met this term on one slide, each with its trap. Raw frame difference, Lecture 2: the frozen video wins. PSNR and SSIM, Lecture 10: an image shifted by eight pixels, which you can't tell from the original, scores worse than a wrecked JPEG. FID: it judges a crowd, never one image, and a copycat that replays its training set scores a perfect zero. Sync-C and Sync-D, Lecture 8: Wav2Lip scored better than real video, because it was trained against that judge. The LAION aesthetic score: Vera Molnár's plotter drawing fell below the training cut-off. Elo: a 43-point gap between first and tenth is about 56 percent of votes, nearly a coin flip. The common law is Goodhart's: when a measure becomes a target, it stops being a good measure. So use scores to compare versions of your own pipeline, and never let one pick your work for you.

本学期遇到的所有分数和它们的陷阱。原始帧差（第2讲）：静止视频获胜。PSNR和SSIM（第10讲）：平移8像素、肉眼无法分辨的图，得分比严重压缩的JPEG还差。FID：评判一群图而不是一张，只复述训练集的抄袭者得到完美的0。Sync-C/Sync-D（第8讲）：Wav2Lip分数超过真实视频，因为它就是对着这个评委训练的。LAION美学分：Vera Molnár的绘图仪作品低于训练门槛。Elo：第一和第十相差43分，约56%的票，几乎是抛硬币。共同规律是古德哈特定律：指标一旦成为目标，就不再是好指标。用分数比较你自己流程的不同版本，但别让它替你挑作品。

Revisit: L02 · 94 (The frozen video wins the wrong test), L08 · 44 (Reading the scoreboard (and its trap)), L10 · 31 (Worked example: the copycat gets a perfect score)

## 30. Look before you judge

So if scores can't decide, how do you judge? With methods. See, Think, Wonder from Harvard's Project Zero: what do you see, only facts; what do you think about it; what does it make you wonder? Liking comes last. Feldman's four steps: describe, analyze, interpret, and only then judge. We did it on Edmond de Belamy. And the four questions from Eryk Salvaggio's reading, made for AI images: what's here too often, what's missing, where does it break, and most important for you as makers, what did the artist fight? Which part goes against the default? That's where your authorship lives, and it's what the panel will look for on the 17th and 24th.

如果分数不能决定，怎么判断？用方法。哈佛Project Zero的“看-想-疑”：看到什么，只说事实；你怎么想；它让你好奇什么？喜欢放在最后。Feldman四步：描述、分析、解释，最后才评判，我们用《Edmond de Belamy》练过。Eryk Salvaggio读物中为AI图像设计的四个问题：什么出现得太多？缺了什么？哪里崩坏？对创作者最重要的是：艺术家对抗了什么？哪部分违背了默认？那就是你的作者身份所在，也是17日和24日评审要看的。

Revisit: L10 · 17 (See. Think. Wonder.), L10 · 18 (A critic’s four steps, on a work you know: Edmond de Belamy), L10 · 20 (How to read an AI image: four questions to add to your crit)

## 31. Consent has layers

Here's the fairness question, gathered from four lectures. Consent has layers, and one answer rarely covers all of them. The training data: Lecture 5's lawsuits and memorized images, and the second layer at Madison, the billions of images behind the model, which no single museum can answer for. Likeness: Lecture 8's Tilly Norwood, and the 2026 SAG-AFTRA contract requiring informed consent and fair pay for digital replicas, including for actors who have died. Places and bodies: Lecture 9 asked who owns the scan of a place, and whose homes become robot training data. And the collection: Madison could answer this layer, because it had the rights to the works on screen. When you write the consent line in your credits, say which layers you can answer.

公平问题，汇总自四讲。同意有很多层，一个回答很少能覆盖全部。训练数据：第5讲的诉讼和被记忆的图像，以及麦迪逊案中的第二层，模型背后的数十亿张图，没有哪家博物馆能替它回答。肖像：第8讲的Tilly Norwood，2026年SAG-AFTRA合同要求数字复制品须知情同意并公平付费，包括已故演员。地方与身体：第9讲问谁拥有一个地方的扫描、谁的家成为机器人训练数据。藏品：麦迪逊能回答这一层，因为它拥有屏幕上作品的权利。在署名中写同意说明时，说清楚你能回答哪几层。

Revisit: L05 · 16 (Ongoing legal battles (1)), L08 · 88 (What the actors won: the 2026 SAG-AFTRA contract), L10 · 53 (Two layers of consent, and the museum answered one)

## 32. Sign your work, and don't apologise

And finally, signing. There are three layers with three different promises. A visible label promises only that someone told you. Signed metadata, C2PA, hashes the file, writes a claim, signs it and embeds it. It's tamper-evident, because our edited file read as invalid, but stripping it takes one line of code: a re-save, a screenshot, a resize. So a credential proves a lot when it's there, and its absence proves nothing. The pixel watermark is the third layer. The EU's art exception says you must still disclose, but in a way that doesn't spoil the work, so end credits can be enough. Then use the credit block. It counts your human work: forty-one attempts, six selected, edit and grade. It should read like a statement of what you did, not an apology.

最后是署名。三层，三种不同的承诺。可见标签只承诺有人告诉了你。签名元数据C2PA：哈希文件、写声明、签名、嵌入；它能显示篡改（我们改过的文件显示无效），但去掉它只需一行代码：重新保存、截图、缩放。所以凭证在时能证明很多，不在时什么也证明不了。像素水印是第三层。欧盟的艺术例外：仍须披露，但方式不应妨碍作品，片尾字幕可能就够了。然后用署名块，数出你的人工工作：41次尝试、选6个、剪辑调色。它读起来应该像作品说明，而不是道歉。

Revisit: L10 · 64 (Under the hood: three layers, three different promises), L10 · 67 (We broke it four ways, in Python, in five minutes), L10 · 73 (Useful: a credit block you can copy for A2 and A3)

## 33. Four debates. Has your vote moved?

We held four debates this term. Lecture 7: if one generation is a whole thirty-second scene, what's the director's job? Lecture 8: should an AI performer who never existed be allowed to win an acting award? Lecture 9: a video generator is a world model. Lecture 10: you run the Madison museum; do you show Diffuse Control? Here's the exercise. Pick one. Write your vote from that night, then your vote now, and one piece of evidence from a different lecture that moved you or confirmed you. For example, Lecture 9's robot results could change how you think about the Lecture 8 performer debate. Two minutes, then I'll take three answers.

本学期四场辩论。第7讲：一次生成就是30秒一场戏，导演做什么？第8讲：从未存在的AI表演者能获表演奖吗？第9讲：视频生成器就是世界模型。第10讲：你是麦迪逊博物馆馆长，展不展《Diffuse Control》？练习：选一个，写下当晚的投票、现在的投票，以及来自另一讲的一条证据，说明它改变或确认了你。比如第9讲的机器人结果可能改变你对第8讲表演者辩论的看法。两分钟，然后请三位同学回答。

Revisit: L07 · 27 (If one generation is a whole 30-second scene, what is the director's job now?), L08 · 94 (Debate: “An AI performer that never existed should be allowed to win an acting award.”), L09 · 72 (A video generator is a world model.), L10 · 76 (Debate: you run the Madison museum. Do you show Diffuse Control?)

## 34. Game: which week said it?

Now a quick game. Eight sentences, each from a different lecture. Write the lecture number for each. You have ninety seconds, no slides allowed. One: change, keep, adapt. Two: a seed is an address, not an instruction. Three: frame time is not denoising time. Four: whose model is it? Five: plan the song, then the steps. Six: watch the p, b and m sounds. Seven: walk away, and come back. Eight: its absence proves nothing. Go.

小游戏。八句话，各来自不同的一讲，写出讲次。九十秒，不许看幻灯片。一：改变、保留、调整。二：种子是地址，不是指令。三：画面时间不是去噪时间。四：模型是谁的？五：先规划歌曲，再规划舞步。六：注意p、b、m音。七：走开，再回来。八：它的缺失证明不了任何东西。开始。

## 35. Answers, and where to revisit

Answers. One is Lecture 2, the edit contract. Two is Lecture 3, seeds. Three is Lecture 4, the two kinds of time. Four is Lecture 5. Five is Lecture 7, Wan-Dancer's two-level plan. Six is Lecture 8, visemes. Seven is Lecture 9, the red door round-trip test. Eight is Lecture 10, Content Credentials. Six or more and you're ready. If you missed one, every answer has a slide link on tonight's page, so go back to that slide this week.

答案：1是第2讲，编辑契约；2是第3讲，种子；3是第4讲，两种时间；4是第5讲；5是第7讲，Wan-Dancer的两级规划；6是第8讲，视位；7是第9讲，红门往返测试；8是第10讲，内容凭证。答对六个以上就准备好了。错了的，今晚的网页上每个答案都有幻灯片链接，这周回去看那一页。

Revisit: L02 · 9 (The edit contract), L03 · 48 (Different seeds can give different pictures), L04 · 9 (A video has two kinds of time), L05 · 3 (Whose model is it?), L07 · 34 (The trick: plan the song, then the steps), L08 · 41 (Sounds you can see: phonemes → visemes), L09 · 19 (Under the hood: why the world must come back the same), L10 · 67 (We broke it four ways, in Python, in five minutes)

## 36. Bring the semester into your final presentation

Now let's turn the review into your final presentation. The course promised six outcomes, and each one maps to something from this term. Explain a pipeline: draw your own four-stage diagram with real model names and versions. Direct a coherent work: show decisions, not just outputs, with your edit contract or beat sheet. Build and document an experiment: one variable at a time, attempts counted, with a side-by-side, as Lecture 1 asked. Critique with evidence: run the four steps on your own work and say what you fought against the default. Account for AI use: your credit block, with versions pinned and a consent line. Present a refined project: one clear intention, and what you'd do next. If each of these gets one slide, you have a strong presentation.

把回顾变成你的期末展示。课程承诺六个学习成果，每个都对应本学期的内容。解释流程：画出你自己的四阶段图，写上真实模型名和版本。导演一个连贯作品：展示决定，而不只是输出，用你的编辑契约或节拍表。构建并记录实验：一次一个变量，数清尝试次数，配并排对比，正如第1讲要求的。用证据评论：对自己的作品走四步，说出你对抗了哪些默认。说明AI的使用：署名块、锁定版本、同意说明。呈现一个完善的项目：一个清晰的意图，以及下一步做什么。每项一页，就是一场很好的展示。

Revisit: L01 · 101 (Design one eight-second shot before opening a generator), L10 · 81 (Crit sheet: copy this for your final presentation), L10 · 73 (Useful: a credit block you can copy for A2 and A3)

## 37. Three weeks left

The practical part. Tonight, after the break, is the last week for weekly presentations. November 17th and 24th are the final presentations, so check your slot on the sign-up page and add your slides link. Assignments 2 and 3 are both due November 30th at 23:59 Hong Kong time. Every quiz, including tonight's Quiz 11, is due at the end of the semester, and you can retrieve and edit your answers until then. Quiz 11 is a review quiz, and each question asks you to connect two lectures, so it doubles as preparation for your final.

实际安排。今晚休息后是最后一周的每周展示。11月17日和24日是期末展示，请在报名页确认时段并添加幻灯片链接。作业二和作业三都在11月30日香港时间23:59截止。所有小测验，包括今晚的第11次，都在学期末截止，在那之前可以随时取回修改。第11次是复习测验，每题都要求连接两讲内容，也可以当作期末准备。

## 38. Technical literacy becomes creative agency

Let me end with two sentences, one from the first night and one from the last. From Lecture 1: when an output surprises you, don't only ask whether you like it. Ask which decision produced it, and what controlled comparison would teach you more. That's where technical literacy becomes creative agency. And from Lecture 10: generating is now cheap; looking, deciding and signing your name are not. Between those two sentences is everything we did this term. Thank you. Let's take a ten-minute break, and then the last weekly presentations.

最后两句话，一句来自第一晚，一句来自上周。第1讲：当输出让你意外时，不要只问喜不喜欢，要问是哪个决定产生了它，什么样的对照比较能让你学到更多。这就是技术素养变成创作能力的地方。第10讲：生成如今很便宜，观看、决定、签上你的名字却不便宜。这两句话之间，就是我们这学期做的一切。谢谢大家。休息十分钟，然后是最后一轮每周展示。

Revisit: L01 · 102 (Technical literacy becomes creative agency), L10 · 80 (Generating is now cheap. Looking, deciding, and signing your name are not.)

