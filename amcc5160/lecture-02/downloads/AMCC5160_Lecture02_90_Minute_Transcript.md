# AMCC 5160 · Lecture 02

120 slides · 12,197 spoken words · approximately 90 minutes at 135.5 words per minute. Timestamps are pacing estimates, not audio timecodes. Presentations, breaks, studio practice, and discussion pauses are additional.

## 001 · 00:00 · Generative Editing

Welcome to Lecture 2. Today our subject is generative editing: taking an existing image or video and changing it deliberately. We will work with a fictional exhibition called AFTER RAIN. Its central object is an amber glass pear with a blue stem. That slightly strange object gives us something recognizable to follow through different transformations.

By the end, I want you to explain how an editor uses its inputs, make a coherent artistic choice, and decide whether an edited video actually works. Keep one question in mind: when I ask the model to change a material, how much of the surrounding world should change with it?

## 002 · 00:47 · One object, three creative decisions

We will follow three connected decisions. First, there is an editing decision: which physical or visual property should change? Second, there is an artistic decision: why does that change matter to this work? Third, there is a temporal decision: how should the idea unfold when the image moves?

The same pear lets us compare those decisions without changing subjects every few minutes. You will see technical equations, published research figures, and prepared classroom artworks. They serve different purposes. A generated example helps us discuss an intention; a research figure helps us examine a method and the evidence its authors present.

## 003 · 01:31 · What changed beyond the object?

Look at these two images for ten seconds. The instruction was to make the pear ceramic. Before we admire the result, name something that changed outside the pear itself. Look particularly at the water and the light beneath the object.

The glass transmits amber light; the ceramic is opaque. A convincing material change therefore affects more than the object's surface color. Its reflection and lighting relationships may need to adapt. But some differences, such as an altered ripple pattern, may be incidental drift. Our job is to distinguish necessary consequences from unwanted changes. A beautiful result does not settle that question for us.

## 004 · 02:17 · Necessary change or accidental drift?

Let us make the opening comparison more disciplined. The disappearance of transmitted amber light is consistent with changing transparent glass into opaque ceramic. A changed blue stem, by contrast, would need a separate justification because the instruction did not request that transformation.

The reflection is more interesting. A material change can require its appearance to change, while its placement should still agree with the object and the water. We cannot classify every difference using a simple rule that change is bad. We need a model of the intended scene. That is why the edit contract includes allowed consequences as well as invariants.

## 005 · 03:02 · Tonight’s route

Here is our route. We will connect image-editing mechanisms to art direction, then extend both into video. The expanded deck has 120 slides, with a spoken teaching script paced for about ninety minutes. That estimate excludes presentations, the break, and the time you spend on studio exercises. The short slides separate individual ideas so we can inspect a calculation, a visual decision, or a failure without crowding them together. We will return to the same exhibition throughout. Rather than memorizing every model name, focus on the relationship between an input, a generated candidate, and the evidence you need to accept it.

## 006 · 03:47 · What you will be able to explain

Here are three abilities to check as we go. When a result fails, you should be able to choose a control that addresses the particular failure. If the model changes the wrong region, a spatial cue may help more than a longer style description.

You should also be able to connect a visual decision to an intention: for example, a small object in a large quiet space can suggest exposure. Finally, you should know how to challenge a video result at a difficult moment. A reappearance after occlusion tells us something that a pleasing opening frame cannot. These abilities combine technical understanding with artistic judgment.

## 007 · 04:33 · How image editors work

Let us start with the technical problem. An image editor needs to produce a changed image, but it also needs to respect the information already present. We can describe this as conditional generation under preservation constraints.

Conditional generation means that the result depends on inputs such as the source image and our instruction. Preservation constraints describe what should survive the transformation. These are separate requirements. A system may follow the requested style very strongly while losing the object's identity. Throughout this section, ask both questions: what information specifies the change, and what information helps retain the source?

## 008 · 05:16 · Three layers of an editing system

It helps to separate an editing system into representation, generation, and checking. Representation determines what information the model receives and how that information is encoded. Generation uses learned relationships to produce a candidate. Checking asks whether that candidate satisfies the task.

A failure can arise at any of these layers. A tiny inscription might already be damaged by reconstruction. A well-represented subject might drift during generation. An otherwise convincing result might be accepted because we inspected only a thumbnail. Keeping the layers separate prevents us from assuming that every problem can be solved with another sentence in the prompt.

## 009 · 06:00 · The edit contract

The gallery has become a forest. Let us write the edit contract. The intended change is the environment. The pear's identity, its pedestal, and the framing should remain recognizable. The ambient light and reflections are allowed to adapt to the forest.

Why include that last category? Because preserving every visible relationship would contradict the new setting. Imagine retaining a bright gallery-window reflection inside a dark forest. The model might preserve the source faithfully and still produce an implausible scene. Before generating, separate the requested change, the invariants, and the consequences that should adapt. Afterwards, inspect those categories separately.

## 010 · 06:43 · An invariant can be semantic or exact

The word preserve can hide two different requirements. Semantic preservation means that the same subject remains recognizable even though its lighting or appearance adapts. Exact preservation means that specified pixels remain identical.

For our exhibition, semantic identity may be enough for the pear in a forest. For a production asset with approved text or a fixed border, exact pixels may matter. A learned editor can be useful in both workflows, but the enforcement differs. If exact equality is required, copying the untouched region or compositing the generated part gives a direct mechanism. State which requirement you mean before evaluating the output.

## 011 · 07:28 · Editing as conditional generation

Read the expression as a distribution of possible edited results, given the source, instruction, and optional references. The symbol theta represents the model's learned parameters. The vertical bar means 'given.' We are not asking for a unique answer in every case. Two different forest scenes might both satisfy the same brief.

However, a source image is a condition rather than a promise that every unmentioned pixel will be copied. This explains a common frustration: the model understands the broad request but changes a small detail you cared about. To judge success, we need a more precise contract than 'it looks plausible.'

## 012 · 08:13 · A condition is not a hard constraint

The probability expression says that the system produces a candidate given conditions. It does not contain a certificate that the candidate passes our checks. The acceptance step is a separate decision that we impose on the result.

Imagine two forest outputs. Both look plausible, but one changes the pear's stem and one retains it. The model can assign probability to both; our contract can reject one. In practice, acceptance may involve human inspection, image comparisons, or explicit production constraints. The point is to avoid treating generation and validation as one event. Producing an answer is the beginning of evaluation, not its completion.

## 013 · 08:58 · Pixels and latent representations

The model may work in a learned compact representation called a latent. A variational autoencoder, or VAE, maps between image pixels and that representation. In this example, an image has 1,024 by 1,024 pixels and three color channels. That is 3,145,728 scalar values.

With the illustrated f16c64 configuration, the spatial dimensions become 64 by 64, with 64 latent channels. Multiplying gives 262,144 values. The ratio is twelve, not sixteen. Sixteen describes the reduction along each spatial axis. This calculation counts values; it does not measure file size or generation speed. Small text and fine textures are useful places to look for information lost through representation and reconstruction.

## 014 · 09:48 · Reconstruction before editing

Before diagnosing an editing model, try a simpler question: what survives the representation alone? Encode the source and decode it without asking for a new scene or material. Then compare the reconstruction with the original.

Look at small lettering, repeated fine textures, and thin boundaries. If a feature is already lost here, blaming the edit instruction misses an earlier limitation. If reconstruction retains it but editing removes it, we have learned something different. This is a diagnostic experiment, not a claim that every application exposes its VAE. When you have access to the components, isolating stages can make failures much easier to understand.

## 015 · 10:34 · Why token count matters

Now consider the number of tokens a transformer processes. In our toy example, one token per position on a 64 by 64 grid gives 4,096 tokens. Grouping each two-by-two region gives 1,024 tokens, a reduction by four.

