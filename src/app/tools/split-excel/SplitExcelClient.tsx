'use client'

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import styles from './SplitExcel.module.css'

// Native CSV parser — no external dependency
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim())
  return lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  })
}

const COLONNES = ['LOGIN', 'NOM', 'PRENOM', 'NUMERO', 'IMSI', 'EMAIL', 'ETAT', 'PARENT']

interface FilePart { name: string; rows: number }
interface FileResult {
  file: string
  total?: number
  parts?: FilePart[]
  error?: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function readFileAsRows(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const reader = new FileReader()

    if (ext === 'csv') {
      reader.onload = (e) => {
        const text = e.target?.result as string
        resolve(parseCsv(text))
      }
      reader.onerror = reject
      reader.readAsText(file, 'utf-8')
    } else {
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
        resolve(rows)
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    }
  })
}

function rowsToCsvString(rows: Record<string, string>[]): string {
  const header = COLONNES.join(';')
  const lines = rows.map(r => COLONNES.map(c => `"${(r[c] ?? '').replace(/"/g, '""')}"`).join(';'))
  return '\uFEFF' + [header, ...lines].join('\r\n')
}

export default function SplitExcelClient() {
  const [files, setFiles] = useState<File[]>([])
  const [maxRows, setMaxRows] = useState<number>(450)
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<FileResult[]>([])
  const [zipBlob, setZipBlob] = useState<Blob | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((incoming: File[]) => {
    const valid = incoming.filter(f => /\.(csv|xlsx|xls)$/i.test(f.name))
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size))
      return [...prev, ...valid.filter(f => !existing.has(f.name + f.size))]
    })
  }, [])

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i))

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragging(false)
addFiles(Array.from(e.dataTransfer.files))  }
  const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
if (e.target.files) addFiles(Array.from(e.target.files))  }

  const clear = () => {
    setFiles([]); setResults([]); setZipBlob(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const process = async () => {
    if (files.length === 0) return
    setProcessing(true)
    setResults([])
    setZipBlob(null)

    const zip = new JSZip()
    const fileResults: FileResult[] = []
    const limit = Math.max(1, maxRows)

    for (const file of files) {
      const nomBase = file.name.replace(/\.[^.]+$/, '')
      try {
        const rawRows = await readFileAsRows(file)
        const rows = rawRows.map(r => {
          const out: Record<string, string> = {}
          COLONNES.forEach(c => { out[c] = String(r[c] ?? '') })
          return out
        })

        const total = rows.length
        const nbParts = Math.ceil(total / limit)
        const parts: FilePart[] = []

        for (let i = 0; i < nbParts; i++) {
          const chunk = rows.slice(i * limit, (i + 1) * limit)
          const partName = `${nomBase}_part${String(i + 1).padStart(2, '0')}.csv`
          zip.file(partName, rowsToCsvString(chunk))
          parts.push({ name: partName, rows: chunk.length })
        }

        fileResults.push({ file: file.name, total, parts })
      } catch (e: unknown) {
        fileResults.push({ file: file.name, error: e instanceof Error ? e.message : 'Erreur inconnue' })
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    setZipBlob(blob)
    setResults(fileResults)
    setProcessing(false)
  }

  const download = () => {
    if (zipBlob) saveAs(zipBlob, 'split_results.zip')
  }

  const totalParts = results.reduce((acc, r) => acc + (r.parts?.length ?? 0), 0)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/" className={styles.backLink}>← Accueil</Link>
        <div className={styles.meta}>
          <span className={styles.metaIcon}>✂️</span>
          <div>
            <h1 className={styles.title}>Split Excel / CSV</h1>
            <p className={styles.sub}>
              Découpez vos fichiers en parties avec un nombre de lignes configurable.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.columns}>
        <div className={styles.panel}>
          <p className={styles.panelLabel}>Fichiers à traiter</p>

          <div
            className={`${styles.dropZone} ${dragging ? styles.dragging : ''}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
          >
            <span className={styles.dropIcon}>📂</span>
            <p className={styles.dropText}>Glissez vos fichiers ici</p>
            <p className={styles.dropHint}>ou</p>
            <span className={styles.btnUpload}>Choisir des fichiers</span>
            <p className={styles.dropFormats}>CSV · XLSX · XLS — plusieurs fichiers acceptés</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".csv,.xlsx,.xls"
              onChange={onInputChange}
              style={{ display: 'none' }}
            />
          </div>

          {files.length > 0 && (
            <div className={styles.fileList}>
              {files.map((f, i) => (
                <div key={i} className={styles.fileItem}>
                  <span className={styles.fileItemIcon}>
                    {/xlsx|xls/i.test(f.name) ? '📗' : '📄'}
                  </span>
                  <span className={styles.fileItemName}>{f.name}</span>
                  <span className={styles.fileItemSize}>{formatSize(f.size)}</span>
                  <button className={styles.fileItemRemove} onClick={() => removeFile(i)}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div className={styles.configBox}>
            <label className={styles.configLabel} htmlFor="maxRows">
              Lignes par fichier
            </label>
            <div className={styles.configRow}>
              <input
                id="maxRows"
                type="number"
                min={1}
                max={100000}
                value={maxRows}
                onChange={e => setMaxRows(Math.max(1, parseInt(e.target.value) || 1))}
                className={styles.configInput}
              />
              <div className={styles.configPresets}>
                {[100, 250, 450, 1000, 5000].map(n => (
                  <button
                    key={n}
                    className={`${styles.preset} ${maxRows === n ? styles.presetActive : ''}`}
                    onClick={() => setMaxRows(n)}
                  >
                    {n.toLocaleString('fr')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.btnPrimary}
              onClick={process}
              disabled={files.length === 0 || processing}
            >
              {processing ? '⏳ Traitement…' : 'Lancer le découpage'}
            </button>
            <button className={styles.btnGhost} onClick={clear}>Tout effacer</button>
          </div>

          <div className={styles.infoBox}>
            <strong>Colonnes conservées</strong>
            <div className={styles.tags}>
              {COLONNES.map(c => <span key={c} className={styles.tag}>{c}</span>)}
            </div>
            <p className={styles.infoNote}>
              Les colonnes absentes sont ajoutées vides. Les autres colonnes sont ignorées.
            </p>
          </div>
        </div>

        <div className={styles.panel}>
          <p className={styles.panelLabel}>Résultats</p>

          {results.length === 0 && !processing && (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>📋</span>
              <p>Les résultats apparaîtront ici après le traitement.</p>
            </div>
          )}

          {processing && (
            <div className={styles.empty}>
              <span className={styles.emptyIcon} style={{ animation: 'spin 1s linear infinite' }}>⚙️</span>
              <p>Traitement en cours…</p>
            </div>
          )}

          {results.length > 0 && (
            <>
              <div className={styles.summary}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryNum}>{results.filter(r => !r.error).length}</span>
                  <span className={styles.summaryLbl}>fichier{results.filter(r => !r.error).length > 1 ? 's' : ''} traité{results.filter(r => !r.error).length > 1 ? 's' : ''}</span>
                </div>
                <div className={styles.summaryDivider} />
                <div className={styles.summaryItem}>
                  <span className={styles.summaryNum}>{totalParts}</span>
                  <span className={styles.summaryLbl}>partie{totalParts > 1 ? 's' : ''} générée{totalParts > 1 ? 's' : ''}</span>
                </div>
                <div className={styles.summaryDivider} />
                <div className={styles.summaryItem}>
                  <span className={styles.summaryNum}>{results.reduce((a, r) => a + (r.total ?? 0), 0).toLocaleString('fr')}</span>
                  <span className={styles.summaryLbl}>lignes totales</span>
                </div>
              </div>

              <div className={styles.resultsList}>
                {results.map((r, i) => (
                  <div key={i} className={styles.resultFile}>
                    <div className={styles.resultHeader}>
                      <span className={r.error ? styles.statusErr : styles.statusOk}>
                        {r.error ? '✕' : '✔'}
                      </span>
                      <span className={styles.resultName}>{r.file}</span>
                      {r.total !== undefined && (
                        <span className={styles.resultTotal}>
                          {r.total.toLocaleString('fr')} lignes → {r.parts?.length} partie{(r.parts?.length ?? 0) > 1 ? 's' : ''}
                        </span>
                      )}
                      {r.error && <span className={styles.resultError}>{r.error}</span>}
                    </div>
                    {r.parts && (
                      <div className={styles.resultParts}>
                        {r.parts.map((p, j) => (
                          <div key={j} className={styles.resultPart}>
                            <span className={styles.partName}>{p.name}</span>
                            <span className={styles.partRows}>{p.rows.toLocaleString('fr')} ligne{p.rows > 1 ? 's' : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {zipBlob && (
                <button className={styles.btnDownload} onClick={download}>
                  ⬇ Télécharger les fichiers (.zip)
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}