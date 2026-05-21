const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  PageOrientation, TableOfContents, SectionType, LevelFormat,
} = require("docx");
const fs = require("fs");

// ─── Palette: CM-2 Blue Orange (Tech Whitepaper) ───
const P = {
  bg: "FEFEFE",
  primary: "1284BA",
  accent: "FF862F",
  body: "1A2B40",
  secondary: "606070",
  surface: "EDF4F9",
  cover: {
    titleColor: "1284BA",
    subtitleColor: "606060",
    metaColor: "707070",
    footerColor: "A0A0A0",
  },
  table: {
    headerBg: "1284BA",
    headerText: "FFFFFF",
    accentLine: "1284BA",
    innerLine: "D8E4EC",
    surface: "EDF4F9",
  },
};

// ─── Constants ───
const PG_W = 11906;
const PG_H = 16838;
const PG_MARGIN = { top: 1440, bottom: 1440, left: 1701, right: 1417 };
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

// ─── Helpers ───
function txt(text, opts = {}) {
  return new TextRun({ text: text || "", font: { ascii: "Calibri", eastAsia: "Times New Roman" }, size: 21, color: P.body, ...opts });
}
function boldTxt(text, opts = {}) {
  return txt(text, { bold: true, ...opts });
}

function para(children, opts = {}) {
  return new Paragraph({ children: Array.isArray(children) ? children : [children], spacing: { line: 312, after: 120 }, ...opts });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text, font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 32, bold: true, color: P.primary })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text, font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 28, bold: true, color: P.primary })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100, line: 312 },
    children: [new TextRun({ text, font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 24, bold: true, color: P.primary })],
  });
}

function bodyPara(text) {
  return para([txt(text, { size: 22 })], { spacing: { line: 312, after: 120 } });
}

function bulletPara(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { line: 312, after: 80 },
    children: [txt(text, { size: 22 })],
  });
}

function emptyLine() {
  return new Paragraph({ spacing: { after: 60 }, children: [] });
}

// ─── Table builder ───
function makeTable(headers, rows, colWidths) {
  const t = P.table;
  const hBorders = {
    top: { style: BorderStyle.SINGLE, size: 2, color: t.accentLine },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: t.accentLine },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: t.innerLine },
    insideVertical: { style: BorderStyle.NONE },
  };

  const makeCell = (text, isHeader, rowIdx, colIdx) => {
    const width = colWidths ? colWidths[colIdx] : Math.floor(100 / headers.length);
    return new TableCell({
      children: [new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [isHeader ? boldTxt(text, { size: 20, color: t.headerText }) : txt(text, { size: 20 })],
      })],
      shading: isHeader
        ? { type: ShadingType.CLEAR, fill: t.headerBg }
        : (rowIdx % 2 === 0 ? { type: ShadingType.CLEAR, fill: t.surface } : undefined),
      margins: { top: 50, bottom: 50, left: 100, right: 100 },
      width: { size: width, type: WidthType.PERCENTAGE },
    });
  };

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((h, i) => makeCell(h, true, 0, i)),
  });

  const dataRows = rows.map((row, ri) =>
    new TableRow({
      cantSplit: true,
      children: row.map((cell, ci) => makeCell(cell, false, ri, ci)),
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: hBorders,
    rows: [headerRow, ...dataRows],
  });
}

// ─── Entity detail table builder (4-col: Field, Type, Constraints, Notes) ───
function makeEntityTable(fields) {
  // fields = [[field, type, constraints, notes], ...]
  const headers = ["Field", "Type", "Constraints", "Notes"];
  const colWidths = [22, 22, 28, 28];
  return makeTable(headers, fields, colWidths);
}

// ─── Cover Section ───
function buildCover() {
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: allNoBorders,
      rows: [new TableRow({
        height: { value: PG_H, rule: "exact" },
        children: [new TableCell({
          verticalAlign: "top",
          borders: allNoBorders,
          children: [
            new Paragraph({ spacing: { before: 4200 }, children: [] }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200, line: 900, lineRule: "atLeast" },
              children: [new TextRun({ text: "E-CHATCO", font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 72, bold: true, color: P.primary })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200, line: 600, lineRule: "atLeast" },
              children: [new TextRun({ text: "DATABASE ERD", font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 56, bold: true, color: P.accent })],
            }),
            new Paragraph({
              indent: { left: 3200, right: 3200 },
              border: { top: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 20 } },
              children: [],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 300, after: 120 },
              children: [new TextRun({ text: "Entity Relationship Diagram & Analysis Report", font: { ascii: "Calibri" }, size: 28, color: P.cover.subtitleColor })],
            }),
            new Paragraph({ spacing: { before: 2800 }, children: [] }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 80 },
              children: [new TextRun({ text: "Based on Repository Codebase Analysis", font: { ascii: "Calibri" }, size: 22, color: P.cover.metaColor })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 80 },
              children: [new TextRun({ text: "Version 1.0  |  2026", font: { ascii: "Calibri" }, size: 22, color: P.cover.metaColor })],
            }),
          ],
        })],
      })],
    }),
  ];
}

// ─── TOC Section ───
function buildTocSection() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 360 },
      children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, font: { ascii: "Times New Roman", eastAsia: "SimHei" } })],
    }),
    new TableOfContents("Table of Contents", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }),
    new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({
        text: "Note: This Table of Contents is generated via field codes. To ensure page number accuracy after editing, please right-click the TOC and select \"Update Field.\"",
        italics: true, size: 18, color: "888888",
      })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Section 1 ───
function buildSection1() {
  return [
    heading1("1. Current System Overview"),
    bodyPara("The Chatco (E-Chatco) system is a jeepney transit tracking and management platform built with Next.js 16 (frontend-only prototype). It serves three user roles: Admin, Commuter, and Conductor. The system manages fleet operations, fare collection, lost-and-found, remittance, SOS alerts, ride hailing, and rewards. The current codebase is entirely frontend with mock data in localStorage, preparing for a Laravel backend integration."),
    emptyLine(),
    heading2("1.1 Key System Decisions"),
    bulletPara("Wallet system is COMPLETELY REMOVED \u2014 no stored balance, no top-up, no internal e-wallet"),
    bulletPara("GCash QR payment is the ONLY digital payment method (direct external GCash transaction)"),
    bulletPara("Cash payments are also supported"),
    bulletPara("Voucher system exists (free rides from rewards)"),
    bulletPara("Hailing is restricted to 1KM radius \u2014 commuters can VIEW all units but can only HAIL within 1KM"),
    bulletPara("Three user roles: COMMUTER, ADMIN, CONDUCTOR"),
    bulletPara("Conductors have login credentials and use a scanner app"),
    bulletPara("Drivers do NOT have system accounts (managed by admin only)"),
  ];
}

// ─── Section 2 ───
function buildSection2() {
  const modules = [
    ["Authentication", "All", "Frontend-only (mock)", "auth-context.tsx, login route"],
    ["Admin Dashboard", "Admin", "Frontend-only (mock data)", "admin-dashboard/"],
    ["Analytics", "Admin", "Frontend-only (mock data)", "analytics/"],
    ["Fleet Monitoring", "Admin", "Frontend-only (mock data)", "monitoring/"],
    ["Vehicle Management", "Admin", "Frontend-only (mock data)", "vehicles/"],
    ["User Management", "Admin", "Frontend-only (mock data)", "users/"],
    ["Lost & Found", "Admin+Commuter", "Frontend-only (mock data)", "lost-found/, lost-and-found/"],
    ["Remittance Tracking", "Admin+Conductor", "Frontend-only (mock data)", "remittance/, remittance-history.ts"],
    ["Receipts", "Admin", "Frontend-only (mock data)", "receipts/"],
    ["Settings", "Admin", "Frontend-only (mock data)", "settings/"],
    ["Commuter Dashboard", "Commuter", "Frontend-only (mock data)", "commuter/dashboard/"],
    ["QR Payment", "Commuter+Conductor", "Frontend-only (mock)", "gcash-payment.ts, qr-transaction.ts"],
    ["Ride Hailing", "Commuter", "Frontend-only (mock)", "nearby-detector.ts"],
    ["SOS Alerts", "Commuter+Conductor", "Frontend-only (mock)", "sos-modal, sos-confirm-modal"],
    ["Share Ride", "Commuter", "Frontend-only (mock)", "share-ride-modal"],
    ["Lost & Found (Commuter)", "Commuter", "Frontend-only (mock data)", "lost-and-found/"],
    ["Feedback/Ratings", "Commuter", "Frontend-only (mock data)", "feedback/"],
    ["Rewards/Vouchers", "Commuter", "Frontend-only (mock data)", "rewards/"],
    ["Announcements", "Commuter", "Frontend-only (mock data)", "announcements/"],
    ["Profile Management", "Commuter", "Frontend-only (mock data)", "profile/"],
    ["Conductor Dashboard", "Conductor", "Frontend-only (mock data)", "conductor-dashboard/"],
    ["Unit Verification", "Conductor", "Frontend-only (mock data)", "unit-verification/"],
    ["Shift Management", "Conductor", "Frontend-only (localStorage)", "conductor-shift.ts"],
    ["Transaction Recording", "Conductor", "Frontend-only (localStorage)", "conductor-transactions.ts"],
    ["End-of-Day Report", "Conductor", "Frontend-only (localStorage)", "end-of-day/"],
    ["Fare Calculator", "Conductor", "Frontend-only (static data)", "fare-calculator.ts, fare-matrix-data.ts"],
    ["Metrics/Ratings View", "Conductor", "Frontend-only (mock data)", "metrics/"],
  ];

  return [
    heading1("2. Verified Implemented Modules"),
    para([txt("The following table lists all verified frontend modules and their implementation status.", { size: 22 })], { keepNext: true, spacing: { after: 120, line: 312 } }),
    makeTable(
      ["Module", "Role", "Implementation Status", "Frontend Source"],
      modules,
      [22, 16, 28, 34]
    ),
  ];
}

