# AMCC 5160 · Lecture 07 — What's New in AI Motion

Study transcript · English narration with Chinese companion explanations (中文讲解). 13 October 2026.

## 1. What's New in AI Motion

Good evening, everyone, and welcome to Week 7. Last week Yaofu showed us how quantization makes models run faster on smaller machines. Tonight is different from every other lecture so far. There is no taxonomy and no list of techniques. Instead I will tell you four stories, all of which happened between March and September of this year, and every one of them is about motion: how long a generated video can move, who decides how it moves, whether that motion can leave the screen, and what happens when the tool you used to make it disappears. Each story comes with a demo and a question for you to argue about.

中文讲解：欢迎来到第七讲。上周助教刘耀夫介绍了量化如何让模型更快。今晚不讲分类法、不列技术清单，而是讲四个发生在今年3月到9月之间的故事，都与“运动”有关：生成视频能动多久、谁决定它怎么动、这种运动能否离开屏幕，以及当创作工具消失时会发生什么。每个故事都配有演示和一个讨论问题。

## 2. Four stories from this year

Here is the map for tonight. Story one: the five-second clip is over. The leading models now generate thirty seconds in one pass, and a research model generates a full minute faster than you can watch it. Story two: music becomes the choreographer. In July, Alibaba released an open model that turns a song and one photo into a minute of dance. Story three: motion leaves the screen. In June, a Korean robotics company taught a humanoid robot a viral K-pop dance using only phone video. Story four: Sora is gone. OpenAI closed the Sora app in April and switched off the API three weeks ago. Between stories two and three we'll have student presentations and a break, and we'll end with a debate.

中文讲解：今晚的四个故事：一、五秒片段的时代结束了——主流模型一次生成30秒，研究模型实时生成一分钟；二、音乐成为编舞——7月阿里开源的模型用一首歌和一张照片生成一分钟舞蹈；三、运动离开屏幕——6月韩国一家机器人公司只用手机视频教会人形机器人跳K-pop；四、Sora消失了——OpenAI 4月关闭应用、9月关闭API。中间有学生展示和休息，最后是辩论。

## 3. How many shots is this?

Let's start with a clip. This is the hero video on ByteDance's official Seedance 2.5 page. Watch it once, and count the cuts. Then tell me: how many times do you think the model was run to make it? Take a guess with your neighbour. [Play the video.] The answer is: the model is built to make up to thirty seconds in a single generation, with camera moves and blocking inside it. A year ago, anything like this was ten or more separate five-second clips stitched together by an editor. Keep that number, thirty seconds, in your head. It is the first story.

中文讲解：先看一段字节Seedance 2.5官方页面上的视频。请数一数镜头切换，并猜猜模型运行了几次。答案是：这个模型可以一次生成最长30秒，内含运镜与调度。一年前，这样的片子需要十几个五秒片段由剪辑师拼接。

## 4. How top courses treat what's new

Why teach the news? Because the best courses do. Stanford's CS348K this spring, taught by Kayvon Fatahalian, gave a whole lecture to how distillation and caching made autoregressive video models run in real time, and brought in guests from WorldLabs, Roblox and NVIDIA. Jun-Yan Zhu's CMU course put a fast video paper from the same year on its reading list, and ended with forensics and data attribution. MIT's architecture course last fall listed Sora as the video tool in its syllabus, which matters for story four. And Holly Willis at USC pairs every tool with the controversy around it, which is exactly what our 'for the room' questions do tonight.

中文讲解：为什么要讲新闻？因为顶尖课程都这样做。斯坦福CS348K今年春季专门讲了蒸馏与缓存如何让自回归视频模型实时运行；卡内基梅隆朁16-726把当年的视频论文列入阅读，并以取证和数据归属收尾；MIT建筑系去年秋季的课纲把Sora列为视频工具；南加大的课程把每个工具和它引发的争议放在一起讨论。

## 5. The 5-second clip is over

Story one. For most of the last two years, an AI video was about five seconds long. That limit shaped everything: how people wrote prompts, how they edited, even what kinds of films they made. This year the limit broke.

中文讲解：第一个故事。过去两年，AI视频大多只有五秒左右，这个限制影响了提示词、剪辑方式甚至影片类型。今年，这个限制被打破了。