Dense self-attention compares token pairs. Squaring the two counts gives 16,777,216 and 1,048,576 pair scores. That is a reduction by sixteen. This is why representation choices matter so much for cost. It is not a claim that the whole system runs sixteen times faster. Text tokens, reference tokens, other layers, and implementation details also matter. The useful habit is to distinguish a component-level calculation from an end-to-end measurement.

## 016 · 11:23 · Resolution changes the attention problem

Now increase the image resolution while keeping the tokenization rule fixed. Doubling both spatial axes creates four times as many positions. If those positions become image tokens, dense attention has sixteen times as many token pairs.

This is a powerful scaling intuition, but notice the assumptions: the tokenization stays fixed, and we are counting the image-token portion of attention. A real system may resize, tile, group tokens, or use a different attention implementation. It also spends time elsewhere. Use the calculation to predict where pressure might arise, then measure the actual workflow rather than announcing a sixteen-fold runtime penalty from the formula alone.

## 017 · 12:09 · Inside a current image editor

Let us walk through this architecture from the input side. The source image contributes semantic information through a vision-language component and visual information through a VAE. The target stream begins with an evolving noisy representation. The transformer processes that stream together with the conditions.

During training, we possess an example of the desired edited target, so we can measure what the model should learn. During inference, we have the source and request but not the desired target. The model must generate it. That difference is essential. The architecture does not quietly receive the answer when you ask it to edit your photograph.

## 018 · 12:54 · Training knows the target; inference does not

Let us put training and inference side by side. In training, the edited target is part of the example. It allows us to define the desired direction or error signal. The model's prediction is compared with information we already possess.

At inference, that target is absent. We provide the source and request, perhaps with references, and ask the model to construct a suitable result. Confusing these settings can make an architecture diagram look more magical than it is. A box labeled target during training does not mean the application receives your finished artwork before generating it. Learning uses answers so later generation can operate without them.

## 019 · 13:41 · Two representations of the source

Think of these two representations using our pear. Semantic features help with questions such as: which object is the pear, what does ceramic mean, and what does 'it' refer to in the instruction? Visual latents provide appearance information, including shapes and textures that help keep the particular source recognizable.

This is a conceptual distinction, not a claim that the branches have perfectly isolated responsibilities. Learned representations can overlap in what they encode. The practical implication is that recognizing the correct object and retaining its exact appearance are related but different achievements. If an edit fails, ask whether the model misunderstood the request or lost important visual information.

## 020 · 14:28 · A semantic success can lose visual identity

Suppose the instruction refers to the pear, and the model correctly changes a pear-shaped object. That is a semantic success. But perhaps the new pear has a different silhouette, a shorter stem, or another characteristic that makes it a different instance.

Category recognition answers what kind of thing is present. Instance preservation asks whether this particular thing survived. Artists often care intensely about the second question, especially for a recurring character or designed object. When reviewing a result, identify a few distinctive cues rather than relying on category alone. A model can understand the noun in your prompt while losing the subject you intended to keep.

## 021 · 15:15 · Flow matching: the training target

We will use a simple flow-matching example. At time zero we have noise, epsilon. At time one we have the target latent, z-one. At an intermediate time, we form a mixture: one minus t times the noise, plus t times the target. Along this straight path, the target velocity is the target latent minus the noise.

The model learns to predict a velocity from the intermediate state, time, and editing conditions. Remember that we know the target during training. At generation time, we use the learned predictions to move from noise toward an output. These are sampling coordinates, not seconds of a movie. Some papers reverse the time convention, so always check it.

## 022 · 16:05 · The interpolation endpoints

Before trusting an equation, check its easiest cases. At t equals zero, the coefficient on the target becomes zero, so we recover the noise. At t equals one, the coefficient on noise vanishes, so we recover the target latent.

That endpoint check gives the interpolation a concrete interpretation. In between, both terms contribute. Along this simple straight path, the difference between target and noise gives the direction we train the model to predict. You do not need to imagine a recognizable half-finished image at every intermediate point. The calculation takes place in a learned representation, and this path is a teaching construction rather than the only possible design.

## 023 · 16:53 · One sampling step

Here is one Euler sampling step. Take the current coordinate, add the step size multiplied by the predicted velocity, and obtain the next coordinate. With our invented numbers, that is 0.20 plus 0.10 times 0.60. Take a moment to calculate it.

The answer is 0.26. In a real latent, this update applies to many coordinates, and practical samplers may use more sophisticated methods. Repeating updates eventually gives a representation that the decoder turns into pixels. More steps require more model evaluations, but they do not automatically resolve an ambiguous brief. Sampling accuracy and instruction clarity are different things to diagnose.

## 024 · 17:39 · Sampling error and an unclear brief

A numerical solver can follow a learned field accurately while the resulting edit still misses the brief. That is because there are two questions: how well do we approximate the model's generative process, and does that process produce the change we wanted?

More sampling steps may address approximation error in a particular setup. They do not automatically tell the model which of two objects you meant by 'it.' Nor do they guarantee that the learned distribution preserves a tiny identity cue. When comparing settings, inspect the kind of failure that changes. This keeps a computation adjustment from becoming a substitute for clarifying the artistic task.

## 025 · 18:25 · Where edit supervision comes from

Where does the ability to follow an edit instruction come from? A training example can contain a source image, an instruction, and the corresponding edited target. InstructPix2Pix is an early example that used synthetic editing data to teach this relationship.

Suppose a training pair says 'make the object ceramic,' but its target also moves the camera and replaces the background. The learning signal no longer cleanly identifies the requested transformation. The model may learn unwanted associations. This gives us an important data-quality question: did the target accomplish the requested change while preserving what should remain? Attractive targets alone are not enough to teach dependable editing.

## 026 · 19:11 · A training pair can teach the wrong edit

These are imagined training-pair mistakes. A ceramic instruction accompanied by a closer camera could teach an association between material and reframing. A background replacement that also enlarges the subject could entangle setting with scale.

The problem is not that every training pair must be visually identical outside a tiny region. Some edits require dependent changes, as our reflection example shows. The question is whether the differences are explained by the instruction and scene. Data quality includes that relationship. If we want dependable editing, we should inspect whether the examples teach both the requested transformation and the intended boundaries of that transformation.

## 027 · 19:56 · Classifier-free guidance (CFG)

Classifier-free guidance combines a baseline prediction and a conditioned prediction. Start with the baseline, then add a scaled difference between the conditioned and baseline predictions. With scale one, the expression reduces to the conditioned prediction.

When the scale exceeds one, we extrapolate in that direction. This can strengthen the requested change, but it can also amplify artifacts. The baseline is system-dependent: it may omit the text while retaining the source image. So do not assume it always means 'no conditions at all.' Guidance affects generation-time predictions. Fine-tuning changes learned parameters. Those are different interventions, even if both influence the final appearance.

## 028 · 20:41 · Guidance: a numerical example

Let us calculate guidance rather than describe it vaguely. The baseline predicts 0.2, and the conditioned prediction is 0.5. Their difference is 0.3. With scale two, we add twice that difference to the baseline and obtain 0.8.

The result lies beyond the conditioned prediction. That is what we mean by extrapolation. If the difference points toward a useful edit, stronger guidance may help. If it also contains an artifact or unwanted tendency, that can be strengthened too. This scalar example does not prescribe a universal setting. It explains why a control called guidance is neither an accuracy percentage nor a guarantee of faithfulness.

## 029 · 21:28 · Different controls carry different information

Different controls communicate different kinds of information. Text describes a requested change. A mask specifies a region. A spatial condition can describe pose, depth, or edges. An image reference can supply appearance information that would be difficult to express precisely in words.

