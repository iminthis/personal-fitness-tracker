import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meals · Daily Template",
};

type Item = { food: string; sub?: string; macros: string };
type Meal = { name: string; tag?: string; macros: string; items: Item[] };

const BREAKFAST: Meal = {
  name: "Breakfast",
  tag: "anchor meal",
  macros: "810 · 55g",
  items: [
    { food: "4 jumbo eggs", sub: "in 1 tbsp butter", macros: "460 · 32g" },
    { food: "2× chicken sausage", macros: "220 · 20g" },
    { food: "1 sweet potato", macros: "130 · 3g" },
  ],
};

const LUNCH: Meal = {
  name: "Lunch",
  tag: "made fresh",
  macros: "760 · 68g",
  items: [
    { food: "8 oz raw chicken breast", macros: "280 · 56g" },
    { food: "1.5 cups cooked rice", macros: "300 · 6g" },
    { food: "veggie roasted in 1 tbsp oil", macros: "180 · 6g" },
  ],
};

const SNACK: Meal = {
  name: "Snack",
  tag: "+ yogurt if hungry",
  macros: "190 · 42g",
  items: [
    { food: "protein shake", macros: "190 · 42g" },
    { food: "Greek yogurt cup (optional)", macros: "+130 · 12g" },
  ],
};

type DinnerOption = { name: string; color: "warm" | "accent" | "salmon"; macros: string; items: Item[] };

const DINNER: DinnerOption[] = [
  {
    name: "Turkey",
    color: "warm",
    macros: "550 · 43g",
    items: [
      { food: "8 oz raw ground turkey 93/7", macros: "300 · 38g" },
      { food: "½ avocado", macros: "120 · 2g" },
      { food: "sweet potato or veggie", macros: "130 · 3g" },
    ],
  },
  {
    name: "Chicken",
    color: "accent",
    macros: "530 · 61g",
    items: [
      { food: "8 oz raw chicken breast", macros: "280 · 56g" },
      { food: "½ avocado", macros: "120 · 2g" },
      { food: "1 sweet potato", macros: "130 · 3g" },
    ],
  },
  {
    name: "Salmon",
    color: "salmon",
    macros: "610 · 41g",
    items: [
      { food: "6 oz raw salmon", macros: "360 · 36g" },
      { food: "1 sweet potato", macros: "130 · 3g" },
      { food: "squash/Brussels in 1 tbsp oil", macros: "120 · 2g" },
    ],
  },
];

const VEGGIES = [
  { food: "Broccoli", note: "(120g)", macros: "~160 · 4g" },
  { food: "Brussels sprouts", note: "(170g)", macros: "~200 · 6g" },
  { food: "Cremini, sliced", note: "(150g · soaks up the most fat)", macros: "~150 · 4g" },
  { food: "Squash", note: "(150g · roasts well)", macros: "~160 · 3g" },
];