## 6. The unit of AI video is now the scene

Here is the change in four numbers. In 2024, a typical clip was about five seconds. Early this year, ByteDance's Seedance 2.0 got to about fifteen. By this summer, three commercial models, Seedance 2.5, Alibaba's Wan 3.0 and Kuaishou's Kling 4.0, were announced or released at thirty seconds in one pass. And a research model from Peking University and ByteDance, called Helios, makes about a minute, and it makes it faster than real time. Thirty seconds is long enough for a whole scene: an entrance, an exchange, an exit. So the unit of AI video is no longer the shot. It is the scene.

中文讲解：用四个数字看变化：2024年典型片段约5秒；今年初Seedance 2.0约15秒；今年夏天Seedance 2.5、通义万相Wan 3.0和可灵Kling 4.0均支持一次生成30秒；北大与字节的研究模型Helios能生成约一分钟，而且比实时还快。30秒足以容纳一个完整场景，所以AI视频的基本单位从“镜头”变成了“场景”。

## 7. Who shipped what

Who shipped what. ByteDance launched Seedance 2.5 on July 31st; its official page says it is built for thirty-second storytelling, with camera movement and performance blocking. Alibaba opened a public beta of Wan 3.0 in August, at thirty-second clips, but with no open weights this time. Kuaishou opened early access to Kling 4.0 Flash on September 28th, at twenty seconds and 720p, and has announced the full model for this month. And Helios, from Peking University and ByteDance, came out in March as open weights. One caution: vendors publish few specs, so some of these numbers come from reviewers. Treat them as this month's numbers, not as facts that will last.

中文讲解：各家发布了什么：字节7月31日发布Seedance 2.5，官方称为30秒叙事而生；阿里8月开放Wan 3.0公测，30秒，但未开源；快手9月28日开放Kling 4.0 Flash抢先体验（20秒、720p），完整版计划本月发布；Helios 3月开源。提醒：部分参数来自评测者，只代表本月情况。

## 8. Helios: a minute of video, in real time

Helios is the most surprising of these, because it is a research release with open weights. It is a fourteen-billion-parameter autoregressive model, which means it writes the video forward in time, one chunk after another, like a language model writes words. It makes about a minute per generation, and it runs at about nineteen and a half frames per second on a single H100 GPU. Films play at twenty-four, so that is close to watching it be made live. [Play the feature video.] Then open the project page and scroll to the long-video comparisons and the 'verify consistency' section, where a subject leaves the frame and comes back still the same.

中文讲解：Helios最令人惊讶，因为它是开源的研究模型：140亿参数的自回归模型，像语言模型写字一样沿时间一段段往前生成视频。每次约一分钟，在单张H100上约每秒19.5帧，接近边看边生成。请播放官方视频，并在项目页查看长视频对比和“一致性验证”部分：主体离开画面后再回来，依然是同一个。

## 9. Why long video falls apart: drift

Why was the limit five seconds for so long? Because of drift. When a model writes video forward in time, every chunk is built on the one before it. A small mistake in second one, a slightly wrong shade of a jacket, gets copied and amplified. By second sixty the face, the clothes and the room have quietly changed. Earlier systems added tricks at playback time to fight this. The Helios team did something simpler to explain: during training, they deliberately showed the model drifted video, so it learns to pull itself back. It's like training a tightrope walker by pushing them off balance on purpose. Stanford's CS348K made the same point this spring: real-time video came from training choices and caching, not only from bigger GPUs.

中文讲解：为什么长视频会崩？因为“漂移”。模型沿时间往前生成，每段都基于上一段，第一秒的小错误会被不断放大，到第六十秒脸、衣服和房间都变了。Helios的做法是在训练时故意给模型看“已经漂移”的视频，让它学会自己纠正，就像训练走钢丝时故意推一推。

## 10. If one generation is a whole 30-second scene, what is the director's job now?

For the room. If one generation is a whole thirty-second scene, what is the director's job now? Is it writing, blocking, choosing? And what did the editor just lose? Editors used to make meaning from cuts between short clips. Talk to your neighbour for two minutes, then I'll take three answers.

