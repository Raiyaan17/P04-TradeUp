type RoleChipProps = {
  value: "TRADER" | "ADMIN";
  current: string;
  onPick: (v: "TRADER" | "ADMIN" | "") => void;
};

export function RoleChip({ value, current, onPick }: RoleChipProps) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-xl text-xs border transition ${
        active
          ? "bg-white/10 text-white border-white/20"
          : "bg-black/20 border-white/10 text-gray-300 hover:border-white/50 hover:text-white"
      }`}
    >
      {value}
    </button>
  );
}