// ─── Section 3 ───
function buildSection3() {
  const comparisons = [
    ["user", "KEPT (renamed to users)", "Core entity, verified in auth-context"],
    ["commuter", "KEPT (renamed to commuter_profiles)", "1:1 with users, verified in types/user.ts"],
    ["conductor", "KEPT (renamed to conductor_profiles)", "1:1 with users, verified in CreateConductorAccountModal"],
    ["admin", "KEPT (renamed to admin_profiles)", "1:1 with users, verified in auth mock"],
    ["driver", "KEPT", "Verified in vehicles-data.ts, unit-verification/data.ts"],
    ["personnel_history", "KEPT (renamed to terminated_personnel)", "Verified in vehicles-data.ts"],
    ["vehicle", "KEPT (renamed to vehicles)", "Verified in vehicles-data.ts"],
    ["route", "KEPT", "Verified in settings-data.ts, fare-matrix-data.ts"],
    ["route_stop", "MODIFIED - merged into fare_points", "Fare matrix uses 33-34 barangay points with coordinates"],
    ["demand_zone", "KEPT", "Verified in monitoring page"],
    ["shift", "KEPT (renamed to shift_logs)", "Verified in types/shift.ts, conductor-shift.ts"],
    ["transaction", "KEPT", "Verified in types/transaction.ts, conductor-transactions.ts"],
    ["remittance", "KEPT", "Verified in types/shift.ts, remittance-history.ts"],
    ["remittance_option", "KEPT", "Verified in settings-data.ts"],
    ["top_up", "REMOVED", "Wallet system removed"],
    ["voucher", "KEPT", "Verified in rewards/types.ts, settings-data.ts"],
    ["reward_cycle", "KEPT", "Verified in rewards/use-rewards.ts"],
    ["fare_matrix", "KEPT (renamed to fare_points)", "Verified in fare-matrix-data.ts (34 point areas)"],
    ["discount_config", "MODIFIED - merged into financial_rules_config", "Single config row in settings"],
    ["wallet_config", "REMOVED", "Wallet system removed"],
    ["operations_config", "KEPT (renamed to operations_rules_config)", "Verified in settings-data.ts"],
    ["safety_config", "KEPT", "Verified in settings-data.ts"],
    ["app_config", "KEPT (renamed to app_configuration)", "Verified in settings-data.ts"],
    ["announcement", "KEPT", "Verified in types/announcement.ts"],
    ["announcement_read", "KEPT", "Commuter reads tracked per announcement"],
    ["faq", "KEPT", "Verified in settings-data.ts"],
    ["lost_item", "KEPT", "Verified in types/lost-found.ts, lost-found-data.ts"],
    ["lost_item_history", "KEPT (renamed to lost_item_events)", "Verified in lost-found-data.ts"],
    ["claim", "KEPT", "Verified in lost-found-data.ts, types/lost-found.ts"],
    ["watchlist", "KEPT", "Verified in use-lost-and-found.ts"],
    ["feedback", "KEPT (renamed to conductor_ratings)", "Verified in conductor-ratings.ts, feedback/types.ts"],
    ["sos_alert", "KEPT", "Verified in monitoring page"],
    ["hail_record", "KEPT", "Verified in nearby-detector.ts, use-dashboard.ts"],
    ["overspeed_log", "KEPT", "Verified in monitoring page"],
    ["share_ride_token", "KEPT", "Verified in share-ride-modal"],
    ["receipt", "NEW - split from transaction", "Admin receipt view in receipts-data.ts"],
    ["gcash_payment_intent", "NEW", "Verified in types/transaction.ts"],
    ["notification_template", "NEW", "Verified in settings-data.ts"],
    ["driver_rating", "NEW (merged into conductor_ratings)", "Verified in conductor-ratings.ts"],
    ["driver_message", "NEW", "Verified in vehicles-data.ts"],
  ];

  return [
    heading1("3. Repository vs Outdated ERD Comparison"),
    para([txt("The following table compares each table from the old ERD against the current codebase, showing whether it was KEPT, MODIFIED, or REMOVED.", { size: 22 })], { keepNext: true, spacing: { after: 120, line: 312 } }),
    makeTable(
      ["Old ERD Table", "Status", "Reason"],
      comparisons,
      [25, 35, 40]
    ),
  ];
}

// ─── Section 4 ───
function buildSection4() {
  return [
    heading1("4. Role-Based Flow Analysis"),

    heading2("4.1 Commuter Flow"),
    bulletPara("Register \u2192 Admin reviews \u2192 Approved/Rejected"),
    bulletPara("Login \u2192 View dashboard with nearby vehicles on map"),
    bulletPara("View all jeepney units on map (no distance restriction)"),
    bulletPara("Hail a unit (only within 1KM radius)"),
    bulletPara("Board jeepney \u2192 Conductor scans/processes fare"),
    bulletPara("Pay via GCash QR scan or Cash"),
    bulletPara("View payment history"),
    bulletPara("Submit feedback/ratings after ride"),
    bulletPara("Track rewards (every 10th cashless ride = free ride voucher)"),
    bulletPara("Report lost items"),
    bulletPara("Claim found items"),
    bulletPara("Share ride tracking link"),
    bulletPara("Trigger SOS in emergency"),

    heading2("4.2 Conductor Flow"),
    bulletPara("Login \u2192 Unit Verification (select unit + driver)"),
    bulletPara("Start shift \u2192 Active dashboard"),
    bulletPara("Process fares: select pickup/drop-off points, commuter type"),
    bulletPara("Accept payment: GCash QR or Cash"),
    bulletPara("Record transactions per shift"),
    bulletPara("View shift metrics"),
    bulletPara("End-of-day: Submit remittance (GCash total + Cash total)"),
    bulletPara("Trigger SOS if needed"),
    bulletPara("View shift history and ratings"),

    heading2("4.3 Admin Flow"),
    bulletPara("Login \u2192 Admin Dashboard (financial summary, alerts)"),
    bulletPara("Manage vehicles (add/edit/deactivate)"),
    bulletPara("Manage personnel (add drivers, create conductor accounts, terminate)"),
    bulletPara("Manage commuters (approve/reject registrations, view history)"),
    bulletPara("Monitor fleet (live tracking, overspeed alerts, SOS alerts)"),
    bulletPara("View analytics (payment usage, demand heatmap, remittance)"),
    bulletPara("Manage lost & found items"),
    bulletPara("View remittance records"),
    bulletPara("Configure settings (fares, financial rules, operations, safety, FAQs, routes, vouchers)"),
    bulletPara("Generate vouchers"),
  ];
}

// ─── Section 5 ───
function buildSection5() {
  return [
    heading1("5. Wallet Removal Impact Analysis"),

    heading2("5.1 Tables to REMOVE Entirely"),
    bulletPara("top_up \u2014 No wallet balance, no top-up functionality"),
    bulletPara("wallet_config \u2014 No wallet configuration needed"),
    bulletPara("commuter.balance field \u2014 Remove from commuter_profiles"),

    heading2("5.2 Tables to MODIFY"),
    bulletPara("transaction \u2014 Remove any wallet payment method; keep only GCash_Scanned, GCash_Direct, Cash, Voucher"),
    bulletPara("remittance \u2014 Remove cashless_prepaid field (was for wallet); keep cashlessBreakdown with gcashScanned + gcashDirect + voucher"),
    bulletPara("receipt \u2014 Payment methods should only be \"Gcash\" or \"Voucher\" (no wallet payment)"),

    heading2("5.3 Files Containing Dead Wallet Logic"),
    bodyPara("The following references from the old ERD are no longer applicable in the current codebase:"),
    bulletPara("Any wallet-related API endpoints"),
    bulletPara("Wallet ledger/history tables"),
    bulletPara("Internal e-wallet transfer logic"),

    heading2("5.4 Remaining Active Payment Logic"),
    bulletPara("GCash QR Payment: Conductor generates QR \u2192 Commuter scans \u2192 Direct GCash transaction"),
    bulletPara("Cash Payment: Conductor records manually"),
    bulletPara("Voucher Payment: Free ride voucher from rewards system"),
    bulletPara("Discount: 20% for STUDENT/SENIOR_CITIZEN/PWD commuter types"),
  ];
}

// ─── Section 6: Complete Verified Database ERD ───
function buildEntitySection(name, fields, relatedModules, relatedRoles, crud, frontendSource, apis) {
  const children = [
    heading2("TABLE: " + name),
    para([txt("Field Definitions:", { size: 22, bold: true, color: P.primary })], { keepNext: true, spacing: { after: 80, line: 312 } }),
    makeEntityTable(fields),
    emptyLine(),
    para([boldTxt("Related Modules: ", { size: 21 }), txt(relatedModules, { size: 21 })]),
    para([boldTxt("Related Roles: ", { size: 21 }), txt(relatedRoles, { size: 21 })]),
    para([boldTxt("CRUD: ", { size: 21 }), txt(crud, { size: 21 })]),
    para([boldTxt("Frontend Source: ", { size: 21 }), txt(frontendSource, { size: 21 })]),
    para([boldTxt("APIs: ", { size: 21 }), txt(apis, { size: 21 })]),
    emptyLine(),
  ];
  return children;
}

