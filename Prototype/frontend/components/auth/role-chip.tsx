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
            ? "bg-gray-700 text-white border-gray-700"
            : "bg-gray-800 border-gray-700 text-gray-400 hover:border-white"
        }`}
      >
        {value}
      </button>
    );
  }