中文讲解：讨论：如果一次生成就是一个完整的30秒场景，导演的工作变成了什么？剪辑师又失去了什么？与邻座讨论两分钟。

## 11. Music becomes the choreographer

Story two. Choreographers have always started from music. This summer, a model did too.

中文讲解：第二个故事。编舞家一直从音乐出发，今年夏天，一个模型也做到了。

## 12. Wan-Dancer: song in, dance out

Wan-Dancer was released on July 13th by Tongyi Lab, the Alibaba team behind the Wan video models, as open weights under the Apache license. You give it three things: a music track, one photo of the dancer, and a style word. It gives you a dance video longer than a minute, at 720p and thirty frames per second, that hits the beat. It knows five styles: Chinese classical, K-pop, street, tap and Latin. [Open the project page and play one Chinese classical and one tap example.] Watch the feet in the tap example. The model has to land the taps on the drum hits.

中文讲解：Wan-Dancer由7月13日由阿里通义实验室开源发布（Apache 2.0）。输入三样东西：一首音乐、一张舞者照片、一个风格词；输出一分钟以上、720p/30fps、卡在节拍上的舞蹈视频。支持中国古典舞、K-pop、街舞、踢踏舞和拉丁舞。请播放古典舞和踢踏舞示例，注意脚步是否踩在鼓点上。

## 13. One dancer, many looks; one song, many dancers

These are reference images from the project page: one person, seven outfits. Because the look comes from the photo and the movement comes from the music, you can swap either one. Same song, different photo: the same dance, performed by a different dancer. Same photo, different song: the same dancer, a new dance. Scroll down to section six on the project page, where they compare with an earlier model called X-Dancer. Earlier music-to-dance models tended to fall apart after about twenty seconds; this one holds together for the whole track.

中文讲解：这是项目页的参考图：同一个人，七套服装。外观来自照片，动作来自音乐，所以两者可以分别替换：同一首歌换照片，就是同一支舞换个舞者；同一张照片换歌，就是同一个舞者跳新舞。项目页第六部分与早期模型对比：以前的模型大约20秒后就会崩，而它能擑完整首歌。

## 14. The trick: plan the song, then the steps

Here is the one idea worth remembering from the paper. Wan-Dancer works at two levels. The global level looks at the whole song and plans its shape: the intro, the verse, the build, the chorus, the outro. The local level then renders the actual steps for each passage, beat by beat. That is exactly how a human choreographer works. Nobody choreographs a three-minute piece one eight-count at a time without first knowing where the big moment is. The model learned to plan before it moves, and that is why it stays coherent for a minute.

中文讲解：论文最值得记住的一点：Wan-Dancer在两个层面工作。全局层面看整首歌，规划结构（前奏、主歌、铺垫、副歌、尾声）；局部层面再逐拍生成每段的具体动作。这正是人类编舞的方式：先定结构，再编步子。先规划、后动作，所以能保持一分钟的连贯。

## 15. Pitch a one-take

Your turn. In pairs, five minutes. Pitch a thirty-second, single-generation dance piece. You get three things only: one song, and say why that song; one photo, so who or what is dancing, and it doesn't have to be a person; and one sentence describing what happens in those thirty seconds. Then I'll ask three pairs to read theirs aloud. Keep your pitch, because it could become your Assignment 2.

中文讲解：轮到你们了：两人一组，五分钟，构思一个30秒、一次生成的舞蹈作品。只有三样：一首歌（说明理由）、一张照片（谁或什么在跳，不一定是人）、一句话（这30秒里发生了什么）。之后请三组分享。保留你的构思，它可能成为作业二。

## 16. Who is the choreographer here?

For the room: who is the choreographer of a Wan-Dancer video? The musician, whose song shaped every move? The model and its builders? The thousands of dancers whose videos taught it what K-pop looks like? Or you, the person who picked the song and the photo? Hands up for each. Remember Lecture 5's question, whose model is it. This is the same question, for the body.

中文讲解：讨论：Wan-Dancer视频的编舞是谁？是音乐人、模型及其开发者、训练数据里成千上万的舞者，还是挑选歌曲和照片的你？这是第五讲“模型属于谁”问题在身体上的延续。

## 17. Motion leaves the screen