These are not interchangeable knobs, and every product does not expose all of them. ControlNet and IP-Adapter are examples of distinct architectural approaches. If exact untouched pixels are essential, a generation mask alone may be insufficient; explicit copying or compositing can enforce that requirement. Choose a control by asking what information is missing, then check whether the resulting image actually respected it.

## 030 · 22:14 · A mask locates the edit; a seam reveals it

A mask helps specify where an edit should occur. But selecting a region and making it belong in the scene are different challenges. At a boundary, hair, reflections, transparent surfaces, and soft shadows can make the division especially difficult.

For the ceramic pear, inspect both the edge of the object and the relationships beyond it. A clean silhouette can coexist with an implausible reflection. Conversely, a convincing new reflection can coexist with a rough compositing seam. Think of the mask as spatial information. Then ask which surrounding relationships must adapt and which should remain untouched. That makes local editing a scene-integration problem as well as a region-selection problem.

## 031 · 23:02 · Multiple references need distinct identities

With several references, the system must know which reference contributes which information. Imagine asking for the sculpture from image one and the atmosphere from image two. If the references become confused, you may get the wrong object with the right lighting.

The illustrated research approach uses separators and image-index information to distinguish inputs. The important lesson is the reference-role problem. In an art brief, name the role of each image rather than presenting a pile of vaguely related inspiration. Then inspect for leakage: did a composition reference accidentally replace the subject? This figure describes one proposed mechanism, not a universal design used by every editor.

## 032 · 23:48 · A reference-role failure is visible in the output

Look at these published multi-image examples with reference roles in mind. Before judging the output, identify what each input was supposed to contribute. Then trace the subject and the requested transformation into the result.

A reference-role failure can look superficially attractive. The system may borrow the wrong object's appearance or import a background that was never intended. That is why naming the role first matters. We are examining qualitative examples from a particular paper, not conducting a broad comparison between products. The figure helps us practice an inspection method: follow the intended contribution of each input and look for unintended transfers between them.

## 033 · 24:34 · Attention as weighted information gathering

Attention gathers information through weights. Our tiny example assigns a weight of 0.8 to a material-reference value of 0.9, and 0.2 to a background-reference value of 0.1. Multiply each weight by its value and add. We obtain 0.72 plus 0.02, which is 0.74.

Real systems use learned vectors and many attention heads, rather than these convenient semantic labels. The example illustrates weighted combination. It also shows why mixing up reference roles can matter. Be careful with interpretation: a large attention weight alone does not prove that a particular input caused a visible feature in the final image.

## 034 · 25:20 · Softmax weights sum to one

The weights in this simplified attention example sum to one. That makes the result a weighted combination of the values. A larger weight makes the associated value contribute more to this particular calculation.

Now be cautious about jumping from the calculation to an explanation of the final image. Real networks contain many layers, heads, and transformations. A high weight at one point may not tell us why a visible feature ultimately appeared. The arithmetic helps us understand information gathering, but causal claims need stronger analysis. For practical reference editing, the useful question remains whether the intended information survives in the output, regardless of how compelling an attention visualization looks.

## 035 · 26:08 · LoRA: low-rank adaptation

LoRA stands for low-rank adaptation. Instead of learning an unrestricted update to a large weight matrix, we represent an update using two smaller matrices. For our example, the full matrix has 4,096 by 4,096 entries: 16,777,216 parameters.

With rank sixteen, the two update matrices contain 4,096 times sixteen plus sixteen times 4,096 parameters. That is 131,072, or 128 times fewer than the full matrix. This is a calculation for one layer's update, not a promise that the whole model becomes 128 times smaller or faster. Adaptation may help with a reusable subject or visual language, but its examples must still be good and varied enough to avoid overfitting.

## 036 · 26:59 · Adaptation needs a held-out check

Adaptation can look successful when we evaluate only familiar examples. A subject may reappear convincingly in backgrounds or viewpoints similar to its training images. That tells us something, but it may not tell us whether the adaptation learned a reusable concept.

Reserve a few conditions that were not part of fitting: a different camera view, a new setting, or a changed composition. Then inspect the features that define the subject. If the model retains the concept only by reproducing a familiar background, it has a narrower ability than we hoped. A held-out check makes that distinction visible before we build a whole project around it.

## 037 · 27:45 · What does the reward favor?

A reward tells a learning process what kinds of outputs to favor. The figure shows a recent approach that separates task-specific reward training and then distills what is learned. Look at the categories: editing quality involves more than a single judgment of attractiveness.

Now imagine an artwork whose purpose is to feel awkward or disturbing. A generic preference for polished images could work against that purpose. Human preference signals are useful, but they do not define artistic merit for every project. This is the bridge to the next section: technical optimization can help produce candidates, while an artist still needs to decide which properties serve the work.

## 038 · 28:32 · One reward cannot stand in for every intention

These edit examples invite a question about evaluation. Which properties would you reward separately? You might ask whether the instruction was carried out, whether identity survived, and whether the image is visually convincing.

Those judgments can disagree. A highly polished output might erase an awkward feature that is central to the artwork. An unusual composition might serve the brief while attracting a lower generic preference score. We should understand what a reward encourages before treating a high score as artistic approval. The published examples illustrate the research setting; our classroom task is to articulate the intention against which we would judge a particular result.

## 039 · 29:18 · Two ways an edit can disappoint

Here are two different disappointments. In the first, the image is beautiful, but the pear loses its identity or the exhibition's premise disappears. In the second, the requested object changes correctly, but the reflection makes the material look pasted on.

Can you name a third possibility? A result can be technically successful yet artistically uninteresting. These categories help us give better feedback than 'good' or 'bad.' Identify the property that failed and the evidence you can see. That diagnosis suggests different revisions: improve identity conditioning, repair lighting relationships, or reconsider the artistic direction itself.

## 040 · 30:00 · A useful diagnosis changes the next action

A diagnosis becomes useful when it changes the next action. If the wrong object changes, first suspect an ambiguous reference or region specification. If the correct object becomes another instance, appearance grounding may be the issue. If the material looks disconnected from its reflection, the dependent change may be missing.

These are candidate explanations, not automatic conclusions. Choose a small revision that tests one of them. If it does not help, reconsider the hypothesis. This is more informative than changing the prompt, seed, reference, and model all at once, because then a successful result would leave us unsure which intervention mattered.

## 041 · 30:45 · Two-minute edit diagnosis

Work with the person beside you. The request is 'make the pear ceramic.' Name one thing that should remain and one thing that may need to change as a consequence. Then choose the first control you would try. You have forty-five seconds before we compare answers.

A useful invariant might be the silhouette, blue stem, camera, or pedestal. A dependent change might be transmitted light or the reflection. A precise instruction and source image are a reasonable first attempt. If the problem is repeated background drift, a mask or compositing step may help. There is no single best tool independent of the failure you observe.

## 042 · 31:31 · A worked ceramic-edit contract

Here is one worked contract for the ceramic edit. The blue stem and silhouette are identity anchors. Transmission, highlights, and reflection appearance may adapt to the opaque material. The camera and pedestal should remain stable unless the brief requests a reframe.

After generation, inspect the boundaries and water before accepting the image. A thumbnail can hide a softened stem or a reflection that belongs to the old material. You can write a different valid contract for another artwork. What matters is that the contract is specific enough to distinguish an intended transformation from a failure, and that the inspection actually checks the properties it names.

## 043 · 32:17 · Technical checkpoint

Before the break, let us retrieve three ideas without looking back. What is a latent? How does guidance differ from changing the model's weights? And why does supplying a source image not prove that identity will be preserved?

A latent is a learned representation. Guidance combines predictions during generation, while adaptation changes parameters. Conditioning makes source information available, but success still needs inspection. Carry that last point into your studio work: adding a control is an action; demonstrating that a constraint held is evidence. After the break, we will use this technical understanding to make artistic decisions more deliberately.