function buildSection6() {
  const entities = [
    {
      name: "users",
      fields: [
        ["id", "UUID", "PK", "Generated UUID"],
        ["email", "VARCHAR(255)", "UNIQUE, NOT NULL", "Login email"],
        ["password", "VARCHAR(255)", "NOT NULL", "Bcrypt hashed"],
        ["role", "VARCHAR(20)", "NOT NULL", "'COMMUTER', 'ADMIN', 'CONDUCTOR'"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["deleted_at", "TIMESTAMP", "NULLABLE", "Soft delete"],
      ],
      modules: "Auth, all role-specific modules",
      roles: "All",
      crud: "Create (registration), Read (auth), Update (profile), Delete (soft delete)",
      source: "auth-context.tsx, login route, signup form",
      apis: "POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me",
    },
    {
      name: "commuter_profiles",
      fields: [
        ["id", "UUID", "PK, FK \u2192 users.id", "1:1 with users"],
        ["first_name", "VARCHAR(100)", "NOT NULL", ""],
        ["middle_name", "VARCHAR(100)", "NULLABLE", ""],
        ["surname", "VARCHAR(100)", "NOT NULL", ""],
        ["birthdate", "DATE", "NOT NULL", ""],
        ["gender", "VARCHAR(20)", "NOT NULL", ""],
        ["email", "VARCHAR(255)", "NOT NULL", "Denormalized from users"],
        ["contact_number", "VARCHAR(20)", "NOT NULL", ""],
        ["commuter_type", "VARCHAR(20)", "NOT NULL", "'REGULAR', 'STUDENT', 'SENIOR_CITIZEN', 'PWD'"],
        ["applied_type", "VARCHAR(20)", "NULLABLE", "Discount type applied for"],
        ["username", "VARCHAR(50)", "UNIQUE, NOT NULL", "No spaces"],
        ["language_preference", "VARCHAR(20)", "NOT NULL", "'English', 'Filipino'"],
        ["account_status", "VARCHAR(30)", "NOT NULL", "'PENDING_VERIFICATION', 'ACTIVE', 'INACTIVE', 'DISCOUNT_REJECTED'"],
        ["id_image_url", "VARCHAR(500)", "NULLABLE", "Valid ID image path"],
        ["verified_at", "TIMESTAMP", "NULLABLE", "Set on admin approval"],
        ["rejection_reason", "VARCHAR(500)", "NULLABLE", "If registration rejected"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["deleted_at", "TIMESTAMP", "NULLABLE", "Soft delete"],
      ],
      modules: "Registration, Profile, Transactions, Rewards, Lost & Found",
      roles: "Commuter (owns), Admin (manages)",
      crud: "Create (registration), Read (profile), Update (edit profile), Delete (soft delete)",
      source: "profile/page.tsx, users/page.tsx, AddRegistrationModal, ReviewRequestModal",
      apis: "GET/PUT /api/commuter/profile, GET /api/admin/users, POST /api/admin/users/{id}/approve",
    },
    {
      name: "conductor_profiles",
      fields: [
        ["id", "UUID", "PK, FK \u2192 users.id", "1:1 with users"],
        ["first_name", "VARCHAR(100)", "NOT NULL", ""],
        ["middle_name", "VARCHAR(100)", "NULLABLE", ""],
        ["last_name", "VARCHAR(100)", "NOT NULL", ""],
        ["birthday", "DATE", "NOT NULL", ""],
        ["profile_picture_url", "VARCHAR(500)", "NULLABLE", ""],
        ["generated_username", "VARCHAR(50)", "UNIQUE, NOT NULL", "Auto: f.lastname format"],
        ["generated_password", "VARCHAR(255)", "NOT NULL", "Auto: firstname.MMDDYYYY, shown once"],
        ["route_id", "UUID", "FK \u2192 routes.id, NULLABLE", "Assigned route"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["deleted_at", "TIMESTAMP", "NULLABLE", "Soft delete"],
      ],
      modules: "Shift Management, Fare Processing, Remittance",
      roles: "Conductor (owns), Admin (creates/manages)",
      crud: "Create (admin creates), Read (profile), Update (admin edits), Delete (soft delete)",
      source: "CreateConductorAccountModal, conductor-settings",
      apis: "GET /api/conductor/profile, POST /api/admin/conductors",
    },
    {
      name: "admin_profiles",
      fields: [
        ["id", "UUID", "PK, FK \u2192 users.id", "1:1 with users"],
        ["first_name", "VARCHAR(100)", "NOT NULL", ""],
        ["middle_name", "VARCHAR(100)", "NULLABLE", ""],
        ["last_name", "VARCHAR(100)", "NOT NULL", ""],
        ["profile_picture_url", "VARCHAR(500)", "NULLABLE", ""],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["deleted_at", "TIMESTAMP", "NULLABLE", "Soft delete"],
      ],
      modules: "All admin modules",
      roles: "Admin",
      crud: "Create (system), Read (profile), Update (admin self)",
      source: "auth-context.tsx (mock)",
      apis: "GET /api/admin/profile",
    },
    {
      name: "drivers",
      fields: [
        ["id", "UUID", "PK", ""],
        ["first_name", "VARCHAR(100)", "NOT NULL", ""],
        ["middle_name", "VARCHAR(100)", "NULLABLE", ""],
        ["last_name", "VARCHAR(100)", "NOT NULL", ""],
        ["birthday", "DATE", "NOT NULL", ""],
        ["contact", "VARCHAR(20)", "NOT NULL", "Phone number"],
        ["license_number", "VARCHAR(50)", "NOT NULL", ""],
        ["license_expiry", "DATE", "NOT NULL", ""],
        ["hire_date", "DATE", "NOT NULL", ""],
        ["profile_picture_url", "VARCHAR(500)", "NULLABLE", ""],
        ["route_id", "UUID", "FK \u2192 routes.id, NULLABLE", "Assigned route"],
        ["status", "VARCHAR(20)", "NOT NULL DEFAULT 'available'", "'available', 'on-shift', 'terminated', 'resigned'"],
        ["vehicle_id", "UUID", "FK \u2192 vehicles.id, NULLABLE", "Currently assigned vehicle"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["deleted_at", "TIMESTAMP", "NULLABLE", "Soft delete"],
      ],
      modules: "Fleet Management, Shift, Vehicle Assignment",
      roles: "Admin (manages), Conductor (sees in shift)",
      crud: "Create (admin adds), Read (vehicle detail), Update (admin edits), Delete (terminate)",
      source: "vehicles/page.tsx, AddPersonnelModal, EditPersonnelModal, DriverList",
      apis: "GET/POST/PUT/DELETE /api/admin/drivers",
    },
    {
      name: "vehicles",
      fields: [
        ["id", "UUID", "PK", ""],
        ["unit_number", "VARCHAR(20)", "UNIQUE, NOT NULL", "Display identifier"],
        ["plate_number", "VARCHAR(20)", "UNIQUE, NOT NULL", "Official plate"],
        ["route_id", "UUID", "FK \u2192 routes.id, NULLABLE", "Assigned route"],
        ["driver_id", "UUID", "FK \u2192 drivers.id, NULLABLE", "Assigned driver"],
        ["conductor_id", "UUID", "FK \u2192 conductor_profiles.id, NULLABLE", "Assigned conductor"],
        ["status", "VARCHAR(30)", "NOT NULL DEFAULT 'Operating'", "'Operating', 'Under Maintenance', 'Out of Service'"],
        ["speed", "INTEGER", "DEFAULT 0", "Current speed km/h (real-time)"],
        ["capacity_status", "VARCHAR(20)", "DEFAULT 'Available'", "'Available', 'Full' (real-time)"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["deleted_at", "TIMESTAMP", "NULLABLE", "Soft delete"],
      ],
      modules: "Fleet, Shift, Tracking, Transactions, Lost & Found",
      roles: "Admin (manages), Conductor (assigned), Commuter (views on map)",
      crud: "Create (admin), Read (all roles), Update (admin), Delete (soft delete)",
      source: "vehicles/page.tsx, AddVehicleModal, EditVehicleModal, UnitList",
      apis: "GET/POST/PUT/DELETE /api/admin/vehicles, GET /api/vehicles/nearby",
    },
    {
      name: "routes",
      fields: [
        ["id", "UUID", "PK", ""],
        ["name", "VARCHAR(100)", "NOT NULL", "e.g. \"Malolos - Meycauayan - Calumpit\""],
        ["status", "VARCHAR(20)", "NOT NULL DEFAULT 'Active'", "'Active', 'Inactive'"],
        ["waypoints", "JSONB", "NULLABLE", "Route path coordinates"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Vehicles, Drivers, Fare Matrix, Shifts",
      roles: "Admin (configures)",
      crud: "Create (admin), Read (all), Update (admin), Delete (admin)",
      source: "settings/routes (placeholder page)",
      apis: "GET/POST/PUT/DELETE /api/admin/routes",
    },
    {
      name: "fare_points",
      fields: [
        ["id", "UUID", "PK", ""],
        ["route_id", "UUID", "FK \u2192 routes.id, NOT NULL", "Parent route"],
        ["point_number", "INTEGER", "NOT NULL", "Order along route (1-34)"],
        ["code", "VARCHAR(10)", "NOT NULL", "Short code e.g. \"CMLPT\", \"BSU\""],
        ["name", "VARCHAR(100)", "NOT NULL", "Barangay/stop name"],
        ["landmarks", "JSONB", "NULLABLE", "Array of landmark strings"],
        ["sub_stops", "JSONB", "NULLABLE", "Array of sub-stop names"],
        ["regular_fare", "DECIMAL(10,2)", "NOT NULL", "From origin terminal"],
        ["discounted_fare", "DECIMAL(10,2)", "NOT NULL", "Student/Senior/PWD"],
        ["latitude", "DECIMAL(10,7)", "NULLABLE", "GPS coordinate"],
        ["longitude", "DECIMAL(10,7)", "NULLABLE", "GPS coordinate"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Fare Calculator, Transactions",
      roles: "Admin (configures), Conductor (uses for fare calculation)",
      crud: "Create (admin), Read (conductor, commuter), Update (admin), Delete (admin)",
      source: "settings/fare-matrix, fare-calculator-modal",
      apis: "GET /api/fare-points, GET /api/fare-calculate",
    },
    {
      name: "shift_logs",
      fields: [
        ["shift_id", "VARCHAR(20)", "PK", "Format \"SHF-{base36_timestamp}\""],
        ["conductor_id", "UUID", "FK \u2192 conductor_profiles.id, NOT NULL", ""],
        ["conductor_name", "VARCHAR(100)", "NOT NULL", "Denormalized"],
        ["driver_id", "UUID", "FK \u2192 drivers.id, NOT NULL", ""],
        ["driver_name", "VARCHAR(100)", "NOT NULL", "Denormalized"],
        ["vehicle_id", "UUID", "FK \u2192 vehicles.id, NOT NULL", ""],
        ["unit_number", "VARCHAR(20)", "NOT NULL", "Denormalized"],
        ["plate_number", "VARCHAR(20)", "NOT NULL", "Denormalized"],
        ["route_id", "UUID", "FK \u2192 routes.id, NULLABLE", ""],
        ["route_name", "VARCHAR(100)", "NULLABLE", "Denormalized"],
        ["time_in", "TIMESTAMP", "NOT NULL", "Shift start"],
        ["time_out", "TIMESTAMP", "NULLABLE", "Shift end, NULL = active"],
        ["is_active", "BOOLEAN", "DEFAULT TRUE", ""],
        ["notes", "TEXT", "NULLABLE", ""],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["deleted_at", "TIMESTAMP", "NULLABLE", "Soft delete"],
      ],
      modules: "Transactions, Remittance, Ratings, End-of-Day",
      roles: "Conductor (owns), Admin (views)",
      crud: "Create (start shift), Read (history), Update (end shift), Delete (never)",
      source: "unit-verification, conductor-dashboard, end-of-day",
      apis: "POST /api/conductor/shifts/start, PUT /api/conductor/shifts/{id}/end",
    },
    {
      name: "transactions",
      fields: [
        ["transaction_id", "VARCHAR(30)", "PK", "Format \"TXN-{timestamp}\""],
        ["shift_id", "VARCHAR(20)", "FK \u2192 shift_logs.shift_id, NOT NULL", ""],
        ["payment_method", "VARCHAR(20)", "NOT NULL", "'GCash_Scanned', 'GCash_Direct', 'Cash', 'Voucher'"],
        ["final_amount", "DECIMAL(10,2)", "NOT NULL", "After discount"],
        ["passenger_id", "UUID", "FK \u2192 commuter_profiles.id, NULLABLE", "NULL for walk-in cash"],
        ["passenger_name", "VARCHAR(100)", "NULLABLE", "Denormalized"],
        ["passenger_role", "VARCHAR(20)", "NULLABLE", "CommuterType at time of ride"],
        ["pickup_stop_id", "UUID", "FK \u2192 fare_points.id, NOT NULL", ""],
        ["dropoff_stop_id", "UUID", "FK \u2192 fare_points.id, NOT NULL", ""],
        ["pickup_name", "VARCHAR(100)", "NOT NULL", "Denormalized"],
        ["dropoff_name", "VARCHAR(100)", "NOT NULL", "Denormalized"],
        ["distance", "DECIMAL(10,2)", "NOT NULL", "Barangays traveled"],
        ["base_fare", "DECIMAL(10,2)", "NOT NULL", ""],
        ["succeeding_km", "DECIMAL(10,2)", "NOT NULL", "Count beyond base"],
        ["discount_amount", "DECIMAL(10,2)", "DEFAULT 0", "0 for REGULAR"],
        ["conductor_name", "VARCHAR(100)", "NOT NULL", "Denormalized"],
        ["unit_number", "VARCHAR(20)", "NOT NULL", "Denormalized"],
        ["driver_name", "VARCHAR(100)", "NOT NULL", "Denormalized"],
        ["voucher_id", "UUID", "FK \u2192 vouchers.id, NULLABLE", "If paid with voucher"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Shift, Remittance, Receipts, Payment History",
      roles: "Conductor (creates), Commuter (views history), Admin (views receipts)",
      crud: "Create (conductor records), Read (all roles), Update (never), Delete (never)",
      source: "conductor-dashboard, payment-history-modal, receipts",
      apis: "POST /api/conductor/transactions, GET /api/conductor/transactions, GET /api/commuter/payments",
    },
    {
      name: "remittances",
      fields: [
        ["shift_id", "VARCHAR(20)", "PK, FK \u2192 shift_logs.shift_id", "1:1 with shift"],
        ["option_id", "UUID", "FK \u2192 remittance_options.id, NULLABLE", "Remittance method"],
        ["date", "DATE", "NOT NULL", ""],
        ["conductor_id", "UUID", "FK \u2192 conductor_profiles.id, NOT NULL", ""],
        ["conductor_name", "VARCHAR(100)", "NOT NULL", "Denormalized"],
        ["driver_id", "UUID", "FK \u2192 drivers.id, NOT NULL", ""],
        ["driver_name", "VARCHAR(100)", "NOT NULL", "Denormalized"],
        ["vehicle_id", "UUID", "FK \u2192 vehicles.id, NOT NULL", ""],
        ["unit_number", "VARCHAR(20)", "NOT NULL", "Denormalized"],
        ["total_passengers", "INTEGER", "NOT NULL", ""],
        ["gcash_scanned_total", "DECIMAL(10,2)", "DEFAULT 0", "GCash scanned payments"],
        ["gcash_direct_total", "DECIMAL(10,2)", "DEFAULT 0", "GCash direct payments"],
        ["voucher_total", "DECIMAL(10,2)", "DEFAULT 0", "Voucher payments"],
        ["total_cashless", "DECIMAL(10,2)", "DEFAULT 0", "Sum of gcash + voucher"],
        ["cash_declared", "DECIMAL(10,2)", "DEFAULT 0", "Cash conductor declares"],
        ["cash_total", "DECIMAL(10,2)", "DEFAULT 0", "System-tracked cash"],
        ["gcash_total", "DECIMAL(10,2)", "DEFAULT 0", "System-tracked GCash"],
        ["remittance_status", "VARCHAR(20)", "NOT NULL DEFAULT 'Pending'", "'Pending', 'Remitted'"],
        ["time_in", "TIMESTAMP", "NOT NULL", ""],
        ["time_out", "TIMESTAMP", "NULLABLE", ""],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Shift, End-of-Day, Admin Remittance View",
      roles: "Conductor (submits), Admin (reviews)",
      crud: "Create (conductor submits), Read (both roles), Update (status change), Delete (never)",
      source: "end-of-day, remittance/, ConfirmModal",
      apis: "POST /api/conductor/remittance, GET /api/admin/remittances",
    },
    {
      name: "gcash_payment_intents",
      fields: [
        ["id", "VARCHAR(30)", "PK", "Format \"PAY-{ts}-{random}\""],
        ["amount", "DECIMAL(10,2)", "NOT NULL", "PHP pesos"],
        ["amount_in_centavos", "BIGINT", "NOT NULL", "amount * 100"],
        ["currency", "VARCHAR(3)", "DEFAULT 'PHP'", ""],
        ["status", "VARCHAR(20)", "NOT NULL", "'pending', 'processing', 'paid', 'failed'"],
        ["payment_method", "VARCHAR(20)", "NOT NULL", "'GCash_Scanned', 'GCash_Direct'"],
        ["commuter_id", "UUID", "FK \u2192 commuter_profiles.id, NOT NULL", ""],
        ["commuter_name", "VARCHAR(100)", "NOT NULL", "Denormalized"],
        ["pickup_point", "INTEGER", "NOT NULL", "Fare point number"],
        ["dropoff_point", "INTEGER", "NOT NULL", "Fare point number"],
        ["vehicle_id", "UUID", "FK \u2192 vehicles.id, NULLABLE", ""],
        ["conductor_id", "UUID", "FK \u2192 conductor_profiles.id, NULLABLE", ""],
        ["shift_id", "VARCHAR(20)", "FK \u2192 shift_logs.shift_id, NULLABLE", ""],
        ["paymongo_payment_id", "VARCHAR(100)", "NULLABLE", "External PayMongo reference"],
        ["redirect_url", "VARCHAR(500)", "NULLABLE", "PayMongo redirect URL"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "QR Payment Flow, Transaction Recording",
      roles: "Commuter (pays), Conductor (receives)",
      crud: "Create (payment initiation), Read (status check), Update (status change), Delete (never)",
      source: "gcash-payment.ts, scan-modal",
      apis: "POST /api/payments/create, GET /api/payments/verify, POST /api/payments/webhook",
    },
    {
      name: "vouchers",
      fields: [
        ["id", "UUID", "PK", ""],
        ["code", "VARCHAR(20)", "UNIQUE, NOT NULL", "Format \"CHATCO-{type}-{6chars}\""],
        ["commuter_id", "UUID", "FK \u2192 commuter_profiles.id, NULLABLE", "Assigned commuter"],
        ["type", "VARCHAR(20)", "NOT NULL", "'FREE_RIDE', 'DISCOUNT'"],
        ["status", "VARCHAR(20)", "NOT NULL DEFAULT 'Active'", "'AVAILABLE', 'ACTIVE', 'USED', 'EXPIRED'"],
        ["amount", "DECIMAL(10,2)", "NULLABLE", "For DISCOUNT type"],
        ["expires_at", "TIMESTAMP", "NULLABLE", ""],
        ["ride_origin", "VARCHAR(100)", "NULLABLE", ""],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["deleted_at", "TIMESTAMP", "NULLABLE", "Soft delete"],
      ],
      modules: "Rewards, Transactions",
      roles: "Commuter (uses), Admin (generates)",
      crud: "Create (admin generates), Read (commuter views), Update (use/expire), Delete (soft delete)",
      source: "voucher-generator, rewards/page.tsx",
      apis: "GET /api/commuter/vouchers, POST /api/commuter/vouchers/{id}/redeem, POST /api/admin/vouchers/generate",
    },
    {
      name: "reward_cycles",
      fields: [
        ["commuter_id", "UUID", "PK, FK \u2192 commuter_profiles.id", ""],
        ["total_rides", "INTEGER", "DEFAULT 0", "Lifetime cashless rides"],
        ["current_cycle_rides", "INTEGER", "DEFAULT 0", "Rides in current cycle"],
        ["rides_needed", "INTEGER", "DEFAULT 10", "Rides for next free ride"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["deleted_at", "TIMESTAMP", "NULLABLE", "Soft delete"],
      ],
      modules: "Rewards, Transactions",
      roles: "Commuter (earns), Admin (configures rides_needed)",
      crud: "Create (on first ride), Read (rewards page), Update (after each cashless ride), Delete (soft delete)",
      source: "rewards/page.tsx",
      apis: "GET /api/commuter/rewards",
    },
    {
      name: "announcements",
      fields: [
        ["id", "UUID", "PK", ""],
        ["type", "VARCHAR(20)", "NOT NULL", "'SYSTEM', 'PROMO', 'MAINTENANCE', 'SAFETY'"],
        ["title", "VARCHAR(200)", "NOT NULL", ""],
        ["message", "TEXT", "NOT NULL", ""],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["deleted_at", "TIMESTAMP", "NULLABLE", "Soft delete"],
      ],
      modules: "Commuter Announcements, Admin Settings",
      roles: "Admin (creates), Commuter (reads)",
      crud: "Create (admin), Read (commuter), Update (admin), Delete (soft delete)",
      source: "announcements/use-announcements.ts",
      apis: "GET /api/announcements, POST /api/admin/announcements",
    },
    {
      name: "announcement_reads",
      fields: [
        ["commuter_id", "UUID", "PK, FK \u2192 commuter_profiles.id", ""],
        ["announcement_id", "UUID", "PK, FK \u2192 announcements.id", ""],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Announcements",
      roles: "Commuter",
      crud: "Create (on read), Read (filter), Delete (never)",
      source: "use-announcements.ts",
      apis: "POST /api/announcements/{id}/read, POST /api/announcements/read-all",
    },
    {
      name: "lost_items",
      fields: [
        ["id", "VARCHAR(20)", "PK", ""],
        ["item_name", "VARCHAR(200)", "NOT NULL", ""],
        ["description", "TEXT", "NULLABLE", ""],
        ["image_url", "VARCHAR(500)", "NULLABLE", ""],
        ["plate_number", "VARCHAR(20)", "NULLABLE", "Vehicle reference"],
        ["driver_name", "VARCHAR(100)", "NULLABLE", "Denormalized"],
        ["conductor_name", "VARCHAR(100)", "NULLABLE", "Denormalized"],
        ["vehicle_id", "UUID", "FK \u2192 vehicles.id, NULLABLE", ""],
        ["estimated_time_lost", "VARCHAR(100)", "NULLABLE", ""],
        ["category", "VARCHAR(20)", "NOT NULL", "'ACCESSORY', 'BAG', 'WALLET', 'GADGET', 'CLOTHING', 'DOCUMENT', 'OTHER'"],
        ["reported_by_id", "UUID", "FK \u2192 users.id, NOT NULL", "Can be admin or commuter"],
        ["reported_by_role", "VARCHAR(20)", "NOT NULL", "'ADMIN', 'COMMUTER'"],
        ["reporter_name", "VARCHAR(100)", "NOT NULL", "Denormalized"],
        ["status", "VARCHAR(20)", "NOT NULL DEFAULT 'Unmatched'", "'Unmatched', 'Claimed', 'Released', 'Returned', 'Rejected'"],
        ["claimed_by", "VARCHAR(100)", "NULLABLE", "Claimant name"],
        ["date_posted", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["deleted_at", "TIMESTAMP", "NULLABLE", "Soft delete"],
      ],
      modules: "Lost & Found (Admin + Commuter)",
      roles: "Admin (manages), Commuter (reports/claims)",
      crud: "Create (both roles), Read (both), Update (admin processes), Delete (soft delete)",
      source: "lost-found/, lost-and-found/, AddLostFoundModal",
      apis: "GET/POST /api/lost-items, POST /api/lost-items/{id}/claim",
    },
    {
      name: "claims",
      fields: [
        ["id", "UUID", "PK", ""],
        ["item_id", "VARCHAR(20)", "FK \u2192 lost_items.id, NOT NULL", ""],
        ["claimant_id", "UUID", "FK \u2192 commuter_profiles.id, NOT NULL", ""],
        ["claimant_name", "VARCHAR(100)", "NOT NULL", "Denormalized"],
        ["claimant_contact", "VARCHAR(20)", "NOT NULL", "Phone"],
        ["claimant_email", "VARCHAR(255)", "NULLABLE", ""],
        ["status", "VARCHAR(20)", "NOT NULL", "'Pending', 'Approved', 'Rejected', 'Released', 'Returned'"],
        ["proof", "TEXT", "NULLABLE", "Description of ownership proof"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["deleted_at", "TIMESTAMP", "NULLABLE", "Soft delete"],
      ],
      modules: "Lost & Found",
      roles: "Commuter (submits), Admin (processes)",
      crud: "Create (commuter), Read (both), Update (admin approves/rejects), Delete (soft delete)",
      source: "lost-and-found/page.tsx, ClaimsListModal",
      apis: "POST /api/lost-items/{id}/claim, PUT /api/admin/claims/{id}",
    },
    {
      name: "lost_item_events",
      fields: [
        ["id", "UUID", "PK", ""],
        ["item_id", "VARCHAR(20)", "FK \u2192 lost_items.id, NOT NULL", ""],
        ["action", "VARCHAR(50)", "NOT NULL", "'Reported', 'Claim Submitted', 'Claim Approved', etc."],
        ["details", "TEXT", "NULLABLE", ""],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Lost & Found History",
      roles: "Admin (views)",
      crud: "Create (on status change), Read (history), Update (never), Delete (never)",
      source: "HistoryModal",
      apis: "GET /api/admin/lost-items/{id}/events",
    },
    {
      name: "watchlist",
      fields: [
        ["commuter_id", "UUID", "PK, FK \u2192 commuter_profiles.id", ""],
        ["item_id", "VARCHAR(20)", "PK, FK \u2192 lost_items.id", ""],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Lost & Found (Commuter)",
      roles: "Commuter",
      crud: "Create (watch), Read (list), Delete (unwatch)",
      source: "lost-and-found/page.tsx",
      apis: "POST/DELETE /api/commuter/watchlist",
    },
    {
      name: "conductor_ratings",
      fields: [
        ["id", "UUID", "PK", ""],
        ["commuter_id", "UUID", "FK \u2192 commuter_profiles.id, NOT NULL", ""],
        ["commuter_name", "VARCHAR(100)", "NOT NULL", "Denormalized"],
        ["shift_id", "VARCHAR(20)", "FK \u2192 shift_logs.shift_id, NOT NULL", ""],
        ["target_role", "VARCHAR(20)", "NOT NULL", "'DRIVER', 'CONDUCTOR'"],
        ["target_id", "UUID", "NOT NULL", "FK to drivers.id or conductor_profiles.id"],
        ["score", "INTEGER", "NOT NULL, CHECK(1-5)", "Star rating"],
        ["tags", "JSONB", "NULLABLE", "Array of tag strings"],
        ["comment", "TEXT", "NULLABLE", "Hidden from target"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["deleted_at", "TIMESTAMP", "NULLABLE", "Soft delete"],
      ],
      modules: "Feedback, Metrics",
      roles: "Commuter (submits), Conductor (views aggregated), Admin (views)",
      crud: "Create (commuter submits), Read (metrics), Update (never), Delete (soft delete)",
      source: "feedback/page.tsx, metrics/page.tsx",
      apis: "POST /api/feedback, GET /api/conductor/ratings",
    },
    {
      name: "sos_alerts",
      fields: [
        ["id", "UUID", "PK", ""],
        ["reported_by_id", "UUID", "FK \u2192 users.id, NOT NULL", "Can be commuter or conductor"],
        ["reported_by_role", "VARCHAR(20)", "NOT NULL", "'COMMUTER', 'CONDUCTOR'"],
        ["vehicle_id", "UUID", "FK \u2192 vehicles.id, NULLABLE", ""],
        ["vehicle_plate", "VARCHAR(20)", "NULLABLE", "Denormalized"],
        ["message", "TEXT", "NULLABLE", ""],
        ["latitude", "DECIMAL(10,7)", "NULLABLE", "GPS location"],
        ["longitude", "DECIMAL(10,7)", "NULLABLE", "GPS location"],
        ["status", "VARCHAR(20)", "NOT NULL DEFAULT 'active'", "'active', 'resolved'"],
        ["triggered_at", "TIMESTAMP", "NOT NULL", ""],
        ["resolved_at", "TIMESTAMP", "NULLABLE", ""],
        ["resolved_by_id", "UUID", "FK \u2192 admin_profiles.id, NULLABLE", ""],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "SOS Modal, Monitoring",
      roles: "Commuter/Conductor (triggers), Admin (resolves)",
      crud: "Create (trigger), Read (admin monitoring), Update (resolve), Delete (never)",
      source: "sos-modal, sos-confirm-modal, monitoring/alert-feed",
      apis: "POST /api/sos, PUT /api/admin/sos/{id}/resolve",
    },
    {
      name: "hail_records",
      fields: [
        ["id", "UUID", "PK", ""],
        ["commuter_id", "UUID", "FK \u2192 commuter_profiles.id, NOT NULL", ""],
        ["vehicle_id", "UUID", "FK \u2192 vehicles.id, NOT NULL", ""],
        ["latitude", "DECIMAL(10,7)", "NOT NULL", "Commuter location"],
        ["longitude", "DECIMAL(10,7)", "NOT NULL", "Commuter location"],
        ["status", "VARCHAR(20)", "NOT NULL", "'pending', 'accepted', 'cancelled', 'expired'"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Hailing, Nearby Detection",
      roles: "Commuter (hails), Conductor (receives)",
      crud: "Create (hail), Read (conductor), Update (accept/cancel), Delete (never)",
      source: "use-dashboard.ts, nearby-detector.ts",
      apis: "POST /api/commuter/hail, DELETE /api/commuter/hail/{id}",
    },
    {
      name: "overspeed_logs",
      fields: [
        ["id", "UUID", "PK", ""],
        ["vehicle_id", "UUID", "FK \u2192 vehicles.id, NOT NULL", ""],
        ["driver_id", "UUID", "FK \u2192 drivers.id, NOT NULL", ""],
        ["driver_name", "VARCHAR(100)", "NOT NULL", "Denormalized"],
        ["speed", "INTEGER", "NOT NULL", "Recorded speed km/h"],
        ["zone", "VARCHAR(100)", "NULLABLE", "Location zone name"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Monitoring, Operations Rules",
      roles: "Admin (views), System (creates)",
      crud: "Create (system auto-logs), Read (admin monitoring), Update (never), Delete (never)",
      source: "monitoring page",
      apis: "GET /api/admin/monitoring/overspeed",
    },
    {
      name: "demand_zones",
      fields: [
        ["id", "UUID", "PK", ""],
        ["name", "VARCHAR(100)", "NOT NULL", "Zone name"],
        ["route_id", "UUID", "FK \u2192 routes.id, NULLABLE", ""],
        ["latitude", "DECIMAL(10,7)", "NOT NULL", "Center point"],
        ["longitude", "DECIMAL(10,7)", "NOT NULL", "Center point"],
        ["radius_meters", "INTEGER", "NOT NULL", "Zone radius"],
        ["commuter_count", "INTEGER", "DEFAULT 0", "Current count"],
        ["intensity", "VARCHAR(10)", "NOT NULL", "'LOW', 'MEDIUM', 'HIGH', 'Critical'"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Analytics Heatmap, Monitoring",
      roles: "Admin (views), System (updates)",
      crud: "Create (system), Read (admin analytics), Update (system), Delete (never)",
      source: "analytics/demand-heatmap-data, monitoring",
      apis: "GET /api/admin/analytics/demand",
    },
    {
      name: "share_ride_tokens",
      fields: [
        ["id", "UUID", "PK", ""],
        ["commuter_id", "UUID", "FK \u2192 commuter_profiles.id, NOT NULL", ""],
        ["token", "VARCHAR(50)", "UNIQUE, NOT NULL", "Format \"trk_{random}\""],
        ["expires_at", "TIMESTAMP", "NOT NULL", "30 min after creation"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Share Ride",
      roles: "Commuter (creates)",
      crud: "Create (share), Read (track), Update (never), Delete (expired cleanup)",
      source: "share-ride-modal",
      apis: "POST /api/commuter/share-ride, GET /api/track/{token}",
    },
    {
      name: "remittance_options",
      fields: [
        ["id", "UUID", "PK", ""],
        ["option_name", "VARCHAR(100)", "NOT NULL", "e.g. \"Bank Transfer\", \"GCash Send\""],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Remittance Settings",
      roles: "Admin (manages)",
      crud: "Create (admin), Read (conductor selects), Update (admin), Delete (admin)",
      source: "settings/remittance-options",
      apis: "GET/POST/PUT/DELETE /api/admin/remittance-options",
    },
    {
      name: "financial_rules_config",
      fields: [
        ["id", "UUID", "PK", "Single row config"],
        ["regular_discount", "DECIMAL(5,2)", "DEFAULT 0", "Percentage"],
        ["student_discount", "DECIMAL(5,2)", "DEFAULT 20", "Percentage"],
        ["senior_discount", "DECIMAL(5,2)", "DEFAULT 20", "Percentage"],
        ["pwd_discount", "DECIMAL(5,2)", "DEFAULT 20", "Percentage"],
        ["rides_for_free_reward", "INTEGER", "DEFAULT 10", "Cashless rides for free ride"],
        ["updated_by", "UUID", "FK \u2192 admin_profiles.id", ""],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Fare Calculator, Rewards",
      roles: "Admin (configures)",
      crud: "Create (system), Read (all), Update (admin)",
      source: "settings/financial-rules",
      apis: "GET/PUT /api/admin/config/financial-rules",
    },
    {
      name: "operations_rules_config",
      fields: [
        ["id", "UUID", "PK", "Single row config"],
        ["speed_limit_kmh", "INTEGER", "DEFAULT 60", ""],
        ["max_shift_hours", "INTEGER", "DEFAULT 12", ""],
        ["updated_by", "UUID", "FK \u2192 admin_profiles.id", ""],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Monitoring, Shift",
      roles: "Admin (configures)",
      crud: "Create (system), Read (all), Update (admin)",
      source: "settings/operations-rules",
      apis: "GET/PUT /api/admin/config/operations-rules",
    },
    {
      name: "safety_config",
      fields: [
        ["id", "UUID", "PK", "Single row config"],
        ["emergency_hotline", "VARCHAR(20)", "DEFAULT '911'", ""],
        ["admin_sos_email", "VARCHAR(255)", "NOT NULL", ""],
        ["sender_gmail", "VARCHAR(255)", "NOT NULL", "For sending notifications"],
        ["updated_by", "UUID", "FK \u2192 admin_profiles.id", ""],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "SOS, Notifications",
      roles: "Admin (configures)",
      crud: "Create (system), Read (system), Update (admin)",
      source: "settings/safety-notifications",
      apis: "GET/PUT /api/admin/config/safety",
    },
    {
      name: "app_configuration",
      fields: [
        ["id", "UUID", "PK", "Single row config"],
        ["maintenance_mode", "BOOLEAN", "DEFAULT FALSE", ""],
        ["require_id_upload", "BOOLEAN", "DEFAULT TRUE", ""],
        ["require_phone_verification", "BOOLEAN", "DEFAULT FALSE", ""],
        ["updated_by", "UUID", "FK \u2192 admin_profiles.id", ""],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Registration, App Access",
      roles: "Admin (configures)",
      crud: "Create (system), Read (all), Update (admin)",
      source: "settings/app-configuration",
      apis: "GET/PUT /api/admin/config/app",
    },
    {
      name: "notification_templates",
      fields: [
        ["id", "UUID", "PK", ""],
        ["title", "VARCHAR(200)", "NOT NULL", "Template name"],
        ["description", "VARCHAR(500)", "NULLABLE", ""],
        ["content", "TEXT", "NOT NULL", "Template body with variables"],
        ["variables", "JSONB", "NULLABLE", "Available variable names"],
        ["type", "VARCHAR(30)", "NOT NULL", "'sos_admin', 'ride_receipt', 'account_approved', 'account_rejected'"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Safety Notifications, Email System",
      roles: "Admin (edits templates)",
      crud: "Create (system seed), Read (system), Update (admin), Delete (never)",
      source: "settings/safety-notifications",
      apis: "GET/PUT /api/admin/config/notification-templates",
    },
    {
      name: "faqs",
      fields: [
        ["id", "UUID", "PK", ""],
        ["question", "TEXT", "NOT NULL", ""],
        ["answer", "TEXT", "NOT NULL", ""],
        ["display_order", "INTEGER", "NOT NULL", ""],
        ["updated_by", "UUID", "FK \u2192 admin_profiles.id", ""],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["updated_at", "TIMESTAMP", "DEFAULT NOW()", ""],
        ["deleted_at", "TIMESTAMP", "NULLABLE", "Soft delete"],
      ],
      modules: "FAQ Display, FAQ Management",
      roles: "Admin (manages), Commuter (views)",
      crud: "Create (admin), Read (all), Update (admin), Delete (soft delete)",
      source: "settings/faq-management, FAQChatBubble",
      apis: "GET /api/faqs, POST/PUT/DELETE /api/admin/faqs",
    },
    {
      name: "user_history_logs",
      fields: [
        ["id", "UUID", "PK", ""],
        ["user_id", "UUID", "FK \u2192 users.id, NOT NULL", ""],
        ["action", "VARCHAR(50)", "NOT NULL", "'Account Created', 'Status Changed', etc."],
        ["details", "TEXT", "NULLABLE", ""],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "User Management",
      roles: "Admin (views)",
      crud: "Create (on user events), Read (admin), Update (never), Delete (never)",
      source: "users/page.tsx, UserHistoryModal",
      apis: "GET /api/admin/users/{id}/history",
    },
    {
      name: "terminated_personnel",
      fields: [
        ["id", "UUID", "PK", ""],
        ["user_id", "UUID", "FK \u2192 users.id, NULLABLE", "If was a conductor"],
        ["name", "VARCHAR(100)", "NOT NULL", "Full name"],
        ["role", "VARCHAR(20)", "NOT NULL", "'Driver', 'Conductor'"],
        ["contact", "VARCHAR(20)", "NULLABLE", ""],
        ["status", "VARCHAR(20)", "NOT NULL", "'Terminated', 'Resigned'"],
        ["reason", "TEXT", "NOT NULL", ""],
        ["terminated_date", "DATE", "NOT NULL", ""],
        ["vehicle_id", "UUID", "FK \u2192 vehicles.id, NULLABLE", "Last assigned vehicle"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Fleet Records",
      roles: "Admin (views)",
      crud: "Create (on termination), Read (admin), Update (never), Delete (never)",
      source: "vehicles/page.tsx, DeletePersonnelModal",
      apis: "GET /api/admin/personnel/terminated",
    },
    {
      name: "driver_messages",
      fields: [
        ["id", "UUID", "PK", ""],
        ["driver_id", "UUID", "FK \u2192 drivers.id, NOT NULL", ""],
        ["sender", "VARCHAR(20)", "NOT NULL", "'admin', 'commuter', 'system'"],
        ["sender_name", "VARCHAR(100)", "NOT NULL", ""],
        ["message", "TEXT", "NOT NULL", ""],
        ["type", "VARCHAR(20)", "NOT NULL", "'complaint', 'inquiry', 'feedback', 'reply', 'notice', 'warning'"],
        ["created_at", "TIMESTAMP", "DEFAULT NOW()", ""],
      ],
      modules: "Driver Detail, Communications",
      roles: "Admin (sends), Commuter (sends feedback as message)",
      crud: "Create (send), Read (driver detail), Update (never), Delete (never)",
      source: "vehicles/page.tsx, DriverDetailModal",
      apis: "GET/POST /api/admin/drivers/{id}/messages",
    },
  ];

  const children = [heading1("6. Complete Verified Database ERD")];
  children.push(bodyPara("This section lists every verified database table with full field definitions, constraints, relationships, and source references. A total of " + entities.length + " tables are documented below."));
  children.push(emptyLine());

  for (const e of entities) {
    children.push(...buildEntitySection(e.name, e.fields, e.modules, e.roles, e.crud, e.source, e.apis));
  }

  return children;
}

// ─── Section 7 ───
function buildSection7() {
  const relationships = [
    ["users", "1:1", "commuter_profiles", "commuter_profiles.id \u2192 users.id"],
    ["users", "1:1", "conductor_profiles", "conductor_profiles.id \u2192 users.id"],
    ["users", "1:1", "admin_profiles", "admin_profiles.id \u2192 users.id"],
    ["routes", "1:N", "fare_points", "fare_points.route_id \u2192 routes.id"],
    ["routes", "1:N", "vehicles", "vehicles.route_id \u2192 routes.id"],
    ["routes", "1:N", "drivers", "drivers.route_id \u2192 routes.id"],
    ["vehicles", "N:1", "drivers", "vehicles.driver_id \u2192 drivers.id"],
    ["vehicles", "N:1", "conductor_profiles", "vehicles.conductor_id \u2192 conductor_profiles.id"],
    ["vehicles", "1:N", "shift_logs", "shift_logs.vehicle_id \u2192 vehicles.id"],
    ["vehicles", "1:N", "transactions", "via shift_logs"],
    ["vehicles", "1:N", "lost_items", "lost_items.vehicle_id \u2192 vehicles.id"],
    ["vehicles", "1:N", "overspeed_logs", "overspeed_logs.vehicle_id \u2192 vehicles.id"],
    ["shift_logs", "1:N", "transactions", "transactions.shift_id \u2192 shift_logs.shift_id"],
    ["shift_logs", "1:1", "remittances", "remittances.shift_id \u2192 shift_logs.shift_id"],
    ["shift_logs", "1:N", "conductor_ratings", "conductor_ratings.shift_id \u2192 shift_logs.shift_id"],
    ["commuter_profiles", "1:N", "transactions", "transactions.passenger_id \u2192 commuter_profiles.id"],
    ["commuter_profiles", "1:N", "vouchers", "vouchers.commuter_id \u2192 commuter_profiles.id"],
    ["commuter_profiles", "1:1", "reward_cycles", "reward_cycles.commuter_id \u2192 commuter_profiles.id"],
    ["commuter_profiles", "1:N", "conductor_ratings", "conductor_ratings.commuter_id \u2192 commuter_profiles.id"],
    ["commuter_profiles", "1:N", "hail_records", "hail_records.commuter_id \u2192 commuter_profiles.id"],
    ["commuter_profiles", "1:N", "claims", "claims.claimant_id \u2192 commuter_profiles.id"],
    ["lost_items", "1:N", "claims", "claims.item_id \u2192 lost_items.id"],
    ["lost_items", "1:N", "lost_item_events", "lost_item_events.item_id \u2192 lost_items.id"],
    ["announcements", "1:N", "announcement_reads", "announcement_reads.announcement_id \u2192 announcements.id"],
  ];

  return [
    heading1("7. Relationship Explanations"),
    bodyPara("The following table documents all verified relationships between database entities, including the foreign key references."),
    emptyLine(),
    makeTable(
      ["Table A", "Cardinality", "Table B", "Foreign Key Reference"],
      relationships,
      [22, 12, 22, 44]
    ),
  ];
}

// ─── Section 8 ───
function buildSection8() {
  const mappings = [
    ["Login Form", "users", "\u2014"],
    ["Signup Form", "users, commuter_profiles", "users, commuter_profiles"],
    ["Admin Dashboard", "shift_logs, transactions, remittances, vehicles, lost_items, commuter_profiles", "\u2014"],
    ["Analytics", "transactions, remittances, fare_points, demand_zones", "\u2014"],
    ["Monitoring", "vehicles, overspeed_logs, sos_alerts, demand_zones", "sos_alerts (resolve)"],
    ["Vehicles Management", "vehicles, drivers, conductor_profiles, routes", "vehicles, drivers, terminated_personnel"],
    ["Users Management", "users, commuter_profiles", "commuter_profiles (approve/reject)"],
    ["Lost & Found (Admin)", "lost_items, claims, lost_item_events", "lost_items, claims, lost_item_events"],
    ["Remittance Tracker", "remittances, shift_logs, transactions", "\u2014"],
    ["Receipts", "transactions", "\u2014"],
    ["Settings - Fare Matrix", "fare_points, financial_rules_config", "fare_points"],
    ["Settings - Financial Rules", "financial_rules_config", "financial_rules_config"],
    ["Settings - Operations", "operations_rules_config", "operations_rules_config"],
    ["Settings - Safety", "safety_config, notification_templates", "safety_config, notification_templates"],
    ["Settings - App Config", "app_configuration", "app_configuration"],
    ["Settings - FAQ", "faqs", "faqs"],
    ["Settings - Routes", "routes", "routes"],
    ["Settings - Remittance Options", "remittance_options", "remittance_options"],
    ["Settings - Voucher Generator", "vouchers", "vouchers"],
    ["Commuter Dashboard", "vehicles, hail_records", "hail_records"],
    ["Scan/Payment Modal", "gcash_payment_intents, transactions", "gcash_payment_intents"],
    ["Payment History", "transactions", "\u2014"],
    ["SOS Modal", "sos_alerts", "sos_alerts"],
    ["Share Ride Modal", "share_ride_tokens", "share_ride_tokens"],
    ["Lost & Found (Commuter)", "lost_items, claims, watchlist", "claims, watchlist"],
    ["Feedback", "conductor_ratings", "conductor_ratings"],
    ["Rewards", "vouchers, reward_cycles", "vouchers (redeem)"],
    ["Announcements", "announcements, announcement_reads", "announcement_reads"],
    ["Profile", "commuter_profiles", "commuter_profiles"],
    ["Unit Verification", "vehicles, drivers, shift_logs", "shift_logs"],
    ["Conductor Dashboard", "shift_logs, transactions", "transactions"],
    ["End-of-Day", "shift_logs, transactions, remittances", "remittances, shift_logs"],
    ["Conductor Metrics", "conductor_ratings", "\u2014"],
    ["Conductor Settings", "conductor_profiles, shift_logs", "\u2014"],
  ];

  return [
    heading1("8. Frontend-to-Database Mapping"),
    bodyPara("The following table maps each frontend page or form to the database tables it reads from and writes to."),
    emptyLine(),
    makeTable(
      ["Frontend Page/Form", "Tables READ", "Tables WRITTEN"],
      mappings,
      [28, 40, 32]
    ),
  ];
}

// ─── Section 9 ───
function buildSection9() {
  return [
    heading1("9. Orphaned/Unused Structures"),

    heading2("9.1 From Old ERD \u2014 REMOVED (Wallet System)"),
    bulletPara("top_up table \u2014 No wallet, no top-up"),
    bulletPara("wallet_config table \u2014 No wallet configuration"),
    bulletPara("commuter.balance field \u2014 Removed from commuter_profiles"),

    heading2("9.2 From Old ERD \u2014 MODIFIED"),
    bulletPara("route_stop \u2192 Replaced by fare_points (contains coordinates, fares, landmarks)"),
    bulletPara("discount_config \u2192 Merged into financial_rules_config (single row)"),
    bulletPara("receipt \u2192 Now a VIEW over transactions (not a separate table)"),

    heading2("9.3 Potentially Unused in Current Codebase"),
    bulletPara("driver_messages \u2014 Only appears in admin vehicle detail, no dedicated page or API"),
    bulletPara("user_history_logs \u2014 Only appears in admin user management, minimal usage"),

    heading2("9.4 NOT VERIFIED IN CODEBASE"),
    bodyPara("None of the old ERD tables are completely without frontend reference. The personnel_history table from the old ERD maps to terminated_personnel in the codebase."),
  ];
}

// ─── Section 10 ───
function buildSection10() {
  return [
    heading1("10. Backend-Proofing Assessment"),

    heading2("10.1 Current State"),
    bulletPara("All data is mock/static in TypeScript files"),
    bulletPara("All state is in localStorage"),
    bulletPara("Only 1 API route exists: /api/auth/login"),
    bulletPara("No real database connection"),
    bulletPara("No real-time WebSocket/GPS tracking"),

    heading2("10.2 Critical Backend Requirements"),
    bodyPara("The following backend integrations are required for production deployment:"),
    bulletPara("Authentication: Laravel Sanctum with cookie-based sessions"),
    bulletPara("Real-time GPS Tracking: WebSocket/Firebase for vehicle locations"),
    bulletPara("Payment Integration: PayMongo SDK for GCash QR payments"),
    bulletPara("File Storage: S3/Supabase Storage for ID images, profile pictures, lost item images"),
    bulletPara("Email Service: For account approval/rejection notifications"),
    bulletPara("Push Notifications: For SOS alerts, announcements"),
    bulletPara("Geospatial Queries: PostGIS for nearby vehicle detection (1KM radius hailing)"),
    bulletPara("Offline Support: Queue system for conductor transactions when offline"),

    heading2("10.3 Data Integrity Concerns"),
    bodyPara("The following data integrity issues must be addressed during backend implementation:"),
    bulletPara("Name-based references should become ID-based foreign keys"),
    bulletPara("Denormalized fields need consistency enforcement (triggers or application-level)"),
    bulletPara("Soft deletes needed across most tables (deleted_at)"),
    bulletPara("Transaction atomicity for payment processing"),
    bulletPara("Concurrent shift management (one active shift per conductor)"),
    bulletPara("Voucher code uniqueness enforcement"),
    bulletPara("Announcement read tracking per user"),
  ];
}

// ─── Section 11 ───
function buildSection11() {
  const lines = [
    "E-CHATCO DATABASE ERD \u2014 TEXT REPRESENTATION",
    "",
    "\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557",
    "\u2551   ENTITY RELATIONSHIPS     \u2551",
    "\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D",
    "",
    "users \u2500\u2500\u2500\u252C\u2500 1:1 \u2500\u2500\u253E commuter_profiles",
    "     \u2502\u2500\u2500 1:1 \u2500\u2500\u253E conductor_profiles",
    "     \u2514\u2500\u2500 1:1 \u2500\u2500\u253E admin_profiles",
    "",
    "routes \u2500\u2500\u2500\u252C\u2500 1:N \u2500\u2500\u253E fare_points",
    "       \u251C\u2500 1:N \u2500\u2500\u253E vehicles",
    "       \u2514\u2500 1:N \u2500\u2500\u253E drivers",
    "",
    "vehicles \u2500\u2500\u2500\u252C\u2500 N:1 \u2500\u2500\u253E drivers",
    "         \u251C\u2500 N:1 \u2500\u2500\u253E conductor_profiles",
    "         \u251C\u2500 1:N \u2500\u2500\u253E shift_logs",
    "         \u251C\u2500 1:N \u2500\u2500\u253E lost_items",
    "         \u2514\u2500 1:N \u2500\u2500\u253E overspeed_logs",
    "",
    "shift_logs \u2500\u2500\u2500\u252C\u2500 1:N \u2500\u2500\u253E transactions",
    "           \u251C\u2500 1:1 \u2500\u2500\u253E remittances",
    "           \u2514\u2500 1:N \u2500\u2500\u253E conductor_ratings",
    "",
    "commuter_profiles \u2500\u2500\u2500\u252C\u2500 1:N \u2500\u2500\u253E transactions",
    "                   \u251C\u2500 1:N \u2500\u2500\u253E vouchers",
    "                   \u251C\u2500 1:1 \u2500\u2500\u253E reward_cycles",
    "                   \u251C\u2500 1:N \u2500\u2500\u253E conductor_ratings",
    "                   \u251C\u2500 1:N \u2500\u2500\u253E hail_records",
    "                   \u2514\u2500 1:N \u2500\u2500\u253E claims",
    "",
    "lost_items \u2500\u2500\u2500\u252C\u2500 1:N \u2500\u2500\u253E claims",
    "           \u2514\u2500 1:N \u2500\u2500\u253E lost_item_events",
    "",
    "announcements \u2500\u2500 1:N \u2500\u2500\u253E announcement_reads",
    "",
    "\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557",
    "\u2551     INDEPENDENT TABLES       \u2551",
    "\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D",
    "",
    "sos_alerts \u2500\u2500 (reported_by \u2192 users, vehicle \u2192 vehicles)",
    "gcash_payment_intents \u2500\u2500 (commuter \u2192 commuter_profiles, shift \u2192 shift_logs)",
    "demand_zones \u2500\u2500 (route \u2192 routes)",
    "share_ride_tokens \u2500\u2500 (commuter \u2192 commuter_profiles)",
    "remittance_options \u2500\u2500 (independent config)",
    "financial_rules_config \u2500\u2500 (single row config)",
    "operations_rules_config \u2500\u2500 (single row config)",
    "safety_config \u2500\u2500 (single row config)",
    "app_configuration \u2500\u2500 (single row config)",
    "notification_templates \u2500\u2500 (independent)",
    "faqs \u2500\u2500 (updated_by \u2192 admin_profiles)",
    "user_history_logs \u2500\u2500 (user \u2192 users)",
    "terminated_personnel \u2500\u2500 (user \u2192 users, vehicle \u2192 vehicles)",
    "driver_messages \u2500\u2500 (driver \u2192 drivers)",
    "watchlist \u2500\u2500 (commuter \u2192 commuter_profiles, item \u2192 lost_items)",
  ];

  const children = [
    heading1("11. Complete ERD Diagram (Text Representation)"),
    bodyPara("The following text-based diagram illustrates the complete entity relationship structure of the E-Chatco database."),
    emptyLine(),
  ];

  for (const line of lines) {
    children.push(new Paragraph({
      spacing: { after: 0, line: 280 },
      children: [new TextRun({ text: line, font: { ascii: "Consolas", eastAsia: "Consolas" }, size: 18, color: P.body })],
    }));
  }

  return children;
}

// ─── Main Document Assembly ───
async function main() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: { ascii: "Calibri", eastAsia: "Times New Roman" },
            size: 22,
            color: P.body,
          },
          paragraph: {
            spacing: { line: 312 },
          },
        },
        heading1: {
          run: { font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 32, bold: true, color: P.primary },
          paragraph: { spacing: { before: 360, after: 160, line: 312 } },
        },
        heading2: {
          run: { font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 28, bold: true, color: P.primary },
          paragraph: { spacing: { before: 240, after: 120, line: 312 } },
        },
        heading3: {
          run: { font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 24, bold: true, color: P.primary },
          paragraph: { spacing: { before: 200, after: 100, line: 312 } },
        },
      },
    },
    sections: [
      // Section 1: Cover
      {
        properties: {
          page: {
            size: { width: PG_W, height: PG_H, orientation: PageOrientation.PORTRAIT },
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
          },
        },
        children: buildCover(),
      },
      // Section 2: Front matter (TOC)
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            size: { width: PG_W, height: PG_H, orientation: PageOrientation.PORTRAIT },
            margin: PG_MARGIN,
            pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
          },
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: P.secondary })],
            })],
          }),
        },
        children: buildTocSection(),
      },
      // Section 3: Body
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            size: { width: PG_W, height: PG_H, orientation: PageOrientation.PORTRAIT },
            margin: PG_MARGIN,
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: "E-Chatco Database ERD Analysis", size: 16, color: P.secondary, italics: true })],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: P.secondary })],
            })],
          }),
        },
        children: [
          ...buildSection1(),
          ...buildSection2(),
          ...buildSection3(),
          ...buildSection4(),
          ...buildSection5(),
          ...buildSection6(),
          ...buildSection7(),
          ...buildSection8(),
          ...buildSection9(),
          ...buildSection10(),
          ...buildSection11(),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = "/home/z/my-project/E-Chatco_ERD_Analysis.docx";
  fs.writeFileSync(outputPath, buffer);
  console.log("Document generated: " + outputPath);
  console.log("File size: " + (buffer.length / 1024).toFixed(1) + " KB");
}

main().catch(err => {
  console.error("Error generating document:", err);
  process.exit(1);
});
