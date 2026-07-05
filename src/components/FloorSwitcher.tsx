import type { FloorSelection } from '@/types/plan';
import { getFloorLabel } from '@/types/plan';

interface FloorSwitcherProps {
  floorLevels: number[];
  selection: FloorSelection;
  onChange: (selection: FloorSelection) => void;
  disabled?: boolean;
}

export default function FloorSwitcher({ floorLevels, selection, onChange, disabled }: FloorSwitcherProps) {
  const sorted = [...floorLevels].sort((a, b) => a - b);

  return (
    <div className="px-3 pb-3">
      <div className="flex flex-col gap-1">
        {sorted.map((level) => (
          <button
            key={level}
            type="button"
            disabled={disabled}
            onClick={() => onChange(level)}
            className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-all disabled:opacity-50 ${
              selection === level
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {getFloorLabel(level)}
          </button>
        ))}
        {sorted.length > 1 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange('all')}
            className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-all disabled:opacity-50 ${
              selection === 'all'
                ? 'border-violet-600 bg-violet-50 text-violet-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            All Floors
          </button>
        )}
      </div>
    </div>
  );
}
