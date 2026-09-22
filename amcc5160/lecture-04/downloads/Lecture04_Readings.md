# AMCC5160 Lecture 4 reading pack

## Core reading 1: Survey of Video Diffusion Models: Foundations, Implementations, and Applications
Yimu Wang et al. | 2026 revision; TMLR
https://arxiv.org/abs/2504.16081v3

Selected reading: Sections 1; 2.1 and 2.5; 4.1, 4.4 and 4.5. Skim Section 3.3.

### Read the map before the mathematics
Start with the introduction and video generative paradigms. Identify the difference between generating an entire sequence, generating progressively, and using an existing image as a condition. You do not need to derive the learning objectives for this lecture.

### Follow information through the model
In the architecture figures, locate the visual input, text or other conditions, spatial processing, temporal processing, and output. Explain why a sequence needs relationships across frames. The diffusion time step describes noise removal; it is different from the time axis inside a video.

### Choose a useful condition
Read Conditions, Consistency and Long video. For a shot of a painting moving inside a still room, identify a condition that specifies appearance and another that specifies movement or structure. Explain which parts remain unspecified.

### Read evaluation critically
A selected sequence can illustrate a capability without establishing reliability. Ask how identity, temporal continuity, action correctness, camera motion and visual quality are measured. Longer output does not by itself establish story coherence.

Activity: Sketch a three-shot art video. For one shot, name the input condition, the property to preserve, a likely failure, and a visible test.
Self-check: Can you explain why four attractive individual frames may still make a poor video?

## Core reading 2: Diffusion-Based Visual Art Creation: A Survey and New Perspectives
Bingyuan Wang, Qifeng Chen and Zeyu Wang | ACM Computing Surveys, 2025; preprint 2024
https://arxiv.org/abs/2408.12128

Selected reading: Sections 4.2, 5.1, 5.3, 5.4 and 6. Read the framework figures alongside the text.

### Begin with the artistic requirement
The survey connects artistic requirements and technical problems. Describe an intended experience in concrete terms: a delayed reveal, uneasy repetition, a sense of memory, or a shift in attention. A style label alone does not describe an entire artistic intention.

### Translate intention into something controllable
Name a visible or temporal property that can support the intention: composition, material, color, subject identity, timing, or the relationship between foreground and background. Then identify an input or edit that can influence it.

### Separate capability from interpretation
A method may change texture or preserve layout. Whether that change expresses nostalgia or unease depends on context and viewers. Explain the proposed connection, then use comparison or audience feedback to test it.

### Read the discussion as an invitation to combine perspectives
The technical and synergistic discussions help connect tools to creative practice. Do not turn the survey into a ranking of generators. Ask what decisions remain with the creator and how the workflow makes those decisions possible.

Activity: Make two versions of the same shot plan. Change only one property and predict how the audience experience will differ. Ask a peer what they actually notice.
Self-check: Can you distinguish an artistic goal from the technical operation used to pursue it?

## Core reading 3: Generative AI for Film Creation: A Survey of Recent Advances
Ruihan Zhang et al. | CVPR 2025 CVEU workshop
https://arxiv.org/abs/2504.08296

Selected reading: Sections 2.2 and 3; then choose two cases from Sections 4.1-4.6.

### Establish what the evidence describes
The Film Hack samples contain 8, 67 and 118 films in 2023, 2024 and 2025. They describe selected participants in a particular setting, not industry-wide adoption. The 2025 mean of 3.14 video tools per film is a sample statistic, not a recommended recipe.

### Read the ratings correctly
The importance/performance comparison uses 100 respondents and a 0-7 scale. It concerns artists' reported assessments of character identity, body movement, camera control and local editing. It is not an objective benchmark of current products.

### Trace two contrasting workflows
Compare, for example, Overthinking and For Pixi, or Clown and Fish Tank. Locate source material, generation or adaptation, manual correction, animation, and editing. Explain which stage contributes a visible feature in the final work.

### Treat continuity as a considered choice
A changing appearance can support fragmented identity, while a recurring character may require stable features. Ask what must remain legible for the audience and which variation serves the work. Selected stills cannot establish the quality of the full moving sequence.

Activity: Draw a three-shot plan for the studio scene. Assign a reference, generation step, revision step and evaluation check to each shot. Keep only tools that solve an identified problem.
Self-check: Can you explain one case without attributing every effect to the video generator?

## Further reading: State of the Art on Diffusion Models for Visual Computing
https://web.stanford.edu/~gordonwz/diffusion/
Sections 3.3-3.4, 5.2, 6.2 and 7.
Compare pixels, geometry, scene representations and movement data. Ask which later edits each representation supports.

## Further reading: Advances in Artificial Intelligence: A Review for the Creative Industries
https://link.springer.com/article/10.1007/s10462-026-11494-w
Sections 3.1, 3.3-3.5, 3.7 and 4.
Place generation alongside enhancement, segmentation, tracking, spatial capture and evaluation. Historical examples are not a current product ranking.
