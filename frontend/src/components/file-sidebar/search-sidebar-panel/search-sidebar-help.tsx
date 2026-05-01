const HELP_SECTIONS: {
  label: string;
  examples: { query: string; description: string }[];
}[] = [
  {
    label: 'Basics',
    examples: [
      {
        query: '"docker compose"',
        description: 'Match the exact phrase "docker compose".',
      },
      {
        query: 'auth AND middleware',
        description: 'Notes containing both "auth" and "middleware".',
      },
      {
        query: 'auth OR middleware',
        description: 'Notes containing either "auth" or "middleware".',
      },
    ],
  },
  {
    label: 'Files',
    examples: [
      { query: 'f:readme', description: 'Files or folders named "readme".' },
      {
        query: 'f:jobs/applications/job-1.md',
        description:
          'Files named "job-1.md" in the "jobs/applications" folder.',
      },
    ],
  },
  {
    label: 'Tags',
    examples: [{ query: '#todo', description: 'Notes tagged with "todo".' }],
  },
  {
    label: 'Type',
    examples: [
      { query: 't:note', description: 'Limit results to notes.' },
      {
        query: 'type:attachment',
        description: 'Limit results to attachments.',
      },
    ],
  },
  {
    label: 'Sort',
    examples: [
      {
        query: 's:created',
        description: 'Sort by creation time (newest first).',
      },
      {
        query: 'sort:updated_asc',
        description: 'Sort by last update time, oldest first.',
      },
      {
        query: 'sort:size_asc',
        description: 'Sort by size, smallest first.',
      },
    ],
  },
];

export function SearchSidebarHelp() {
  return (
    <div className="px-3 py-2 flex flex-col gap-3 overflow-y-auto">
      <h3 className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
        Examples
      </h3>
      {HELP_SECTIONS.map((section) => (
        <div key={section.label} className="flex flex-col gap-1.5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {section.label}
          </p>
          {section.examples.map((example) => (
            <div key={example.query} className="flex flex-col pb-1">
              <code className="font-mono text-xs text-zinc-700 dark:text-zinc-200 whitespace-nowrap overflow-x-auto">
                {example.query}
              </code>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                {example.description}
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
