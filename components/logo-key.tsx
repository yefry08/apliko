/**
 * ApliKo's logo: one keycap with "A+", like a single key pulled off the keyboard on the home page.
 * Decorative on its own; the link that wraps it carries the name ("ApliKo").
 */
export function LogoKey({ size = 44 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-grid shrink-0 place-items-center border-[#18203A] bg-[#18203A] font-sans font-extrabold leading-none tracking-tight text-white transition-[translate,box-shadow] duration-100 group-hover:translate-y-[3px] group-hover:shadow-[0_1px_0_#0B0F1C]"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        borderWidth: Math.max(2, size / 18),
        boxShadow: `0 ${Math.round(size / 11)}px 0 #0B0F1C, inset 0 ${Math.max(2, size / 16)}px 0 rgba(255,255,255,0.14)`,
        fontSize: size * 0.44,
      }}
    >
      <span>
        A<span className="text-[#C8FF48]">+</span>
      </span>
    </span>
  );
}
