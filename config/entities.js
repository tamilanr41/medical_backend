/**
 * Entity registry: form fields, table columns and report metadata for every
 * collection used by a menu screen (see config/menu.js).
 *
 * Field type: text | textarea | number | currency | date | time | select | email | password | readonly
 * Field opts: { required, options, placeholder, default }
 * Entity opts: { dateField, amountField, search[], columns[], badgeField, readOnly }
 *
 * The same definition drives the React Hook Form form, the Zod validation
 * on the API, the DataTable columns and the report exports.
 */

const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "LAB_TECHNICIAN",
  "PHARMACIST",
  "MRD_USER",
  "BILLING_USER",
  "INSURANCE_USER",
  "HR_USER",
  "PURCHASE_USER",
];

const DEPARTMENTS = [
  "General Medicine",
  "Pathology",
  "Radiology",
  "Cardiology",
  "Nephrology",
  "Orthopedics",
  "Pharmacy",
  "Nursing",
  "Administration",
  "Finance",
];

const f = (name, label, type, opts = {}) => ({ name, label, type, ...opts });
const e = (label, fields, opts = {}) => ({ label, fields, ...opts });

const YES_NO = ["Yes", "No"];
const ACTIVE = ["Active", "Inactive"];
const OPEN_STATUS = ["Open", "In Review", "Resolved"];
const SEX = ["Male", "Female", "Other"];
const USAGE_TYPE = ["Common", "OP", "IP"];
const APPLICABLE = ["OP", "IP", "Both"];

/** Standard code/name/description/status master definition. */
const m = (label, extra = []) =>
  e(
    label,
    [
      f("code", "Code", "text", { required: true }),
      f("name", "Name", "text", { required: true }),
      f("description", "Description", "textarea"),
      ...extra,
      f("status", "Status", "select", { options: ACTIVE }),
    ],
    { badgeField: "status", columns: ["code", "name", "description", "status"] }
  );

/** Compact lab/transaction form definition. */
const lf = (label, extra = []) =>
  e(
    label,
    [
      f("refNo", "Reference No", "text", { required: true }),
      f("uhid", "UHID", "text"),
      f("patientName", "Patient Name", "text"),
      f("date", "Date", "date", { required: true }),
      ...extra,
      f("status", "Status", "select", {
        options: ["Open", "In Progress", "Completed", "Cancelled"],
      }),
    ],
    { dateField: "date", badgeField: "status" }
  );

/** Compact read-only report definition. */
const lr = (label, extra = []) =>
  e(
    label,
    [
      f("reportName", "Report", "text"),
      f("fromDate", "From Date", "date"),
      f("toDate", "To Date", "date"),
      ...extra,
    ],
    { readOnly: true, dateField: "fromDate" }
  );

/** Build entity entries from terse `[key, label, extra?]` tuples. */
const set = (build, defs) =>
  Object.fromEntries(defs.map(([key, label, extra = []]) => [key, build(label, extra)]));
const masters = (defs) => set(m, defs);
const forms = (defs) => set(lf, defs);
const reports = (defs) => set(lr, defs);

