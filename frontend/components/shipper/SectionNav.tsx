export type SectionNavItem = {
  id: string;
  label: string;
};

export function SectionNav({
  sections,
  completed,
}: {
  sections: SectionNavItem[];
  completed: boolean[];
}) {
  return (
    <nav className="flex flex-col">
      {sections.map((section, index) => {
        const isDone = completed[index] ?? false;
        const isLast = index === sections.length - 1;

        return (
          <div key={section.id} className="flex flex-col items-start">
            <div className="flex items-center gap-3">
              <span className="flex size-4 shrink-0 items-center justify-center">
                <span
                  className={`rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-all duration-200 ${
                    isDone
                      ? "animate-sparkle-dot size-3 bg-maincolor"
                      : "size-2 bg-gray-300"
                  }`}
                />
              </span>
              <span
                className={`text-sm whitespace-nowrap transition-colors duration-200 ${
                  isDone ? "font-bold text-gray-900" : "text-gray-400"
                }`}
              >
                {section.label}
              </span>
            </div>

            {!isLast && (
              <span
                className={`ml-2 h-8 w-px transition-colors duration-200 ${
                  isDone ? "bg-maincolor" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
