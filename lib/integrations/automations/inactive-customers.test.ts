import assert from "node:assert/strict";
import test from "node:test";
import { findInactiveCustomers } from "./inactive-customers";
import type { Booking, Customer } from "@/lib/types";

const today = new Date("2026-08-08T10:00:00Z");

function customer(overrides: Partial<Customer>): Pick<Customer, "id" | "first_name" | "phone" | "email"> {
  return { id: "c1", first_name: "Jean", phone: "+33600000000", email: null, ...overrides };
}

function booking(overrides: Partial<Booking>): Pick<Booking, "customer_id" | "date" | "status" | "service_name"> {
  return { customer_id: "c1", date: "2026-06-01", status: "confirmed", service_name: "Coupe", ...overrides };
}

test("flags a customer whose last confirmed visit exceeds the threshold", () => {
  const result = findInactiveCustomers(
    [customer({})],
    [booking({ date: "2026-06-01" })],
    { today, weeksThreshold: 8 }
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "c1");
  assert.ok(result[0].weeksSinceVisit >= 8);
});

test("ignores a customer below the threshold", () => {
  const result = findInactiveCustomers(
    [customer({})],
    [booking({ date: "2026-08-01" })],
    { today, weeksThreshold: 8 }
  );
  assert.equal(result.length, 0);
});

test("ignores a customer with an upcoming booking", () => {
  const result = findInactiveCustomers(
    [customer({})],
    [booking({ date: "2026-06-01" }), booking({ date: "2026-09-01", status: "pending" })],
    { today, weeksThreshold: 8 }
  );
  assert.equal(result.length, 0);
});

test("ignores a customer with no past confirmed booking", () => {
  const result = findInactiveCustomers([customer({})], [], { today, weeksThreshold: 8 });
  assert.equal(result.length, 0);
});

test("ignores cancelled/refused bookings for the last-visit computation", () => {
  const result = findInactiveCustomers(
    [customer({})],
    [booking({ date: "2026-08-01", status: "cancelled" })],
    { today, weeksThreshold: 8 }
  );
  assert.equal(result.length, 0);
});

test("sorts by longest absence first", () => {
  const result = findInactiveCustomers(
    [customer({ id: "c1" }), customer({ id: "c2" })],
    [booking({ customer_id: "c1", date: "2026-06-01" }), booking({ customer_id: "c2", date: "2026-05-01" })],
    { today, weeksThreshold: 8 }
  );
  assert.deepEqual(result.map((r) => r.id), ["c2", "c1"]);
});