## 044 · 33:01 · The technical model in one sentence

Try to explain the technical section to someone who has not seen the equations. The editor converts inputs into representations, uses learned relationships to generate a candidate, and gives us a result that still needs checking.

Now add one concrete example to each part. A reference can supply appearance; guidance can alter a generation-time prediction; inspecting the blue stem can test identity. If you can connect those examples, you have a working model rather than a list of terms. After the break, we will ask what makes a candidate worth choosing for an artwork, even when several candidates satisfy the technical request.

## 045 · 33:46 · Break

We will take ten minutes and return at 19:55 on tonight's schedule. When you come back, think about a series of images you would recognize as belonging to one artwork. What makes them belong together: the subject, the palette, the treatment of space, or something else?

Leave that question open for now. We will use it to move from individual editing operations to a coherent visual language.

## 046 · 34:16 · The question after the break

Keep this question in mind during the break: how could a quiet photographic poster and a flat paper-collage poster belong to the same exhibition? They need not share every texture or compositional detail.

Perhaps they share a subject, a palette, and an intention about fragility. Perhaps their differences are too large, and the series needs another rule. There is no answer to reveal immediately. We will use the examples to distinguish consistency of purpose from simple visual sameness. That distinction will also help when we ask what should remain coherent across the changing frames of a video.

## 047 · 34:59 · Art direction

Welcome back. The same model can produce many plausible outputs. Art direction decides which differences matter for a particular work. We will use reference, composition, and iteration to develop that judgment.

Our aim is a coherent body of work. The question is not simply whether a prompt produces something impressive. It is whether the visual decisions reinforce an intention and continue to make sense across a poster and a moving image. As we look at the examples, try to name an observable relationship that carries the idea. That will make your criticism more useful to another artist.

## 048 · 35:42 · Intention gives variation a purpose

A tool question asks what an editor can transform. An artistic question asks which transformation helps a viewer experience something intended by the work. They inform each other, but one cannot replace the other.

For example, a model may make an object enormous with little effort. That capability does not tell us whether monumentality supports an exhibition about fragility. We need to look at the relationships created by the change. Technical knowledge expands the set of decisions we can make; intention gives those decisions a direction. Throughout the art section, explain why a change matters before debating whether the tool performed it impressively.

## 049 · 36:28 · The exhibition brief

Here is our fictional commission: AFTER RAIN, an exhibition about fragile objects in changing environments. The deliverables are a poster and a five-second moving image. The amber pear and its blue stem provide recognizable anchors.

The premise gives us room to make different choices. Fragility might appear through scale, unstable surroundings, material, or a quiet sense of exposure. A more dramatic image is not automatically a better response. Ask what your version makes the viewer feel about the object. You can use the supplied assets or another subject, but write the intention before choosing the visual treatment.

## 050 · 37:11 · Fragility has visible consequences

The brief's word fragility is deliberately open. We can explore it through a small object exposed in a large environment, through restrained movement, or through a reveal that makes the viewer uncertain about what they see.

These are possible interpretations, not a recipe that every student must follow. Choose one and ask what visible evidence would support it. If you say the work feels vulnerable, point to the scale, spacing, or material relationship that produces that feeling. This is how an abstract intention becomes discussable in critique. We do not eliminate interpretation; we give it something concrete to work with.

## 051 · 37:55 · A reference can teach composition

Look at Hokusai's print before trying to name a style. Follow the path of your eye. Notice the relationship between the large wave, the boats, and the small distant mountain. Repeated curves create rhythm, while the scale difference and suspended wave create tension.

Those are my visual observations, and you may notice others. The useful move is to translate a relationship into your own work. For AFTER RAIN, a small object beneath a large curved structure might suggest vulnerability. That is a compositional lesson. It does not require reproducing the whole print or reducing the reference to an artist's name in a prompt.

## 052 · 38:41 · Reference as a relationship, not a label

Instead of using a reference as a label, describe a relationship you can observe. You might want a small stable form beneath a large dynamic curve, or a rhythm that moves the eye through the composition.

Then translate that relationship into the new subject and brief. The result should be judged as its own artwork, not as a contest to resemble the reference. This approach makes references more useful to collaborators because they can understand what you are borrowing. It also makes iteration more focused: if the intended tension is missing, you can revise scale or rhythm rather than vaguely asking for more influence from the source.

## 053 · 39:28 · Composition before surface detail

In this version, the pear occupies relatively little space, and a pale field remains above it. Where does your eye arrive first? Does the empty area feel calm, lonely, or monumental? Your answer should connect to the exhibition's premise.

This is a deliberate recomposition, so we should not evaluate it as an attempt to preserve the opening image's exact framing. Different tasks need different contracts. For a poster, we also need space for type. Before polishing textures, ask whether the arrangement gives the viewer the intended sequence of attention. A beautiful surface cannot rescue every compositional problem.

## 054 · 40:11 · Negative space has a job

Negative space does two jobs in this poster. It changes how large or isolated the object feels, and it creates a place for typography. These are connected design decisions rather than separate finishing steps.

If you fill the pale area with dramatic detail, the image may become more visually active but leave no calm route for reading the title. If you reserve too much space, the subject might lose the presence you wanted. Evaluate the space in relation to the finished use. A generative background is part of a larger composition when it must carry text, branding, or other exact elements.

## 055 · 40:56 · A visual language has rules

Here the visual language changes to a paper-collage interpretation. Torn edges replace smooth contours. Flat layers replace much of the optical depth. Amber and indigo remain useful subject and palette anchors.

If we extended this into a series, what rules would you keep? Perhaps shadows would remain flat, edges would stay irregular, and reflections would become simplified shapes. These visible operations are more precise than a vague request for an artistic look. This is an AI-generated collage illustration, not a physical collage. We can still critique whether its treatment of space and material is internally coherent.

## 056 · 41:39 · A collage rule must survive every surface

A visual language becomes convincing through its consistency across surfaces. In a collage, paper-like edges and flat layers establish expectations. A sharply photographic reflection may interrupt those expectations even if it is locally realistic.

You could deliberately use that contradiction, but then explain its purpose. Otherwise, simplify the reflection so it follows the same material logic as the surrounding forms. This is a useful example of why realism is not always the target. The right revision may make one area less optically detailed and the artwork more coherent. Judge the exception against the system of visible rules you chose.

## 057 · 42:23 · Reference roles

A reference becomes easier to use when we assign it a role. One image might define the subject, another the composition, and another the material treatment. Write down which property you want from each.

The model may not isolate those roles perfectly. That is why you should look for unwanted transfers, such as importing a reference's background when you only wanted its palette. Try removing one reference and observing what disappears. Start with the smallest useful set. If five references contradict one another, adding a sixth may make the problem harder to diagnose rather than solve it.

## 058 · 43:06 · Removing a reference is an experiment

Removing a reference can answer a specific question: was it contributing the property we intended? First write its role. Then compare outputs with and without it, keeping the rest of the setup as stable as the tool permits.

If the desired atmosphere disappears but the subject remains stable, the reference may be doing useful work. If removing it improves identity without losing anything important, it may have been distracting the process. Randomness complicates a single comparison, so repeated samples can help. The point is not to minimize inputs for its own sake. It is to understand the contribution and cost of each input.

## 059 · 43:52 · An art-direction prompt

Read this art-direction prompt as a set of decisions. It identifies the pear's silhouette and stem, places the object low on the right, reserves a pale area for the title, and specifies restrained reflections and soft daylight.

Which phrases describe properties we can directly inspect? Position and negative space are relatively concrete. 'Fragile and still' is more interpretive, so the surrounding visual choices help give it meaning. A good prompt does not eliminate artistic judgment. It records an intention that we can compare with the result. If the output disappoints, revise the decision that failed rather than adding unrelated adjectives.

