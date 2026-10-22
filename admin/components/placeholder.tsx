import { Construction } from 'lucide-react';

export function Placeholder({
  title,
  desc,
  bullets,
}: {
  title: string;
  desc: string;
  bullets?: string[];
}) {
  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
          <Construction size={18} />
        </span>
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-[#667085]">{desc}</p>
          {bullets?.length ? (
            <ul className="mt-4 space-y-1.5 text-sm text-[#475467]">
              {bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" />
                  {b}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-5 text-xs text-[#98A2B3]">
            字段与操作清单见 doc/06-缺失页面推荐实现规格.md 第 I 节
          </p>
        </div>
      </div>
    </div>
  );
}
