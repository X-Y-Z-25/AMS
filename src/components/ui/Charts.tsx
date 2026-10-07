interface BarChartProps {
  data: {
    label: string;
    value: number;
    color?: string;
    formattedValue?: string;
  }[];
  height?: number;
  showValues?: boolean;
  horizontal?: boolean;
}

export function BarChart({
  data,
  height = 200,
  showValues = true,
  horizontal = false,
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (horizontal) {
    return (
      <div className="space-y-3 text-slate-100">
        {data.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-200">
                {item.label}
              </span>
              {showValues && (
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {item.formattedValue ?? item.value.toLocaleString("en-IN")}
                </span>
              )}
            </div>
            <div className="h-3 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-700/60">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(100, Math.max(2, (item.value / maxValue) * 100))}%`,
                  backgroundColor: item.color || "#2563eb",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex items-end justify-between gap-2 pt-4 text-slate-100"
      style={{ height }}
    >
      {data.map((item) => (
        <div
          key={item.label}
          className="flex flex-1 flex-col items-center gap-2 h-full justify-end"
        >
          {showValues && (
            <span className="text-[11px] font-mono font-bold text-emerald-400 whitespace-nowrap">
              {item.formattedValue ?? item.value.toLocaleString("en-IN")}
            </span>
          )}
          <div className="flex w-full flex-1 items-end justify-center">
            <div
              className="w-full max-w-[48px] rounded-t-md transition-all duration-700 ease-out hover:opacity-85 shadow-sm"
              style={{
                height: `${Math.min(100, Math.max(4, (item.value / maxValue) * 100))}%`,
                minHeight: "6px",
                backgroundColor: item.color || "#2563eb",
              }}
              title={`${item.label}: ${item.formattedValue ?? item.value.toLocaleString("en-IN")}`}
            />
          </div>
          <span
            className="text-[11px] font-medium text-slate-300 text-center truncate w-full"
            title={item.label}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

interface DonutChartProps {
  data: {
    label: string;
    value: number;
    color: string;
    formattedValue?: string;
  }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  showPercent?: boolean;
}

export function DonutChart({
  data,
  size = 180,
  thickness = 28,
  centerLabel,
  centerValue,
  showPercent = true,
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6 flex-wrap text-slate-100">
      <div
        className="relative flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#334155"
            strokeWidth={thickness}
          />
          {data.map((item) => {
            const fraction = item.value / total;
            const dash = fraction * circumference;
            const segment = (
              <circle
                key={item.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                className="transition-all duration-700 cursor-pointer hover:opacity-85"
              >
                <title>{`${item.label}: ${item.formattedValue ?? item.value.toLocaleString("en-IN")} (${((item.value / total) * 100).toFixed(1)}%)`}</title>
              </circle>
            );
            offset += dash;
            return segment;
          })}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerValue && (
              <span className="text-xl font-extrabold text-slate-100 leading-none">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-[11px] text-slate-400 mt-1 font-bold">
                {centerLabel}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="space-y-2 min-w-[150px] flex-1 w-full">
        {data.map((item) => {
          const pct = ((item.value / total) * 100).toFixed(1);
          return (
            <div
              key={item.label}
              className="flex items-center justify-between gap-2 text-xs min-w-0 w-full"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className="h-3 w-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span
                  className="text-slate-200 font-semibold leading-snug break-words max-w-[120px]"
                  title={item.label}
                >
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-right">
                <span className="font-bold text-slate-100">
                  {item.formattedValue ?? item.value.toLocaleString("en-IN")}
                </span>
                {showPercent && (
                  <span className="text-[10px] text-slate-400">({pct}%)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PieChartProps {
  data: {
    label: string;
    value: number;
    color: string;
    formattedValue?: string;
  }[];
  size?: number;
  showPercent?: boolean;
}

export function PieChart({
  data,
  size = 180,
  showPercent = true,
}: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = size / 2;
  const center = size / 2;

  let cumulativeAngle = 0;

  // Generate SVG path for each pie slice
  const slices = data.map((item) => {
    const fraction = item.value / total;
    const angle = fraction * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    return {
      ...item,
      pathData,
      fraction,
      percentage: (fraction * 100).toFixed(1),
    };
  });

  return (
    <div className="flex items-center gap-6 flex-wrap text-slate-100">
      <div
        className="relative flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90">
          {slices.map((slice) => (
            <path
              key={slice.label}
              d={slice.pathData}
              fill={slice.color}
              className="transition-all duration-300 hover:opacity-85 hover:stroke-slate-900 hover:stroke-2 cursor-pointer"
            >
              <title>{`${slice.label}: ${slice.formattedValue ?? slice.value.toLocaleString("en-IN")} (${slice.percentage}%)`}</title>
            </path>
          ))}
        </svg>
      </div>
      <div className="space-y-2 min-w-[150px] flex-1 w-full">
        {slices.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-2 text-xs min-w-0 w-full"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className="h-3 w-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span
                className="text-slate-200 font-semibold leading-snug break-words max-w-[120px]"
                title={item.label}
              >
                {item.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-right">
              <span className="font-bold text-slate-100">
                {item.formattedValue ?? item.value.toLocaleString("en-IN")}
              </span>
              {showPercent && (
                <span className="text-[10px] text-slate-400">
                  ({item.percentage}%)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
