# Lecture 03 — Inside the generator

English / 中文 transcript


## Slide 1 — Inside the generator

00:00

Image generators make a series of numerical choices. A prompt describes part of the target, a random state supplies a starting point, and a trained model guides the output. Changing any of those can change the picture.

图像生成器会作出一连串数值选择。提示描述部分目标，随机状态提供起点，训练好的模型引导输出。任何一项改变，都可能改变图片。

This lecture connects those mechanisms to image-making decisions. We will cover diffusion, compressed representations, attention, seeds, guidance, sampling, and editing. The later section extends the same ideas to video, assistants, world models, and robot actions.

这节课把这些机制与图像制作联系起来，内容包括扩散、压缩表示、注意力、种子、引导、采样和编辑，后面再延伸到视频、助手、世界模型与机器人动作。

The art content is equally specific: camera perspective, depth cues, lightness and color, character continuity, and local image repair. Small calculations will show what a setting changes. Published figures will provide examples, and controlled comparisons will separate a setting effect from a lucky result.

艺术部分包括机位透视、深度线索、明暗与颜色、角色连续性和局部修复。小计算说明设置改变了什么，论文图片提供例子，受控比较帮助区分设置效果与偶然结果。

## Slide 2 — Three questions for today

00:40

The first question is why one prompt can produce many images. The answer involves both incomplete instructions and randomness. A sentence rarely specifies every position, surface, and lighting condition, so many images may fit it.

第一个问题是为什么一个提示能产生很多图片。答案包括指令不完整和随机性：一句话很少规定所有位置、表面和灯光条件，所以可能有很多符合要求的图。

The second question is why stronger guidance can reduce quality. Guidance changes how predictions are combined. It can strengthen requested features while exaggerating unwanted ones or reducing variation. We will calculate a simple example before looking at actual sample grids.

第二个问题是为什么更强引导可能降低质量。引导改变预测的组合方式，强化要求的特征时，也可能放大不需要的特征或减少变化。先用简单计算解释，再看样本网格。

The third question is which control matches a problem. A wrong layout, a damaged local detail, and an inconsistent character are different failures. Seeds, reference images, spatial controls, masks, and trained adapters act at different parts of the system. Knowing that difference makes a test more informative.

第三个问题是哪种控制对应哪种问题。布局错误、局部细节损坏和角色不一致，是不同失败。种子、参考图、空间控制、蒙版和训练适配器作用位置不同，分清它们，测试才更有信息。

## Slide 3 — Content, layout, and appearance

01:21

An image request has several parts. Content names the objects and their relations. Layout specifies where they appear and how much space they occupy. Appearance covers edges, color, light, and material. Intended use determines which details need to remain clear.

图像要求有几个部分。内容规定物体与关系，布局规定位置和占据的空间，外观包括边缘、颜色、光线与材质，用途则决定哪些细节必须清楚。

For example, a poster may need open space for a title. An animation frame may need a character whose costume matches the previous shot. A small thumbnail may need a simple silhouette. These can use similar subjects while requiring different compositions.

例如，海报需要标题留白，动画帧需要服装与前一镜头一致，小缩略图可能需要简单轮廓。主体可以相似，构图要求却不同。

The station image is one example for a few comparisons. Its yellow coat, red prop, and long platform make color, identity, and perspective easy to identify. They are separate variables that can be specified, changed, and checked.

车站图只用于部分比较。黄色外套、红色道具和长站台，方便识别颜色、身份和透视。这些是可以分别规定、改变和检查的变量。

## Slide 4 — One prompt can produce many pictures

02:01

Look at these three pictures for a moment. They came from the same description of an astronaut riding a horse.

先看这三张图。它们都来自同一段“宇航员骑马”的描述。

The subject stays roughly the same, but many choices change. Look at the horse’s pose, the background, and where the rider sits in the frame.

主体基本相同，但很多选择变了。看看马的姿势、背景，以及骑手在画面中的位置。

The words don’t settle all of those choices. So there can be several different pictures that fit the request.

文字没有确定所有这些选择，所以多张不同的图片都可能符合要求。

These are older published examples, but the question they raise is still useful: what did the prompt actually specify?

这些是较早发表的例子，但问题仍然值得问：提示词到底明确规定了什么？

Try describing the differences without saying better or worse yet. One image may place the traveler near the edge. Another may make the platform wider. If we first name the changes, we can later decide which ones matter for the story, instead of choosing only by first impression.

先描述差异，不急着说好坏。一张把旅人放在边缘，另一张把站台画得更宽。先说出改变了什么，再判断哪些变化对故事重要，而不是只凭第一印象选择。

## Slide 5 — Recognizing an image and making an image

02:39

Recognizing a picture and making a picture are different jobs. If I show you a chair, you might say, “That’s a red chair.”

识别图片和生成图片是不同的任务。给你看一把椅子，你可能会说：“这是一把红椅子。”

But if I ask you to draw one, you need to choose its shape, the viewing angle, the light, and what sits behind it.

但让你画一把椅子，你就要选择它的形状、观看角度、光线和背景。

A generator has to fill in those missing choices too.

生成器也要补上这些没有说清的选择。

Recognition can leave many details undecided. A label doesn't need to describe every window in the station. Generation has to put something there, even when we never asked about the windows. This is one reason a short prompt leaves so much room for the model to make choices.

识别时，许多细节可以不作决定。一个标签不需要描述车站每扇窗户；生成图片时，即使我们没提窗户，模型也得画出些什么。这就是简短提示词会留下大量选择空间的原因之一。

## Slide 6 — The prompt leaves choices open

03:12

“A traveler at a station” leaves a lot open. Are we close enough to see their face? Is it morning or evening? Is the station busy?

“车站里的一位旅人”留下很多空白。离得近不近，能否看清脸？是早晨还是傍晚？车站忙不忙？

The model has learned patterns from training examples, and those patterns influence what it produces. Adding more words can narrow the possibilities.

模型从训练样本中学到了规律，这些规律会影响结果。增加文字可以缩小可能的范围。

It still doesn’t describe every part of the picture, and the model may miss some of what we ask for.

但文字仍然没有描述画面的每一部分，模型也可能漏掉某些要求。

Suppose we add the words quiet and lonely. Those words might influence color, empty space, posture, or lighting. They don't specify one exact arrangement. If one arrangement matters, describe it directly. We can then judge whether the image follows that request and whether it creates the intended feeling.

加上“安静”和“孤独”，可能影响颜色、留白、姿势或灯光，却没有规定唯一布局。如果某种布局很重要，就直接描述它，再判断图片是否遵循要求，以及是否产生了想要的感觉。

## Slide 7 — How words and reference images help

03:49

Words are useful for saying what we want. A reference image can be useful for showing it.

文字适合说出我们想要什么，参考图则可以直接展示。

For example, “make the traveler small” leaves room for interpretation. A sketch with a small figure in the corner gives more direct information about the layout.

比如，“让旅人小一点”仍有解释空间。在角落画一个小人的草图，更直接地说明了布局。

We call these extra inputs conditions. They guide generation, but they don’t guarantee that every detail will stay exactly as supplied.

这些额外输入叫作条件。它们引导生成，但不能保证每个细节都原样保留。

Words and references also have to agree. If the reference shows a close-up while the prompt asks for a distant figure, the system receives competing directions. Before adding more words, check whether your inputs are asking for the same picture. Sometimes simplifying the input makes the test much clearer.

文字与参考图也需要一致。参考图是近景，提示词却要求远处的小人物，系统就收到相互冲突的要求。添加更多文字前，先检查输入是否指向同一张图片。有时简化输入能让测试更清楚。

## Slide 8 — Camera distance changes perspective

04:26

Perspective depends on the camera's position relative to the scene. A nearby object occupies more of the image than an otherwise similar object farther away. Moving the camera changes those distance relationships. That is why a close viewpoint can exaggerate a face, a hand, or the front of a building.

透视取决于机位与场景的相对位置。其他条件相似时，近处物体占据更多画面。移动机位会改变距离关系，因此近距离视角可能夸张脸、手或建筑前部的比例。

In a simple pinhole camera, projected size is proportional to focal length and inversely proportional to distance. If the object and focal length stay fixed, doubling the distance halves its projected size. This is a geometric relationship, not an artistic rule.

简单针孔相机中，投影大小与焦距成正比，与距离成反比。物体和焦距不变时，距离翻倍，投影大小减半。这是几何关系，不是艺术规则。

Changing the crop at one fixed viewpoint changes framing but preserves perspective. Moving backward and choosing a longer lens can keep the foreground subject similar in size while changing its relation to the background. Generated images may imitate these effects, but a camera word in a prompt does not guarantee calibrated optics.

固定机位下裁切，只改变取景，不改变透视。后退并使用更长焦距，可以保持前景主体大小相近，同时改变它与背景的关系。生成图可能模仿这种效果，但提示中的镜头词不保证精确的光学模拟。

## Slide 9 — Three depth cues for a flat picture

05:20

A flat image can suggest depth without containing an explicit three-dimensional model. Overlap establishes a front-to-back relationship: if one shape blocks another, we usually read the blocking shape as closer. The cue gives an ordering, not a measured distance.

平面图像无需包含明确三维模型，也能表现深度。遮挡建立前后关系：一个形状挡住另一个时，通常会被理解为更近。这提供的是顺序，不是测量距离。

Relative size supplies another cue when we assume objects have similar real-world sizes. Repeated columns that get smaller can suggest distance. If the objects are actually different sizes, that inference can be wrong. The cue depends on both image geometry and our expectation about the objects.

假设物体实际大小相近时，相对尺寸提供另一条线索。重复立柱逐渐缩小，可以暗示远近；如果物体实际大小不同，这个判断就可能错误。线索既依赖图像几何，也依赖对物体的预期。

Linear perspective adds a directional structure. Projections of parallel lines can converge toward a vanishing point. Rails, floor edges, and roof beams can organize a picture around those directions. Different sets of parallel lines may have different vanishing points.

线性透视增加方向结构。平行线的投影可以向消失点汇聚，轨道、地板边缘和屋顶梁都能围绕这些方向组织画面。不同组平行线可能有不同消失点。

In a generated scene, these cues can disagree. A prop may overlap correctly while its scale changes implausibly. A visually attractive corridor can have inconsistent convergence. Checking overlap, scale, and line directions separately gives a more precise geometric critique than saying the space looks strange.

生成场景中的线索可能冲突：道具遮挡正确，尺度却不合理；走廊漂亮，汇聚方向却不一致。分别检查遮挡、尺度和线条方向，比笼统说“空间奇怪”更准确。

## Slide 10 — What to save with an image

06:19

When you get a picture you want to keep, save how you made it. The prompt is only part of the record.

得到想保留的图片时，也要保存它的制作过程。提示词只是记录的一部分。

You also need the model, any reference images, the seed, and the generation settings.

还需要记录模型、参考图、随机种子和生成设置。

Think about sending the picture to a classmate and asking them to continue the work.

想象把图片交给同学，请他接着做。

If all they have is your sentence, they’ll have to guess much of the setup.

如果他只有那句话，很多设置就只能靠猜。

A model checkpoint just means a saved version of the model’s learned values. Keep its name too.

模型检查点，就是模型学到的数值的一个保存版本。它的名称也要记下来。

A record is most useful when another person can follow it. Give the image a version number, save the exact prompt, and keep the unedited output as well as your final edit. Otherwise, you may later compare a raw model result with a picture that has already been heavily changed.

记录要让别人也能照着操作。给图片编号，保存准确的提示词，同时保留原始输出和最终修改版。否则，之后可能会把模型原图与经过大量编辑的图片误当成同类结果来比较。

## Slide 11 — Learning and making an image

06:56

Before we go further, we need to separate training from making one image. During training, the model’s internal values change as it learns from examples.

继续之前，先区分训练和生成单张图片。训练时，模型从样本中学习，内部数值会改变。

During normal image generation, those values usually stay fixed. What changes is the image being generated.

正常生成图片时，这些数值通常固定不变。变化的是正在生成的图像。

So, if you increase the sampling steps, you haven’t taught the model more about hands or faces. You’ve given the generation process more updates.

所以，增加采样步数，并没有让模型学到更多手部或人脸知识，只是让生成过程多做几次更新。

That can affect the result, but it’s a different kind of change.

这会影响结果，但属于另一种变化。

The two stages also run on different timescales. Training can involve a large collection of images and many updates. Making one image uses the trained model for a much shorter computation. When you change a seed in an ordinary generation tool, you aren't asking it to learn the subject again.

这两个阶段所需时间也不同。训练可能使用大量图片并更新很多次；生成一张图则使用已经训练好的模型，进行较短的计算。在普通生成工具中换种子，并不是让模型重新学习这个主体。

## Slide 12 — What happens when we add noise?

07:34

Read this strip from left to right. We start with a recognizable picture and add more and more noise.

从左向右看这组图。开始时图片清楚可辨，随后加入越来越多的噪声。

Eventually, it becomes difficult to tell what was there. Here, noise means random changes in the image values. We add it deliberately during training.

最后，很难认出原来是什么。这里的噪声指图像数值的随机变化，训练时我们会主动加入它。

Why create this problem? Because we have the original picture, and we know the noise we added.

为什么要制造这个问题？因为我们有原图，也知道加入了什么噪声。

That gives us something we can ask the model to predict, and an answer we can compare its prediction with.

这样，就能让模型做预测，并用已知答案检查它的预测。

At a small amount of noise, you can still recognize the station. At a large amount, it becomes difficult to say what was there. The learning problem changes with the noise level. Recovering a tiny edge detail is different from making a useful prediction when almost all visual evidence is gone.

噪声少时，还能认出车站；噪声多时，就很难判断原来有什么。不同噪声水平带来的学习问题不同。恢复边缘的小细节，与视觉信息几乎消失后作出有用预测，并不是同一种难度。

## Slide 13 — Clean image plus noise

08:11

This equation describes adding noise to a clean image. Read it as: a weighted amount of the clean image, plus a weighted amount of random noise. The letters a and b control how much of each we use at this noise level. If the image weight is zero and the noise weight is one, we have only noise. If the noise weight is small, more of the image remains visible. This is a useful formula for the diffusion setup we discussed. Other generation methods may describe their states differently.

这个公式表示给干净图像加入噪声：一部分干净图像，加上一部分随机噪声。a 和 b 控制当前噪声水平下两者的权重。图像权重为零、噪声权重为一时，只剩噪声；噪声权重较小时，还能看见更多图像。这个公式适用于这里的扩散设置，其他生成方法可能使用不同的状态表示。

For one coordinate, suppose the clean value is point eight and the sampled noise value is minus point two. With weights point six and point eight, the noisy value is point six times point eight, plus point eight times minus point two. The result is point three two. These weights have squared values that sum to one, a common normalization for this example. The arithmetic applies to every coordinate, not just one visible pixel.

取一个坐标，干净值为 0.8，噪声为 −0.2。若权重分别为 0.6 和 0.8，结果就是 0.6×0.8 加 0.8×(−0.2)，等于 0.32。这两个权重的平方和为 1，是此类例子中常见的归一化。计算发生在每个坐标上，不只是一颗可见像素。

## Slide 14 — We can choose how noisy a training image is

08:53

We can choose how noisy each training example should be. One example might have a little noise. Another might be almost entirely noise.

每个训练样本的噪声程度都可以选择。有的只有少量噪声，有的几乎全是噪声。

We don’t have to create every earlier stage first. We can calculate a noisy example at the level we want.

不必先生成之前的每个阶段，可以直接计算出所需噪声程度的样本。

That lets the model practice across different noise levels. It doesn’t mean that making a finished image will always take only one step.

模型因此能在不同噪声程度下练习。这不代表生成完整图片总能一步完成。

The noise level is information the network needs. Without it, a small fuzzy patch might be interpreted differently at different stages. Think of the level as telling the model how much damage to expect. It still has to work out a prediction from the image and any other inputs.

