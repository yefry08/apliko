"use client";

import { Check, ChevronDown, Copy, Download, FileUp, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  ANSWER_TAG_LABEL,
  completeness,
  EMPTY_EXPEDIENTE,
  EXPERIENCE_KIND_LABEL,
  LANGUAGE_LEVELS,
  newId,
  parseExpediente,
  PERSONAL_FIELDS,
  wordCount,
  type Answer,
  type AnswerTag,
  type Education,
  type Expediente,
  type Experience,
  type Language,
} from "@/lib/expediente";
import { LEVEL_LABEL } from "@/lib/logic";
import { mergeCv, parseCv, pdfToLines } from "@/lib/cv";
import { getAplikoState, useApliko } from "@/lib/store";
import { cn } from "@/lib/utils";

const FIELD =
  "h-10 w-full min-w-0 rounded-lg border bg-card px-3 text-sm outline-none focus-visible:border-larimar focus-visible:ring-2 focus-visible:ring-larimar/30";
const AREA = "min-h-28 w-full rounded-lg border bg-card px-3 py-2 text-sm leading-relaxed outline-none focus-visible:border-larimar focus-visible:ring-2 focus-visible:ring-larimar/30";

const useHydrated = () => useSyncExternalStore(() => () => {}, () => true, () => false);

type Opts = [string, string][];

/** One field of a repeatable entry. `wide` spans both columns. */
interface FieldSpec<T> {
  key: keyof T & string;
  label: string;
  type?: "text" | "month" | "url" | "textarea" | "select";
  options?: Opts;
  wide?: boolean;
  placeholder?: string;
}

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-2xl border bg-card/50 p-5 sm:p-6">
      <header className="flex flex-col gap-1">
        <h2 id={id} className="font-display text-3xl tracking-tight">
          {title}
        </h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", wide && "sm:col-span-2")}>
      <span className="eyebrow">{label}</span>
      {children}
    </label>
  );
}

function Control<T>({ spec, value, onChange }: { spec: FieldSpec<T>; value: string; onChange: (v: string) => void }) {
  if (spec.type === "textarea") return <textarea className={AREA} value={value} placeholder={spec.placeholder} onChange={(e) => onChange(e.target.value)} />;
  if (spec.type === "select") {
    return (
      <select className={FIELD} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Elegir</option>
        {spec.options?.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    );
  }
  return <input className={FIELD} type={spec.type ?? "text"} value={value} placeholder={spec.placeholder} onChange={(e) => onChange(e.target.value)} />;
}

/** A list of entries (studies, languages…) that all share the same fields. */
function ListEditor<T extends { id: string }>({
  items,
  fields,
  blank,
  addLabel,
  name,
  onChange,
}: {
  items: T[];
  fields: FieldSpec<T>[];
  blank: () => T;
  addLabel: string;
  name: (item: T) => string;
  onChange: (items: T[]) => void;
}) {
  const patch = (id: string, key: keyof T, v: string) => onChange(items.map((i) => (i.id === id ? { ...i, [key]: v } : i)));
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <Field key={f.key} label={f.label} wide={f.wide}>
                <Control spec={f} value={String(item[f.key] ?? "")} onChange={(v) => patch(item.id, f.key, v)} />
              </Field>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChange(items.filter((i) => i.id !== item.id))}
            className="inline-flex items-center gap-1.5 self-end text-xs text-muted-foreground hover:text-coral"
            aria-label={`Quitar ${name(item) || "esta entrada"}`}
          >
            <Trash2 className="size-3.5" aria-hidden="true" /> Quitar
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, blank()])}
        className="inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm hover:border-larimar hover:text-larimar"
      >
        <Plus className="size-4" aria-hidden="true" /> {addLabel}
      </button>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      disabled={!text}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-larimar disabled:opacity-40"
    >
      {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

function AnswersEditor({ answers, onChange }: { answers: Answer[]; onChange: (a: Answer[]) => void }) {
  const patch = (id: string, p: Partial<Answer>) => onChange(answers.map((a) => (a.id === id ? { ...a, ...p } : a)));
  const toggleTag = (a: Answer, tag: AnswerTag) => patch(a.id, { tags: a.tags.includes(tag) ? a.tags.filter((t) => t !== tag) : [...a.tags, tag] });

  return (
    <div className="flex flex-col gap-3">
      {answers.map((a) => (
        <div key={a.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <Field label="Pregunta o tema">
              <input
                className={FIELD}
                value={a.title}
                placeholder="Ej.: Describe un reto que superaste"
                onChange={(e) => patch(a.id, { title: e.target.value })}
              />
            </Field>
            <Field label="Idioma">
              <select className={FIELD} value={a.language} onChange={(e) => patch(a.id, { language: e.target.value === "en" ? "en" : "es" })}>
                <option value="es">Español</option>
                <option value="en">Inglés</option>
              </select>
            </Field>
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="eyebrow mb-1.5">Sirve para</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ANSWER_TAG_LABEL) as AnswerTag[]).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={a.tags.includes(tag)}
                  onClick={() => toggleTag(a, tag)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    a.tags.includes(tag) ? "border-larimar bg-larimar text-primary-foreground" : "hover:border-foreground/40",
                  )}
                >
                  {ANSWER_TAG_LABEL[tag]}
                </button>
              ))}
            </div>
          </fieldset>
          <Field label="Respuesta">
            <textarea className={cn(AREA, "min-h-44")} value={a.text} onChange={(e) => patch(a.id, { text: e.target.value })} />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs tabular-nums text-muted-foreground">
              {wordCount(a.text)} palabras · {a.text.length} caracteres
            </span>
            <div className="flex items-center gap-4">
              <CopyButton text={a.text} />
              <button
                type="button"
                onClick={() => onChange(answers.filter((x) => x.id !== a.id))}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-coral"
              >
                <Trash2 className="size-3.5" aria-hidden="true" /> Quitar
              </button>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...answers, { id: newId(), title: "", tags: [], language: "es", text: "" }])}
        className="inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm hover:border-larimar hover:text-larimar"
      >
        <Plus className="size-4" aria-hidden="true" /> Añadir respuesta
      </button>
    </div>
  );
}