Welcome back from the break. Story three. So far every dance tonight lived on a screen. This one doesn't.

中文讲解：欢迎休息回来。第三个故事：到目前为止的舞蹈都在屏幕上，这一个不是。

## 18. A humanoid learns a K-pop challenge from phone video

In June, the Korean company ROBOTIS posted this video of its open-source humanoid, AI Sapiens, dancing the CORTIS 'REDRED' challenge, a viral K-pop routine. The robot is about 1.3 metres tall, weighs 34 kilograms, and has 23 joints. The remarkable part is not the hardware. It is that the robot learned the dance from ordinary two-dimensional video, the kind anyone films on a phone, with no motion-capture studio and no markers on a dancer's body. [Play the video.]

中文讲解：6月，韩国ROBOTIS公布了开源人形机器人AI Sapiens跳CORTIS《REDRED》挑战的视频。机器人约1.3米高、34公斤、23个关节。关键不在硬件，而在它是从普通二维视频里学会的，不需要动作捕捉棚。

## 19. Four steps from phone to robot

How does a phone video become a robot's dance? Four steps. First, film a dancer. Second, lift the motion: recover the three-dimensional joint movement from the flat video, the same pose estimation you've seen behind character animation tools. Third, practise: a copy of the robot learns the dance in simulation, in NVIDIA's Isaac Sim, with reinforcement learning fixing balance and timing, because a robot that copies a human's pose exactly will fall over. Fourth, transfer the learned skill to the real robot. ROBOTIS says its actuators were designed to make that last step, from simulation to reality, smaller.

中文讲解：手机视频如何变成机器人的舞蹈？四步：一、拍下舞者；二、从二维视频中恢复三维关节运动（姿态估计）；三、在仿真中用强化学习练习，修正平衡与节奏，因为完全照抄人的姿态会摔倒；四、把学到的技能迁移到真实机器人上。

## 20. A thought experiment

Now a thought experiment. What if step one wasn't a phone video of a real dancer, but a Wan-Dancer video generated from a song? Song, generated dancer, lifted motion, simulation practice, a real robot dancing a dance that no human ever performed. To be clear, this is speculation. As far as public reports go, nobody has shown the whole chain working. But every piece of it now exists, and two of the pieces came out this summer.

中文讲解：思想实验：如果第一步不是真人舞者的手机视频，而是Wan-Dancer根据一首歌生成的视频呢？歌曲→生成的舞者→提取动作→仿真练习→真实机器人跳一支从未有人跳过的舞。这只是推测，公开报道中尚无人完整实现，但每一环都已存在。

## 21. If a generated video can teach a real body to move, is that video still “fake”?

For the room. We usually call generated video 'fake'. But if a generated video can teach a real robot to move, is it still fake? And what is a dance video for, once machines are its audience as well as people? Two minutes with your neighbour.

中文讲解：讨论：我们常说生成视频是“假的”。但如果它能教会真实机器人动起来，它还是假的吗？当机器也成为观众，舞蹈视频的意义是什么？

## 22. Sora is gone

Story four is shorter, and it's not about a new capability. It's about a loss.

中文讲解：第四个故事比较短，它不是关于新能力，而是关于失去。

## 23. Eighteen months as a product

Sora became a product in December 2024. Sora 2 arrived on September 30th last year, with a social app. On March 24th this year, OpenAI announced it was shutting Sora down. The app and website closed on April 26th, and on September 24th, three weeks ago, the API was switched off, with no replacement model named. OpenAI's help page told users to export their videos, because after the final window, the data would be permanently deleted. OpenAI didn't give a single official reason; reporting points to the cost of compute and competition for chips. One of the best-known video tools of 2025 lasted about eighteen months as a product.

中文讲解：Sora于2024年12月成为产品；2025年9月30日推出Sora 2及社交应用；2026年3月24日宣布停运；4月26日应用和网站关闭；9月24日API关闭，没有替代模型。官方提醒用户导出作品，否则数据将被永久删除。官方未给出单一原因，报道指向算力成本。

## 24. Last fall, a top syllabus was built on Sora

This is not someone else's problem. MIT's architecture course on motion graphics, last fall, listed Sora as the video tool in its syllabus. That was a perfectly reasonable choice at the time. Twelve months later, a project made in that class cannot be re-run, re-edited or extended with the same tool. If you made something with Sora last year, the same is true for you.

