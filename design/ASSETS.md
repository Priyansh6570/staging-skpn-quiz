# Asset register — Shri Krishna Pathey Nyas website

Brief §12 requires every shipped asset to carry a recorded source and licence.

| File | Used on | Source | Licence status |
|---|---|---|---|
| `uploads/skpn-logo.png` | Header, hero, footer, certificate | Client-supplied trust mark | Owned by the Nyas. SVG redraw still required (§3) — raster is soft above ~250px and unusable in print. |
| `uploads/images.jpg` | Header lockup, footer | Client-supplied Government of Madhya Pradesh emblem | **BLOCKER — not cleared.** State Emblem of India (Prohibition of Improper Use) Act, 2005. Written departmental permission required before launch (§3). |
| `uploads/6c2fe7fce1ce7c7b5034163370f01ac3.webp` | Home hero (peacock feather) | Supplied by client from Pinterest | **NOT CLEARED.** Unknown author, unknown licence. Must be replaced with client-owned photography or an original illustration before launch. |
| `uploads/img2.jpg` | Home, syllabus section illustration | Supplied by client from Pinterest; appears AI-generated | **NOT CLEARED.** Unknown licence. Also a depiction of Bhagwan Shri Krishna — appropriateness is a departmental decision, not a design one (§12). Labelled on-page as "प्रतीकात्मक चित्र / Symbolic illustration". |
| `uploads/730962f4c8b21163ddeca3a59178b0fc.jpg` | Closing CTA band (peacock pattern) | Supplied by client from Pinterest | **NOT CLEARED.** Unknown author, unknown licence. |
| `uploads/img1.jpg`, `uploads/730962...` alternates | Not shipped | Reference only | — |

| `uploads/Krishna Clip.mp4` | Home, introductory film card (click to play, `preload="none"`, ~15 MB) | Supplied by client; appears AI-generated | **NOT CLEARED.** Unknown licence. Also a depiction of Bhagwan Shri Krishna, so appropriateness is a departmental call (§12). Loads only on viewports ≥900px with a fast connection and no data-saver; a still frame carries the hero otherwise. |
| `assets/cosmic-halo.png`, `assets/cosmic-spiral.png`, `assets/cosmic-light.png` | Syllabus feature panel, Pratiyogita hero, closing bands | Frames extracted from `Krishna Clip.mp4` | Same status as the clip: **not cleared**. |
| `assets/pathey.png` | Home hero | Client-supplied still, appears AI-generated | **NOT CLEARED.** Unknown licence. Chosen because the paths of light read as "pathey". |
| `assets/teaching.png` | About hero, film poster | Client-supplied still, appears AI-generated | **NOT CLEARED.** Depiction of Bhagwan Shri Krishna; appropriateness is a departmental call (§12). |

## Action needed
1. Request the Veer Bharat Nyas / Maharaja Vikramaditya Shodhpeeth archives of Ujjain, the Sandipani Ashram and Vikramotsav (§12). Owned photography replaces all three Pinterest images.
2. Get emblem usage cleared in writing, or fall back to text attribution.
3. Commission or produce the trust-mark SVG redraw.
4. Replace `Krishna Clip.mp4` with the 480p build under 5 MB when it is ready. The player already uses `preload="none"`, so only the poster loads until the student presses play.