## 060 · 44:36 · Prompt language can be observable

Words such as quiet and fragile are useful intentions, but they leave room for interpretation. We can make them more actionable by adding visible decisions: reserve a pale area, keep the subject small, or preserve a distinctive stem.

The table connects broad language to an instruction and an inspection. Notice that the connection is a proposal. A small object does not always communicate fragility; context can make it feel precious or monumental instead. That is why the final column matters. We test whether the chosen visual device produces the intended effect, rather than assuming that writing the adjective guarantees its meaning.

## 061 · 45:21 · Iteration as a controlled comparison

Iteration becomes informative when we know what changed between attempts. Suppose we compare two lighting treatments. Keep the subject and composition instructions stable, and record the references and model version. If a seed control exists, holding it fixed can help the first comparison.

A shared seed still does not guarantee identical composition after a prompt change. If results vary widely, examine several outputs for each condition. Otherwise, one lucky sample may decide the whole direction. The table is a proposed experiment, not measured results. Its purpose is to make each generation answer a question about the artwork.

## 062 · 46:04 · One sample is weak evidence of a direction

A single output can give us a misleading impression of a direction. Perhaps one version received unusually favorable geometry or lighting from a random sample. If we choose a whole workflow on that basis, the next attempts may disappoint us.

Compare several outputs under each condition when the decision matters. Look for recurring strengths and failures, not only the best image. Keep the comparison proportional to the task: a quick sketch does not need a research benchmark. The general habit is to match confidence to evidence. One successful candidate establishes that something happened once; repeated behavior gives stronger support for planning around it.

## 063 · 46:50 · Typography is part of the image

Now we have a poster, not only a background image. What do you read first and second? The title uses reserved negative space, and the supporting line establishes a hierarchy without competing with the sculpture.

The typography here is editable text placed over the generated background. Even when a model can generate letters, separate type gives us deliberate control over exact wording, spacing, and size. Notice that this choice connects production and design: we reserved space earlier because we knew how the image would be used. Art direction includes those practical relationships, not only the moment of image generation.

## 064 · 47:34 · Typography needs a reading order

Typography establishes a sequence of attention. Ask what the viewer should read first, what comes next, and where their eye returns to the artwork. In our poster, reserved space allows the title to be clear without covering the sculpture.

This is also a production decision. Exact text can remain editable, while the image carries the material and atmosphere. If the title feels too dominant, change size, placement, or contrast and inspect the whole composition again. Do not judge the text in isolation from the image. The poster is the relationship between them, including the empty space that lets each element do its job.

## 065 · 48:20 · Two directions for the same brief

Both directions respond to the same brief, but they use different material languages. Choose one for AFTER RAIN and give a reason tied to fragility or the changing environment. 'More realistic' is a description, but it is not yet an argument for why the direction serves this exhibition.

Now imagine each poster moving. What should animate? A reflection could shift, a paper layer could separate, or the camera could reveal the subject slowly. Some visual languages translate into motion more naturally than others. We can use that future requirement when choosing the still-image direction, instead of treating video as an unrelated task later.

## 066 · 49:06 · Selection requires a reason tied to the brief

When choosing between two directions, give a reason tied to the brief. One version might communicate fragility through spatial isolation, while another does so through torn edges and unstable layers. Which effect is more appropriate for the work you want to make?

The rejected version still has value if you can explain what it taught you. Perhaps it revealed that the palette mattered less than scale, or that an apparent failure created a useful tension. An accidental result can become an intentional choice when you understand and adopt its effect. Selection is therefore an active part of authorship, not merely choosing the most polished image.

## 067 · 49:52 · A critique with observable evidence

A useful critique names a visible feature, explains its effect, and proposes a revision. For example: the crisp reflection makes the collage feel photographic, so I would simplify its shape to match the flatter layers.

Compare that with 'I do not like the reflection.' The first comment gives the artist a relationship to inspect and a possible next move. You can disagree about the intended effect, but make the disagreement specific. This is a classroom critique framework rather than an official grading rubric. Use it to connect evidence in the image to the idea the work is trying to communicate.

## 068 · 50:36 · A revision can be tested

Compare these two forms of feedback. 'Make it more artistic' gives the creator very little to test. A request to simplify the reflection into paper shapes names a visible operation and an intended improvement in coherence.

After revising, inspect whether the change actually helped. It may solve one mismatch while making the space too flat for the concept. Good critique therefore proposes an experiment rather than declaring a universal rule. You can disagree with the suggestion and still learn from testing it. The aim is to make the relationship between observation, intention, and revision clear enough for another person to follow.

## 069 · 51:21 · Studio: one brief, two directions

You have eight minutes for a small studio exercise. Spend the first minute choosing a subject and writing two invariants. Spend four minutes making or sketching two versions with different visual languages. Then compare for two minutes and choose a direction in the final minute.

If you do not have access to a model, use the prepared examples or sketch your revisions. The important output is a decision with evidence. Keep the instruction and record one failure observation. When you select a version, explain what the rejected version taught you. That makes the process more useful than simply collecting attractive images.

## 070 · 52:06 · The studio record is part of the work

Keep a small studio record. Write the intention and invariants, note the prompt and reference roles, and retain a rejected result with one observation. That record explains what the attempt was testing.

Without it, a folder of attractive images can become difficult to learn from. You may not remember which input changed or why a version was rejected. Documentation does not need to be elaborate. A few precise lines can make the next iteration more informed and help someone else understand your process. In a critique, the record also lets us discuss your decisions rather than guessing them from the final image alone.

## 071 · 52:52 · Gallery discussion

Let us hear from two pairs with different choices. Before each pair explains, I want the room to identify the visual rule they notice. Then tell us which decision carries the idea, what changed unintentionally, and what you would revise with five more minutes.

Listen for the difference between an intentional transformation and an accidental inconsistency. We can accept large changes if they serve the brief. To close this section, identify the properties that should stay stable when the image begins to move. That list becomes the starting point for our video-editing contract.

## 072 · 53:33 · A still-image rule becomes a motion rule

A rule in a still image becomes a rule through motion. The blue stem should remain attached as the pear turns. Paper-like edges should not suddenly become photographic when the camera moves. A quiet composition may need a restrained reveal rather than a dramatic camera sweep.

Some properties must change correctly with perspective and lighting, so motion rules cannot demand frozen appearance. Instead, state the relationship that should persist. This prepares the video edit contract: identify the subject cues, material behavior, and intended movement, then choose moments where those requirements are challenged. We are extending art direction into time rather than abandoning it for a technical demonstration.

## 073 · 54:20 · Generative video editing

Video adds time to the editing problem. The object can move, rotate, disappear, and return. Its appearance should remain coherent through those events, while motion itself remains readable.

A convincing still frame is therefore only one piece of evidence. We will examine selected frames from published research, use them to understand what the systems attempt, and discuss what those selections cannot prove. Then we will design a short transformation for AFTER RAIN. Keep the same habit as before: specify what changes and what persists, but now include when and how those requirements might fail.

## 074 · 55:02 · Video has two different time axes

There are two different meanings of time in this lecture. Video time describes the events we watch: the camera moving, an object turning, or a cut occurring. Sampling time indexes the generative updates used to produce a candidate.

A model can update a representation of many video frames during one sampling step. That step is not simply the next moment in the scene. Keeping the axes separate helps us read technical diagrams and avoid confusing more generation steps with a longer movie. The artistic question concerns the timing of events; the numerical question concerns how the model constructs the representation that will display those events.

## 075 · 55:48 · A video edit must survive the next frame

Read these source frames in chronological order. The subject's pose and visibility change. If we stylize the clip, we want its identity to persist, but we do not want every frame to become identical.

