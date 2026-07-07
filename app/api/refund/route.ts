import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const { bookingId, paystackRef, refundAmount, reason } = await req.json();

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'PAYSTACK_SECRET_KEY is not set on the server.' }, { status: 500 });
  }
  if (!paystackRef) {
    return NextResponse.json({ error: 'This booking has no Paystack reference to refund against.' }, { status: 400 });
  }

  let paystackOk = false;
  let message = '';
  try {
    const res = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction: paystackRef,
        amount: Math.round(refundAmount * 100), // kobo
        customer_note: reason,
        merchant_note: `Bookam admin refund: ${reason}`,
      }),
    });
    const json = await res.json();
    paystackOk = res.ok && json.status === true;
    message = json.message ?? '';
  } catch (err) {
    message = err instanceof Error ? err.message : 'Network error reaching Paystack.';
    // Paystack's own error responses (caught above via res.json()) are
    // plain objects too, not Error instances — same class of bug as
    // lib/api.ts's errorMessage() was fixed for. Network/fetch failures
    // specifically are usually real Error/TypeError instances, so this
    // narrower fallback is fine here.
  }

  if (!paystackOk) {
    return NextResponse.json({ success: false, message }, { status: 200 });
  }

  // Service role client — server-only, bypasses RLS to write the
  // authoritative cancellation/refund state on the booking.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', bookingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Refund processed successfully.' });
}