网络需要知道噪声水平，否则在不同阶段，同一块模糊区域可能有不同含义。噪声水平告诉模型预计有多大程度的扰动，但模型仍需根据图片和其他输入作出预测。

## Slide 15 — How the model learns to predict noise

09:30

Let’s follow this figure. Start with the clean picture on the left. Add noise, and give the noisy picture to the network.

沿着图看。先取左边的清晰图片，加入噪声，再把带噪图片送入网络。

In this version of the training task, the network tries to predict the noise we added. Then we compare its answer with the actual noise.

在这种训练任务中，网络预测我们加入的噪声，然后把预测与真实噪声比较。

When the prediction is wrong, training adjusts the model’s internal values. This happens over many examples. The model also gets information about the noise level.

预测错了，训练就调整模型内部的数值。这个过程会在许多样本上重复。模型还会收到噪声程度的信息。

I’ve left that input out of the drawing so the main sequence is easier to see.

为了让主流程更容易看懂，图里省略了这个输入。

Across training examples, the network sees many ways that useful image structure survives under noise. It changes its internal numbers when its prediction is wrong. No one writes a separate rule for every coat or platform. The behavior comes from learning patterns across the examples it was given.

训练时，网络看到图像结构在噪声下保留下来的各种情况，预测错误时就调整内部数值。没有人为每件外套、每座站台分别编写规则；它的行为来自对训练例子中规律的学习。

## Slide 16 — How we measure a prediction error

10:09

During noise-prediction training, we know the noise that was added. We subtract the model’s prediction from that known answer, square the differences, and average them. Squaring makes large errors count more strongly. Training tries to bring this error down across examples. Notice what this score measures. It measures the noise-prediction error. It doesn’t directly score whether the picture tells a good story or whether its composition suits this image. Those need separate judgments.

噪声预测训练中，我们知道加入了什么噪声。用这个已知答案减去模型预测，将差值平方后求平均。平方使较大误差受到更重惩罚，训练试图降低大量例子的平均误差。这个分数衡量的是噪声预测误差，并不直接评价图片是否讲好了故事，或构图是否适合用途；这些需要另外判断。

For a two-coordinate example, let the known noise be one and minus one. Suppose the prediction is point eight and minus point five. The errors are point two and minus point five. Squaring gives point zero four and point two five, and their mean is point one four five. Training uses many coordinates and examples, but this small calculation shows exactly what the error score measures.

两个坐标的已知噪声为 1 和 −1，预测为 0.8 和 −0.5。误差是 0.2 和 −0.5，平方为 0.04 和 0.25，平均得到 0.145。真实训练会使用更多坐标和样本，但这个计算清楚展示了误差分数的含义。

## Slide 17 — Where does the finished image come from?

10:50

There’s an important difference between this training example and generating a new picture. During training, we began with a known image.

这个训练例子与生成新图有一个重要区别：训练时，我们从已知图片开始。

During generation, we can begin with random noise. There isn’t a particular photograph hidden inside it, waiting to be uncovered.

生成时，可以从随机噪声开始。噪声里没有藏着一张特定照片等我们找出来。

The model uses patterns it learned to help produce a possible image.

模型利用学到的规律，生成一种可能的图像。

That doesn’t rule out copying or memorization; it just explains what this generation process is doing.

这并不排除复制或记忆训练样本的情况，只是在解释这个生成过程做了什么。

This is why generation is more than uncovering a picture that was waiting inside the noise. At the start, many outcomes are possible. The learned model and the inputs guide a sequence of choices. By the end, those choices have become one particular arrangement of objects, surfaces, and light.

所以生成并不是揭开一张藏在噪声里的图片。开始时有很多可能结果，训练好的模型与输入共同引导一连串选择，最后形成某种具体的物体、表面和光线安排。

## Slide 18 — Discussion: training or sampling?

11:28

Separate these two actions. In the first, a model is trained using a new collection of images. In the second, the same trained model generates another image with a different seed. Which values change in each case?

区分两个动作：第一，用新的图片集训练模型；第二，同一个已训练模型换种子再生成图片。两种情况下，改变的数值分别是什么？

Training changes learned weights. Generation changes the current sampled state while normally keeping those weights fixed. A new seed changes the random starting process. It does not add the new output to the training set or teach the model a new subject by itself.

训练改变学到的权重；生成通常固定权重，改变当前采样状态。新种子改变随机起点，不会自动把输出加入训练集，也不会单独教会模型一个新主体。

This distinction matters when choosing an intervention. A different sample may solve a particular composition by chance. Subject adaptation aims to change learned behavior across future samples. They have different costs and different purposes. The later LoRA and reference-conditioning examples will make that difference more specific.

选择干预方法时，这个区别很重要。换样本可能偶然解决某次构图，主体适配则试图改变未来样本中的学习行为。它们成本和用途不同，后面的 LoRA 与参考条件例子会具体展开。

## Slide 19 — What changes during generation?

12:08

The main distinction is this: training changes the model. Sampling uses the model to change the current image.

主要区别是：训练改变模型，采样利用模型改变当前图像。

More steps may change how the result develops, but they don’t directly tell the model to move the traveler farther away.

更多步数可能改变生成过程，但不会直接告诉模型把旅人放得更远。

For that, a wider-view instruction or a layout reference may be a better thing to test.

要解决这个问题，更宽的视角描述或布局参考图，可能更值得测试。

A sharper version of the wrong composition is still the wrong composition.

错误构图变得更清晰，仍然是错误的构图。

The word update can make these stages sound alike. In training, it means changing what the network has learned. In sampling, it usually means changing the current state being generated. Keep asking what is being updated. That small question prevents a lot of confusion when you read a technical diagram.

“更新”这个词容易让两个阶段听起来相似。训练更新的是网络学到的内容；采样通常更新当前生成状态。看到技术图时，追问到底在更新什么，可以避免很多混淆。

## Slide 20 — From noise to an image

12:45

Now let’s run the process toward an image. In this diagram, the noisy state is on the left and the cleaner image is on the right.

现在沿着生成图像的方向看。这张图左边是噪声状态，右边是更清晰的图像。

We start with noise, ask the model for a prediction, and use that prediction to make an update. Then we repeat.

从噪声开始，让模型预测，再用预测更新状态，然后重复。

You don’t need to follow every symbol here. Follow the changing state.

不必逐个看懂符号，跟着状态的变化看就好。

Each prediction depends on what is currently there and where we are in the process.

每次预测都取决于当前状态，以及过程进行到了哪里。

There is no finished target picture supplied at the end for the model to copy.

终点并没有提供一张完成的图片让模型照着复制。

Don't expect every intermediate image to be a useful draft. Some states are hard to interpret, especially early on. For a design review, finished samples are often easier to compare. Intermediate pictures are useful when we specifically want to understand how the computation changes over the course of a run.

不要期待每张中间结果都能当草稿，尤其早期状态常常很难看懂。做设计评审时，最终结果通常更容易比较；只有研究计算过程怎样变化时，中间图才特别有用。

## Slide 21 — The model predicts. The sampler takes a step.

13:24

The model and the sampler have different jobs. The model makes a prediction from the current noisy state.

模型和采样器分工不同。模型根据当前带噪状态做预测。

The sampler uses that prediction to calculate the next state.

采样器利用预测，计算下一个状态。

That calculation is why changing the sampler can change the result even when we keep the model.

正因为计算方式不同，即使模型不变，更换采样器也可能改变结果。

We’re using the same learned network, but changing how we follow its predictions.

使用的仍是同一个学好的网络，改变的是如何根据预测向前推进。

Imagine the network says which direction to move, while the sampler decides how to take that move. If we change the sampler, the network can remain the same, but the route through intermediate states can differ. So two tools can use similar models and still behave differently during generation.

可以把网络理解成指出移动方向，采样器决定如何迈出这一步。换采样器时，网络可以不变，但经过的中间状态会不同。因此，使用相似模型的工具也可能有不同的生成表现。

## Slide 22 — Different steps use different noise levels

13:58

The amount of noise changes during generation. Near the noisy end, very little image information is visible.

生成过程中，噪声量会变化。接近纯噪声的一端时，能看出的图像信息很少。

Near the end of the process, the picture is easier to recognize. A schedule chooses which noise levels we visit.

接近结束时，图片更容易辨认。调度方式决定经过哪些噪声程度。

So step ten in one setup may not mean the same thing as step ten in another.

所以，一种设置的第十步，未必等同于另一种设置的第十步。

Don’t assume every model follows a fixed “composition first, details later” sequence.

不要认为每个模型都固定遵循“先构图、后细节”的顺序。

Equal numbers of steps don't necessarily mean equal spacing along the noise levels. One schedule may spend more updates near a particular part of the process. That changes where the model's predictions are evaluated. When a tool offers a schedule option, it is changing more than the label on the step counter.

步数相同，并不代表噪声水平之间间隔相同。一种调度可能在某个阶段安排更多更新，从而改变模型在哪些位置进行预测。调度选项改变的不只是步数计数器上的名称。

## Slide 23 — What can the model predict?

14:36

We’ve explained this using a model that predicts noise. That’s one common training choice.

前面用预测噪声的模型来解释。这是一种常见的训练选择。

Other models can predict a clean image, or a direction in which the current state should change. You don’t need to memorize all the versions.

其他模型可以预测清晰图像，或预测当前状态应改变的方向。不必记住所有版本。

The useful point is that the sampler has to use the prediction in the way the model was trained for. These outputs aren’t interchangeable labels.

关键是采样器要按模型受训时的含义使用预测。这些输出不是能随意互换的名称。

These prediction targets can sometimes be converted into one another when we know the noise level and the formula connecting them. But the network was trained for a particular target. Copying a formula from another model without checking that target can give an update that doesn't mean what you think it means.

知道噪声水平和相关公式后，有些预测目标可以互相换算。但网络是针对特定目标训练的。不检查目标就照搬其他模型的公式，可能让更新的含义与预想完全不同。

## Slide 24 — Working with a smaller representation

15:12

Working directly on every pixel can take a lot of computation. Some models do most of the work in a smaller representation of the image.

直接处理每个像素可能需要大量计算。有些模型在更小的图像表示中完成大部分工作。

That representation is called a latent. It’s a collection of learned numerical values.

这种表示叫作潜变量，是模型学到的一组数值。

In this older Stable Diffusion example, the image and its working representation have the sizes shown here. There are far fewer values in the smaller one.

这个较早的 Stable Diffusion 例子展示了图像与工作表示的尺寸。较小的表示包含的数值少得多。

That reduces the amount of information the image model has to handle, though it doesn’t give us an exact speedup from the numbers alone.

这减少了图像模型要处理的信息，但不能仅凭这些数字算出实际加速了多少。

The smaller representation saves work, but it changes where that work happens. We still need an encoder for images we supply and a decoder for visible output. A fast denoising loop doesn't remove those other parts. For an interactive artwork, measure the whole wait that a visitor actually experiences.

较小的表示减少计算，但也改变了计算发生的位置。输入图片仍需编码，输出仍需解码。去噪循环快，不代表其他环节消失了。做互动作品时，应测量观众实际经历的完整等待时间。

## Slide 25 — How an image gets compressed

15:52

The encoder turns an image into that smaller representation. The decoder turns it back into pixels. Look at the middle of the figure.

编码器把图像变成较小的表示，解码器再把它变回像素。看看图的中间。

The little grid is just a way to show that the model works with numbers.

这个小网格只是用来说明模型处理的是数字。

It isn’t actual data from this picture, and there isn’t one square meaning “coat” and another meaning “suitcase.”

它不是这张图片的真实数据，也不是某个格子代表“外套”、另一个代表“行李箱”。

In a latent diffusion model, the repeated generation steps happen in this smaller form. We use the decoder to get the image we can see.

潜空间扩散模型在这种较小的表示中反复更新，最后用解码器得到可见的图片。

A useful way to picture the decoder is as a learned way of turning compact information into visible structure. It doesn't simply enlarge each colored square in this drawing. The actual representation spreads information across numbers, and the decoder combines them using patterns learned during its own training.

可以把解码器理解成一种学会了的转换方法，把压缩信息变成可见结构。它不是简单放大图中的每个色块。真实表示把信息分散在数字中，解码器利用训练学到的规律把它们组合起来。

## Slide 26 — Rebuilding an image and making a new one

16:31

Rebuilding an existing image and making a new image test different things.

重建已有图片和生成新图片，检验的是不同的事情。

If I encode this picture and decode it again, I can check how much survives. That tests the compression part.

把图片编码后再解码，可以检查保留了多少信息。这是在测试压缩部分。

It doesn’t show that any random set of numbers will turn into a good picture.

这不能证明任意一组随机数字都能变成好图片。

The generation model still has to produce a useful representation for the decoder to work with.

生成模型仍需产生一种适合解码器使用的表示。

Try the two checks separately. First, pass an existing image through compression and reconstruction. Then examine newly generated samples. If the first test loses thin lettering, that gives one possible cause of poor lettering in the second test. It doesn't explain every failure, but it narrows the question.

可以分开做两个检查：先压缩并重建已有图片，再看新生成的样本。如果第一个测试丢失细字，它就可能解释第二个测试中的部分文字问题。虽然解释不了所有错误，但问题范围更明确了。

## Slide 27 — What does a VAE add?

17:08

A VAE is a variational autoencoder. The full name matters less than the extra idea it adds to compression. Its encoder describes a range of possible values for the smaller representation. Training asks it to reconstruct images while also keeping those values organized in a way that supports sampling. Those two aims can pull in different directions. Keeping every detail and making a useful space of representations aren’t exactly the same task. Image models can use related autoencoders with additional training losses, so this is an introduction to the idea rather than a description of every system.

VAE 指变分自编码器。完整名称不如它为压缩增加的想法重要：编码器描述较小表示的一组可能值。训练既要求重建图片，也希望这些值的组织方式有利于采样。两项目标可能冲突，保留每个细节与构建有用的表示空间并不是同一任务。实际图像模型可能使用额外损失，所以这里介绍的是基本想法，而不是所有系统的完整结构。

The reconstruction term asks whether the decoded image resembles the input. The regularization term compares the encoder's distribution with a chosen prior distribution. That second term discourages every image from being encoded into an arbitrary isolated region. The balance affects the usefulness of the latent space. In image-generation systems, additional perceptual or adversarial losses may change the reconstruction behavior, so the simple VAE objective is a starting model of the idea.

重建项检查解码图是否接近输入，正则项则比较编码器分布与选定先验分布，避免每张图都被放进任意孤立的区域。两者平衡会影响潜空间的用途。实际图像系统还可能使用感知或对抗损失，所以简单 VAE 目标只是理解这个想法的起点。

## Slide 28 — Which details survive compression?

18:10

Think about a thin railing, a tiny logo, or the handle of our suitcase.

想想细栏杆、小标志，或者行李箱的提手。

If that detail disappears when we simply encode and decode the picture, changing the prompt won’t tell us much about the cause.

如果只是编码再解码，这些细节就已经消失了，改提示词也很难解释问题出在哪里。

We already know some information is being lost in that part of the system.

我们已经知道，信息在系统的这个环节丢失了一部分。

It helps to check where a problem appears, rather than treating every failure as a wording problem.

先检查问题在哪一步出现，不要把所有失败都当成措辞问题。

This matters for work that people view at different sizes. A tiny suitcase handle might disappear in a projection even if it survived generation. Check the actual display size as well as the original file. Image quality is partly about whether the important details remain visible where the work will be shown.

作品以不同尺寸观看时，这一点尤其重要。行李箱提手即使生成成功，投影时也可能看不见。既要看原文件，也要看实际展示尺寸。重要细节在展示现场能否被看见，也是图像质量的一部分。

## Slide 29 — Edges and texture: paper, paint, and ink

18:47

Edges help organize an illustration. A hard edge creates a clear boundary. A soft edge allows neighboring shapes or tones to merge. A lost edge occurs where the boundary becomes difficult to separate from its surroundings. Artists can use all three within one image.