Temporal consistency means a coherent relationship through motion. A patch on a face should remain attached as the head turns; a texture should behave plausibly as the camera changes. These selected frames help us identify inspection targets. They cannot establish that every intervening moment is smooth. To judge a finished video, we would need to watch the actual sequence, including the transitions that a contact sheet leaves out.

## 076 · 56:33 · Consistency allows correct change

Correct change is part of temporal consistency. A turning face should change its visible outline. A moving camera should alter perspective. A surface entering shadow may become darker. None of these differences is automatically a failure.

Unwanted instability occurs when identity, texture, or style changes without support from the scene. The distinction requires an understanding of motion and visibility, not only a difference between pixel arrays. When you review a clip, ask what event explains a change. If there is no plausible event, inspect it more closely. This gives temporal critique a more useful vocabulary than simply saying that every frame should match.

## 077 · 57:19 · A moving image can reveal an idea

This strip is a storyboard: a plan for three shots, not evidence from generated video. We begin with a reflection, reveal part of the object, and finally show the wider scene. The viewer can infer the subject before seeing it directly.

For a five-second piece, one possible allocation is one and a half seconds, one and a half seconds, and two seconds. Those timings are artistic choices. What would change if we revealed the object immediately? Think about how timing can communicate fragility or uncertainty. The technical workflow should support that experience rather than dictate a sequence of effects without purpose.

## 078 · 58:04 · Five seconds can have a structure

Five seconds is short, but it can still have a structure. Our proposed first interval shows a reflection, giving the viewer clues. The second offers a partial view. The final interval reveals the wider setting and changes how the object is understood.

Try another allocation and predict the effect. A longer reflection might create uncertainty; a quick reveal might make the piece feel like a product shot. These timings are artistic proposals, not measured outputs from a video model. By deciding the experience first, we can evaluate whether the generated motion and cuts support it. A technically smooth sequence can still have the wrong rhythm.

## 079 · 58:50 · An image editor can read a contact sheet

The research begins with a surprisingly simple experiment: arrange video frames into a contact sheet and give that image to an image editor. This asks whether an existing image-editing capability can transfer across multiple views presented together.

Treat the result as evidence that motivates a research direction. A grid can make frames available in a shared context, but a successful-looking selection does not prove reliable video editing. There may be flicker between the sampled frames. The next steps investigate how to represent video more effectively and adapt the model, rather than assuming a contact sheet alone solves time.

## 080 · 59:33 · A contact sheet leaves gaps in the evidence

A contact sheet is selective evidence. It shows the appearance of sampled moments while leaving gaps between them. A feature might disappear and return inside one of those gaps, or a transition might produce an abrupt style change.

This does not make contact sheets useless. They are excellent for comparing composition, examining broad changes, and introducing a method. The limitation is the conclusion they support. Use stills to identify what to inspect, then use playback to test continuity. When a paper or product page shows selected frames, keep that distinction in mind before treating the presentation as proof that the entire video is stable.

## 081 · 60:19 · The grid can live in latent space

The grid can also be constructed in latent space. Instead of only combining visible pixel images, the method encodes frames and arranges their tokens into a virtual image grid. The published example changes a bus into a graphics card.

The key idea is shared treatment of positions within that constructed representation. Do not confuse this step with using a video VAE; they are different design decisions. Putting frames near one another in a representation can help the model exchange information, but it does not impose a guarantee of physical continuity. We still need to inspect what survives across changing views.

## 082 · 61:03 · A virtual grid is a representation choice

A virtual grid provides a way to arrange information for a model trained around image-like structure. It creates shared context and positional relationships among frame representations. That can be a useful bridge when reusing an image editor.

But arrangement alone does not enforce the laws of motion or the persistence of a hidden object. Those abilities depend on the model, adaptation, data, and other parts of the workflow. Separate the representation choice from the capability claim. A diagram can explain how frames enter a system without proving that the system handles every difficult event. That proof would require appropriate outputs and evaluation.

## 083 · 61:48 · Repurposing an image model for video

Now follow the full research pipeline. A Wan 2.1 video VAE encodes the source video. Learned projections connect that representation to the image-editing transformer, which operates on a virtual latent canvas. The output is decoded back into video.

The method trains the projections and adapts the transformer using LoRA or full fine-tuning. An optional Wan 2.2 stage provides temporal enhancement. The larger lesson is reuse: existing image-editing knowledge can be adapted to a new representation. This is the architecture of this particular paper. We should not infer that a commercial editor with a similar user experience has the same internal design.

## 084 · 62:34 · Adaptation connects incompatible representations

The image model and video VAE do not necessarily speak the same representational language. Learned projections help connect them. Adaptation then allows the editing transformer to operate usefully with the video representation.

This is a common engineering pattern: reuse a capable component while learning the interface and behavior needed for another task. The benefit is not automatic. A projection must preserve useful information, and the adapted model must learn how the new structure relates to edits. In the published pipeline, decoding returns the edited representation to video. Follow the information through every stage rather than treating the name of the reused model as an explanation by itself.

## 085 · 63:21 · Temporal compression: a concrete example

Here is a concrete temporal-compression example. The source contains forty-five pixel frames. Under the stated convention, forty-five equals four times eleven plus one. The latent sequence therefore contains eleven plus one, or twelve frames.

The first-frame convention is why simply dividing forty-five by four gives the wrong answer. The twelve latent frames can be arranged as a three-by-four virtual grid in this example. Spatial compression also happens. Keep two clocks separate: video time describes events in the clip, while sampling time describes the model's generative updates. A denoising step is not the next frame of the movie.

## 086 · 64:04 · Temporal compression preserves a special first frame

Solve the frame-count relationship step by step. Start with four k plus one equals forty-five. Subtract one to obtain forty-four, then divide by four to get k equals eleven. The latent sequence contains k plus one frames, so its length is twelve.

This arithmetic encodes the special handling of the first frame in the stated convention. It is different from simply dividing the total number of pixel frames by four. When reading a model specification, small conventions like this affect shapes and indexing. Understanding them can prevent mistakes when arranging latent frames into a virtual grid or comparing the representation with the original clip.

## 087 · 64:50 · Guidance in a published video ablation

The requested edit turns the scene into a cyberpunk workshop with holographic documents. Compare the results before focusing on the setting labels. Which version carries out the requested transformation more completely, and what visible evidence supports your answer?

The paper presents this case as an example where classifier-free guidance improves edit completeness. Its baseline retains source latents, and its implementation includes rescaling. This does not establish one universally best guidance value. Guidance also has a computation cost when it requires another model pass. Relate the example back to our equation: changing a prediction combination affects how strongly the result follows the condition.

## 088 · 65:35 · An ablation supports a bounded conclusion

An ablation changes a component or setting so that we can examine its contribution. Here, the published guidance comparison supports a conclusion about the selected example: the requested edit appears more complete with the reported guided configuration.

A broader claim would need broader evidence. We would want other clips, difficult failures, and a comparison of the quality benefit with computation cost. Keep the conclusion at the scope of the evidence shown. This is valuable both for reading research and for your own studio experiments. You can report a useful result without turning one example into a universal recommendation.

## 089 · 66:18 · Local editing across frames

This is a local edit: the sheep's face changes and receives a white star-shaped patch. Look at the patch across poses. Does it remain attached to the same facial region, with a plausible change in apparent shape as the head turns?

The most attractive frame is not enough. An identity marker can slide, disappear, or change shape at another moment. Selected frames let us ask the right questions, but the full clip is needed to check continuity between them. For your own project, identify a small recognizable feature that will make identity drift easier to notice.

## 090 · 67:00 · An identity marker is a useful stress test

Choose a small identity marker that is easy to recognize, such as the star-shaped patch or the pear's blue stem. Track it through a pose change and partial visibility. Does it remain attached to the appropriate surface? Does its apparent shape change plausibly?

