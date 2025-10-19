interface SearchCodeBlockProps {
  content: string;
}

export function SearchCodeBlock({ content }: SearchCodeBlockProps) {
  return (
    <div className="bg-zinc-100 dark:bg-zinc-750 rounded-md p-2 border border-zinc-200 dark:border-zinc-650">
      <code
        className="font-code text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap block"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