边缘帮助组织画面。硬边形成清楚界限，软边让相邻形状或色调融合，消失边缘则让边界难以与周围区分。艺术家可以在一张图里同时使用这三种处理。

The cut-paper example emphasizes separate shapes. The paint example uses softer transitions. The ink example emphasizes line weight and marks. These differences affect which forms remain readable at a small size and which areas attract attention through contrast.

剪纸例子强调分开的形状，绘画例子使用柔和过渡，墨线例子强调线条轻重和笔触。这些差异影响小尺寸下哪些形状仍清楚，以及哪些区域因对比而突出。

A style prompt can influence several of these properties at once. If the goal is a clear silhouette, simply adding more surface detail may work against it. Specify the edge behavior or value separation that the image needs. The three illustrations are teaching examples, not controlled measurements of a style setting.

风格提示可以同时影响这些属性。若目标是清晰轮廓，增加表面细节反而可能不利。应明确需要的边缘处理或明暗分离。这三张图是教学示例，并非对某个风格设置的受控测量。

## Slide 30 — The parts of an image generator

19:30

Here is how the parts fit together in one image generator. The random starting values come from the seeded random-number generator.

这张图把图像生成器的各个部分连起来了。最初的随机数由设置了种子的随机数生成器产生。

The text encoder turns the prompt into information the image network can use. The network makes predictions, and the sampler applies updates.

文本编码器把提示词变成图像网络可以使用的信息。网络作出预测，采样器据此更新。

At the end, the decoder produces pixels. Follow the loop in the middle. That’s the repeated work. Later models can replace some of these parts.

最后，解码器生成像素。请看中间的循环，那是反复进行的步骤。后来的模型可以替换其中一些部分。

This diagram is useful because it shows where the controls enter, not because every current product has exactly this structure.

这张图帮助我们找到控制项进入系统的位置，但并不是所有产品都完全采用这个结构。

When a result fails, this diagram gives us places to investigate. A prompt misunderstanding may involve text conditioning. Lost tiny detail may involve compression or decoding. An unstable comparison may involve the random setup. We won't diagnose everything from one picture, but we can choose a more focused next test.

结果失败时，这张图提供了排查位置。误解提示可能与文本条件有关；细节丢失可能涉及压缩或解码；比较不稳定可能与随机设置有关。单张图片不能诊断所有问题，但可以帮助选择更有针对性的下一步测试。

## Slide 31 — How a model uses words

20:11

The model can’t use a sentence in the same form that we read it. First, the sentence is divided into small pieces called tokens.

模型不能像我们读句子那样直接使用文字。它先把句子拆成小片段，叫作词元，也就是 token。

A token can be a word or part of a word. A text encoder turns those pieces into numerical features. The image model uses those features.

一个词元可能是一个词，也可能只是词的一部分。文本编码器把它们变成数字特征，供图像模型使用。

But having information about “red” and “suitcase” doesn’t guarantee that red will end up on the right object.

但有了“红色”和“行李箱”的信息，并不保证红色一定会出现在正确的物体上。

Adding words also changes the input representation. More words don't always make the request clearer. If several phrases repeat the same idea while another phrase conflicts with it, the result can be hard to interpret. Start with the subject, placement, and appearance that matter, then add a detail for a reason.

增加词语也会改变输入表示。词更多不一定更清楚。如果一些短语反复表达同一意思，另一些又相互冲突，结果就很难解释。先写重要的主体、位置和外观，再有理由地加入细节。

## Slide 32 — How CLIP links pictures and words

20:49

CLIP is one way to connect words and pictures. It learns from pictures paired with captions.

CLIP 是连接文字和图片的一种方法。它用配有文字说明的图片来学习。

During training, it learns to give a matching picture and caption similar numerical descriptions, compared with pairs that don’t match.

训练时，它学习让匹配的图片和文字具有相近的数字表示，同时与不匹配的组合拉开距离。

Some image generators use CLIP’s text encoder to help interpret a prompt. Other systems use different encoders. CLIP itself isn’t drawing the image.

一些图像生成器用 CLIP 的文本编码器理解提示词，另一些使用其他编码器。CLIP 本身并不画图。

It helps connect what the words describe with visual information. The generator still has to make the picture.

它帮助连接文字描述和视觉信息。图片仍由生成器来制作。

Matching pictures and captions teaches useful associations, but the captions are not complete descriptions of everything in a picture. They may mention the person and leave out the railing. That helps explain why a system can recognize the overall topic while missing a precise relation that was never easy to describe.

匹配图片和说明文字能学到有用联系，但文字并没有完整描述图片。它可能提到人物，却没提栏杆。这有助于理解：系统能够把握整体主题，却仍可能遗漏某个难以准确描述的关系。

## Slide 33 — A similar-looking image can still be wrong

21:29

A picture can be broadly similar to the prompt and still be wrong in a way that matters.

图片可能整体上符合提示词，却在一个重要细节上出错。

We might get a station, a traveler, and a suitcase, but the suitcase could be on the wrong side.

我们可能得到了车站、旅人和行李箱，但行李箱在错误的一侧。

Or we ask for two objects and get three. So don’t stop at “it looks about right.” Check the particular details the work depends on.

也可能要求两个物体，结果出现三个。不要只看“差不多像了”，要检查作品依赖的具体细节。

For a poster, a small relation can decide whether the image is usable. A hand holding a ticket is different from a ticket floating beside the hand. When you write your checks, include the relations that carry the meaning, not only a list of nouns that should appear somewhere.

对海报来说，小小的关系也可能决定图片能否使用。手拿着车票，与车票飘在手旁，意思不同。检查表除了列出应出现的物体，也要包括真正传达含义的关系。

## Slide 34 — How attention shares information

22:02

Attention is a way for the model to use information from different places. With self-attention, parts of the same input share information.

注意力是一种利用不同位置的信息的方法。在自注意力中，同一个输入的各部分交换信息。

One area of an image can use information from another area. That can matter for things like an object and its reflection.

图片的一个区域可以使用另一个区域的信息，比如物体和它的倒影之间的关系。

With cross-attention, information comes from another input. An image area can use information from the prompt.

交叉注意力则从另一个输入中获取信息。例如，图像区域可以使用提示词中的信息。

The names sound complicated, but the distinction is simple: information from within the same input, or information from another input.

这些名称听起来复杂，但区别很简单：信息来自同一个输入内部，还是另一个输入。

Attention doesn't make the model conscious of an object. Here it names a calculation that selects and mixes information. The useful design connection is that a local feature can depend on distant features or words. Changing one instruction can therefore influence more than the small area you had in mind.

这里的注意力并不表示模型意识到了物体，而是一种选择和混合信息的计算。对设计来说，局部特征可以依赖远处区域或文字，所以改一条指令可能影响的不只是你想改的小区域。

## Slide 35 — An image area can use information from words

22:43

This drawing gives us a rough picture of cross-attention.

这张图粗略地展示了交叉注意力。

The area around the coat can use information linked to “yellow,” along with other words in the prompt. Different information receives different weights in the calculation.

外套附近的区域可以使用与“黄色”相关的信息，也会使用提示词中的其他信息。不同信息在计算中的权重不同。

The lines here are drawn to explain the idea.

这里的连线只是用来解释这个想法。

They aren’t measurements from a model, and we can’t use them to prove which word caused a particular pixel.

它们不是从模型中测量出来的，不能证明哪个词造成了某个像素。

What matters for now is that the text can influence image features during generation. It isn’t just read once and then put aside.

现在只要记住：文字可以在生成过程中影响图像特征，并不是读一遍就放到一边。

The word coat does not need to control only the pixels inside the coat. It can influence shape, shadows, and nearby areas through later layers. A cross-attention map is therefore a clue about a calculation, not a clean selection mask. If we need to edit just the coat, an explicit region mask gives a different kind of control. That distinction matters when a small wording change unexpectedly alters the face or the background.

“外套”这个词不一定只影响外套内部的像素，它还可以通过后面的网络层影响形状、阴影和附近区域。交叉注意力图提供的是计算线索，并不是精确的选区。只改外套时，明确的区域蒙版提供了另一种控制。因此，改几个词也可能意外改变脸或背景。

## Slide 36 — Attention as a weighted mix

23:24

Here is attention as a weighted mix. Suppose the weights are point seven, point two, and point one. We multiply each corresponding set of features by its weight, then add the results. The weights here sum to one. The model is mixing numerical information. It isn’t necessarily choosing one word and ignoring all the others. These numbers are invented to make the arithmetic easy to follow. They aren’t measurements from the coat image. In a real network, many such calculations happen across different parts and layers.

这里把注意力表示为加权混合。假设权重为 0.7、0.2、0.1，将对应特征乘以权重再相加，这些权重和为一。模型混合的是数字信息，不一定只选择一个词而忽略其他词。这些数字只是方便计算的示例，不是外套图片的实测值。真实网络会在不同区域和层中进行大量这种计算。

Using scalar values makes the mixing easy to calculate. Let the three values be ten, twenty, and thirty. With weights point seven, point two, and point one, the result is seven plus four plus three, which is fourteen. A neural network usually mixes feature vectors instead of these three scalars. The weights come from comparisons involving queries and keys; the weighted information comes from the values.

用标量可以直接算出混合结果。三个值为 10、20、30，权重为 0.7、0.2、0.1，得到 7+4+3，也就是 14。网络通常混合特征向量。权重来自查询与键的比较，被加权的信息则来自值。

## Slide 37 — Why position matters

24:18

Order matters. “Dog bites person” and “person bites dog” use the same words but describe different events. Position matters in images too.

顺序很重要。“狗咬人”和“人咬狗”用了相同的词，却描述了不同事件。图像中的位置也一样重要。

A suitcase on the viewer’s left isn’t in the same place as one on the right. The model needs information about word order and image position.

从观众角度看，左边的行李箱和右边的行李箱位置不同。模型需要知道词语顺序和图像位置。

Having that information helps it represent relationships, though it can still get a relationship wrong.

这些信息帮助模型表示关系，但它仍然可能弄错关系。

For a camera, left and right are usually screen coordinates. For a character, left and right can refer to their own body. A character facing us has their right hand on our left. This simple reversal is a common source of ambiguous instructions. Write the viewpoint into the request when it matters, such as the suitcase on the viewer's left, held in the traveler's right hand. Then check those two relations separately.

对镜头来说，左右通常指画面方向；对人物来说，左右可能指身体自己的方向。面对我们的人，右手在我们左边。这种简单反转经常造成指令歧义。重要时应写明视角，例如“行李箱在观众左侧，由旅人的右手提着”，然后分别检查这两个关系。

## Slide 38 — Discussion 2: Does it match the instructions?

24:58

Here’s our next check. We want a yellow coat, a red suitcase on the left, and the station roof on the right.

接下来检查这个要求：黄色外套、左边的红色行李箱，以及右边的车站屋顶。

With a partner, make a short list of what you would inspect in the result. Be specific enough that another person could use your list.

和同伴列一张简短的检查表，写下你会检查什么。要具体到别人也能照着检查。

Now compare your lists. Could an image look beautiful and still fail one of those checks?

比较一下你们的清单。一张图片能不能很漂亮，却仍然有一项不合格？

Also, when we said “on the left,” whose left did we mean?

还有，我们说“左边”时，指的是谁的左边？

A useful answer could contain four checks: one traveler, a yellow coat, one red suitcase, and the roof on the requested side. A fifth check could describe the relation between the hand and handle. These are observable requirements. Quietness is different: we might discuss empty space, low contrast, or posture as evidence. Keeping those categories separate lets a group disagree about mood without losing track of a clear object error.

答案可以包括四项检查：一位旅人、黄色外套、一个红箱子、屋顶在指定一侧。第五项可以检查手与提手的关系。这些是可观察的要求。“安静”则不同，可以用留白、低对比或姿势作为依据。分开这些类别，大家就能讨论情绪差异，同时不忽略明确的物体错误。

## Slide 39 — Hue, lightness, and figure–background separation

25:37

Hue and lightness describe different properties of color. Yellow and red name different hues. Lightness describes how light or dark a color appears. Two visibly different hues can still be similar in lightness, making their boundary less clear in some viewing conditions.

色相和明度描述颜色的不同属性。黄色和红色是不同色相，明度描述颜色看起来有多亮或多暗。两个不同色相也可能有相近明度，在某些观看条件下，边界就不够清楚。

A grayscale version can help inspect the value structure of a composition. If a coat and the wall behind it become nearly the same gray, the silhouette may need another form of separation. Possible changes include a darker background, a lighter figure, or a controlled edge of light.

灰度图有助于检查构图的明暗结构。如果外套与身后墙壁变成相近灰色，轮廓可能需要其他分离方式，例如加深背景、提亮人物，或增加受控的边缘光。

This is a diagnostic, not a rule that every artwork must have strong contrast. Low contrast can be intentional. The useful distinction is between an intended soft boundary and a boundary that disappears accidentally. More saturated color alone does not necessarily solve a value problem.

这是检查方法，不是要求所有作品都高对比。低对比可以是有意选择。关键在于区分有意柔化的边界和意外消失的边界。单纯提高饱和度，并不一定解决明暗问题。

## Slide 40 — A transformer can remove noise

26:19

A transformer can be part of a diffusion model. Look mainly at the left side of this figure. The noisy representation is split into patches.

Transformer 可以用在扩散模型中。先看图的左边：带噪声的表示被分成小块。

The patches become tokens, pass through transformer layers, and are turned into a prediction. “Transformer” names the kind of network. “Diffusion” describes the generation approach.

这些小块变成词元，经过 Transformer 层，再转成预测。“Transformer”是网络类型，“扩散”是生成方法。

They can work together. This published diagram used class labels, such as an object category. It wasn’t originally a text-prompt model.

两者可以一起使用。这张论文原图用的是物体类别等标签，原本不是文本提示模型。

We’re using it to understand the network structure, rather than every detail of its original task.

我们用它来理解网络结构，不需要掌握它原始任务的全部细节。

The patch sequence carries both image information and position information. Without position, the same collection of patches could describe several different layouts. Transformer layers then exchange information across that sequence. This is why a transformer denoiser can connect distant parts of the picture. But full attention becomes expensive as the sequence grows. The cost is especially important for video, where adding frames also adds a time dimension to the tokens being processed.

图块序列既包含图像信息，也包含位置信息。没有位置，同一组图块可以组成不同布局。Transformer 层在序列之间交换信息，因此能连接画面中相距很远的部分。但序列越长，完整注意力越昂贵。视频还增加了时间维度，这个成本尤其重要。

## Slide 41 — Smaller patches mean more work

27:16

Smaller patches give the model more tokens to process. In full self-attention, each token is compared with every other token.

小块越小，模型要处理的词元越多。在完整的自注意力中，每个词元都要与其他词元比较。

That means the number of comparisons grows quickly. Twice as many tokens gives four times as many pairwise scores.

所以比较次数增长很快。词元数量翻倍，两两比较得到的分数数量就变成四倍。

That doesn’t mean the whole program always takes exactly four times longer. It explains why this part of the calculation can become expensive.

这并不意味着整个程序一定慢四倍，但可以解释为什么这个计算环节会很耗资源。

Take a square latent grid with sixty-four positions along each side. With four-by-four patches, it becomes sixteen by sixteen, or two hundred and fifty-six tokens. With two-by-two patches, it becomes thirty-two by thirty-two, or one thousand and twenty-four tokens. That is four times as many tokens and sixteen times as many pairwise scores in full attention. These numbers describe one attention calculation, not the total runtime of the model.

假设潜变量网格每边有 64 个位置。用 4×4 图块，会得到 16×16，也就是 256 个词元；用 2×2 图块，会得到 32×32，也就是 1024 个。词元变成四倍，完整注意力中的两两分数变成十六倍。这只是一个注意力计算的规模，不是整个模型的运行时间。

## Slide 42 — The network and the generation method

27:59

There are also different ways to generate the output. An autoregressive model predicts the next token using the tokens that came before it.

