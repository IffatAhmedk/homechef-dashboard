"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilePicker } from "@/components/FilePicker";
import { ImportSummaryBox } from "@/components/ImportSummaryBox";
import { Modal } from "@/components/Modal";
import type { ImportSummary } from "@/data/ingredients";
import { extractMenuFromFile } from "@/data/menu";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Upload a photo or PDF of a physical menu; Claude reads it and creates priced menu items. */
export function UploadMenuModal({ onClose }: { onClose: () => void }) {
  const [fileName, setFileName] = useState("");
  const [reading, setReading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function chooseFile([file]: File[]) {
    setFileName(file.name);
    setSummary(null);
    setError(null);

    if (file.size > MAX_FILE_BYTES) {
      setError("That file is too large — please upload something under 15MB.");
      return;
    }

    setReading(true);
    const data = await readAsBase64(file);
    const result = await extractMenuFromFile(file.type, data);
    setReading(false);

    if (result.ok) setSummary(result.data);
    else setError(result.error ?? "Could not read that file");
  }

  return (
    <Modal
      title="Upload menu"
      onClose={onClose}
      footer={
        <Button variant="plain" onClick={onClose}>
          {summary ? "Close" : "Cancel"}
        </Button>
      }
    >
      <p className="text-base text-ink-muted">
        Upload a photo or PDF of your menu — items with a name, price and category are added automatically. Review them on the menu afterwards.
      </p>
      <FilePicker fileName={fileName} prompt="Choose a photo or PDF" accept="image/*,application/pdf" onFiles={chooseFile} />
      {reading && <p className="rounded-lg bg-sunken p-3 text-base text-ink-muted">Reading the menu… this can take a few seconds.</p>}
      {error && <p className="text-base text-danger">{error}</p>}
      {summary && <ImportSummaryBox summary={summary} />}
    </Modal>
  );
}
