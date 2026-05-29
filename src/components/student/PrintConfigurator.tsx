"use client";

import { useActionState, useState } from "react";
import { createPrintJob, type PrintActionState } from "@/lib/actions/print";
import { computePrintPrice, type PriceConfig, type PrintOptions } from "@/lib/pricing";
import { formatINR } from "@/lib/money";

type UploadInfo = { token: string; fileName: string; pageCount: number; sizeBytes: number };

const card = "rounded-2xl border border-neutral-200 bg-white p-5";

export function PrintConfigurator({
  priceConfig,
  acceptingJobs,
}: {
  priceConfig: PriceConfig;
  acceptingJobs: boolean;
}) {
  const [upload, setUpload] = useState<UploadInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [copies, setCopies] = useState(1);
  const [color, setColor] = useState<PrintOptions["color"]>("BW");
  const [sided, setSided] = useState<PrintOptions["sided"]>("SINGLE");
  const [paperSize, setPaperSize] = useState<PrintOptions["paperSize"]>("A4");
  const [binding, setBinding] = useState<PrintOptions["binding"]>("NONE");
  const [coverPage, setCoverPage] = useState(false);
  const [rush, setRush] = useState(false);

  const [state, formAction, isPending] = useActionState<PrintActionState, FormData>(
    createPrintJob,
    undefined,
  );

  async function handleFile(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/print/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed.");
        setUpload(null);
      } else {
        setUpload(data as UploadInfo);
      }
    } catch {
      setUploadError("Upload failed. Check your connection.");
    } finally {
      setUploading(false);
    }
  }

  const breakdown = upload
    ? computePrintPrice(priceConfig, {
        pageCount: upload.pageCount,
        copies,
        color,
        sided,
        paperSize,
        binding,
        coverPage,
        rush,
      })
    : null;

  return (
    <div className="space-y-4">
      {!acceptingJobs && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          The shop is currently not accepting new print jobs.
        </p>
      )}

      {/* Upload */}
      <div className={card}>
        <h2 className="mb-2 text-sm font-semibold text-neutral-600">1 · Your document</h2>
        {!upload ? (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 px-4 py-8 text-center hover:border-brand-400">
            <span className="text-sm font-medium text-neutral-700">
              {uploading ? "Reading PDF…" : "Click to upload a PDF"}
            </span>
            <span className="mt-1 text-xs text-neutral-400">PDF only · max 25 MB</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </label>
        ) : (
          <div className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{upload.fileName}</p>
              <p className="text-xs text-neutral-400">{upload.pageCount} pages</p>
            </div>
            <button
              type="button"
              onClick={() => setUpload(null)}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              Change
            </button>
          </div>
        )}
        {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
      </div>

      {/* Options + price */}
      {upload && (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={upload.token} />
          <input type="hidden" name="fileName" value={upload.fileName} />

          <div className={card}>
            <h2 className="mb-3 text-sm font-semibold text-neutral-600">2 · Options</h2>
            <div className="grid grid-cols-2 gap-3">
              <Choice label="Color" name="color" value={color} onChange={(v) => setColor(v as PrintOptions["color"])} options={[["BW", "Black & white"], ["COLOR", "Color"]]} />
              <Choice label="Sides" name="sided" value={sided} onChange={(v) => setSided(v as PrintOptions["sided"])} options={[["SINGLE", "Single"], ["DOUBLE", "Double"]]} />
              <Choice label="Paper" name="paperSize" value={paperSize} onChange={(v) => setPaperSize(v as PrintOptions["paperSize"])} options={[["A4", "A4"], ["A3", "A3"]]} />
              <Choice label="Binding" name="binding" value={binding} onChange={(v) => setBinding(v as PrintOptions["binding"])} options={[["NONE", "None"], ["STAPLE", "Staple"], ["SPIRAL", "Spiral"]]} />
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Copies</label>
                <input
                  type="number"
                  name="copies"
                  min={1}
                  max={100}
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <Toggle name="coverPage" checked={coverPage} onChange={setCoverPage} label="Add a printed cover page" />
              <Toggle name="rush" checked={rush} onChange={setRush} label={`Rush job (+${priceConfig.rushPercent}%)`} />
            </div>
          </div>

          {/* Price summary */}
          {breakdown && (
            <div className={card}>
              <h2 className="mb-3 text-sm font-semibold text-neutral-600">3 · Price</h2>
              <dl className="space-y-1.5 text-sm">
                <Row k={`Printing (${breakdown.units} × ${formatINR(breakdown.perPage)})`} v={formatINR(breakdown.printSubtotal)} />
                {breakdown.bindingFee > 0 && <Row k="Binding" v={formatINR(breakdown.bindingFee)} />}
                {breakdown.freeSpiralApplied && <Row k="Spiral binding" v="Free" muted />}
                {breakdown.coverFee > 0 && <Row k="Cover page" v={formatINR(breakdown.coverFee)} />}
                {breakdown.rushFee > 0 && <Row k={`Rush (+${priceConfig.rushPercent}%)`} v={formatINR(breakdown.rushFee)} />}
                <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span>{formatINR(breakdown.total)}</span>
                </div>
              </dl>
            </div>
          )}

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={isPending || !acceptingJobs}
            className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {isPending ? "Creating job…" : "Continue to payment"}
          </button>
        </form>
      )}
    </div>
  );
}

function Choice({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-500">{label}</label>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({
  name,
  checked,
  onChange,
  label,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-neutral-300"
      />
      {label}
    </label>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-neutral-400" : "text-neutral-600"}`}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
