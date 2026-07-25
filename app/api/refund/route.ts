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

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select('user_id, properties(name)')
    .single<{ user_id: string; properties: { name: string } | null }>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Refund email - non-fatal, the refund itself already succeeded by
  // this point regardless of whether this email goes out.
  try {
    const { data: guestProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', booking.user_id)
      .maybeSingle();

    if (guestProfile?.email) {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          to: guestProfile.email,
          type: 'refund_processed',
          firstName: guestProfile.full_name?.split(' ')[0],
          propertyName: booking.properties?.name,
          refundAmount,
        }),
      });
    }
  } catch (emailErr) {
    console.warn('Could not send refund email:', emailErr);
  }

  return NextResponse.json({ success: true, message: 'Refund processed successfully.' });
}