function Step({ n, title, optional, children }: { n: number; title: string; optional?: boolean; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg text-primary-foreground" aria-hidden="true">
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="font-display text-2xl">
          {title} {optional && <span className="font-sans text-sm text-muted-foreground">(opcional)</span>}
        </h2>
        {children}
      </div>
    </li>
  );
}

/** The whole setup in three steps: the CV fills everything it can, the rest is optional. */
function QuickStart({ e, onChange }: { e: Expediente; onChange: (next: Expediente) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "reading" | "done" | "error"; text: string }>({ kind: "idle", text: "" });

  async function readCv(file: File) {
    setStatus({ kind: "reading", text: `Leyendo ${file.name}…` });
    try {
      const lines = await pdfToLines(await file.arrayBuffer());
      if (lines.length < 3) throw new Error("sin texto");
      // Merge into the latest saved profile, in case something changed while the PDF was read.
      const { expediente, added } = mergeCv(getAplikoState().expediente ?? EMPTY_EXPEDIENTE, parseCv(lines), file.name, lines);
      onChange(expediente);
      setStatus({
        kind: "done",
        text: added
          ? `Listo: leímos ${file.name} y completamos ${added} datos. Revísalos abajo.`
          : `Leímos ${file.name}. Tu perfil ya tenía todo lo que trae.`,
      });
    } catch {
      setStatus({
        kind: "error",
        text: "No pudimos leer ese PDF. Si es una foto o un escaneo, expórtalo de nuevo desde Word o Google Docs.",
      });
    }
  }

  return (
    <ol className="flex flex-col gap-8 rounded-2xl border bg-card p-5 sm:p-8">
      <Step n={1} title="Sube tu CV">
        <p className="text-sm text-muted-foreground">
          En PDF. Lo leemos aquí mismo, en tu navegador, y llenamos tu perfil con tus datos, estudios, experiencia, idiomas y
          premios. No se sube a ningún servidor.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={status.kind === "reading"}
            onClick={() => input.current?.click()}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <FileUp className="size-4" aria-hidden="true" /> {e.cv ? "Subir otra versión" : "Elegir mi CV"}
          </button>
          {e.cv && status.kind === "idle" && (
            <span className="text-sm text-muted-foreground">
              Ya leímos {e.cv.fileName}
              {e.cv.importedAt ? ` el ${e.cv.importedAt}` : ""}.
            </span>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(ev) => {
            const file = ev.target.files?.[0];
            ev.target.value = "";
            if (file) void readCv(file);
          }}
        />
        {status.text && (
          <p role="status" className={cn("text-sm", status.kind === "error" ? "text-coral" : "text-foreground")}>
            {status.text}
          </p>
        )}
      </Step>

      <Step n={2} title="Pega tu LinkedIn">
        <input
          className={FIELD}
          type="url"
          autoComplete="url"
          placeholder="https://www.linkedin.com/in/tu-perfil"
          value={e.personal.linkedin}
          onChange={(ev) => onChange({ ...e, personal: { ...e.personal, linkedin: ev.target.value } })}
        />
        <p className="text-xs text-muted-foreground">Guardamos el enlace para ponerlo en los formularios que lo piden.</p>
      </Step>

      <Step n={3} title="Lo que tu IA sabe de ti" optional>
        <p className="text-sm text-muted-foreground">
          Si usas ChatGPT, Claude o Gemini, pídele: «Escribe todo lo que sabes de mí: estudios, trabajo, proyectos, logros,
          metas e intereses». Pega aquí la respuesta: servirá de contexto para tus ensayos.
        </p>
        <textarea
          className={cn(AREA, "min-h-32")}
          value={e.aiMemory}
          placeholder="Pega aquí la respuesta de tu asistente"
          onChange={(ev) => onChange({ ...e, aiMemory: ev.target.value })}
        />
      </Step>
    </ol>
  );
}

function download(e: Expediente) {
  const blob = new Blob([JSON.stringify(e, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "apliko-mi-perfil.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function Editor() {
  const hydrated = useHydrated();
  const { state, setExpediente } = useApliko();
  const fileInput = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");

  if (!hydrated) return <div className="h-96 animate-pulse rounded-2xl border bg-card/40" aria-hidden="true" />;

  const e = state.expediente ?? EMPTY_EXPEDIENTE;
  const set = <K extends keyof Expediente>(key: K, value: Expediente[K]) => setExpediente({ ...e, [key]: value });
  const score = completeness(e);
  const levelOptions = Object.entries(LEVEL_LABEL) as Opts;

  return (
    <div className="flex flex-col gap-6">
      <QuickStart e={e} onChange={setExpediente} />

      {/* Progress and file actions */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-display text-3xl tabular-nums">{score.percent}% listo</p>
          <p className="text-sm text-muted-foreground">
            {score.done} de {score.total} cosas que piden casi todas las postulaciones
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={score.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Perfil completo">
          <div className="h-full rounded-full bg-larimar transition-[width]" style={{ width: `${score.percent}%` }} />
        </div>
        {score.missing.length > 0 && <p className="text-sm text-muted-foreground">Te falta: {score.missing.join(", ")}.</p>}
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => download(e)} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:border-larimar hover:text-larimar">
            <Download className="size-4" aria-hidden="true" /> Descargar mi perfil
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:border-larimar hover:text-larimar"
          >
            <Upload className="size-4" aria-hidden="true" /> Cargar desde archivo
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (ev) => {
              const file = ev.target.files?.[0];
              ev.target.value = "";
              if (!file) return;
              try {
                setExpediente(parseExpediente(JSON.parse(await file.text())));
                setImportError("");
              } catch {
                setImportError("Ese archivo no es un perfil de ApliKo.");
              }
            }}
          />
          <button
            type="button"
            onClick={() => window.confirm("¿Borrar todo tu perfil? No se puede deshacer.") && setExpediente(EMPTY_EXPEDIENTE)}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm text-muted-foreground hover:border-coral hover:text-coral"
          >
            <Trash2 className="size-4" aria-hidden="true" /> Borrar todo
          </button>
        </div>
        {importError && <p className="text-sm text-coral">{importError}</p>}
      </div>

      <details className="group flex flex-col gap-6">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border bg-card px-5 py-4 hover:border-larimar [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col">
            <span className="font-display text-2xl">Revisa y corrige tu perfil</span>
            <span className="text-sm text-muted-foreground">Datos, estudios, idiomas, experiencia, premios, documentos y respuestas.</span>
          </span>
          <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="mt-6 flex flex-col gap-6">
          <Section id="datos" title="Datos personales" hint="Tal como aparecen en tus documentos oficiales.">
            <div className="grid gap-3 sm:grid-cols-2">
              {PERSONAL_FIELDS.map((f) => (
                <Field key={f.key} label={f.label} wide={f.key === "address"}>
                  <input
                    className={FIELD}
                    type={f.type ?? "text"}
                    autoComplete={f.autoComplete}
                    value={e.personal[f.key]}
                    onChange={(ev) => set("personal", { ...e.personal, [f.key]: ev.target.value })}
                  />
                </Field>
              ))}
            </div>
          </Section>

          <Section id="estudios" title="Estudios" hint="Del más reciente al más antiguo. Incluye el que estás cursando.">
            <ListEditor
              items={e.education}
              onChange={(v) => set("education", v)}
              addLabel="Añadir estudio"
              name={(i) => i.institution}
              blank={(): Education => ({ id: newId(), institution: "", country: "", degree: "", field: "", level: "", start: "", end: "", gpa: "", gpaScale: "" })}
              fields={[
                { key: "institution", label: "Institución", wide: true },
                { key: "degree", label: "Título o programa", placeholder: "Ej.: Licenciatura en Economía" },
                { key: "field", label: "Área de estudio" },
                { key: "level", label: "Nivel", type: "select", options: levelOptions },
                { key: "country", label: "País" },
                { key: "start", label: "Inicio", placeholder: "AAAA-MM" },
                { key: "end", label: "Fin (o fecha esperada)", placeholder: "AAAA-MM" },
                { key: "gpa", label: "Promedio", placeholder: "Ej.: 3.8" },
                { key: "gpaScale", label: "Escala del promedio", placeholder: "Ej.: 4.0 o 100" },
              ]}
            />
          </Section>

          <Section id="idiomas" title="Idiomas" hint="Con el examen y la nota si tienes uno (TOEFL, IELTS, Duolingo, DELE…).">
            <ListEditor
              items={e.languages}
              onChange={(v) => set("languages", v)}
              addLabel="Añadir idioma"
              name={(i) => i.language}
              blank={(): Language => ({ id: newId(), language: "", level: "", test: "", score: "" })}
              fields={[
                { key: "language", label: "Idioma" },
                { key: "level", label: "Nivel", type: "select", options: LANGUAGE_LEVELS.map((l) => [l, l === "nativo" ? "Nativo" : l]) },
                { key: "test", label: "Examen" },
                { key: "score", label: "Nota" },
              ]}
            />
          </Section>

          <Section id="experiencia" title="Experiencia" hint="Trabajo, investigación, voluntariado, liderazgo y proyectos propios.">
            <ListEditor
              items={e.experience}
              onChange={(v) => set("experience", v)}
              addLabel="Añadir experiencia"
              name={(i) => i.organization}
              blank={(): Experience => ({ id: newId(), organization: "", role: "", kind: "", start: "", end: "", description: "" })}
              fields={[
                { key: "organization", label: "Organización" },
                { key: "role", label: "Rol" },
                { key: "kind", label: "Tipo", type: "select", options: Object.entries(EXPERIENCE_KIND_LABEL) },
                { key: "start", label: "Inicio", placeholder: "AAAA-MM" },
                { key: "end", label: "Fin (vacío si sigue)", placeholder: "AAAA-MM" },
                { key: "description", label: "Qué hiciste y qué lograste", type: "textarea", wide: true },
              ]}
            />
          </Section>

          <Section id="premios" title="Premios y logros">
            <ListEditor
              items={e.awards}
              onChange={(v) => set("awards", v)}
              addLabel="Añadir premio"
              name={(i) => i.name}
              blank={() => ({ id: newId(), name: "", issuer: "", year: "", description: "" })}
              fields={[
                { key: "name", label: "Premio o logro" },
                { key: "issuer", label: "Quién lo otorgó" },
                { key: "year", label: "Año" },
                { key: "description", label: "Detalle", type: "textarea", wide: true },
              ]}
            />
          </Section>

          <Section
            id="documentos"
            title="Documentos"
            hint="Enlaces a tus archivos en Drive, Dropbox u otro sitio: CV, notas, cartas, certificados. Nombra tu CV con “CV” para que cuente."
          >
            <ListEditor
              items={e.documents}
              onChange={(v) => set("documents", v)}
              addLabel="Añadir documento"
              name={(i) => i.name}
              blank={() => ({ id: newId(), name: "", url: "", updated: "" })}
              fields={[
                { key: "name", label: "Documento", placeholder: "Ej.: CV en inglés" },
                { key: "updated", label: "Actualizado", placeholder: "AAAA-MM" },
                { key: "url", label: "Enlace", type: "url", wide: true, placeholder: "https://" },
              ]}
            />
          </Section>

          <Section
            id="respuestas"
            title="Banco de respuestas"
            hint="Las respuestas que reutilizas. Márcalas por tema para encontrar la adecuada en cada postulación."
          >
            <AnswersEditor answers={e.answers} onChange={(v) => set("answers", v)} />
          </Section>

          <Section id="habilidades" title="Habilidades" hint="Herramientas, lenguajes y métodos, como los pondrías en un formulario.">
            <textarea className={cn(AREA, "min-h-36")} value={e.skills} onChange={(ev) => set("skills", ev.target.value)} />
          </Section>
        </div>
      </details>
    </div>
  );
}
