import { supabase } from './supabase';

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  // Supabase/PostgREST errors are plain objects shaped like
  // { message, code, details, hint } — not real Error instances —
  // so `e instanceof Error` is false and String(e) gives "[object Object]".
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

/**
 * Manually attaches guest profile info to a list of bookings.
 *
 * bookings.user_id references auth.users, and profiles.id is separately
 * tied to auth.users — there is no direct foreign key from bookings to
 * profiles. PostgREST's embedded-resource syntax (`profiles(...)` inside
 * a .select()) requires an actual FK to auto-detect the relationship, so
 * `.select('*, profiles(...)')` on bookings fails outright with "could
 * not find a relationship." This does the join manually in two queries
 * instead of touching the schema.
 */
async function attachGuestProfiles<T extends { user_id: string }>(
  rows: T[]
): Promise<(T & { profiles: Pick<DbProfile, 'full_name' | 'email' | 'phone'> | null })[]> {
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  if (userIds.length === 0) return rows.map((r) => ({ ...r, profiles: null }));

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone')
    .in('id', userIds);
  if (error) throw error;

  const byId = new Map((profiles || []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, profiles: byId.get(r.user_id) ?? null }));
}

export type DbProperty = {
  id: string;
  name: string;
  type: 'Hotel' | 'Shortlet' | 'Event Center';
  location: string;
  area: string;
  description: string | null;
  price_per_night: number;
  service_fee: number;
  rating: number;
  review_count: number;
  images: string[];
  amenities: string[];
  house_rules: string[];
  min_stay: number;
  cancellation_fee_percent: number;
  weekend_enabled: boolean;
  weekend_rate: number | null;
  verified: boolean;
  active: boolean;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DbProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  status: 'active' | 'suspended';
  suspension_reason: string | null;
  suspended_at: string | null;
  updated_at: string;
};

export type DbBooking = {
  id: string;
  user_id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  nightly_rate: number;
  service_fee: number;
  total: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_method: string | null;
  payment_ref: string | null;
  paystack_ref: string | null;
  cancellation_fee: number;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  properties?: Partial<DbProperty>;
  profiles?: Pick<DbProfile, 'full_name' | 'email' | 'phone'> | null;
};

export type DbBlockedDate = {
  id: string;
  property_id: string;
  date: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
};

export type DbSpecialRate = {
  id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  rate: number;
  reason: string | null;
  created_at: string;
};

// ============================================
// PROPERTIES (admin sees inactive ones too)
// ============================================
export async function getAllProperties(): Promise<DbProperty[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getPropertyById(id: string): Promise<DbProperty> {
  const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createProperty(property: {
  name: string;
  type: 'Hotel' | 'Shortlet' | 'Event Center';
  location: string;
  area: string;
  description?: string;
  price_per_night: number;
  service_fee?: number;
  amenities?: string[];
  house_rules?: string[];
  min_stay?: number;
  cancellation_fee_percent?: number;
  images?: string[];
}) {
  const { data, error } = await supabase
    .from('properties')
    .insert({ ...property, active: true, verified: false })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProperty(id: string, updates: Partial<DbProperty>) {
  const { data, error } = await supabase
    .from('properties')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setPropertyActive(id: string, active: boolean) {
  return updateProperty(id, { active });
}

export function subscribeToAllProperties(callback: (properties: DbProperty[]) => void) {
  return supabase
    .channel('admin:properties')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, async () => {
      callback(await getAllProperties());
    })
    .subscribe();
}

// ============================================
// PRICING (price_per_night/service_fee/min_stay/cancellation_fee_percent
// live on properties; weekend + special dates are the additive migration)
// ============================================
export async function updatePricing(
  propertyId: string,
  pricing: {
    price_per_night: number;
    weekend_enabled: boolean;
    weekend_rate: number | null;
    min_stay: number;
    cancellation_fee_percent: number;
  }
) {
  return updateProperty(propertyId, pricing);
}

export async function getSpecialRates(propertyId: string) {
  const { data, error } = await supabase
    .from('special_rates')
    .select('*')
    .eq('property_id', propertyId)
    .order('start_date');
  if (error) throw error;
  return data || [];
}

export async function addSpecialRate(rate: {
  property_id: string;
  start_date: string;
  end_date: string;
  rate: number;
  reason?: string;
}) {
  const { data, error } = await supabase.from('special_rates').insert(rate).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSpecialRate(id: string) {
  const { error } = await supabase.from('special_rates').delete().eq('id', id);
  if (error) throw error;
}

// ============================================
// CALENDAR / BLOCKED DATES
// ============================================
export async function getBookingsForProperty(propertyId: string, monthStart: string, monthEnd: string): Promise<DbBooking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('property_id', propertyId)
    .in('status', ['pending', 'confirmed'])
    .lte('check_in', monthEnd)
    .gte('check_out', monthStart);
  if (error) throw error;
  return attachGuestProfiles(data || []);
}

export async function getBlockedDatesForProperty(propertyId: string, monthStart: string, monthEnd: string): Promise<DbBlockedDate[]> {
  const { data, error } = await supabase
    .from('blocked_dates')
    .select('*')
    .eq('property_id', propertyId)
    .gte('date', monthStart)
    .lte('date', monthEnd);
  if (error) throw error;
  return data || [];
}

export async function blockDates(propertyId: string, dates: string[], reason: string, notes?: string) {
  const rows = dates.map((date) => ({ property_id: propertyId, date, reason, notes }));
  // upsert, not insert — the admin can select a date that's already
  // blocked (e.g. updating the reason/notes on it), which would otherwise
  // hit the (property_id, date) unique constraint and throw a raw
  // Postgres error instead of just updating it.
  const { error } = await supabase.from('blocked_dates').upsert(rows, { onConflict: 'property_id,date' });
  if (error) throw error;
}

export async function unblockDate(propertyId: string, date: string) {
  const { error } = await supabase.from('blocked_dates').delete().eq('property_id', propertyId).eq('date', date);
  if (error) throw error;
}

export function subscribeToPropertyCalendar(propertyId: string, callback: () => void) {
  return supabase
    .channel(`admin:calendar:${propertyId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `property_id=eq.${propertyId}` }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_dates', filter: `property_id=eq.${propertyId}` }, callback)
    .subscribe();
}

// ============================================
// BOOKINGS (admin — all guests, all properties)
// ============================================
export async function getBookingsPage(opts: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ rows: DbBooking[]; total: number }> {
  const { page, pageSize, search } = opts;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const query = supabase
    .from('bookings')
    .select('*, properties(name, location, type)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  let rows = await attachGuestProfiles(data || []);

  // Guest-name search has to happen after the manual profile join, so it
  // can't be pushed down into the Supabase query — filtering client-side
  // on just this page's rows. Good enough at this data volume; would need
  // a real search index or a Postgres function for guest name search at
  // larger scale.
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter((r) => (r.profiles?.full_name ?? '').toLowerCase().includes(q));
  }

  return { rows, total: count ?? 0 };
}

export type ReviewRow = {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  user_id: string;
  property_id: string;
  properties?: { name: string };
  profiles?: Pick<DbProfile, 'full_name' | 'email' | 'phone'> | null;
};

export async function getRecentReviews(limit = 5): Promise<ReviewRow[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, properties(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return attachGuestProfiles(data || []);
}

export async function getAllBookings(): Promise<DbBooking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, properties(name, location, type)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return attachGuestProfiles(data || []);
}

export async function getBookingById(id: string): Promise<DbBooking> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, properties(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  const [withProfile] = await attachGuestProfiles([data]);
  return withProfile;
}

export async function adminCancelBooking(bookingId: string, cancellationFee: number): Promise<DbBooking> {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', cancellation_fee: cancellationFee, cancelled_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export type BookingNote = {
  id: string;
  booking_id: string;
  note: string;
  created_by_name: string | null;
  created_at: string;
};

export async function getBookingNotes(bookingId: string): Promise<BookingNote[]> {
  const { data, error } = await supabase
    .from('booking_notes')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addBookingNote(bookingId: string, note: string): Promise<BookingNote> {
  const { data: { user } } = await supabase.auth.getUser();
  let adminName: string | null = null;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    adminName = profile?.full_name ?? null;
  }

  const { data, error } = await supabase
    .from('booking_notes')
    .insert({ booking_id: bookingId, note, created_by: user?.id, created_by_name: adminName })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToAllBookings(callback: (bookings: DbBooking[]) => void) {
  return supabase
    .channel('admin:bookings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, async () => {
      callback(await getAllBookings());
    })
    .subscribe();
}

// ============================================
// TRANSACTIONS — derived from bookings, no separate ledger table.
// confirmed/completed bookings = payments. cancelled bookings = refunds.
// ============================================
export async function getTransactions(): Promise<DbBooking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, properties(name)')
    .in('status', ['confirmed', 'completed', 'cancelled'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return attachGuestProfiles(data || []);
}

/**
 * Refund a booking. Calls Paystack's refund API server-side via
 * /api/refund (never expose the secret key to the browser), then
 * marks the booking cancelled with the actual fee charged.
 */
export async function processRefund(params: {
  bookingId: string;
  paystackRef: string;
  refundAmount: number;
  reason: string;
}): Promise<{ success: boolean; message?: string }> {
  const res = await fetch('/api/refund', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Refund request failed.');
  return json;
}

// ============================================
// USERS (guests) — profiles table, joined to booking counts/spend
// ============================================
export type GuestRow = DbProfile & { bookingCount: number; totalSpent: number };

export async function getAllGuests(): Promise<GuestRow[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'guest')
    .order('updated_at', { ascending: false });
  if (error) throw error;

  const { data: bookings } = await supabase.from('bookings').select('user_id, total, status');

  return (profiles || []).map((p: DbProfile) => {
    const userBookings = (bookings || []).filter((b) => b.user_id === p.id);
    return {
      ...p,
      bookingCount: userBookings.length,
      totalSpent: userBookings
        .filter((b) => b.status === 'completed' || b.status === 'confirmed')
        .reduce((sum, b) => sum + Number(b.total), 0),
    };
  });
}

export async function getGuestProfile(id: string): Promise<DbProfile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getGuestBookings(userId: string): Promise<DbBooking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, properties(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function suspendGuest(id: string, reason: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'suspended', suspension_reason: reason, suspended_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function reactivateGuest(id: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'active', suspension_reason: null, suspended_at: null })
    .eq('id', id);
  if (error) throw error;
}

export function subscribeToGuests(callback: (guests: GuestRow[]) => void) {
  return supabase
    .channel('admin:guests')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
      callback(await getAllGuests());
    })
    .subscribe();
}