中文讲解：这不是别人的问题。MIT建筑系去年秋季的动态图形课程把Sora列为视频工具，当时完全合理；一年后，该课的作品已无法用同一工具重新生成或修改。

## 25. Keep your sources, not just your outputs

So here is the useful lesson. Keep your sources, not just your outputs. Your prompts, word for word. Your seeds and settings. Your references: images, clips, songs, with credit. Your raw generations, before editing. Your edit project files. And the model's name, version and the date you used it. And notice one more thing: open-weight models like Wan 2.2, Helios and Wan-Dancer can be downloaded and run again years from now. A closed app can be switched off.

中文讲解：经验是：保存源材料，而不只是成品。包括原样提示词、种子和参数、参考图片/视频/歌曲（注明出处）、未剪辑的原始生成、剪辑工程文件，以及模型名称、版本和日期。开源模型多年后仍可运行，闭源应用则可能被关闭。

## 26. What does an AI artwork need in order to outlive the tool that made it?

For the room. What does an AI artwork need in order to outlive the tool that made it? Compare it with a film, which survives its camera, or a video game, which often doesn't survive its console. What makes the difference?

中文讲解：讨论：AI艺术作品需要什么才能比创作它的工具活得更久？对比电影（比摄影机活得久）和电子游戏（常常随主机消失）。

## 27. Debate

Debate time. The motion is: a generated dance that a robot can learn is a real dance. The left side of the room argues for, the right side against, whatever you personally believe. Two speakers per side, one minute each, alternating. Use tonight's stories as evidence. Then everyone votes with a show of hands, and we'll see if anyone changed their mind.

中文讲解：辩论环节。辩题：“机器人能学会的生成舞蹈就是真正的舞蹈。”教室左侧为正方，右侧为反方，每方两位发言人各一分钟，最后全体举手表决。

## 28. This week

This week: three readings. For technique, the Helios paper; read the abstract and look at the figures. For art and technology, the Wan-Dancer project page; watch three examples and decide which one you would call choreography. For culture, a short article on what happened to Sora. Quiz 07 is online, with two technique questions, two art questions and one reflection, due with the others at the end of the semester. Assignment 2 is due on October 31st. And next week, Lecture 8, we add sound: native audio-video, performance and real-time characters.

中文讲解：本周三篇阅读：技术——Helios论文（读摘要、看图）；艺术与技术——Wan-Dancer项目页（看三个例子，判断哪个算编舞）；文化——关于Sora停运的短文。第七次测验已上线，学期末一并提交。作业二10月31日截止。下周第八讲：原生音视频、表演与实时角色。

## 29. All demo links in one place

This slide collects every demo link from tonight, so you can find them again after class. They are also on the course website, on the Lecture 7 page.

中文讲解：本页汇总了今晚所有演示链接，课后也可在课程网站第七讲页面找到。

## 30. Music, minutes, and machines

To sum up tonight in one line: motion got longer, found a new choreographer, left the screen, and lost a tool. If you remember only one practical thing, keep your sources. Thank you, and see you next week.

中文讲解：一句话总结：运动变长了、有了新的编舞、离开了屏幕，也失去了一个工具。如果只记住一件事：保存你的源材料。谢谢，下周见。

## Demo links

- Story 1: Seedance 2.5 official page — https://seed.bytedance.com/en/seedance2_5
- Story 1: Helios feature video (YouTube) — https://www.youtube.com/watch?v=vd_AgHtOUFQ
- Story 1: Helios project page — https://pku-yuangroup.github.io/Helios-Page
- Story 2: Wan-Dancer project page — https://humanaigc.github.io/wan-dancer-project/
- Story 2: Wan-Dancer weights (Hugging Face) — https://huggingface.co/Wan-AI/Wan-Dancer-14B
- Story 3: ROBOTIS: Learning from Videos (YouTube) — https://www.youtube.com/watch?v=NeL2BmgcFJs
- Story 3: AI Sapiens documentation — https://docs.robotis.com/docs/systems/aisapiens/introduction/
- Story 4: OpenAI: Sora discontinuation — https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation
