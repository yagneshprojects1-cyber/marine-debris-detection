import { useRef } from "react";

/**
 * BatchUploadToolbar
 *
 * Lets the user pick multiple .bmp images and multiple .xml files.
 * The backend matches them by filename stem (00001.bmp ↔ 00001.xml).
 */
export default function BatchUploadToolbar({
  imageFiles,
  xmlFiles,
  onImagesChange,
  onXmlsChange,
  onSubmit,
  disabled,
  running,
}) {
  const imgRef = useRef(null);
  const xmlRef = useRef(null);

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    onImagesChange(files);
  };

  const handleXmlsChange = (e) => {
    const files = Array.from(e.target.files || []);
    onXmlsChange(files);
  };

  const canSubmit = imageFiles.length > 0 && xmlFiles.length > 0 && !disabled;

  return (
    <div className="upload-toolbar">
      {/* Images picker */}
      <label className="file-label">
        Choose Images (.bmp)
        <input
          ref={imgRef}
          className="file-input"
          type="file"
          multiple
          onChange={handleImagesChange}
        />
      </label>
      {imageFiles.length > 0 && (
        <div className="batch-file-list">
          {imageFiles.map((f) => (
            <span key={f.name} className="batch-file-chip">{f.name}</span>
          ))}
        </div>
      )}

      {/* XMLs picker */}
      <label className="file-label">
        Choose XML Files
        <input
          ref={xmlRef}
          className="file-input"
          type="file"
          multiple
          accept=".xml,text/xml"
          onChange={handleXmlsChange}
        />
      </label>
      {xmlFiles.length > 0 && (
        <div className="batch-file-list">
          {xmlFiles.map((f) => (
            <span key={f.name} className="batch-file-chip batch-file-chip--xml">{f.name}</span>
          ))}
        </div>
      )}

      {/* Pairing preview */}
      {imageFiles.length > 0 && xmlFiles.length > 0 && (
        <PairingPreview imageFiles={imageFiles} xmlFiles={xmlFiles} />
      )}

      <button
        type="button"
        className="action-button primary"
        onClick={onSubmit}
        disabled={!canSubmit}
        style={{ marginLeft: "auto" }}
      >
        {running ? "Processing batch…" : `Run Batch (${imageFiles.length} image${imageFiles.length !== 1 ? "s" : ""})`}
      </button>
    </div>
  );
}

/** Show which images will match and which will be rejected before submission. */
function PairingPreview({ imageFiles, xmlFiles }) {
  const xmlStems = new Set(xmlFiles.map((f) => f.name.replace(/\.[^.]+$/, "")));

  const pairs = imageFiles.map((img) => {
    const stem = img.name.replace(/\.[^.]+$/, "");
    const matched = xmlStems.has(stem);
    return { name: img.name, xmlName: `${stem}.xml`, matched };
  });

  const mismatches = pairs.filter((p) => !p.matched);

  return (
    <div className="batch-pairing-preview">
      <p className="batch-pairing-title">
        Pairing preview &mdash; {pairs.filter((p) => p.matched).length}/{pairs.length} matched
      </p>
      {mismatches.length > 0 && (
        <p className="batch-pairing-warn">
          ⚠ {mismatches.length} image(s) have no matching XML and will be skipped:{" "}
          {mismatches.map((p) => p.name).join(", ")}
        </p>
      )}
      <ul className="batch-pairing-list">
        {pairs.map((p) => (
          <li key={p.name} className={`batch-pairing-row${p.matched ? "" : " batch-pairing-row--miss"}`}>
            <span className="batch-pairing-dot">{p.matched ? "✓" : "✗"}</span>
            <span className="batch-pair-img">{p.name}</span>
            <span className="batch-pair-arrow">↔</span>
            <span className="batch-pair-xml">{p.xmlName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