生成输出也有不同的方法。自回归模型根据前面已有的词元，预测下一个词元。

You’ve seen that idea with text: “The cup is on the…” and then a possible next word.

文字生成中就有这个过程，比如“杯子在……上”，然后预测一个可能接下来的词。

A diffusion model instead updates a noisy state over several steps. Both can use transformers.

扩散模型则经过多个步骤，更新带噪声的状态。两者都可以使用 Transformer。

So when you read a model description, separate the network it uses from the order in which it generates the result. Those names answer different questions.

阅读模型介绍时，要区分它使用什么网络，以及按什么顺序生成结果。这些名称回答的是不同问题。

Think of these as answers to two different engineering questions. The network describes how information is processed at one call. The generation method describes how those calls are arranged to produce an output. A transformer can predict the next text token, the next image token, or an update to a noisy image. Seeing the word transformer on a model page is not enough to know which process the product uses.

它们回答两个不同的工程问题。网络描述一次调用中怎样处理信息；生成方法描述怎样安排这些调用以得到输出。Transformer 可以预测下一个文字词元、图像词元，或带噪声图像的更新。因此，只看到模型介绍中的 Transformer 一词，还不能知道产品采用哪种生成过程。

## Slide 43 — Making an image one token at a time

28:40

An image can also be represented as a sequence of tokens.

图像也可以表示为一串词元。

One kind of image generator predicts those tokens one after another, using the earlier ones as context.

有一类图像生成器逐个预测这些词元，并把前面的词元作为上下文。

Once it has the sequence, another part turns it into pixels. That’s the basic idea here.

得到整个序列后，再由另一部分把它转成像素。这就是基本思路。

It doesn’t mean all image generators draw from the top-left corner to the bottom-right, pixel by pixel.

这并不意味着所有图像生成器都从左上角到右下角逐像素作画。

A sequence model learns a conditional distribution for the next token. At each position, it assigns different probabilities to possible choices. Sampling selects among those choices according to a rule. Taking the highest-probability token every time is another rule and can reduce variation. In image systems, the tokens may describe learned visual units rather than ordinary words. The order of prediction and the meaning of the tokens both matter.

序列模型学习下一个词元的条件分布，在每个位置给不同选择分配概率。采样根据某种规则选取；每次都取最高概率是另一种规则，可能减少变化。图像系统中的词元可能表示学到的视觉单元，而不是普通词语。因此，预测顺序与词元含义都很重要。

## Slide 44 — Flow matching: learning how to move

29:20

Flow matching gives us another way to describe learning a generation process. For this simple training example, imagine a path joining noise to a known image. We can pick a point on the path and ask the model to predict the direction of movement there. At generation time, the final image isn’t supplied. The model has learned directions from many training examples, and we follow its predictions. In this equation, time starts at noise and ends at the image. That is the opposite direction from the earlier equation where we added noise to an image. Keep that change of convention in mind.

流匹配提供了另一种学习生成过程的描述。训练时，可以构造从噪声通向已知图像的路径，在路径上选一个点，请模型预测该处移动方向。生成时不会提供最终图像，而是沿模型从许多训练例子学到的方向前进。这个公式中，时间从噪声走向图像，与前面向图像加噪声的时间方向相反，需要注意约定变化。

For a straight training path, write the state as one minus time multiplied by the starting noise, plus time multiplied by the target data. Differentiating with respect to time gives target data minus starting noise. That supplies a known direction for a training example. The learned field combines information across many examples; it is not handed the desired final image during generation. The choice of path and target is part of the training design.

直线训练路径可以写成：状态等于 (1−时间)×起始噪声，加上 时间×目标数据。对时间求导，就得到目标数据减起始噪声，作为已知训练方向。生成时，模型使用从大量例子学到的方向场，并不会得到目标图片。路径和预测目标都是训练设计的一部分。

## Slide 45 — Following the model’s direction

30:18

Once the model predicts a direction, we need a method for following it. A simple update takes the current state and adds the predicted direction multiplied by a small step size. Then we ask for another direction from the new state and repeat. That is the idea behind the example on this slide. Real systems can use more involved solvers. The important point is the same one we saw earlier: the model makes a prediction, and a numerical method uses it to calculate the next state.

模型预测方向后，还需要一种沿方向前进的方法。简单更新把当前状态加上“预测方向乘以小步长”，再从新状态重新预测，重复进行。真实系统可以使用更复杂的求解器，但核心相同：模型作预测，数值方法用预测计算下一个状态。

Suppose the current coordinate is two, the predicted velocity is three, and the step size is point one. Euler's update gives two plus point one times three, or two point three. Then the model evaluates the direction again at the new point. A large step can miss curvature in the field. Smaller steps can reduce that numerical error, but they require more evaluations and cannot remove an error in the learned direction itself.

当前坐标为 2，预测速度为 3，步长为 0.1，欧拉更新得到 2+0.1×3=2.3，再从新位置重新预测方向。步子太大可能忽略方向场的弯曲；小步能减少这种数值误差，却需要更多计算，而且不能消除模型方向本身的错误。

## Slide 46 — Where does randomness enter?

31:10

Randomness can enter in more than one place. There may be random noise at the start. Some samplers also add random noise during the run.

随机性可以出现在多个位置：开始时可能加入随机噪声，一些采样器还会在运行中继续加入噪声。

Others follow a fixed calculation once the starting state is fixed.

另一些采样器在起点固定后，就按固定的计算过程运行。

So a fixed sampling procedure can still produce different images if it begins from different starting values.

因此，即使采样过程固定，只要起始值不同，生成的图片仍然可以不同。

We need to know the full setup to repeat a result.

要重复一个结果，就需要知道完整的设置。

We can distinguish random initialization from random movement. An ordinary differential equation sampler can start at random noise and then follow a deterministic path. A stochastic sampler also injects randomness along the path. Both can make varied images. Deterministic here describes the path after the initial state is fixed; it does not mean that every run must start at the same state or produce the same picture.

可以区分随机起点和随机运动。常微分方程采样器可以从随机噪声出发，再沿确定路径前进；随机采样器还会沿途加入随机性。两者都能生成不同图片。“确定”描述的是初始状态固定后的路径，并不表示每次运行起点相同，或输出相同图片。

## Slide 47 — Four terms that describe different parts

31:50

This table puts the terms in order. Transformer or U-Net tells us about the network. Pixels or latents tells us what representation it works on.

这个表把术语分开了。Transformer 或 U-Net 说明网络类型；像素或潜变量说明它处理什么表示。

Diffusion or flow matching tells us about the generation training approach. The sampler or solver tells us how updates are calculated.

扩散或流匹配说明生成模型的训练方法；采样器或求解器说明如何计算更新。

Take a moment and explain one row to the person beside you. You don’t have to remember every name today.

花一点时间，向旁边的人解释其中一行。今天不需要记住所有名称。

I want you to recognize that these are different parts of a system, rather than competing names for the same thing.

我希望大家知道，它们指的是系统中不同的部分，并不是同一件事的几种竞争叫法。

A useful model description might say: transformer network, latent representation, flow-matching training, and a particular numerical solver. Those four phrases can all be true at the same time. Another model can keep three of those choices and change the fourth. This vocabulary helps us compare systems without assuming every new name describes a completely new invention. It also explains why a setting borrowed from one system may not transfer directly to another.

一个模型可以同时使用 Transformer 网络、潜变量表示、流匹配训练和某个数值求解器。另一个模型可能保留其中三项，只改第四项。分清这些术语，就不必把每个新名称都当成全新发明，也能理解为什么某个系统的设置不能直接搬到另一个系统。

## Slide 48 — Different seeds can give different pictures

32:45

A seed sets the starting point for a repeatable sequence of random numbers.

种子设定一串可重复随机数的起点。

Changing it can give us a different starting state, and that can lead to a different picture.

更换种子可以改变初始状态，从而得到不同图片。

These illustrations show the kind of composition changes we might care about. They aren’t measured outputs from particular seed values.

这些插图展示了我们可能关心的构图变化，并不是某些具体种子值的实测输出。

A seed number has no fixed artistic meaning. Seed forty-two doesn’t mean “wide shot,” and forty-three doesn’t mean “slightly wider.” Use seeds to explore alternatives.

种子数字没有固定的艺术含义。42 不代表“远景”，43 也不代表“更远一点”。种子可以用来探索不同结果。

Use instructions or references when you need a particular layout.

需要特定构图时，请使用明确的指令或参考图。

A seed is an address into a repeatable random process, not an instruction about appearance. Adjacent seed numbers do not have to produce adjacent compositions. If we want to study guidance, the useful arrangement is several guidance values crossed with the same seed list. Each seed then supplies a matched starting condition. If we only change the seed until one image looks good, we have selected a result rather than measured the effect of guidance.

种子是在可重复随机过程中确定起点的编号，不是外观指令。相邻种子不一定产生相似构图。研究引导时，可以让多个引导值使用同一组种子，每个种子提供匹配的起始条件。如果只是不断换种子直到图片好看，那是在挑选结果，而不是测量引导的影响。

## Slide 49 — How to repeat a result

33:39

To repeat a result, keep more than the seed. Save the model, prompt, references, and other settings.

要重复结果，光保存种子还不够，还要保存模型、提示词、参考图和其他设置。

If you’re doing a comparison in code, reset the random generator before each matched run. Otherwise, it may simply continue to the next random numbers.

用代码做对照实验时，每次对应运行前都要重置随机数生成器，否则它可能接着用下一批随机数。

Exact matching can also depend on the software and hardware. The seed is part of the record, not the whole record.

能否完全重复还可能受软件和硬件影响。种子只是记录的一部分，并不是全部。

Software can change the sequence even when a displayed seed stays the same. A new sampler, another model revision, or a different random-number implementation can alter the computation. For a class experiment, a saved workflow file is often more useful than a screenshot of the seed box. Record the model version and the full input settings, then keep the actual outputs together with that record.

显示的种子不变，软件变化仍可能改变计算过程。新采样器、不同模型版本或随机数实现，都可能产生影响。课堂实验中，保存工作流文件通常比只截取种子输入框更有用。记录模型版本和完整输入设置，并把实际输出与记录一起保存。

## Slide 50 — Character continuity: shape, costume, and props

34:19

For a story, we often need the same character in several shots.

讲故事时，我们经常需要同一个角色出现在多个镜头里。

Decide which features must stay: the coat, the hair, the suitcase, perhaps which hand is holding it.

先决定哪些特征必须保留：外套、头发、行李箱，也可能包括用哪只手提着它。

The camera angle and pose can change while those features remain recognizable. A repeated seed doesn’t provide a full character description.

机位和姿势可以改变，但这些特征仍要能被认出来。重复使用一个种子，不能完整定义一个角色。

References can help, but we still need to compare the actual images and catch changes that break the scene.

参考图可以帮助保持一致，但仍要逐张比较，找出会破坏场景连贯性的变化。

Character continuity has several levels. The silhouette can stay recognizable while the face changes. The face can remain similar while the coat gains an extra pocket. A prop can keep its color but switch hands between shots. A character sheet makes those separate requirements visible. It is especially useful before a sequence is generated, because it defines what must remain stable instead of leaving every shot to invent those details again.

角色连续性有多个层次：轮廓仍可辨认，脸却变了；脸很像，外套却多了口袋；道具颜色不变，却换了一只手。角色设定表把这些要求分开呈现。生成一组镜头之前先定义稳定细节，可以避免每个镜头都重新发明这些部分。

## Slide 51 — A character sheet defines what must stay

34:59

A character sheet defines the stable features of a subject across views. This illustration shows one costume and prop from three directions. Its purpose is to make the requirements visible before generating a sequence, rather than inventing those requirements after the shots are complete.

角色设定表定义主体在不同视图中需要保留的特征。这里用三个方向展示同一服装与道具，目的是在生成序列之前明确要求，而不是镜头完成后才决定哪些细节应该稳定。

The silhouette includes coat length, shoulder shape, and overall proportions. Surface details include buttons, pockets, hair, and the prop's shape. Ownership includes which hand carries the prop. These features have different visibility in a front view, side view, and back view.

轮廓包括外套长度、肩部形状和整体比例；表面细节包括纽扣、口袋、头发和道具形状；归属关系包括哪只手拿道具。这些特征在正面、侧面和背面的可见程度不同。

A reference method can help preserve these features, but the reference should also be internally consistent. If two source images disagree about the costume, the generator receives conflicting evidence. A clean reference set reduces that ambiguity. It does not guarantee that every new view will be correct.

参考方法有助于保留特征，但参考本身也要一致。如果两张源图的服装冲突，模型就会收到矛盾信息。清楚的参考集能减少歧义，却不保证每个新视图都正确。

For evaluation, distinguish legitimate view changes from identity drift. The visible side of a suitcase should change when the camera moves. Its handle should not switch construction for no reason. This distinction allows variation while keeping the subject recognizable.

评价时，要区分合理视角变化与身份漂移。镜头移动时，箱子可见的侧面应该改变，但提手结构不应无故变化。这样才能允许变化，同时保持主体可辨认。

## Slide 52 — Guidance: how strongly to follow the prompt

35:58

Now we can look at guidance. In classic classifier-free guidance, we compare a prediction made with the condition to one made without it.

现在来看引导。在经典的无分类器引导中，我们比较有条件和无条件时的两个预测。

The condition might be a text prompt or a category label. Guidance pushes the result further in the direction of that difference.

条件可以是文本提示，也可以是类别标签。引导沿着两个预测的差异方向，把结果推得更远。

This can make the requested subject more obvious. But turning up the strength doesn’t make the instruction more precise.

这可能让指定的主体更明显，但提高强度并不会让指令变得更精确。

If the model’s direction is imperfect, a stronger push can make that problem more visible too.

如果模型给出的方向不够准确，更强的推动也可能让问题更明显。

During the classic training setup, the condition is sometimes dropped. That allows the same network to learn predictions with and without that information. At sampling time, the difference between those predictions supplies a direction for guidance. This connects a training choice to a user-facing control. The strength slider is not a universal measure of how well a model understands language; it controls a particular combination of predictions.

经典训练方法会有时去掉条件，使同一个网络同时学会有条件和无条件预测。采样时，两种预测之差提供引导方向。这把训练选择与用户控制项联系起来。强度滑块不是衡量语言理解能力的通用分数，而是控制预测的某种组合。

## Slide 53 — How guidance combines two predictions

36:40

You can read this formula in words. Start with the prediction without the prompt. Then add a scaled difference between the prompted and unprompted predictions.

这个公式可以用一句话来读：从无提示预测出发，加上有提示和无提示预测之差的某个倍数。

At a scale of one, this formula gives us the prompted prediction. Above one, we push beyond it. We aren’t simply averaging two answers.

系数为 1 时，得到有提示的预测；大于 1 时，就沿这个方向继续往外推。这不是简单取平均。

Different papers and tools sometimes use different numbering.

不同论文和工具有时会使用不同的数值定义。

In the paper we’ll use for the later exercise, their guidance number is shifted by one compared with this formula.

稍后练习所用的论文中，引导数值的定义与这个公式相差 1。

That’s why we should check the definition before comparing values.

所以比较数值之前，先检查它的定义。

The direction in this formula lives in a high-dimensional numerical space. It is not a single slider for yellow, sharpness, or realism. Several visual properties can change together when the scale changes. The one-number example on the next slide is useful precisely because it shows extrapolation clearly: we start from one prediction and continue past the other. In a full image, that happens across many coordinates at once.

公式中的方向位于高维数字空间，并不是专门控制黄色、锐度或真实感的单一滑块。改变系数时，多个视觉属性可能一起变化。下一页的一维例子清楚展示了外推：从一个预测出发，越过另一个预测。在完整图像中，这会同时发生在许多坐标上。

## Slide 54 — A small guidance calculation

37:34

