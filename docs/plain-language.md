# Plain language in ULTRON

Every word a person reads in ULTRON must make sense to someone who has never
seen this screen, does not know what ULTRON is, and does not know the machine.
Engineering detail is still available, but behind a "Details" / "Method"
disclosure, never as the first thing a person reads.

## The test

Read the text on its own, out of context. Can a new visitor answer:

1. **Where?** Which machine, and which part of it.
2. **What is happening?** In everyday words, as a full sentence.
3. **Why does it matter?** What happens if nobody acts.
4. **What should I do?** One concrete next step.

If any answer needs knowledge of the screen, a code, or an abbreviation, rewrite it.

## Rules

- Write full sentences. No slashes between alternatives ("choke / slip / chain
  break" → "may be blocked, slipping, or broken").
- No codes in the text a person reads first: no rule ids (R-KFS-02), tag
  numbers (TMP-KLN-14), document refs (D5 FP-38, MOM 1.7.1), HOLD, SW-ALL.
  They may appear in a Details disclosure.
- No unexplained abbreviations. Spell out or replace: ID fan → exhaust fan,
  HPU → hydraulic pump unit, SFM → feed flow meter, DE / NDE → drive end /
  far end, PA fan → primary air fan, TA → tertiary air (hot air duct),
  CO / O₂ / NOₓ → carbon monoxide / oxygen / nitrogen oxides (formula after
  the word is fine), RMS → vibration level, MCC → motor control panel,
  ΔP → pressure difference, VFD → speed drive.
- Name the part by what it does, the first time: "the bucket elevator (lifts
  raw material up to the preheater)".
- Prefer "may", "looks like", "is likely" for anything a rule suspects but has
  not proven. Never present a guess as a fact.
- Numbers come with their meaning: "3.8 mm/s, normally below 2.3 mm/s", not
  "3.81 mm/s · 1.66 × baseline".
- Say what to do as an instruction to a person: "Send someone to check the
  elevator chain", not "Inspect drive train".
- Status words are only **Normal**, **Alert**, **Critical**
  (`src/components/ui/status.ts`). Alert = something is wrong and needs a look
  soon. Critical = act now.
- Counts read as sentences: "3 problems on this part", not "+3 more alerts here".
- Buttons say what happens: "Open the rotary kiln", "See all 18 problems".
- Keep it short: a headline up to ~60 characters, a "what is happening"
  sentence up to ~160, a "what to do" sentence up to ~120.

## Rule texts

Each rule definition (`src/lib/*-sim/rules*`, mirrored in the `rules` table)
carries three plain fields next to the engineering ones:

| field | DB column | what it is |
|---|---|---|
| `plainTitle` | `plain_title` | Headline: what is wrong, in everyday words |
| `plainWhat` | `plain_what` | What is happening and why it matters (1–2 sentences) |
| `plainTodo` | `plain_todo` | What to do next (1 sentence) |

The engineering `name`, `logic`, `cause`, `consequence`, `action`, `unproven`,
`hold` stay as they are and show under Details.

### Example

Engineering: *Bucket elevator choke / slip / chain break* — "Chain / belt break:
speed at zero with the drive on"

Plain:
- **Title:** Feed elevator has stopped moving material
- **What:** The bucket elevator that lifts raw material up to the preheater is
  turning slowly or not at all while its motor is on. Its chain or belt may be
  broken, slipping, or jammed. If it stays stopped, the kiln runs out of
  material and the fuel must be cut.
- **To do:** Stop feeding material into the elevator and send someone to check
  its chain, belt, and the bottom of the elevator for a blockage.

## The plant in one paragraph (for writers)

The pyro line makes cement clinker. Raw material ("raw meal", a fine rock
powder) is stored in the **feed silo**, weighed and lifted by a **bucket
elevator** into the **preheater** — a tower of cyclones (C1–C6) where hot kiln
gas heats it, with a **calciner** that burns extra fuel. It then enters the
**rotary kiln**, a long, slowly turning steel tube heated by the **burner**
(coal flame at the far end) to about 1450 °C, where it becomes clinker (hot
pebbles). The **grate cooler** blows air through the clinker to cool it, and the
**clinker crusher** breaks it up before a **conveyor** carries it to the
**clinker silo**. An **exhaust fan** (ID fan) pulls the gas through the line and
a **baghouse** filters the dust.