function MealCard({ meal }: { meal: Meal }) {
  return (
    <div className="panel p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{meal.name}</h2>
          {meal.tag && <span className="text-[11px] text-muted">{meal.tag}</span>}
        </div>
        <div className="text-xs text-accent font-semibold whitespace-nowrap">{meal.macros}</div>
      </div>
      <ul className="divide-y divide-border">
        {meal.items.map((it, i) => (
          <li key={i} className={`flex justify-between gap-3 py-2 text-sm ${it.food.includes("optional") ? "text-muted" : ""}`}>
            <span>
              <span className="font-medium">{it.food}</span>
              {it.sub && <span className="text-muted"> {it.sub}</span>}
            </span>
            <span className="text-xs text-muted whitespace-nowrap tabular-nums">{it.macros}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DinnerOption({ option }: { option: DinnerOption }) {
  const barColor = { warm: "bg-warm", accent: "bg-accent", salmon: "bg-salmon" }[option.color];
  const txtColor = { warm: "text-warm", accent: "text-accent", salmon: "text-salmon" }[option.color];
  return (
    <div className="panel p-4 pl-5 relative overflow-hidden">
      <div className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-r-sm ${barColor}`} />
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-sm font-bold">{option.name}</h3>
        <div className={`text-xs font-semibold ${txtColor}`}>{option.macros}</div>
      </div>
      <ul className="divide-y divide-border">
        {option.items.map((it, i) => (
          <li key={i} className="flex justify-between gap-3 py-1.5 text-sm">
            <span className="font-medium">{it.food}</span>
            <span className="text-xs text-muted whitespace-nowrap tabular-nums">{it.macros}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-[0.14em] text-muted font-semibold mt-6 mb-2 px-1">{children}</div>
  );
}

export default function MealsPage() {
  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      <header>
        <div className="text-xs uppercase tracking-[0.16em] text-accent font-semibold">Daily Template</div>
        <h1 className="text-3xl font-extrabold tracking-tight mt-1">Hit 2,300 &amp; 200g</h1>
        <div className="flex gap-2.5 mt-3.5">
          <div className="flex-1 panel p-3">
            <div className="text-2xl font-extrabold tracking-tight text-accent">2,290–2,370</div>
            <div className="text-[11px] text-muted uppercase tracking-wider">kcal</div>
          </div>
          <div className="flex-1 panel p-3">
            <div className="text-2xl font-extrabold tracking-tight">206–226g</div>
            <div className="text-[11px] text-muted uppercase tracking-wider">protein</div>
          </div>
        </div>
      </header>

      <MealCard meal={BREAKFAST} />
      <MealCard meal={LUNCH} />

      <SectionLabel>Dinner — rotate one per night</SectionLabel>
      <div className="space-y-2.5">
        {DINNER.map((d) => <DinnerOption key={d.name} option={d} />)}
      </div>

      <div className="panel p-4 text-sm border-l-[3px] border-l-salmon">
        <span className="font-semibold">Salmon nights:</span> it already brings fat + protein together, so <span className="font-semibold">skip the avocado</span> and you stay on target. It's your best variety swap from the chicken/turkey repetition.
      </div>

      <MealCard meal={SNACK} />

      <SectionLabel>Veggie rotation — pick one per meal, cook in 1 tbsp oil or butter</SectionLabel>
      <div className="panel p-1 px-4">
        <ul className="divide-y divide-border">
          {VEGGIES.map((v, i) => (
            <li key={i} className="flex justify-between gap-3 py-2 text-sm">
              <span>{v.food} <span className="text-muted">{v.note}</span></span>
              <span className="text-xs text-muted whitespace-nowrap tabular-nums">{v.macros} <span className="text-muted">w/ oil</span></span>
            </li>
          ))}
        </ul>
      </div>

      <SectionLabel>The rule that makes it work</SectionLabel>
      <div className="panel p-4 text-sm border-l-[3px] border-l-accent">
        Every meal = <span className="font-semibold">protein + starch + fat + veggie</span>. You were doing protein + veggie and skipping the two dense slots. The calories live in the <span className="font-semibold">oil/butter</span> (~240/day), <span className="font-semibold">rice</span> (300), and <span className="font-semibold">sweet potatoes</span> (260) — not the meat.
      </div>

      <SectionLabel>If you're off target</SectionLabel>
      <div className="panel p-1 px-4">
        <ul className="divide-y divide-border">
          <li className="flex justify-between gap-3 py-2 text-sm"><span>Short on calories</span><span className="text-accent font-semibold text-xs">+ ½ avocado (120)</span></li>
          <li className="flex justify-between gap-3 py-2 text-sm"><span>Still short</span><span className="text-accent font-semibold text-xs">+ 1 cup rice (200)</span></li>
          <li className="flex justify-between gap-3 py-2 text-sm"><span>Easy bump</span><span className="text-accent font-semibold text-xs">add yogurt cup (130) or whole-milk shake (+100)</span></li>
          <li className="flex justify-between gap-3 py-2 text-sm"><span>Over on protein</span><span className="text-accent font-semibold text-xs">drop the snack</span></li>
        </ul>
      </div>

      <SectionLabel>Sunday prep — 3 things</SectionLabel>
      <div className="panel p-4">
        <ol className="space-y-0">
          {[
            <><span className="font-semibold">Batch protein</span> like you already do — ~2 lbs chicken, turkey portions, portion the salmon.</>,
            <><span className="font-semibold">Batch a starch</span> — rice cooker of rice <span className="text-muted">and</span> a tray of sweet potatoes in oil. <span className="text-accent">This is the new habit that fixes the gap.</span></>,
            <><span className="font-semibold">Pre-portion oil</span> into the pan when cooking — don't eyeball it.</>,
          ].map((content, i) => (
            <li key={i} className="relative pl-10 py-2.5 text-sm border-t border-border first:border-t-0">
              <span className="absolute left-0 top-2 w-6 h-6 bg-accent text-black font-extrabold text-xs rounded-md flex items-center justify-center">{i + 1}</span>
              {content}
            </li>
          ))}
        </ol>
      </div>

      <div className="panel p-4 text-sm border-l-[3px] border-l-accent">
        <span className="font-semibold">Logging:</span> weigh meat <span className="font-semibold">raw</span>, log the label numbers for that weight — exactly what you've been doing. Rice is the only thing logged <span className="font-semibold">cooked</span> (1.5 cups = 300). Jumbo eggs = 90 · 8g each.
      </div>

      <footer className="text-center text-muted text-xs pt-6">
        protein was never the problem · fill all four slots
      </footer>
    </div>
  );
}