The reappearance is especially informative because a hidden feature cannot simply be copied from the immediately visible region. That does not mean every reappearance failure has the same technical cause. It means the event is a useful stress test. Designing a revealing test clip can teach you more about a workflow than generating another easy front-facing example.

## 091 · 67:44 · Global stylization across frames

Here the instruction changes the whole sequence into a minimal monochrome sketch. Local object replacement and global stylization allow different degrees of visual freedom. Even with a large style change, motion and scene structure should remain readable.

Look for rules across frames: line density, silhouette treatment, and the handling of depth. Do they feel like one visual language? This connects directly to our collage discussion. A style is more useful to an art director when described through operations that can persist through time. If every frame reinvents those operations, the result may feel unstable even when each still is appealing.

## 092 · 68:28 · A style can flicker while motion stays correct

A video can preserve object motion while its style flickers. Line density may jump, a paper texture may crawl, or shading may switch between flat and volumetric treatments without a scene explanation.

Review style as a set of temporal rules, just as we reviewed it across surfaces in the collage. Some variation is appropriate when the camera or light changes. The question is whether the material language remains coherent. If your artwork depends on a particular drawing or collage treatment, this check is as important as whether the subject stays in the same place. Motion correctness alone does not establish visual consistency.

## 093 · 69:13 · Why raw frame difference is misleading

Why not measure temporal quality by subtracting adjacent frames? Because a correctly moving object naturally changes position. A raw difference can punish the motion we actually want.

One illustrative approach estimates motion, warps one frame toward the next, and compares corresponding visible content. A visibility mask can exclude areas that become hidden or newly revealed. But optical flow can be wrong, and a nearly frozen video can perform well under a naive metric. This equation is a teaching example, not the evaluation protocol of the Qwen paper. Use measurements alongside a review of the intended motion and the events most likely to break the edit.

## 094 · 69:59 · The frozen-video trap

Imagine a metric that rewards adjacent frames for looking similar. Repeating one frame could receive a low difference score while failing the entire artistic request for movement. That is the frozen-video trap.

Motion-aware alignment can improve a comparison, but evaluation still needs to account for the intended event. If the camera was supposed to reveal the pear, a static clip is not a success even if its pixels are stable. Measurements should help answer the task's question. They become misleading when a shortcut improves the score by removing the behavior we wanted. Always pair a numerical result with inspection of the actual motion.

## 095 · 70:45 · A keyframe can anchor the edit

A practical workflow is to approve the appearance on a representative frame before propagating it through a clip. Choose the frame, edit and inspect it, apply that look to the sequence, and review what happens during motion and occlusion.

Runway describes this kind of image-guided workflow in its Aleph 2.0 announcement. The interface can make the artistic decision more concrete before full video generation. It does not remove the need for verification. A good edited frame tests appearance at one moment; the clip tests persistence over time. We can discuss that distinction without assuming anything about the product's unpublished architecture.

## 096 · 71:30 · Keyframe approval answers only one question

Approving a keyframe establishes that an appearance works at one moment. It can settle useful artistic decisions before generating the whole clip: material, palette, or the local form of an edit.

Propagation asks another question. Can that approved appearance remain coherent as the subject moves, becomes hidden, and returns? The answer requires inspecting the sequence. Treat keyframe approval as one stage of a workflow, not as approval of the finished shot. This separation helps organize iteration: first resolve the look, then challenge its persistence, and revise whichever stage fails. It also prevents a compelling still from distracting us from problems in motion.

## 097 · 72:15 · A five-second video edit brief

Our five-second brief changes the pear's body to ivory ceramic while retaining the blue stem, camera movement, and position. Reflections may adapt to the new material. The pear must remain the same object after passing behind a column.

Which clause is hardest to verify? The reappearance is a strong candidate, because the system must maintain identity through a period of invisibility. This is more demanding than transferring a visible color from frame to frame. Begin with one clear transformation in a short clip. Then make the critical visibility event part of the review, rather than discovering it only after choosing a favorite result.

## 098 · 73:01 · Occlusion is the event to test

The column gives us a concrete visibility test. Before occlusion, inspect the pear's identity cues and ceramic appearance. While it is hidden, avoid interpreting invisibility itself as disappearance failure. When it reappears, compare the stem, silhouette, material, and relationship to the camera.

The geometry should change appropriately with the moving viewpoint, so do not demand identical pixels before and after. Demand a coherent object. This example makes the contract testable at a particular event. You can design equivalent tests with a hand passing in front of a face, a character turning away, or an object leaving and re-entering the frame.

## 099 · 73:45 · A small addition creates new relationships

Adding a small object creates several new relationships. In this published example, the edit adds a drone. Even if the drone looks convincing by itself, its scale, placement, and movement must fit the scene.

Imagine a camera moving forward while the added object changes size in the wrong direction. The object might be beautifully rendered, but its relationship with the camera would expose the edit. Or it might hover at an unintended location relative to other objects. When you review an addition, evaluate those relationships across time. A close-up of the inserted object cannot answer every question about whether it belongs.

## 100 · 74:30 · An addition must belong to camera motion

An added object must fit the camera as well as the scene. A convincing texture and shape in one still do not establish a coherent trajectory. If the camera approaches, the apparent size and position of the addition should evolve in a compatible way.

The exact expectation depends on whether the object is stationary or moving independently. That is why the brief should specify the intended relationship. Inspect the addition relative to nearby objects and the background, not only in a crop. A production-quality edit is a collection of relationships that survive over time, rather than a new object that looks impressive in isolation.

## 101 · 75:16 · The shot review

Review the whole shot at normal speed, then inspect moments where failure is most likely. Pay attention to identity, intended motion, occlusion, boundaries, and the ending. High-motion content is a limitation the research authors specifically identify.

If a clip fails, choose a revision based on the failure. You might reduce the transformation, shorten the segment, add a reference frame where supported, or repair part of the result through conventional compositing. Another generation is useful when it tests a reasoned hypothesis. Do not let repeated attempts distract you from whether the piece still communicates the artistic intention you began with.

## 102 · 76:00 · A failed shot suggests a different workflow

A failed shot can suggest that the task should be staged differently. If identity drifts after a long occlusion, a shorter segment or another useful reference may help. If the main problem is a boundary, a conventional compositing repair may be more direct than regenerating everything.

These are candidate next steps, not guarantees. Choose the intervention that addresses the observed failure and compare the result. Keep the work's intention in view. A technically easier version that removes the meaningful reveal may solve the wrong problem. The workflow should adapt to the artwork while remaining realistic about what the current system can reliably produce.

## 103 · 76:46 · Studio: design the transformation

Design a five-second transformation with a partner. You may sketch the shot rather than generate it. State what changes, what must persist during motion, and the particular moment where the edit is most likely to fail.

Be specific. 'Temporal consistency' names a broad issue; 'the blue stem changes when the pear reappears after the column' identifies a testable event. Ask your partner to challenge one invariant. Then describe what evidence would convince you the edit worked. Include actual playback and the critical event in that evidence, rather than relying only on a few selected still frames.

## 104 · 77:28 · A five-second test plan

Here is a compact test plan. The request is an ivory ceramic body with the blue stem retained. Camera motion and object motion should follow the source. The clip includes a column so that we can inspect a difficult reappearance.

The evidence includes normal-speed playback and a closer look before and after that event. We also inspect reflections because a material change has optical consequences. This plan does not require a long benchmark suite. It simply makes the request, the likely failure, and the acceptance evidence explicit. You can use the same structure to test a different subject or visual transformation.

## 105 · 78:13 · Exit questions

Take one minute to answer these individually. Why can a material edit require a changed reflection? How does an image reference differ from LoRA? And why might four good-looking frames belong to a poor video?

Try to connect each answer to an artistic consequence. We are checking whether the mechanisms help you make decisions, not whether you can repeat model names. After the minute, we will hear one answer for each question and refine it together.

