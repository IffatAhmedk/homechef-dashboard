import { Button } from "@/components/ui/button";

interface ImportActionsProps {
  done: boolean;
  canImport: boolean;
  importing: boolean;
  onImport: () => void;
  onClose: () => void;
}

/** Cancel / Close and Import buttons at the bottom of an import window. */
export function ImportActions({ done, canImport, importing, onImport, onClose }: ImportActionsProps) {
  return (
    <div className="flex justify-end gap-2 border-t border-line pt-4">
      <Button variant="plain" onClick={onClose}>
        {done ? "Close" : "Cancel"}
      </Button>
      {!done && (
        <Button onClick={onImport} disabled={!canImport || importing}>
          {importing ? "Importing…" : "Import orders"}
        </Button>
      )}
    </div>
  );
}
