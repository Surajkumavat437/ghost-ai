import { EditorLayout } from "@/components/editor/editor-layout";

export default function Home() {
  return (
    <EditorLayout>
      <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center">
        <p className="text-sm text-copy-muted">Ghost AI workspace</p>
      </div>
    </EditorLayout>
  );
}