export const ENTITIES = {
  /* ----------------------------- Out Patient -------------------------- */
  patients: e(
    "Patient Master",
    [
      f("uhid", "UHID", "text", { required: true }),
      f("salutation", "Salutation", "select", {
        options: ["Mr.", "Mrs.", "Ms.", "Master", "Baby", "Dr."],
      }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("gender", "Sex", "select", {
        required: true,
        options: ["Male", "Female", "Trans", "Other"],
      }),
      f("age", "Age", "number", { required: true }),
      f("dob", "Date of Birth", "date"),
      f("bloodGroup", "Blood Group", "select", {
        options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"],
      }),
      f("patientType", "Patient Type", "select", {
        options: ["General", "Corporate", "Insurance", "Staff", "Camp", "VIP"],
      }),
      f("mobile", "Mobile", "text", { required: true }),
      f("phone", "Phone", "text"),
      f("email", "Email", "email"),
      f("address", "Address", "textarea", { required: true }),
      f("city", "City", "text"),
      f("state", "State", "text"),
      f("pincode", "PIN Code", "text"),
      f("guardianName", "Father / Guardian", "text"),
      f("relation", "Relation", "select", {
        options: ["Father", "Mother", "Spouse", "Son", "Daughter", "Guardian", "Self", "Other"],
      }),
      f("idProof", "ID Proof / Aadhaar", "text"),
      f("occupation", "Occupation", "text"),
      f("maritalStatus", "Marital Status", "select", {
        options: ["Single", "Married", "Divorced", "Widowed", "Unknown"],
      }),
      f("status", "Status", "select", { options: ACTIVE }),
    ],
    {
      search: ["uhid", "patientName", "mobile", "phone"],
      badgeField: "status",
      columns: ["uhid", "patientName", "gender", "age", "mobile", "patientType", "status"],
    }
  ),
  op_registrations: e(
    "OP Registration",
    [
      f("opNo", "OP Number", "text", { required: true, default: "OP-2026-008922" }),
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("gender", "Sex", "select", { required: true, options: ["Male", "Female", "Trans", "Other"] }),
      f("age", "Age", "number", { required: true }),
      f("mobile", "Mobile", "text"),
      f("address", "Address", "textarea"),
      f("department", "Department", "select", { required: true, options: DEPARTMENTS }),
      f("doctor", "Doctor", "text", { required: true }),
      f("visitDate", "Visit Date", "date", { required: true }),
      f("tokenNo", "Token No", "number"),
      f("slotStart", "Slot Time", "time"),
      f("slotEnd", "Slot End", "time"),
      f("appointmentType", "Appointment Type", "select", { options: ["OP", "Scan"] }),
      f("purpose", "Purpose", "select", { options: ["General", "Health Checkup"] }),
      f("referredBy", "Referred By", "text"),
      f("college", "College / Camp", "text"),
      f("paymentMode", "Payment Mode", "select", {
        options: ["Cash", "Card", "UPI", "Wallet", "Insurance", "Credit", "Sponsor"],
      }),
      f("consultationFee", "Consultation Fee", "currency"),
      f("remarks", "Remarks", "textarea"),
      f("inTime", "In Time", "time"),
      f("status", "Status", "select", {
        options: ["Tentative", "Confirmed", "Arrived", "Checked-in", "Checked-out", "Cancelled"],
      }),
    ],
    { dateField: "visitDate", badgeField: "status", columns: ["opNo", "patientName", "department", "doctor", "visitDate"] }
  ),
  op_doctor_schedules: e(
    "Doctor Schedule",
    [
      f("doctor", "Doctor", "text", { required: true }),
      f("department", "Department", "select", { options: DEPARTMENTS }),
      f("sessionStart", "Session Start", "time", { required: true }),
      f("sessionEnd", "Session End", "time", { required: true }),
      f("slotMinutes", "Slot Minutes", "number", { required: true }),
      f("room", "Room / Cabin", "text"),
      f("days", "Days", "text", { placeholder: "Mon,Tue,Wed,Thu,Fri,Sat,Sun" }),
      f("status", "Status", "select", { options: ACTIVE }),
    ],
    { badgeField: "status", columns: ["doctor", "department", "sessionStart", "sessionEnd", "slotMinutes", "status"] }
  ),
  op_appointment_blocks: e(
    "Appointment Block",
    [
      f("doctor", "Doctor", "text", { required: true }),
      f("date", "Date", "date", { required: true }),
      f("startTime", "Start Time", "time", { required: true }),
      f("endTime", "End Time", "time", { required: true }),
      f("reason", "Reason", "text"),
    ],
    { dateField: "date", columns: ["doctor", "date", "startTime", "endTime", "reason"] }
  ),
  op_bills: e(
    "OP Billing",
    [
      f("billNo", "Bill Number", "text", { required: true, default: "BILL-2026-019284" }),
      f("opNo", "OP Number", "text"),
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("gender", "Sex", "select", { options: ["Male", "Female", "Trans", "Other"] }),
      f("age", "Age", "number"),
      f("patientType", "Patient Type", "select", {
        options: ["General", "Corporate", "Insurance", "Staff", "Camp", "VIP"],
      }),
      f("sponsorType", "Sponsor Type", "select", { options: ["Corporate", "Insurance"] }),
      f("sponsorName", "Sponsor", "text"),
      f("sponsorRef", "Sponsor Reference", "text"),
      f("creditLimit", "Credit Limit", "currency"),
      f("doctor", "Doctor", "text"),
      f("department", "Department", "select", { options: DEPARTMENTS }),
      f("billDate", "Bill Date", "date", { required: true }),
      f("grossAmount", "Gross Amount", "currency", { required: true }),
      f("discount", "Discount", "currency"),
      f("tax", "Tax", "currency"),
      f("serviceCharge", "Service Charge", "currency"),
      f("netAmount", "Net Amount", "currency", { required: true }),
      f("paidAmount", "Paid", "currency", { required: true }),
      f("balance", "Balance", "currency"),
      f("paymentBy", "Payment By", "select", {
        options: ["By Patient", "By Sponsor", "By Credit", "Free"],
      }),
      f("paymentMode", "Payment Mode", "select", {
        required: true,
        options: ["Cash", "Demand Draft", "Cheque", "Card", "Net Transfer", "UPI"],
      }),
      f("remarks", "Remarks", "textarea"),
      f("status", "Status", "select", { options: ["Paid", "Partially Paid", "Unpaid", "Credit"] }),
    ],
    {
      dateField: "billDate",
      amountField: "netAmount",
      badgeField: "status",
      columns: ["billNo", "opNo", "patientName", "billDate", "netAmount", "balance", "status"],
    }
  ),
  prescriptions: e(
    "Prescription",
    [
      f("rxNo", "Prescription No", "text", { required: true, default: "RX-2026-00452" }),
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("doctor", "Doctor", "text", { required: true }),
      f("department", "Department", "select", { options: DEPARTMENTS }),
      f("date", "Date", "date", { required: true }),
      f("diagnosis", "Diagnosis", "text"),
      f("medicines", "Medicines", "textarea", { required: true }),
      f("notes", "Notes", "textarea"),
    ],
    { dateField: "date", columns: ["rxNo", "patientName", "doctor", "date", "diagnosis"] }
  ),
  op_visits: e(
    "OP Visit",
    [
      f("opNo", "OP Number", "text"),
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("gender", "Sex", "select", { options: ["Male", "Female", "Trans", "Other"] }),
      f("age", "Age", "number"),
      f("visitDate", "Visit Date", "date", { required: true }),
      f("department", "Department", "select", { options: DEPARTMENTS }),
      f("doctor", "Doctor", "text"),
      f("complaint", "Complaint", "textarea"),
      f("history", "History", "textarea"),
      f("examination", "Examination", "textarea"),
      f("temperature", "Temperature", "text"),
      f("bp", "Blood Pressure", "text"),
      f("pulse", "Pulse", "text"),
      f("weight", "Weight", "text"),
      f("height", "Height", "text"),
      f("spo2", "SpO2", "text"),
      f("bloodSugar", "Blood Sugar", "text"),
      f("drugAllergy", "Drug Allergy", "textarea"),
      f("provisionalDiagnosis", "Provisional Diagnosis", "text"),
      f("diagnosis", "Final Diagnosis", "text"),
      f("advice", "Advice", "textarea"),
      f("rxNo", "Prescription No", "text"),
      f("nextVisitDate", "Next Visit", "date"),
      f("status", "Status", "select", { options: ["Open", "Consulted", "Closed"] }),
      f("mode", "Mode", "select", { options: ["In-Person", "Online"] }),
      f("meetingLink", "Meeting Link", "text"),
    ],
    {
      dateField: "visitDate",
      badgeField: "status",
      columns: ["opNo", "patientName", "visitDate", "department", "doctor", "status"],
    }
  ),
  op_certificates: e(
    "OP Certificate",
    [
      f("certificateNo", "Certificate No", "text", { required: true }),
      f("certificateDate", "Date", "date", { required: true }),
      f("uhid", "UHID", "text"),
      f("patientName", "Patient Name", "text", { required: true }),
      f("certificateType", "Certificate Type", "text", { required: true }),
      f("doctor", "Doctor", "text", { required: true }),
      f("place", "Place", "text"),
      f("title", "Title", "text"),
      f("content", "Content", "textarea"),
      f("remarks", "Remarks", "textarea"),
    ],
    {
      dateField: "certificateDate",
      columns: ["certificateNo", "patientName", "certificateType", "certificateDate", "doctor"],
    }
  ),
  op_referrals: e(
    "OP Referral",
    [
      f("referralNo", "Referral No", "text", { required: true }),
      f("referralDate", "Date", "date", { required: true }),
      f("uhid", "UHID", "text"),
      f("patientName", "Patient Name", "text", { required: true }),
      f("referredHospital", "Referred Hospital", "text", { required: true }),
      f("referredDoctor", "Referred Doctor", "text"),
      f("department", "Department", "text"),
      f("phone", "Phone", "text"),
      f("email", "Email", "text"),
      f("referredBy", "Referred By", "text"),
      f("reason", "Reason for Referring", "textarea"),
      f("conditionAtReferral", "Condition at Referral", "textarea"),
      f("remarks", "Remarks", "textarea"),
    ],
    {
      dateField: "referralDate",
      columns: ["referralNo", "patientName", "referredHospital", "referralDate", "referredBy"],
    }
  ),
  op_treatment_schedules: e(
    "OP Treatment Schedule",
    [
      f("planNo", "Plan Number", "text", { required: true }),
      f("uhid", "UHID", "text"),
      f("patientName", "Patient Name", "text", { required: true }),
      f("plan", "Treatment Plan", "text", { required: true }),
      f("service", "Service", "text"),
      f("sessionNo", "Session No", "number", { required: true }),
      f("totalSessions", "Total Sessions", "number"),
      f("intervalDays", "Interval (Days)", "number"),
      f("planStartDate", "Plan Start Date", "date", { required: true }),
      f("actualDate", "Actual Date", "date"),
      f("durationMins", "Duration (Mins)", "number"),
      f("doctor", "Doctor", "text"),
      f("therapist", "Therapist", "text"),
      f("charges", "Charges", "currency"),
      f("remarks", "Remarks", "textarea"),
      f("status", "Status", "select", {
        options: ["Scheduled", "Executed", "Allocated", "Cancelled"],
      }),
    ],
    {
      dateField: "planStartDate",
      amountField: "charges",
      badgeField: "status",
      columns: ["planNo", "patientName", "plan", "service", "sessionNo", "planStartDate", "status"],
    }
  ),

  /* ------------------------- OP Master / Report ----------------------- */
  op_consultant_doctors: m(
    "Consultant Doctor",
    [
      f("department", "Department", "select", { options: DEPARTMENTS }),
      f("registrationNo", "Registration No", "text"),
      f("specialty", "Specialty", "text"),
      f("sex", "Sex", "select", { options: SEX }),
      f("age", "Age", "number"),
      f("mobile", "Mobile", "text"),
      f("phone", "Phone", "text"),
      f("email", "Email Id", "email"),
      f("address", "Address", "textarea"),
      f("occupation", "Occupation", "text"),
      f("consultingHrs", "Consulting Hrs", "text"),
      f("doctorVisit", "Doctor Visit", "text"),
      f("calendarType", "Calendar Type", "text"),
    ],
    { columns: ["code", "name", "specialty", "sex", "mobile", "phone", "email", "status"] }
  ),
  op_salaried_doctors: m(
    "Salaried Doctor",
    [
      f("department", "Department", "select", { options: DEPARTMENTS }),
      f("designation", "Designation", "text"),
      f("specialty", "Specialty", "text"),
      f("sex", "Sex", "select", { options: SEX }),
      f("age", "Age", "number"),
      f("phone", "Phone", "text"),
      f("email", "Email Id", "email"),
      f("address", "Address", "textarea"),
      f("occupation", "Occupation", "text"),
      f("consultingHrs", "Consulting Hrs", "text"),
      f("doctorVisit", "Doctor Visit", "text"),
    ],
    { columns: ["code", "name", "specialty", "sex", "phone", "email", "status"] }
  ),
  op_referral_doctors: m(
    "Referral Doctor",
    [
      f("referralOrg", "Referral Organization", "text"),
      f("commissionPct", "Commission (%)", "number"),
      f("specialty", "Specialty", "text"),
      f("sex", "Sex", "select", { options: SEX }),
      f("age", "Age", "number"),
      f("mobile", "Mobile", "text"),
      f("phone", "Phone", "text"),
      f("email", "Email Id", "email"),
      f("address", "Address", "textarea"),
      f("occupation", "Occupation", "text"),
      f("consultingHrs", "Consulting Hrs", "text"),
      f("doctorVisit", "Doctor Visit", "text"),
    ],
    { columns: ["code", "name", "specialty", "sex", "mobile", "phone", "email", "status"] }
  ),
  op_doctor_cabin_allocations: m(
    "Doctor Cabin Allocation",
    [
      f("doctorCode", "Doctor Code", "text"),
      f("doctor", "Doctor", "text"),
      f("cabin", "Cabin", "text"),
      f("allocatedFrom", "Allocated From", "date"),
      f("allocatedTo", "Allocated To", "date"),
    ],
    { columns: ["doctorCode", "code", "name", "cabin", "allocatedFrom", "allocatedTo", "status"] }
  ),
  op_referral_organizations: m(
    "Referral Organization",
    [
      f("contactPerson", "Contact Person", "text"),
      f("category", "Category", "text"),
      f("specialty", "Specialty", "text"),
      f("sex", "Sex", "select", { options: SEX }),
      f("age", "Age", "number"),
      f("phone", "Phone", "text"),
      f("email", "Email Id", "email"),
      f("address", "Address", "textarea"),
      f("occupation", "Occupation", "text"),
    ],
    { columns: ["code", "name", "category", "specialty", "phone", "email", "status"] }
  ),
  op_corporates: m(
    "Corporate",
    [
      f("contactPerson", "Contact Person", "text"),
      f("discountPct", "Discount (%)", "number"),
      f("phone", "Phone", "text"),
      f("email", "Email Id", "email"),
      f("address", "Address", "textarea"),
    ],
    { columns: ["code", "name", "phone", "email", "address", "status"] }
  ),
  op_external_organizations: m(
    "External Organization",
    [
      f("contactPerson", "Contact Person", "text"),
      f("department", "Department", "select", { options: DEPARTMENTS }),
      f("phone", "Phone", "text"),
      f("email", "Email Id", "email"),
      f("address", "Address", "textarea"),
      f("sex", "Sex", "select", { options: SEX }),
      f("occupation", "Occupation", "text"),
    ],
    { columns: ["code", "name", "department", "phone", "email", "address", "status"] }
  ),
  op_external_staff: m(
    "External Staff",
    [
      f("organization", "Organization", "text"),
      f("designation", "Designation", "text"),
      f("department", "Department", "select", { options: DEPARTMENTS }),
      f("phone", "Phone", "text"),
      f("email", "Email Id", "email"),
      f("address", "Address", "textarea"),
      f("sex", "Sex", "select", { options: SEX }),
      f("occupation", "Occupation", "text"),
    ],
    { columns: ["code", "name", "department", "phone", "email", "address", "status"] }
  ),
  op_doctor_degrees: m(
    "Doctor Degree",
    [
      f("specialty", "Specialty", "text"),
      f("rate", "Rate", "currency"),
    ],
    { columns: ["code", "name", "rate", "status"] }
  ),
  op_privilege_cards: m(
    "Patient Privilege Card",
    [
      f("uhid", "UHID", "text"),
      f("cardNo", "Card No", "text"),
      f("cardType", "Card Type", "text"),
      f("discountPct", "Discount (%)", "number"),
      f("creditLimit", "Credit Limit", "currency"),
      f("validFrom", "Valid From", "date"),
      f("validTo", "Valid To", "date"),
    ],
    { columns: ["uhid", "name", "cardNo", "cardType", "validFrom", "validTo", "status"] }
  ),

  /* ---------------------------- OP Setup ------------------------------ */
  op_specialties: m(
    "Specialty",
    [
      f("degree", "Degree", "text"),
      f("parentCode", "Parent Code", "text"),
      f("parentName", "Parent Name", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "parentCode", "parentName", "status"] }
  ),
  op_complaints: m(
    "Complaint Master",
    [
      f("specialty", "Specialty", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "status"] }
  ),
  op_diagnoses: m(
    "Diagnosis Master",
    [
      f("icdCode", "ICD Code", "text"),
      f("specialty", "Specialty", "text"),
      f("usageType", "Usage Type", "select", { options: USAGE_TYPE }),
      f("diagnosisGroupCode", "Diagnosis Group Code", "text"),
      f("diagnosisGroupLabel", "Diagnosis Group", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "usageType", "diagnosisGroupCode", "status"] }
  ),
  op_dental_diagnoses: m(
    "Dental Diagnosis Master",
    [
      f("toothArea", "Tooth / Region", "text"),
      f("usageType", "Usage Type", "select", { options: USAGE_TYPE }),
      f("diagnosisGroupCode", "Diagnosis Group Code", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "toothArea", "usageType", "status"] }
  ),
  op_prescription_templates: m(
    "Prescription Template",
    [
      f("templateName", "Template Name", "text"),
      f("medicines", "Medicines", "textarea"),
      f("remarks", "Remarks", "textarea"),
    ],
    { columns: ["code", "name", "templateName", "status"] }
  ),
  op_treatment_plans: m(
    "Treatment Plan",
    [
      f("service", "Service", "text"),
      f("sessions", "Sessions", "number"),
      f("rate", "Rate", "currency"),
      f("type", "Type", "text"),
      f("remarks", "Remarks", "textarea"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "rate", "type", "status"] }
  ),
  op_treatment_plan_definitions: m(
    "Treatment Plan Definition",
    [
      f("plan", "Treatment Plan", "text"),
      f("step", "Treatment Plan Step", "text"),
      f("previousStep", "Previous Step", "text"),
      f("durationDays", "Duration (Days)", "number"),
      f("intervalDays", "Interval (Days)", "number"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "plan", "step", "intervalDays", "status"] }
  ),
  op_generic_names: m(
    "Generic Name",
    [
      f("itemType", "Item Type", "text"),
      f("itemGroup", "Item Group", "text"),
      f("itemClass", "Item Class", "text"),
      f("unitOfMeasure", "Unit of Measure", "text"),
      f("brand", "Brand", "text"),
      f("storageLocation", "Storage Location", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "itemType", "itemGroup", "status"] }
  ),
  op_vaccination_plans: m(
    "Vaccination Plan",
    [
      f("ageGroup", "Age Group", "text"),
      f("age", "Age", "text"),
      f("unitOfMeasure", "Unit of Measure", "text"),
      f("vaccineName", "Vaccine Name", "text"),
      f("vaccineGroup", "Vaccine Group", "text"),
      f("dependentOn", "Dependent On", "text"),
      f("schY", "Sch. Y", "number"),
      f("schM", "Sch. M", "number"),
      f("schD", "Sch. D", "number"),
      f("doses", "Doses", "number"),
      f("type", "Type", "text"),
      f("remarks", "Remarks", "textarea"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "vaccineName", "vaccineGroup", "status"] }
  ),
  op_vaccination_groups: m(
    "Vaccination Group",
    [
      f("vaccines", "Vaccines", "textarea"),
      f("rate", "Rate", "currency"),
      f("remarks", "Remarks", "textarea"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "rate", "status"] }
  ),
  op_fee_groups: m(
    "Fee Group",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  op_fee_types: m(
    "Fee Type",
    [
      f("projectType", "Project Type", "text"),
      f("taskType", "Task Type", "text"),
      f("amount", "Amount", "currency"),
      f("applicableFor", "Applicable For", "select", { options: APPLICABLE }),
      f("editable", "Editable", "select", { options: YES_NO }),
      f("taxApplicable", "Tax Applicable", "select", { options: YES_NO }),
      f("taxPercentage", "Tax Percentage", "number"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "projectType", "amount", "status"] }
  ),
  op_service_categories: m(
    "Service Category",
    [
      f("parentCode", "Parent Code", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "status"] }
  ),
  op_services: m(
    "Service Master",
    [
      f("feeGroup", "Fee Group", "text"),
      f("charge", "Charge", "currency"),
      f("testCategory", "Test Category", "text"),
      f("ipRate", "IP Rate", "currency"),
      f("rate2", "Rate 2", "currency"),
      f("storageMethod", "Storage Method", "text"),
      f("normalRange", "Normal Range", "text"),
      f("hasMultiValue", "Has Multi Value", "select", { options: YES_NO }),
      f("refOrg", "Ref Org", "text"),
    ],
    { columns: ["code", "name", "feeGroup", "charge", "ipRate", "status"] }
  ),
  op_revenue_departments: m(
    "Revenue Department",
    [
      f("parentCode", "Parent Code", "text"),
      f("parentName", "Parent Name", "text"),
      f("remarks", "Remarks", "textarea"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "parentCode", "parentName", "status"] }
  ),
  op_patient_types: m(
    "Patient Type",
    [
      f("discountPct", "Discount (%)", "number"),
      f("applicableType", "Applicable Type", "select", { options: APPLICABLE }),
      f("subType", "Sub Type", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "applicableType", "subType", "status"] }
  ),
  op_revenue_share_services: m(
    "Revenue Share By Service",
    [
      f("service", "Service", "text"),
      f("sharePct", "Share (%)", "number"),
      f("percent", "%", "number"),
    ],
    { columns: ["code", "name", "service", "sharePct", "status"] }
  ),
  op_rev_dept_service_map: m(
    "Rev. Dept. Service Mapping",
    [
      f("revenueDepartment", "Revenue Department", "text"),
      f("assoLevel", "Asso Level", "text"),
      f("service", "Service", "text"),
      f("serviceCategory", "Service Category", "text"),
      f("feeHead", "Fee Head", "text"),
      f("feeType", "Fee Type", "text"),
      f("serviceMaster", "Service Master", "text"),
      f("rate", "Rate", "currency"),
      f("usageType", "Usage Type", "select", { options: USAGE_TYPE }),
    ],
    { columns: ["revenueDepartment", "assoLevel", "serviceCategory", "feeHead", "status"] }
  ),
  op_night_extra_charges: m(
    "Night Extra Service Charge",
    [
      f("service", "Service", "text"),
      f("testMaster", "Test Master", "text"),
      f("assoLevel", "Asso Level", "text"),
      f("extraPct", "Extra Charge (%)", "number"),
      f("feeType", "Fee Type", "text"),
      f("fromTime", "From Time", "time"),
      f("toTime", "To Time", "time"),
    ],
    { columns: ["code", "name", "testMaster", "fromTime", "toTime", "status"] }
  ),
  op_fee_head_service_map: m(
    "Fee Head Service Mapping",
    [
      f("feeHead", "Fee Head", "text"),
      f("feeTypePercentage", "Fee Type Percentage", "number"),
      f("derivation", "Derivation", "text"),
      f("referenceFeeType", "Reference Fee Type", "text"),
      f("service", "Service", "text"),
      f("objectType", "Object Type", "text"),
      f("objectName", "Object Name", "text"),
      f("objectValue", "Object Value", "text"),
      f("dataObject", "Data Object", "text"),
      f("remarks", "Remarks", "textarea"),
    ],
    { columns: ["feeHead", "service", "feeTypePercentage", "status"] }
  ),
  op_patient_type_discounts: m(
    "Patient Type Wise Discount",
    [
      f("patientType", "Patient Type", "text"),
      f("discountPct", "Discount (%)", "number"),
    ],
    { columns: ["code", "name", "patientType", "discountPct", "status"] }
  ),
  op_insurance_patient_type_map: m(
    "Insurance Patient Type Mapping",
    [
      f("insuranceProvider", "Insurance Provider", "text"),
      f("patientType", "Patient Type", "text"),
      f("sponsor", "Sponsor", "text"),
      f("patientSubType", "Patient Sub Type", "text"),
    ],
    { columns: ["code", "name", "sponsor", "patientSubType", "status"] }
  ),
  op_assigned_services: m(
    "Assign Services",
    [
      f("assignedTo", "Assigned To", "text"),
      f("service", "Service", "text"),
      f("testMaster", "Test Master", "text"),
      f("testCategory", "Test Category", "text"),
      f("opRate", "OP Rate", "currency"),
      f("ipRate", "IP Rate", "currency"),
    ],
    { columns: ["code", "name", "testMaster", "testCategory", "status"] }
  ),
  op_fee_by_departments: m(
    "Fee by Department",
    [
      f("department", "Department", "select", { options: DEPARTMENTS }),
      f("assoLevel", "Asso Level", "text"),
      f("feeType", "Fee Type", "text"),
      f("category", "Category", "text"),
      f("amount", "Amount", "currency"),
      f("rate", "Rate", "currency"),
    ],
    { columns: ["code", "name", "department", "feeType", "amount", "status"] }
  ),
  op_blood_groups: m(
    "BloodGroup List",
    [
      f("group", "Blood Group", "select", {
        options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      }),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "group", "status"] }
  ),
  op_visit_purposes: m(
    "Visit Purpose",
    [
      f("forType", "For", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "forType", "status"] }
  ),
  op_police_stations: m(
    "Police Station",
    [
      f("district", "District", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "district", "status"] }
  ),
  op_mlc_types: m(
    "MLC Type",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  op_certificate_types: m(
    "Certificate Type",
    [
      f("templateText", "Template Text", "textarea"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "templateText", "status"] }
  ),
  op_certificate_templates: m(
    "Certificate Template",
    [
      f("certificateType", "Certificate Type", "text"),
      f("place", "Place", "text"),
      f("associate", "Associate", "text"),
      f("body", "Template Body", "textarea"),
      f("message", "Message", "textarea"),
    ],
    { columns: ["code", "name", "certificateType", "place", "status"] }
  ),
  op_doctor_cabins: m(
    "Doctor Cabin",
    [
      f("cabinNumber", "Cabin Number", "text"),
      f("floor", "Floor", "text"),
      f("location", "Location", "text"),
    ],
    { columns: ["cabinNumber", "floor", "status"] }
  ),
  op_revenue_shares: m(
    "Revenue Share",
    [
      f("sharePct", "Share (%)", "number"),
      f("usageType", "Usage Type", "select", { options: USAGE_TYPE }),
      f("feeType", "Fee Type", "text"),
      f("associateType", "Associate Type", "text"),
      f("associate", "Associate", "text"),
      f("category", "Category", "text"),
      f("calculationBase", "Calculation Base", "text"),
      f("applicableFor", "For", "text"),
      f("amount", "Amount", "currency"),
      f("percent", "%", "number"),
      f("frequency", "Frequency", "text"),
      f("tax", "Tax", "currency"),
      f("taxPct", "Tax %", "number"),
    ],
    { columns: ["code", "name", "feeType", "category", "amount", "status"] }
  ),
  op_check_list_items: m(
    "Check List Item",
    [
      f("workflowProcess", "Workflow Process", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "workflowProcess", "status"] }
  ),
  op_check_list_definitions: m(
    "Check List Definition",
    [
      f("checklistItem", "Check List Item", "text"),
      f("workflowProcess", "Workflow Process", "text"),
      f("applicationObject", "Application Object", "text"),
      f("dataObject", "Data Object", "text"),
      f("role", "Role", "text"),
      f("skill", "Skill", "text"),
      f("attribute01", "Attribute 01", "text"),
      f("attributeValue01", "Attribute Value 01", "text"),
      f("associate", "Associate", "text"),
    ],
    { columns: ["code", "name", "workflowProcess", "status"] }
  ),
  op_project_types: m("Project Type"),

  /* ------------------------------ In Patient -------------------------- */
  admissions: e(
    "IP Admission",
    [
      f("ipNo", "IP Number", "text", { required: true, default: "IP-2026-00232" }),
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("admissionType", "Admission Type", "select", {
        required: true,
        options: ["Emergency", "Elective", "Day Care"],
      }),
      f("ward", "Ward", "select", {
        required: true,
        options: ["General Ward", "ICU", "HDU", "Maternity", "Pediatric", "Private"],
      }),
      f("room", "Room", "text"),
      f("bed", "Bed", "text"),
      f("doctor", "Attending Doctor", "text", { required: true }),
      f("admissionDate", "Admission Date", "date", { required: true }),
      f("dischargeDate", "Discharge Date", "date"),
      f("status", "Status", "select", { options: ["Admitted", "Discharged"] }),
    ],
    {
      dateField: "admissionDate",
      badgeField: "status",
      columns: ["ipNo", "patientName", "ward", "bed", "doctor", "admissionDate", "status"],
    }
  ),
  ip_admissions: e(
    "IP Admission Register",
    [
      f("ipNo", "IP Number", "text", { required: true, default: "IP-2026-00232" }),
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("admissionType", "Admission Type", "select", {
        required: true,
        options: ["Emergency", "Elective", "Day Care"],
      }),
      f("ward", "Ward", "select", {
        options: ["General Ward", "ICU", "HDU", "Maternity", "Pediatric", "Private"],
      }),
      f("room", "Room", "text"),
      f("bed", "Bed", "text"),
      f("doctor", "Attending Doctor", "text", { required: true }),
      f("admissionDate", "Admission Date", "date", { required: true }),
      f("status", "Status", "select", { options: ["Admitted", "Discharged", "Transferred"] }),
    ],
    {
      dateField: "admissionDate",
      badgeField: "status",
      columns: ["ipNo", "patientName", "ward", "bed", "doctor", "admissionDate", "status"],
    }
  ),
  ip_clinical_records: e(
    "IP Clinical Record",
    [
      f("refNo", "Reference No", "text", { required: true }),
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("doctor", "Doctor", "text"),
      f("ward", "Ward", "text"),
      f("recordType", "Record Type", "select", {
        options: [
          "Initial Assessment",
          "Doctor's Order",
          "Case Sheet",
          "Doctor Visit",
          "Discharge Advice",
          "Discharge Summary",
          "Patient Feedback",
        ],
      }),
      f("date", "Date", "date", { required: true }),
      f("notes", "Notes", "textarea"),
      f("status", "Status", "select", { options: ["Open", "Closed"] }),
    ],
    { dateField: "date", badgeField: "status" }
  ),
  ip_billing_records: e(
    "IP Billing Record",
    [
      f("refNo", "Reference No", "text", { required: true }),
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("amount", "Amount", "currency", { required: true }),
      f("mode", "Mode", "select", {
        options: ["Cash", "Card", "UPI", "Wallet", "Insurance", "Credit", "Sponsor"],
      }),
      f("date", "Date", "date", { required: true }),
      f("remarks", "Remarks", "textarea"),
      f("status", "Status", "select", { options: ["Pending", "Approved", "Posted", "Cancelled"] }),
    ],
    { dateField: "date", amountField: "amount", badgeField: "status" }
  ),

  /* ------------------------- IP Report collections -------------------- */
  ip_advance_details: e(
    "IP Advance Detail",
    [
      f("refNo", "Reference No", "text"),
      f("uhid", "UHID", "text"),
      f("patientName", "Patient Name", "text"),
      f("admissionDate", "Admission Date", "date"),
      f("advanceAmount", "Advance Amount", "currency"),
      f("collectedAmount", "Collected Amount", "currency"),
      f("balance", "Balance", "currency"),
    ],
    { readOnly: true, dateField: "admissionDate", amountField: "advanceAmount" }
  ),
  ip_payment_details: e(
    "IP Payment Detail",
    [
      f("receiptNo", "Receipt No", "text"),
      f("uhid", "UHID", "text"),
      f("patientName", "Patient Name", "text"),
      f("paymentDate", "Payment Date", "date"),
      f("mode", "Mode", "select", {
        options: ["Cash", "Card", "UPI", "Wallet", "Insurance", "Credit", "Sponsor"],
      }),
      f("amount", "Amount", "currency"),
    ],
    { readOnly: true, dateField: "paymentDate", amountField: "amount" }
  ),
  ip_daily_collections: e(
    "IP Daily Collection Report",
    [
      f("date", "Date", "date"),
      f("mode", "Mode", "select", {
        options: ["Cash", "Card", "UPI", "Wallet", "Insurance", "Credit", "Sponsor"],
      }),
      f("opening", "Opening", "currency"),
      f("collected", "Collected", "currency"),
      f("refund", "Refund", "currency"),
      f("closing", "Closing", "currency"),
    ],
    { readOnly: true, dateField: "date", amountField: "closing" }
  ),
  ip_mis_reports: e(
    "IP MIS Report",
    [
      f("reportName", "Report", "text"),
      f("fromDate", "From Date", "date"),
      f("toDate", "To Date", "date"),
      f("admissions", "Admissions", "number"),
      f("discharges", "Discharges", "number"),
      f("occupancyPct", "Occupancy (%)", "number"),
      f("revenue", "Revenue", "currency"),
    ],
    { readOnly: true, dateField: "fromDate", amountField: "revenue" }
  ),
  ip_turnaround_times: e(
    "IP Turn Around Time",
    [
      f("uhid", "UHID", "text"),
      f("patientName", "Patient Name", "text"),
      f("ward", "Ward", "text"),
      f("admissionAt", "Admission At", "date"),
      f("dischargeAt", "Discharge At", "date"),
      f("lengthOfStay", "Length of Stay (Days)", "number"),
    ],
    { readOnly: true, dateField: "admissionAt" }
  ),

  /* --------------------------- IP Setup - Ward ------------------------ */
  ip_wards: m("Ward List", [
    f("wardType", "Ward Type", "text"),
    f("floors", "Floors", "number"),
  ]),
  ip_specialty_wards: m("Specialty WardAsso List", [
    f("specialty", "Specialty", "text"),
    f("ward", "Ward", "text"),
  ]),
  ip_units: m("Unit List", [
    f("ward", "Ward", "text"),
    f("incharge", "In-charge", "text"),
  ]),
  ip_ward_units: m("Ward Unit Asso List", [
    f("ward", "Ward", "text"),
    f("unit", "Unit", "text"),
  ]),
  ip_unit_days: m("Unit Day Asso List", [
    f("unit", "Unit", "text"),
    f("day", "Day", "select", {
      options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    }),
  ]),
  ip_specialty_unit_doctors: m("Specialty Unit Doctor Asso List", [
    f("specialty", "Specialty", "text"),
    f("unit", "Unit", "text"),
    f("doctor", "Doctor", "text"),
  ]),
  ip_specialty_unit_days: m("Specialty Unit Day Asso List", [
    f("specialty", "Specialty", "text"),
    f("unit", "Unit", "text"),
    f("day", "Day", "text"),
  ]),
  ip_consultation_rooms: m("Consultation Room List", [
    f("block", "Block", "text"),
    f("floor", "Floor", "text"),
  ]),
  ip_consultation_room_masters: m("Consultation Room", [
    f("roomNo", "Room No", "text"),
    f("department", "Department", "select", { options: DEPARTMENTS }),
  ]),

  /* --------------------------- IP Setup - Room ------------------------ */
  ip_room_classifications: m("Classification List"),
  ip_room_types: m("Room Type", [f("tariff", "Tariff", "currency")]),
  ip_types: m("Type"),
  ip_rooms: m("Room List", [
    f("ward", "Ward", "text"),
    f("roomType", "Room Type", "text"),
    f("beds", "Beds", "number"),
  ]),

  /* -------------------------- IP Setup - General ---------------------- */
  ip_treatment_packages: m("Treatment Package List", [
    f("charge", "Charge", "currency"),
    f("durationDays", "Duration (Days)", "number"),
  ]),
  ip_discharge_summary_templates: m("Discharge Summary Template", [
    f("body", "Template Body", "textarea"),
  ]),
  ip_doctors_order_templates: m("Doctor's Order Template", [
    f("body", "Template Body", "textarea"),
  ]),

  /* ----------------------------- Laboratory --------------------------- */
  lab_checkins: e(
    "Patient Checkin Register Lab",
    [
      f("checkinNo", "Checkin No", "text", { required: true }),
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("doctor", "Referring Doctor", "text"),
      f("receivedAt", "Received Date", "date", { required: true }),
      f("priority", "Priority", "select", { options: ["Routine", "Urgent", "STAT"] }),
      f("status", "Status", "select", { options: ["Received", "Processing", "Reported"] }),
    ],
    { dateField: "receivedAt", badgeField: "status", readOnly: true }
  ),
  lab_observations: e(
    "Observation",
    [
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("testName", "Test Name", "text", { required: true }),
      f("value", "Value", "text", { required: true }),
      f("unit", "Unit", "text"),
      f("referenceRange", "Reference Range", "text"),
      f("observedBy", "Observed By", "text"),
      f("observedAt", "Observed Date", "date", { required: true }),
      f("status", "Status", "select", { options: ["Pending", "Verified", "Released"] }),
    ],
    { dateField: "observedAt", badgeField: "status" }
  ),
  lab_external_tests: e(
    "Lab Test Sent To External Organization",
    [
      f("requestNo", "Request No", "text", { required: true }),
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("testName", "Test Name", "text", { required: true }),
      f("externalLab", "External Organization", "text", { required: true }),
      f("sentDate", "Sent Date", "date", { required: true }),
      f("expectedDate", "Expected Date", "date"),
      f("status", "Status", "select", { options: ["Sent", "Received", "Reported"] }),
    ],
    { dateField: "sentDate", badgeField: "status" }
  ),
  lab_external_amounts: e(
    "Lab Test Sent To External Org Edit Amount",
    [
      f("requestNo", "Request No", "text", { required: true }),
      f("uhid", "UHID", "text", { required: true }),
      f("externalLab", "External Organization", "text", { required: true }),
      f("testName", "Test Name", "text", { required: true }),
      f("quotedAmount", "Quoted Amount", "currency", { required: true }),
      f("approvedAmount", "Approved Amount", "currency"),
      f("billedAmount", "Billed Amount", "currency"),
      f("status", "Status", "select", { options: ["Pending Approval", "Approved", "Billed"] }),
    ],
    { amountField: "billedAmount", badgeField: "status" }
  ),
  lab_results: e(
    "Lab Result Entry",
    [
      f("resultNo", "Result No", "text", { required: true }),
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("testName", "Test Name", "text", { required: true }),
      f("result", "Result", "text", { required: true }),
      f("unit", "Unit", "text"),
      f("normalRange", "Normal Range", "text"),
      f("resultDate", "Result Date", "date", { required: true }),
      f("pathologist", "Pathologist", "text"),
      f("status", "Status", "select", { options: ["Pending", "Final", "Amended"] }),
    ],
    { dateField: "resultDate", badgeField: "status" }
  ),

  /* ---------------------- Laboratory - FrontOffice -------------------- */
  lab_bills: lf("Lab Bill", [
    f("billNo", "Bill No", "text", { required: true }),
    f("testName", "Test", "text"),
    f("netAmount", "Net Amount", "currency", { required: true }),
    f("paidAmount", "Paid", "currency"),
    f("paymentMode", "Payment Mode", "select", {
      options: ["Cash", "Card", "UPI", "Insurance", "Credit", "Sponsor"],
    }),
  ]),
  lab_sponsor_dues: lf("Sponsor Due Collection", [
    f("sponsor", "Sponsor", "text", { required: true }),
    f("dueAmount", "Due Amount", "currency", { required: true }),
    f("collectedAmount", "Collected", "currency"),
  ]),

  /* --------------------------- Laboratory - Lab ----------------------- */
  lab_sample_collections: lf("Sample Collection", [
    f("checkinNo", "Checkin No", "text"),
    f("sampleType", "Sample Type", "text"),
    f("barcode", "Barcode", "text"),
    f("collectedBy", "Collected By", "text"),
  ]),
  lab_result_registers: lf("LabResult Register", [
    f("testName", "Test", "text", { required: true }),
    f("result", "Result", "text"),
    f("verifiedBy", "Verified By", "text"),
  ]),
  lab_direct_results: lf("DirectResult Register", [
    f("testName", "Test", "text", { required: true }),
    f("result", "Result", "text"),
  ]),
  lab_pending_tests: lf("Lab Test Pending", [f("testName", "Test", "text")]),
  lab_repeat_tests: lf("Lab Test Repeat", [
    f("testName", "Test", "text", { required: true }),
    f("reason", "Reason", "textarea"),
  ]),
  lab_result_approvals: lf("Lab Result Approval", [
    f("testName", "Test", "text", { required: true }),
    f("approvedBy", "Approved By", "text"),
  ]),
  lab_result_dispatches: lf("Lab Result Dispatch", [
    f("testName", "Test", "text", { required: true }),
    f("dispatchMode", "Dispatch Mode", "select", { options: ["Print", "Email", "SMS", "Courier"] }),
  ]),

  /* ------------------------ Laboratory - Purchase --------------------- */
  lab_purchases: lf("Cash Purchase", [
    f("invoiceNo", "Invoice No", "text"),
    f("supplier", "Supplier", "text"),
    f("netAmount", "Net Amount", "currency"),
  ]),
  lab_purchase_orders: lf("Lab Purchase Order", [
    f("poNo", "PO Number", "text", { required: true }),
    f("supplier", "Supplier", "text", { required: true }),
    f("netAmount", "Net Amount", "currency"),
  ]),
  lab_pur_invoices: lf("PurInvoice Direct", [
    f("invoiceNo", "Invoice No", "text", { required: true }),
    f("supplier", "Supplier", "text", { required: true }),
    f("netAmount", "Net Amount", "currency"),
  ]),
  lab_invoice_approvals: lf("Invoice Approval", [f("invoiceNo", "Invoice No", "text")]),
  lab_purchase_order_approvals: lf("Purchase Order Approval", [f("poNo", "PO Number", "text")]),
  lab_purchase_returns: lf("Lab Purchase Return", [
    f("returnNo", "Return No", "text", { required: true }),
    f("supplier", "Supplier", "text", { required: true }),
    f("refundAmount", "Refund Amount", "currency"),
  ]),
  lab_stock_takings: lf("Stock Taking", [
    f("itemName", "Item", "text", { required: true }),
    f("physicalQty", "Physical Qty", "number"),
    f("systemQty", "System Qty", "number"),
  ]),

  /* ------------------------- Laboratory - Report ---------------------- */
  lab_test_profile_reports: lr("Lab Test Profile"),
  lab_external_org_shares: lr("Lab ExternalOrg Share"),
  lab_excel_exports: lr("Lab Excel Export"),

  /* ------------------------- Laboratory - Master ---------------------- */
  lab_doctors: m(
    "Doctor",
    [
      f("department", "Department", "select", { options: DEPARTMENTS }),
      f("registrationNo", "Registration No", "text"),
      f("specialty", "Specialty", "text"),
      f("sex", "Sex", "select", { options: SEX }),
      f("age", "Age", "number"),
      f("phone", "Phone", "text"),
      f("mobile", "Mobile", "text"),
      f("email", "Email Id", "email"),
      f("address", "Address", "textarea"),
      f("occupation", "Occupation", "text"),
      f("qualification", "Qualification", "text"),
      f("degree", "Degree", "text"),
      f("city", "City", "text"),
      f("postalCode", "Postal Code", "text"),
      f("locality", "Locality", "text"),
      f("district", "District", "text"),
      f("state", "State", "text"),
      f("country", "Country", "text"),
      f("panNumber", "PAN Number", "text"),
      f("bankName", "Bank Name", "text"),
      f("accountNumber", "Account Number", "text"),
      f("ifscCode", "IFSC Code", "text"),
      f("consultationFee", "Consultation Fee", "currency"),
      f("consultingDuration", "Consulting Duration (Minutes)", "number"),
      f("serialNo", "S.No", "number"),
      f("referredByCode", "Referred By Code", "text"),
      f("referredByName", "Referred By Name", "text"),
      f("onlineConsultation", "Online Consultation", "select", { options: ["Yes", "No"] }),
      f("calendarType", "Doctor Calendar Type", "select", { options: ["Default", "Weekly", "Monthly"] }),
      f("doctorPercentage", "Doctor Percentage", "number"),
      f("doctorShareAmount", "Doctor Share Amount", "currency"),
      f("photoUrl", "Doctor Photo", "text"),
      f("signatureUrl", "Doctor Signature", "text"),
    ],
    {
      columns: [
        "code",
        "name",
        "specialty",
        "phone",
        "mobile",
        "email",
        "status",
        "consultationFee",
        "onlineConsultation",
      ],
    }
  ),
  lab_referral_orgs: m(
    "Referral Organization",
    [
      f("contactPerson", "Contact Person", "text"),
      f("phone", "Phone", "text"),
      f("email", "Email Id", "email"),
      f("address", "Address", "textarea"),
    ],
    { columns: ["code", "name", "contactPerson", "phone", "email", "status"] }
  ),
  lab_suppliers: m(
    "Supplier",
    [
      f("contactPerson", "Contact Person", "text"),
      f("phone", "Phone", "text"),
      f("email", "Email Id", "email"),
      f("gstNo", "GST No", "text"),
      f("address", "Address", "textarea"),
      f("items", "Supplied Item", "text"),
    ],
    { columns: ["code", "name", "phone", "email", "status"] }
  ),
  lab_supplier_gls: m(
    "Supplier GL",
    [
      f("supplierCode", "Supplier Code", "text"),
      f("supplierName", "Supplier Name", "text"),
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
      f("glAccount", "GL Account", "text"),
      f("associateAddress", "Associate Address", "textarea"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["supplierCode", "supplierName", "accountNumber", "accountName", "status"] }
  ),
  lab_item_masters: m(
    "Item Master",
    [
      f("category", "Category", "text"),
      f("unit", "Unit", "text"),
      f("itemType", "Item Type", "text"),
      f("itemGroup", "Item Group", "text"),
      f("itemClass", "Item Class", "text"),
      f("unitOfMeasure", "Unit of Measure", "text"),
      f("brand", "Brand", "text"),
      f("storageLocation", "Storage Location", "text"),
      f("type", "Type", "text"),
      f("genericName", "Generic Name", "text"),
      f("rate", "Rate", "currency"),
      f("supplier", "Supplier", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "itemType", "itemGroup", "rate", "status"] }
  ),
  lab_stock_registers: m(
    "Stock Register",
    [
      f("storeCode", "Store Code", "text"),
      f("storeName", "Store Name", "text"),
      f("itemName", "Item", "text"),
      f("quantity", "Quantity", "number"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["storeCode", "storeName", "itemName", "status"] }
  ),

  /* -------------------------- Laboratory - Setup ---------------------- */
  lab_test_categories: m(
    "TestCategory",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  lab_sample_types: m(
    "Sample Type",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  lab_test_methods: m(
    "Test Method",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  lab_test_masters: m(
    "Test Master",
    [
      f("category", "Test Category", "text"),
      f("sampleType", "Sample Type", "text"),
      f("method", "Test Method", "text"),
      f("rate", "OP Rate", "currency"),
      f("ipRate", "IP Rate", "currency"),
      f("rate2", "Rate 2", "currency"),
      f("storageMethod", "Storage Method", "text"),
      f("normalRange", "Normal Range", "text"),
      f("hasMultiValue", "Has Multi Value", "select", { options: YES_NO }),
      f("refOrg", "Ref Org", "text"),
      f("provider", "Provider", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "category", "rate", "ipRate", "status"] }
  ),
  lab_profiles: m(
    "Lab Profile",
    [
      f("category", "Test Category", "text"),
      f("rate", "OP Rate", "currency"),
      f("ipRate", "IP Rate", "currency"),
      f("rate2", "Rate 2", "currency"),
      f("storageMethod", "Storage Method", "text"),
      f("normalRange", "Normal Range", "text"),
      f("hasMultiValue", "Has Multi Value", "select", { options: YES_NO }),
      f("refOrg", "Ref Org", "text"),
      f("provider", "Provider", "text"),
      f("tests", "Tests", "textarea"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "category", "rate", "ipRate", "status"] }
  ),
  lab_test_profile_assos: m(
    "Test Profile Association",
    [
      f("test", "Test", "text"),
      f("profile", "Profile", "text"),
      f("testCode", "Test Code", "text"),
      f("testName", "Test Name", "text"),
      f("profileCode", "Profile Code", "text"),
      f("profileName", "Profile Name", "text"),
      f("displayGroup", "Display Group", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["testCode", "testName", "profileCode", "profileName", "status"] }
  ),
  lab_master_profiles: m(
    "Master Profile",
    [
      f("category", "Test Category", "text"),
      f("rate", "OP Rate", "currency"),
      f("ipRate", "IP Rate", "currency"),
      f("rate2", "Rate 2", "currency"),
      f("storageMethod", "Storage Method", "text"),
      f("normalRange", "Normal Range", "text"),
      f("hasMultiValue", "Has Multi Value", "select", { options: YES_NO }),
      f("refOrg", "Ref Org", "text"),
      f("tests", "Tests", "textarea"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "category", "rate", "ipRate", "status"] }
  ),
  lab_outsource_service_rates: m(
    "OutSource Service Rate Definition",
    [
      f("externalOrg", "External Organization", "text"),
      f("test", "Test", "text"),
      f("outsourceService", "OutSource Service", "text"),
      f("rate", "Rate", "currency"),
    ],
    { columns: ["externalOrg", "test", "rate", "status"] }
  ),
  lab_test_item_assos: m(
    "Test Item Association",
    [
      f("test", "Test", "text"),
      f("testCategory", "Test Category", "text"),
      f("item", "Item", "text"),
      f("rate", "Rate", "currency"),
      f("quantity", "Quantity", "number"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["test", "item", "quantity", "status"] }
  ),
  lab_profile_item_assos: m(
    "Profile Item Association",
    [
      f("profile", "Profile", "text"),
      f("test", "Test", "text"),
      f("item", "Item", "text"),
      f("rate", "Rate", "currency"),
      f("quantity", "Quantity", "number"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["profile", "item", "quantity", "status"] }
  ),

  /* -------------------------------- Scan ------------------------------ */
  scan_templates: e(
    "Scan Template",
    [
      f("templateCode", "Template Code", "text", { required: true }),
      f("templateName", "Template Name", "text", { required: true }),
      f("modality", "Modality", "select", {
        required: true,
        options: ["CT", "MRI", "Ultrasound", "X-Ray", "PET"],
      }),
      f("bodyPart", "Body Part", "text", { required: true }),
      f("sedation", "Sedation Required", "select", { options: YES_NO }),
      f("observation", "Observation", "textarea"),
      f("impression", "Impression", "textarea"),
      f("footer", "Footer", "textarea"),
      f("serialNumber", "S.No", "number"),
    ],
    { badgeField: null }
  ),

  /* -------------------------------- Scan ------------------------------ */
  scan_registers: lf("Scan Register", [
    f("testName", "Scan", "text", { required: true }),
    f("referringDoctor", "Referring Doctor", "text"),
    f("amount", "Amount", "currency"),
  ]),
  scan_schedules: lf("Scheduling Scan", [
    f("testName", "Scan", "text", { required: true }),
    f("machine", "Machine", "text"),
    f("scheduledAt", "Scheduled Date", "date"),
  ]),
  scan_external_tests: lf("Scan Test Sent To External Org", [
    f("testName", "Scan", "text", { required: true }),
    f("externalOrg", "External Organization", "text", { required: true }),
    f("sentDate", "Sent Date", "date"),
  ]),
  scan_credit_bills: lf("Scan Credit Bill", [
    f("billNo", "Bill No", "text", { required: true }),
    f("sponsor", "Sponsor", "text"),
    f("netAmount", "Net Amount", "currency"),
  ]),
  scan_sponsor_dues: lf("Scan Sponsor Due Collection", [
    f("sponsor", "Sponsor", "text", { required: true }),
    f("dueAmount", "Due Amount", "currency"),
    f("collectedAmount", "Collected", "currency"),
  ]),
  scan_categories: m(
    "Scan Category",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  scan_masters: m(
    "Scan Master",
    [
      f("category", "Test Category", "text"),
      f("bodyPart", "Body Part", "text"),
      f("rate", "OP Rate", "currency"),
      f("ipRate", "IP Rate", "currency"),
      f("rate2", "Rate 2", "currency"),
      f("storageMethod", "Storage Method", "text"),
      f("normalRange", "Normal Range", "text"),
      f("hasMultiValue", "Has Multi Value", "select", { options: YES_NO }),
      f("refOrg", "Ref Org", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "category", "rate", "ipRate", "status"] }
  ),
  scan_test_item_assos: m(
    "Scan Test Item Association",
    [
      f("test", "Test Code", "text"),
      f("testLabel", "Test Name", "text"),
      f("item", "Item Code", "text"),
      f("itemLabel", "Item Name", "text"),
      f("quantity", "Quantity", "number"),
      f("wastage", "Wastage %", "number"),
    ],
    { columns: ["test", "testLabel", "item", "itemLabel", "quantity", "status"] }
  ),
  scan_machines: m(
    "Machine",
    [
      f("modality", "Modality", "text"),
      f("location", "Location", "text"),
      f("description", "Description", "textarea"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "description", "status"] }
  ),

  /* -------------------------------- X-Ray ----------------------------- */
  xray_registers: lf("Xray Register", [
    f("testName", "Test", "text", { required: true }),
    f("referringDoctor", "Referring Doctor", "text"),
    f("amount", "Amount", "currency"),
  ]),
  xray_results: lf("Xray Result", [
    f("testName", "Test", "text", { required: true }),
    f("findings", "Findings", "textarea"),
    f("radiologist", "Radiologist", "text"),
  ]),
  xray_external_tests: lf("Xray Test Sent To External Org", [
    f("testName", "Test", "text", { required: true }),
    f("externalOrg", "External Organization", "text", { required: true }),
    f("sentDate", "Sent Date", "date"),
  ]),
  xray_issue_registers: lf("Xray Issue Register", [
    f("issueNo", "Issue No", "text", { required: true }),
    f("filmType", "Film Type", "text"),
    f("quantity", "Quantity", "number"),
  ]),
  xray_credit_bills: lf("Credit Bill", [
    f("billNo", "Bill No", "text", { required: true }),
    f("sponsor", "Sponsor", "text"),
    f("netAmount", "Net Amount", "currency"),
  ]),
  xray_sponsor_dues: lf("Xray Sponsor Due Collection", [
    f("sponsor", "Sponsor", "text", { required: true }),
    f("dueAmount", "Due Amount", "currency"),
    f("collectedAmount", "Collected", "currency"),
  ]),
  xray_pending_payments: lf("Pending Payment", [
    f("billNo", "Bill No", "text"),
    f("dueAmount", "Due Amount", "currency"),
  ]),
  xray_categories: m(
    "Xray Category",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  xray_masters: m(
    "Xray Master",
    [
      f("category", "Test Category", "text"),
      f("bodyPart", "Body Part", "text"),
      f("rate", "Rate", "currency"),
      f("manual", "Manual", "currency"),
      f("digital", "Digital", "currency"),
      f("rate2", "Rate 2", "currency"),
      f("storageMethod", "Storage Method", "text"),
      f("normalRange", "Normal Range", "text"),
      f("hasMultiValue", "Has Multi Value", "select", { options: YES_NO }),
      f("refOrg", "Ref Org", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "category", "rate", "status"] }
  ),
  xray_test_item_assos: m(
    "Xray Test Item Association",
    [
      f("test", "Test Code", "text"),
      f("testLabel", "Test Label", "text"),
      f("item", "Item Code", "text"),
      f("itemLabel", "Item Label", "text"),
      f("quantity", "Quantity", "number"),
      f("wastage", "Wastage %", "number"),
    ],
    { columns: ["test", "testLabel", "item", "itemLabel", "quantity", "status"] }
  ),

  /* ------------------------------ Dialysis ---------------------------- */
  dialysis_sessions: e(
    "Dialysis Session",
    [
      f("sessionId", "Session ID", "text", { required: true }),
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("machineNo", "Machine No", "text"),
      f("dialyzer", "Dialyzer", "text"),
      f("startDate", "Start Date", "date", { required: true }),
      f("durationHours", "Duration (hrs)", "number"),
      f("doctor", "Doctor", "text"),
      f("status", "Status", "select", {
        options: ["Planned", "In Progress", "Completed", "Cancelled"],
      }),
    ],
    { dateField: "startDate", badgeField: "status" }
  ),
  dialysis_masters: e(
    "Dialysis Master",
    [
      f("code", "Code", "text", { required: true }),
      f("sessionType", "Session Type", "select", {
        required: true,
        options: ["Hemodialysis", "Peritoneal Dialysis", "CVVH"],
      }),
      f("durationMins", "Duration (mins)", "number", { required: true }),
      f("charge", "Charge", "currency", { required: true }),
      f("opRate", "OP Rate", "currency"),
      f("ipRate", "IP Rate", "currency"),
      f("rate2", "Rate 2", "currency"),
      f("storageMethod", "Storage Method", "text"),
      f("normalRange", "Normal Range", "text"),
      f("hasMultiValue", "Has Multi Value", "select", { options: YES_NO }),
      f("sedation", "Sedation", "select", { options: YES_NO }),
      f("status", "Status", "select", { options: ACTIVE }),
    ],
    { amountField: "charge", badgeField: "status" }
  ),

  /* --------------------------- Specialty Tests ------------------------ */
  st_cardiology_registers: lf("Cardiology Register", [
    f("testName", "Test", "text", { required: true }),
    f("referringDoctor", "Referring Doctor", "text"),
    f("amount", "Amount", "currency"),
  ]),
  st_diabetology_registers: lf("Diabetology Register", [
    f("testName", "Test", "text", { required: true }),
    f("referringDoctor", "Referring Doctor", "text"),
    f("amount", "Amount", "currency"),
  ]),
  st_cardiology_categories: m(
    "Cardiology Category",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  st_cardiology_masters: m(
    "Cardiology Master",
    [
      f("category", "Test Category", "text"),
      f("rate", "OP Rate", "currency"),
      f("ipRate", "IP Rate", "currency"),
      f("rate2", "Rate 2", "currency"),
      f("storageMethod", "Storage Method", "text"),
      f("normalRange", "Normal Range", "text"),
      f("hasMultiValue", "Has Multi Value", "select", { options: YES_NO }),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "category", "rate", "ipRate", "status"] }
  ),

  /* ---------------------------- Physiotherapy ------------------------- */
  physio_registers: lf("Physiotherapy Register", [
    f("service", "Service", "text", { required: true }),
    f("therapist", "Therapist", "text"),
    f("sessions", "Sessions", "number"),
    f("amount", "Amount", "currency"),
  ]),
  physio_credit_bills: lf("Physiotherapy Credit Bill", [
    f("billNo", "Bill No", "text", { required: true }),
    f("sponsor", "Sponsor", "text"),
    f("netAmount", "Net Amount", "currency"),
  ]),
  physio_pending_payments: lf("Physiotherapy Pending Payment", [
    f("billNo", "Bill No", "text"),
    f("dueAmount", "Due Amount", "currency"),
  ]),
  physio_service_returns: lf("Physio Service Return", [
    f("returnNo", "Return No", "text", { required: true }),
    f("service", "Service", "text"),
    f("refundAmount", "Refund Amount", "currency"),
  ]),
  physio_categories: m(
    "Physio Category",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  physio_masters: m(
    "Physiotherapy Master",
    [
      f("category", "Category", "text"),
      f("durationMins", "Duration (mins)", "number"),
      f("charge", "Charge", "currency"),
      f("ipRate", "IP Rate", "currency"),
      f("rate2", "Rate 2", "currency"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "category", "charge", "status"] }
  ),

  /* ------------------------------ Dialysis ---------------------------- */
  dialysis_registers: lf("Dialysis Register", [
    f("sessionType", "Session Type", "text", { required: true }),
    f("machineNo", "Machine No", "text"),
    f("durationHours", "Duration (hrs)", "number"),
    f("amount", "Amount", "currency"),
  ]),
  dialysis_credit_bills: lf("Dialysis Credit Bill", [
    f("billNo", "Bill No", "text", { required: true }),
    f("sponsor", "Sponsor", "text"),
    f("netAmount", "Net Amount", "currency"),
  ]),
  dialysis_service_requests: lf("Dialysis Service Request", [
    f("sessionType", "Session Type", "text", { required: true }),
    f("requestedBy", "Requested By", "text"),
  ]),
  dialysis_cumulative_reports: lr("Dialysis Cumulative Report"),
  dialysis_billing_reports: lr("Dialysis Billing Report"),
  dialysis_categories: m(
    "Dialysis Category",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  dialysis_test_item_assos: m(
    "Dialysis Test Item Association",
    [
      f("test", "Test Code", "text"),
      f("testLabel", "Test Label", "text"),
      f("item", "Item Code", "text"),
      f("itemLabel", "Item Label", "text"),
      f("quantity", "Quantity", "number"),
      f("wastage", "Wastage %", "number"),
    ],
    { columns: ["test", "testLabel", "item", "itemLabel", "quantity", "status"] }
  ),

  /* -------------------------------- Ward ------------------------------ */
  room_cleanings: e(
    "Room Cleaning",
    [
      f("requestNo", "Request No", "text", { required: true }),
      f("ward", "Ward", "select", {
        required: true,
        options: ["General Ward", "ICU", "HDU", "Maternity", "Pediatric", "Private"],
      }),
      f("room", "Room", "text", { required: true }),
      f("bed", "Bed", "text"),
      f("requestedBy", "Requested By", "text"),
      f("requestedAt", "Requested Date", "date", { required: true }),
      f("assignedTo", "Assigned To", "text"),
      f("status", "Status", "select", { options: ["Pending", "In Progress", "Done"] }),
    ],
    { dateField: "requestedAt", badgeField: "status" }
  ),
  ward_nurse_workbenches: lf("Nurses WorkBench", [
    f("ward", "Ward", "text"),
    f("bed", "Bed", "text"),
    f("doctor", "Doctor", "text"),
  ]),
  ward_item_issues: lf("Ward Item Issue & Return", [
    f("itemName", "Item", "text", { required: true }),
    f("quantity", "Quantity", "number"),
    f("issuedTo", "Issued To", "text"),
  ]),
  ward_service_requests: lf("Ward Service Request", [
    f("service", "Service", "text", { required: true }),
    f("requestedBy", "Requested By", "text"),
  ]),
  ward_doctor_visits: lf("Schedule Doctor Visit", [
    f("doctor", "Doctor", "text", { required: true }),
    f("visitAt", "Visit Date", "date"),
  ]),
  ward_equipment_usages: lf("Ward Equipment Usage", [
    f("equipment", "Equipment", "text", { required: true }),
    f("quantity", "Quantity", "number"),
  ]),
  ward_item_consumptions: lf("Ward Item Consumption", [
    f("itemName", "Item", "text", { required: true }),
    f("quantity", "Quantity", "number"),
  ]),
  ward_discharge_summaries: lf("Ward Discharge Summary", [
    f("diagnosis", "Diagnosis", "text"),
    f("summary", "Summary", "textarea"),
  ]),
  ward_masters: m(
    "Ward",
    [
      f("wardType", "Ward Type", "text"),
      f("floors", "Floors", "number"),
      f("floor", "Floor", "text"),
      f("location", "Location", "text"),
    ],
    { columns: ["code", "name", "wardType", "floors", "status"] }
  ),
  ward_clinical_exams: m(
    "Clinical Exam",
    [
      f("findings", "Findings", "textarea"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "status"] }
  ),

  /* -------------------------------- MRD ------------------------------- */
  file_movements: e(
    "File Movement",
    [
      f("movementNo", "Movement No", "text", { required: true }),
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("fileNo", "File No", "text", { required: true }),
      f("fromLocation", "From", "text", { required: true }),
      f("toLocation", "To", "text", { required: true }),
      f("movedBy", "Moved By", "text"),
      f("movedAt", "Movement Date", "date", { required: true }),
      f("status", "Status", "select", { options: ["Issued", "Received", "Overdue"] }),
    ],
    {
      dateField: "movedAt",
      badgeField: "status",
      columns: ["movementNo", "patientName", "fileNo", "fromLocation", "toLocation", "movedAt", "status"],
    }
  ),
  case_sheets: e(
    "Case Sheet",
    [
      f("caseSheetNo", "Case Sheet No", "text", { required: true }),
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("department", "Department", "select", { options: DEPARTMENTS }),
      f("doctor", "Doctor", "text", { required: true }),
      f("date", "Date", "date", { required: true }),
      f("diagnosis", "Diagnosis", "text"),
      f("notes", "Clinical Notes", "textarea"),
    ],
    { dateField: "date" }
  ),
  patient_records: e(
    "Patient Records",
    [
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("fileNo", "File No", "text"),
      f("recordType", "Record Type", "select", {
        options: ["OP", "IP", "Lab", "Radiology", "Pharmacy"],
      }),
      f("location", "Storage Location", "text"),
      f("archivedAt", "Archived Date", "date"),
      f("status", "Status", "select", { options: ["Active", "Archived", "Requested"] }),
    ],
    { dateField: "archivedAt", badgeField: "status", readOnly: true }
  ),
  mrd_file_masters: e(
    "File Master",
    [
      f("fileNo", "File No", "text", { required: true }),
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("fileType", "File Type", "text"),
      f("openedDate", "Opened Date", "date"),
      f("storageLocation", "Storage Location", "text"),
      f("status", "Status", "select", { options: ["Active", "Closed", "Lost"] }),
    ],
    { dateField: "openedDate", badgeField: "status" }
  ),
  complaint_types: e(
    "Complaint Type",
    [
      f("code", "Code", "text", { required: true }),
      f("complaintType", "Complaint Type", "text", { required: true }),
      f("description", "Description", "textarea"),
      f("active", "Active", "select", { options: YES_NO }),
    ],
    { badgeField: "active" }
  ),
  patient_complaints: e(
    "Patient Complaint",
    [
      f("complaintNo", "Complaint No", "text", { required: true }),
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("complaintType", "Complaint Type", "text", { required: true }),
      f("raisedDate", "Raised Date", "date", { required: true }),
      f("description", "Description", "textarea"),
      f("status", "Status", "select", { options: OPEN_STATUS }),
    ],
    { dateField: "raisedDate", badgeField: "status" }
  ),
  file_types: e(
    "File Type",
    [
      f("code", "Code", "text", { required: true }),
      f("typeName", "Type Name", "text", { required: true }),
      f("retentionYears", "Retention (Years)", "number"),
      f("department", "Department", "select", { options: DEPARTMENTS }),
      f("active", "Active", "select", { options: YES_NO }),
      f("serialNumber", "S.No", "number"),
    ],
    { badgeField: "active", columns: ["code", "typeName", "retentionYears", "active"] }
  ),
  icd_codings: e(
    "ICD Coding",
    [
      f("code", "ICD Code", "text", { required: true }),
      f("description", "Description", "text", { required: true }),
      f("category", "Category", "text"),
      f("version", "Version", "select", { options: ["ICD-10", "ICD-11"] }),
      f("active", "Active", "select", { options: YES_NO }),
      f("serialNumber", "S.No", "number"),
    ],
    { badgeField: "active", columns: ["code", "description", "category", "version", "active"] }
  ),
  icpm_codings: e(
    "ICPM Coding",
    [
      f("code", "ICPM Code", "text", { required: true }),
      f("description", "Description", "text", { required: true }),
      f("category", "Category", "text"),
      f("version", "Version", "select", { options: ["ICPM-2018"] }),
      f("active", "Active", "select", { options: YES_NO }),
      f("serialNumber", "S.No", "number"),
    ],
    { badgeField: "active", columns: ["code", "description", "category", "version", "active"] }
  ),

  /* --------------------------- MRD Transactions ----------------------- */
  mrd_admission_sheets: lf("MRD Admission Sheet", [
    f("ipNo", "IP Number", "text"),
    f("diagnosis", "Diagnosis", "text"),
  ]),
  mrd_case_sheet_issues: lf("Case Sheet Issue", [
    f("fileNo", "File No", "text"),
    f("issuedTo", "Issued To", "text"),
  ]),
  mrd_discharge_summaries: lf("MRD Discharge Summary", [
    f("ipNo", "IP Number", "text"),
    f("summary", "Summary", "textarea"),
  ]),
  mrd_patient_icd_codes: m(
    "Patient ICD Code",
    [
      f("uhid", "UHID", "text"),
      f("icdCode", "ICD Code", "text"),
      f("codingType", "Coding Type", "select", { options: ["ICD", "ICPM"] }),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["uhid", "icdCode", "codingType", "status"] }
  ),
  mrd_case_sheet_receives: lf("Case Sheet Recieve Entry", [
    f("fileNo", "File No", "text"),
    f("receivedFrom", "Received From", "text"),
  ]),
  mrd_excel_exports: lr("MRD Excel Export"),
  mrd_case_sheet_status_reports: lr("Case Sheet Status Report"),
  mrd_mis_reports: lr("MRD MIS Report"),
  mrd_area_wise_patients: lr("Area Wise Patient"),

  /* --------------------------- Operation Theatre ---------------------- */
  ot_cases: e(
    "OT Case",
    [
      f("caseNo", "Case No", "text", { required: true }),
      f("uhid", "UHID", "text", { required: true }),
      f("patientName", "Patient Name", "text", { required: true }),
      f("procedure", "Procedure", "text", { required: true }),
      f("surgeon", "Surgeon", "text", { required: true }),
      f("otNo", "OT No", "text"),
      f("scheduledDate", "Scheduled Date", "date", { required: true }),
      f("charge", "Charge", "currency"),
      f("status", "Status", "select", {
        options: ["Scheduled", "In Surgery", "Completed", "Cancelled"],
      }),
    ],
    { dateField: "scheduledDate", amountField: "charge", badgeField: "status" }
  ),
  ot_bookings: lf("Theatre Booking", [
    f("procedure", "Procedure", "text", { required: true }),
    f("surgeon", "Surgeon", "text"),
    f("theatre", "Theatre", "text"),
  ]),
  ot_operation_registers: lf("Operation Register", [
    f("procedure", "Procedure", "text", { required: true }),
    f("surgeon", "Surgeon", "text"),
  ]),
  ot_item_usages: lf("Theatre Item Usage", [
    f("itemName", "Item", "text", { required: true }),
    f("quantity", "Quantity", "number"),
  ]),
  ot_item_issues: lf("OT Item Issue & Return", [
    f("itemName", "Item", "text", { required: true }),
    f("quantity", "Quantity", "number"),
  ]),
  ot_service_requests: lf("OT Service Request", [
    f("service", "Service", "text", { required: true }),
    f("requestedBy", "Requested By", "text"),
  ]),
  ot_cssd_requests: lf("CSSD Request", [f("setName", "Instrument Set", "text")]),
  ot_cssd_accepts: lf("CSSD Accept", [f("setName", "Instrument Set", "text")]),
  ot_cssd_returns: lf("CSSD Return", [f("setName", "Instrument Set", "text")]),
  ot_cssd_approvals: lf("CSSD Request Approval", [f("setName", "Instrument Set", "text")]),
  ot_theatres: m(
    "Theatre",
    [
      f("floor", "Floor", "text"),
      f("location", "Location", "text"),
    ],
    { columns: ["code", "name", "floor", "location", "status"] }
  ),
  ot_operation_templates: m(
    "Operation Template",
    [
      f("procedure", "Procedure", "text"),
      f("surgeon", "Surgeon", "text"),
      f("theatre", "Theatre", "text"),
    ],
    { columns: ["code", "name", "procedure", "surgeon", "status"] }
  ),
  ot_excel_exports: lr("OT Excel Export"),
  ot_surgery_reports: lr("Surgery Report"),
  ot_operation_types: m("Operation Type", [
    f("description", "Description", "text"),
    f("serialNumber", "S.No", "number"),
  ]),
  ot_equipments: m("OT Equipment", [
    f("description", "Description", "text"),
    f("serialNumber", "S.No", "number"),
  ]),
  ot_implants: m("Implant", [f("serialNumber", "S.No", "number")]),
  ot_medicines: m("OT Medicine", [f("serialNumber", "S.No", "number")]),
  ot_consumables: m("Consumable", [f("serialNumber", "S.No", "number")]),

  /* -------------------------------- CSSD ------------------------------ */
  cssd_item_receives: lf("CSSD Item Receive", [
    f("itemName", "Item", "text", { required: true }),
    f("quantity", "Quantity", "number"),
  ]),
  cssd_processes: lf("CSSD Process", [
    f("setName", "Instrument Set", "text"),
    f("method", "Sterilization Method", "text"),
  ]),
  cssd_instrument_stocks: lf("Instrument to Stock", [
    f("instrument", "Instrument", "text", { required: true }),
    f("quantity", "Quantity", "number"),
  ]),
  cssd_item_issues: lf("CSSD Item Issue", [
    f("itemName", "Item", "text", { required: true }),
    f("quantity", "Quantity", "number"),
  ]),
  cssd_instrument_sets: m(
    "Instrument Set",
    [
      f("itemType", "Item Type", "text"),
      f("itemGroup", "Item Group", "text"),
      f("itemClass", "Item Class", "text"),
      f("unitOfMeasure", "Unit of Measure", "text"),
      f("brand", "Brand", "text"),
      f("supplier", "Supplier", "text"),
      f("storageLocation", "Storage Location", "text"),
      f("description", "Description", "textarea"),
      f("instruments", "Instruments", "textarea"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "itemType", "itemGroup", "status"] }
  ),
  cssd_instruments: m(
    "Instrument",
    [
      f("itemType", "Item Type", "text"),
      f("itemGroup", "Item Group", "text"),
      f("itemClass", "Item Class", "text"),
      f("unitOfMeasure", "Unit of Measure", "text"),
      f("brand", "Brand", "text"),
      f("supplier", "Supplier", "text"),
      f("storageLocation", "Storage Location", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "itemType", "itemGroup", "status"] }
  ),
  cssd_equipments: m(
    "CSSD Equipment",
    [
      f("itemType", "Item Type", "text"),
      f("itemGroup", "Item Group", "text"),
      f("itemClass", "Item Class", "text"),
      f("unitOfMeasure", "Unit of Measure", "text"),
      f("brand", "Brand", "text"),
      f("supplier", "Supplier", "text"),
      f("storageLocation", "Storage Location", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "itemType", "itemGroup", "status"] }
  ),
  cssd_stock_registers: m(
    "CSSD Stock Register",
    [
      f("storeCode", "Store Code", "text"),
      f("storeName", "Store Name", "text"),
      f("controlType", "Control Type", "text"),
      f("itemName", "Item", "text"),
      f("quantity", "Quantity", "number"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["storeCode", "storeName", "controlType", "itemName", "quantity", "status"] }
  ),
  cssd_sterilization_methods: m(
    "Sterilization Method",
    [
      f("parentCode", "Parent Code", "text"),
      f("parentLabel", "Parent Label", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "status"] }
  ),

  /* ----------------------------- Insurance ---------------------------- */
  insurance_claims: m("Claim", [
    f("uhid", "UHID", "text"),
    f("company", "Insurance Company", "text"),
    f("claimAmount", "Claim Amount", "currency"),
  ]),
  insurance_pre_authos: lf("Assign Pre Autho To IP", [
    f("ipNo", "IP Number", "text"),
    f("provider", "Provider", "text"),
    f("approvedAmount", "Approved Amount", "currency"),
  ]),
  insurance_medical_reports: m("Medical Report", [
    f("uhid", "UHID", "text"),
    f("company", "Insurance Company", "text"),
  ]),
  insurance_tracks: m("Track Insurance", [
    f("uhid", "UHID", "text"),
    f("claimNo", "Claim No", "text"),
  ]),
  insurance_sponsor_dues: lf("Sponsor Due Collection", [f("sponsor", "Sponsor", "text")]),
  insurance_payment_postings: lf("Payment Posting", [f("sponsor", "Sponsor", "text")]),
  insurance_pay_type_changes: lf("P.Sale Change Pay Type", [f("payType", "Pay Type", "text")]),
  insurance_sponsor_bill_postings: lf("Sponsor Bill Posting", [
    f("sponsor", "Sponsor", "text"),
  ]),
  insurance_mis_reports: lr("Insurance MIS Report"),
  insurance_statements: lr("Insurance Statement"),
  insurance_authorization_letters: lr("Authorization Letter"),
  insurance_providers: m(
    "Provider",
    [
      f("contact", "Contact", "text"),
      f("phone", "Phone", "text"),
      f("email", "Email Id", "email"),
      f("address", "Address", "textarea"),
    ],
    { columns: ["code", "name", "phone", "email", "address", "status"] }
  ),
  insurance_companies: m(
    "Insurance Company",
    [
      f("contact", "Contact", "text"),
      f("phone", "Phone", "text"),
      f("email", "Email Id", "email"),
      f("address", "Address", "textarea"),
      f("providers", "Providers Mapping", "textarea"),
    ],
    { columns: ["code", "name", "phone", "email", "address", "status"] }
  ),
  insurance_plans: m(
    "Insurance Plan",
    [
      f("coverage", "Coverage", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "status"] }
  ),
  insurance_claim_categories: m(
    "Claim Category",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  insurance_claim_classes: m(
    "Claim Class",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  insurance_claim_heads: m(
    "Claim Head",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),

  /* ------------------------------ Pharmacy ---------------------------- */
  pharmacy_sales: e(
    "Sales Invoice",
    [
      f("invoiceNo", "Invoice No", "text", { required: true, default: "PH-2026-004471" }),
      f("uhid", "UHID", "text"),
      f("patientName", "Patient Name", "text", { required: true }),
      f("medicineName", "Medicine", "text", { required: true }),
      f("quantity", "Quantity", "number", { required: true }),
      f("unitPrice", "Unit Price", "currency", { required: true }),
      f("discount", "Discount", "currency"),
      f("netAmount", "Net Amount", "currency", { required: true }),
      f("salesType", "Sales Type", "select", {
        options: ["Cash", "Insurance", "Credit", "Sponsor"],
      }),
      f("paymentMode", "Payment Mode", "select", {
        options: ["Cash", "Card", "UPI", "Wallet"],
      }),
      f("invoiceDate", "Invoice Date", "date", { required: true }),
    ],
    {
      dateField: "invoiceDate",
      amountField: "netAmount",
      columns: ["invoiceNo", "patientName", "medicineName", "quantity", "netAmount", "invoiceDate"],
    }
  ),
  pharmacy_rx_sales: e(
    "Prescription-based Sales",
    [
      f("rxNo", "Prescription No", "text", { required: true }),
      f("invoiceNo", "Invoice No", "text", { required: true }),
      f("uhid", "UHID", "text"),
      f("patientName", "Patient Name", "text", { required: true }),
      f("doctor", "Doctor", "text"),
      f("medicineName", "Medicine", "text", { required: true }),
      f("quantity", "Quantity", "number", { required: true }),
      f("dosage", "Dosage", "text"),
      f("netAmount", "Net Amount", "currency"),
      f("date", "Date", "date", { required: true }),
    ],
    { dateField: "date", amountField: "netAmount" }
  ),
  pharmacy_patient_bills: e(
    "Patient Billing",
    [
      f("billNo", "Bill No", "text", { required: true }),
      f("uhid", "UHID", "text"),
      f("patientName", "Patient Name", "text", { required: true }),
      f("department", "Department", "select", { options: DEPARTMENTS }),
      f("medicineName", "Medicine", "text", { required: true }),
      f("quantity", "Quantity", "number", { required: true }),
      f("netAmount", "Net Amount", "currency", { required: true }),
      f("paymentMode", "Payment Mode", "select", {
        options: ["Cash", "Card", "UPI", "Insurance", "Credit"],
      }),
      f("billDate", "Bill Date", "date", { required: true }),
      f("status", "Status", "select", { options: ["Paid", "Partially Paid", "Unpaid"] }),
    ],
    { dateField: "billDate", amountField: "netAmount", badgeField: "status" }
  ),
  pharmacy_returns: e(
    "Returns",
    [
      f("returnNo", "Return No", "text", { required: true }),
      f("invoiceNo", "Invoice No", "text", { required: true }),
      f("uhid", "UHID", "text"),
      f("patientName", "Patient Name", "text"),
      f("medicineName", "Medicine", "text", { required: true }),
      f("quantity", "Quantity", "number", { required: true }),
      f("refundAmount", "Refund Amount", "currency", { required: true }),
      f("reason", "Reason", "textarea"),
      f("returnDate", "Return Date", "date", { required: true }),
    ],
    { dateField: "returnDate", amountField: "refundAmount" }
  ),
  discounts: e(
    "Discount",
    [
      f("code", "Code", "text", { required: true }),
      f("discountName", "Discount Name", "text", { required: true }),
      f("scope", "Scope", "select", { options: ["Store", "Item", "Patient", "Bill"] }),
      f("percentage", "Percentage (%)", "number", { required: true }),
      f("validFrom", "Valid From", "date"),
      f("validTo", "Valid To", "date"),
      f("status", "Status", "select", { options: ACTIVE }),
    ],
    { badgeField: "status" }
  ),
  payment_modes: e(
    "Payment Mode",
    [
      f("code", "Code", "text", { required: true }),
      f("modeName", "Mode", "select", {
        required: true,
        options: ["Cash", "Card", "UPI", "Wallet", "Insurance", "Credit", "Sponsor"],
      }),
      f("accountRef", "Account Reference", "text"),
      f("active", "Active", "select", { options: YES_NO }),
    ],
    { badgeField: "active" }
  ),
  purchase_invoices: e(
    "Purchase Invoice",
    [
      f("invoiceNo", "Invoice No", "text", { required: true }),
      f("supplier", "Supplier", "text", { required: true }),
      f("invoiceDate", "Invoice Date", "date", { required: true }),
      f("medicineName", "Item", "text", { required: true }),
      f("quantity", "Quantity", "number", { required: true }),
      f("unitPrice", "Unit Price", "currency", { required: true }),
      f("taxAmount", "Tax Amount", "currency"),
      f("totalAmount", "Total Amount", "currency", { required: true }),
      f("dueDate", "Due Date", "date"),
      f("status", "Status", "select", { options: ["Pending", "Approved", "Paid"] }),
    ],
    {
      dateField: "invoiceDate",
      amountField: "totalAmount",
      badgeField: "status",
      columns: ["invoiceNo", "supplier", "invoiceDate", "medicineName", "totalAmount", "status"],
    }
  ),
  purchase_returns: e(
    "Purchase Return",
    [
      f("returnNo", "Return No", "text", { required: true }),
      f("invoiceNo", "Invoice No", "text", { required: true }),
      f("supplier", "Supplier", "text", { required: true }),
      f("medicineName", "Item", "text", { required: true }),
      f("quantity", "Quantity", "number", { required: true }),
      f("refundAmount", "Refund Amount", "currency", { required: true }),
      f("reason", "Reason", "textarea"),
      f("returnDate", "Return Date", "date", { required: true }),
    ],
    { dateField: "returnDate", amountField: "refundAmount" }
  ),
  stock: e(
    "Stock",
    [
      f("itemCode", "Item Code", "text", { required: true }),
      f("medicineName", "Medicine", "text", { required: true }),
      f("batch", "Batch", "text"),
      f("store", "Store", "select", {
        options: ["Main Store", "Pharmacy", "Issue Counter", "Ward Stock"],
      }),
      f("quantity", "Quantity", "number", { required: true }),
      f("reorderLevel", "Reorder Level", "number"),
      f("unit", "Unit", "text"),
      f("lastUpdated", "Last Updated", "date"),
    ],
    {
      dateField: "lastUpdated",
      readOnly: true,
      columns: ["itemCode", "medicineName", "batch", "store", "quantity", "reorderLevel", "lastUpdated"],
    }
  ),
  stock_adjustments: e(
    "Stock Adjustment",
    [
      f("adjustmentNo", "Adjustment No", "text", { required: true }),
      f("itemCode", "Item Code", "text", { required: true }),
      f("medicineName", "Medicine", "text", { required: true }),
      f("batch", "Batch", "text"),
      f("adjustType", "Adjustment Type", "select", { options: ["Increase", "Decrease"] }),
      f("quantity", "Quantity", "number", { required: true }),
      f("reason", "Reason", "textarea", { required: true }),
      f("adjustedBy", "Adjusted By", "text"),
      f("adjustedAt", "Adjusted Date", "date", { required: true }),
    ],
    { dateField: "adjustedAt" }
  ),
  stock_transfers: e(
    "Stock Transfer",
    [
      f("transferNo", "Transfer No", "text", { required: true }),
      f("itemCode", "Item Code", "text", { required: true }),
      f("medicineName", "Medicine", "text", { required: true }),
      f("batch", "Batch", "text"),
      f("quantity", "Quantity", "number", { required: true }),
      f("fromStore", "From Store", "select", {
        options: ["Main Store", "Pharmacy", "Issue Counter", "Ward Stock"],
      }),
      f("toStore", "To Store", "select", {
        options: ["Main Store", "Pharmacy", "Issue Counter", "Ward Stock"],
      }),
      f("requestedBy", "Requested By", "text"),
      f("transferDate", "Transfer Date", "date", { required: true }),
      f("status", "Status", "select", { options: ["Requested", "In Transit", "Received"] }),
    ],
    { dateField: "transferDate", badgeField: "status" }
  ),
  item_balances: e(
    "Item Balance",
    [
      f("itemCode", "Item Code", "text", { required: true }),
      f("medicineName", "Medicine", "text", { required: true }),
      f("batch", "Batch", "text"),
      f("openingQty", "Opening Qty", "number"),
      f("receivedQty", "Received Qty", "number"),
      f("issuedQty", "Issued Qty", "number"),
      f("closingQty", "Closing Qty", "number"),
      f("balanceDate", "Balance Date", "date"),
    ],
    { dateField: "balanceDate", readOnly: true }
  ),
  batches: e(
    "Batch",
    [
      f("batchNo", "Batch No", "text", { required: true }),
      f("medicineName", "Medicine", "text", { required: true }),
      f("manufacturer", "Manufacturer", "text"),
      f("expiryDate", "Expiry Date", "date", { required: true }),
      f("quantity", "Quantity", "number", { required: true }),
      f("purchasePrice", "Purchase Price", "currency"),
      f("mrp", "MRP", "currency"),
      f("store", "Store", "select", {
        options: ["Main Store", "Pharmacy", "Issue Counter", "Ward Stock"],
      }),
    ],
    { dateField: "expiryDate", amountField: "mrp" }
  ),
  pharmacy_payments: e(
    "Payment",
    [
      f("paymentNo", "Payment No", "text", { required: true }),
      f("invoiceNo", "Invoice No", "text", { required: true }),
      f("payerName", "Payer", "text", { required: true }),
      f("mode", "Mode", "select", {
        options: ["Cash", "Card", "UPI", "Wallet", "Insurance", "Credit"],
      }),
      f("amount", "Amount", "currency", { required: true }),
      f("paidAt", "Paid Date", "date", { required: true }),
      f("status", "Status", "select", { options: ["Received", "Pending", "Reversed"] }),
    ],
    { dateField: "paidAt", amountField: "amount", badgeField: "status" }
  ),
  pharmacy_collections: e(
    "Collection",
    [
      f("collectionNo", "Collection No", "text", { required: true }),
      f("uhid", "UHID", "text"),
      f("patientName", "Payer", "text", { required: true }),
      f("invoiceNo", "Invoice No", "text"),
      f("amount", "Amount", "currency", { required: true }),
      f("mode", "Mode", "select", { options: ["Cash", "Card", "UPI", "Wallet"] }),
      f("collectedBy", "Collected By", "text"),
      f("collectedAt", "Collected Date", "date", { required: true }),
    ],
    { dateField: "collectedAt", amountField: "amount", readOnly: true }
  ),
  pharmacy_outstanding: e(
    "Outstanding",
    [
      f("refNo", "Reference No", "text", { required: true }),
      f("uhid", "UHID", "text"),
      f("patientName", "Patient", "text", { required: true }),
      f("invoiceNo", "Invoice No", "text"),
      f("outstandingAmount", "Outstanding", "currency", { required: true }),
      f("dueDate", "Due Date", "date"),
      f("ageDays", "Age (Days)", "number"),
      f("bucket", "Bucket", "select", { options: ["0-30", "31-60", "60+"] }),
    ],
    { dateField: "dueDate", amountField: "outstandingAmount", readOnly: true, badgeField: "bucket" }
  ),
  medicines: e(
    "Medicine",
    [
      f("code", "Item Code", "text", { required: true }),
      f("medicineName", "Medicine Name", "text", { required: true }),
      f("generic", "Generic", "text", { required: true }),
      f("manufacturer", "Manufacturer", "text", { required: true }),
      f("category", "Category", "select", {
        options: ["Tablet", "Capsule", "Syrup", "Injection", "Ointment", "Drops"],
      }),
      f("unit", "Unit", "text"),
      f("mrp", "MRP", "currency", { required: true }),
      f("status", "Status", "select", { options: ACTIVE }),
    ],
    {
      badgeField: "status",
      columns: ["code", "medicineName", "generic", "manufacturer", "category", "mrp", "status"],
    }
  ),
  manufacturers: e(
    "Manufacturer",
    [
      f("code", "Code", "text", { required: true }),
      f("manufacturerName", "Manufacturer Name", "text", { required: true }),
      f("contactPerson", "Contact Person", "text"),
      f("phone", "Phone", "text"),
      f("email", "Email", "email"),
      f("city", "City", "text"),
      f("status", "Status", "select", { options: ACTIVE }),
    ],
    { badgeField: "status" }
  ),
  suppliers: e(
    "Supplier",
    [
      f("code", "Code", "text", { required: true }),
      f("supplierName", "Supplier Name", "text", { required: true }),
      f("contactPerson", "Contact Person", "text"),
      f("phone", "Phone", "text"),
      f("email", "Email", "email"),
      f("city", "City", "text"),
      f("gstNo", "GST No", "text"),
      f("status", "Status", "select", { options: ACTIVE }),
    ],
    { badgeField: "status" }
  ),
  generics: e(
    "Generic",
    [
      f("code", "Code", "text", { required: true }),
      f("genericName", "Generic Name", "text", { required: true }),
      f("therapeuticClass", "Therapeutic Class", "text"),
      f("status", "Status", "select", { options: ACTIVE }),
    ],
    { badgeField: "status" }
  ),
  item_categories: e(
    "Category",
    [
      f("code", "Code", "text", { required: true }),
      f("categoryName", "Category Name", "text", { required: true }),
      f("description", "Description", "textarea"),
      f("status", "Status", "select", { options: ACTIVE }),
    ],
    { badgeField: "status" }
  ),
  units: e(
    "Unit",
    [
      f("code", "Code", "text", { required: true }),
      f("unitName", "Unit Name", "text", { required: true }),
      f("description", "Description", "textarea"),
    ],
    {}
  ),
  taxes: e(
    "Tax",
    [
      f("code", "Code", "text", { required: true }),
      f("taxName", "Tax Name", "text", { required: true }),
      f("rate", "Rate (%)", "number", { required: true }),
      f("status", "Status", "select", { options: ACTIVE }),
    ],
    { badgeField: "status" }
  ),

  /* --------------------------- Pharmacy Sales ------------------------- */
  pharmacy_cash_sales: lf("Cash Sale", [f("amount", "Amount", "currency")]),
  pharmacy_write_offs: lf("Pharmacy Write Off", [f("amount", "Amount", "currency")]),
  pharmacy_sales_returns: lf("Sales Return", [f("amount", "Amount", "currency")]),
  pharmacy_sponsor_settlements: lf("Sponsor Settlement", [f("sponsor", "Sponsor", "text")]),
  pharmacy_patient_advances: lf("Patient Advance", [f("amount", "Amount", "currency")]),
  pharmacy_sales_postings: lf("Sales Posting", []),
  pharmacy_postings: lf("Pharmacy Posting", []),
  pharmacy_collection_handovers: lf("Collection HandOver", [f("amount", "Amount", "currency")]),
  pharmacy_pay_mode_changes: lf("Change Receipt Pay Mode", [f("payMode", "Pay Mode", "text")]),

  /* -------------------------- Pharmacy Purchase ----------------------- */
  pharmacy_cash_purchases: lf("Cash Purchase", [f("supplier", "Supplier", "text")]),
  pharmacy_purchase_requests: lf("Purchase Request", [f("itemName", "Item", "text")]),
  pharmacy_purchase_orders: lf("Purchase Order", [f("supplier", "Supplier", "text")]),
  pharmacy_goods_receipts: lf("Goods Receipt", [f("supplier", "Supplier", "text")]),
  pharmacy_invoice_approvals: lf("Invioce Approval", [f("supplier", "Supplier", "text")]),
  pharmacy_purchase_returns: lf("Purchase Return", [f("supplier", "Supplier", "text")]),
  pharmacy_po_approvals: lf("Purchase Order Approval", [f("supplier", "Supplier", "text")]),

  /* ------------------------- Pharmacy Inventory ----------------------- */
  pharmacy_store_indents: lf("Store Indent", [f("itemName", "Item", "text")]),
  pharmacy_stock_takings: lf("Stock Taking", []),
  pharmacy_item_acceptances: lf("Item Acceptance", [f("itemName", "Item", "text")]),
  pharmacy_item_consumptions: lf("Item Consumption", [f("itemName", "Item", "text")]),
  pharmacy_stock_day_ends: lf("Stock Day End", []),
  pharmacy_item_transfers: lf("Item Transfer", [f("itemName", "Item", "text")]),

  /* -------------------------- Pharmacy Finance ------------------------ */
  pharmacy_receipts: lf("Receipt", [f("amount", "Amount", "currency")]),
  pharmacy_supplier_invoices: lf("Supplier Invoice", [f("supplier", "Supplier", "text")]),
  pharmacy_supplier_settlements: lf("Supplier Settlement", [f("supplier", "Supplier", "text")]),
  pharmacy_supplier_debit_notes: lf("Supplier DebitNote", [f("supplier", "Supplier", "text")]),
  pharmacy_supplier_credit_notes: lf("Supplier CreditNote", [f("supplier", "Supplier", "text")]),
  pharmacy_contra_entries: lf("Contra Entry", [f("amount", "Amount", "currency")]),
  pharmacy_petty_cash: lf("Petty Cash", [f("amount", "Amount", "currency")]),
  pharmacy_finance_postings: lf("Posting", []),
  pharmacy_cash_books: lf("Cash Book", []),
  pharmacy_day_books: lf("Day Book", []),
  pharmacy_gl_accounts: m("GL Account"),

  /* -------------------------- Pharmacy Reports ------------------------ */
  pharmacy_excel_exports: lr("Pharmacy Excel Export"),
  pharmacy_slow_moving_item: lr("Slow Moving Item"),
  pharmacy_fast_moving_item: lr("Fast Moving Item"),
  pharmacy_sales_reports: lr("Sales Report"),
  pharmacy_sales_collections: lr("Sales Collection"),
  pharmacy_purchase_reports: lr("Purchase Report"),
  pharmacy_supplier_os: lr("Supplier OS"),
  pharmacy_sponsor_collections: lr("SponsorWise Collection"),
  pharmacy_purchase_by_items: lr("Purchase By Item"),
  pharmacy_tracking_reports: lr("Tracking Report"),
  pharmacy_gst_reports: lr("GST Report"),
  pharmacy_item_movements: lr("Item Movement"),
  pharmacy_item_replenishments: lr("Item Replenishment"),
  pharmacy_item_expiries: lr("Item Expiry"),
  pharmacy_stock_lists: lr("Stock List"),
  pharmacy_cash_sale_by_bills: lr("CashSale By Bill"),
  pharmacy_cash_sale_by_items: lr("CashSale By Item"),
  pharmacy_analysis_reports: lr("Analysis Report"),
  pharmacy_expense_summaries: lr("Expense Summary"),
  pharmacy_customer_os: lr("Customer OS"),

  /* --------------------------- Pharmacy Master ------------------------ */
  pharmacy_customers: m(
    "Customer",
    [
      f("address", "Address", "textarea"),
      f("phone", "Phone", "text"),
      f("email", "Email id", "email"),
    ],
    { columns: ["code", "name", "address", "phone", "email", "status"] }
  ),
  pharmacy_suppliers: m(
    "Supplier",
    [
      f("contact", "Contact", "text"),
      f("address", "Address", "textarea"),
      f("phone", "Phone", "text"),
      f("email", "Email id", "email"),
    ],
    { columns: ["code", "name", "address", "phone", "email", "status"] }
  ),
  pharmacy_supplier_gls: m(
    "Supplier GL",
    [
      f("supplierCode", "Supplier Code", "text"),
      f("supplierName", "Supplier Name", "text"),
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
      f("associateAddress", "Associate Address", "textarea"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["supplierCode", "supplierName", "accountNumber", "accountName", "status"] }
  ),
  pharmacy_manufacturers: m(
    "Manufacturer",
    [
      f("address", "Address", "textarea"),
      f("phone", "Phone", "text"),
      f("email", "Email id", "email"),
    ],
    { columns: ["code", "name", "address", "phone", "email", "status"] }
  ),
  pharmacy_generic_names: m(
    "Generic Name",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  pharmacy_items: m(
    "Item Master",
    [
      f("itemType", "Item Type", "text"),
      f("itemGroup", "Item Group", "text"),
      f("itemClass", "Item Class", "text"),
      f("unitOfMeasure", "Unit of Measure", "text"),
      f("brand", "Brand", "text"),
      f("storageLocation", "Storage Location", "text"),
      f("type", "Type", "text"),
      f("genericName", "Generic Name", "text"),
      f("rate", "Rate", "currency"),
      f("supplier", "Supplier", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "itemType", "itemGroup", "rate", "status"] }
  ),
  pharmacy_stock_registers: m(
    "Stock Register",
    [
      f("itemCode", "Item Code", "text"),
      f("itemName", "Item", "text"),
      f("itemType", "Item Type", "text"),
      f("itemGroup", "Item Group", "text"),
      f("quantity", "Quantity", "number"),
    ],
    { columns: ["itemCode", "itemName", "itemType", "itemGroup", "quantity"] }
  ),
  pharmacy_store_wise_registers: m(
    "Store Wise Register",
    [
      f("storeCode", "Store Code", "text"),
      f("storeName", "Store Name", "text"),
      f("itemName", "Item", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["storeCode", "storeName", "itemName", "status"] }
  ),
  pharmacy_opening_stocks: e(
    "Opening Stock",
    [
      f("itemName", "Item", "text", { required: true }),
      f("quantity", "Quantity", "number", { required: true }),
      f("date", "Date", "date", { required: true }),
    ],
    { dateField: "date" }
  ),
  pharmacy_chart_of_accounts: m(
    "Chart of Account",
    [
      f("accountGroup", "Account Group", "text"),
      f("accountNumber", "Account No.", "text"),
      f("accountType", "Account Type", "text"),
      f("currency", "Currency", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "accountGroup", "accountNumber", "accountType", "status"] }
  ),
  pharmacy_gls: m(
    "Pharmacy GL",
    [
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
    ],
    { columns: ["accountNumber", "accountName"] }
  ),
  pharmacy_doctor_store_allocations: m(
    "Doctor Store Allocation",
    [
      f("doctor", "Doctor", "text"),
      f("store", "Store", "text"),
    ],
    { columns: ["code", "name", "doctor", "store"] }
  ),

  /* ------------------------ Pharmacy Setup - Item --------------------- */
  pharmacy_item_classes: m(
    "Item Class",
    [
      f("parentCode", "Parent Code", "text"),
      f("parentLabel", "Parent Label", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "parentLabel", "status"] }
  ),
  pharmacy_drug_item_classes: m(
    "Drug Item Class",
    [
      f("parentCode", "Parent Code", "text"),
      f("parentLabel", "Parent Label", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "parentLabel", "status"] }
  ),
  pharmacy_drug_types: m(
    "Drug Type",
    [
      f("parentCode", "Parent Code", "text"),
      f("parentName", "Parent Name", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "parentName", "status"] }
  ),
  pharmacy_storage_types: m(
    "Storage Type",
    [
      f("itemCode", "Item Code", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "itemCode", "status"] }
  ),
  pharmacy_pregnancy_classes: m(
    "Pregnancy Class",
    [
      f("itemCode", "Item Code", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "itemCode", "status"] }
  ),
  pharmacy_therapeutic_classes: m(
    "Therapeutic Class",
    [
      f("itemCode", "Item Code", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "itemCode", "status"] }
  ),
  pharmacy_routes: m(
    "Route",
    [
      f("itemCode", "Item Code", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "itemCode", "status"] }
  ),

  /* --------------------- Pharmacy Setup - Inventory ------------------- */
  pharmacy_stores: m(
    "Store",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  pharmacy_storage_locations: m(
    "Storage Location",
    [
      f("storeCode", "Store Code", "text"),
      f("storeName", "Store Name", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "storeName", "status"] }
  ),

  /* ---------------------- Pharmacy Setup - Finance -------------------- */
  pharmacy_periods: m(
    "Period",
    [
      f("fiscalYear", "Fiscal Year", "text"),
      f("periodTypeCode", "PeriodType Code", "text"),
      f("periodTypeName", "PeriodType Name", "text"),
      f("startDate", "Start Date", "date"),
      f("endDate", "End Date", "date"),
      f("isCurrentPeriod", "Is Current Period", "select", { options: YES_NO }),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "fiscalYear", "startDate", "endDate", "isCurrentPeriod", "status"] }
  ),
  pharmacy_instrument_types: m(
    "Instrument Type",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  pharmacy_instrument_type_gl_assos: m(
    "Instrument Type GL Asso",
    [
      f("instrumentType", "Instrument Type", "text"),
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
      f("projectType", "Project Type", "text"),
      f("associateCode", "Associate Code", "text"),
      f("associateName", "Associate Name", "text"),
      f("associateAddress", "Associate Address", "textarea"),
      f("chargeType", "Charge Type", "text"),
      f("percentage", "Percentage", "number"),
    ],
    { columns: ["instrumentType", "accountNumber", "accountName", "chargeType", "percentage", "status"] }
  ),
  pharmacy_currencies: m(
    "Currency",
    [
      f("countryCode", "Country Code", "text"),
      f("countryName", "Country Name", "text"),
      f("prefix", "Prefix", "text"),
      f("suffix", "Suffix", "text"),
      f("precision", "Precision", "number"),
      f("format", "Format", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "countryName", "format", "status"] }
  ),

  /* ------------------------------- Optical ---------------------------- */
  optical_sales: e(
    "Optical Sales Invoice",
    [
      f("invoiceNo", "Invoice No", "text", { required: true }),
      f("customerName", "Customer", "text", { required: true }),
      f("phone", "Phone", "text"),
      f("itemDescription", "Item", "text", { required: true }),
      f("lensType", "Lens Type", "select", {
        options: ["Single Vision", "Bifocal", "Progressive", "Zero Power"],
      }),
      f("quantity", "Quantity", "number", { required: true }),
      f("netAmount", "Net Amount", "currency", { required: true }),
      f("paymentMode", "Payment Mode", "select", { options: ["Cash", "Card", "UPI"] }),
      f("invoiceDate", "Invoice Date", "date", { required: true }),
    ],
    { dateField: "invoiceDate", amountField: "netAmount" }
  ),
  optical_customers: e(
    "Customer",
    [
      f("customerCode", "Customer Code", "text", { required: true }),
      f("customerName", "Customer Name", "text", { required: true }),
      f("phone", "Phone", "text", { required: true }),
      f("email", "Email", "email"),
      f("prescriptionNo", "Prescription No", "text"),
      f("lastVisit", "Last Visit", "date"),
      f("status", "Status", "select", { options: ACTIVE }),
    ],
    { dateField: "lastVisit", badgeField: "status" }
  ),
  optical_manufacturers: e(
    "Optical Manufacturer",
    [
      f("code", "Code", "text", { required: true }),
      f("manufacturerName", "Manufacturer Name", "text", { required: true }),
      f("brand", "Brand", "text"),
      f("country", "Country", "text"),
      f("status", "Status", "select", { options: ACTIVE }),
    ],
    { badgeField: "status" }
  ),

  /* --------------------------- Optical (new) -------------------------- */
  optical_sales_orders: lf("Sales Order", [f("amount", "Amount", "currency")]),
  optical_sales_returns: lf("Sales Return", [f("amount", "Amount", "currency")]),
  optical_sales_collections: lf("Sales Collection", [f("amount", "Amount", "currency")]),
  optical_due_collections: lf("Due Collection", [f("amount", "Amount", "currency")]),
  optical_patient_due_collections: lf("Patient Due Collection", [
    f("amount", "Amount", "currency"),
  ]),
  optical_copy_documents: lf("Copy Document", []),
  optical_cash_purchases: lf("Cash Purchase", [f("supplier", "Supplier", "text")]),
  optical_purchase_orders: lf("Purchase Order", [f("supplier", "Supplier", "text")]),
  optical_pur_invoices: lf("PurInvoice Direct", [f("supplier", "Supplier", "text")]),
  optical_invoice_approvals: lf("Invoice Approval", [f("supplier", "Supplier", "text")]),
  optical_purchase_returns: lf("Purchase Return", [f("supplier", "Supplier", "text")]),
  optical_intends: lf("Intend", [f("itemName", "Item", "text")]),
  optical_goods_issues: lf("Goods Issue", [f("itemName", "Item", "text")]),
  optical_store_returns: lf("Stores Return", [f("itemName", "Item", "text")]),
  optical_supplier_invoices: lf("Supplier Invoice", [f("supplier", "Supplier", "text")]),
  optical_payments: lf("Payment", [f("amount", "Amount", "currency")]),
  optical_supplier_settlements: lf("Supplier Settlement", [f("supplier", "Supplier", "text")]),
  optical_supplier_debit_notes: lf("Supplier DebitNote", [f("supplier", "Supplier", "text")]),
  optical_postings: lf("Posting", []),
  optical_suppliers: m(
    "Optical Supplier",
    [
      f("contact", "Contact", "text"),
      f("address", "Address", "textarea"),
      f("phone", "Phone", "text"),
      f("email", "Email id", "email"),
    ],
    { columns: ["code", "name", "address", "phone", "email", "status"] }
  ),
  optical_supplier_gls: m(
    "Optical Supplier GL",
    [
      f("supplierCode", "Supplier Code", "text"),
      f("supplierName", "Supplier Name", "text"),
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
      f("associateAddress", "Associate Address", "textarea"),
    ],
    { columns: ["supplierCode", "supplierName", "accountNumber", "accountName", "status"] }
  ),
  optical_items: m(
    "Optical Item",
    [
      f("itemType", "Item Type", "text"),
      f("itemGroup", "Item Group", "text"),
      f("itemClass", "Item Class", "text"),
      f("unitOfMeasure", "Unit of Measure", "text"),
      f("brand", "Brand", "text"),
      f("storageLocation", "Storage Location", "text"),
      f("genericName", "Generic Name", "text"),
      f("rate", "Rate", "currency"),
      f("supplier", "Supplier", "text"),
    ],
    { columns: ["code", "name", "itemType", "itemGroup", "brand", "rate", "status"] }
  ),
  optical_stock_registers: m(
    "Optical Stock Register",
    [
      f("itemCode", "Item Code", "text"),
      f("itemName", "Item", "text"),
      f("itemType", "Item Type", "text"),
      f("itemGroup", "Item Group", "text"),
      f("quantity", "Quantity", "number"),
    ],
    { columns: ["itemCode", "itemName", "itemType", "itemGroup", "quantity"] }
  ),
  optical_opening_stocks: e(
    "Optical Opening Stock",
    [
      f("itemName", "Item", "text", { required: true }),
      f("quantity", "Quantity", "number", { required: true }),
      f("date", "Date", "date", { required: true }),
    ],
    { dateField: "date" }
  ),
  optical_chart_of_accounts: m(
    "Optical Chart of Account",
    [
      f("accountGroup", "Account Group", "text"),
      f("accountNumber", "Account No.", "text"),
      f("accountType", "Account Type", "text"),
      f("currency", "Currency", "text"),
    ],
    { columns: ["code", "name", "accountGroup", "accountNumber", "accountType", "status"] }
  ),
  optical_item_classes: m(
    "Optical Item Class",
    [
      f("parentCode", "Parent Code", "text"),
      f("parentLabel", "Parent Label", "text"),
    ],
    { columns: ["code", "name", "parentLabel", "status"] }
  ),
  optical_brands: m(
    "Optical Brand",
    [f("manufacturer", "Manufacturer", "text")],
    { columns: ["code", "name", "manufacturer", "status"] }
  ),
  optical_stores: m("Optical Store", [], { columns: ["code", "name", "status"] }),
  optical_storage_locations: m(
    "Optical Storage Location",
    [
      f("storeCode", "Store Code", "text"),
      f("storeName", "Store Name", "text"),
    ],
    { columns: ["code", "name", "storeName", "status"] }
  ),
  optical_periods: m(
    "Optical Period",
    [
      f("fiscalYear", "Fiscal Year", "text"),
      f("periodTypeCode", "PeriodType Code", "text"),
      f("startDate", "Start Date", "date"),
      f("endDate", "End Date", "date"),
      f("isCurrentPeriod", "Is Current Period", "select", { options: YES_NO }),
    ],
    { columns: ["code", "name", "fiscalYear", "startDate", "endDate", "isCurrentPeriod", "status"] }
  ),
  optical_instrument_types: m(
    "Optical Instrument Type",
    [],
    { columns: ["code", "name", "status"] }
  ),
  optical_instrument_type_gl_assos: m(
    "Optical Instrument Type GL Asso",
    [
      f("instrumentType", "Instrument Type", "text"),
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
      f("chargeType", "Charge Type", "text"),
      f("percentage", "Percentage", "number"),
    ],
    { columns: ["instrumentType", "accountNumber", "accountName", "chargeType", "percentage", "status"] }
  ),
  optical_currencies: m(
    "Optical Currency",
    [
      f("countryCode", "Country Code", "text"),
      f("countryName", "Country Name", "text"),
      f("prefix", "Prefix", "text"),
      f("suffix", "Suffix", "text"),
      f("precision", "Precision", "number"),
      f("format", "Format", "text"),
    ],
    { columns: ["code", "name", "countryName", "format", "status"] }
  ),

  /* ------------------------------ Transport --------------------------- */
  transport_tripsheets: lf("TripSheet", [
    f("vehicle", "Vehicle", "text"),
    f("driver", "Driver", "text"),
  ]),
  transport_ambulance_tripsheets: lf("TripSheet Ambulance", [
    f("vehicle", "Vehicle", "text"),
  ]),
  transport_vehicle_expenses: lf("Vehicle Expense", [f("amount", "Amount", "currency")]),
  transport_tripsheet_reports: lr("TripSheet Register Report"),
  transport_mis_reports: lr("Ambulance MIS Report"),
  transport_drivers: m(
    "Driver",
    [
      f("phone", "Phone", "text"),
      f("email", "Email Id", "email"),
      f("address", "Address", "textarea"),
    ],
    { columns: ["code", "name", "phone", "email", "status"] }
  ),
  transport_vehicles: m(
    "Vehicle",
    [
      f("regNo", "Registration No", "text"),
      f("vehicleType", "Vehicle Type", "text"),
      f("supplier", "Supplier", "text"),
      f("driver", "Driver", "text"),
      f("fcDate", "FC Date", "date"),
    ],
    { columns: ["code", "name", "regNo", "vehicleType", "driver", "status"] }
  ),
  transport_travel_places: m(
    "Travel Place",
    [
      f("city", "City", "text"),
      f("locality", "Locality", "text"),
      f("rateBase", "Rate Base", "text"),
      f("fixedRate", "Fixed Rate", "currency"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "city", "fixedRate", "status"] }
  ),
  transport_vehicle_types: m(
    "Vehicle Type",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  transport_expense_types: m(
    "Expense Type",
    [
      f("expenseGroup", "Expense Group", "text"),
      f("assetClass", "Asset Class", "text"),
      f("unitOfMeasure", "Unit of Measure", "text"),
      f("rate01", "Rate 01", "currency"),
      f("rate02", "Rate 02", "currency"),
      f("rate03", "Rate 03", "currency"),
      f("rate04", "Rate 04", "currency"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "expenseGroup", "rate01", "status"] }
  ),

  /* ---------------------------- House Keeping ------------------------- */
  hks_linen_issues: lf("Linen Issue", [f("itemName", "Linen", "text")]),
  hks_linen_returns: lf("Linen Return", [f("itemName", "Linen", "text")]),
  hks_linen_transfers: lf("Linen Transfer", [f("itemName", "Linen", "text")]),
  hks_laundry_dispatches: lf("Laundry Dispatch", [f("itemName", "Linen", "text")]),
  hks_laundry_receipts: lf("Laundry Receipt", [f("itemName", "Linen", "text")]),
  hks_petty_cash_expenses: lf("Petty Cash Expense", [f("amount", "Amount", "currency")]),

  /* ----------------------------- Blood Bank --------------------------- */
  bb_service_requests: lf("Service Request", [f("service", "Service", "text")]),
  bb_donation_camps: lf("Donation Camp", [f("venue", "Venue", "text")]),
  bb_donor_registrations: lf("Donor Registration", [f("bloodGroup", "Blood Group", "text")]),
  bb_screenings: lf("Screening", [f("result", "Result", "text")]),
  bb_donor_collections: lf("Donor Blood Collection", [f("units", "Units", "number")]),
  bb_component_separations: lf("Component Separation", [f("component", "Component", "text")]),
  bb_blood_requests: lf("Blood Request", [f("bloodGroup", "Blood Group", "text")]),
  bb_blood_dispatches: lf("Blood Dispatch", [f("bloodGroup", "Blood Group", "text")]),
  bb_hospital_requests: lf("Request By Hospital", [f("hospital", "Hospital", "text")]),
  bb_hospital_dispatches: lf("Dispatch To Hospital", [f("hospital", "Hospital", "text")]),
  bb_transfusion_reactions: lf("Transfusion Reaction", [f("reaction", "Reaction", "textarea")]),
  bb_donors: m(
    "Donor",
    [
      f("bloodGroup", "Blood Group", "text"),
      f("mobile", "Mobile Phone", "text"),
      f("phone", "Phone", "text"),
      f("address", "Address", "textarea"),
    ],
    { columns: ["code", "name", "bloodGroup", "mobile", "status"] }
  ),
  bb_hospitals: m(
    "Hospital",
    [
      f("contact", "Contact", "text"),
      f("phone", "Phone", "text"),
      f("address", "Address", "textarea"),
    ],
    { columns: ["code", "name", "phone", "address", "status"] }
  ),
  bb_organizations: m(
    "Organization",
    [
      f("contact", "Contact", "text"),
      f("phone", "Phone", "text"),
      f("address", "Address", "textarea"),
    ],
    { columns: ["code", "name", "phone", "address", "status"] }
  ),
  bb_blood_banks: m(
    "Blood Bank",
    [
      f("location", "Location", "text"),
      f("phone", "Phone", "text"),
      f("address", "Address", "textarea"),
    ],
    { columns: ["code", "name", "phone", "address", "status"] }
  ),
  bb_blood_stocks: m(
    "Blood Stock",
    [
      f("bloodGroupCode", "Blood Group Code", "text"),
      f("componentCode", "Component Code", "text"),
      f("units", "Units", "number"),
    ],
    { columns: ["bloodGroupCode", "componentCode", "units", "status"] }
  ),
  bb_blood_bags: m(
    "Blood Bag",
    [
      f("bagType", "Bag Type", "text"),
      f("bloodGroupCode", "Blood Group Code", "text"),
      f("componentCode", "Component Code", "text"),
      f("batchNumber", "Batch Number", "text"),
      f("batchDate", "Batch Date", "date"),
      f("expiryDate", "Expiry Date", "date"),
      f("storageLocation", "Storage Location", "text"),
    ],
    { columns: ["bloodGroupCode", "componentCode", "batchNumber", "expiryDate", "status"] }
  ),
  bb_blood_groups: m(
    "Blood Group",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  bb_blood_components: m(
    "Blood Component",
    [f("rate", "Rate", "currency")],
    { columns: ["code", "name", "rate", "status"] }
  ),
  bb_crossmatches: m(
    "BloodGroup CrossMatch",
    [
      f("donorGroupCode", "Donor Group Code", "text"),
      f("componentCode", "Component Code", "text"),
      f("recipientGroupCode", "Recipient Group Code", "text"),
    ],
    { columns: ["donorGroupCode", "componentCode", "recipientGroupCode", "status"] }
  ),

  /* -------------------------------- Diet ------------------------------ */
  diet_routine_deliveries: lf("Diet Routine & Delivery", [f("diet", "Diet", "text")]),
  diet_orders: lf("Diet Order", [f("diet", "Diet", "text")]),
  diet_mass_creations: lf("Diet Mass Creation", [f("diet", "Diet", "text")]),
  diet_order_reports: lr("Diet Order Report"),
  diet_canteen_menus: m(
    "Canteen Menu",
    [
      f("rate", "Rate", "currency"),
      f("session", "Session", "text"),
      f("available", "Available", "select", { options: YES_NO }),
      f("items", "Items", "textarea"),
    ],
    { columns: ["code", "name", "rate", "session", "available", "status"] }
  ),

  /* -------------------------------- HRM ------------------------------- */
  employee_transactions: e(
    "Employee Transaction",
    [
      f("entryNo", "Entry No", "text", { required: true }),
      f("employeeId", "Employee ID", "text", { required: true }),
      f("employeeName", "Employee Name", "text", { required: true }),
      f("transactionType", "Transaction Type", "select", {
        required: true,
        options: ["Joining", "Transfer", "Increment", "Leave", "Exit"],
      }),
      f("effectiveDate", "Effective Date", "date", { required: true }),
      f("department", "Department", "select", { options: DEPARTMENTS }),
      f("remarks", "Remarks", "textarea"),
    ],
    { dateField: "effectiveDate" }
  ),
  employees: e(
    "Employee",
    [
      f("employeeCode", "Employee Code", "text", { required: true }),
      f("employeeName", "Employee Name", "text", { required: true }),
      f("department", "Department", "select", { options: DEPARTMENTS }),
      f("designation", "Designation", "text", { required: true }),
      f("joiningDate", "Joining Date", "date", { required: true }),
      f("phone", "Phone", "text"),
      f("status", "Status", "select", { options: ["Active", "On Leave", "Resigned"] }),
    ],
    { dateField: "joiningDate", badgeField: "status" }
  ),
  enterprises: e(
    "Enterprise",
    [
      f("code", "Code", "text", { required: true }),
      f("enterpriseName", "Enterprise Name", "text", { required: true }),
      f("industry", "Industry", "text"),
      f("city", "City", "text"),
      f("phone", "Phone", "text"),
      f("status", "Status", "select", { options: ACTIVE }),
    ],
    { badgeField: "status" }
  ),
  holiday_types: e(
    "Holiday Type",
    [
      f("code", "Code", "text", { required: true }),
      f("holidayName", "Holiday Name", "text", { required: true }),
      f("paid", "Paid", "select", { options: YES_NO }),
      f("description", "Description", "textarea"),
      f("status", "Status", "select", { options: ACTIVE }),
    ],
    { badgeField: "status" }
  ),
  holidays: e(
    "Holiday",
    [
      f("title", "Holiday Title", "text", { required: true }),
      f("holidayType", "Holiday Type", "text", { required: true }),
      f("fromDate", "From Date", "date", { required: true }),
      f("toDate", "To Date", "date", { required: true }),
      f("description", "Description", "textarea"),
    ],
    { dateField: "fromDate" }
  ),

  /* ------------------------------ Purchase ---------------------------- */
  purchase_transactions: e(
    "Purchase Transaction",
    [
      f("poNo", "PO Number", "text", { required: true }),
      f("supplier", "Supplier", "text", { required: true }),
      f("itemName", "Item", "text", { required: true }),
      f("quantity", "Quantity", "number", { required: true }),
      f("unitPrice", "Unit Price", "currency", { required: true }),
      f("totalAmount", "Total Amount", "currency", { required: true }),
      f("poDate", "PO Date", "date", { required: true }),
      f("status", "Status", "select", {
        options: ["Draft", "Issued", "Received", "Cancelled"],
      }),
    ],
    { dateField: "poDate", amountField: "totalAmount", badgeField: "status" }
  ),
  item_balance_updates: e(
    "Update Item Balance",
    [
      f("itemCode", "Item Code", "text", { required: true }),
      f("medicineName", "Medicine", "text", { required: true }),
      f("batch", "Batch", "text"),
      f("currentBalance", "Current Balance", "number", { required: true }),
      f("updatedBalance", "Updated Balance", "number", { required: true }),
      f("reason", "Reason", "textarea", { required: true }),
      f("updatedBy", "Updated By", "text"),
      f("updatedAt", "Updated Date", "date", { required: true }),
    ],
    { dateField: "updatedAt" }
  ),

  /* -------------------------------- Admin ----------------------------- */
  users: e(
    "User",
    [
      f("username", "Username", "text", { required: true }),
      f("name", "Full Name", "text", { required: true }),
      f("role", "Role", "select", { required: true, options: ROLES }),
      f("designation", "Designation", "text"),
      f("department", "Department", "select", { options: DEPARTMENTS }),
      f("email", "Email", "email"),
      f("password", "Password", "password", { required: true }),
      f("status", "Status", "select", { options: ["Active", "Suspended"] }),
    ],
    {
      badgeField: "status",
      sensitive: true,
      columns: ["username", "name", "role", "designation", "department", "status"],
    }
  ),
  roles: e(
    "Role",
    [
      f("roleName", "Role Name", "text", { required: true }),
      f("roleKey", "Role Key", "text", { required: true }),
      f("description", "Description", "textarea"),
      f("status", "Status", "select", { options: ACTIVE }),
    ],
    { badgeField: "status" }
  ),
  permissions: e(
    "Permission",
    [
      f("role", "Role", "select", { required: true, options: ROLES }),
      f("module", "Module", "text", { required: true }),
      f("view", "View", "select", { options: YES_NO }),
      f("create", "Create", "select", { options: YES_NO }),
      f("edit", "Edit", "select", { options: YES_NO }),
      f("delete", "Delete", "select", { options: YES_NO }),
    ],
    { readOnly: true }
  ),
  module_access: e(
    "Module Access",
    [
      f("role", "Role", "select", { required: true, options: ROLES }),
      f("module", "Module", "text", { required: true }),
      f("access", "Access", "select", { options: ["Granted", "Denied"] }),
    ],
    { readOnly: true, badgeField: "access" }
  ),
  menu_access: e(
    "Menu Access",
    [
      f("role", "Role", "select", { required: true, options: ROLES }),
      f("menu", "Menu", "text", { required: true }),
      f("access", "Access", "select", { options: ["Granted", "Denied"] }),
    ],
    { readOnly: true, badgeField: "access" }
  ),
  audit_logs: e(
    "Audit Log",
    [
      f("at", "Timestamp", "date", { required: true }),
      f("user", "User", "text", { required: true }),
      f("action", "Action", "select", {
        required: true,
        options: ["create", "update", "delete", "login", "logout", "export"],
      }),
      f("module", "Module", "text"),
      f("screen", "Screen", "text"),
      f("record", "Record", "text"),
      f("summary", "Summary", "text"),
      f("ip", "IP", "text"),
    ],
    {
      readOnly: true,
      dateField: "at",
      columns: ["at", "user", "action", "module", "screen", "record", "summary"],
    }
  ),
  system_configs: e(
    "System Configuration",
    [
      f("configKey", "Config Key", "text", { required: true }),
      f("configValue", "Config Value", "text", { required: true }),
      f("description", "Description", "textarea"),
      f("updatedBy", "Updated By", "text"),
      f("updatedAt", "Updated Date", "date"),
    ],
    { dateField: "updatedAt" }
  ),
  backups: e(
    "Backup",
    [
      f("backupNo", "Backup No", "text", { required: true }),
      f("takenAt", "Taken At", "date", { required: true }),
      f("type", "Type", "select", { options: ["Full", "Incremental"] }),
      f("sizeMB", "Size (MB)", "number"),
      f("status", "Status", "select", { options: ["Completed", "Failed", "Running"] }),
      f("initiatedBy", "Initiated By", "text"),
    ],
    { readOnly: true, dateField: "takenAt", badgeField: "status" }
  ),

  /* ----------------------------- HRM (new) ---------------------------- */
  ...forms([
    ["hrm_attendance", "Attendance"],
    ["hrm_loans", "Loan"],
    ["hrm_payrolls", "Payroll"],
    ["hrm_duty_rosters", "Duty Roaster"],
    ["hrm_leaves", "Leave"],
    ["hrm_leave_approvals", "Leave Approval"],
    ["hrm_leave_permissions", "Leave Permission"],
    ["hrm_leave_permission_approvals", "Leave Permission Approval"],
    ["hrm_payroll_postings", "PayRoll Posting"],
  ]),
  ...reports([
    ["hrm_payslip_reports", "PaySlip Report"],
    ["hrm_payadvice_reports", "PayAdvice Report"],
    ["hrm_staff_details", "Staff Detail"],
    ["hrm_salary_detail_reports", "Salary Detail Report"],
    ["hrm_attendance_register_reports", "AttendanceRegister Report"],
    ["hrm_excel_exports", "HRM Excel Export"],
  ]),
  ...masters([
    ["hrm_staff", "Staff"],
    ["hrm_staff_basics", "Staff Basic"],
    ["hrm_salaries", "Salary"],
    ["hrm_leave_balances", "Leave Balance"],
    ["hrm_leave_balance_histories", "Leave Balance History"],
    ["hrm_sites", "Site"],
    ["hrm_departments", "Department"],
    ["hrm_designations", "Designation"],
    ["hrm_shifts", "Shift"],
    ["hrm_holiday_types", "Holiday Type"],
    ["hrm_leave_types", "Leave Type"],
    ["hrm_localities", "Locality"],
    ["hrm_cities", "City"],
    ["hrm_districts", "District"],
    ["hrm_states", "State"],
    ["hrm_countries", "Country"],
    ["hrm_pay_heads", "PayHead"],
    ["hrm_loan_types", "Loan Type"],
    ["hrm_skill_types", "Skill Type"],
    ["hrm_skills", "Skill"],
    ["hrm_leave_categories", "Leave Category"],
    ["hrm_leave_eligibility_criteria", "Leave Eligibility Criteria"],
    ["hrm_leavetype_associations", "LeaveType Association"],
    ["hrm_ptax_definitions", "HRM PTax Definition"],
    ["hrm_attendance_system_assos", "Staff Attendance System Asso"],
    ["hrm_salary_accounts", "Salary Account"],
    ["hrm_staff_groups", "Staff Group"],
    ["hrm_payhead_gl_assos", "PayHead GL Association"],
    ["hrm_staff_gl_assos", "Staff GL Association"],
  ]),

  /* --------------------- HRM masters (legacy fields) ------------------ */
  hrm_staff: m(
    "Staff",
    [
      f("designation", "Designation", "text"),
      f("department", "Department", "text"),
      f("landLine", "Land Line", "text"),
      f("mobile", "Mobile", "text"),
      f("email", "Email Id", "email"),
      f("localAddress", "Local Address", "textarea"),
      f("sex", "Sex", "select", { options: SEX }),
      f("occupation", "Occupation", "text"),
    ],
    { columns: ["code", "name", "designation", "department", "mobile", "email", "status"] }
  ),
  hrm_staff_basics: m(
    "Staff Basic",
    [
      f("designation", "Designation", "text"),
      f("department", "Department", "text"),
      f("landLine", "Land Line", "text"),
      f("mobile", "Mobile", "text"),
      f("email", "Email Id", "email"),
      f("localAddress", "Local Address", "textarea"),
      f("sex", "Sex", "select", { options: SEX }),
      f("occupation", "Occupation", "text"),
    ],
    { columns: ["code", "name", "designation", "department", "mobile", "email", "status"] }
  ),
  hrm_salaries: m(
    "Salary",
    [
      f("designation", "Designation", "text"),
      f("department", "Department", "text"),
      f("mobile", "Mobile", "text"),
      f("email", "Email id", "email"),
      f("localAddress", "Local Address", "textarea"),
      f("sex", "Sex", "select", { options: SEX }),
      f("occupation", "Occupation", "text"),
      f("salary", "Salary", "currency"),
      f("dateFrom", "Date From", "date"),
    ],
    { columns: ["code", "name", "designation", "department", "salary", "dateFrom", "status"] }
  ),
  hrm_leave_balances: m(
    "Leave Balance",
    [
      f("associateCode", "Associate Code", "text"),
      f("associateName", "Associate Name", "text"),
      f("associateAddress", "Associate Address", "textarea"),
      f("leaveTypeCode", "LeaveType Code", "text"),
      f("leaveTypeLabel", "LeaveType Label", "text"),
      f("carriedForwardDays", "Carried Forward Days", "number"),
      f("availableDays", "Available Days", "number"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["associateCode", "associateName", "leaveTypeCode", "carriedForwardDays", "availableDays", "status"] }
  ),
  hrm_sites: m(
    "Site",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  hrm_departments: m(
    "Department",
    [
      f("parentCode", "Parent Code", "text"),
      f("parentName", "Parent Name", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "parentName", "status"] }
  ),
  hrm_designations: m(
    "Designation",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  hrm_shifts: m(
    "Shift",
    [
      f("startTime", "Start time", "text"),
      f("endTime", "End time", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "startTime", "endTime", "status"] }
  ),
  hrm_holiday_types: m(
    "Holiday Type",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  hrm_leave_types: m(
    "Leave Type",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  hrm_pay_heads: m(
    "PayHead",
    [
      f("headType", "Head Type", "text"),
      f("frequency", "Frequency", "text"),
      f("printInPaySlip", "Print In Pay Slip", "select", { options: YES_NO }),
      f("category", "Category", "text"),
      f("formula", "Formula", "text"),
      f("mandatory", "Mandatory", "select", { options: YES_NO }),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "headType", "frequency", "category", "status"] }
  ),
  hrm_loan_types: m(
    "Loan Type",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  hrm_skill_types: m(
    "Skill Type",
    [
      f("usageType", "Usage type", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "usageType", "status"] }
  ),
  hrm_skills: m(
    "Skill",
    [
      f("usageType", "Usage type", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "usageType", "status"] }
  ),
  hrm_leave_categories: m(
    "Leave Category",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  hrm_leave_eligibility_criteria: m(
    "Leave Eligibility Criteria",
    [
      f("leaveTypeCode", "Leave Type Code", "text"),
      f("leaveTypeLabel", "Leave Type Name", "text"),
      f("appConditionType", "App Condition Type", "text"),
      f("appConditionValue", "App Condition Value", "text"),
      f("completionFrequency", "Completion Frequency", "text"),
      f("completionUnit", "Completion Unit", "text"),
      f("eligibleDays", "Eligible Days", "number"),
      f("minimumDays", "Minimum Days", "number"),
      f("maximumDays", "Maximum Days", "number"),
      f("timesInLifeTime", "Times In Life Time", "number"),
      f("maxCarriedForwardDays", "Max Carried Forward Days", "number"),
      f("maxEligibleBalance", "Max Eligible Balance", "number"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["leaveTypeCode", "leaveTypeLabel", "eligibleDays", "minimumDays", "maximumDays", "status"] }
  ),
  hrm_leavetype_associations: m(
    "LeaveType Association",
    [
      f("baseLeaveTypeCode", "Base Leave Type Code", "text"),
      f("baseLeaveTypeLabel", "Base Leave Type Name", "text"),
      f("referenceLeaveTypeCode", "Reference Leave Type Code", "text"),
      f("referenceLeaveTypeLabel", "Reference Leave Type Name", "text"),
      f("conversionFactor", "Conversion Factor", "number"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["baseLeaveTypeCode", "baseLeaveTypeLabel", "referenceLeaveTypeCode", "conversionFactor", "status"] }
  ),
  hrm_ptax_definitions: m(
    "HRM PTax Definition",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  hrm_attendance_system_assos: m(
    "Staff Attendance System Asso",
    [
      f("designation", "Designation", "text"),
      f("department", "Department", "text"),
      f("machine", "Machine", "text"),
      f("asNumber", "AS Number", "text"),
    ],
    { columns: ["code", "name", "designation", "department", "machine", "asNumber", "status"] }
  ),
  hrm_salary_accounts: m("Salary Account"),
  hrm_staff_groups: m(
    "Staff Group",
    [
      f("subType", "SubType", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "subType", "status"] }
  ),
  hrm_payhead_gl_assos: m(
    "PayHead GL Association",
    [
      f("payheadCode", "Payhead Code", "text"),
      f("payheadLabel", "Payhead Name", "text"),
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
      f("associationType", "Association Type", "text"),
    ],
    { columns: ["payheadCode", "payheadLabel", "accountNumber", "accountName", "associationType"] }
  ),
  hrm_staff_gl_assos: m(
    "Staff GL Association",
    [
      f("designation", "Designation", "text"),
      f("department", "Department", "text"),
      f("mobile", "Mobile", "text"),
      f("email", "Email id", "email"),
      f("glName", "GL Name", "text"),
      f("asNumber", "AS Number", "text"),
    ],
    { columns: ["code", "name", "designation", "department", "glName", "asNumber", "status"] }
  ),
  hrm_localities: m(
    "Locality",
    [
      f("cityCode", "City Code", "text"),
      f("cityName", "City Name", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "cityName", "status"] }
  ),
  hrm_cities: m(
    "City",
    [
      f("districtCode", "District Code", "text"),
      f("districtName", "District Name", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "districtName", "status"] }
  ),
  hrm_districts: m(
    "District",
    [
      f("stateCode", "State Code", "text"),
      f("stateName", "State Name", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "stateName", "status"] }
  ),
  hrm_states: m(
    "State",
    [
      f("countryCode", "Country Code", "text"),
      f("countryName", "Country Name", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "countryName", "status"] }
  ),
  hrm_countries: m(
    "Country",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  hrm_leave_balance_histories: m(
    "Leave Balance History",
    [
      f("associateCode", "Associate Code", "text"),
      f("associateName", "Associate Name", "text"),
      f("associateAddress", "Associate Address", "textarea"),
      f("leaveTypeCode", "Leave Type Code", "text"),
      f("leaveTypeName", "Leave Type Name", "text"),
      f("carriedForwardDays", "Carried Forward Days", "number"),
      f("availableDays", "Available Days", "number"),
      f("serialNumber", "S.No", "number"),
    ],
    {
      columns: [
        "associateCode",
        "associateName",
        "leaveTypeName",
        "carriedForwardDays",
        "availableDays",
        "status",
      ],
    }
  ),

  /* --------------------------- Purchase (new) ------------------------- */
  ...forms([
    ["pur_cash_purchases", "Cash Purchase"],
    ["pur_requests", "Purchase Request"],
    ["pur_orders", "Purchase Order"],
    ["pur_goods_receipts", "Goods Receipt"],
    ["pur_invoice_approvals", "Invoice Approval"],
    ["pur_returns", "Purchase Return"],
    ["pur_order_trackings", "Purchase Order Tracking"],
    ["pur_order_approvals", "Purchase Order Approval"],
    ["pur_store_indents", "Store Indent"],
    ["pur_store_indent_approvals", "Store Indent Approval"],
    ["pur_item_transfers", "Item Transfer"],
    ["pur_item_acceptances", "Item Acceptance"],
    ["pur_item_receiveds", "Item Received"],
    ["pur_item_returns", "Item Return"],
    ["pur_item_return_acceptances", "Item Return Acceptance"],
    ["pur_item_consumptions", "Item Consumption"],
    ["pur_stock_takings", "Stock Taking"],
    ["pur_stock_registers", "Stock Register"],
    ["pur_stock_item_wise", "Stock Item Wise"],
    ["pur_stock_day_ends", "Stock Day End"],
    ["pur_item_balance_updates", "Update Item Balance"],
    ["pur_store_transfers", "Store To Store Transfer"],
  ]),
  ...reports([
    ["pur_excel_exports", "ExcelExport-Purchase"],
    ["pur_stock_detail_exports", "ExcelExport-Stock Detail"],
    ["pur_item_transfer_exports", "ExcelExport-Item Transfer"],
    ["pur_analysis_exports", "ExcelExport-Analysis Report"],
    ["pur_reports", "Purchase Report"],
    ["pur_po_tracking_reports", "PO Tracking Report"],
    ["pur_purchase_by_items", "Purchase By Item"],
    ["pur_item_replenishments", "Item Replenishment"],
    ["pur_item_expiries", "Item Expiry"],
    ["pur_supplier_rate_comparisons", "Supplier Wise Rate Comparision"],
    ["pur_stock_analysis_reports", "Stock Analysis Report"],
    ["pur_stock_validation_reports", "Stock Validation Report"],
    ["pur_stock_adjustment_reports", "Stock Adjustment Report"],
    ["pur_stock_lists", "Stock List"],
    ["pur_stock_by_drug_classifications", "Stock By Drug Classification"],
    ["pur_item_transfer_reports", "Item Transfer Report"],
    ["pur_item_movements", "Item Movement"],
  ]),
  ...masters([
    ["pur_suppliers", "Supplier"],
    ["pur_supplier_gls", "Supplier GL"],
    ["pur_items", "Item Master"],
    ["pur_drugs", "Drug Master"],
    ["pur_item_drafts", "Item Master Draft"],
    ["pur_item_approvals", "Item Master Approve"],
    ["pur_item_gl_assos", "Item GL Association"],
    ["pur_item_group_gls", "Item Group GL"],
    ["pur_po_templates", "Purchase Order Template"],
    ["pur_dept_store_assos", "Department Store Asso"],
    ["pur_product_setups", "Product Setup"],
    ["pur_product_brands", "Product Brand"],
    ["pur_product_masters", "Product Master"],
    ["pur_uoms", "UOM"],
    ["pur_price_type_gl_assos", "PriceType GL Asso"],
    ["pur_item_groups", "Item Group"],
    ["pur_association_types", "Association Type"],
    ["pur_brands", "Brand"],
    ["pur_item_classes", "Item Class"],
    ["pur_storage_types", "Storage Type"],
    ["pur_pregnancy_classes", "Pregnancy Class"],
    ["pur_therapeutic_classes", "Therapeutic Class"],
    ["pur_routes", "Route"],
    ["pur_stores", "Store"],
    ["pur_store_locations", "Store Location"],
  ]),

  /* --------------------- Purchase Master (legacy cols) ---------------- */
  pur_suppliers: m(
    "Supplier",
    [
      f("phone", "Phone", "text"),
      f("email", "Email id", "email"),
      f("address", "Address", "textarea"),
    ],
    { columns: ["code", "name", "phone", "email", "status"] }
  ),
  pur_supplier_gls: m(
    "Supplier GL",
    [
      f("supplierCode", "Supplier Code", "text"),
      f("supplierName", "Supplier Name", "text"),
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
      f("associateAddress", "Associate Address", "textarea"),
    ],
    { columns: ["supplierCode", "supplierName", "accountNumber", "accountName", "status"] }
  ),
  pur_items: m(
    "Item Master",
    [
      f("itemType", "Item Type", "text"),
      f("itemGroup", "Item Group", "text"),
      f("itemClass", "Item Class", "text"),
      f("unitOfMeasure", "Unit of Measure", "text"),
      f("brand", "Brand", "text"),
      f("supplier", "Supplier", "text"),
      f("storageLocation", "Storage Location", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "itemType", "itemGroup", "itemClass", "brand", "supplier", "status"] }
  ),
  pur_drugs: m(
    "Drug Master",
    [
      f("itemType", "Item Type", "text"),
      f("itemGroup", "Item Group", "text"),
      f("itemClass", "Item Class", "text"),
      f("unitOfMeasure", "Unit of Measure", "text"),
      f("brand", "Brand", "text"),
      f("storageLocation", "Storage Location", "text"),
      f("type", "Type", "text"),
      f("genericName", "Generic Name", "text"),
      f("rate", "Rate", "currency"),
      f("supplier", "Supplier", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "itemType", "itemGroup", "rate", "status"] }
  ),
  pur_item_drafts: m(
    "Item Master Draft",
    [
      f("itemType", "Item Type", "text"),
      f("itemGroup", "Item Group", "text"),
      f("itemClass", "Item Class", "text"),
      f("unitOfMeasure", "Unit of Measure", "text"),
      f("brand", "Brand", "text"),
      f("storageLocation", "Storage Location", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "itemType", "itemGroup", "brand", "status"] }
  ),
  pur_item_approvals: m(
    "Item Master Approve",
    [
      f("itemType", "Item Type", "text"),
      f("itemGroup", "Item Group", "text"),
      f("itemClass", "Item Class", "text"),
      f("brand", "Brand", "text"),
      f("storageLocation", "Storage Location", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "itemType", "itemGroup", "brand", "status"] }
  ),
  pur_item_gl_assos: m(
    "Item GL Association",
    [
      f("itemMasterCode", "Item Master Code", "text"),
      f("itemMasterName", "Item Master Name", "text"),
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
      f("itemTypeLabel", "Item Type Label", "text"),
      f("itemGroupLabel", "Item Group Label", "text"),
      f("itemClassLabel", "Item Class Label", "text"),
      f("itemPurposeLabel", "Item Purpose Label", "text"),
    ],
    {
      columns: [
        "itemMasterCode",
        "itemMasterName",
        "accountNumber",
        "accountName",
        "itemTypeLabel",
        "itemGroupLabel",
      ],
    }
  ),
  pur_item_group_gls: m(
    "Item Group GL",
    [
      f("itemGroupCode", "Item Group Code", "text"),
      f("itemName", "Item Master Name", "text"),
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
      f("itemTypeLabel", "Item Type Label", "text"),
    ],
    { columns: ["itemGroupCode", "itemName", "accountNumber", "accountName"] }
  ),
  pur_po_templates: m(
    "Purchase Order Template",
    [
      f("documentNumber", "Number", "text"),
      f("documentDate", "Date", "date"),
      f("requisition", "Requisition", "text"),
      f("supplierCode", "Supplier Code", "text"),
      f("supplierName", "Supplier Name", "text"),
      f("oneTimeSupplier", "One Time Supplier", "select", { options: YES_NO }),
      f("supplierAddress", "Supplier Address", "textarea"),
      f("advance", "Advance", "currency"),
      f("amount", "Amount", "currency"),
    ],
    {
      columns: [
        "documentNumber",
        "documentDate",
        "requisition",
        "supplierName",
        "amount",
        "status",
      ],
      dateField: "documentDate",
    }
  ),
  pur_dept_store_assos: m(
    "Department Store Asso",
    [
      f("department", "Department", "text"),
      f("store", "Store", "text"),
    ],
    { columns: ["code", "name", "department", "store", "status"] }
  ),
  pur_product_setups: m(
    "Product Setup",
    [
      f("variant", "Variant / Classification", "text"),
      f("parentLabel", "Item Class Parent Label", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "variant", "parentLabel", "status"] }
  ),
  pur_product_brands: m(
    "Product Brand",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  pur_product_masters: m(
    "Product Master",
    [
      f("upc", "Universal Product Code", "text"),
      f("itemType", "Item Type", "text"),
      f("itemGroup", "Item Group", "text"),
      f("itemClass", "Item Class", "text"),
      f("unitOfMeasure", "Unit of Measure", "text"),
      f("brand", "Brand", "text"),
      f("storageLocation", "Storage Location", "text"),
      f("product", "Product", "text"),
      f("unit", "Unit", "text"),
      f("purchaseRate", "P.Rate", "currency"),
      f("salesRate", "S.Rate", "currency"),
      f("mrp", "MRP", "currency"),
      f("serialNumber", "S.No", "number"),
    ],
    {
      columns: ["code", "name", "brand", "unit", "purchaseRate", "salesRate", "mrp", "status"],
    }
  ),
  pur_uoms: m(
    "UOM",
    [
      f("uom", "Uom", "text"),
      f("uomTypeCode", "Uom Type Code", "text"),
      f("uomTypeName", "Uom Type Name", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["uom", "name", "uomTypeName", "status"] }
  ),
  pur_price_type_gl_assos: m(
    "PriceType GL Asso",
    [
      f("priceType", "PriceType", "text"),
      f("priceTypeName", "PriceType Name", "text"),
      f("priceTypeAmount", "Pricetype Amount", "currency"),
      f("priceTypePercentage", "Pricetype Percentage", "number"),
      f("priceTypeDerivation", "Pricetype Derivation", "text"),
      f("priceTypeOperationFlag", "Pricetype Operation Flag", "select", { options: YES_NO }),
      f("priceTypePrintFlag", "Pricetype Print Flag", "select", { options: YES_NO }),
      f("priceTypeEditFlag", "Pricetype Edit Flag", "select", { options: YES_NO }),
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
    ],
    {
      columns: [
        "priceType",
        "priceTypeName",
        "priceTypePercentage",
        "accountNumber",
        "accountName",
        "status",
      ],
    }
  ),
  pur_item_groups: m(
    "Item Group",
    [
      f("itemCode", "Item Code", "text"),
      f("itemName", "Item Name", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["itemCode", "itemName", "status"] }
  ),
  pur_association_types: m(
    "Association Type",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  pur_brands: m(
    "Brand",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  pur_item_classes: m(
    "Item Class",
    [
      f("parentCode", "Parent Code", "text"),
      f("parentLabel", "Parent Label", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "parentLabel", "status"] }
  ),
  pur_storage_types: m(
    "Storage Type",
    [
      f("itemCode", "Item Code", "text"),
      f("itemName", "Item Name", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["itemCode", "itemName", "status"] }
  ),
  pur_pregnancy_classes: m(
    "Pregnancy Class",
    [
      f("itemCode", "Item Code", "text"),
      f("itemName", "Item Name", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["itemCode", "itemName", "status"] }
  ),
  pur_therapeutic_classes: m(
    "Therapeutic Class",
    [
      f("itemCode", "Item Code", "text"),
      f("itemName", "Item Name", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["itemCode", "itemName", "status"] }
  ),
  pur_routes: m(
    "Route",
    [
      f("itemCode", "Item Code", "text"),
      f("itemName", "Item Name", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["itemCode", "itemName", "status"] }
  ),
  pur_stores: m(
    "Store",
    [
      f("remarks", "Remarks", "textarea"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "remarks", "status"] }
  ),
  pur_store_locations: m(
    "Store Location",
    [
      f("storeCode", "Store Code", "text"),
      f("storeName", "Store Name", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "storeName", "status"] }
  ),

  /* ----------------------------- Asset (new) -------------------------- */
  ...forms([["asset_movements", "Asset Movement"]]),
  ...reports([["asset_reports", "Asset Report"]]),
  ...masters([["asset_masters", "Asset Master"]]),

  /* --------------------- Asset Master (legacy cols) ------------------- */
  asset_masters: m(
    "Asset Master",
    [
      f("itemType", "Item Type", "text"),
      f("itemGroup", "Item Group", "text"),
      f("itemClass", "Item Class", "text"),
      f("unitOfMeasure", "Unit of Measure", "text"),
      f("brand", "Brand", "text"),
      f("storageLocation", "Storage Location", "text"),
      f("serialNumber", "S.No", "number"),
      f("rate", "Rate", "currency"),
    ],
    { columns: ["code", "name", "itemType", "itemGroup", "itemClass", "brand", "rate", "status"] }
  ),
  asset_movements: e(
    "Asset Movement",
    [
      f("requestNumber", "Req No", "text"),
      f("requestTime", "Req Time", "date", { required: true }),
      f("fromRoom", "From Room", "text"),
      f("toRoom", "To Room", "text"),
      f("assetCode", "Asset Code", "text"),
      f("assetName", "Asset Name", "text"),
      f("fromTime", "From Time", "date"),
      f("toTime", "To Time", "date"),
      f("requestedBy", "Requested By", "text"),
      f("approvedBy", "Approved By", "text"),
      f("receivedBy", "Received By", "text"),
      f("status", "Status", "select", { options: ACTIVE }),
    ],
    { dateField: "requestTime", badgeField: "status" }
  ),

  /* ---------------------------- Finance (new) ------------------------- */
  ...forms([
    ["fin_journals", "Journal"],
    ["fin_contras", "Contra"],
    ["fin_postings", "Posting"],
    ["fin_customer_invoices", "Customer Invoice"],
    ["fin_receipts", "Receipt"],
    ["fin_customer_credit_notes", "Customer CreditNote"],
    ["fin_supplier_invoices", "Supplier Invoice"],
    ["fin_payments", "Payment"],
    ["fin_supplier_settlements", "Supplier Settlement"],
    ["fin_all_supplier_settlements", "Settlement-All Suppliers"],
    ["fin_supplier_credit_notes", "Supplier CreditNote"],
    ["fin_supplier_debit_notes", "Supplier DebitNote"],
    ["fin_doctor_share_settlements", "Doctor Share Settlement"],
    ["fin_year_end_processes", "Year End Process"],
    ["fin_exports", "Export"],
    ["fin_voucher_updates", "Voucher Update"],
    ["fin_payroll_exports", "PayRoll Export"],
    ["fin_closing_balances", "Copy Closing Balance"],
  ]),
  ...reports([
    ["fin_r_gl_accounts", "GL Account"],
    ["fin_r_cash_books", "Cash Book"],
    ["fin_r_bank_books", "Bank Book"],
    ["fin_r_day_books", "Day Book"],
    ["fin_r_cash_book_cum_day_books", "Cash Book Cum Day Book"],
    ["fin_r_expense_summaries", "Expense Summary"],
    ["fin_r_receipt_summaries", "Receipt Summary"],
    ["fin_r_dept_wise_collections", "Dept Wise Collection"],
    ["fin_r_mis_reports", "Finance MIS Report"],
    ["fin_r_trial_balance_movements", "Trail Balance With Movement"],
    ["fin_r_trial_balances", "Trail Balance"],
    ["fin_r_profit_loss", "Profit Loss"],
    ["fin_r_balance_sheets", "Balance Sheet"],
    ["fin_r_partner_fee_collections", "Partner Fee Collection"],
    ["fin_r_excel_exports", "Finance Excel Export"],
  ]),
  ...masters([
    ["fin_customers", "Customer"],
    ["fin_suppliers", "Supplier"],
    ["fin_banks", "Bank"],
    ["fin_bank_accounts", "Bank Account"],
    ["fin_voucher_templates", "Voucher Template Definition"],
    ["fin_voucher_batches", "Voucher Batch Creation"],
    ["fin_periods", "Period"],
    ["fin_instrument_types", "Instrument Type"],
    ["fin_account_groups", "Account Group"],
    ["fin_chart_of_accounts", "Chart Of Account"],
    ["fin_general_ledgers", "GeneralLedger"],
    ["fin_ledger_balances", "Ledger Balance"],
    ["fin_fee_gl_assos", "Fee GL Asso"],
    ["fin_instrument_type_gl_assos", "Instrument Type GL Asso"],
    ["fin_doctor_fee_gl_assos", "DoctorFee GL Asso"],
    ["fin_partner_fee_gl_assos", "PartnerFee GL Asso"],
    ["fin_provider_gl_assos", "Provider GL Asso"],
    ["fin_other_gl_assos", "Other GL Asso"],
    ["fin_bank_account_types", "BankAccount Type"],
  ]),

  /* --------------------- Finance masters (legacy fields) -------------- */
  fin_customers: m(
    "Customer",
    [
      f("address", "Address", "textarea"),
      f("phone", "Phone", "text"),
      f("email", "Email Id", "email"),
    ],
    { columns: ["code", "name", "address", "phone", "email", "status"] }
  ),
  fin_suppliers: m(
    "Supplier",
    [
      f("phone", "Phone", "text"),
      f("email", "Email ID", "email"),
      f("address", "Address", "textarea"),
    ],
    { columns: ["code", "name", "phone", "email", "address", "status"] }
  ),
  fin_banks: m(
    "Bank",
    [
      f("phone", "Phone", "text"),
      f("email", "Email id", "email"),
      f("address", "Address", "textarea"),
    ],
    { columns: ["code", "name", "phone", "email", "status"] }
  ),
  fin_bank_accounts: m(
    "Bank Account",
    [
      f("bankCode", "Bank Code", "text"),
      f("bankName", "Bank Name", "text"),
      f("bankAddress", "Bank Address", "textarea"),
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
      f("accountType", "Account Type", "text"),
    ],
    { columns: ["bankCode", "bankName", "accountNumber", "accountName", "accountType", "status"] }
  ),
  fin_voucher_templates: m(
    "Voucher Template Definition",
    [
      f("templateNumber", "Template Number", "text"),
      f("templateDate", "Date", "date"),
    ],
    { columns: ["templateNumber", "name", "templateDate", "status"] }
  ),
  fin_voucher_batches: m(
    "Voucher Batch Creation",
    [
      f("templateNumber", "Template Number", "text"),
      f("templateDate", "Date", "date"),
    ],
    { columns: ["templateNumber", "name", "templateDate", "status"] }
  ),
  fin_periods: m(
    "Period",
    [
      f("fiscalYear", "Fiscal Year", "text"),
      f("periodTypeCode", "Period Type Code", "text"),
      f("periodTypeName", "Period Type Name", "text"),
      f("startDate", "Start Date", "date"),
      f("endDate", "End Date", "date"),
      f("isCurrentPeriod", "Is Current Period", "select", { options: YES_NO }),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["name", "code", "fiscalYear", "startDate", "endDate", "isCurrentPeriod", "status"] }
  ),
  fin_instrument_types: m(
    "Instrument Type",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  fin_account_groups: m(
    "Account Group",
    [
      f("parent", "Parent", "text"),
      f("head", "Head", "text"),
      f("subHead", "Sub Head", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "parent", "head", "subHead", "status"] }
  ),
  fin_chart_of_accounts: m(
    "Chart Of Account",
    [
      f("accountGroup", "Account Group", "text"),
      f("accountNumber", "Account No.", "text"),
      f("accountName", "Account Name", "text"),
      f("accountType", "Account Type", "text"),
      f("accountSubType", "Account Sub Type", "text"),
      f("currency", "Currency", "text"),
      f("autoPosting", "Auto Posting", "select", { options: YES_NO }),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "accountGroup", "accountNumber", "accountType", "status"] }
  ),
  fin_general_ledgers: m(
    "GeneralLedger",
    [
      f("accountGroup", "Account Group", "text"),
      f("head", "Head", "text"),
      f("accountNumber", "Account No.", "text"),
      f("accountName", "Account Name", "text"),
      f("accountType", "Account Type", "text"),
      f("accountSubType", "Account Sub Type", "text"),
      f("currency", "Currency", "text"),
      f("autoPosting", "Auto Posting", "select", { options: YES_NO }),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["accountGroup", "head", "accountNumber", "accountName", "accountType", "status"] }
  ),
  fin_fee_gl_assos: m(
    "Fee GL Asso",
    [
      f("feeTypeCode", "FeeType Code", "text"),
      f("feeTypeName", "FeeType Name", "text"),
      f("for", "For", "text"),
      f("feeTypePercentage", "FeeType Percentage", "number"),
      f("feeTypeDerivation", "FeeType Derivation", "text"),
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
      f("projectType", "Project Type", "text"),
      f("associateCode", "Associate Code", "text"),
      f("associateName", "Associate Name", "text"),
      f("associateAddress", "Associate Address", "textarea"),
    ],
    { columns: ["feeTypeCode", "feeTypeName", "accountNumber", "accountName", "status"] }
  ),
  fin_instrument_type_gl_assos: m(
    "Instrument Type GL Asso",
    [
      f("instrumentType", "Instrument Type", "text"),
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
      f("projectType", "Project Type", "text"),
      f("associateCode", "Associate Code", "text"),
      f("associateName", "Associate Name", "text"),
      f("associateAddress", "Associate Address", "textarea"),
      f("chargeType", "Charge Type", "text"),
      f("percentage", "Percentage", "number"),
    ],
    { columns: ["instrumentType", "accountNumber", "accountName", "chargeType", "percentage", "status"] }
  ),
  fin_bank_account_types: m(
    "BankAccount Type",
    [f("serialNumber", "S.No", "number")],
    { columns: ["code", "name", "status"] }
  ),
  fin_ledger_balances: m(
    "Ledger Balance",
    [
      f("periodCode", "Period Code", "text"),
      f("periodName", "Period Name", "text"),
      f("accountNumber", "Generalledger Account Number", "text"),
      f("accountName", "Generalledger Account Name", "text"),
      f("associateCode", "Associate Code", "text"),
      f("associateName", "Associate Name", "text"),
      f("associateAddress", "Associate Address", "textarea"),
      f("openingBalance", "Opening Balance", "currency"),
      f("currentBalance", "Current Balance", "currency"),
      f("cumulativeBalance", "Cumulative Balance", "currency"),
      f("closingBalance", "Closing Balance", "currency"),
      f("fiscalYear", "Fiscal Year", "text"),
    ],
    {
      columns: [
        "periodName",
        "accountNumber",
        "accountName",
        "associateName",
        "openingBalance",
        "currentBalance",
        "closingBalance",
        "status",
      ],
    }
  ),
  fin_doctor_fee_gl_assos: m(
    "DoctorFee GL Asso",
    [
      f("feeTypeCode", "FeeType Code", "text"),
      f("feeTypeName", "FeeType Name", "text"),
      f("for", "For", "text"),
      f("feeTypePercentage", "Feetype Percentage", "number"),
      f("feeTypeDerivation", "Feetype Derivation", "text"),
      f("feeTypeOperationFlag", "Feetype Operation Flag", "select", { options: YES_NO }),
      f("feeTypePrintFlag", "Feetype Print Flag", "select", { options: YES_NO }),
      f("associateCode", "Doctor Code", "text"),
      f("associateName", "Doctor Name", "text"),
      f("associateAddress", "Associate Address", "textarea"),
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
      f("projectType", "Project Type", "text"),
    ],
    {
      columns: [
        "feeTypeCode",
        "feeTypeName",
        "feeTypePercentage",
        "associateName",
        "accountNumber",
        "accountName",
        "status",
      ],
    }
  ),
  fin_partner_fee_gl_assos: m(
    "PartnerFee GL Asso",
    [
      f("feeTypeCode", "FeeType Code", "text"),
      f("feeTypeName", "FeeType Name", "text"),
      f("for", "For", "text"),
      f("feeTypePercentage", "Feetype Percentage", "number"),
      f("feeTypeDerivation", "Feetype Derivation", "text"),
      f("feeTypeOperationFlag", "Feetype Operation Flag", "select", { options: YES_NO }),
      f("feeTypePrintFlag", "Feetype Print Flag", "select", { options: YES_NO }),
      f("associateCode", "Partner Code", "text"),
      f("associateName", "Partner Name", "text"),
      f("associateAddress", "Associate Address", "textarea"),
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
      f("projectType", "Project Type", "text"),
    ],
    {
      columns: [
        "feeTypeName",
        "feeTypeCode",
        "feeTypePercentage",
        "associateName",
        "accountNumber",
        "accountName",
        "status",
      ],
    }
  ),
  fin_provider_gl_assos: m(
    "Provider GL Asso",
    [
      f("providerCode", "Provider Code", "text"),
      f("providerName", "Provider Name", "text"),
      f("associateAddress", "Associate Address", "textarea"),
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
      f("projectType", "Project Type", "text"),
    ],
    { columns: ["providerCode", "providerName", "accountNumber", "accountName", "status"] }
  ),
  fin_other_gl_assos: m(
    "Other GL Asso",
    [
      f("purpose", "Purpose", "text"),
      f("accountNumber", "Account Number", "text"),
      f("accountName", "Account Name", "text"),
      f("remarks", "Remarks", "textarea"),
      f("associateCode", "Associate code", "text"),
      f("associateName", "Associate name", "text"),
      f("associateAddress", "Associate address", "textarea"),
      f("entryNumber", "Entryregister Entry Number", "text"),
      f("tokenNumber", "Entryregister Token Number", "text"),
      f("serialNumber", "S.No", "number"),
    ],
    {
      columns: [
        "purpose",
        "accountNumber",
        "accountName",
        "associateName",
        "remarks",
        "status",
      ],
    }
  ),

  /* ----------------------------- Admin (new) -------------------------- */
  ...forms([["adm_change_passwords", "Change Password"]]),
  ...masters([
    ["adm_screens", "Screen"],
    ["adm_dashboard_elements", "Dashboard Element"],
    ["adm_report_designs", "Report Design"],
    ["adm_screen_privileges", "Screen Privilege"],
    ["adm_dashboard_privileges", "Dashboard Privilege"],
    ["adm_role_assignments", "Role Assigment"],
    ["adm_report_messages", "Message in Report"],
    ["adm_sequences", "Sequence"],
    ["adm_delete_reports", "Delete Report"],
  ]),

  /* --------------------- Admin Master (legacy cols) ------------------- */
  adm_screens: m(
    "Screen",
    [
      f("applicationCode", "Application Code", "text"),
      f("applicationName", "Application Name", "text"),
      f("remarks", "Remarks", "textarea"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "applicationName", "remarks", "status"] }
  ),
  adm_dashboard_elements: m(
    "Dashboard Element",
    [
      f("applicationCode", "Application Code", "text"),
      f("applicationName", "Application Name", "text"),
      f("remarks", "Remarks", "textarea"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "applicationName", "remarks", "status"] }
  ),
  adm_report_designs: m(
    "Report Design",
    [
      f("applicationCode", "Application Code", "text"),
      f("applicationName", "Application Name", "text"),
      f("remarks", "Remarks", "textarea"),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "applicationName", "remarks", "status"] }
  ),
  adm_screen_privileges: m(
    "Screen Privilege",
    [
      f("usageType", "Usage Type", "select", { options: USAGE_TYPE }),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "usageType", "status"] }
  ),
  adm_dashboard_privileges: m(
    "Dashboard Privilege",
    [
      f("usageType", "Usage Type", "select", { options: USAGE_TYPE }),
      f("serialNumber", "S.No", "number"),
    ],
    { columns: ["code", "name", "usageType", "status"] }
  ),
  adm_role_assignments: m(
    "Role Assigment",
    [
      f("staffCode", "Staff Code", "text"),
      f("staffName", "Staff Name", "text"),
      f("assignedRoles", "Assigned Roles", "text"),
      f("phone", "Phone", "text"),
      f("email", "Email id", "email"),
      f("address", "Address", "textarea"),
      f("assignedStores", "Assigned Stores", "text"),
    ],
    { columns: ["staffCode", "staffName", "assignedRoles", "phone", "email", "status"] }
  ),
  adm_report_messages: m(
    "Message in Report",
    [
      f("messageTypeCode", "Messagetype Code", "text"),
      f("messageTypeLabel", "Messagetype Label", "text"),
      f("messageGroupCode", "Messagegroup Code", "text"),
      f("messageGroupLabel", "Messagegroup Label", "text"),
      f("report", "Report", "text"),
      f("subject", "Subject", "text"),
      f("message", "Message", "textarea"),
      f("senderCode", "Sender Code", "text"),
      f("senderName", "Sender Name", "text"),
      f("senderAddress", "Sender Address", "textarea"),
      f("visibility", "Visibility", "select", { options: YES_NO }),
      f("serialNumber", "S.No", "number"),
    ],
    {
      columns: [
        "messageTypeLabel",
        "messageGroupLabel",
        "report",
        "subject",
        "visibility",
        "status",
      ],
    }
  ),
  adm_sequences: m(
    "Sequence",
    [
      f("dataObject", "Data Object", "text"),
      f("columnName", "Column Name", "text"),
      f("prefix", "Prefix", "text"),
      f("currentNumber", "Current Nbr", "number"),
      f("nextSequenceNumber", "Nextseq Nbr", "number"),
      f("suffix", "Suffix", "text"),
      f("screenName", "Screen Name", "text"),
      f("restartFrequency", "Restart Frequency", "text"),
      f("generationType", "Generation Type", "text"),
      f("generationLevel", "Generation Level", "text"),
    ],
    {
      columns: [
        "dataObject",
        "columnName",
        "prefix",
        "currentNumber",
        "suffix",
        "screenName",
        "status",
      ],
    }
  ),
  adm_delete_reports: m(
    "Delete Report",
    [
      f("reportName", "Report Name", "text"),
      f("remarks", "Remarks", "textarea"),
    ],
    { columns: ["code", "name", "status"] }
  ),
  ...reports([["adm_role_reports", "Admin Role Report"]]),
};

/** Collections that accept writes (used by the resource API allowlist). */
export const WRITABLE_COLLECTIONS = new Set(
  Object.entries(ENTITIES)
    .filter(([, definition]) => !definition.readOnly)
    .map(([name]) => name)
);
