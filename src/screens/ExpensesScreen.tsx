/**
 * R1 — salary, manual expenses, and expenses read from a receipt photo.
 *
 * The receipt path deliberately never writes straight to the ledger. OCR
 * produces a *proposal*, the proposal is shown next to the image and the raw
 * text it came from, and the user confirms or corrects every field before the
 * expense is saved. Fields the parser was unsure about are flagged so attention
 * lands where it is needed.
 */
import { useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, Input, Select } from '../components/ui';
import { displayMoney, formatMoney, parseMoney } from '../lib/money';
import { dateLabel, monthOf, systemToday } from '../lib/dates';
import { CATEGORIES, type Category } from '../lib/types';
import { parseReceiptText, type ParsedReceipt } from '../services/receipt.service';
import { useLedger } from '../store/ledger.store';
import { colorFor } from './DashboardScreen';

type Draft = {
  amount: string;
  date: string;
  shop: string;
  category: Category;
};

/** Confidence below this is surfaced as "please check". */
const LOW_CONFIDENCE = 0.75;

export default function ExpensesScreen() {
  const { salary, expenses, today, setSalary, addExpense, deleteExpense } = useLedger();

  const [salaryInput, setSalaryInput] = useState(() => (salary ? formatMoney(salary) : ''));
  const [manual, setManual] = useState<Draft>({
    amount: '',
    date: today,
    shop: '',
    category: 'Groceries',
  });

  // Receipt flow state.
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [review, setReview] = useState<Draft | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(
    () => [...expenses].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [expenses],
  );

  /** Which review fields the user changed away from what OCR proposed. */
  const correctedFields = useMemo(() => {
    if (!parsed || !review) return [];
    const out: string[] = [];
    if (parsed.amount === null || parseMoney(review.amount) !== parsed.amount) out.push('amount');
    if (parsed.date !== review.date) out.push('date');
    if ((parsed.shop ?? '') !== review.shop) out.push('shop');
    if (parsed.category !== review.category) out.push('category');
    return out;
  }, [parsed, review]);

  const onSalarySave = () => {
    const p = parseMoney(salaryInput);
    if (p > 0) setSalary(p);
  };

  const onManualSave = () => {
    const amount = parseMoney(manual.amount);
    if (amount <= 0 || !manual.shop.trim() || !manual.date) return;
    addExpense({
      date: manual.date,
      category: manual.category,
      shop: manual.shop.trim(),
      amount,
      source: 'manual',
    });
    setManual({ amount: '', date: manual.date, shop: '', category: manual.category });
  };

  /** Read a receipt image with Tesseract, then hand the result to the review form. */
  const onFile = async (file: File) => {
    setOcrError(null);
    setParsed(null);
    setReview(null);
    setOcrBusy(true);
    setOcrProgress(0);

    const url = URL.createObjectURL(file);
    setImageUrl(url);

    try {
      // Imported lazily so the 2 MB OCR bundle is only fetched when a receipt is
      // actually uploaded, keeping the first paint fast.
      const { default: Tesseract } = await import('tesseract.js');
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100));
        },
      });

      const text = result.data.text ?? '';
      const p = parseReceiptText(text);
      setParsed(p);
      setReview({
        amount: p.amount !== null ? formatMoney(p.amount) : '',
        date: p.date ?? today,
        shop: p.shop ?? '',
        category: p.category ?? 'Groceries',
      });
    } catch (e) {
      setOcrError(
        `The receipt could not be read (${(e as Error).message}). You can still enter the expense by hand below.`,
      );
    } finally {
      setOcrBusy(false);
    }
  };

  const onReviewSave = () => {
    if (!review || !parsed) return;
    const amount = parseMoney(review.amount);
    if (amount <= 0 || !review.shop.trim() || !review.date) return;

    addExpense({
      date: review.date,
      category: review.category,
      shop: review.shop.trim(),
      amount,
      source: 'receipt',
      receipt: {
        rawText: parsed.rawText,
        parsed: { amount: parsed.amount, date: parsed.date, shop: parsed.shop },
        confidence: parsed.confidence,
        correctedFields,
        imageDataUrl: imageUrl ?? undefined,
      },
    });
    discardReview();
  };

  const discardReview = () => {
    setParsed(null);
    setReview(null);
    setImageUrl(null);
    setShowRaw(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Salary */}
      <Card
        title="Monthly salary"
        subtitle="Everything on the dashboard and in the forecast is measured against this figure."
      >
        <div className="flex flex-wrap items-end gap-3 px-5 py-5">
          <div className="w-full max-w-56">
            <Field label="Salary (BDT per month)">
              <Input
                inputMode="decimal"
                placeholder="50000.00"
                value={salaryInput}
                onChange={(e) => setSalaryInput(e.target.value)}
              />
            </Field>
          </div>
          <Button onClick={onSalarySave} disabled={parseMoney(salaryInput) <= 0}>
            Save salary
          </Button>
          {salary > 0 && (
            <p className="pb-2.5 text-[13px] text-[var(--muted)]">
              Currently <strong className="tabular text-ink-900">{displayMoney(salary)}</strong> a month.
            </p>
          )}
        </div>
      </Card>

      {/* Receipt upload */}
      <Card
        title="Add an expense from a receipt photo"
        subtitle="The amount, date and shop are read from the image. Nothing is saved until you have checked them."
      >
        <div className="px-5 py-5">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />

          {!parsed && !ocrBusy && (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-brand-50/40 px-5 py-8 text-center">
              <p className="text-[13px] font-semibold text-ink-900">
                Upload or photograph a bill
              </p>
              <p className="mx-auto mt-1 max-w-md text-[12px] leading-relaxed text-[var(--muted)]">
                Reading happens in your browser, so no account, key or upload to any server is
                involved. A clear, straight-on photo reads best.
              </p>
              <div className="mt-4">
                <Button onClick={() => fileRef.current?.click()}>Choose a receipt image</Button>
              </div>
            </div>
          )}

          {ocrBusy && (
            <div className="rounded-xl border border-[var(--border)] px-5 py-8 text-center">
              <p className="text-[13px] font-semibold text-ink-900">Reading the receipt…</p>
              <div className="mx-auto mt-3 h-1.5 w-64 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-500 transition-[width]"
                  style={{ width: `${Math.max(6, ocrProgress)}%` }}
                />
              </div>
              <p className="mt-2 text-[12px] text-[var(--muted)]">{ocrProgress}%</p>
            </div>
          )}

          {ocrError && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
              {ocrError}
            </p>
          )}

          {/* The review step: what was read, and every field editable. */}
          {parsed && review && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,260px)_1fr]">
              <div>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="The uploaded receipt"
                    className="w-full rounded-xl border border-[var(--border)] object-contain"
                    style={{ maxHeight: 320 }}
                  />
                )}
                <button
                  onClick={() => setShowRaw((v) => !v)}
                  className="mt-2 text-[12px] font-semibold text-brand-600 hover:underline"
                >
                  {showRaw ? 'Hide' : 'Show'} the raw text that was read
                </button>
                {showRaw && (
                  <pre className="mt-2 max-h-56 overflow-auto rounded-xl border border-[var(--border)] bg-slate-50 p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-slate-700">
                    {parsed.rawText.trim() || '(the reader returned no text)'}
                  </pre>
                )}
              </div>

              <div>
                <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
                  <p className="text-[13px] font-semibold text-brand-600">
                    Check what was read before saving
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-800">
                    Every field below can be corrected. Anything the reader was unsure about is
                    marked, and what you change is recorded with the expense.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Amount (BDT)"
                    hint={parsed.notes.amount}
                    flag={<ConfidenceFlag value={parsed.confidence.amount} />}
                  >
                    <Input
                      inputMode="decimal"
                      value={review.amount}
                      onChange={(e) => setReview({ ...review, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </Field>

                  <Field
                    label="Date"
                    hint={parsed.notes.date}
                    flag={<ConfidenceFlag value={parsed.confidence.date} />}
                  >
                    <Input
                      type="date"
                      value={review.date}
                      onChange={(e) => setReview({ ...review, date: e.target.value })}
                    />
                  </Field>

                  <Field
                    label="Shop"
                    hint={parsed.notes.shop}
                    flag={<ConfidenceFlag value={parsed.confidence.shop} />}
                  >
                    <Input
                      value={review.shop}
                      onChange={(e) => setReview({ ...review, shop: e.target.value })}
                      placeholder="Shop name"
                    />
                  </Field>

                  <Field
                    label="Category"
                    hint={
                      parsed.category
                        ? `Suggested from the shop name and the text of the receipt.`
                        : 'No category could be guessed — please pick one.'
                    }
                  >
                    <Select
                      value={review.category}
                      onChange={(e) =>
                        setReview({ ...review, category: e.target.value as Category })
                      }
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                {correctedFields.length > 0 && (
                  <p className="mt-3 text-[12px] text-[var(--muted)]">
                    You have corrected: <strong className="text-ink-900">{correctedFields.join(', ')}</strong>.
                    This is saved with the expense.
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    onClick={onReviewSave}
                    disabled={parseMoney(review.amount) <= 0 || !review.shop.trim() || !review.date}
                  >
                    Save this expense
                  </Button>
                  <Button variant="outline" onClick={() => fileRef.current?.click()}>
                    Try another image
                  </Button>
                  <Button variant="ghost" onClick={discardReview}>
                    Discard
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Manual entry */}
      <Card
        title="Add an expense by hand"
        subtitle="The same ledger, without a photo — also the fallback if a receipt will not read."
      >
        <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <Field label="Amount (BDT)">
            <Input
              inputMode="decimal"
              placeholder="0.00"
              value={manual.amount}
              onChange={(e) => setManual({ ...manual, amount: e.target.value })}
            />
          </Field>
          <Field label="Date">
            <Input
              type="date"
              value={manual.date}
              onChange={(e) => setManual({ ...manual, date: e.target.value })}
            />
          </Field>
          <Field label="Shop">
            <Input
              placeholder="Meena Bazar"
              value={manual.shop}
              onChange={(e) => setManual({ ...manual, shop: e.target.value })}
            />
          </Field>
          <Field label="Category">
            <Select
              value={manual.category}
              onChange={(e) => setManual({ ...manual, category: e.target.value as Category })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            onClick={onManualSave}
            disabled={parseMoney(manual.amount) <= 0 || !manual.shop.trim()}
          >
            Add expense
          </Button>
        </div>
      </Card>

      {/* Ledger */}
      <Card
        title="All expenses"
        subtitle={`${expenses.length} entries, newest first`}
      >
        {sorted.length === 0 ? (
          <EmptyState
            title="The ledger is empty"
            body="Add an expense above, or load one of the published sample cases from the header."
          />
        ) : (
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="sticky top-0 bg-[var(--card)]">
                <tr className="border-b border-[var(--border)] text-[11px] tracking-wide text-[var(--muted)] uppercase">
                  <th className="px-5 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Shop</th>
                  <th className="px-3 py-2.5 font-semibold">Category</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
                  <th className="px-3 py-2.5 font-semibold">Source</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {sorted.map((e) => (
                  <tr key={e.id} className={monthOf(e.date) === monthOf(today) ? '' : 'opacity-60'}>
                    <td className="tabular px-5 py-2.5 whitespace-nowrap">{dateLabel(e.date)}</td>
                    <td className="px-3 py-2.5 font-medium">{e.shop}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: colorFor(e.category) }}
                        />
                        {e.category}
                      </span>
                    </td>
                    <td className="tabular px-3 py-2.5 text-right font-semibold whitespace-nowrap">
                      {displayMoney(e.amount)}
                    </td>
                    <td className="px-3 py-2.5">
                      {e.source === 'receipt' ? (
                        <Badge tone="brand">
                          receipt
                          {e.receipt?.correctedFields.length
                            ? ` · ${e.receipt.correctedFields.length} corrected`
                            : ' · as read'}
                        </Badge>
                      ) : e.source === 'manual' ? (
                        <Badge tone="neutral">manual</Badge>
                      ) : (
                        <Badge tone="neutral">sample</Badge>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        onClick={() => deleteExpense(e.id)}
                        className="text-[12px] font-semibold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/** Tells the user, per field, whether the read is worth a second look. */
function ConfidenceFlag({ value }: { value: number }) {
  if (value === 0) return <Badge tone="bad">not found</Badge>;
  if (value < LOW_CONFIDENCE) return <Badge tone="warn">please check</Badge>;
  return <Badge tone="good">read clearly</Badge>;
}
