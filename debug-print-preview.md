# Debug Session: print-preview

Status: OPEN

User symptom:
- POS checkout print preview dialog is not showing.
- Repair ticket print preview dialog is not showing.

Expected:
- Clicking preview/print-related actions should open the preview dialog before printing.

Hypotheses:
1. Preview-open state is set and then immediately reset by another dialog or state transition.
2. Shared print document generation throws before the preview dialog state is toggled on.
3. Generated preview HTML is empty or invalid, making the dialog appear not to open.
4. Runtime template/printer resolution still fails in shared printing services.
5. Click handlers do not reach the preview-open branch in one or both flows.

Plan:
1. Instrument shared print helper and page-level preview-open paths.
2. Reproduce in POS and repairs.
3. Compare runtime evidence against hypotheses.
4. Apply minimal fix only after evidence confirms root cause.

Evidence so far:
- `printHelper.ts:buildReceiptDocument:resolved` confirms POS receipt HTML is generated successfully.
- `printHelper.ts:buildRepairTicketDocument:resolved` confirms repair ticket HTML is generated successfully.
- `RepairDetail.tsx:handlePrintJobCard:open` confirms the repair detail flow reaches `setIsTicketPreviewOpen(true)`.
- Initial POS trace did not hit `handlePreviewCheckout`, suggesting the failing POS path is likely the post-checkout print branch instead.

Next instrumentation:
1. Trace POS post-checkout preview-open branch.
2. Trace preview dialog `onOpenChange` callbacks to detect immediate close/reset.
