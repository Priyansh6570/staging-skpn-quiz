/**
 * A slow, low-contrast light field for the pages whose body is otherwise flat #FBF7F0.
 *
 * Fixed to the viewport at z-index -1, so it costs nothing on scroll and the page's own opaque
 * sections — the dark heroes, the #F6F0E4 bands, every white card — paint straight over it. It is
 * only ever visible in the gaps, which is exactly where the page looked bare.
 *
 * The wrapper it sits in must set `isolation: isolate`, or the negative z-index puts it behind the
 * page background instead of in front of it. Motion is CSS, so the global prefers-reduced-motion
 * rule stops it without the component knowing.
 */
export default function PageAura() {
  return (
    <div aria-hidden="true" data-e="aura" style={{ position: "fixed", inset: "0", zIndex: -1, pointerEvents: "none", overflow: "hidden" }}>
      <span data-e="aurablob" style={{ position: "absolute", left: "-16%", top: "-14%", width: "62vw", height: "62vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(232,193,115,.34) 0%, rgba(232,193,115,0) 66%)", animation: "skpn-aura-a 26s ease-in-out infinite" }}></span>
      <span data-e="aurablob" style={{ position: "absolute", right: "-18%", top: "16%", width: "54vw", height: "54vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(39,64,139,.15) 0%, rgba(39,64,139,0) 68%)", animation: "skpn-aura-b 33s ease-in-out infinite" }}></span>
      <span data-e="aurablob" style={{ position: "absolute", left: "24%", bottom: "-26%", width: "66vw", height: "66vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(63,107,88,.13) 0%, rgba(63,107,88,0) 70%)", animation: "skpn-aura-c 39s ease-in-out infinite" }}></span>
      <span data-e="auraveil" style={{ position: "absolute", inset: "0", animation: "skpn-aura-drift 48s linear infinite alternate" }}></span>
    </div>
  );
}
