# Voice-over script — EcoSort video (3:18)

Read calmly. What appears on screen is in brackets, to help you follow along.
Each time mark shows when that part starts. The music already comes with the video.

---

## 0:00 — Scene 1: The problem
[Dark green background. "So… where does this go?" A battery hesitates between the three bins.]

You're holding something. A battery, a face mask, a paper cup…
And there's the everyday question: so… where does this go?

## 0:14 — Scene 2: A huge problem
[Counter up to 2.01 billion tonnes. Then Colombia's three bins.]

It's not a small question. Every year, the world generates more than two billion tonnes of waste,
and one in three tonnes is not managed safely.
That's why, since 2021, Colombia sorts waste into three bins:
green for organic waste, white for recyclables, and black for everything that can't be recovered.

## 0:38 — Scene 3: The confusion
[Several items float with question marks. A battery falls into the white bin, which turns red.]

The problem is that we don't always know where each thing goes.
And one mistake is enough: a single battery in the white bin can contaminate all the recyclable material.
This happens every day, in millions of homes.

## 0:58 — Scene 4: Here comes EcoSort
[Green burst. The logo and the word ECOSORT appear. The music picks up.]

Until now. Meet EcoSort.
An app powered by artificial intelligence that, with just one photo,
tells you exactly where your waste goes.

## 1:12 — Scene 5: It's that easy
[Phone: a photo of a battery is taken, the AI analyzes it and the result "Non-recyclable" appears.]

Using it is really easy.
First, you take a photo of the item.
Then, our neural network analyzes the image in less than a second.
And finally, it tells you the right bin.
In this case: non-recyclable, with a confidence of ninety-nine point nine percent.
And since it's a battery, EcoSort recommends taking it to a take-back point.

## 1:42 — Scene 6: Examples
[A banana peel falls into the green bin, a bottle into the white bin and an old phone into the black bin.]

It works with what you throw away every day.
A banana peel: organic, green bin.
A plastic bottle: recyclable, white bin.
And an old phone: non-recyclable… or even better, a take-back point.

## 2:06 — Scene 7: How does it work?
[Diagram: photo → 224 × 224 pixels → neural network → probabilities → bin. Counters.]

How does it work?
The photo is resized to 224 by 224 pixels
and goes through a convolutional neural network trained with transfer learning.
The network computes the probability of each category and picks the bin.
We trained it with almost forty thousand images from five public datasets,
in just twenty minutes on a graphics card.

## 2:30 — Scene 8: Results
[94.5% accuracy. Bars comparing four models; ResNet-50 highlighted.]

And the results speak for themselves.
We tested the model on almost six thousand images it had never seen:
it was right ninety-four point five percent of the time, it recognized every phone and ninety-four percent of the batteries.
We also compared four models, and ResNet-50 was the best, with ninety-five point four percent.

## 2:50 — Scene 9: Also in your AI assistant
[Chat: "Where do I throw this? battery.jpg" → MCP tool → assistant's answer.]

And it doesn't only work on the web.
Thanks to our MCP server, an AI assistant running on Ollama
can use EcoSort directly from a chat: you send the photo, and it tells you where to throw it.

## 3:06 — Scene 10: Closing
["Sorting right is easy." EcoSort logo and the team's names.]

Sorting right is easy.
EcoSort. Made by Intelligent Systems students at Universidad de Ibagué.

---

**Tips for recording** (en español)
- Graben la voz escena por escena: si se equivocan, solo repiten esa parte.
- Si una parte queda corta o larga, ajusten las pausas; lo importante son los tiempos de inicio.
- Para juntar la voz con el video sirve cualquier editor (Clipchamp, que viene con Windows, CapCut o DaVinci Resolve).
  El video ya trae la música a un volumen de fondo, así que la voz se puede poner encima sin bajarla.
- Si prefieren otro volumen de música, en `video/src/index.jsx` cambien `VOLUMEN_MUSICA` (0.45) y vuelvan a renderizar.