## 106 · 78:47 · Retrieval before the answer

Before revealing a formal answer, try to connect each exit question to a concrete mechanism. The reflection question concerns how materials interact with light. The reference and LoRA question concerns where information enters the system. The video question concerns the difference between selected appearances and a continuous event.

If an answer feels abstract, return to the pear. What would be visibly wrong? What intervention might change it? What evidence would tell you? This habit turns terminology into a working explanation. The aim is not to give the longest answer; it is to make the causal relationship clear enough to guide an editing decision.

## 107 · 79:33 · Three useful answers

A material change alters how light interacts with the object, so the reflection may need to change too. Preserving an old reflection can be the error. A reference supplies information that conditions an output, while LoRA changes learned weights.

Four attractive frames may hide flicker, identity drift, or a failed reappearance between those samples. Video quality includes the actual movement and transitions. These answers connect back to our opening comparison: decide what should change, understand how the system receives that intention, and inspect evidence that the full result meets it.

## 108 · 80:13 · Three levels of checking an edit

We can check an edit at three levels. First, did the requested transformation occur? Second, did the necessary invariants survive? Third, does the result serve the artwork's intention?

A result can pass the first level and fail the second, as when the correct material appears on a different object. It can pass both technical levels and still fail the artistic one, as when the chosen effect undermines the intended mood. Keeping the levels separate makes critique more precise. It also explains why neither a generic aesthetic score nor a strict pixel comparison can answer every question we care about.

## 109 · 80:57 · The next edit

Before you leave, name one thing you will deliberately change in your next edit and one thing you will check afterwards. Make both specific enough that another person could understand your intention and review the result.

The technical ideas are useful because they help us choose inputs, understand failures, and revise a workflow. The artistic work is deciding why a transformation matters. Keep the relationship between those two parts visible. We will use the readings to extend that discussion to what we delegate to AI and what direction we want our own creative practice to take.

## 110 · 81:39 · Human direction in an AI workflow

Human direction can be concrete rather than ceremonial. We can delegate the production of candidates under a bounded contract while retaining responsibility for the intention and the decision to accept a result.

The boundary depends on the task and on the evidence available. A low-stakes visual exploration allows more variation than a production asset with fixed requirements. The reading discussion will extend this into questions about capability, values, and personal direction. For the studio, begin with a practical version: name what the system may attempt, what you will decide, and what you will inspect before allowing the result into the work.

## 111 · 82:24 · Readings for discussion

The first two discussion readings approach agency from different directions. Jakub Pachocki's An Alien Mind raises questions about alignment as AI becomes more capable. Dan Koe's essay invites reflection on goals and habitual behavior. We are using the second as a creative-direction exercise, not a guarantee that one day changes a life.

Bring one claim you agree with or challenge from each, and explain why. The next slide introduces a third piece: Runway's Aleph 2.0 announcement. Compare its documented workflow with the evidence you would need to trust an edited shot. Together, ask what you want to make, what you will delegate, and how you will judge the result.

## 112 · 83:13 · Reading 3: image-guided video editing

The third reading is Runway's announcement of Aleph 2.0 and Edit Studio. It describes an image-guided workflow: establish an appearance in an edited frame, then carry the change into video. That makes it a direct companion to our keyframe discussion.

Read the page as a vendor's account of a workflow and its capabilities. Ask which claims its examples demonstrate and which would need your own test. A product announcement can teach us a useful interaction pattern without settling questions of reliability across all inputs. For AFTER RAIN, propose a short occlusion test that would challenge the preservation claim in a way relevant to your artwork.

## 113 · 84:00 · Optional technical reading

These technical papers are optional companions to the discussion readings. Choose according to the question you want to investigate. InstructPix2Pix helps explain edit supervision; Flow Matching develops the generative training framework. Qwen-Image-2.0 and Qwen-Video-Edit provide recent architecture examples.

You do not need to read all of them before trying the studio exercise. Start with a question, locate the part of the paper that addresses it, and distinguish the proposed method from the authors' evidence. The instructor guide retains the other references on multi-image inputs, rewards, composition, and practical video editing.

## 114 · 84:40 · Three source types, three kinds of evidence

The three readings provide different kinds of material. A research leader's perspective develops an argument about alignment and future development. A reflective essay offers a way to examine personal direction. A vendor announcement presents a workflow and promotes its capabilities.

Read each according to what it can support. Identify forecasts, personal claims, and demonstrations rather than treating every sentence as the same kind of evidence. You may disagree with an author and still find a useful question. Our synthesis is practical: what do you want to make, what will you delegate, and what evidence will you use to decide whether the collaboration served that intention?

## 115 · 85:26 · Appendix: separate image and text guidance

This optional equation separates image guidance and text guidance in InstructPix2Pix. Begin with the prediction using neither condition. Add a scaled difference for including the image, then another scaled difference for adding the text alongside that image.

Set both scales to one and follow the cancellation: the intermediate terms disappear, leaving the fully conditioned noise prediction. This is a useful check that you understand the expression. Epsilon here denotes a noise prediction, unlike the velocity in our flow-matching slides. These controls belong to this formulation and should not be assumed to map directly onto every current editor's interface.

## 116 · 86:09 · Separate guidance: check the cancellation

Return to the separate image and text guidance expression and set both scales to one. The negative no-condition term cancels the starting no-condition term. The positive image-only term then cancels the negative image-only term. What remains is the prediction conditioned on both image and text.

This cancellation is a simple consistency check. It helps you understand the roles of the differences before exploring other settings. Remember that the expression predicts noise in this formulation, while our earlier flow example predicted velocity. Similar-looking guidance ideas can appear in different model parameterizations, so keep the symbols and baseline definitions explicit when comparing them.

## 117 · 86:54 · Appendix: a minimal training loop

Read the pseudocode in two groups. First we prepare an example: source, instruction, target, conditions, and target latent. Then we sample noise and time, construct the intermediate latent, predict velocity, and compare that prediction with the known training target.

The final update changes trainable weights based on the loss. At inference, there is no known edited target to supply in this way. We instead follow the learned generative predictions from a starting state. This pseudocode explains the conceptual loop; it omits practical engineering such as batches, precision, and scheduling. Its most important distinction is what information is available during learning versus use.

## 118 · 87:39 · Inference follows the learned field

Now contrast the inference loop with the training loop. We receive the source and instruction, encode the conditions, and initialize a noisy latent. At each sampling step, the model predicts a velocity from the current state and conditions. We update the state and eventually decode it.

There is no supplied edited target and no training-loss update in this simplified inference loop. The learned weights are being used rather than fitted. Practical systems can use different samplers and schedules, but the distinction remains useful. It explains why a reference at inference is not automatically a training example and why changing a generation setting is not the same as adapting the model.

## 119 · 88:28 · Appendix: selecting an editing approach

Choose an editing approach by the requirement you need to satisfy. Exact untouched pixels may call for masks and compositing. A new visual language may benefit from references. A reusable learned concept may motivate adaptation. A transformation through motion needs a video workflow and temporal review.

These approaches can be combined. For each candidate, ask what failure would rule it out for your brief and what you would test first. A longer prompt is not the only possible response to repeated failure. Sometimes the better decision is to change the representation, split the task into stages, or keep part of the work under direct manual control.

## 120 · 89:15 · The next deliberate edit

For your next edit, begin with a transformation worth making. Write down what should survive and what may need to adapt. Choose inputs and controls that communicate those requirements, then inspect the whole result with enough care to decide whether it serves your intention.

If the attempt fails, keep the observation. It may suggest a better prompt, a stronger reference, a different workflow, or a more interesting artistic direction. The most useful outcome of this lecture is a repeatable way to connect technical understanding with deliberate visual choices. That connection will remain valuable as the particular models and interfaces continue to change.