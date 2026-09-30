-- seed demo data: two approvers, five employees, and reports in every status
/** @env development */

-- The seeded times are the team's local times, in San Francisco.
set local time zone 'America/Los_Angeles';

-- Draws a till receipt as an svg, so every seeded expense has an image to
-- review. Dropped at the end of this file; the app never calls it.
create function seedReceiptSvg(merchant text, spentOn date, amountCents integer, item text)
returns bytea
language plpgsql
as $$
declare
  subtotal integer := round(amountCents / 1.0875);
  tax integer := amountCents - subtotal;
  safeMerchant text := replace(replace(replace(upper(merchant), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
  safeItem text := replace(replace(replace(item, '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
  bars text := '';
  x integer := 60;
  w integer;
  svg text;
begin
  -- A barcode seeded from the amount, so each receipt looks distinct.
  while x < 260 loop
    w := 1 + ((amountCents + x * 7) % 4);
    bars := bars || format('<rect x="%s" y="438" width="%s" height="34"/>', x, w);
    x := x + w + 2 + ((amountCents + x) % 3);
  end loop;

  svg := format($svg$<svg xmlns="http://www.w3.org/2000/svg" width="320" height="520">
<rect width="320" height="520" fill="#e9e6df"/>
<path d="M16 12 H304 V500 l-12 8 l-12 -8 l-12 8 l-12 -8 l-12 8 l-12 -8 l-12 8 l-12 -8 l-12 8 l-12 -8 l-12 8 l-12 -8 l-12 8 l-12 -8 l-12 8 l-12 -8 l-12 8 l-12 -8 l-12 8 l-12 -8 l-12 8 l-12 -8 l-12 8 l-12 -8 l-12 8 Z" fill="#fffdf8" stroke="#d8d2c4"/>
<g font-family="ui-monospace, Menlo, Consolas, monospace" fill="#2b2a28">
<text x="160" y="62" font-size="20" font-weight="700" text-anchor="middle">%s</text>
<text x="160" y="86" font-size="11" text-anchor="middle" fill="#6b675f">RECEIPT  #%s</text>
<text x="160" y="104" font-size="11" text-anchor="middle" fill="#6b675f">%s</text>
<line x1="36" y1="128" x2="284" y2="128" stroke="#9c978b" stroke-dasharray="4 4"/>
<text x="36" y="160" font-size="13">%s</text>
<text x="284" y="160" font-size="13" text-anchor="end">%s</text>
<text x="36" y="186" font-size="13" fill="#6b675f">QTY 1</text>
<line x1="36" y1="220" x2="284" y2="220" stroke="#9c978b" stroke-dasharray="4 4"/>
<text x="36" y="250" font-size="13">SUBTOTAL</text>
<text x="284" y="250" font-size="13" text-anchor="end">%s</text>
<text x="36" y="274" font-size="13">TAX</text>
<text x="284" y="274" font-size="13" text-anchor="end">%s</text>
<text x="36" y="316" font-size="17" font-weight="700">TOTAL</text>
<text x="284" y="316" font-size="17" font-weight="700" text-anchor="end">$%s</text>
<line x1="36" y1="340" x2="284" y2="340" stroke="#9c978b" stroke-dasharray="4 4"/>
<text x="36" y="370" font-size="12" fill="#6b675f">CARD  **** %s</text>
<text x="36" y="392" font-size="12" fill="#6b675f">APPROVED  AUTH %s</text>
<text x="160" y="424" font-size="11" text-anchor="middle" fill="#6b675f">THANK YOU</text>
<g fill="#2b2a28">%s</g>
</g>
</svg>$svg$,
    safeMerchant,
    lpad(((amountCents * 37) % 99991)::text, 5, '0'),
    to_char(spentOn + make_interval(mins => 480 + (amountCents % 660)), 'Mon DD, YYYY  HH12:MI AM'),
    upper(safeItem),
    to_char(subtotal / 100.0, 'FM999,990.00'),
    to_char(subtotal / 100.0, 'FM999,990.00'),
    to_char(tax / 100.0, 'FM999,990.00'),
    to_char(amountCents / 100.0, 'FM999,990.00'),
    lpad(((amountCents * 13) % 9973)::text, 4, '0'),
    lpad(((amountCents * 7) % 999983)::text, 6, '0'),
    bars
  );

  return convert_to(svg, 'UTF8');
end;
$$;

create function seedExpense(
  email text,
  reportTitle text,
  spentOn date,
  merchant text,
  amountCents integer,
  category expenseCategory,
  item text,
  note text
) returns void
language plpgsql
as $$
declare
  ownerId uuid;
  reportRef uuid;
  receiptRef uuid;
begin
  select id into ownerId from users u where u.email = seedExpense.email;

  if reportTitle is not null then
    select id into reportRef from reports r where r.userId = ownerId and r.title = reportTitle;
  end if;

  insert into receipts (userId, name, contentType, size, data)
       values (ownerId,
               lower(regexp_replace(merchant, '[^a-zA-Z0-9]+', '-', 'g')) || '-receipt.svg',
               'image/svg+xml',
               octet_length(seedReceiptSvg(merchant, spentOn, amountCents, item)),
               seedReceiptSvg(merchant, spentOn, amountCents, item))
    returning id into receiptRef;

  insert into expenses (userId, reportId, receiptId, spentOn, merchant, amountCents, category, note, createdAt)
       values (ownerId, reportRef, receiptRef, spentOn, merchant, amountCents, category, note, spentOn::timestamptz + interval '18 hours');
end;
$$;

create function seedReport(
  email text,
  title text,
  status reportStatus,
  createdOn timestamptz,
  submittedAt timestamptz,
  decidedAt timestamptz,
  decider text,
  comment text
) returns void
language plpgsql
as $$
declare
  ownerId uuid;
  deciderId uuid;
  reportRef uuid;
begin
  select id into ownerId from users u where u.email = seedReport.email;
  select id into deciderId from users u where u.email = decider;

  insert into reports (userId, title, status, submittedAt, decidedAt, decidedBy, createdAt)
       values (ownerId, title, status, submittedAt, decidedAt, deciderId, createdOn)
    returning id into reportRef;

  if submittedAt is not null then
    insert into reportEvents (reportId, userId, kind, comment, createdAt)
         values (reportRef, ownerId, 'submitted', '', submittedAt);
  end if;

  if decidedAt is not null then
    insert into reportEvents (reportId, userId, kind, comment, createdAt)
         values (reportRef, deciderId, case when status = 'approved' then 'approved'::reportEventKind else 'returned'::reportEventKind end, comment, decidedAt);
  end if;
end;
$$;

-- Every seeded account signs in with the password "receipts".
insert into users (email, name, role, passwordHash)
select email, name, role::userRole, crypt('receipts', genSalt('bf', 12))
  from (values
    ('maya@slipjar.test',  'Maya Chen',     'approver'),
    ('omar@slipjar.test',  'Omar Haddad',   'approver'),
    ('priya@slipjar.test', 'Priya Patel',   'employee'),
    ('jonas@slipjar.test', 'Jonas Berg',    'employee'),
    ('lena@slipjar.test',  'Lena Okafor',   'employee'),
    ('sam@slipjar.test',   'Sam Rivera',    'employee'),
    ('theo@slipjar.test',  'Theo Nakamura', 'employee')
  ) as seed (email, name, role);

select seedReport('jonas@slipjar.test', 'Design tooling, Q3', 'approved',
  '2026-07-03 10:00', '2026-07-03 10:20', '2026-07-06 09:15', 'omar@slipjar.test',
  'Approved. Thanks for consolidating the seats.');
select seedExpense('jonas@slipjar.test', 'Design tooling, Q3', '2026-07-01', 'Frameline', 4500, 'software', 'Professional seat', 'Monthly seat for the design team');
select seedExpense('jonas@slipjar.test', 'Design tooling, Q3', '2026-07-02', 'Pixelhouse', 5999, 'software', 'Creative suite', 'Illustration and photo apps');

select seedReport('priya@slipjar.test', 'Berlin client visit', 'approved',
  '2026-08-17 16:00', '2026-08-17 16:30', '2026-08-19 11:02', 'maya@slipjar.test',
  '');
select seedExpense('priya@slipjar.test', 'Berlin client visit', '2026-08-11', 'Northstar Air', 48210, 'travel', 'Economy SFO-BER', 'Round trip for the Nordwind kickoff');
select seedExpense('priya@slipjar.test', 'Berlin client visit', '2026-08-14', 'Hotel Spreeblick', 61200, 'travel', '3 nights', '');
select seedExpense('priya@slipjar.test', 'Berlin client visit', '2026-08-12', 'Café Kranz', 3840, 'meals', 'Lunch x2', 'Lunch with the Nordwind PM');
select seedExpense('priya@slipjar.test', 'Berlin client visit', '2026-08-14', 'Berlin Taxi', 2650, 'travel', 'Ride to BER', '');

select seedReport('theo@slipjar.test', 'Offsite snacks', 'approved',
  '2026-08-22 12:00', '2026-08-22 12:10', '2026-08-23 08:40', 'omar@slipjar.test',
  'Looks good.');
select seedExpense('theo@slipjar.test', 'Offsite snacks', '2026-08-21', 'Greenleaf Market', 8732, 'meals', 'Groceries', 'Snacks for the engineering offsite');
select seedExpense('theo@slipjar.test', 'Offsite snacks', '2026-08-21', 'Deskline Supply', 2415, 'supplies', 'Sticky notes, markers', 'Workshop supplies');

select seedReport('lena@slipjar.test', 'Customer dinner, Acme', 'approved',
  '2026-09-10 21:00', '2026-09-10 21:05', '2026-09-12 10:30', 'maya@slipjar.test',
  'Approved. Please note attendees on the next one.');
select seedExpense('lena@slipjar.test', 'Customer dinner, Acme', '2026-09-10', 'Harlow & Pine', 32480, 'meals', 'Dinner for 5', 'Acme renewal dinner, 3 guests');
select seedExpense('lena@slipjar.test', 'Customer dinner, Acme', '2026-09-10', 'City Cab', 2890, 'travel', 'Ride home', '');

select seedReport('jonas@slipjar.test', 'NYC conference', 'returned',
  '2026-09-18 09:00', '2026-09-18 09:30', '2026-09-21 14:12', 'maya@slipjar.test',
  'The hotel receipt covers two nights but the note says three. Please attach the folio for the third night, or correct the amount.');
select seedExpense('jonas@slipjar.test', 'NYC conference', '2026-09-14', 'Bluewing Air', 38900, 'travel', 'SFO-JFK round trip', 'DesignOps Summit NYC');
select seedExpense('jonas@slipjar.test', 'NYC conference', '2026-09-17', 'The Mercer Row', 89100, 'travel', '2 nights', 'Three nights at the conference hotel');
select seedExpense('jonas@slipjar.test', 'NYC conference', '2026-09-15', 'DesignOps Summit', 59900, 'other', 'Conference pass', '');

select seedReport('sam@slipjar.test', 'Laptop accessories', 'returned',
  '2026-09-19 11:00', '2026-09-19 11:15', '2026-09-22 16:45', 'omar@slipjar.test',
  'Please take the headphones off this one. The dock and the cable are reimbursable, personal audio is not.');
select seedExpense('sam@slipjar.test', 'Laptop accessories', '2026-09-18', 'Circuit Hall', 34900, 'supplies', 'Thunderbolt dock', '');
select seedExpense('sam@slipjar.test', 'Laptop accessories', '2026-09-18', 'Circuit Hall', 2900, 'supplies', 'USB-C cable 2m', '');
select seedExpense('sam@slipjar.test', 'Laptop accessories', '2026-09-18', 'Voltmart', 24999, 'supplies', 'Headphones', 'Noise cancelling for the open office');

select seedReport('maya@slipjar.test', 'Finance software renewals', 'approved',
  '2026-09-15 09:00', '2026-09-15 09:05', '2026-09-16 13:20', 'omar@slipjar.test',
  '');
select seedExpense('maya@slipjar.test', 'Finance software renewals', '2026-09-14', 'Ledgerly', 9000, 'software', 'Accounting, monthly', '');
select seedExpense('maya@slipjar.test', 'Finance software renewals', '2026-09-14', 'Paydock', 14200, 'software', 'Payroll, monthly', '');

select seedReport('priya@slipjar.test', 'September team lunch', 'submitted',
  '2026-09-26 13:30', '2026-09-26 14:00', null, null, '');
select seedExpense('priya@slipjar.test', 'September team lunch', '2026-09-26', 'Olive & Ash', 18450, 'meals', 'Lunch for 9', 'Team lunch for the Q3 launch');

select seedReport('omar@slipjar.test', 'Vendor visit, Portland', 'submitted',
  '2026-09-27 10:00', '2026-09-27 10:40', null, null, '');
select seedExpense('omar@slipjar.test', 'Vendor visit, Portland', '2026-09-23', 'Cascade Air', 24800, 'travel', 'SFO-PDX round trip', 'Packaging vendor site visit');
select seedExpense('omar@slipjar.test', 'Vendor visit, Portland', '2026-09-24', 'Hotel Lumen', 21900, 'travel', '1 night', '');
select seedExpense('omar@slipjar.test', 'Vendor visit, Portland', '2026-09-24', 'Night Market Kitchen', 6420, 'meals', 'Dinner x2', 'Dinner with the vendor lead');

select seedReport('lena@slipjar.test', 'Office supplies restock', 'submitted',
  '2026-09-28 15:00', '2026-09-28 15:20', null, null, '');
select seedExpense('lena@slipjar.test', 'Office supplies restock', '2026-09-28', 'Deskline Supply', 11860, 'supplies', 'Paper, toner', '');
select seedExpense('lena@slipjar.test', 'Office supplies restock', '2026-09-28', 'Parcelbox', 4599, 'supplies', 'Whiteboard markers', '');

select seedReport('sam@slipjar.test', 'Sales trip, Chicago', 'submitted',
  '2026-09-29 18:00', '2026-09-29 18:25', null, null, '');
select seedExpense('sam@slipjar.test', 'Sales trip, Chicago', '2026-09-24', 'Midway Air', 41200, 'travel', 'SFO-ORD round trip', 'Midwest pipeline week');
select seedExpense('sam@slipjar.test', 'Sales trip, Chicago', '2026-09-25', 'Lakeshore Hotel', 52800, 'travel', '2 nights', '');
select seedExpense('sam@slipjar.test', 'Sales trip, Chicago', '2026-09-26', 'The Copper Grill', 9870, 'meals', 'Dinner x3', 'Prospect dinner, Ridgeline');

select seedReport('theo@slipjar.test', 'Dev subscriptions', 'draft',
  '2026-09-25 17:00', null, null, null, '');
select seedExpense('theo@slipjar.test', 'Dev subscriptions', '2026-09-20', 'Codehaven', 2100, 'software', 'Team plan, monthly', '');
select seedExpense('theo@slipjar.test', 'Dev subscriptions', '2026-09-22', 'Toolsmith', 7790, 'software', 'IDE license', '');

select seedReport('maya@slipjar.test', 'Audit prep', 'draft',
  '2026-09-29 09:00', null, null, null, '');
select seedExpense('maya@slipjar.test', 'Audit prep', '2026-09-29', 'PrintWorks', 6240, 'supplies', 'Binding, printing', 'Printed binders for the auditors');

-- Expenses not yet on any report.
select seedExpense('priya@slipjar.test', null, '2026-09-29', 'Fog City Coffee', 1240, 'meals', 'Coffee x2', 'Coffee with a candidate');
select seedExpense('theo@slipjar.test', null, '2026-09-25', 'Voltmart', 3499, 'supplies', 'USB-C hub', '');
select seedExpense('jonas@slipjar.test', null, '2026-09-24', 'Bay Rail', 8900, 'travel', 'Round trip to Sacramento', 'Train to the Sacramento client');

drop function seedExpense(text, text, date, text, integer, expenseCategory, text, text);
drop function seedReport(text, text, reportStatus, timestamptz, timestamptz, timestamptz, text, text);
drop function seedReceiptSvg(text, date, integer, text);
