# Mascotte Flux 3D

La mascotte est un Client Component chargé à la demande. Le moteur 3D n'entre
donc dans le bundle d'une page que si cette page rend `FluxMascot`.

```tsx
import { FluxMascot } from "@/components/mascot/flux-mascot";

<FluxMascot behavior="idle" interaction="rotate" />
```

En assistant flottant et déplaçable :

```tsx
<FluxMascot
  id="assistant"
  placement="bottom-right"
  interaction="move"
  behavior="follow-pointer"
  width="min(42vw, 320px)"
  height="min(56vh, 420px)"
/>
```

Depuis un autre Client Component :

```tsx
import { commandFluxMascot } from "@/components/mascot/flux-mascot";

commandFluxMascot({ target: "assistant", behavior: "spin" });
```

Comportements disponibles avec le modèle statique actuel : `still`, `idle`,
`spin` et `follow-pointer`. Les animations de squelette seront ajoutées à cette
API lorsqu'un GLB riggé sera disponible.
