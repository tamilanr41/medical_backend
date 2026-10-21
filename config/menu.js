/**
 * Centralised HMS menu configuration (§21 MASTER PROMPT).
 *
 * Every module, category and menu item of the legacy HMS is declared here
 * with an exact route. The sidebar, breadcrumbs, menu search, role-based
 * visibility, favourites and every screen are generated from this file —
 * never hardcode menu entries anywhere else.
 *
 * Route shape:
 *   module landing   /{module.slug}
 *   category index   /{module.slug}/{category.slug}
 *   menu screen      /{module.slug}/{category.slug}/{item.slug}
 *
 * Item ids are derived deterministically in lib/menu-utils.js as
 * `{module.id}.{category.slug}.{item.slug}` so favourites, recents and
 * permissions stay stable.
 *
 * screen.type: "crud" | "form" | "list" | "report"
 * screen.collection: Mongo collection powering the screen (see config/entities.js)
 */

/** Item helper: title appears verbatim in the UI (legacy names preserved). */
const it = (slug, title, type, collection) => ({
  slug,
  title,
  screen: { type, collection },
});

/** Category helper. */
const cat = (slug, title, items = []) => ({ slug, title, items });

export const MENU = [
  /* ---------------------------------------------------------------- 1 */
  {
    id: 101,
    slug: "opd",
    title: "Out Patient",
    icon: "Hospital",
    description: "OP registration, consultation billing, prescriptions and patient history.",
    categories: [
      cat("transaction", "Transaction", [
        it("appointment-by-doctor", "Doctor Appointment Slip", "form", "op_registrations"),
        it("appointment-all-doctors", "Daily Appointment List", "list", "op_registrations"),
        it("postpone-appointment", "Reschedule Appointment", "form", "op_registrations"),
        it("op-register-college", "Camp / College Registration", "form", "op_registrations"),
        it("op-register", "Patient Registration (OP)", "form", "op_registrations"),
        it("patient-history", "Patient Visit History", "list", "op_visits"),
        it("patient-billing", "OP Billing", "form", "op_bills"),
        it("patient-clinical-info", "Nursing / Vitals Entry", "form", "op_visits"),
        it("doctor-consultation", "Doctor Consultation", "form", "op_visits"),
        it("online-doctor-consultation", "Teleconsultation", "form", "op_visits"),
        it("treatment-plan-scheduling", "Treatment Plan - Scheduling", "form", "op_treatment_schedules"),
        it("treatment-plan-execution", "Treatment Plan - Execution", "form", "op_treatment_schedules"),
        it("issue-certificate", "Medical Certificate", "form", "op_certificates"),
        it("treatment-plan-allocation", "Treatment Plan - Allocation", "form", "op_treatment_schedules"),
        it("refer-to-other-hospital", "Referral Letter", "form", "op_referrals"),
        it("sponsor-billing", "Corporate / TPA Billing", "form", "op_bills"),
      ]),
      cat("report", "Report", [
        it("registration", "Registration", "report", "op_registrations"),
        it("op-collection-expense", "OP Collection and Expense", "report", "op_bills"),
        it("clinical", "Clinical", "report", "op_visits"),
        it("collection", "Collection", "report", "op_bills"),
        it("billing", "Billing", "report", "op_bills"),
        it("advance-refund-due", "Advance/Refund/Due", "report", "op_bills"),
        it(
          "sponsor-wise-collection-due",
          "Sponsor Wise Collection and Due",
          "report",
          "op_bills"
        ),
        it("expenses", "Expenses", "report", "op_bills"),
        it("op-ip-monthly-collection", "OP IP Monthly Collection", "report", "op_bills"),
        it("excel-export", "Excel Export", "report", "op_bills"),
        it("patient-billing-report", "Patient Billing Report", "report", "op_bills"),
        it("privilege-card-report", "Privilege Card Report", "report", "op_bills"),
      ]),
      cat("master", "Master", [
        it("patient-master", "Patient Master", "crud", "patients"),
        it("consultant-doctor", "Consultant Doctor", "crud", "op_consultant_doctors"),
        it("salaried-doctor", "Salaried Doctor", "crud", "op_salaried_doctors"),
        it("referral-doctor", "Referral Doctor", "crud", "op_referral_doctors"),
        it(
          "doctor-cabin-allocation",
          "Doctor Cabin Allocation",
          "crud",
          "op_doctor_cabin_allocations"
        ),
        it("referral-organization", "Referral Organization", "crud", "op_referral_organizations"),
        it("corporate", "Corporate", "crud", "op_corporates"),
        it("external-organization", "External Organization", "crud", "op_external_organizations"),
        it("external-staff", "External Staff", "crud", "op_external_staff"),
        it("doctor-degree", "Doctor Degree", "crud", "op_doctor_degrees"),
        it("patient-privilege-card", "Patient Privilege Card", "crud", "op_privilege_cards"),
      ]),
      cat("setup-clinical", "Setup - Clinical", [
        it("specialty", "Specialty", "crud", "op_specialties"),
        it("complaint-master", "Complaint Master", "crud", "op_complaints"),
        it("diagnosis-master", "Diagnosis Master", "crud", "op_diagnoses"),
        it("dental-diagnosis-master", "Dental Diagnosis Master", "crud", "op_dental_diagnoses"),
        it("prescription-template", "Prescription Template", "crud", "op_prescription_templates"),
        it("treatment-plan", "Treatment Plan", "crud", "op_treatment_plans"),
        it(
          "treatment-plan-definition",
          "Treatment Plan Definition",
          "crud",
          "op_treatment_plan_definitions"
        ),
        it("generic-name", "Generic Name", "crud", "op_generic_names"),
        it("vaccination-plan", "Vaccination Plan", "crud", "op_vaccination_plans"),
        it("vaccination-group", "Vaccination Group", "crud", "op_vaccination_groups"),
        it("specialty-definition-list", "Specialty Definition List", "list", "op_specialties"),
      ]),
      cat("setup-general", "Setup - General", [
        it("blood-group-list", "BloodGroup List", "crud", "op_blood_groups"),
        it("visit-purpose", "Visit Purpose", "crud", "op_visit_purposes"),
        it("police-station", "Police Station", "crud", "op_police_stations"),
        it("mlc-type", "MLC Type", "crud", "op_mlc_types"),
        it("certificate-type", "Certificate Type", "crud", "op_certificate_types"),
        it("certificate-template", "Certificate Template", "crud", "op_certificate_templates"),
        it("doctor-cabin", "Doctor Cabin", "crud", "op_doctor_cabins"),
        it("revenue-share", "Revenue Share", "crud", "op_revenue_shares"),
        it("check-list-item", "Check List Item", "crud", "op_check_list_items"),
        it("check-list-definition", "Check List Definition", "crud", "op_check_list_definitions"),
        it("project-type", "Project Type", "crud", "op_project_types"),
      ]),
      cat("setup-billing", "Setup - Billing", [
        it("fee-group", "Fee Group", "crud", "op_fee_groups"),
        it("fee-type", "Fee Type", "crud", "op_fee_types"),
        it("service-category", "Service Category", "crud", "op_service_categories"),
        it("service-master", "Service Master", "crud", "op_services"),
        it("revenue-department", "Revenue Department", "crud", "op_revenue_departments"),
        it("patient-type", "Patient Type", "crud", "op_patient_types"),
        it("revenue-share-by-service", "Revenue Share By Service", "crud", "op_revenue_share_services"),
        it(
          "rev-dept-service-mapping",
          "Rev. Dept. Service Mapping",
          "crud",
          "op_rev_dept_service_map"
        ),
        it("night-extra-service-charge", "Night Extra Service Charge", "crud", "op_night_extra_charges"),
        it("fee-head-service-mapping", "Fee Head Service Mapping", "crud", "op_fee_head_service_map"),
        it("patient-type-wise-discount", "Patient Type Wise Discount", "crud", "op_patient_type_discounts"),
        it(
          "insurance-patient-type-mapping",
          "Insurance Patient Type Mapping",
          "crud",
          "op_insurance_patient_type_map"
        ),
        it("assign-services", "Assign Services", "crud", "op_assigned_services"),
        it("fee-by-department", "Fee by Department", "crud", "op_fee_by_departments"),
      ]),
    ],
  },

  /* ---------------------------------------------------------------- 2 */
  {
    id: 102,
    slug: "ipd",
    title: "In Patient",
    icon: "BedDouble",
    description: "IP admissions, stay management, discharge transactions and reports.",
    categories: [
      cat("transaction", "Transaction", [
        it("admission-register", "IP Admission", "form", "ip_admissions"),
        it("admission-register-college", "Camp / College Admission", "form", "ip_admissions"),
        it("initial-assessment", "Admission Assessment", "form", "ip_clinical_records"),
        it("ip-advance-request", "Advance Request", "form", "ip_billing_records"),
        it("ip-advance-collection", "Advance Receipt", "form", "ip_billing_records"),
        it("room-status", "Bed / Room Availability", "list", "ip_admissions"),
        it("doctors-order", "Doctor's Order", "form", "ip_clinical_records"),
        it("case-sheet", "IP Case Sheet", "form", "ip_clinical_records"),
        it("schedule-doctor-visit", "Doctor Visit Schedule", "form", "ip_clinical_records"),
        it("discount-authorization", "Discount Approval", "form", "ip_billing_records"),
        it("discharge-advice", "Discharge Advice", "form", "ip_clinical_records"),
        it("discharge-summary", "Discharge Summary", "form", "ip_clinical_records"),
        it(
          "ip-doctor-share-distribution",
          "Doctor Share Distribution",
          "form",
          "ip_billing_records"
        ),
        it("inpatient-write-off", "IP Write-off", "form", "ip_billing_records"),
        it("ip-posting-to-finance", "Post to Finance", "form", "ip_billing_records"),
        it("doctor-settlement-ip", "Doctor Settlement", "form", "ip_billing_records"),
        it(
          "doctor-settlement-approval-ip",
          "Doctor Settlement Approval",
          "form",
          "ip_billing_records"
        ),
        it("cancel-receipt", "Receipt Cancellation", "form", "ip_billing_records"),
        it("patient-feedback", "Patient Feedback", "form", "ip_clinical_records"),
      ]),
      cat("report", "Report", [
        it("ip-advance-detail", "IP Advance Detail", "report", "ip_advance_details"),
        it("ip-payment-detail", "IP Payment Detail", "report", "ip_payment_details"),
        it(
          "ip-daily-collection-report",
          "IP Daily Collection Report",
          "report",
          "ip_daily_collections"
        ),
        it("ip-mis-reports", "IP MISReports", "report", "ip_mis_reports"),
        it("excel-export", "Excel Export", "report", "ip_mis_reports"),
        it("ip-turn-around-time", "IP Turn Arround Time", "report", "ip_turnaround_times"),
      ]),
      cat("setup-ward", "Setup - Ward", [
        it("ward-list", "Ward List", "crud", "ip_wards"),
        it("specialty-ward-asso-list", "Specialty WardAsso List", "crud", "ip_specialty_wards"),
        it("unit-list", "Unit List", "crud", "ip_units"),
        it("ward-unit-asso-list", "Ward Unit Asso List", "crud", "ip_ward_units"),
        it("unit-day-asso-list", "Unit Day Asso List", "crud", "ip_unit_days"),
        it(
          "specialty-unit-doctor-asso-list",
          "Specialty Unit Doctor Asso List",
          "crud",
          "ip_specialty_unit_doctors"
        ),
        it(
          "specialty-unit-day-asso-list",
          "Specialty Unit Day Asso List",
          "crud",
          "ip_specialty_unit_days"
        ),
        it("consultation-room-list", "Consultation Room List", "crud", "ip_consultation_rooms"),
        it("consultation-room", "Consultation Room", "crud", "ip_consultation_room_masters"),
      ]),
      cat("setup-room", "Setup - Room", [
        it("classification-list", "Classification List", "crud", "ip_room_classifications"),
        it("room-type", "Room Type", "crud", "ip_room_types"),
        it("type", "Type", "crud", "ip_types"),
        it("room-list", "Room List", "crud", "ip_rooms"),
      ]),
      cat("setup-general", "Setup - General", [
        it("treatment-package-list", "Treatment Package List", "crud", "ip_treatment_packages"),
        it(
          "discharge-summary-template",
          "Discharge Summary Template",
          "crud",
          "ip_discharge_summary_templates"
        ),
        it(
          "doctors-order-template",
          "Doctor's Order Template",
          "crud",
          "ip_doctors_order_templates"
        ),
      ]),
    ],
  },

  /* ---------------------------------------------------------------- 3 */
  {
    id: 103,
    slug: "laboratory",
    title: "Laboratory",
    icon: "FlaskConical",
    description: "Lab front office, observations, results, external labs, purchases and reports.",
    categories: [
      cat("frontoffice", "FrontOffice", [
        it("bill", "Lab Billing", "form", "lab_bills"),
        it("sponsor-due-collection", "TPA / Sponsor Due Collection", "form", "lab_sponsor_dues"),
      ]),
      cat("lab", "Lab", [
        it("patient-checkin-register-lab", "Lab Patient Check-in", "list", "lab_checkins"),
        it(
          "sample-collection-by-checkin",
          "Sample Collection",
          "form",
          "lab_sample_collections"
        ),
        it("labresult-register", "Result Entry", "form", "lab_result_registers"),
        it(
          "sample-collection-register",
          "Sample Collection List",
          "list",
          "lab_sample_collections"
        ),
        it("directresult-register", "Direct Result Entry", "form", "lab_direct_results"),
        it(
          "lab-test-sent-to-external-org",
          "Outsourced Tests",
          "form",
          "lab_external_tests"
        ),
        it(
          "lab-test-sent-to-external-org-edit-amount",
          "Outsourced Test Charges",
          "form",
          "lab_external_amounts"
        ),
        it("lab-test-pending", "Pending Tests", "list", "lab_pending_tests"),
        it("lab-test-repeat", "Repeat Test", "form", "lab_repeat_tests"),
        it("lab-result-approval", "Result Approval", "form", "lab_result_approvals"),
        it("lab-result-dispatch", "Report Dispatch", "form", "lab_result_dispatches"),
      ]),
      cat("purchase", "Purchase", [
        it("cash-purchase-list", "Cash Purchase List", "list", "lab_purchases"),
        it("purchase-order", "Purchase Order", "form", "lab_purchase_orders"),
        it("purinvoice-direct", "Purchase Invoice", "form", "lab_pur_invoices"),
        it("invoice-approval", "Invoice Approval", "form", "lab_invoice_approvals"),
        it(
          "purchase-order-approval",
          "Purchase Order Approval",
          "form",
          "lab_purchase_order_approvals"
        ),
        it("purchase-return", "Purchase Return", "form", "lab_purchase_returns"),
        it("stock-taking", "Stock Verification", "form", "lab_stock_takings"),
      ]),
      cat("report", "Report", [
        it("lab-test-profile", "Lab Test Profile", "report", "lab_test_profile_reports"),
        it("lab-externalorg-share", "Lab ExternalOrg Share", "report", "lab_external_org_shares"),
        it("excel-export", "ExcelExport", "report", "lab_excel_exports"),
      ]),
      cat("master", "Master", [
        it("doctor-list", "Doctor List", "list", "lab_doctors"),
        it("doctor", "Doctor", "crud", "lab_doctors"),
        it("referral-organization-list", "Referral Organization List", "list", "lab_referral_orgs"),
        it("referral-organization", "Referral Organization", "crud", "lab_referral_orgs"),
        it("supplier-list", "Supplier List", "list", "lab_suppliers"),
        it("supplier", "Supplier", "crud", "lab_suppliers"),
        it("supplier-gl-list", "Supplier GL List", "list", "lab_supplier_gls"),
        it("item-master-list", "Item Master List", "list", "lab_item_masters"),
        it("stock-register-list", "Stock Register List", "list", "lab_stock_registers"),
      ]),
      cat("setup", "Setup", [
        it("test-category-list", "TestCategory List", "list", "lab_test_categories"),
        it("test-category", "TestCategory", "crud", "lab_test_categories"),
        it("sample-type-list", "Sample Type List", "list", "lab_sample_types"),
        it("sample-type", "Sample Type", "crud", "lab_sample_types"),
        it("test-method-list", "Test Method List", "list", "lab_test_methods"),
        it("test-method", "Test Method", "crud", "lab_test_methods"),
        it("test-master-list", "Test Master List", "list", "lab_test_masters"),
        it("test-master", "Test Master", "crud", "lab_test_masters"),
        it("lab-profile-list", "Lab Profile List", "list", "lab_profiles"),
        it("lab-profile", "Lab Profile", "crud", "lab_profiles"),
        it("test-profile-asso-list", "Test Profile Asso List", "list", "lab_test_profile_assos"),
        it("test-profile-asso", "Test Profile Asso", "crud", "lab_test_profile_assos"),
        it("master-profile-list", "Master Profile List", "list", "lab_master_profiles"),
        it("master-profile", "Master Profile", "crud", "lab_master_profiles"),
        it("observation-list", "Observation List", "list", "lab_observations"),
        it("observation", "Observation", "form", "lab_observations"),
        it(
          "outsource-service-rate-definition",
          "OutSource Service Rate Definition",
          "crud",
          "lab_outsource_service_rates"
        ),
        it("test-item-asso", "Test Item Asso", "crud", "lab_test_item_assos"),
        it("profile-item-asso", "Profile Item Asso", "crud", "lab_profile_item_assos"),
      ]),
    ],
  },

  /* ---------------------------------------------------------------- 4 */
  {
    id: 104,
    slug: "xray",
    title: "X-Ray",
    icon: "Radiation",
    description: "X-Ray transactions and modality setup.",
    categories: [
      cat("transaction", "Transaction", [
        it("xray-register", "X-Ray Register", "form", "xray_registers"),
        it("xray-result", "X-Ray Report Entry", "form", "xray_results"),
        it(
          "xray-test-sent-to-external-org",
          "Outsourced X-Ray Tests",
          "form",
          "xray_external_tests"
        ),
        it("xray-issue-register", "Film Issue Register", "form", "xray_issue_registers"),
        it("credit-bill", "Credit Bill", "form", "xray_credit_bills"),
        it("sponsor-due-collection", "Sponsor Due Collection", "form", "xray_sponsor_dues"),
        it("pending-payment", "Pending Payments", "list", "xray_pending_payments"),
      ]),
      cat("setup", "Setup", [
        it("xray-category-list", "Xray Category List", "list", "xray_categories"),
        it("xray-category", "Xray Category", "crud", "xray_categories"),
        it("xray-master-list", "Xray Master List", "list", "xray_masters"),
        it("xray-master", "Xray Master", "crud", "xray_masters"),
        it("test-item-asso", "Test Item Asso", "crud", "xray_test_item_assos"),
      ]),
    ],
  },

  /* ---------------------------------------------------------------- 5 */
  {
    id: 105,
    slug: "scan",
    title: "Scan",
    icon: "Scan",
    description: "Scan transactions, templates and modality setup.",
    categories: [
      cat("transaction", "Transaction", [
        it("scan-register", "Scan Register", "form", "scan_registers"),
        it("scheduling-scan", "Scan Scheduling", "form", "scan_schedules"),
        it(
          "scan-test-sent-to-external-org",
          "Outsourced Scans",
          "form",
          "scan_external_tests"
        ),
        it("credit-bill", "Credit Bill", "form", "scan_credit_bills"),
        it("sponsor-due-collection", "Sponsor Due Collection", "form", "scan_sponsor_dues"),
      ]),
      cat("setup", "Setup", [
        it("scan-category-list", "Scan Category List", "list", "scan_categories"),
        it("scan-category", "Scan Category", "crud", "scan_categories"),
        it("scan-master-list", "Scan Master List", "list", "scan_masters"),
        it("scan-master", "Scan Master", "crud", "scan_masters"),
        it("scan-test-item-asso-list", "Scan Test Item Asso List", "list", "scan_test_item_assos"),
        it("scan-test-item-asso", "Scan Test Item Asso", "crud", "scan_test_item_assos"),
        it("scan-template-list", "Scan Template List", "list", "scan_templates"),
        it("scan-template", "Scan Template", "crud", "scan_templates"),
        it("machine-list", "Machine List", "list", "scan_machines"),
      ]),
    ],
  },

  /* ---------------------------------------------------------------- 6 */
  {
    id: 106,
    slug: "specialty-tests",
    title: "Specialty Tests",
    icon: "TestTube",
    description: "Specialty diagnostic tests and setup.",
    categories: [
      cat("transaction", "Transaction", [
        it("cardiology-register", "Cardiology Register", "form", "st_cardiology_registers"),
        it("diabetology-register", "Diabetology Register", "form", "st_diabetology_registers"),
      ]),
      cat("setup", "Setup", [
        it(
          "cardiology-category-list",
          "Cardiology Category List",
          "list",
          "st_cardiology_categories"
        ),
        it("cardiology-category", "Cardiology Category", "crud", "st_cardiology_categories"),
        it("cardiology-master-list", "Cardiology Master List", "list", "st_cardiology_masters"),
        it("cardiology-master", "Cardiology Master", "crud", "st_cardiology_masters"),
      ]),
    ],
  },

  /* ---------------------------------------------------------------- 7 */
  {
    id: 107,
    slug: "physiotherapy",
    title: "Physiotherapy",
    icon: "PersonStanding",
    description: "Physiotherapy sessions, plans and setup.",
    categories: [
      cat("transaction", "Transaction", [
        it("physiotherapy-register", "Physiotherapy Register", "form", "physio_registers"),
        it("credit-bill", "Credit Bill", "form", "physio_credit_bills"),
        it("pending-payment", "Pending Payments", "list", "physio_pending_payments"),
        it("physio-service-return", "Physio Service Return", "form", "physio_service_returns"),
      ]),
      cat("setup", "Setup", [
        it("physio-category-list", "Physio Category List", "list", "physio_categories"),
        it("physio-category", "Physio Category", "crud", "physio_categories"),
        it("physiotherapy-master-list", "Physiotherapy Master List", "list", "physio_masters"),
        it("physiotherapy-master", "Physiotherapy Master", "crud", "physio_masters"),
      ]),
    ],
  },

  /* ---------------------------------------------------------------- 8 */
  {
    id: 108,
    slug: "dialysis",
    title: "Dialysis",
    icon: "Droplets",
    description: "Dialysis sessions, masters, reports and setup.",
    categories: [
      cat("transaction", "Transaction", [
        it("dialysis-register", "Dialysis Register", "form", "dialysis_registers"),
        it("credit-bill", "Credit Bill", "form", "dialysis_credit_bills"),
        it("service-request", "Service Request", "form", "dialysis_service_requests"),
      ]),
      cat("report", "Report", [
        it(
          "dialysis-cumulative-report",
          "Dialysis Cumulative Report",
          "report",
          "dialysis_cumulative_reports"
        ),
        it(
          "dialysis-billing-report",
          "Dialysis Billing Report",
          "report",
          "dialysis_billing_reports"
        ),
      ]),
      cat("setup", "Setup", [
        it("dialysis-category-list", "Dialysis Category List", "list", "dialysis_categories"),
        it("dialysis-category", "Dialysis Category", "crud", "dialysis_categories"),
        it("dialysis-master-list", "Dialysis Master List", "list", "dialysis_masters"),
        it("dialysis-master", "Dialysis Master", "crud", "dialysis_masters"),
        it(
          "dialysis-test-item-asso-list",
          "Dialysis Test Item Asso List",
          "list",
          "dialysis_test_item_assos"
        ),
        it(
          "dialysis-test-item-asso",
          "Dialysis Test Item Asso",
          "crud",
          "dialysis_test_item_assos"
        ),
      ]),
    ],
  },

  /* ---------------------------------------------------------------- 9 */
  {
    id: 109,
    slug: "ward",
    title: "Ward",
    icon: "Bed",
    description: "Ward operations including room cleaning and setup.",
    categories: [
      cat("transaction", "Transaction", [
        it("nurses-workbench", "Nurse Workbench", "form", "ward_nurse_workbenches"),
        it("item-issue-return-list", "Item Issue / Return", "list", "ward_item_issues"),
        it("service-request-list", "Service Requests", "list", "ward_service_requests"),
        it("schedule-doctor-visit", "Doctor Visit Schedule", "form", "ward_doctor_visits"),
        it("equipment-usage-list", "Equipment Usage", "list", "ward_equipment_usages"),
        it("item-consumption-list", "Item Consumption", "list", "ward_item_consumptions"),
        it("case-sheet-list", "Case Sheets", "list", "case_sheets"),
        it("room-cleaning", "Room Cleaning", "form", "room_cleanings"),
        it("discharge-summary", "Discharge Summary", "form", "ward_discharge_summaries"),
      ]),
      cat("setup", "Setup", [
        it("ward-list", "Ward List", "list", "ward_masters"),
        it("ward", "Ward", "crud", "ward_masters"),
        it("clinical-exam-list", "Clinical Exam List", "list", "ward_clinical_exams"),
        it("clinical-exam", "Clinical Exam", "crud", "ward_clinical_exams"),
      ]),
    ],
  },

  /* --------------------------------------------------------------- 10 */
  {
    id: 110,
    slug: "mrd",
    title: "MRD",
    icon: "FolderOpen",
    description: "Medical Records Department — file movement, case sheets, masters and coding.",
    categories: [
      cat("transaction", "Transaction", [
        it("admission-sheet", "Admission Sheet", "form", "mrd_admission_sheets"),
        it("case-sheet-issue", "Case Sheet Issue", "form", "mrd_case_sheet_issues"),
        it("patient-console", "Patient Records Console", "list", "patient_records"),
        it("discharge-summary", "Discharge Summary", "form", "mrd_discharge_summaries"),
        it("patient-icd-code-list", "Patient ICD Coding List", "list", "mrd_patient_icd_codes"),
        it("patient-icd-code", "Patient ICD Coding", "crud", "mrd_patient_icd_codes"),
        it(
          "case-sheet-receive-entry-list",
          "Case Sheet Receipt List",
          "list",
          "mrd_case_sheet_receives"
        ),
        it(
          "case-sheet-receive-entry",
          "Case Sheet Receipt Entry",
          "form",
          "mrd_case_sheet_receives"
        ),
        it("create-file-master", "File Master Creation", "crud", "mrd_file_masters"),
        it("file-movement-list", "File Movement List", "list", "file_movements"),
        it("file-movement", "File Movement", "form", "file_movements"),
      ]),
      cat("report", "Report", [
        it("excel-export", "Excel Export", "report", "mrd_excel_exports"),
        it(
          "case-sheet-status-report",
          "Case Sheet Status Report",
          "report",
          "mrd_case_sheet_status_reports"
        ),
        it("mrd-mis-reports", "MRD MIS Reports", "report", "mrd_mis_reports"),
        it("area-wise-patient", "Area Wise Patient", "report", "mrd_area_wise_patients"),
      ]),
      cat("master", "Master", [
        it("file-master-list", "File Master List", "list", "mrd_file_masters"),
        it("file-master", "File Master", "crud", "mrd_file_masters"),
        it("complaint-type-list", "Complaint Type List", "list", "complaint_types"),
        it("complaint-type", "Complaint Type", "crud", "complaint_types"),
        it("patient-complaint-list", "Patient Complaint List", "list", "patient_complaints"),
        it("patient-complaint", "Patient Complaint", "crud", "patient_complaints"),
      ]),
      cat("setup", "Setup", [
        it("icd-coding-list", "ICD Coding List", "list", "icd_codings"),
        it("icpm-coding-list", "ICPM Coding List", "list", "icpm_codings"),
        it("file-type-list", "File Type List", "list", "file_types"),
        it("file-type", "File Type", "crud", "file_types"),
      ]),
    ],
  },

  /* --------------------------------------------------------------- 11 */
  {
    id: 111,
    slug: "op-theatre",
    title: "Operation Theatre",
    icon: "Syringe",
    description: "OT schedules, cases, masters, reports and setup.",
    categories: [
      cat("transaction", "Transaction", [
        it("theatre-booking", "OT Booking", "form", "ot_bookings"),
        it("perform-operation", "OT Notes / Perform Surgery", "form", "ot_cases"),
        it("operation-register", "OT Register", "list", "ot_operation_registers"),
        it("theatre-item-usage", "OT Item Usage", "form", "ot_item_usages"),
        it("item-issue-return-list", "Item Issue / Return", "list", "ot_item_issues"),
        it("service-request-list", "Service Requests", "list", "ot_service_requests"),
        it("cssd-request", "CSSD Request", "form", "ot_cssd_requests"),
        it("cssd-accept", "CSSD Acceptance", "form", "ot_cssd_accepts"),
        it("cssd-return", "CSSD Return", "form", "ot_cssd_returns"),
        it("cssd-request-approval", "CSSD Request Approval", "form", "ot_cssd_approvals"),
      ]),
      cat("master", "Master", [
        it("theatre", "Theatre", "crud", "ot_theatres"),
        it("operation-template-list", "Operation Template List", "list", "ot_operation_templates"),
      ]),
      cat("reports", "Reports", [
        it("excel-export", "Excel Export", "report", "ot_excel_exports"),
        it("surgery-report", "Surgery Report", "report", "ot_surgery_reports"),
      ]),
      cat("setup", "Setup", [
        it("opeartion-type", "Opeartion Type", "crud", "ot_operation_types"),
        it("equipment", "Equipment", "crud", "ot_equipments"),
        it("implant", "Implant", "crud", "ot_implants"),
        it("medicine", "Medicine", "crud", "ot_medicines"),
        it("consumable", "Consumable", "crud", "ot_consumables"),
      ]),
    ],
  },

  /* --------------------------------------------------------------- 12 */
  {
    id: 127,
    slug: "cssd",
    title: "CSSD",
    icon: "Package",
    description: "Central Sterile Supply — instrument processing, masters and setup.",
    categories: [
      cat("transaction", "Transaction", [
        it("item-receive", "Instrument Receipt", "form", "cssd_item_receives"),
        it("cssd-process", "Sterilization / Processing", "form", "cssd_processes"),
        it("instrument-to-stock", "Return to Sterile Stock", "form", "cssd_instrument_stocks"),
        it("item-issue", "Issue to Ward/OT", "form", "cssd_item_issues"),
      ]),
      cat("master", "Master", [
        it("instrument-set", "Instrument Set", "crud", "cssd_instrument_sets"),
        it("instrument", "Instrument", "crud", "cssd_instruments"),
        it("equipment", "Equipment", "crud", "cssd_equipments"),
        it("stock-register", "Stock Register", "list", "cssd_stock_registers"),
      ]),
      cat("setup", "Setup", [
        it("sterilation-method", "Sterilation Method", "crud", "cssd_sterilization_methods"),
      ]),
    ],
  },

  /* --------------------------------------------------------------- 13 */
  {
    id: 112,
    slug: "insurance",
    title: "Insurance",
    icon: "ShieldCheck",
    description: "Insurance claims, pre-authorisations, masters and reports.",
    categories: [
      cat("transaction", "Transaction", [
        it("claim-list", "Claims List", "list", "insurance_claims"),
        it("assign-pre-autho-to-ip", "Assign Pre-Authorization", "form", "insurance_pre_authos"),
        it("medical-report-list", "Medical Reports", "list", "insurance_medical_reports"),
        it("track-insurance-list", "Insurance Claims Tracking", "list", "insurance_tracks"),
        it("sponsor-due-collection", "Sponsor Due Collection", "form", "insurance_sponsor_dues"),
        it(
          "payment-posting-by-claim",
          "Claim-wise Payment Posting",
          "form",
          "insurance_payment_postings"
        ),
        it(
          "payment-posting-by-date",
          "Date-wise Payment Posting",
          "form",
          "insurance_payment_postings"
        ),
        it("psale-change-pay-type", "Change Payment Mode (Pharmacy Sale)", "form", "insurance_pay_type_changes"),
        it(
          "sponsor-bill-posting",
          "Sponsor Bill Posting",
          "form",
          "insurance_sponsor_bill_postings"
        ),
      ]),
      cat("reports", "Reports", [
        it("insurance-mis-reports", "Insurance MIS Reports", "report", "insurance_mis_reports"),
        it("insurance-statement", "Insurance Statement", "report", "insurance_statements"),
        it(
          "authorization-letter",
          "Authorization Letter",
          "report",
          "insurance_authorization_letters"
        ),
      ]),
      cat("master", "Master", [
        it("provider-list", "Provider List", "list", "insurance_providers"),
        it("provider", "Provider", "crud", "insurance_providers"),
        it("insurance-company-list", "Insurance Company List", "list", "insurance_companies"),
        it("insurance-company", "Insurance Company", "crud", "insurance_companies"),
      ]),
      cat("setup", "Setup", [
        it("insurance-plan-list", "Insurance Plan List", "list", "insurance_plans"),
        it("insurance-plan", "Insurance Plan", "crud", "insurance_plans"),
        it("claim-category-list", "Claim Category List", "list", "insurance_claim_categories"),
        it("claim-category", "Claim Category", "crud", "insurance_claim_categories"),
        it("claim-class-list", "Claim Class List", "list", "insurance_claim_classes"),
        it("claim-class", "Claim Class", "crud", "insurance_claim_classes"),
        it("claim-head-list", "Claim Head List", "list", "insurance_claim_heads"),
      ]),
    ],
  },

  /* --------------------------------------------------------------- 14 */
  {
    id: 113,
    slug: "pharmacy",
    title: "Pharmacy",
    icon: "Pill",
    description: "Enterprise pharmacy — sales, purchase, inventory, finance, reports and masters.",
    categories: [
      cat("lookup", "Lookup", [
        it("medicine-lookup", "Medicine Lookup", "lookup", "medicines"),
      ]),
      cat("sales", "Sales", [
        it("cash-sale", "Cash Bill (POS)", "form", "pharmacy_cash_sales"),
        it("pharmacy-write-off", "Write-Off", "form", "pharmacy_write_offs"),
        it("sales-return", "Sales Return", "form", "pharmacy_sales_returns"),
        it("sponsor-settlement", "TPA / Sponsor Settlement", "form", "pharmacy_sponsor_settlements"),
        it(
          "patient-advance-register",
          "Patient Advance",
          "list",
          "pharmacy_patient_advances"
        ),
        it("sales-posting", "Sales Posting", "form", "pharmacy_sales_postings"),
        it("pharmacy-posting", "Pharmacy Posting", "form", "pharmacy_postings"),
        it("collection-handover", "Collection Handover", "form", "pharmacy_collection_handovers"),
        it(
          "change-receipt-pay-mode",
          "Change Receipt Payment Mode",
          "form",
          "pharmacy_pay_mode_changes"
        ),
      ]),
      cat("purchase", "Purchase", [
        it("cash-purchase", "Cash Purchase", "form", "pharmacy_cash_purchases"),
        it("purchase-request", "Purchase Request", "form", "pharmacy_purchase_requests"),
        it("purchase-order", "Purchase Order", "form", "pharmacy_purchase_orders"),
        it("goods-receipt", "Goods Receipt", "form", "pharmacy_goods_receipts"),
        it("invioce-approval", "Invioce Approval", "form", "pharmacy_invoice_approvals"),
        it("purchase-return", "Purchase Return", "form", "pharmacy_purchase_returns"),
        it(
          "purchase-order-approval",
          "Purchase Order Approval",
          "form",
          "pharmacy_po_approvals"
        ),
      ]),
      cat("inventory", "Inventory", [
        it("store-indent", "Store Indent", "form", "pharmacy_store_indents"),
        it("stock-taking", "Stock Taking", "form", "pharmacy_stock_takings"),
        it("item-acceptance", "Item Acceptance", "form", "pharmacy_item_acceptances"),
        it("item-consumption", "Item Consumption", "form", "pharmacy_item_consumptions"),
        it("stock-day-end", "Stock Day End", "form", "pharmacy_stock_day_ends"),
        it("item-transfer", "Item Transfer", "form", "pharmacy_item_transfers"),
      ]),
      cat("finance", "Finance", [
        it("receipt", "Receipt", "form", "pharmacy_receipts"),
        it("supplier-invoice", "Supplier Invoice", "form", "pharmacy_supplier_invoices"),
        it("payment", "Payment", "form", "pharmacy_payments"),
        it(
          "supplier-settlement",
          "Supplier Settlement",
          "form",
          "pharmacy_supplier_settlements"
        ),
        it("supplier-debitnote", "Supplier DebitNote", "form", "pharmacy_supplier_debit_notes"),
        it(
          "supplier-creditnote",
          "Supplier CreditNote",
          "form",
          "pharmacy_supplier_credit_notes"
        ),
        it("contra-entry", "Contra Entry", "form", "pharmacy_contra_entries"),
        it("petty-cash-register", "Petty Cash Register", "list", "pharmacy_petty_cash"),
        it("posting", "Posting", "form", "pharmacy_finance_postings"),
        it("cash-book", "Cash Book", "list", "pharmacy_cash_books"),
        it("day-book", "Day Book", "list", "pharmacy_day_books"),
        it("gl-account", "GL Account", "crud", "pharmacy_gl_accounts"),
      ]),
      cat("reports", "Reports", [
        it("excel-export", "Excel Export", "report", "pharmacy_excel_exports"),
        it("slow-moving-item", "Slow Moving Item", "report", "pharmacy_slow_moving_item"),
        it("fast-moving-item", "Fast Moving Item", "report", "pharmacy_fast_moving_item"),
        it("sales-reports", "Sales Reports", "report", "pharmacy_sales_reports"),
        it("sales-collection", "Sales Collection", "report", "pharmacy_sales_collections"),
        it("purchase-reports", "Purchase Reports", "report", "pharmacy_purchase_reports"),
        it("supplier-os", "Supplier OS", "report", "pharmacy_supplier_os"),
        it("sponsorwise-collection", "SponsorWise Collection", "report", "pharmacy_sponsor_collections"),
        it("purchase-by-item", "Purchase By Item", "report", "pharmacy_purchase_by_items"),
        it("tracking-reports", "Tracking Reports", "report", "pharmacy_tracking_reports"),
        it("gst-report", "GST Report", "report", "pharmacy_gst_reports"),
        it("item-movement", "Item Movement", "report", "pharmacy_item_movements"),
        it("item-replenishment", "Item Replenishment", "report", "pharmacy_item_replenishments"),
        it("item-expiry", "Item Expiry", "report", "pharmacy_item_expiries"),
        it("stock-list", "Stock List", "report", "pharmacy_stock_lists"),
        it("cashsale-by-bill", "CashSale By Bill", "report", "pharmacy_cash_sale_by_bills"),
        it("cashsale-by-item", "CashSale By Item", "report", "pharmacy_cash_sale_by_items"),
        it("analysis-report", "Analysis Report", "report", "pharmacy_analysis_reports"),
        it("expense-summary", "Expense Summary", "report", "pharmacy_expense_summaries"),
        it("customer-os", "Customer OS", "report", "pharmacy_customer_os"),
      ]),
      cat("master", "Master", [
        it("customer", "Customer", "crud", "pharmacy_customers"),
        it("supplier", "Supplier", "crud", "pharmacy_suppliers"),
        it("supplier-gl", "Supplier GL", "crud", "pharmacy_supplier_gls"),
        it("manufacturer", "Manufacturer", "crud", "pharmacy_manufacturers"),
        it("generic-name", "Generic Name", "crud", "pharmacy_generic_names"),
        it("item-master", "Item Master", "crud", "pharmacy_items"),
        it("stock-register", "Stock Register", "list", "pharmacy_stock_registers"),
        it("store-wise-register", "Store Wise Register", "list", "pharmacy_store_wise_registers"),
        it("opening-stock", "Opening Stock", "form", "pharmacy_opening_stocks"),
        it("chart-of-account", "Chart of Account", "crud", "pharmacy_chart_of_accounts"),
        it("pharmacy-gl", "Pharmacy GL", "crud", "pharmacy_gls"),
        it(
          "doctor-store-allocation",
          "Doctor Store Allocation",
          "crud",
          "pharmacy_doctor_store_allocations"
        ),
      ]),
      cat("setup-item", "Setup - Item", [
        it("item-class", "Item Class", "crud", "pharmacy_item_classes"),
        it("drug-item-class", "Drug Item Class", "crud", "pharmacy_drug_item_classes"),
        it("drug-type", "Drug Type", "crud", "pharmacy_drug_types"),
        it("storage-type", "Storage Type", "crud", "pharmacy_storage_types"),
        it("pregnancy-class", "Pregnancy Class", "crud", "pharmacy_pregnancy_classes"),
        it("therapeutic-class", "Therapeutic Class", "crud", "pharmacy_therapeutic_classes"),
        it("route", "Route", "crud", "pharmacy_routes"),
      ]),
      cat("setup-inventory", "Setup - Inventory", [
        it("store", "Store", "crud", "pharmacy_stores"),
        it("storage-location", "Storage Location", "crud", "pharmacy_storage_locations"),
      ]),
      cat("setup-finance", "Setup - Finance", [
        it("period", "Period", "crud", "pharmacy_periods"),
        it("instrument-type", "Instrument Type", "crud", "pharmacy_instrument_types"),
        it(
          "instrument-type-gl-asso",
          "Instrument Type GL Asso",
          "crud",
          "pharmacy_instrument_type_gl_assos"
        ),
        it("currency", "Currency", "crud", "pharmacy_currencies"),
      ]),
    ],
  },

  /* --------------------------------------------------------------- 15 */
  {
    id: 114,
    slug: "optical",
    title: "Optical",
    icon: "Glasses",
    description: "Optical store — sales, purchase, inventory, finance, customers and masters.",
    categories: [
      cat("sales", "Sales", [
        it("sales-order-list", "Sales Order List", "list", "optical_sales_orders"),
        it("sales-order", "Sales Order", "form", "optical_sales_orders"),
        it("sales-invoice-list", "Sales Invoice List", "list", "optical_sales"),
        it("sales-invoice", "Sales Invoice", "form", "optical_sales"),
        it("sales-return-list", "Sales Return List", "list", "optical_sales_returns"),
        it("sales-return", "Sales Return", "form", "optical_sales_returns"),
        it("sales-collection", "Sales Collection", "list", "optical_sales_collections"),
        it("due-collection", "Due Collection", "form", "optical_due_collections"),
        it(
          "patient-due-collection",
          "PatientDueCollection",
          "form",
          "optical_patient_due_collections"
        ),
        it("copy-document", "Copy Document", "form", "optical_copy_documents"),
      ]),
      cat("purchase", "Purchase", [
        it("cash-purchase-list", "Cash Purchase List", "list", "optical_cash_purchases"),
        it("cash-purchase", "Cash Purchase", "form", "optical_cash_purchases"),
        it("purchase-order-list", "Purchase Order List", "list", "optical_purchase_orders"),
        it("purchase-order", "Purchase Order", "form", "optical_purchase_orders"),
        it("purinvoice-direct-list", "PurInvoice Direct List", "list", "optical_pur_invoices"),
        it("purinvoice-direct", "PurInvoice Direct", "form", "optical_pur_invoices"),
        it("invoice-approval", "Invoice Approval", "form", "optical_invoice_approvals"),
        it("purchase-return-list", "Purchase Return List", "list", "optical_purchase_returns"),
        it("purchase-return", "Purchase Return", "form", "optical_purchase_returns"),
      ]),
      cat("inventory", "Inventory", [
        it("intend-list", "Intend List", "list", "optical_intends"),
        it("intend", "Intend", "form", "optical_intends"),
        it("goods-issue-list", "Goods Issue List", "list", "optical_goods_issues"),
        it("goods-issue", "Goods Issue", "form", "optical_goods_issues"),
        it("stores-return-list", "Stores Return List", "list", "optical_store_returns"),
        it("stores-return", "Stores Return", "form", "optical_store_returns"),
      ]),
      cat("finance", "Finance", [
        it("supplier-invoice-list", "Supplier Invoice List", "list", "optical_supplier_invoices"),
        it("supplier-invoice", "Supplier Invoice", "form", "optical_supplier_invoices"),
        it("payment-list", "Payment List", "list", "optical_payments"),
        it("payment", "Payment", "form", "optical_payments"),
        it("supplier-settlement", "Supplier Settlement", "form", "optical_supplier_settlements"),
        it(
          "supplier-debitnote-list",
          "Supplier DebitNote List",
          "list",
          "optical_supplier_debit_notes"
        ),
        it(
          "supplier-debitnote",
          "Supplier DebitNote",
          "form",
          "optical_supplier_debit_notes"
        ),
        it("posting", "Posting", "form", "optical_postings"),
      ]),
      cat("master", "Master", [
        it("customer-list", "Customer List", "list", "optical_customers"),
        it("customer", "Customer", "crud", "optical_customers"),
        it("supplier-list", "Supplier List", "list", "optical_suppliers"),
        it("supplier", "Supplier", "crud", "optical_suppliers"),
        it("supplier-gl-list", "Supplier GL List", "list", "optical_supplier_gls"),
        it("manufacturer-list", "Manufacturer List", "list", "optical_manufacturers"),
        it("manufacturer", "Manufacturer", "crud", "optical_manufacturers"),
        it("item-master-list", "Item Master List", "list", "optical_items"),
        it("stock-register", "Stock Register", "list", "optical_stock_registers"),
        it("opening-stock", "Opening Stock", "form", "optical_opening_stocks"),
        it("chart-of-account", "Chart of Account", "crud", "optical_chart_of_accounts"),
      ]),
      cat("setup-item", "Setup - Item", [
        it("item-class-list", "Item Class List", "list", "optical_item_classes"),
        it("add-item-class", "Add Item Class", "crud", "optical_item_classes"),
        it("brand-list", "Brand List", "list", "optical_brands"),
        it("add-brand", "Add Brand", "crud", "optical_brands"),
      ]),
      cat("setup-inventory", "Setup - Inventory", [
        it("store-list", "Store List", "list", "optical_stores"),
        it("add-store", "Add Store", "crud", "optical_stores"),
        it("storage-location-list", "Storage Location List", "list", "optical_storage_locations"),
        it("add-storage-location", "Add Storage Location", "crud", "optical_storage_locations"),
      ]),
      cat("setup-finance", "Setup - Finance", [
        it("period-list", "Period List", "list", "optical_periods"),
        it("instrument-type-list", "Instrument Type List", "list", "optical_instrument_types"),
        it(
          "instrument-type-gl-asso-list",
          "Instrument Type GL Asso List",
          "list",
          "optical_instrument_type_gl_assos"
        ),
        it("currency-list", "Currency List", "list", "optical_currencies"),
      ]),
    ],
  },

  /* --------------------------------------------------------------- 16 */
  {
    id: 115,
    slug: "transport",
    title: "Transport",
    icon: "Ambulance",
    description: "Patient transport — trips, vehicles, masters and setup.",
    categories: [
      cat("transaction", "Transaction", [
        it("tripsheet-register", "Trip Sheet Register", "form", "transport_tripsheets"),
        it("tripsheet", "Trip Sheet Entry", "form", "transport_tripsheets"),
        it(
          "tripsheet-ambulance-list",
          "Ambulance Trip List",
          "list",
          "transport_ambulance_tripsheets"
        ),
        it("vehicle-expense-list", "Vehicle Expenses", "list", "transport_vehicle_expenses"),
        it(
          "tripsheet-register-report",
          "Trip Sheet Report",
          "report",
          "transport_tripsheet_reports"
        ),
        it("ambulance-mis-reports", "Ambulance MIS Report", "report", "transport_mis_reports"),
      ]),
      cat("master", "Master", [
        it("driver-list", "Driver List", "list", "transport_drivers"),
        it("driver", "Driver", "crud", "transport_drivers"),
        it("vehicle-list", "Vehicle List", "list", "transport_vehicles"),
        it("vehicle", "Vehicle", "crud", "transport_vehicles"),
        it("travel-place-list", "Travel Place List", "list", "transport_travel_places"),
        it("travel-place", "Travel Place", "crud", "transport_travel_places"),
      ]),
      cat("setup", "Setup", [
        it("vehicle-type-list", "Vehicle Type List", "list", "transport_vehicle_types"),
        it("vehicle-type", "Vehicle Type", "crud", "transport_vehicle_types"),
        it("expense-type-list", "Expense Type List", "list", "transport_expense_types"),
        it("expense-type", "Expense Type", "crud", "transport_expense_types"),
      ]),
    ],
  },

  /* --------------------------------------------------------------- 17 */
  {
    id: 116,
    slug: "housekeeping",
    title: "House Keeping",
    icon: "SprayCan",
    description: "Housekeeping transactions — cleaning, rounds and requests.",
    categories: [
      cat("transaction", "Transaction", [
        it("linen-issue-list", "Linen Issue", "list", "hks_linen_issues"),
        it("linen-issue", "Linen Issue Entry", "form", "hks_linen_issues"),
        it("linen-return-list", "Linen Return", "list", "hks_linen_returns"),
        it("linen-return", "Linen Return Entry", "form", "hks_linen_returns"),
        it("linen-transfer-list", "Linen Transfer", "list", "hks_linen_transfers"),
        it("linen-transfer", "Linen Transfer Entry", "form", "hks_linen_transfers"),
        it("laundry-dispatch-list", "Laundry Dispatch", "list", "hks_laundry_dispatches"),
        it("laundry-dispatch", "Laundry Dispatch Entry", "form", "hks_laundry_dispatches"),
        it("laundry-receipt-list", "Laundry Receipt", "list", "hks_laundry_receipts"),
        it("laundry-receipt", "Laundry Receipt Entry", "form", "hks_laundry_receipts"),
        it("petty-cash-expense", "Petty Cash Expense", "form", "hks_petty_cash_expenses"),
      ]),
    ],
  },

  /* --------------------------------------------------------------- 18 */
  {
    id: 117,
    slug: "blood-bank",
    title: "Blood Bank",
    icon: "Droplet",
    description: "Blood bank — issues, storage, masters and setup.",
    categories: [
      cat("transaction", "Transaction", [
        it("service-request", "Blood Request", "form", "bb_service_requests"),
        it("donation-camp", "Blood Donation Camp", "form", "bb_donation_camps"),
        it("donor-registration", "Donor Registration", "form", "bb_donors"),
        it("screening", "Donor Screening", "form", "bb_screenings"),
        it("donor-blood-collection", "Blood Collection", "form", "bb_blood_collections"),
        it("component-separation", "Component Separation", "form", "bb_component_separations"),
        it("blood-request", "Issue Request", "form", "bb_blood_requests"),
        it("blood-dispatch", "Blood Issue / Dispatch", "form", "bb_blood_dispatches"),
        it("request-by-hospital", "Request from Other Hospital", "form", "bb_hospital_requests"),
        it("dispatch-to-hospital", "Dispatch to Other Hospital", "form", "bb_hospital_dispatches"),
        it("transfusion-reaction", "Transfusion Reaction", "form", "bb_transfusion_reactions"),
      ]),
      cat("master", "Master", [
        it("donor", "Donor", "crud", "bb_donors"),
        it("hospital", "Hospital", "crud", "bb_hospitals"),
        it("organization", "Organization", "crud", "bb_organizations"),
        it("blood-bank", "Blood Bank", "crud", "bb_blood_banks"),
        it("blood-stock", "Blood Stock", "list", "bb_blood_stocks"),
        it("blood-bag", "Blood Bag", "crud", "bb_blood_bags"),
      ]),
      cat("setup", "Setup", [
        it("blood-group", "Blood Group", "crud", "bb_blood_groups"),
        it("blood-component", "Blood Component", "crud", "bb_blood_components"),
        it("bloodgroup-crossmatch", "BloodGroup CrossMatch", "crud", "bb_crossmatches"),
      ]),
    ],
  },

  /* --------------------------------------------------------------- 19 */
  {
    id: 118,
    slug: "diet",
    title: "Diet",
    icon: "UtensilsCrossed",
    description: "Diet orders, charts, reports and masters.",
    categories: [
      cat("transaction", "Transaction", [
        it("diet-routine-delivery", "Diet Routine & Delivery", "form", "diet_routine_deliveries"),
        it("diet-order", "Diet Order", "form", "diet_orders"),
        it("diet-mass-creation", "Mass Diet Order", "form", "diet_mass_creations"),
      ]),
      cat("reports", "Reports", [
        it("diet-order-report", "Diet Order Report", "report", "diet_order_reports"),
      ]),
      cat("master", "Master", [
        it("canteen-menu-list", "CanteenMenu List", "list", "diet_canteen_menus"),
        it("canteen-menu", "CanteenMenu", "crud", "diet_canteen_menus"),
      ]),
    ],
  },

  /* --------------------------------------------------------------- 20 */
  {
    id: 120,
    slug: "hrm",
    title: "HRM",
    icon: "Users",
    description: "Human resources — employees, holidays, enterprises, reports and setup.",
    categories: [
      cat("transaction", "Transaction", [
        it("attendance-list", "Attendance", "list", "hrm_attendance"),
        it("loan-list", "Loans", "list", "hrm_loans"),
        it("loan", "Loan Entry", "form", "hrm_loans"),
        it("payroll-generation", "Payroll Generation", "form", "hrm_payrolls"),
        it("payroll-modification", "Payroll Modification", "form", "hrm_payrolls"),
        it("duty-roaster", "Duty Roster", "form", "hrm_duty_rosters"),
        it("leave-register", "Leave Register", "list", "hrm_leaves"),
        it("leave-register-self", "My Leave Register", "list", "hrm_leaves"),
        it("leave", "Apply Leave", "form", "hrm_leaves"),
        it("leave-approval-list", "Leave Approval", "list", "hrm_leave_approvals"),
        it("leave-permission-list", "Short Leave / Permission", "list", "hrm_leave_permissions"),
        it("leave-permission", "Apply Short Leave / Permission", "form", "hrm_leave_permissions"),
        it(
          "leave-permission-approval-list",
          "Permission Approval",
          "list",
          "hrm_leave_permission_approvals"
        ),
        it("payroll-posting", "Payroll Posting", "form", "hrm_payroll_postings"),
      ]),
      cat("report", "Report", [
        it("payslip-report", "PaySlip Report", "report", "hrm_payslip_reports"),
        it("payadvice-report", "PayAdvice Report", "report", "hrm_payadvice_reports"),
        it("staff-detail", "Staff Detail", "report", "hrm_staff_details"),
        it("salary-detail-reports", "Salary Detail Reports", "report", "hrm_salary_detail_reports"),
        it(
          "attendance-register-report",
          "AttendanceRegister Report",
          "report",
          "hrm_attendance_register_reports"
        ),
        it("excel-export", "Excel Export", "report", "hrm_excel_exports"),
      ]),
      cat("master", "Master", [
        it("staff-list", "Staff List", "list", "hrm_staff"),
        it("staff-basic-list", "Staff Basic List", "list", "hrm_staff_basics"),
        it("staff", "Staff", "form", "hrm_staff"),
        it("salary-list", "Salary List", "list", "hrm_salaries"),
        it("leave-balance", "Leave Balance", "crud", "hrm_leave_balances"),
        it("leave-balance-history", "Leave Balance History", "list", "hrm_leave_balance_histories"),
      ]),
      cat("setup-enterprise", "Setup - Enterprise", [
        it("site-list", "Site List", "list", "hrm_sites"),
        it("department-list", "Department List", "list", "hrm_departments"),
        it("add-department", "Add Department", "crud", "hrm_departments"),
        it("designation-list", "Designation List", "list", "hrm_designations"),
        it("add-designation", "Add Designation", "crud", "hrm_designations"),
        it("shift-list", "Shift List", "list", "hrm_shifts"),
        it("add-shift", "Add Shift", "crud", "hrm_shifts"),
        it("holidaytype-list", "HolidayType List", "list", "hrm_holiday_types"),
        it("add-holidaytype", "Add HolidayType", "crud", "hrm_holiday_types"),
        it("leavetype-list", "LeaveType List", "list", "hrm_leave_types"),
        it("add-leavetype", "Add LeaveType", "crud", "hrm_leave_types"),
      ]),
      cat("setup-demographic", "Setup - Demographic", [
        it("locality", "Locality", "crud", "hrm_localities"),
        it("city", "City", "crud", "hrm_cities"),
        it("district", "District", "crud", "hrm_districts"),
        it("state", "State", "crud", "hrm_states"),
        it("country", "Country", "crud", "hrm_countries"),
      ]),
      cat("setup-payroll", "Setup - Payroll", [
        it("payhead-list", "PayHead List", "list", "hrm_pay_heads"),
        it("add-payhead", "Add PayHead", "crud", "hrm_pay_heads"),
        it("loan-type-list", "Loan Type List", "list", "hrm_loan_types"),
        it("add-loan-type", "Add Loan Type", "crud", "hrm_loan_types"),
      ]),
      cat("setup-general", "Setup - General", [
        it("skill-type-list", "Skill Type List", "list", "hrm_skill_types"),
        it("skill-list", "Skill List", "list", "hrm_skills"),
        it("leave-category-list", "Leave Category List", "list", "hrm_leave_categories"),
        it("leave-type-list", "Leave Type List", "list", "hrm_leave_types"),
        it(
          "leave-eligibility-criteria-list",
          "Leave Eligibility Criteria List",
          "list",
          "hrm_leave_eligibility_criteria"
        ),
        it(
          "leavetype-association-list",
          "LeaveType Association List",
          "list",
          "hrm_leavetype_associations"
        ),
        it(
          "hrm-ptax-definition-list",
          "HRM PTax Definition List",
          "list",
          "hrm_ptax_definitions"
        ),
        it(
          "staff-attendance-system-asso",
          "Staff Attendance System Asso",
          "list",
          "hrm_attendance_system_assos"
        ),
        it("salary-account", "Salary Account", "crud", "hrm_salary_accounts"),
        it("staff-group", "Staff Group", "crud", "hrm_staff_groups"),
        it(
          "payhead-gl-association",
          "PayHead GL Association",
          "list",
          "hrm_payhead_gl_assos"
        ),
        it("staff-gl-association", "Staff GL Association", "list", "hrm_staff_gl_assos"),
      ]),
    ],
  },

  /* --------------------------------------------------------------- 21 */
  {
    id: 121,
    slug: "purchase",
    title: "Purchase",
    icon: "ShoppingCart",
    description: "Procurement — purchase transactions, inventory, reports and masters.",
    categories: [
      cat("purchase", "Purchase", [
        it("cash-purchase", "Cash Purchase", "form", "pur_cash_purchases"),
        it("purchase-request", "Purchase Request", "form", "pur_requests"),
        it("purchase-order", "Purchase Order", "form", "pur_orders"),
        it("goods-receipt", "Goods Receipt", "form", "pur_goods_receipts"),
        it("invoice-approval", "Invoice Approval", "form", "pur_invoice_approvals"),
        it("purchase-return", "Purchase Return", "form", "pur_returns"),
        it(
          "purchase-order-tracking-list",
          "Purchase Order Tracking List",
          "list",
          "pur_order_trackings"
        ),
        it("purchase-order-approval", "Purchase Order Approval", "form", "pur_order_approvals"),
      ]),
      cat("inventory", "Inventory", [
        it("store-indent", "Store Indent", "form", "pur_store_indents"),
        it("store-indent-approval", "Store Indent Approval", "form", "pur_store_indent_approvals"),
        it("item-transfer", "Item Transfer", "form", "pur_item_transfers"),
        it("item-acceptance", "Item Acceptance", "form", "pur_item_acceptances"),
        it("item-received", "Item Received", "form", "pur_item_receiveds"),
        it("item-return", "Item Return", "form", "pur_item_returns"),
        it(
          "item-return-acceptance",
          "Item Return Acceptance",
          "form",
          "pur_item_return_acceptances"
        ),
        it("item-consumption", "Item Consumption", "form", "pur_item_consumptions"),
        it("stock-taking", "Stock Taking", "form", "pur_stock_takings"),
        it("stock-register", "Stock Register", "list", "pur_stock_registers"),
        it("stock-item-wise", "Stock Item Wise", "list", "pur_stock_item_wise"),
        it("stock-day-end", "Stock Day End", "form", "pur_stock_day_ends"),
        it("update-item-balance", "Update Item Balance", "form", "pur_item_balance_updates"),
        it("store-to-store-transfer", "Store To Store Transfer", "form", "pur_store_transfers"),
      ]),
      cat("reports", "Reports", [
        it("excelexport-purchase", "ExcelExport-Purchase", "report", "pur_excel_exports"),
        it(
          "excelexport-stock-detail",
          "ExcelExport-Stock Detail",
          "report",
          "pur_stock_detail_exports"
        ),
        it(
          "excelexport-item-transfer",
          "ExcelExport-Item Transfer",
          "report",
          "pur_item_transfer_exports"
        ),
        it(
          "excelexport-analysis-report",
          "ExcelExport-Analysis Report",
          "report",
          "pur_analysis_exports"
        ),
        it("purchase-reports", "Purchase Reports", "report", "pur_reports"),
        it("po-tracking-reports", "PO Tracking Reports", "report", "pur_po_tracking_reports"),
        it("purchase-by-item", "Purchase By Item", "report", "pur_purchase_by_items"),
        it("item-replenishment", "Item Replenishment", "report", "pur_item_replenishments"),
        it("item-expiry", "Item Expiry", "report", "pur_item_expiries"),
        it(
          "supplier-wise-rate-comparision",
          "Supplier Wise Rate Comparision",
          "report",
          "pur_supplier_rate_comparisons"
        ),
        it(
          "stock-analysis-report",
          "Stock Analysis Report",
          "report",
          "pur_stock_analysis_reports"
        ),
        it(
          "stock-validation-report",
          "Stock Validation Report",
          "report",
          "pur_stock_validation_reports"
        ),
        it(
          "stock-adjustment-report",
          "Stock Adjustment Report",
          "report",
          "pur_stock_adjustment_reports"
        ),
        it("stock-list", "Stock List", "report", "pur_stock_lists"),
        it(
          "stock-by-drug-classification",
          "Stock By Drug Classification",
          "report",
          "pur_stock_by_drug_classifications"
        ),
        it("item-transfer-report", "Item Transfer", "report", "pur_item_transfer_reports"),
        it("item-movement", "Item Movement", "report", "pur_item_movements"),
      ]),
      cat("master", "Master", [
        it("supplier", "Supplier", "crud", "pur_suppliers"),
        it("supplier-gl", "Supplier GL", "crud", "pur_supplier_gls"),
        it("item-master", "Item Master", "crud", "pur_items"),
        it("drug-master", "Drug Master", "crud", "pur_drugs"),
        it("item-master-draft", "Item Master Draft", "crud", "pur_item_drafts"),
        it("item-master-approve", "Item Master Approve", "crud", "pur_item_approvals"),
        it("item-gl-association", "Item GL Association", "crud", "pur_item_gl_assos"),
        it("item-group-gl", "Item Group GL", "crud", "pur_item_group_gls"),
        it("purchase-order-template", "Purchase Order Template", "crud", "pur_po_templates"),
        it("department-store-asso", "Department Store Asso", "crud", "pur_dept_store_assos"),
      ]),
      cat("setup-general", "Setup - General", [
        it("product-setup", "Product Setup", "crud", "pur_product_setups"),
        it("product-brand", "Product Brand", "crud", "pur_product_brands"),
        it("product-master", "Product Master", "crud", "pur_product_masters"),
        it("uom", "UOM", "crud", "pur_uoms"),
        it("pricetype-gl-asso", "PriceType GL Asso", "crud", "pur_price_type_gl_assos"),
      ]),
      cat("setup-item", "Setup - Item", [
        it("item-group", "Item Group", "crud", "pur_item_groups"),
        it("association-type", "Association Type", "crud", "pur_association_types"),
        it("brand", "Brand", "crud", "pur_brands"),
        it("item-class", "Item Class", "crud", "pur_item_classes"),
        it("storage-type", "Storage Type", "crud", "pur_storage_types"),
        it("pregnancy-class", "Pregnancy Class", "crud", "pur_pregnancy_classes"),
        it("therapeutic-class", "Therapeutic Class", "crud", "pur_therapeutic_classes"),
        it("route", "Route", "crud", "pur_routes"),
      ]),
      cat("setup-inventory", "Setup - Inventory", [
        it("store", "Store", "crud", "pur_stores"),
        it("store-location", "Store Location", "crud", "pur_store_locations"),
      ]),
    ],
  },

  /* --------------------------------------------------------------- 22 */
  {
    id: 122,
    slug: "assets",
    title: "Asset",
    icon: "Boxes",
    description: "Asset register — movements, depreciation reports and masters.",
    categories: [
      cat("transaction", "Transaction", [
        it("asset-movement-list", "Asset Movement List", "list", "asset_movements"),
        it("asset-movement", "Asset Movement", "form", "asset_movements"),
      ]),
      cat("reports", "Reports", [
        it("asset-reports", "Asset Reports", "report", "asset_reports"),
      ]),
      cat("master", "Master", [
        it("asset-master-list", "Asset Master List", "list", "asset_masters"),
      ]),
    ],
  },

  /* --------------------------------------------------------------- 23 */
  {
    id: 123,
    slug: "finance",
    title: "Finance",
    icon: "Landmark",
    description: "Accounting — general ledger, receivables, payables, processes, reports and masters.",
    categories: [
      cat("general", "General", [
        it("journal-list", "Journal List", "list", "fin_journals"),
        it("journal", "Journal", "form", "fin_journals"),
        it("contra-list", "Contra List", "list", "fin_contras"),
        it("contra", "Contra", "form", "fin_contras"),
        it("posting", "Posting", "form", "fin_postings"),
      ]),
      cat("receivable", "Receivable", [
        it("customer-invoice-list", "Customer Invoice List", "list", "fin_customer_invoices"),
        it("customer-invoice", "Customer Invoice", "form", "fin_customer_invoices"),
        it("receipt-list", "Receipt List", "list", "fin_receipts"),
        it("receipt", "Receipt", "form", "fin_receipts"),
        it(
          "customer-creditnote-list",
          "Customer CreditNote List",
          "list",
          "fin_customer_credit_notes"
        ),
        it("customer-creditnote", "Customer CreditNote", "form", "fin_customer_credit_notes"),
      ]),
      cat("payable", "Payable", [
        it("supplier-invoice-list", "Supplier Invoice List", "list", "fin_supplier_invoices"),
        it("supplier-invoice", "Supplier Invoice", "form", "fin_supplier_invoices"),
        it("payment-list", "Payment List", "list", "fin_payments"),
        it("payment", "Payment", "form", "fin_payments"),
        it("supplier-settlement", "Supplier Settlement", "form", "fin_supplier_settlements"),
        it(
          "settlement-all-suppliers",
          "Settlement-All Suppliers",
          "form",
          "fin_all_supplier_settlements"
        ),
        it(
          "supplier-creditnote-list",
          "Supplier CreditNote List",
          "list",
          "fin_supplier_credit_notes"
        ),
        it("supplier-creditnote", "Supplier CreditNote", "form", "fin_supplier_credit_notes"),
        it(
          "supplier-debitnote-list",
          "Supplier DebitNote List",
          "list",
          "fin_supplier_debit_notes"
        ),
        it("supplier-debitnote", "Supplier DebitNote", "form", "fin_supplier_debit_notes"),
        it(
          "doctor-share-settlement",
          "Doctor Share Settlement",
          "form",
          "fin_doctor_share_settlements"
        ),
      ]),
      cat("process", "Process", [
        it("year-end-process", "Year End Process", "form", "fin_year_end_processes"),
        it("export", "Export", "form", "fin_exports"),
        it("voucher-update", "Voucher Update", "form", "fin_voucher_updates"),
        it("payroll-export", "PayRoll Export", "form", "fin_payroll_exports"),
        it("copy-closing-balance", "Copy Closing Balance", "form", "fin_closing_balances"),
      ]),
      cat("reports", "Reports", [
        it("gl-account", "GL Account", "report", "fin_r_gl_accounts"),
        it("cash-book", "Cash Book", "report", "fin_r_cash_books"),
        it("bank-book", "Bank Book", "report", "fin_r_bank_books"),
        it("day-book", "Day Book", "report", "fin_r_day_books"),
        it(
          "cash-book-cum-day-book",
          "Cash Book Cum Day Book",
          "report",
          "fin_r_cash_book_cum_day_books"
        ),
        it("expense-summary", "Expense Summary", "report", "fin_r_expense_summaries"),
        it("receipt-summary", "Receipt Summary", "report", "fin_r_receipt_summaries"),
        it("dept-wise-collection", "Dept Wise Collection", "report", "fin_r_dept_wise_collections"),
        it("finance-mis-report", "Finance MIS Report", "report", "fin_r_mis_reports"),
        it(
          "trail-balance-with-movement",
          "Trail Balance With Movement",
          "report",
          "fin_r_trial_balance_movements"
        ),
        it("trail-balance", "Trail Balance", "report", "fin_r_trial_balances"),
        it("profit-loss", "Profit Loss", "report", "fin_r_profit_loss"),
        it("balance-sheet", "Balance Sheet", "report", "fin_r_balance_sheets"),
        it(
          "partner-fee-collection",
          "Partner Fee Collection",
          "report",
          "fin_r_partner_fee_collections"
        ),
        it("excel-export", "Excel Export", "report", "fin_r_excel_exports"),
      ]),
      cat("master", "Master", [
        it("customer-list", "Customer List", "list", "fin_customers"),
        it("customer", "Customer", "crud", "fin_customers"),
        it("supplier-list", "Supplier List", "list", "fin_suppliers"),
        it("supplier", "Supplier", "crud", "fin_suppliers"),
        it("bank-list", "Bank List", "list", "fin_banks"),
        it("bank", "Bank", "crud", "fin_banks"),
        it("bank-account-list", "Bank Account List", "list", "fin_bank_accounts"),
        it("bank-account", "Bank Account", "crud", "fin_bank_accounts"),
        it(
          "voucher-template-definition",
          "Voucher Template Definition",
          "crud",
          "fin_voucher_templates"
        ),
        it("voucher-batch-creation", "Voucher Batch Creation", "crud", "fin_voucher_batches"),
      ]),
      cat("setup", "Setup", [
        it("period-list", "Period List", "list", "fin_periods"),
        it("period", "Period", "crud", "fin_periods"),
        it("instrument-type-list", "Instrument Type List", "list", "fin_instrument_types"),
        it("instrument-type", "Instrument Type", "crud", "fin_instrument_types"),
        it("account-group-list", "Account Group List", "list", "fin_account_groups"),
        it("account-group", "Account Group", "crud", "fin_account_groups"),
        it("chart-of-account", "Chart Of Account", "crud", "fin_chart_of_accounts"),
        it("generalledger", "GeneralLedger", "list", "fin_general_ledgers"),
        it("ledger-balance", "Ledger Balance", "list", "fin_ledger_balances"),
        it("fee-gl-asso-list", "Fee GL Asso List", "list", "fin_fee_gl_assos"),
        it(
          "instrument-type-gl-asso-list",
          "Instrument Type GL Asso List",
          "list",
          "fin_instrument_type_gl_assos"
        ),
        it("doctorfee-gl-asso-list", "DoctorFee GL Asso List", "list", "fin_doctor_fee_gl_assos"),
        it(
          "partnerfee-gl-asso-list",
          "PartnerFee GL Asso List",
          "list",
          "fin_partner_fee_gl_assos"
        ),
        it("provider-gl-asso-list", "Provider GL Asso List", "list", "fin_provider_gl_assos"),
        it("other-gl-asso-list", "Other GL Asso List", "list", "fin_other_gl_assos"),
        it(
          "bankaccount-type-list",
          "BankAccount Type List",
          "list",
          "fin_bank_account_types"
        ),
        it("bankaccounttype", "BankAccountType", "crud", "fin_bank_account_types"),
      ]),
    ],
  },

  /* --------------------------------------------------------------- 24 */
  {
    id: 124,
    slug: "admin",
    title: "Admin",
    icon: "Shield",
    description: "Security, users, roles, permissions, audit trail, tools and reports.",
    categories: [
      cat("security", "Security", [
        it("screen", "Screen", "crud", "adm_screens"),
        it("role", "Role", "crud", "roles"),
        it("dashboard-element", "Dashboard Element", "crud", "adm_dashboard_elements"),
        it("report-design", "Report Design", "crud", "adm_report_designs"),
        it("screen-privilege", "Screen Privilege", "crud", "adm_screen_privileges"),
        it("dashboard-privilege", "Dashboard Privilege", "crud", "adm_dashboard_privileges"),
        it("role-assigment", "Role Assigment", "crud", "adm_role_assignments"),
        it("change-password", "Change Password", "form", "adm_change_passwords"),
      ]),
      cat("tools", "Tools", [
        it("sequence-all-list", "Sequence All list", "list", "adm_sequences"),
        it("message-in-report", "Message in Report", "crud", "adm_report_messages"),
        it("delete-reports", "Delete Reports", "list", "adm_delete_reports"),
      ]),
      cat("reports", "Reports", [
        it("admin-role-report", "Admin Role Report", "report", "adm_role_reports"),
      ]),
    ],
  },
];

/** Collections only administrators may touch (API + UI guard). */
export const ADMIN_ONLY_COLLECTIONS = new Set([
  "users",
  "roles",
  "permissions",
  "module_access",
  "menu_access",
  "audit_logs",
  "system_configs",
  "backups",
]);

export const MENU_BY_SLUG = new Map(MENU.map((module) => [module.slug, module]));
