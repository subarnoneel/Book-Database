import { coverColors } from "../utils/cover";

const SIZES = {
  sm: "w-12 h-16 text-[0.55rem] p-1.5",
  md: "w-full aspect-[3/4] text-sm p-3",
  lg: "w-40 sm:w-48 aspect-[3/4] text-base p-4",
};

// A generated cloth-bound cover: consistent colour per title, title and author printed on it.
function BookCover({ title, author, size = "md" }) {
  const [from, to] = coverColors(title);
  const compact = size === "sm";

  return (
    <div
      aria-hidden
      className={`relative flex shrink-0 flex-col overflow-hidden rounded-r-md rounded-l-sm text-white shadow-card ${SIZES[size]}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {/* spine */}
      <span className="absolute inset-y-0 left-0 w-[6%] bg-black/25" />
      <span className="absolute inset-y-0 left-[6%] w-px bg-white/15" />
      {compact ? (
        <span className="m-auto line-clamp-3 break-words pl-1 text-center font-serif font-semibold leading-tight">
          {title}
        </span>
      ) : (
        <>
          <span className="mx-[8%] mt-[10%] border-y border-white/30 py-2 text-center font-serif font-semibold leading-snug">
            <span className="line-clamp-4 break-words">{title}</span>
          </span>
          <span className="mx-[8%] mt-auto mb-[8%] line-clamp-2 text-center text-[0.8em] text-white/80">{author}</span>
        </>
      )}
    </div>
  );
}

export default BookCover;