Let’s make the guidance formula concrete with one number. Suppose the unprompted prediction is two and the prompted prediction is three. Their difference is one. At guidance scale one, we get two plus one, which is three. At scale four, we get two plus four, which is six. We have moved beyond the prompted prediction rather than taking an average between two and three. Those are made-up values for one coordinate, not actual image measurements. They show why a larger guidance scale can exaggerate a direction.

用一个数字说明引导公式。假设无提示预测是二，有提示预测是三，差值为一。系数为一时，结果是二加一，等于三；系数为四时，结果是二加四，等于六。结果越过了有提示预测，不是二与三之间的平均值。这些是假设的一维数字，不是真实图像测量，用来说明大系数如何放大方向。

The scale-four result is outside the interval between two and three. That is why guidance can amplify a feature rather than merely blend two plausible answers. The numerical space has many coordinates, so several properties can be amplified together. A lower scale can be useful when that amplification damages color or detail. The actual setting still depends on the model's training and the exact guidance convention used by the software.

系数为 4 时，结果超出了 2 到 3 的范围，所以引导会放大特征，而不只是混合两个合理答案。数字空间有很多坐标，因此多种属性可能同时放大。放大破坏颜色或细节时，较低系数可能有用；具体设置仍取决于模型训练和软件的引导定义。

## Slide 55 — What can go wrong with strong guidance?

38:27

Look at what happens to appearance when guidance becomes stronger. The subject may be easier to recognize.

看看引导变强后，外观会怎样变化。主体可能更容易辨认。

But colors can become too strong, some details can look strange, and different samples may become more alike. Whether that is useful depends on the work.

但颜色也可能过强，细节变得奇怪，不同样本越来越相似。是否有用，要看作品需要什么。

A bold poster and a quiet scene may need different choices. These are examples from a published study using image categories.

醒目的海报和平静的场景，可能需要不同选择。这些是论文中以图像类别为条件的示例。

They show a tradeoff worth checking. They don’t give us one best number for every current image model.

它们展示了值得检查的取舍，但不能给所有当前模型提供一个通用的最佳数值。

In an illustration, exaggerated contrast can make the silhouette read clearly at a small size. The same contrast may destroy a soft transition needed for fog or dusk. We should therefore distinguish an artifact from an intentional graphic effect. The problem is not strong color by itself. The problem is losing control over which shapes are emphasized and whether the effect remains consistent with the intended image.

插画中，夸张对比可能让小尺寸下的轮廓更清楚；同样的对比也可能破坏雾气或黄昏所需的柔和过渡。因此，要区分意外错误和有意的图形效果。问题不在于颜色强烈本身，而在于是否还能控制被强调的形状，以及效果是否符合创作目的。

## Slide 56 — How a negative prompt can help

39:20

A negative prompt changes the comparison in some image generators.

在一些图像生成器中，负面提示词会改变比较的另一端。

Instead of comparing with an empty prompt, the system can compare with the words in the negative prompt.

系统可以把负面提示中的文字作为比较对象，代替空提示。

The calculation then pushes away from that prediction and toward the positive one. But it isn’t an exact removal tool.

计算会远离这个预测，朝正面提示的预测方向移动。但它不是精确的删除工具。

Writing “people” in a negative prompt doesn’t guarantee an empty room. If something unwanted remains, inspect it and try a clear change.

负面提示写“人”，并不保证房间里没有人。如果仍有不想要的内容，就检查结果，再作出明确修改。

Adding a very long list of negative words can make it harder to tell which part helped.

堆上一长串负面词，反而会更难判断到底哪一项起了作用。

A negative prompt changes a conditioning input; a mask defines a spatial region. They solve different problems. If the unwanted element is one sign in the corner, a local edit may give more direct control than a long list of negative terms. If the unwanted tendency appears across the entire picture, changing the prompt or the model settings may be more relevant. Choose the control that matches the location and scale of the problem.

负面提示改变条件输入，蒙版定义空间区域，两者解决不同问题。如果只是不想要角落的一块标牌，局部编辑可能比长串负面词更直接；如果整张图都有不想要的倾向，改提示或模型设置可能更合适。控制方式应与问题的位置和范围对应。

## Slide 57 — Three guidance settings

40:15

Here are three published examples at different guidance settings. The request describes an astronaut in a jungle, with cold, muted colors.

这里是论文中三个不同引导设置的示例。提示描述的是丛林中的宇航员，要求冷色、低饱和度。

Look at the color, the size of the subject, and the feeling of the surroundings.

看看颜色、主体大小，以及周围环境带来的感觉。

There’s something missing from this comparison: the displayed examples don’t document matched seeds.

这个比较缺少一项信息：图中的示例没有记录是否使用了对应的相同种子。

So we can describe the differences, but we can’t confidently say that guidance caused every one of them. Keep that distinction in mind.

所以我们可以描述差异，却不能确定每一处差异都由引导造成。请记住这个区别。

A useful-looking comparison still needs a clear record of what changed.

即使比较看起来很有用，也要清楚记录改变了什么。

This is also a useful lesson about published figures. A page can show striking differences without providing every setting needed to reproduce them. We should not fill those gaps with assumptions. We can say that one example has stronger color or a larger subject. To attribute those differences to a single variable, we would need the missing controls. Description is valid evidence of appearance; causal explanation requires a stronger comparison.

这也是阅读论文图片的一课。页面可能展示明显差异，却没提供复现所需的全部设置，不能自行补全这些空缺。我们可以说某张颜色更强、主体更大；若要归因于一个变量，则需要缺失的控制信息。外观描述是一类证据，因果解释需要更严格的比较。

## Slide 58 — Discussion 3: Clear subject, wrong mood

41:10

The coat is yellow, but the picture feels harsh and crowded.

外套是黄色的，但画面感觉生硬、拥挤。

It shows the right object, yet the mood is wrong. With a partner, describe how you would test different guidance settings. What would you keep fixed?

物体正确，情绪却不对。和同伴讨论如何测试不同的引导设置。哪些条件保持不变？

What would you look for in the results? Now talk about judgment. How would you explain that one version feels quieter or less crowded?

你会在结果中检查什么？再谈谈判断：怎样解释某一版更安静或不那么拥挤？

Name something visible, such as contrast, figure size, or the space around the traveler.

请指出可见的内容，比如对比度、人物大小，或者旅人周围的空间。

Consider two possible changes. Lowering guidance tests whether the harsh colors depend on that prediction combination. Making the traveler smaller tests composition instead. If we do both at once, the result may improve, but the explanation becomes unclear. A useful pair exercise is to give each person one of those changes, keep the starting conditions matched, and compare which visible problem each change actually addresses.

考虑两种改动：降低引导，测试生硬颜色是否与预测组合有关；缩小旅人，测试构图。两者同时做，结果可能改善，却难以解释。两人可以分别测试一种改动，保持起始条件匹配，再比较每项改动真正解决了哪个可见问题。

## Slide 59 — What should we compare?

41:50

For that test, keep the model, prompt, image size, sampler, and step count fixed. Change guidance, and use the same set of seeds at each value.

测试时，保持模型、提示词、图像尺寸、采样器和步数不变。只改变引导，并在每个数值下使用同一组种子。

Several seeds are better than one, because a setting may work well for one starting point and poorly for another.

多个种子比一个更好，因为某个设置可能只对某个起点表现好，对另一个却不好。

Then compare separate things: whether the image shows what we asked for, whether we like its appearance, and whether the set gives us useful variety.

然后分开比较：是否画出了要求的内容、外观是否合适，以及整组结果是否有用地呈现了不同选择。

You may find that no single setting wins on every question.

你可能会发现，没有任何一个设置在所有方面都最好。

A small two-factor experiment might use three guidance values and four seeds, giving twelve images. Every guidance value appears with every seed. That layout separates a setting effect from a lucky starting point more clearly than three unrelated favorite images. We can then mark prompt errors, visible artifacts, and composition changes in separate columns. Twelve is only a classroom example, not a statistically sufficient sample for every research claim.

一个小实验可以用三个引导值和四个种子，共十二张图片，让每个引导值都与每个种子配对。这比三张无关的精选图更容易区分设置效果和偶然起点。再分别记录提示错误、可见瑕疵和构图变化。十二只是课堂示例，不代表足以支持所有研究结论。

## Slide 60 — 15 steps and 50 steps

42:31

Now compare fifteen steps with fifty steps. These are two completed runs from an older Stable Diffusion example. The prompt and seed were kept the same.

现在比较 15 步和 50 步。这是较早的 Stable Diffusion 示例中两次已经完成的运行，提示词和种子相同。

They aren’t two snapshots taken during one run. Look at the horse and the astronaut’s clothing. What changed? Which changes would you actually call improvements?

它们不是同一次运行中的两张过程图。看看马和宇航员的衣服。哪里变了？哪些变化才算改善？

More steps give a different generation path. They can help, but they don’t guarantee that every object becomes more correct.

更多步骤意味着不同的生成路径。它可能有帮助，但不保证每个物体都更正确。

And this older example doesn’t tell us that a newer model should use fifty steps.

这个旧示例也不能说明新模型就应该使用 50 步。

More updates can reduce numerical approximation error for a suitable solver and model. But the learned prediction can still be wrong. Taking a more accurate route through an imperfect learned field does not guarantee the object count or anatomy is correct. This separates two sources of error: how well we follow the model, and how well the model represents the desired images. Increasing steps mainly addresses the first computation, not every limitation of the second.

对合适的求解器和模型，更多更新可能减少数值近似误差，但模型本身的预测仍可能错误。更准确地沿着一个不完美的预测方向前进，不保证物体数量或身体结构正确。这里要区分：执行模型预测的误差，以及模型表示目标图像的误差。增加步数不能解决后者的所有局限。

## Slide 61 — Steps and sampler: two different settings

43:27

Step count tells us how many updates to take.

步数告诉我们进行多少次更新。

The sampler tells us how to calculate those updates, and the schedule tells us which noise levels to visit.

采样器决定怎样计算更新，调度方案决定经过哪些噪声水平。

Those are related choices, but they aren’t the same choice. Think about following a route.

这些选择彼此相关，但并不是同一个选择。可以想象沿着一条路线前进。

The number of stops doesn’t tell you where the stops are or how you travel between them. If you’re comparing speed, measure the actual time.

只知道停靠次数，并不知道在哪里停、怎样移动。比较速度时，要测量实际耗时。

A displayed step can involve different amounts of work in different systems, so step count alone isn’t enough.

不同系统中，一步所需的计算量可能不同，所以不能只看步数。

Some numerical methods ask for more than one model prediction to calculate a single update. Others reuse information from earlier predictions. This is why a comparison based only on a visible step count can be misleading. For an experiment, report both the settings and elapsed time. For a software implementation, the number of network evaluations is another useful measure because the network often accounts for much of the work.

一些数值方法计算一次更新时需要多个模型预测，另一些会复用之前的信息。因此，只比较界面上的步数可能误导。实验应同时记录设置和实际耗时；实现层面还可以记录网络评估次数，因为网络往往占据大量计算成本。

## Slide 62 — A progress picture or a finished result?

44:19

A progress image comes from partway through one run. A step-count comparison uses separate runs that each finish.

过程图来自一次运行的中途；步数比较则是多次分别完成的运行。

That difference matters because changing the total step count may also change the schedule from the beginning.

这个区别很重要，因为总步数改变后，从第一步开始的调度方案也可能改变。

A finished fifteen-step image isn’t necessarily what a fifty-step run looks like after its fifteenth step.

完成的 15 步图片，不一定等于 50 步运行到第 15 步时的样子。

So, when you show a comparison in your work, label it clearly. Are we watching a single image develop, or comparing finished results from different settings?

展示比较时，请标清楚：是在看一张图片逐渐生成，还是在比较不同设置的最终结果？

Those pictures answer different questions.

这两类图片回答的是不同问题。

Imagine one run visits twenty noise levels and another visits fifty. Their fifteenth updates may occur at different noise levels, so comparing those intermediate states does not compare equal points in the process. A progress sequence should identify its own run. A final-result grid should identify the full settings of each completed run. This makes the figure answer a clear question rather than mixing two different kinds of evidence.

假设一次运行经过二十个噪声水平，另一次经过五十个。它们的第十五次更新可能位于不同噪声水平，因此不是同一阶段。过程图应标明所属运行，最终结果网格应记录每次完整设置，避免把两种不同证据混在一起。

## Slide 63 — Generation cost: count model evaluations

45:13

Step count is not always the same as computational cost. In classic classifier-free guidance, one update uses a conditional prediction and an unconditional prediction. With twenty sampling steps and one pair per step, the simple count is forty network evaluations.

步数不总等于计算成本。经典无分类器引导的一次更新使用有条件和无条件两个预测。二十步、每步一对预测，简单计算就是四十次网络评估。

An implementation may batch the pair together. That can reduce elapsed time compared with two separate calls, but it does not turn the calculation into one unconditioned prediction. A different solver may request more evaluations, while a distilled model may implement guidance differently.

实现可以把这对预测合批计算，相比两次单独调用可能更快，但计算内容仍然不同于一次无条件预测。其他求解器可能需要更多评估，蒸馏模型也可能采用不同的引导方式。

For an interactive display, the relevant time is the complete wait from input to visible result. It includes text encoding, sampling, decoding, and any additional processing. Image size, model size, and hardware also affect that wait. Report measured seconds when comparing speed, alongside the sampler and step settings.

互动显示真正相关的是从输入到可见结果的完整等待，包括文字编码、采样、解码和额外处理。图像尺寸、模型大小与硬件都会影响耗时。比较速度时，应同时报告实测秒数、采样器和步数。

## Slide 64 — Some models need only a few steps

45:56

Some models are trained specifically to work with very few steps. SD-Turbo is an example.

一些模型专门训练成只需要很少步骤，SD-Turbo 就是一个例子。

Its documented text-to-image setup uses one to four steps and turns off the usual classifier-free guidance.

它的文生图文档设置使用 1 到 4 步，并关闭常规的无分类器引导。

That is a property of this trained model and its intended setup.

这是这个模型经过训练后，在其预期设置中的特性。

We can’t take those settings and assume they work the same way in an older model.

不能直接把这些设置搬到旧模型上，就认为会有同样效果。

The training process called distillation helps a model learn a shorter generation process.

一种叫作蒸馏的训练方法，可以帮助模型学会更短的生成过程。

For our purposes, remember this: a model trained for one step is different from simply stopping another model after one step.

记住：训练成一步生成的模型，与把另一个模型运行一步就停下来，是不同的。

Distillation changes what the model learns to do in a limited number of calls. It may train a student using information from a more expensive teacher or use related objectives to shorten generation. The resulting model can have a different recommended sampler and guidance behavior. We should use its documented operating range first. A one-step model and a fifty-step model are different trained systems, not simply the same system with different patience.

蒸馏改变模型在有限调用次数内学会完成的任务。它可能利用高成本教师模型的信息训练学生，也可能使用相关目标缩短生成过程。得到的模型可能需要不同采样器和引导设置，应先遵循文档范围。一步模型与五十步模型是不同的训练系统，不只是同一系统运行时间不同。

## Slide 65 — Changing the model

46:52

Changing the model can change much more than the appearance. The training images, network, text encoder, and training method may all differ.

换模型可能改变的不只是外观。训练图片、网络、文本编码器和训练方法都可能不同。

Even a setting with the same name may behave differently. For your own work, decide what you’re comparing.

即使设置名称相同，作用也可能不同。在自己的作品中，先决定究竟要比较什么。

Are you asking which complete tool helps you make the scene? Or are you asking which technical change caused an improvement?

你想知道哪个完整工具更适合制作场景？还是想知道哪一项技术变化带来了改善？

The first is a useful design question. The second needs a more careful experiment.

前者是有用的设计问题，后者则需要更严谨的实验。

One favorite picture from each model won’t tell us very much about either.

每个模型只挑一张最喜欢的图片，无法充分回答任何一个问题。

There is also a difference between comparing models and comparing complete workflows. A workflow may include a better reference interface, automatic resizing, a face repair stage, or an upscaler. Those extra stages can matter to a designer even if the base model is unchanged. If the question is which tool helps finish the poster, include them. If the question is which network change improved quality, separate them from the model comparison.

