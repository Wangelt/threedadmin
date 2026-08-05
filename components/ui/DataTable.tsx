type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: string;
  /** Row hover: tint + hard shadow lift */
  interactive?: boolean;
};

const hideScrollbar =
  "overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const interactiveRowClass =
  "col-span-full grid border border-border bg-white shadow-none transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-x-[3px] hover:-translate-y-[3px] hover:!bg-[#eeeeee] hover:shadow-[3px_3px_0_#0a0a0a]";

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = "Nothing here yet.",
  interactive = false,
}: Props<T>) {
  if (!rows.length) {
    return (
      <div className="card flex min-h-40 items-center justify-center p-8 text-sm text-muted">
        {empty}
      </div>
    );
  }

  if (interactive) {
    return (
      <div className={`${hideScrollbar} w-full min-w-0 p-[3px]`}>
        <div
          className="grid gap-y-2"
          style={{
            width: "max(100%, max-content)",
            gridTemplateColumns: `repeat(${columns.length}, minmax(max-content, 1fr))`,
          }}
        >
          <div
            className="col-span-full grid border border-border bg-[#f4f4f4] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
            style={{ gridColumn: "1 / -1", gridTemplateColumns: "subgrid" }}
          >
            {columns.map((col) => (
              <div
                key={col.key}
                className={`whitespace-nowrap px-4 py-3 ${col.className || ""}`}
              >
                {col.header}
              </div>
            ))}
          </div>

          {rows.map((row) => (
            <div
              key={rowKey(row)}
              className={interactiveRowClass}
              style={{ gridColumn: "1 / -1", gridTemplateColumns: "subgrid" }}
            >
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={`whitespace-nowrap px-4 py-3 ${col.className || ""}`}
                >
                  {col.render(row)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className={hideScrollbar}>
        <table className="w-max min-w-full text-left text-sm">
          <thead className="border-b border-border bg-[#f4f4f4] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-4 py-3 ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-border/80 last:border-0 hover:bg-[#fafafa]"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`whitespace-nowrap px-4 py-3 align-middle ${col.className || ""}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