比较模型与比较完整工作流也不同。工作流可能包括更好的参考界面、自动缩放、人脸修复或放大阶段。即使基础模型不变，这些环节对设计师也很重要。研究哪个工具更适合完成海报时应考虑它们；研究哪项网络改动提升质量时，则要把它们分开。

## Slide 66 — LoRA: change fewer model parameters

47:46

LoRA represents a weight update as the product of two smaller matrices. The base weight remains available, and the learned product supplies an adjustment. The rank sets the intermediate size of that factorization. A smaller rank reduces the number of values being trained, but also limits the form of the update.

LoRA 把权重更新表示为两个较小矩阵的乘积，在基础权重上加入学到的调整。秩规定中间维度；较小的秩减少训练数值数量，也限制更新形式。

For one weight matrix of one thousand by one thousand, a full update contains one million values. With rank eight, the two factors contain eight thousand values each. Their total is sixteen thousand, which is sixty-two and a half times fewer for this particular matrix.

对于一个 1000×1000 权重矩阵，完整更新有一百万个数值。秩为 8 时，两个因子各有八千个，总计一万六千，比这个矩阵的完整更新少 62.5 倍。

That calculation does not describe every parameter in a real model. It explains the saving for one adapted weight. A style or subject LoRA must still match the base model it was trained for. Rank, training data, and where the update is applied can all affect what it learns.

这个计算不是实际模型的全部参数，只解释一个权重的节省。风格或主体 LoRA 仍需匹配训练时的基础模型。秩、训练数据和更新位置都会影响学到的内容。

## Slide 67 — Reference input or learned subject adaptation?

48:27

Reference conditioning and subject adaptation are different approaches. IP-Adapter supplies image features through a learned image-conditioning pathway, with text and image attention separated. Once the adapter is trained, supplying a new reference image does not require training a new adapter for that subject.

参考条件输入与主体适配是不同方法。IP-Adapter 通过学到的图像条件通道输入特征，将文字和图像注意力分开。适配器训练好后，输入新参考图不需要为这个主体重新训练。

DreamBooth instead fine-tunes a text-to-image model using examples of a particular subject. It associates that subject with a special identifier so the subject can be requested in other contexts. The training step is part of the method, rather than just a reference supplied during one generation.

DreamBooth 则用特定主体的例子微调文生图模型，将主体与特殊标识关联，使它能在其他场景中被调用。训练是方法的一部分，不只是生成时临时提供参考图。

LoRA names a compact way to parameterize a weight update. It is not itself a particular character or style. These ideas can be combined, so the categories are not always mutually exclusive. The important distinction is which information enters during generation and which information has changed the learned weights.

LoRA 是紧凑表示权重更新的方法，本身不是某个角色或风格。这些方法可以组合，类别不一定互斥。重点是分清：哪些信息在生成时输入，哪些信息已经改变了模型权重。

## Slide 68 — ControlNet: edges, depth, and pose

49:22

ControlNet adds spatial conditioning to a pretrained text-to-image diffusion model. The original paper studies controls such as edges, depth, segmentation, and human pose. These maps specify structure in a form that is more explicit than a general appearance description.

ControlNet 为预训练文生图扩散模型加入空间条件。原论文研究边缘、深度、分割和人体姿态等控制图，以比一般外观描述更明确的形式规定结构。

An edge map can preserve a building outline without fixing its material. A depth map can communicate near and far surfaces without specifying exact color. A pose map can locate joints while leaving costume and facial detail open. The choice of map depends on which property needs control.

边缘图可以保留建筑轮廓而不固定材质，深度图表达表面远近而不规定颜色，姿态图定位关节而保留服装与脸部细节的自由。应该根据需要控制的属性选择控制图。

The added network is trained to use that spatial information alongside the text condition. A control image is not simply pasted into the output. It affects the learned generation process. Structure can become easier to specify, while identity, texture, and fine geometry still need their own checks.

附加网络经过训练，把空间信息与文字条件一起使用。控制图并不是直接贴进输出，而是影响生成过程。结构因此更容易规定，但身份、纹理和精细几何仍需单独检查。

## Slide 69 — Starting with a drawing

50:04

We don’t always have to begin with random noise. We can begin with a drawing.

生成并不总要从随机噪声开始，也可以从一张画开始。

In one common approach, the system represents the drawing, adds some noise, and then generates from that starting point.

一种常见做法是先表示这张画，加入一些噪声，再从这个起点生成。

The original image still gives it some structure to work with. One stays close to the starting layout. Another makes larger changes.

原图仍提供了一些结构。一个接近原来的布局，另一个改动更大。

Before choosing a result, decide what you wanted to preserve. Was it the pose? The roof line? The empty space?

选择结果之前，先决定想保留什么：姿势、屋顶线条，还是留白？

A more detailed image may still lose the part of the drawing you cared about most.

细节更多的图片，也可能丢掉你最在意的那部分原画。

A sketch is especially useful for shape and placement because it can show relations that would take many words to describe. The outline of a roof, the size of the figure, and the gap between the suitcase and bench can be visible at once. However, a rough sketch may not specify lighting or material. The generator still makes choices in those areas. Preserving structure and inventing appearance are therefore different parts of this task.

草图能同时显示形状和位置，例如屋顶轮廓、人物大小，以及箱子与长椅的间距，这些关系用文字可能很难描述。但粗略草图未必规定灯光或材质，模型仍需在这些部分作出选择。因此，保留结构与创造外观是不同任务。

## Slide 70 — Editing strength: preservation and change

50:58

In this kind of image editing, less added noise often leaves more of the starting image in place. More noise usually allows larger changes.

在这种图像编辑中，加入的噪声较少，通常会保留更多原图；噪声较多，通常允许更大的改动。

But the prompt and model still matter, and the meaning of a “strength” setting depends on the tool.

但提示词和模型仍然重要，而且“强度”的含义取决于具体工具。

For our sketch, I would first decide what must stay.

对于这张草图，我会先决定什么必须保留。

If the traveler’s position is important, I’d compare that position across results before judging the clothing texture.

如果旅人的位置很重要，我会先比较位置，再判断衣服纹理。

That gives me a clear reason to keep or reject an edit, instead of just choosing the most detailed one.

这样就有明确的理由接受或放弃一个修改，而不是只挑细节最多的版本。

There is a tension between fidelity to the starting drawing and freedom to change it. If the starting pose is wrong, preserving it too strongly can preserve the mistake. If the pose is right, adding too much noise may remove the feature we wanted to keep. A useful comparison uses the same drawing at several strengths and names the exact structures to preserve before choosing a result.

忠于原画与自由修改之间存在取舍。起始姿势错误时，保留太强会保留错误；姿势正确时，噪声过多又可能破坏想留下的结构。可以用同一张画测试多个强度，并在选择前明确需要保留哪些结构。

## Slide 71 — Local editing starts with a mask

51:49

A mask specifies where an image edit is allowed to appear. In simple compositing, a value of one selects the edited image and a value of zero selects the original. Values between zero and one blend the two. The formula on the slide describes this blending operation.

蒙版规定图像编辑出现的位置。简单合成中，1 选择编辑图，0 选择原图，中间值混合两者。页面公式描述的就是这种混合操作。

For a pixel with a mask value of one quarter, the composite uses one quarter of the edit and three quarters of the original. This can create a soft transition at an edge. But a wide soft boundary can also create a halo or mix incompatible lighting.

某像素蒙版值为四分之一时，合成使用四分之一编辑图和四分之三原图，可以在边缘形成柔和过渡。但过宽的软边也可能产生光晕，或混合不一致的灯光。

An inpainting model uses a region specification as part of generation. That is different from directly compositing a finished edit with the original pixels. Some tools may alter unmasked areas internally. If exact preservation matters, compare the output outside the region or explicitly retain the original there.

修复模型把区域规定作为生成输入，这与把完成的编辑直接合成到原像素上不同。一些工具内部仍可能改变未蒙版区域。需要精确保留时，应比较区域外的输出，或明确使用原图像素。

The art problem remains at the boundary. The repaired region needs compatible perspective, edge treatment, color, and light. A technically correct mask can still produce an obvious pasted-on result if those properties do not agree.

艺术问题仍集中在边界。修复区域需要一致的透视、边缘处理、颜色和光线。即使蒙版技术上正确，这些属性不一致，仍会显得像贴上去的。

## Slide 72 — A layered image-editing workflow

52:49

A layered workflow assigns different tasks to different operations. Composition can begin with a sketch, depth map, or other spatial reference. Image generation supplies appearance and detail. A local mask can repair one region. Color adjustment and typography can remain in editable layers.

分层工作流把不同任务交给不同操作。构图可从草图、深度图或空间参考开始；生成提供外观与细节；局部蒙版修复区域；颜色调整和文字可保留在可编辑图层中。

This is particularly useful when exact lettering or alignment matters. A poster title can be typeset independently of its background. An edited prop can be composited over a generated base. The final image may therefore combine generated and directly controlled elements.

精确文字或对齐很重要时，这种方式尤其有用。海报标题可以独立排版，道具修改可以合成到生成底图上，最终图像因此结合了生成元素与直接控制的元素。

The technical connection is preservation. If every revision regenerates the whole image, all regions can change. A layered edit limits the scope of the revision. It still requires checking edge seams, lighting, and color consistency. Keeping the base, masks, and final composite makes the work easier to revise later.

技术上的关键是保留。每次都重新生成整图，所有区域都可能变化；分层编辑限制了修改范围，但仍需检查接缝、灯光和颜色一致性。保留底图、蒙版和最终合成，便于后续修改。

## Slide 73 — A video needs to stay consistent

53:33

A video adds another problem: things need to remain consistent over time. In the top row, the coat and suitcase keep their appearance across shots.

视频增加了一个问题：事物需要随时间保持一致。上排中，外套和行李箱在不同镜头里保持了外观。

In the bottom row, they change. Each frame could look acceptable on its own, but together they break the scene.

下排中，它们发生了变化。每帧单看可能都不错，放在一起却破坏了场景的连贯性。

Video models can use information across frames.

视频模型可以使用跨帧的信息。

Even so, you still need to watch for disappearing objects, changing faces, or walls that bend during a camera move.

即便如此，仍要留意物体消失、人脸改变，或者镜头移动时墙壁弯曲等问题。

These rows are illustrations of those problems. They aren’t test results from a particular video model.

这些图用来说明问题，并不是某个视频模型的测试结果。

The question is what we would check when watching a real output.

关键是：看真实输出时，我们应该检查什么？

Temporal consistency has several meanings. Object identity concerns whether the same person or prop stays recognizable. Geometric consistency concerns whether surfaces keep their shape and position. Motion consistency concerns how positions change between frames. A model can succeed at one and fail at another. For example, a face can remain recognizable while the wall behind it bends. Separating those errors makes a video comparison more informative than a single realism score.

时间一致性有几种含义。身份一致性关注人物或道具能否持续辨认；几何一致性关注表面形状和位置；运动一致性关注位置如何随帧变化。模型可能做好一项，却在另一项失败，例如脸始终可辨认，身后的墙却弯曲了。分开这些错误，比单一真实感分数更有信息。

## Slide 74 — 2026: Text inside pictures

54:32

Let’s look at some examples from 2026. Google’s Nano Banana 2 includes image text and translation features.

来看看 2026 年的一些例子。Google 的 Nano Banana 2 包含图中文字和翻译功能。

This published example shows a sign being changed for another language. For a designer, that could help when trying different poster versions.

这个官方示例把标牌改成了另一种语言。对设计师来说，它可能有助于尝试不同版本的海报。

But changing the language can also change the length of the text, the line breaks, and how the page feels.

但更换语言也会改变文字长度、换行和版面的感觉。

So I would check more than whether letters appeared. I’d read every word, check the meaning, and look at the spacing.

所以不能只检查有没有出现字母，还要逐字阅读、核对意思，并检查间距。

In a station scene, the same issue applies to signs, tickets, and notices.

我们的车站场景中的标牌、车票和告示，也有同样的问题。

Typography has both language requirements and visual requirements. A sign can spell the words correctly but use poor spacing. It can also look balanced while changing an important word. For a poster, separate text accuracy, line breaks, alignment, and hierarchy. Generating lettering inside an image can help develop a concept. For a final layout that needs exact wording, editable text remains useful because a correction does not require generating the entire image again.

字体排版同时有语言和视觉要求。标牌文字可能正确，间距却不好；也可能版面平衡，却改了一个重要词。海报应分开检查文字准确性、换行、对齐和层级。图内生成文字可以帮助构思，最终版保留可编辑文字则便于修改，不必重新生成整张图。

## Slide 75 — 2026: Keeping characters recognizable

55:28

Another useful development is keeping characters recognizable across a sequence. This is Google’s published storyboard example.

另一个有用的发展，是让角色在一组画面中保持可辨认。这是 Google 发布的分镜示例。

Look at the recurring characters as their poses and positions change. That’s closer to what we need for a story than making one attractive image.

看看反复出现的角色，虽然姿势和位置变了，仍能认出来。这比单张漂亮图片更接近讲故事的需要。

We need enough variation for different shots while keeping the character recognizable.

不同镜头需要变化，同时角色仍要让人认得出。

For the character, I’d compare the shape of the coat, the hair, and the suitcase. Google reports improved consistency, but we should still inspect each shot.

对于我们的旅人，我会比较外套形状、头发和行李箱。Google 报告一致性有所改善，但我们仍需逐镜头检查。

A character can look similar at first glance while a small change becomes distracting when we cut between images.

角色乍看相似，但切换画面时，一点小变化也可能很显眼。

Subject consistency is also different from pixel identity. A character viewed from behind should not have the same pixels as a front view. The goal is to preserve the features that identify the subject while allowing a physically and visually plausible change of view. In a storyboard, compare costume construction, body proportions, and prop ownership. A repeated face alone is not enough to make the whole sequence continuous.

主体一致性不等于像素相同。背面与正面本来就不应有相同像素。目标是在视角合理变化时，保留识别主体的特征。分镜中应比较服装结构、身体比例和道具归属。仅仅重复一张脸，不足以让整组镜头保持连续。

## Slide 76 — September 2026: GPT Image 2.5

56:25

The official OpenAI documentation lists September eighth, twenty twenty-six snapshots of GPT Image two point five Sunburst and Flare. Sunburst is described as the most capable image model, while Flare is aimed at faster everyday image work. Both are image generation and editing models.

OpenAI 官方文档列出了 2026 年 9 月 8 日的 GPT Image 2.5 Sunburst 和 Flare 快照。Sunburst 被描述为能力最强的图像模型，Flare 面向更快的日常图像工作，两者都用于生成和编辑。

For a design comparison, use the same task and reference images. A product label about capability does not tell us whether it will preserve a particular logo, maintain a character across shots, or reproduce exact lettering in our layout. Those require output-level checks.

设计比较应使用相同任务和参考图。产品的能力标签不能直接告诉我们：它能否保留特定标志、保持跨镜头角色，或准确生成版面文字。这些都需要检查实际输出。

Speed also matters differently at different stages. Fast alternatives can help during composition selection. A slower result may be worthwhile for a demanding final edit, but only if the difference is visible and useful. The public model descriptions do not establish an independent ranking or reveal every internal architectural choice.

速度在不同阶段的作用也不同。快速方案有利于选择构图，复杂最终编辑可能值得更慢的结果，但差异要看得见且有用。公开模型介绍不是独立排名，也没有揭示所有内部架构选择。

## Slide 77 — 2026: Give the video model examples

57:20

Video tools are also accepting more kinds of reference. Seedance 2.0, announced in February 2026, can use text, images, sound, and video as inputs.

视频工具也开始接受更多类型的参考。2026 年 2 月发布的 Seedance 2.0 可以输入文字、图片、声音和视频。

It can generate short video with sound.

它可以生成带声音的短视频。

Suppose we like the traveler’s appearance in one picture, and we have a separate clip showing the camera movement we want.

假设我们喜欢某张图中旅人的外观，同时另有一段视频展示想要的镜头运动。

Those references communicate different parts of the scene. This could be useful when movement is difficult to describe in words.

这些参考分别表达场景的不同部分。当运动难以用语言描述时，这可能很有用。

We would still need to check the result. Did it follow the movement, and did that movement create the feeling we wanted?

仍要检查结果：它是否遵循了运动参考？这种运动是否产生了我们想要的感觉？

Different references specify different variables. A character image can describe appearance. A motion clip can describe timing and camera behavior. Audio can describe rhythm or an event sequence. Combining references is useful when these roles are clear. Conflicting references still need a decision: a slow camera reference and a rapid musical beat may suggest different editing choices. The model cannot determine the intended relationship from the existence of the files alone.

不同参考规定不同变量。角色图描述外观，运动视频描述时序和镜头行为，音频描述节奏或事件顺序。明确这些分工，组合参考才更有用。参考冲突时仍需作出选择，例如慢镜头参考与快速节拍可能暗示不同剪辑方式；仅有文件本身，并不能确定创作意图。

## Slide 78 — 2026: Edit a video by describing a change

58:17

Another change is being able to describe an edit to an existing video. Google introduced Gemini Omni Flash in public preview in June 2026.

另一个变化，是可以用语言描述对已有视频的修改。Google 在 2026 年 6 月公开预览了 Gemini Omni Flash。

Its examples include changing lighting and replacing objects through spoken or written instructions. For this image, we might say, “Keep the traveler.

官方示例包括用语音或文字改变灯光、替换物体。对于我们的场景，可以说：“保留旅人，

Make the station lights warmer.” Then we need to watch the whole result. Did the face change? Did an object disappear? Did the sound stay right?

把车站灯光调暖。”然后完整看一遍：脸变了吗？物体消失了吗？声音还对吗？

An edit that works in one frame may cause problems elsewhere.

某一帧中看起来成功的修改，可能在其他地方产生问题。

Also, available controls can differ between a demonstration and the version of a tool you can access.

另外，演示中展示的控制功能，与我们实际能用到的版本也可能不同。

Video editing introduces a preservation problem. The request specifies what should change, but the rest of the clip also matters. Relighting should be checked across moving surfaces and shadows, not only at the first frame. Object replacement should preserve occlusion when something passes in front of it. These are concrete tests of edit behavior. They are more useful than assuming that a fluent natural-language instruction guarantees a localized change.

视频编辑带来保留问题：指令说明要改什么，其余部分同样重要。重新打光应检查移动表面和阴影，不只看第一帧；替换物体应保留前方物体经过时的遮挡关系。这些是具体测试，比假设自然语言指令能保证局部修改更有用。

## Slide 79 — Video review: frame, motion, sound

59:13

Video quality needs tests at more than one timescale. At the frame level, inspect object count, anatomy, lettering, and composition. These are similar to still-image checks. At the sequence level, inspect whether objects persist and whether their motion remains continuous.

视频质量需要在多个时间尺度上检查。单帧检查物体数量、身体结构、文字和构图，类似静态图检查；序列层面则看物体是否持续存在，以及运动是否连续。

Camera motion is a useful stress test for geometry. A wall can look plausible in one frame and bend as the viewpoint changes. Occlusion is another test: an object passing behind a foreground shape should reappear with a consistent identity and position.

镜头运动能检验几何。墙在单帧中合理，却可能随视角变化弯曲。遮挡也是测试：物体经过前景遮挡后重新出现，身份和位置应保持一致。

Sound adds event timing. A visible impact and its sound should have a deliberate relationship. Dialogue needs a relationship between speech timing and mouth movement. The goal is not simply to have an audio track, but to make the audiovisual events agree with the intended scene.

声音增加了事件时序。可见碰撞与声音应有明确关系，对话需要语音时序与嘴部运动对应。目标不只是拥有音轨，而是让视听事件符合场景需要。

At an edit, screen direction and prop position affect continuity. An object moving to the right in one shot and left in the next can imply a reversal. That may be intentional, but it should be a choice supported by the spatial setup rather than an accidental generation change.

剪辑处，画面方向和道具位置影响连续性。物体前一镜头向右、后一镜头向左，可能暗示掉头。这可以是有意选择，但应有空间安排支持，而不是生成造成的意外变化。

## Slide 80 — 2026: Video, sound, and keyframe control

60:11

FLUX 3 illustrates the move from separate image and sound generation toward joint audiovisual generation. Black Forest Labs released an initial version of FLUX 3 Video on August fourth, twenty twenty-six. Its announcement describes clips up to twenty seconds with audio, image inputs, keyframes, and continuation.

FLUX 3 展示了从分别生成画面与声音，转向联合视听生成的方向。Black Forest Labs 于 2026 年 8 月 4 日发布初始视频版本，公告介绍了最长二十秒、带音频、支持图片输入、关键帧和续接等功能。

Keyframes specify important visible moments, while the model generates the transition between them. They can provide more concrete temporal control than a style adjective. They still leave intermediate motion to be generated, so a correct first and last frame do not establish that the movement between them is correct.

关键帧规定重要时刻的画面，模型生成中间过渡，比风格形容词提供更具体的时间控制。但中间运动仍由模型生成，所以首尾帧正确，不代表过渡动作正确。

The same company's August upscaling announcement provides another useful example of a tradeoff: a more creative repair mode can change identity. Higher resolution and stronger reconstruction are therefore separate choices from preservation. These are developer descriptions; an independent comparison needs matched inputs and recorded outputs.

该公司八月的放大工具公告还展示了一种取舍：更具创造性的修复模式可能改变身份。因此，提高分辨率、加强重建与保留原貌，是不同选择。这些是开发者说明，独立比较仍需匹配输入并记录输出。

## Slide 81 — GPT-6 Astra: Help build an interactive scene

61:08

OpenAI's GPT-six Astra is a general assistant model for reasoning, coding, and work with tools. It can accept text and image inputs. In a design workflow, the relevant example is building an interactive artifact from a specification, then inspecting and revising the result.

OpenAI 的 GPT-6 Astra 是用于推理、编程和工具工作的通用助手模型，可以接收文字和图片。设计中的一个用途是根据明确要求搭建互动作品，再检查和修改结果。

An assistant might write the code for a light transition, inspect a screenshot, and change the timing after feedback. The image-generation tool used within that workflow can be a separate model. It is useful to distinguish the assistant that coordinates the work from the specialized tool that produces an image.

助手可以编写灯光过渡代码、检查截图，并根据反馈调整时间。工作流中的图像生成工具可以是另一个模型。需要区分组织工作的助手与实际生成图片的专用工具。

This is also different from a world model predicting the next view, or a VLA producing robot commands. Those systems have different outputs and different tests. The next example makes the assistant's role concrete by turning an interaction request into observable behavior.

这也不同于世界模型预测下一视图，或 VLA 输出机器人指令。它们输出不同，测试也不同。下一例子将互动要求变成可观察的行为，具体说明助手的作用。

## Slide 82 — Astra: turn a design instruction into a test

61:49

An interaction can be specified as an input, a state change, and an output over time. Here the input is a click on a prop. The intended output is a light fade lasting two seconds. The camera and character should remain fixed while that change occurs.

互动可以规定为输入、状态变化和随时间产生的输出。这里输入是点击道具，输出是持续两秒的灯光渐变，过程中镜头和角色应固定。

Astra can help write and revise the code for that behavior using tools. The important test is the built artifact. Does one click start one transition? Does the final light level match the instruction? Does a second click restart the transition, reverse it, or do nothing?

Astra 可以借助工具编写和修改行为代码。重要测试是实际作品：一次点击是否只开始一次过渡？最终亮度是否符合要求？再次点击会重启、反向还是不响应？

Those alternatives are design decisions about state. They should be stated explicitly. Otherwise, a generated implementation can look correct in a screenshot while behaving unpredictably during repeated use. A static image cannot show all the states of an interaction.

这些是状态设计决定，应明确规定。否则，生成实现可能在截图中正确，重复使用时却行为不定。静态图片无法展示互动的所有状态。

The assistant's role is to help construct and inspect the implementation. The test still needs observable input and output. This separates a convincing explanation of an interaction from a working interaction, and connects language-based assistance to a concrete design workflow.

助手帮助搭建和检查实现，测试仍需可观察的输入输出。这样才能区分“解释得像真的”与“实际能够工作”，把语言助手连接到具体设计流程。

## Slide 83 — World models: what is being predicted?

62:46

A world model predicts how an environment changes, often conditioned on an action. The representation can differ. One model predicts a compact state, another generates future video, and another works with an explicit three-dimensional scene that can be rendered from different viewpoints.

世界模型预测环境如何变化，通常以动作作为条件。表示方式可以不同：有的预测紧凑状态，有的生成未来视频，有的使用可从不同视角渲染的明确三维场景。

CMU's world-model lecture separates these approaches because they support different operations. A learned latent state can be useful for control without producing a picture. An interactive video model produces visible views but may not expose editable three-dimensional geometry. A scene representation can support rendering, while its physical behavior still needs a model.

CMU 的世界模型课程区分这些方法，因为它们支持的操作不同。潜在状态可用于控制而不生成图片；互动视频提供可见视图，却未必有可编辑三维几何；场景表示可以支持渲染，物理行为仍需另外建模。

The term world model therefore does not name one fixed architecture. The practical question is what state it represents, what action it accepts, and what it predicts. A plausible image is evidence about appearance, not automatically evidence of accurate distance, dynamics, or a persistent environment.

所以“世界模型”不是一种固定架构。实际要问：表示什么状态、接受什么动作、预测什么结果。逼真图片是外观证据，并不自动证明距离、动力学或环境持续性准确。

## Slide 84 — Astra: A picture that responds to movement

63:39

This Astra is the world-model research project presented at ICLR 2026. Its first preprint appeared in December 2025. It’s separate from OpenAI’s GPT-6 Astra.

这里的 Astra 是 ICLR 2026 的世界模型研究，预印本最早发表于 2025 年 12 月。它与 OpenAI 的 GPT-6 Astra 是不同项目。

Look at the green-bordered pictures on the left. Those are starting images. The later columns show generated views, with movement controls marked on them.

看左边带绿框的图片，它们是起始图像。后面几列是生成的视图，上面标注了移动控制。

The model uses earlier observations and action inputs to predict the next part of the video.

模型使用之前的观察和动作输入，预测接下来的一段视频。

That connects to our earlier discussion of conditions: now a movement command helps guide generation. For an interactive scene, we care about both response and consistency.

这与前面讨论的条件相连：现在，移动指令帮助引导生成。互动场景既需要响应，也需要保持一致。

Does the view change when we ask, and does the place still make sense afterward?

我们发出指令后，视图改变了吗？改变后的空间仍然合理吗？

An action-conditioned video model receives information about intended movement, along with earlier observations. That input changes the prediction task: it must produce a plausible continuation that also responds to the action. A prerecorded video only needs to play its next frame. An interactive model must handle different possible actions from the same current view. Evaluation therefore needs response tests as well as visual tests, including repeated actions and movement back toward an earlier view.

带动作条件的视频模型接收运动意图和之前的观察，因此预测既要合理，也要响应动作。预录视频只需播放下一帧；互动模型却需要从同一视图响应不同动作。所以评估除了视觉质量，还应测试响应、重复动作和返回之前视角的移动。

## Slide 85 — World models: test a round trip

64:40

A round trip tests whether a generated environment stays consistent over time. Begin outside a doorway, enter, turn away, turn back, and leave again. The sequence revisits earlier geometry rather than continually generating new views that never need to agree with the past.

往返测试可以检查生成环境随时间是否一致。从门外进入、转开、转回，再走出去，会重新访问先前几何，而不是只生成无需与过去一致的新视图。

A model can generate a plausible next frame while gradually changing the doorway's size or location. If its own generated frames become later inputs, small errors can accumulate. Short-term realism and long-term consistency are therefore different evaluation targets.

模型可能每一帧都合理，却逐渐改变门的大小或位置。自身生成帧成为后续输入时，小误差会累积。因此，短期真实感和长期一致性是不同评估目标。

Object persistence is related. A chair that moves outside the camera view should not automatically cease to exist. Turning back provides a test of what the model retains. An explicit three-dimensional scene, a video history, and a learned hidden state can support persistence in different ways.

物体持续性也相关。椅子移出镜头，不应该就不存在；转回去能测试模型保留了什么。明确三维场景、视频历史和学习到的隐状态，可以通过不同方式支持持续性。

This test does not establish all aspects of physics. It specifically checks spatial and temporal agreement under a short sequence of actions. Additional tests would be needed for contact, material behavior, or control accuracy. The test should match the capability being claimed.

这个测试不能证明所有物理能力，只检查短动作序列中的时空一致。接触、材质行为和控制精度需要额外测试，测试应与声称的能力对应。

## Slide 86 — VLA: See the scene, read the task, act

65:39

VLA stands for vision-language-action. The model receives visual information and an instruction, often along with information about the robot’s current position.

VLA 指视觉、语言、动作。模型接收视觉信息和指令，通常还包括机器人的当前位置等信息。

It produces actions for the robot, such as moving an arm or closing a gripper. Gemini Robotics 2, announced in July 2026, is one example.

它产生机器人的动作，例如移动手臂或闭合夹爪。2026 年 7 月发布的 Gemini Robotics 2 就是一个例子。

It includes whole-body control, so movement can involve more than an arm at a table.

它包括全身控制，所以动作不只限于桌面旁的一条手臂。

For an installation, we might imagine a robot moving props as visitors interact. That would require a complete working system.

在装置作品中，可以设想机器人随着观众互动移动道具。这需要一个完整的工作系统。

The model’s action output is one part; observing the result and dealing with mistakes also matter.

模型输出动作只是其中一部分，观察结果和处理错误也很重要。

Robot actions can be represented in several ways, such as joint targets, end-effector movement, or a sequence of future controls. The model's output must match the robot interface. A language instruction saying pick up the cup is much less specific than those low-level actions. A complete system needs observations, a policy, motor execution, and updated feedback. The VLA is the learned link between visual-language information and the action representation used by that system.

机器人动作可以表示成关节目标、末端移动，或一段未来控制序列。模型输出必须匹配机器人接口。“拿起杯子”比这些底层动作模糊得多。完整系统需要观察、策略、电机执行和更新后的反馈，VLA 则把视觉语言信息连接到系统使用的动作表示。

## Slide 87 — Robot actions need a coordinate system

66:38

An image location and a robot movement use different coordinate systems. A prop appearing forty pixels left of the image center does not directly specify how many centimeters a robot hand should move. The relationship depends on camera geometry, depth, and the robot's current configuration.

图像位置与机器人移动使用不同坐标系。道具在画面中心左边四十像素，并不能直接规定机械手应该移动多少厘米。这个关系取决于相机几何、深度和机器人当前状态。

A command also needs a reference frame. Left can mean the camera's left, the robot's left, or a direction in the workspace. A movement can be expressed as a change in joint angles or as a target for the end effector. The controller must interpret the representation correctly.

指令还需要参考系。左可以是相机左侧、机器人左侧或工作空间方向。移动可以表示为关节角变化，或末端执行器目标，控制器必须正确解释表示。

A VLA learns a mapping from observations and language into actions, often with robot-state information. The surrounding system still determines which action representation is used and how the motor commands are executed. A model that predicts the right-looking motion is not by itself a calibrated physical installation.

VLA 学习从观察和语言到动作的映射，通常还使用机器人状态。外围系统仍需决定动作表示及电机执行方式。预测出看似正确运动的模型，本身并不等于经过校准的物理装置。

After movement, new observations close the feedback loop. For a prop-handling installation, the stopping condition might be reaching a marked location or achieving a stable grasp. Defining the frame, distance, feedback, and stop condition turns a vague movement request into a testable task.

移动后，新观察完成反馈循环。道具搬运装置的停止条件可以是到达标记位置或稳定抓住物体。明确参考系、距离、反馈和停止条件，就能把模糊移动要求变成可测试任务。

## Slide 88 — Predicting an action’s result and taking action

67:39

These systems have different jobs. An assistant might write code for the suitcase interaction. A world model might predict what would happen if it moved.

这些系统分工不同。助手可以为行李箱互动编写代码；世界模型可以预测行李箱移动后会怎样。

A VLA might produce commands to move a real suitcase. A system could combine those jobs, then look again after acting.

VLA 可以生成移动真实行李箱的指令。一个系统可以把这些工作结合起来，行动后再观察。

But a VLA doesn’t necessarily contain a separate world model. And generating a video of an action doesn’t mean a robot has actually performed it.

但 VLA 不一定包含独立的世界模型。生成一个动作的视频，也不代表机器人真的完成了动作。

A planner may ask a world model to predict several candidate outcomes before choosing an action. That is one possible arrangement. Another policy can map observations directly to action commands without generating future images. Neither architecture is proved by watching a successful demonstration. We need a system description to know which components are present, and a task test to know whether their combination works reliably.

规划器可以先请世界模型预测多个候选结果，再选择动作，这是一种安排。另一种策略可以直接从观察输出动作，不生成未来图像。看一次成功演示不能证明采用哪种架构；需要系统说明确认组件，并通过任务测试判断组合是否可靠。

## Slide 89 — Discussion: Design an experience that responds

68:19

Let’s turn that into a design choice. Imagine a visitor moves the red suitcase in a station scene. What should the experience do?

把这些变成一个设计选择。假设观众移动了车站场景中的红色行李箱，体验应该怎样响应？

Explain something, generate a changed scene, or move a real prop? Choose one with your partner.

解释一些内容、生成改变后的场景，还是移动真实道具？和同伴选择一种。

Say what the visitor does and what they should notice in response. Include what happens if the system misunderstands them.

说清楚观众做什么，以及应该看到什么响应。也要考虑系统理解错了怎么办。

For an installation, specify four things: the visitor input, the visible response, the response time, and the recovery behavior. A click that changes light is different from a camera movement that generates a new view, and both differ from moving a physical prop. The input and output determine which technology is needed. This is the point where interaction design becomes a concrete system requirement.

装置作品需要明确四项：观众输入、可见响应、响应时间和出错后的恢复行为。点击改变灯光、移动镜头生成新视图、移动真实道具，是不同任务。输入和输出决定所需技术，互动设计由此变成具体的系统要求。

## Slide 90 — Which setting might help?

68:58

If the traveler is too large, try a wider-view instruction or a layout reference.

如果旅人太大，可以试试更远的取景指令或布局参考图。

If the colors feel too strong, guidance may be worth testing where the model supports it.

如果颜色过强，而模型支持引导，就值得测试一下引导设置。

If one small area is wrong, a local edit may be enough. These are starting points for a test. They aren’t guaranteed fixes.

如果只有一个小区域出错，局部编辑可能就够了。这些是测试起点，并不保证一定修好。

Describe the visible problem first.

先描述看得见的问题。

That makes it easier to choose a change that could actually address it, rather than changing everything and hoping the next image works.

这样更容易选择可能解决问题的改动，而不是把所有设置都改一遍，寄希望于下一张图片。

The location of an error helps select a control. A wrong global viewpoint may call for a layout reference. A correct scene with one broken hand may call for a local region edit. A repeated style across a large collection may justify a trained adapter. These choices differ in scope and cost. Starting with the smallest relevant intervention makes it easier to preserve the parts that already work.

错误的位置帮助选择控制方式。整体视角不对可能需要布局参考；场景正确但一只手出错，可能需要局部编辑；大量图片要保持风格，可能值得训练适配器。这些方法范围和成本不同，从最相关的小改动开始，更容易保留已成功的部分。

## Slide 91 — How to make a fair comparison

69:39

Here is a simple comparison we could run. Our question is whether guidance changes subject clarity and variety.

这是一个简单的比较：我们想知道引导是否改变主体的清晰程度和结果的多样性。

We keep the model, prompt, size, sampler, and steps fixed. We try different guidance values using the same set of seeds at each value.

固定模型、提示词、尺寸、采样器和步数。尝试不同引导值，每个值都使用相同的一组种子。

Then we judge the results using questions we chose beforehand. That last part matters.

然后用事先选好的问题评价结果。这最后一步很重要。

If we decide what counts as success only after seeing the images, it’s easy to favor the result we happened to like.

如果看完图片才决定什么算成功，就很容易偏向自己碰巧喜欢的结果。

A clear test helps us explain our choice to someone else.

清楚的测试可以帮助我们向别人解释选择。

Write the comparison as a small table before running it. The rows can be seeds and the columns guidance values. Every cell gets the same prompt and model. Record failures as well as successful images, because omitting failures changes what the grid represents. If image generation fails for a cell, mark it as missing and rerun that condition rather than silently replacing it with a different seed.

运行前先画一个小表格，行放种子，列放引导值，每格使用相同提示和模型。成功和失败都要记录，因为删掉失败会改变网格代表的结果。某格生成失败时，应标记缺失并重跑相同条件，不要悄悄换成其他种子。

## Slide 92 — Content, form, and variation

70:22

Image evaluation can separate content, form, variation, and purpose. Content includes object count, attributes, and relationships. These can often be checked directly against the request. A hand holding a cup is a different relation from a hand merely appearing near a cup.

图像评价可以分成内容、形式、变化和用途。内容包括物体数量、属性和关系，通常可以直接对照要求。手拿着杯子，与手只是出现在杯子附近，是不同关系。

Form concerns how the image is organized: silhouette, value structure, edge contrast, and the main focus. These properties connect technical output to art decisions. They can be described specifically even when people prefer different compositions.

形式关注图像怎样组织，包括轮廓、明暗结构、边缘对比和主要焦点。这些属性把技术输出连接到艺术决定。即使偏好不同，也能作出具体描述。

Variation concerns the group rather than one image. A set can contain one attractive result and many nearly identical alternatives. Purpose determines which of those properties matter most. A clear instructional poster and an ambiguous dream sequence can reasonably favor different results without making the comparison meaningless.

变化关注整组而不是单张图。一组可能有一张漂亮结果，其他却几乎相同。用途决定哪些属性最重要。清晰教学海报和含混梦境可以合理地选择不同结果，比较仍然有意义。

## Slide 93 — Discussion 4: Compare the pictures

71:04

We’ll spend six minutes on these grids. They come from a published study of guidance using dog images.

我们用六分钟看这些网格。它们来自一项用狗的图像研究引导的论文。

This was generation from a category label, rather than a written prompt. Corresponding positions use matched seeds, so compare the same position across the groups.

这里使用的是类别标签，而不是文字提示。对应位置使用了相同种子，所以请跨组比较同一位置。

First, look silently. Then choose two corresponding sets and write down what changes. Look at recognizable features, unwanted details, and variety within each group.

先自己观察，再选两组对应图片，写下变化。注意可辨认的特征、不想要的细节，以及每组内部的多样性。

Finally, choose a group for a particular use. Would your choice change for a clear introduction compared with a strange dream scene?

最后，为某种用途选一组。如果用途从清晰的介绍变成奇怪的梦境，你的选择会改变吗？

The task is to make a defensible comparison, not to guess the setting with the biggest number. Select corresponding positions, describe shape and color changes, and then inspect variation across each group. A picture can become more recognizable while losing unusual but useful alternatives. That tradeoff is central to generative design: the setting that helps one final image may not be the best setting for exploring possibilities.

任务是作出有依据的比较，而不是猜哪个最大数值最好。选对应位置，描述形状和颜色变化，再检查各组内部差异。图片可能更容易辨认，却失去独特而有用的选择。这种取舍很重要：有利于最终成图的设置，不一定最适合探索方案。

## Slide 94 — Reading a guidance grid

71:59

A controlled grid supports two kinds of reading. Across guidance conditions, follow the same seed and describe what changes. Within one guidance condition, compare different seeds and describe the range of outputs. The first comparison focuses on the setting; the second focuses on variation.

受控网格有两种读法。跨引导条件，跟踪同一种子并描述变化；在同一引导条件内，比较不同种子及结果范围。前者关注设置，后者关注变化。

For a face, useful observations include outline, eye placement, texture, and exaggerated edges. For a full scene, include camera distance, figure size, and repeated layout patterns. Record what is visible rather than assuming that a stronger setting improved every property.

脸部可观察轮廓、眼睛位置、纹理和夸张边缘；完整场景还应看机位距离、人物大小和重复布局。记录实际可见的内容，不要假设更强设置改善了所有属性。

A grid is strongest when its labels make the comparison unambiguous. Keep model, prompt, and sampling settings beside it. If images have been selected or cropped, state that too. Otherwise, the display can appear more controlled or more diverse than the underlying experiment really was.

清楚标签能让网格更有说服力。应附模型、提示和采样设置；若经过挑选或裁切，也要说明。否则，展示可能看起来比实际实验更受控，或更有多样性。

## Slide 95 — Discussion 5: Choose a look for our scene

72:42

For this last discussion, choose a camera view and a drawing style for a station scene.

最后一次讨论，请为车站场景选择一个取景方式和一种绘画风格。

Think back to the wide and close views, and the paper, paint, and ink examples. Take thirty seconds to choose.

回想远景、近景，以及剪纸、绘画和水墨的例子。用三十秒作出选择。

Then explain your choice to your partner using two details you can point to in the pictures. Finish by naming one change you would try next.

再用图片中两处看得见的细节，向同伴解释选择。最后说出下一步想尝试的一项改动。

Keep the change specific enough that you could recognize whether it worked.

改动要足够具体，让你能看出它是否起效。

Use a formal reason for the choice. A low camera position can increase the apparent scale of a nearby figure. A diagonal edge can connect two regions or create tension. A large quiet area can reserve space for text. These are specific compositional effects. A style label such as cinematic is less useful unless it is translated into decisions about camera, light, color, or editing.

请用具体的形式关系解释选择。低机位能放大近处人物的视觉尺度，斜线能连接区域或制造紧张，大块留白能为文字保留空间。“电影感”这样的标签，只有转成机位、灯光、颜色或剪辑决定，才更有用。

## Slide 96 — Three questions before we finish

73:23

Before we finish, write a short answer to each of these questions. Why can the same prompt give different pictures?

结束前，简短回答这些问题：为什么同一个提示词可以生成不同图片？

Why might stronger guidance make a picture worse? And what would you save so you could try to repeat a result? Use your own words.

为什么更强的引导可能让图片更差？想重复结果时应该保存什么？请用自己的话回答。

You don’t need an equation. If it helps, explain each answer using the character and station.

不需要写公式，也可以用我们的旅人和车站来解释。

A complete answer should name a mechanism and its consequence. For seed, name the changed random state and the resulting variation. For guidance, name the combined predictions and the risk of exaggeration. For reproducibility, name the inputs and model settings that must be recorded. This is a short check that the terms connect to something the system actually does.

完整答案应包括机制和结果：种子对应随机状态变化及输出差异；引导对应预测组合及夸张风险；复现对应需要记录的输入和模型设置。这个简短检查，是为了确认术语确实连接到了系统的实际行为。

## Slide 97 — Suggested answers

74:00

Here are the main answers. Different random starting states can lead to different pictures, even with the same prompt.

主要答案是：即使提示词相同，不同的随机起始状态也可能产生不同图片。

Depending on the sampler, randomness can also enter later. Stronger guidance pushes harder along the difference between predictions.

根据采样器的不同，随机性还可能在后续步骤加入。更强的引导沿预测差异的方向推得更远。

That may make the subject clearer, but it can also create unwanted colors or details and reduce variety.

这可能使主体更明确，也可能产生不合适的颜色或细节，并减少多样性。

To repeat a result, save the full setup: the model, prompt, references, seed, and generation settings. Include any adapters.

要重复结果，保存完整设置：模型、提示词、参考图、种子和生成设置。使用了适配器也要记录。

Exact matching can still depend on software and hardware. Your wording can be different. What matters is whether your explanation connects the setting to what happens.

是否完全一致还可能取决于软硬件。答案措辞可以不同，关键是解释能否把设置与结果联系起来。

These answers also explain why a beautiful result is not enough to understand a model. One sample shows an outcome. A matched comparison shows how a controlled change affects outcomes. A saved setup makes that comparison repeatable. Together, these give us a method for discussing generation in concrete terms rather than relying on impressions about a tool's personality or creativity.

这些答案也说明：一张漂亮图片不足以让我们理解模型。一个样本展示结果，匹配比较展示受控改动的影响，保存设置让比较可以重复。三者结合，才能具体讨论生成过程，而不是依靠对工具“个性”或“创造力”的印象。

## Slide 98 — A method for the next image

74:57

The main controls now have distinct meanings. A prompt and references describe conditions. A seed fixes a random starting process. Guidance combines predictions. A sampler calculates updates. Adapters and fine-tuning change learned behavior. Masks and compositing limit where an edit appears.

现在，各种控制有了不同含义：提示和参考提供条件，种子确定随机起点，引导组合预测，采样器计算更新，适配与微调改变学到的行为，蒙版与合成限制编辑出现的区域。

The art decisions are just as concrete. Camera position changes perspective. Overlap and converging lines provide depth cues. Hue and lightness affect separation. Edge treatment controls which shapes remain clear. Character and motion continuity connect individual images into a sequence.

艺术决定同样具体。机位改变透视，遮挡与汇聚线提供深度线索，色相和明度影响分离，边缘处理控制形状清晰度，角色与运动连续性把单张图连接成序列。

A useful experiment changes a relevant variable, preserves the other conditions, and records the results. That method applies to an image edit, a video comparison, or an interactive system. The following source slides point to the university lectures, papers, and official announcements used in this lesson.

有用的实验改变相关变量，保留其他条件并记录结果。这个方法适用于图像编辑、视频比较和互动系统。后面的来源页列出了本课使用的大学课程、论文和官方公告。

## Slide 99 — University lectures behind this lesson

75:40

The technical structure draws on CMU's Generative AI course, including diffusion, text-to-image generation, parameter-efficient adaptation, and world models. MIT's flow and diffusion course provides a clear connection between training targets and numerical sampling. The small numerical examples in this lecture were written for this class.

技术结构参考了 CMU 生成式人工智能课程中的扩散、文生图、参数高效适配和世界模型。MIT 的流与扩散课程清楚连接了训练目标和数值采样。本课的小数值例子是为课堂编写的。

Stanford's generative-model lectures provide additional technical context. Its graphics and photography materials support the discussion of color, cameras, and composition. These established art and imaging principles are presented alongside recent tools because they explain decisions that remain useful when the product names change.

Stanford 的生成模型课程补充技术背景，图形学与摄影材料支持颜色、相机和构图讨论。把这些成熟原则与新工具放在一起，是因为产品名称改变后，它们仍能解释有用的设计决定。

## Slide 100 — Papers, demonstrations, and further reading

76:20

The primary papers explain the mechanisms behind diffusion, latent representations, guidance, LoRA, image-to-image editing, and spatial conditioning. Related methods such as IP-Adapter and DreamBooth show different ways to use reference information. Their publication dates are kept distinct from the twenty twenty-six product updates.

原始论文解释扩散、潜变量、引导、LoRA、图生图编辑和空间条件。IP-Adapter 与 DreamBooth 展示了不同参考信息用法，其发表日期与 2026 年产品更新分开标注。

The recent section uses official model documentation and developer announcements. Those sources establish what was announced and how the developer describes it. They are not independent proof that a model is best for every task. A practical comparison still needs a defined task, matched inputs, and the actual outputs.

近期部分采用官方模型文档和开发者公告，说明发布了什么及开发者如何描述。这不是某个模型适合所有任务的独立证明。实际比较仍需明确任务、匹配输入并检查输出。