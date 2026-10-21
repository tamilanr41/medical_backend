/**
 * MongoDB seed for Zhanx HMS.
 *
 * Usage: npm run seed
 *
 * Drops and rebuilds the `zhanx_hms` database with:
 *   - bcrypt-hashed demo users (§24 accounts)
 *   - RBAC matrices (permissions / module access / menu access)
 *   - realistic operational data for every collection used by a menu screen
 *   - audit trail, system configuration and backup history
 */

import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";
import { SEED_USERS } from "../config/seed-users.js";
import { ROLES, ROLE_LABELS, ROLE_PERMISSIONS } from "../config/permissions.js";
import { MENU } from "../config/menu.js";

const URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.MONGODB_DB || "zhanx_hms";

const day = (back = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - back);
  return d.toISOString().slice(0, 10);
};

const P = [
  ["UH-2026-1001", "Rajesh Kumar", "Male", 45],
  ["UH-2026-1002", "Lakshmi Narayanan", "Female", 62],
  ["UH-2026-1003", "Aisha Khan", "Female", 29],
  ["UH-2026-1004", "Venkatesh Rao", "Male", 58],
  ["UH-2026-1005", "Priya Sharma", "Female", 34],
  ["UH-2026-1006", "Imran Siddiqui", "Male", 41],
  ["UH-2026-1007", "Fatima Begum", "Female", 67],
  ["UH-2026-1008", "Suresh Babu", "Male", 52],
];

const PATIENT_DETAILS = [
  { mobile: "9845012345", bloodGroup: "O+", patientType: "General", address: "12 Anna Nagar, Chennai", city: "Chennai", state: "Tamil Nadu" },
  { mobile: "9845512346", bloodGroup: "B+", patientType: "Corporate", address: "45 T. Nagar, Chennai", city: "Chennai", state: "Tamil Nadu" },
  { mobile: "9846612347", bloodGroup: "A+", patientType: "General", address: "8 Adyar, Chennai", city: "Chennai", state: "Tamil Nadu" },
  { mobile: "9847712348", bloodGroup: "AB+", patientType: "Insurance", address: "21 Velachery, Chennai", city: "Chennai", state: "Tamil Nadu" },
  { mobile: "9848812349", bloodGroup: "O-", patientType: "Staff", address: "3 Guindy, Chennai", city: "Chennai", state: "Tamil Nadu" },
  { mobile: "9849912350", bloodGroup: "B-", patientType: "General", address: "77 Tambaram, Chennai", city: "Chennai", state: "Tamil Nadu" },
  { mobile: "9850012351", bloodGroup: "A-", patientType: "VIP", address: "5 Mylapore, Chennai", city: "Chennai", state: "Tamil Nadu" },
  { mobile: "9851112352", bloodGroup: "O+", patientType: "General", address: "19 Porur, Chennai", city: "Chennai", state: "Tamil Nadu" },
];

const DATA = {
  /* ----------------------------- Out Patient -------------------------- */
  patients: P.map(([uhid, patientName, gender, age], i) => ({
    uhid,
    salutation: gender === "Male" ? "Mr." : "Mrs.",
    patientName,
    gender,
    age,
    bloodGroup: PATIENT_DETAILS[i].bloodGroup,
    patientType: PATIENT_DETAILS[i].patientType,
    mobile: PATIENT_DETAILS[i].mobile,
    address: PATIENT_DETAILS[i].address,
    city: PATIENT_DETAILS[i].city,
    state: PATIENT_DETAILS[i].state,
    status: "Active",
  })),
  op_registrations: [
    { opNo: "OP-2026-008922", uhid: P[0][0], patientName: P[0][1], gender: "Male", age: 45, department: "General Medicine", doctor: "Dr. Ananya Mehta", visitDate: day(0), tokenNo: 12, slotStart: "09:00", slotEnd: "09:15", appointmentType: "OP", purpose: "Consultation", referredBy: "Dr. H. Bala", status: "Confirmed" },
    { opNo: "OP-2026-008921", uhid: P[1][0], patientName: P[1][1], gender: "Female", age: 62, department: "Cardiology", doctor: "Dr. S. Krishnan", visitDate: day(0), tokenNo: 11, slotStart: "10:00", slotEnd: "10:15", appointmentType: "OP", purpose: "Review", referredBy: "Dr. N. Iyer", status: "Arrived" },
    { opNo: "OP-2026-008920", uhid: P[2][0], patientName: P[2][1], gender: "Female", age: 29, department: "General Medicine", doctor: "Dr. Ananya Mehta", visitDate: day(1), tokenNo: 9, slotStart: "09:15", slotEnd: "09:30", appointmentType: "OP", purpose: "Consultation", status: "Checked-out" },
    { opNo: "OP-2026-008919", uhid: P[3][0], patientName: P[3][1], gender: "Male", age: 58, department: "Nephrology", doctor: "Dr. P. Deshmukh", visitDate: day(1), tokenNo: 7, slotStart: "11:00", slotEnd: "11:20", appointmentType: "OP", purpose: "Review", referredBy: "Dr. H. Bala", status: "Tentative" },
    { opNo: "OP-2026-008918", uhid: P[4][0], patientName: P[4][1], gender: "Female", age: 34, department: "Orthopedics", doctor: "Dr. R. Nambiar", visitDate: day(2), tokenNo: 15, slotStart: "09:30", slotEnd: "09:45", appointmentType: "Scan", purpose: "Procedure", status: "Confirmed" },
    { opNo: "OP-2026-008917", uhid: P[5][0], patientName: P[5][1], gender: "Male", age: 41, department: "General Medicine", doctor: "Dr. Ananya Mehta", visitDate: day(3), tokenNo: 6, slotStart: "10:30", slotEnd: "10:45", appointmentType: "OP", purpose: "Consultation", status: "Confirmed" },
    { opNo: "OP-2026-008916", uhid: P[6][0], patientName: P[6][1], gender: "Female", age: 67, department: "Cardiology", doctor: "Dr. S. Krishnan", visitDate: day(4), tokenNo: 10, slotStart: "09:00", slotEnd: "09:15", appointmentType: "OP", purpose: "Review", referredBy: "Dr. N. Iyer", status: "Checked-in" },
    { opNo: "OP-2026-008915", uhid: P[7][0], patientName: P[7][1], gender: "Male", age: 52, department: "General Medicine", doctor: "Dr. Ananya Mehta", visitDate: day(5), tokenNo: 4, slotStart: "12:00", slotEnd: "12:15", appointmentType: "OP", purpose: "Consultation", status: "Cancelled" },
    { opNo: "OP-2026-008912", uhid: P[5][0], patientName: P[5][1], gender: "Male", age: 41, department: "General Medicine", doctor: "Dr. Ananya Mehta", visitDate: day(0), tokenNo: 14, slotStart: "", slotEnd: "", appointmentType: "OP", purpose: "Health Checkup", college: "Anna University Health Camp", status: "Arrived" },
  ],
  op_doctor_schedules: [
    { doctor: "Dr. Ananya Mehta", department: "General Medicine", sessionStart: "09:00", sessionEnd: "13:00", slotMinutes: 15, status: "Active" },
    { doctor: "Dr. S. Krishnan", department: "Cardiology", sessionStart: "09:00", sessionEnd: "14:00", slotMinutes: 15, status: "Active" },
    { doctor: "Dr. P. Deshmukh", department: "Nephrology", sessionStart: "09:00", sessionEnd: "13:00", slotMinutes: 20, status: "Active" },
    { doctor: "Dr. R. Nambiar", department: "Orthopedics", sessionStart: "09:00", sessionEnd: "13:00", slotMinutes: 15, status: "Active" },
  ],
  op_appointment_blocks: [
    { doctor: "Dr. Ananya Mehta", date: day(0), startTime: "11:00", endTime: "12:00", reason: "OT / procedure", createdBy: "system" },
  ],
  op_bills: [
    { billNo: "BILL-2026-019284", uhid: P[0][0], patientName: P[0][1], doctor: "Dr. Ananya Mehta", billDate: day(0), grossAmount: 1450, discount: 0, tax: 72.5, netAmount: 1522.5, paidAmount: 1522.5, balance: 0, paymentMode: "UPI", status: "Paid" },
    { billNo: "BILL-2026-019283", uhid: P[1][0], patientName: P[1][1], doctor: "Dr. S. Krishnan", billDate: day(0), grossAmount: 4200, discount: 210, tax: 199.5, netAmount: 4189.5, paidAmount: 2000, balance: 2189.5, paymentMode: "Card", status: "Partially Paid" },
    { billNo: "BILL-2026-019282", uhid: P[2][0], patientName: P[2][1], doctor: "Dr. Ananya Mehta", billDate: day(1), grossAmount: 900, discount: 0, tax: 45, netAmount: 945, paidAmount: 945, balance: 0, paymentMode: "Cash", status: "Paid" },
    { billNo: "BILL-2026-019281", uhid: P[3][0], patientName: P[3][1], doctor: "Dr. P. Deshmukh", billDate: day(1), grossAmount: 2600, discount: 130, tax: 123.5, netAmount: 2593.5, paidAmount: 0, balance: 2593.5, paymentMode: "Insurance", status: "Unpaid" },
    { billNo: "BILL-2026-019280", uhid: P[4][0], patientName: P[4][1], doctor: "Dr. R. Nambiar", billDate: day(2), grossAmount: 3100, discount: 0, tax: 155, netAmount: 3255, paidAmount: 3255, balance: 0, paymentMode: "UPI", status: "Paid" },
    { billNo: "BILL-2026-019279", uhid: P[6][0], patientName: P[6][1], doctor: "Dr. S. Krishnan", billDate: day(4), grossAmount: 5100, discount: 510, tax: 229.5, netAmount: 4819.5, paidAmount: 4819.5, balance: 0, paymentMode: "Cash", status: "Paid" },
    { billNo: "BILL-2026-019285", uhid: P[0][0], patientName: P[0][1], doctor: "Dr. Ananya Mehta", billDate: day(0), grossAmount: 2400, discount: 0, tax: 120, netAmount: 2520, paidAmount: 0, balance: 2520, paymentBy: "By Sponsor", sponsorType: "Corporate", sponsorName: "Infotech Solutions Pvt Ltd", sponsorRef: "INF-EMP-4471", creditLimit: 25000, paymentMode: "Credit", status: "Credit" },
    { billNo: "BILL-2026-019286", uhid: P[3][0], patientName: P[3][1], doctor: "Dr. P. Deshmukh", billDate: day(1), grossAmount: 6800, discount: 340, tax: 323, netAmount: 6783, paidAmount: 0, balance: 6783, paymentBy: "By Sponsor", sponsorType: "Insurance", sponsorName: "Star Health Insurance", sponsorRef: "POL-2026-88923", creditLimit: 100000, paymentMode: "Credit", status: "Credit" },
  ],
  prescriptions: [
    { rxNo: "RX-2026-00452", uhid: P[0][0], patientName: P[0][1], doctor: "Dr. Ananya Mehta", department: "General Medicine", date: day(0), diagnosis: "Viral fever with body ache", medicines: "Tab. Paracetamol 650mg - 1 TDS x 3 days\nCap. Vitamin C 500mg - 1 OD x 5 days", notes: "Plenty of fluids. Review if fever persists beyond 72 hours." },
    { rxNo: "RX-2026-00451", uhid: P[1][0], patientName: P[1][1], doctor: "Dr. S. Krishnan", department: "Cardiology", date: day(0), diagnosis: "Hypertension - uncontrolled", medicines: "Tab. Telmisartan 40mg - 1 OD\nTab. Metoprolol 25mg - 1 BD", notes: "Low sodium diet. BP review after 2 weeks." },
    { rxNo: "RX-2026-00450", uhid: P[3][0], patientName: P[3][1], doctor: "Dr. P. Deshmukh", department: "Nephrology", date: day(1), diagnosis: "CKD stage 3 with anaemia", medicines: "Tab. Erythropoietin as advised\nTab. Folic acid 5mg - 1 OD", notes: "Renal diet. Repeat KFT after 3 weeks." },
    { rxNo: "RX-2026-00449", uhid: P[4][0], patientName: P[4][1], doctor: "Dr. R. Nambiar", department: "Orthopedics", date: day(2), diagnosis: "Lumbar spondylosis", medicines: "Tab. Aceclofenac 100mg - 1 BD x 5 days\nCap. Rabeprazole 20mg - 1 AC x 5 days", notes: "Physiotherapy 3x/week. Avoid heavy lifting." },
    { rxNo: "RX-2026-00448", uhid: P[7][0], patientName: P[7][1], doctor: "Dr. Ananya Mehta", department: "General Medicine", date: day(5), diagnosis: "Type 2 diabetes mellitus - review", medicines: "Tab. Metformin 500mg - 1 BD", notes: "HbA1c due. Diet and exercise counselling given." },
  ],
  op_visits: [
    { opNo: "OP-2026-008922", uhid: P[0][0], patientName: P[0][1], gender: "Male", age: 45, visitDate: day(0), department: "General Medicine", doctor: "Dr. Ananya Mehta", complaint: "Fever with body ache for 3 days", temperature: "101.2 F", bp: "120/80", pulse: "92", spo2: "98", weight: "72", height: "172", provisionalDiagnosis: "Viral fever", diagnosis: "Viral fever", rxNo: "RX-2026-00452", status: "Consulted", mode: "In-Person" },
    { opNo: "OP-2026-008921", uhid: P[1][0], patientName: P[1][1], gender: "Female", age: 62, visitDate: day(0), department: "Cardiology", doctor: "Dr. S. Krishnan", complaint: "Occasional palpitations", bp: "150/94", pulse: "88", spo2: "97", weight: "68", height: "158", provisionalDiagnosis: "Hypertension - uncontrolled", diagnosis: "Hypertension review", rxNo: "RX-2026-00451", status: "Consulted", mode: "In-Person" },
    { opNo: "OP-2026-008920", uhid: P[2][0], patientName: P[2][1], gender: "Female", age: 29, visitDate: day(1), department: "General Medicine", doctor: "Dr. Ananya Mehta", complaint: "Tiredness and pallor", bp: "110/70", pulse: "96", spo2: "99", weight: "54", height: "160", diagnosis: "Anaemia", status: "Closed", mode: "In-Person" },
    { opNo: "OP-2026-008919", uhid: P[3][0], patientName: P[3][1], gender: "Male", age: 58, visitDate: day(1), department: "Nephrology", doctor: "Dr. P. Deshmukh", complaint: "Swelling of both feet", bp: "140/86", pulse: "80", spo2: "98", weight: "74", height: "168", provisionalDiagnosis: "CKD stage 3 with oedema", diagnosis: "CKD review", status: "Open", mode: "In-Person" },
    { opNo: "OP-2026-008918", uhid: P[4][0], patientName: P[4][1], gender: "Female", age: 34, visitDate: day(2), department: "Orthopedics", doctor: "Dr. R. Nambiar", complaint: "Low back pain radiating to left leg", bp: "118/76", pulse: "80", weight: "64", height: "160", provisionalDiagnosis: "Lumbar radiculopathy", diagnosis: "Low back pain", rxNo: "RX-2026-00449", status: "Closed", mode: "In-Person" },
    { opNo: "OP-2026-008917", uhid: P[5][0], patientName: P[5][1], gender: "Male", age: 41, visitDate: day(3), department: "General Medicine", doctor: "Dr. Ananya Mehta", complaint: "Epigastric burning after meals", bp: "124/82", pulse: "84", weight: "78", height: "176", diagnosis: "Gastritis", status: "Closed", mode: "In-Person" },
    { opNo: "OP-2026-008916", uhid: P[6][0], patientName: P[6][1], gender: "Female", age: 67, visitDate: day(4), department: "Cardiology", doctor: "Dr. S. Krishnan", complaint: "Irregular heartbeat, giddiness", bp: "138/86", pulse: "104", spo2: "96", weight: "60", height: "154", provisionalDiagnosis: "Atrial fibrillation", diagnosis: "Arrhythmia workup", status: "Open", mode: "In-Person" },
    { opNo: "OP-2026-008915", uhid: P[7][0], patientName: P[7][1], gender: "Male", age: 52, visitDate: day(5), department: "General Medicine", doctor: "Dr. Ananya Mehta", complaint: "Routine diabetes follow-up", bp: "130/84", pulse: "78", weight: "86", height: "170", diagnosis: "Diabetes review", rxNo: "RX-2026-00448", status: "Closed", mode: "In-Person" },
    { opNo: "OP-2026-008914", uhid: P[2][0], patientName: P[2][1], gender: "Female", age: 29, visitDate: day(1), department: "General Medicine", doctor: "Dr. A. Fernandes", complaint: "Online review of blood reports", bp: "118/78", pulse: "80", spo2: "99", provisionalDiagnosis: "Iron deficiency anaemia", diagnosis: "Anaemia - follow-up", status: "Consulted", mode: "Online", meetingLink: "https://meet.zhanxhms.example/op-008914" },
    { opNo: "OP-2026-008913", uhid: P[0][0], patientName: P[0][1], gender: "Male", age: 45, visitDate: day(0), department: "General Medicine", doctor: "Dr. A. Fernandes", complaint: "Online follow-up for fever", temperature: "99.4 F", bp: "120/80", pulse: "86", spo2: "98", diagnosis: "Viral fever - resolving", status: "Consulted", mode: "Online", meetingLink: "https://meet.zhanxhms.example/op-008913" },
  ],
  op_services: [
    { code: "CONS-GEN", name: "Consultation - General Medicine", feeGroup: "Consultation", charge: 500, status: "Active" },
    { code: "CONS-SPL", name: "Consultation - Specialist", feeGroup: "Consultation", charge: 800, status: "Active" },
    { code: "LAB-CBC", name: "Complete Blood Count (CBC)", feeGroup: "Laboratory", charge: 450, status: "Active" },
    { code: "LAB-LFT", name: "Liver Function Test", feeGroup: "Laboratory", charge: 1200, status: "Active" },
    { code: "XRAY-CHEST", name: "X-Ray Chest PA", feeGroup: "Radiology", charge: 600, status: "Active" },
    { code: "ECG", name: "ECG - 12 Lead", feeGroup: "Cardiology", charge: 500, status: "Active" },
    { code: "USG-ABD", name: "Ultrasound Abdomen", feeGroup: "Radiology", charge: 1100, status: "Active" },
    { code: "PROC-DRESS", name: "Dressing / Procedure", feeGroup: "Procedure", charge: 350, status: "Active" },
  ],
  op_certificates: [
    { certificateNo: "CERT-2026-00012", certificateDate: day(0), uhid: P[0][0], patientName: P[0][1], certificateType: "Medical Leave Certificate", doctor: "Dr. Ananya Mehta", place: "Chennai", title: "Medical Leave Certificate", content: "Certified that the patient was under treatment for viral fever and is advised rest for 3 days.", remarks: "Fever - 3 days rest advised." },
    { certificateNo: "CERT-2026-00011", certificateDate: day(1), uhid: P[6][0], patientName: P[6][1], certificateType: "Fitness Certificate", doctor: "Dr. S. Krishnan", place: "Chennai", title: "Fitness Certificate", content: "Certified that the patient is medically fit to resume normal activities.", remarks: "Post arrhythmia review." },
    { certificateNo: "CERT-2026-00010", certificateDate: day(2), uhid: P[2][0], patientName: P[2][1], certificateType: "Medical Certificate", doctor: "Dr. Ananya Mehta", place: "Chennai", title: "Medical Certificate", content: "This is to certify that the patient was treated for anaemia.", remarks: "Anaemia - treated as OP." },
    { certificateNo: "CERT-2026-00009", uhid: P[4][0], certificateDate: day(3), patientName: P[4][1], certificateType: "Wound Certificate", doctor: "Dr. R. Nambiar", place: "Chennai", title: "Wound Certificate", content: "A 3 cm laceration over left shin was cleaned and dressed.", remarks: "Wound care advised." },
  ],
  op_referrals: [
    { referralNo: "REF-2026-00008", referralDate: day(1), uhid: P[3][0], patientName: P[3][1], referredHospital: "Chennai Heart Clinic", referredDoctor: "Dr. H. Bala", department: "Cardiology", phone: "9840012001", email: "refer@chc.example", referredBy: "Dr. P. Deshmukh", reason: "Cardiac evaluation needed before dialysis access surgery.", conditionAtReferral: "Stable, CKD stage 3 with anaemia.", remarks: "2D echo and cardiology opinion requested." },
    { referralNo: "REF-2026-00007", referralDate: day(2), uhid: P[6][0], patientName: P[6][1], referredHospital: "Neuro Care Centre", referredDoctor: "Dr. N. Iyer", department: "Neurology", phone: "9840012002", email: "care@neurocare.example", referredBy: "Dr. S. Krishnan", reason: "Recurrent giddiness with suspected TIA.", conditionAtReferral: "Hemodynamically stable.", remarks: "Carotid doppler and neuro opinion requested." },
    { referralNo: "REF-2026-00006", referralDate: day(5), uhid: P[7][0], patientName: P[7][1], referredHospital: "Apollo Cancer Centre", referredDoctor: "Dr. S. Ghosh", department: "Oncology", phone: "9840012010", email: "opd@apollocancer.example", referredBy: "Dr. Ananya Mehta", reason: "Suspicious gastric lesion on endoscopy.", conditionAtReferral: "Ambulatory, tolerating oral feeds.", remarks: "Biopsy correlation requested." },
  ],
  op_treatment_schedules: [
    { planNo: "PLAN-2026-00007", uhid: P[4][0], patientName: P[4][1], plan: "Physiotherapy - Low Back", service: "Dressing / Procedure", sessionNo: 1, totalSessions: 6, intervalDays: 3, planStartDate: day(9), actualDate: day(9), durationMins: 30, doctor: "Dr. R. Nambiar", therapist: "Nithya Menon", charges: 350, status: "Executed", remarks: "Ultrasound therapy + core exercises." },
    { planNo: "PLAN-2026-00007", uhid: P[4][0], patientName: P[4][1], plan: "Physiotherapy - Low Back", service: "Dressing / Procedure", sessionNo: 2, totalSessions: 6, intervalDays: 3, planStartDate: day(6), actualDate: day(6), durationMins: 30, doctor: "Dr. R. Nambiar", therapist: "Nithya Menon", charges: 350, status: "Executed", remarks: "Pain reduced by 40%." },
    { planNo: "PLAN-2026-00007", uhid: P[4][0], patientName: P[4][1], plan: "Physiotherapy - Low Back", service: "Dressing / Procedure", sessionNo: 3, totalSessions: 6, intervalDays: 3, planStartDate: day(3), durationMins: 30, doctor: "Dr. R. Nambiar", therapist: "Nithya Menon", charges: 350, status: "Scheduled", remarks: "" },
    { planNo: "PLAN-2026-00007", uhid: P[4][0], patientName: P[4][1], plan: "Physiotherapy - Low Back", service: "Dressing / Procedure", sessionNo: 4, totalSessions: 6, intervalDays: 3, planStartDate: day(0), durationMins: 30, doctor: "Dr. R. Nambiar", therapist: "Nithya Menon", charges: 350, status: "Scheduled", remarks: "" },
    { planNo: "PLAN-2026-00008", uhid: P[0][0], patientName: P[0][1], plan: "Wound Dressing Plan", service: "Dressing / Procedure", sessionNo: 1, totalSessions: 4, intervalDays: 2, planStartDate: day(3), actualDate: day(3), durationMins: 15, doctor: "Dr. A. Fernandes", therapist: "Nithya Menon", charges: 350, status: "Executed", remarks: "Wound healthy, no discharge." },
    { planNo: "PLAN-2026-00008", uhid: P[0][0], patientName: P[0][1], plan: "Wound Dressing Plan", service: "Dressing / Procedure", sessionNo: 2, totalSessions: 4, intervalDays: 2, planStartDate: day(1), durationMins: 15, doctor: "Dr. A. Fernandes", therapist: "Nithya Menon", charges: 350, status: "Scheduled", remarks: "" },
  ],
  op_consultant_doctors: [
    { code: "CONS-101", name: "Dr. Ananya Mehta", description: "General Medicine consultant.", department: "General Medicine", registrationNo: "TN-MED-10234", status: "Active" },
    { code: "CONS-102", name: "Dr. S. Krishnan", description: "Interventional cardiologist.", department: "Cardiology", registrationNo: "TN-MED-20187", status: "Active" },
    { code: "CONS-103", name: "Dr. P. Deshmukh", description: "Nephrology consultant.", department: "Nephrology", registrationNo: "TN-MED-30456", status: "Active" },
    { code: "CONS-104", name: "Dr. R. Nambiar", description: "Orthopedic surgeon.", department: "Orthopedics", registrationNo: "TN-MED-40912", status: "Active" },
    { code: "CONS-105", name: "Dr. A. Fernandes", description: "General surgeon.", department: "General Medicine", registrationNo: "TN-MED-51230", status: "Active" },
    { code: "CONS-106", name: "Dr. Meera Joshi", description: "Consultant pathologist.", department: "Pathology", registrationNo: "TN-MED-60541", status: "Active" },
    { code: "CONS-107", name: "Dr. K. Menon", description: "Maternity and women's health.", department: "General Medicine", registrationNo: "TN-MED-70822", status: "Active" },
  ],
  op_salaried_doctors: [
    { code: "SAL-201", name: "Dr. A. Fernandes", description: "Senior resident surgeon.", department: "General Medicine", designation: "Senior Resident", status: "Active" },
    { code: "SAL-202", name: "Dr. Meera Joshi", description: "Consultant pathologist.", department: "Pathology", designation: "Consultant Pathologist", status: "Active" },
    { code: "SAL-203", name: "Dr. N. Iyer", description: "Duty medical officer.", department: "General Medicine", designation: "Medical Officer", status: "Active" },
    { code: "SAL-204", name: "Dr. Ravi Anand", description: "Radiologist.", department: "Radiology", designation: "Consultant Radiologist", status: "Active" },
  ],
  op_referral_doctors: [
    { code: "REFD-01", name: "Dr. H. Bala", description: "Cardiologist referral.", referralOrg: "Chennai Heart Clinic", commissionPct: 10, status: "Active" },
    { code: "REFD-02", name: "Dr. N. Iyer", description: "Neurologist referral.", referralOrg: "Neuro Care Centre", commissionPct: 8, status: "Active" },
    { code: "REFD-03", name: "Dr. S. Ghosh", description: "Oncology referral.", referralOrg: "Apollo Cancer Centre", commissionPct: 12, status: "Inactive" },
  ],
  op_doctor_cabin_allocations: [
    { code: "CAB-01", name: "Cabin 1 - Dr. Mehta", description: "Morning OP session.", cabin: "OP-101", doctor: "Dr. Ananya Mehta", allocatedFrom: day(30), allocatedTo: day(-30), status: "Active" },
    { code: "CAB-02", name: "Cabin 2 - Dr. Krishnan", description: "Cardiology OP.", cabin: "OP-102", doctor: "Dr. S. Krishnan", allocatedFrom: day(30), allocatedTo: day(-30), status: "Active" },
    { code: "CAB-03", name: "Cabin 3 - Dr. Nambiar", description: "Orthopedic OP.", cabin: "OP-103", doctor: "Dr. R. Nambiar", allocatedFrom: day(15), allocatedTo: day(-15), status: "Active" },
    { code: "CAB-04", name: "Cabin 4 - Dr. Deshmukh", description: "Nephrology OP.", cabin: "OP-104", doctor: "Dr. P. Deshmukh", allocatedFrom: day(15), allocatedTo: day(-15), status: "Active" },
  ],
  op_referral_organizations: [
    { code: "ORG-01", name: "Chennai Heart Clinic", description: "Cardiology referral partner.", contactPerson: "Dr. H. Bala", phone: "9840012001", status: "Active" },
    { code: "ORG-02", name: "Neuro Care Centre", description: "Neurology referral partner.", contactPerson: "Dr. N. Iyer", phone: "9840012002", status: "Active" },
    { code: "ORG-03", name: "LifeLine Diagnostics", description: "External diagnostic lab.", contactPerson: "Ravi Shankar", phone: "9840012003", status: "Active" },
  ],
  op_corporates: [
    { code: "CORP-01", name: "Infotech Solutions Pvt Ltd", description: "Corporate health plan.", contactPerson: "Deepa Rao", discountPct: 15, status: "Active" },
    { code: "CORP-02", name: "Metro Manufacturing", description: "Employee medical plan.", contactPerson: "S. Kulkarni", discountPct: 10, status: "Active" },
    { code: "CORP-03", name: "Greenfield Exports", description: "Executive checkup package.", contactPerson: "M. Nair", discountPct: 20, status: "Inactive" },
  ],
  op_external_organizations: [
    { code: "EXT-ORG-01", name: "City Ambulance Services", description: "Pre-hospital emergency partner.", contactPerson: "Vinod Kumar", phone: "9840013001", status: "Active" },
    { code: "EXT-ORG-02", name: "CareFirst Home Nursing", description: "Home care provider.", contactPerson: "Sudha Menon", phone: "9840013002", status: "Active" },
  ],
  op_external_staff: [
    { code: "EXT-STF-01", name: "Ravi Anand", description: "Contract radiographer.", organization: "LifeLine Diagnostics", designation: "Radiographer", status: "Active" },
    { code: "EXT-STF-02", name: "Nithya Menon", description: "Visiting physiotherapist.", organization: "CareFirst Home Nursing", designation: "Physiotherapist", status: "Active" },
  ],
  op_doctor_degrees: [
    { code: "DEG-MBBS", name: "MBBS", description: "Bachelor of Medicine and Surgery.", specialty: "General Medicine", status: "Active" },
    { code: "DEG-MD", name: "MD - General Medicine", description: "Doctor of Medicine.", specialty: "General Medicine", status: "Active" },
    { code: "DEG-MS", name: "MS - Orthopedics", description: "Master of Surgery.", specialty: "Orthopedics", status: "Active" },
    { code: "DEG-DM", name: "DM - Nephrology", description: "Super-specialty degree.", specialty: "Nephrology", status: "Active" },
    { code: "DEG-DNB", name: "DNB - Cardiology", description: "Diplomate of National Board.", specialty: "Cardiology", status: "Active" },
  ],
  op_privilege_cards: [
    { code: "PRV-001", name: "Rajesh Kumar - Gold", description: "Senior citizen privilege card.", cardNo: "PC-2026-0001", uhid: P[0][0], discountPct: 10, creditLimit: 25000, validTo: day(-365), status: "Active" },
    { code: "PRV-002", name: "Fatima Begum - Silver", description: "Loyalty card.", cardNo: "PC-2026-0002", uhid: P[6][0], discountPct: 5, creditLimit: 10000, validTo: day(-20), status: "Active" },
    { code: "PRV-003", name: "Priya Sharma - Staff", description: "Staff privilege card.", cardNo: "PC-2026-0003", uhid: P[4][0], discountPct: 20, creditLimit: 50000, validTo: day(-90), status: "Inactive" },
  ],
  op_specialties: [
    { code: "SP-GEN", name: "General Medicine", description: "Primary adult medicine.", degree: "MBBS, MD", status: "Active" },
    { code: "SP-CARD", name: "Cardiology", description: "Heart and vascular care.", degree: "MBBS, MD, DM", status: "Active" },
    { code: "SP-NEPH", name: "Nephrology", description: "Kidney care and dialysis.", degree: "MBBS, MD, DM", status: "Active" },
    { code: "SP-ORTH", name: "Orthopedics", description: "Bone and joint care.", degree: "MBBS, MS", status: "Active" },
    { code: "SP-PATH", name: "Pathology", description: "Laboratory medicine.", degree: "MBBS, MD", status: "Active" },
    { code: "SP-RADIO", name: "Radiology", description: "Imaging services.", degree: "MBBS, MD", status: "Active" },
    { code: "SP-PED", name: "Pediatrics", description: "Child health.", degree: "MBBS, MD", status: "Active" },
  ],
  op_complaints: [
    { code: "CMP-FEVER", name: "Fever", description: "Raised body temperature.", specialty: "General Medicine", status: "Active" },
    { code: "CMP-COUGH", name: "Cough", description: "Acute or chronic cough.", specialty: "General Medicine", status: "Active" },
    { code: "CMP-HEADACHE", name: "Headache", description: "Recurrent or acute headache.", specialty: "General Medicine", status: "Active" },
    { code: "CMP-CHESTPAIN", name: "Chest Pain", description: "Chest discomfort or pain.", specialty: "Cardiology", status: "Active" },
    { code: "CMP-ABDPAIN", name: "Abdominal Pain", description: "Pain in the abdomen.", specialty: "General Medicine", status: "Active" },
    { code: "CMP-LOWBACK", name: "Low Back Pain", description: "Lumbosacral pain.", specialty: "Orthopedics", status: "Active" },
    { code: "CMP-EDEMA", name: "Pedal Edema", description: "Swelling of the feet.", specialty: "Nephrology", status: "Active" },
  ],
  op_diagnoses: [
    { code: "DIA-URI", name: "Upper Respiratory Infection", description: "Common cold and pharyngitis.", icdCode: "J06.9", specialty: "General Medicine", status: "Active" },
    { code: "DIA-HTN", name: "Essential Hypertension", description: "Primary high blood pressure.", icdCode: "I10", specialty: "Cardiology", status: "Active" },
    { code: "DIA-T2DM", name: "Type 2 Diabetes Mellitus", description: "Adult onset diabetes.", icdCode: "E11.9", specialty: "General Medicine", status: "Active" },
    { code: "DIA-CKD", name: "Chronic Kidney Disease", description: "Progressive renal impairment.", icdCode: "N18.3", specialty: "Nephrology", status: "Active" },
    { code: "DIA-LBP", name: "Low Back Pain", description: "Mechanical back pain.", icdCode: "M54.5", specialty: "Orthopedics", status: "Active" },
    { code: "DIA-GASTR", name: "Gastritis", description: "Inflammation of stomach lining.", icdCode: "K29.7", specialty: "General Medicine", status: "Active" },
  ],
  op_dental_diagnoses: [
    { code: "DEN-CAR", name: "Dental Caries", description: "Tooth decay.", toothArea: "36", status: "Active" },
    { code: "DEN-PUL", name: "Pulpitis", description: "Inflammation of dental pulp.", toothArea: "24", status: "Active" },
    { code: "DEN-GING", name: "Gingivitis", description: "Gum inflammation.", toothArea: "Full mouth", status: "Active" },
    { code: "DEN-IMP", name: "Impacted Tooth", description: "Third molar impaction.", toothArea: "38", status: "Active" },
  ],
  op_prescription_templates: [
    { code: "RXT-FEVER", name: "Viral Fever", description: "Standard fever prescription.", medicines: "Tab. Paracetamol 650mg - 1 TDS x 3 days\nCap. Vitamin C 500mg - 1 OD x 5 days", status: "Active" },
    { code: "RXT-HTN", name: "Hypertension", description: "BP control prescription.", medicines: "Tab. Telmisartan 40mg - 1 OD\nTab. Metoprolol 25mg - 1 BD", status: "Active" },
    { code: "RXT-DM", name: "Diabetes", description: "Glycaemic control prescription.", medicines: "Tab. Metformin 500mg - 1 BD", status: "Active" },
    { code: "RXT-CKD", name: "Chronic Kidney Disease", description: "Renal support prescription.", medicines: "Tab. Erythropoietin as advised\nTab. Folic acid 5mg - 1 OD", status: "Active" },
    { code: "RXT-LBP", name: "Low Back Pain", description: "Analgesic and muscle relaxant.", medicines: "Tab. Aceclofenac 100mg - 1 BD x 5 days\nCap. Rabeprazole 20mg - 1 AC x 5 days", status: "Active" },
  ],
  op_treatment_plans: [
    { code: "TP-PHY", name: "Physiotherapy - Lumbar", description: "Lumbar spine physiotherapy plan.", service: "Physiotherapy", sessions: 10, status: "Active" },
    { code: "TP-DIAL", name: "Dialysis - 4 Hour", description: "Maintenance hemodialysis plan.", service: "Hemodialysis", sessions: 12, status: "Active" },
    { code: "TP-WOUND", name: "Wound Dressing", description: "Serial wound dressing plan.", service: "Dressing / Procedure", sessions: 7, status: "Active" },
  ],
  op_treatment_plan_definitions: [
    { code: "TPD-PHY-2W", name: "Lumbar Physio 2 Weeks", description: "Physiotherapy twice weekly.", plan: "Physiotherapy - Lumbar", durationDays: 14, status: "Active" },
    { code: "TPD-DIAL-1M", name: "Dialysis 1 Month", description: "Twice weekly dialysis.", plan: "Dialysis - 4 Hour", durationDays: 30, status: "Active" },
    { code: "TPD-WOUND-1W", name: "Wound Care 1 Week", description: "Daily dressing for a week.", plan: "Wound Dressing", durationDays: 7, status: "Active" },
  ],
  op_generic_names: [
    { code: "GEN-PARA", name: "Paracetamol", description: "Analgesic and antipyretic.", status: "Active" },
    { code: "GEN-TELMI", name: "Telmisartan", description: "Antihypertensive (ARB).", status: "Active" },
    { code: "GEN-METFO", name: "Metformin", description: "Antidiabetic biguanide.", status: "Active" },
    { code: "GEN-ACECLO", name: "Aceclofenac", description: "Non-steroidal anti-inflammatory.", status: "Active" },
    { code: "GEN-APIXA", name: "Apixaban", description: "Oral anticoagulant.", status: "Active" },
    { code: "GEN-ONDA", name: "Ondansetron", description: "Antiemetic.", status: "Active" },
    { code: "GEN-AMOXI", name: "Amoxicillin", description: "Broad spectrum antibiotic.", status: "Active" },
  ],
  op_vaccination_plans: [
    { code: "VAC-HEPB", name: "Hepatitis B", description: "Hepatitis B immunisation schedule.", ageGroup: "0-6 months", doses: 3, status: "Active" },
    { code: "VAC-OPV", name: "Oral Polio", description: "Poliomyelitis immunisation.", ageGroup: "0-5 years", doses: 4, status: "Active" },
    { code: "VAC-TT", name: "Tetanus Toxoid", description: "Tetanus prophylaxis.", ageGroup: "Adults", doses: 2, status: "Active" },
    { code: "VAC-INFLU", name: "Influenza", description: "Seasonal influenza vaccine.", ageGroup: "Adults > 60", doses: 1, status: "Active" },
  ],
  op_vaccination_groups: [
    { code: "VG-CHILD", name: "Child Immunisation", description: "Routine childhood vaccines.", vaccines: "Hepatitis B, OPV, DPT, MMR", status: "Active" },
    { code: "VG-ADULT", name: "Adult Vaccination", description: "Adult and travel vaccines.", vaccines: "Tetanus Toxoid, Influenza, Hepatitis B", status: "Active" },
  ],
  op_fee_groups: [
    { code: "FG-CONS", name: "Consultation", description: "OP consultation charges.", status: "Active" },
    { code: "FG-LAB", name: "Laboratory", description: "Lab and pathology charges.", status: "Active" },
    { code: "FG-RAD", name: "Radiology", description: "Imaging charges.", status: "Active" },
    { code: "FG-PROC", name: "Procedure", description: "Minor procedure charges.", status: "Active" },
    { code: "FG-PHAR", name: "Pharmacy", description: "Pharmacy charges.", status: "Active" },
  ],
  op_fee_types: [
    { code: "FT-OPD", name: "OPD Charge", description: "Out patient department charge.", status: "Active" },
    { code: "FT-IPD", name: "IPD Charge", description: "In patient department charge.", status: "Active" },
    { code: "FT-EMRG", name: "Emergency", description: "Emergency service charge.", status: "Active" },
    { code: "FT-REG", name: "Registration", description: "Patient registration fee.", status: "Active" },
  ],
  op_service_categories: [
    { code: "SC-CONS", name: "Consultation", description: "Doctor consultation services.", status: "Active" },
    { code: "SC-DIAG", name: "Diagnostics", description: "Lab and imaging services.", status: "Active" },
    { code: "SC-PROC", name: "Procedure", description: "Minor procedures.", status: "Active" },
    { code: "SC-ROOM", name: "Room Charges", description: "Ward and room charges.", status: "Active" },
  ],
  op_revenue_departments: [
    { code: "RD-CLIN", name: "Clinical Services", description: "OP and IP clinical revenue.", status: "Active" },
    { code: "RD-DIAG", name: "Diagnostic Services", description: "Lab and radiology revenue.", status: "Active" },
    { code: "RD-PHAR", name: "Pharmacy", description: "Pharmacy revenue.", status: "Active" },
    { code: "RD-ADMIN", name: "Administration", description: "Other administrative revenue.", status: "Active" },
  ],
  op_patient_types: [
    { code: "PT-GEN", name: "General", description: "Self paying general patient.", discountPct: 0, status: "Active" },
    { code: "PT-CORP", name: "Corporate", description: "Corporate tie-up patient.", discountPct: 10, status: "Active" },
    { code: "PT-INS", name: "Insurance", description: "Insurance covered patient.", discountPct: 0, status: "Active" },
    { code: "PT-STAFF", name: "Staff", description: "Hospital staff and dependents.", discountPct: 25, status: "Active" },
    { code: "PT-CAMP", name: "Camp", description: "Health camp patient.", discountPct: 15, status: "Active" },
    { code: "PT-VIP", name: "VIP", description: "Privileged patient.", discountPct: 20, status: "Active" },
  ],
  op_revenue_share_services: [
    { code: "RSS-CONS", name: "Consultation Revenue Share", description: "Doctor share on consultation.", service: "Consultation - General Medicine", sharePct: 60, status: "Active" },
    { code: "RSS-LAB", name: "Lab Revenue Share", description: "Share on lab tests.", service: "Complete Blood Count (CBC)", sharePct: 40, status: "Active" },
    { code: "RSS-XRAY", name: "Radiology Revenue Share", description: "Share on imaging.", service: "X-Ray Chest PA", sharePct: 45, status: "Active" },
  ],
  op_rev_dept_service_map: [
    { code: "RDSM-01", name: "Clinical - Consultation", description: "Map consultation to clinical revenue.", revenueDepartment: "Clinical Services", service: "Consultation - General Medicine", status: "Active" },
    { code: "RDSM-02", name: "Diagnostic - CBC", description: "Map CBC to diagnostics.", revenueDepartment: "Diagnostic Services", service: "Complete Blood Count (CBC)", status: "Active" },
    { code: "RDSM-03", name: "Diagnostic - X-Ray", description: "Map X-Ray to diagnostics.", revenueDepartment: "Diagnostic Services", service: "X-Ray Chest PA", status: "Active" },
  ],
  op_night_extra_charges: [
    { code: "NEC-PROC", name: "Night Procedure Charge", description: "Extra charge for night procedures.", service: "Dressing / Procedure", extraPct: 25, status: "Active" },
    { code: "NEC-CONS", name: "Night Consultation Charge", description: "Extra charge for night OP.", service: "Consultation - Specialist", extraPct: 20, status: "Active" },
  ],
  op_fee_head_service_map: [
    { code: "FHSM-01", name: "Consultation - OPD Fee Head", description: "Map consultation to OPD fee head.", feeHead: "OPD Charge", service: "Consultation - General Medicine", status: "Active" },
    { code: "FEEH-02", name: "CBC - Lab Fee Head", description: "Map CBC to laboratory fee head.", feeHead: "Laboratory", service: "Complete Blood Count (CBC)", status: "Active" },
  ],
  op_patient_type_discounts: [
    { code: "PTD-GEN", name: "General - No Discount", description: "No discount for general.", patientType: "General", discountPct: 0, status: "Active" },
    { code: "PTD-CORP", name: "Corporate 10%", description: "Corporate discount.", patientType: "Corporate", discountPct: 10, status: "Active" },
    { code: "PTD-STAFF", name: "Staff 25%", description: "Staff concession.", patientType: "Staff", discountPct: 25, status: "Active" },
  ],
  op_insurance_patient_type_map: [
    { code: "IPT-INS1", name: "Star Health - Insurance", description: "Star Health maps to Insurance.", insuranceProvider: "Star Health", patientType: "Insurance", status: "Active" },
    { code: "IPT-INS2", name: "New India Assurance - Insurance", description: "New India maps to Insurance.", insuranceProvider: "New India Assurance", patientType: "Insurance", status: "Active" },
  ],
  op_assigned_services: [
    { code: "ASG-01", name: "Dr. Mehta - Consultation", description: "Assigned OP services.", assignedTo: "Dr. Ananya Mehta", service: "Consultation - General Medicine", status: "Active" },
    { code: "ASG-02", name: "Dr. Krishnan - ECG", description: "Assigned cardiology services.", assignedTo: "Dr. S. Krishnan", service: "ECG - 12 Lead", status: "Active" },
    { code: "ASG-03", name: "Lab - CBC", description: "Assigned lab services.", assignedTo: "Laboratory", service: "Complete Blood Count (CBC)", status: "Active" },
  ],
  op_fee_by_departments: [
    { code: "FBD-GEN", name: "OP Fee - General Medicine", description: "General medicine OP fee.", department: "General Medicine", amount: 500, status: "Active" },
    { code: "FBD-CARD", name: "OP Fee - Cardiology", description: "Cardiology OP fee.", department: "Cardiology", amount: 800, status: "Active" },
    { code: "FBD-NEPH", name: "OP Fee - Nephrology", description: "Nephrology OP fee.", department: "Nephrology", amount: 700, status: "Active" },
    { code: "FBD-ORTH", name: "OP Fee - Orthopedics", description: "Orthopedics OP fee.", department: "Orthopedics", amount: 700, status: "Active" },
  ],
  op_blood_groups: [
    { code: "BG-AP", name: "A Positive", description: "Blood group A Rh positive.", group: "A+", status: "Active" },
    { code: "BG-AN", name: "A Negative", description: "Blood group A Rh negative.", group: "A-", status: "Active" },
    { code: "BG-BP", name: "B Positive", description: "Blood group B Rh positive.", group: "B+", status: "Active" },
    { code: "BG-BN", name: "B Negative", description: "Blood group B Rh negative.", group: "B-", status: "Active" },
    { code: "BG-ABP", name: "AB Positive", description: "Blood group AB Rh positive.", group: "AB+", status: "Active" },
    { code: "BG-ABN", name: "AB Negative", description: "Blood group AB Rh negative.", group: "AB-", status: "Active" },
    { code: "BG-OP", name: "O Positive", description: "Blood group O Rh positive.", group: "O+", status: "Active" },
    { code: "BG-ON", name: "O Negative", description: "Blood group O Rh negative.", group: "O-", status: "Active" },
  ],
  op_visit_purposes: [
    { code: "VP-CONS", name: "Consultation", description: "New OP consultation.", status: "Active" },
    { code: "VP-REVIEW", name: "Review", description: "Follow-up review visit.", status: "Active" },
    { code: "VP-CHECKUP", name: "Health Checkup", description: "Preventive health checkup.", status: "Active" },
    { code: "VP-EMERG", name: "Emergency", description: "Emergency OP visit.", status: "Active" },
    { code: "VP-VACC", name: "Vaccination", description: "Immunisation visit.", status: "Active" },
    { code: "VP-PROC", name: "Procedure", description: "Minor procedure visit.", status: "Active" },
  ],
  op_police_stations: [
    { code: "PS-ANNA", name: "Anna Nagar Police Station", description: "North Chennai jurisdiction.", district: "Chennai", status: "Active" },
    { code: "PS-TNAGAR", name: "T. Nagar Police Station", description: "Central Chennai jurisdiction.", district: "Chennai", status: "Active" },
    { code: "PS-ADYAR", name: "Adyar Police Station", description: "South Chennai jurisdiction.", district: "Chennai", status: "Active" },
  ],
  op_mlc_types: [
    { code: "MLC-RTA", name: "Road Traffic Accident", description: "RTA medico-legal case.", status: "Active" },
    { code: "MLC-ASSAULT", name: "Assault", description: "Assault related injury.", status: "Active" },
    { code: "MLC-POISON", name: "Poisoning", description: "Poisoning or overdose.", status: "Active" },
    { code: "MLC-BURN", name: "Burns", description: "Thermal or chemical burns.", status: "Active" },
    { code: "MLC-SUICIDE", name: "Attempted Suicide", description: "Self harm attempt.", status: "Active" },
  ],
  op_certificate_types: [
    { code: "CERT-MEDICAL", name: "Medical Certificate", description: "General medical certificate.", status: "Active" },
    { code: "CERT-FITNESS", name: "Fitness Certificate", description: "Fitness to resume duty.", status: "Active" },
    { code: "CERT-LEAVE", name: "Medical Leave Certificate", description: "Rest and leave advice.", status: "Active" },
    { code: "CERT-ATTENDANCE", name: "Attendance Certificate", description: "Proof of OP attendance.", status: "Active" },
    { code: "CERT-ILLNESS", name: "Illness Certificate", description: "Illness and treatment proof.", status: "Active" },
    { code: "CERT-WOUND", name: "Wound Certificate", description: "Injury and wound details.", status: "Active" },
  ],
  op_certificate_templates: [
    { code: "CERTTPL-LEAVE", name: "Medical Leave Template", description: "Template for leave certificates.", body: "This is to certify that {patient} was under my treatment from {from} to {to} and is advised rest for {days} days.", status: "Active" },
    { code: "CERTTPL-FIT", name: "Fitness Template", description: "Template for fitness certificates.", body: "This is to certify that {patient} is medically fit to resume his/her duties.", status: "Active" },
    { code: "CERTTPL-MED", name: "Medical Template", description: "Template for medical certificates.", body: "This is to certify that {patient} attended the OP department on {date} for the treatment of {diagnosis}.", status: "Active" },
  ],
  op_doctor_cabins: [
    { code: "CABIN-101", name: "OP Cabin 101", description: "General medicine OP cabin.", location: "First Floor - Block A", status: "Active" },
    { code: "CABIN-102", name: "OP Cabin 102", description: "Cardiology OP cabin.", location: "First Floor - Block A", status: "Active" },
    { code: "CABIN-103", name: "OP Cabin 103", description: "Orthopedics OP cabin.", location: "First Floor - Block B", status: "Active" },
  ],
  op_revenue_shares: [
    { code: "RSH-CONS", name: "Consultant Revenue Share", description: "Share paid to consultants.", sharePct: 60, status: "Active" },
    { code: "RSH-REFERRAL", name: "Referral Share", description: "Share for referral doctors.", sharePct: 10, status: "Active" },
    { code: "RSH-LAB", name: "Lab Revenue Share", description: "Share on lab revenue.", sharePct: 40, status: "Active" },
  ],
  op_check_list_items: [
    { code: "CLI-HAND", name: "Hand Hygiene", description: "Hand hygiene compliance.", status: "Active" },
    { code: "CLI-IDBAND", name: "Patient ID Band", description: "Identity band verified.", status: "Active" },
    { code: "CLI-ALLERGY", name: "Allergy Verified", description: "Drug allergy verified.", status: "Active" },
    { code: "CLI-CONSENT", name: "Consent Signed", description: "Informed consent signed.", status: "Active" },
  ],
  op_check_list_definitions: [
    { code: "CLD-OP1", name: "OP Pre-Consult Check", description: "Pre-consultation safety checklist.", checklistItem: "Patient ID Band", status: "Active" },
    { code: "CLD-OP2", name: "OP Pre-Consult Check", description: "Pre-consultation safety checklist.", checklistItem: "Allergy Verified", status: "Active" },
    { code: "CLD-PROC", name: "Procedure Safety Check", description: "Pre-procedure safety checklist.", checklistItem: "Consent Signed", status: "Active" },
  ],
  op_project_types: [
    { code: "PJT-CSR", name: "CSR Health Camp", description: "Corporate social responsibility camp.", status: "Active" },
    { code: "PJT-GOVT", name: "Government Scheme", description: "Government funded scheme.", status: "Active" },
    { code: "PJT-INS", name: "Insurance Project", description: "Insurance driven project.", status: "Active" },
  ],

  /* ------------------------------ In Patient -------------------------- */
  admissions: [
    { ipNo: "IP-2026-00232", uhid: P[1][0], patientName: P[1][1], admissionType: "Elective", ward: "General Ward", room: "GW-12", bed: "GW-12-B", doctor: "Dr. S. Krishnan", admissionDate: day(1), dischargeDate: "", status: "Admitted" },
    { ipNo: "IP-2026-00231", uhid: P[3][0], patientName: P[3][1], admissionType: "Emergency", ward: "ICU", room: "ICU-03", bed: "ICU-03-A", doctor: "Dr. P. Deshmukh", admissionDate: day(2), dischargeDate: "", status: "Admitted" },
    { ipNo: "IP-2026-00230", uhid: P[6][0], patientName: P[6][1], admissionType: "Elective", ward: "Private", room: "PR-05", bed: "PR-05-A", doctor: "Dr. S. Krishnan", admissionDate: day(3), dischargeDate: "", status: "Admitted" },
    { ipNo: "IP-2026-00229", uhid: P[4][0], patientName: P[4][1], admissionType: "Day Care", ward: "General Ward", room: "GW-08", bed: "GW-08-A", doctor: "Dr. R. Nambiar", admissionDate: day(5), dischargeDate: day(4), status: "Discharged" },
    { ipNo: "IP-2026-00228", uhid: P[7][0], patientName: P[7][1], admissionType: "Emergency", ward: "HDU", room: "HDU-02", bed: "HDU-02-C", doctor: "Dr. Ananya Mehta", admissionDate: day(6), dischargeDate: day(3), status: "Discharged" },
    { ipNo: "IP-2026-00227", uhid: P[5][0], patientName: P[5][1], admissionType: "Elective", ward: "Maternity", room: "MT-04", bed: "MT-04-A", doctor: "Dr. K. Menon", admissionDate: day(8), dischargeDate: day(5), status: "Discharged" },
  ],

  /* ----------------------------- Laboratory --------------------------- */
  lab_checkins: [
    { checkinNo: "CHK-2026-00671", uhid: P[0][0], patientName: P[0][1], doctor: "Dr. Ananya Mehta", receivedAt: day(0), priority: "Routine", status: "Processing" },
    { checkinNo: "CHK-2026-00670", uhid: P[1][0], patientName: P[1][1], doctor: "Dr. S. Krishnan", receivedAt: day(0), priority: "Urgent", status: "Received" },
    { checkinNo: "CHK-2026-00669", uhid: P[3][0], patientName: P[3][1], doctor: "Dr. P. Deshmukh", receivedAt: day(1), priority: "Routine", status: "Reported" },
    { checkinNo: "CHK-2026-00668", uhid: P[2][0], patientName: P[2][1], doctor: "Dr. Ananya Mehta", receivedAt: day(1), priority: "Routine", status: "Reported" },
    { checkinNo: "CHK-2026-00667", uhid: P[6][0], patientName: P[6][1], doctor: "Dr. S. Krishnan", receivedAt: day(2), priority: "STAT", status: "Reported" },
    { checkinNo: "CHK-2026-00666", uhid: P[7][0], patientName: P[7][1], doctor: "Dr. Ananya Mehta", receivedAt: day(4), priority: "Routine", status: "Reported" },
  ],
  lab_observations: [
    { uhid: P[0][0], patientName: P[0][1], testName: "Haemoglobin", value: "13.4", unit: "g/dL", referenceRange: "12.0 - 16.0", observedBy: "Rohan Iyer", observedAt: day(0), status: "Verified" },
    { uhid: P[1][0], patientName: P[1][1], testName: "Blood Sugar - Fasting", value: "118", unit: "mg/dL", referenceRange: "70 - 100", observedBy: "Rohan Iyer", observedAt: day(0), status: "Pending" },
    { uhid: P[3][0], patientName: P[3][1], testName: "Serum Creatinine", value: "2.1", unit: "mg/dL", referenceRange: "0.6 - 1.3", observedBy: "Rohan Iyer", observedAt: day(1), status: "Released" },
    { uhid: P[2][0], patientName: P[2][1], testName: "Total Leucocyte Count", value: "7200", unit: "/µL", referenceRange: "4000 - 11000", observedBy: "Rohan Iyer", observedAt: day(1), status: "Released" },
    { uhid: P[6][0], patientName: P[6][1], testName: "Troponin I", value: "0.02", unit: "ng/mL", referenceRange: "< 0.04", observedBy: "Rohan Iyer", observedAt: day(2), status: "Released" },
    { uhid: P[7][0], patientName: P[7][1], testName: "HbA1c", value: "7.8", unit: "%", referenceRange: "< 6.5", observedBy: "Rohan Iyer", observedAt: day(4), status: "Released" },
  ],
  lab_external_tests: [
    { requestNo: "EXT-2026-00184", uhid: P[3][0], patientName: P[3][1], testName: "Renal Biopsy Immunofluorescence", externalLab: "Metropolis Diagnostics", sentDate: day(3), expectedDate: day(1), status: "Received" },
    { requestNo: "EXT-2026-00183", uhid: P[6][0], patientName: P[6][1], testName: "24-hour Holter Analysis", externalLab: "Dr Lal PathLabs", sentDate: day(4), expectedDate: day(2), status: "Reported" },
    { requestNo: "EXT-2026-00182", uhid: P[1][0], patientName: P[1][1], testName: "Lipid Profile - Extended", externalLab: "SRL Diagnostics", sentDate: day(5), expectedDate: day(3), status: "Reported" },
    { requestNo: "EXT-2026-00181", uhid: P[7][0], patientName: P[7][1], testName: "Serum Insulin - Fasting", externalLab: "Metropolis Diagnostics", sentDate: day(6), expectedDate: day(4), status: "Reported" },
  ],
  lab_external_amounts: [
    { requestNo: "EXT-2026-00184", uhid: P[3][0], externalLab: "Metropolis Diagnostics", testName: "Renal Biopsy Immunofluorescence", quotedAmount: 4800, approvedAmount: 4600, billedAmount: 0, status: "Pending Approval" },
    { requestNo: "EXT-2026-00183", uhid: P[6][0], externalLab: "Dr Lal PathLabs", testName: "24-hour Holter Analysis", quotedAmount: 3500, approvedAmount: 3500, billedAmount: 3500, status: "Billed" },
    { requestNo: "EXT-2026-00182", uhid: P[1][0], externalLab: "SRL Diagnostics", testName: "Lipid Profile - Extended", quotedAmount: 1600, approvedAmount: 1500, billedAmount: 1500, status: "Billed" },
    { requestNo: "EXT-2026-00181", uhid: P[7][0], externalLab: "Metropolis Diagnostics", testName: "Serum Insulin - Fasting", quotedAmount: 950, approvedAmount: 950, billedAmount: 950, status: "Approved" },
  ],
  lab_results: [
    { resultNo: "RES-2026-00993", uhid: P[0][0], patientName: P[0][1], testName: "Complete Blood Count", result: "Normal", unit: "", normalRange: "Normal", resultDate: day(0), pathologist: "Dr. Meera Joshi", status: "Pending" },
    { resultNo: "RES-2026-00992", uhid: P[1][0], patientName: P[1][1], testName: "Blood Sugar - Fasting", result: "118", unit: "mg/dL", normalRange: "70-100", resultDate: day(0), pathologist: "Dr. Meera Joshi", status: "Final" },
    { resultNo: "RES-2026-00991", uhid: P[3][0], patientName: P[3][1], testName: "Serum Creatinine", result: "2.1", unit: "mg/dL", normalRange: "0.6-1.3", resultDate: day(1), pathologist: "Dr. Meera Joshi", status: "Final" },
    { resultNo: "RES-2026-00990", uhid: P[2][0], patientName: P[2][1], testName: "Total Leucocyte Count", result: "7200", unit: "/µL", normalRange: "4000-11000", resultDate: day(1), pathologist: "Dr. Meera Joshi", status: "Final" },
    { resultNo: "RES-2026-00989", uhid: P[6][0], patientName: P[6][1], testName: "Troponin I", result: "0.02", unit: "ng/mL", normalRange: "<0.04", resultDate: day(2), pathologist: "Dr. Meera Joshi", status: "Amended" },
    { resultNo: "RES-2026-00988", uhid: P[7][0], patientName: P[7][1], testName: "HbA1c", result: "7.8", unit: "%", normalRange: "<6.5", resultDate: day(4), pathologist: "Dr. Meera Joshi", status: "Final" },
  ],

  /* -------------------------------- Scan ------------------------------ */
  scan_templates: [
    { templateCode: "CT-HEAD-01", templateName: "CT Head Plain", modality: "CT", bodyPart: "Brain", sedation: "No", remarks: "Standard 5mm axial sections." },
    { templateCode: "MRI-KNEE-01", templateName: "MRI Knee Right", modality: "MRI", bodyPart: "Knee", sedation: "No", remarks: "Sagittal + coronal PD/T2 sequences." },
    { templateCode: "USG-ABD-01", templateName: "USG Abdomen Complete", modality: "Ultrasound", bodyPart: "Abdomen", sedation: "No", remarks: "Fasting 6 hours preferred." },
    { templateCode: "XRG-CXR-01", templateName: "X-Ray Chest PA View", modality: "X-Ray", bodyPart: "Chest", sedation: "No", remarks: "Standing PA view." },
    { templateCode: "CT-CECT-01", templateName: "CECT Abdomen", modality: "CT", bodyPart: "Abdomen", sedation: "No", remarks: "Contrast as per renal function." },
  ],

  /* ------------------------------ Dialysis ---------------------------- */
  dialysis_sessions: [
    { sessionId: "DIA-2026-00451", uhid: P[3][0], patientName: P[3][1], machineNo: "HD-03", dialyzer: "FX80", startDate: day(0), durationHours: 4, doctor: "Dr. P. Deshmukh", status: "In Progress" },
    { sessionId: "DIA-2026-00450", uhid: P[6][0], patientName: P[6][1], machineNo: "HD-01", dialyzer: "FX60", startDate: day(0), durationHours: 4, doctor: "Dr. P. Deshmukh", status: "Planned" },
    { sessionId: "DIA-2026-00449", uhid: P[3][0], patientName: P[3][1], machineNo: "HD-03", dialyzer: "FX80", startDate: day(2), durationHours: 4, doctor: "Dr. P. Deshmukh", status: "Completed" },
    { sessionId: "DIA-2026-00448", uhid: P[6][0], patientName: P[6][1], machineNo: "HD-02", dialyzer: "FX60", startDate: day(4), durationHours: 4, doctor: "Dr. P. Deshmukh", status: "Completed" },
    { sessionId: "DIA-2026-00447", uhid: P[7][0], patientName: P[7][1], machineNo: "HD-01", dialyzer: "FX80", startDate: day(6), durationHours: 3, doctor: "Dr. P. Deshmukh", status: "Cancelled" },
  ],
  dialysis_masters: [
    { code: "DIA-HD-4H", sessionType: "Hemodialysis", durationMins: 240, charge: 2800, sedation: "No", status: "Active" },
    { code: "DIA-HD-3H", sessionType: "Hemodialysis", durationMins: 180, charge: 2200, sedation: "No", status: "Active" },
    { code: "DIA-CVVH-24", sessionType: "CVVH", durationMins: 1440, charge: 9500, sedation: "Yes", status: "Active" },
  ],

  /* -------------------------------- Ward ------------------------------ */
  room_cleanings: [
    { requestNo: "CLN-2026-00312", ward: "General Ward", room: "GW-12", bed: "GW-12-B", requestedBy: "Sister Grace Riley", requestedAt: day(0), assignedTo: "Lakshmi Devi", status: "In Progress" },
    { requestNo: "CLN-2026-00311", ward: "ICU", room: "ICU-03", bed: "ICU-03-A", requestedBy: "Sister Grace Riley", requestedAt: day(0), assignedTo: "Anita Kumari", status: "Pending" },
    { requestNo: "CLN-2026-00310", ward: "Private", room: "PR-05", bed: "PR-05-A", requestedBy: "Sister Grace Riley", requestedAt: day(1), assignedTo: "Lakshmi Devi", status: "Done" },
    { requestNo: "CLN-2026-00309", ward: "General Ward", room: "GW-08", bed: "GW-08-A", requestedBy: "Sister Grace Riley", requestedAt: day(4), assignedTo: "Anita Kumari", status: "Done" },
    { requestNo: "CLN-2026-00308", ward: "HDU", room: "HDU-02", bed: "HDU-02-C", requestedBy: "Sister Grace Riley", requestedAt: day(5), assignedTo: "Lakshmi Devi", status: "Done" },
    { requestNo: "CLN-2026-00307", ward: "Maternity", room: "MT-04", bed: "MT-04-A", requestedBy: "Sister Grace Riley", requestedAt: day(6), assignedTo: "Anita Kumari", status: "Done" },
  ],

  /* -------------------------------- MRD ------------------------------- */
  file_movements: [
    { movementNo: "MOV-2026-00265", uhid: P[1][0], patientName: P[1][1], fileNo: "FILE-1002", fromLocation: "MRD Rack A-12", toLocation: "Ward GW-12", movedBy: "Joseph Thomas", movedAt: day(1), status: "Issued" },
    { movementNo: "MOV-2026-00264", uhid: P[3][0], patientName: P[3][1], fileNo: "FILE-1004", fromLocation: "MRD Rack A-14", toLocation: "ICU Record Desk", movedBy: "Joseph Thomas", movedAt: day(2), status: "Received" },
    { movementNo: "MOV-2026-00263", uhid: P[4][0], patientName: P[4][1], fileNo: "FILE-1005", fromLocation: "Ward GW-08", toLocation: "MRD Rack A-15", movedBy: "Joseph Thomas", movedAt: day(4), status: "Received" },
    { movementNo: "MOV-2026-00262", uhid: P[6][0], patientName: P[6][1], fileNo: "FILE-1007", fromLocation: "MRD Rack B-03", toLocation: "OT Record Desk", movedBy: "Joseph Thomas", movedAt: day(5), status: "Overdue" },
    { movementNo: "MOV-2026-00261", uhid: P[7][0], patientName: P[7][1], fileNo: "FILE-1008", fromLocation: "Ward HDU-02", toLocation: "MRD Rack B-04", movedBy: "Joseph Thomas", movedAt: day(7), status: "Received" },
    { movementNo: "MOV-2026-00260", uhid: P[5][0], patientName: P[5][1], fileNo: "FILE-1006", fromLocation: "MRD Rack B-02", toLocation: "Maternity Record Desk", movedBy: "Joseph Thomas", movedAt: day(8), status: "Received" },
  ],
  case_sheets: [
    { caseSheetNo: "CS-2026-00118", uhid: P[1][0], patientName: P[1][1], department: "Cardiology", doctor: "Dr. S. Krishnan", date: day(1), diagnosis: "Essential hypertension", notes: "Advised ECG, 2D echo. Continue Telmisartan 40mg." },
    { caseSheetNo: "CS-2026-00117", uhid: P[3][0], patientName: P[3][1], department: "Nephrology", doctor: "Dr. P. Deshmukh", date: day(2), diagnosis: "CKD stage 3A with renal anaemia", notes: "Dialysis access planning. Hb target 10-11." },
    { caseSheetNo: "CS-2026-00116", uhid: P[4][0], patientName: P[4][1], department: "Orthopedics", doctor: "Dr. R. Nambiar", date: day(5), diagnosis: "Post-op lumbar discectomy follow-up", notes: "Wound healed. Mobilisation with support." },
    { caseSheetNo: "CS-2026-00115", uhid: P[6][0], patientName: P[6][1], department: "Cardiology", doctor: "Dr. S. Krishnan", date: day(3), diagnosis: "Atrial fibrillation - rate control", notes: "Start Apixaban after bleeding risk review." },
  ],
  patient_records: [
    { uhid: P[1][0], patientName: P[1][1], fileNo: "FILE-1002", recordType: "IP", location: "MRD Rack A-12", archivedAt: day(1), status: "Requested" },
    { uhid: P[3][0], patientName: P[3][1], fileNo: "FILE-1004", recordType: "IP", location: "ICU Record Desk", archivedAt: day(2), status: "Active" },
    { uhid: P[4][0], patientName: P[4][1], fileNo: "FILE-1005", recordType: "OP", location: "MRD Rack A-15", archivedAt: day(4), status: "Active" },
    { uhid: P[6][0], patientName: P[6][1], fileNo: "FILE-1007", recordType: "Lab", location: "OT Record Desk", archivedAt: day(5), status: "Requested" },
    { uhid: P[7][0], patientName: P[7][1], fileNo: "FILE-1008", recordType: "OP", location: "MRD Rack B-04", archivedAt: day(7), status: "Active" },
    { uhid: P[0][0], patientName: P[0][1], fileNo: "FILE-1001", recordType: "Radiology", location: "MRD Archive C-2", archivedAt: day(30), status: "Archived" },
  ],
  mrd_file_masters: [
    { fileNo: "FILE-1001", uhid: P[0][0], patientName: P[0][1], fileType: "OP File", openedDate: day(400), storageLocation: "MRD Rack A-10", status: "Active" },
    { fileNo: "FILE-1002", uhid: P[1][0], patientName: P[1][1], fileType: "IP File", openedDate: day(620), storageLocation: "MRD Rack A-12", status: "Active" },
    { fileNo: "FILE-1003", uhid: P[2][0], patientName: P[2][1], fileType: "OP File", openedDate: day(240), storageLocation: "MRD Rack A-13", status: "Closed" },
    { fileNo: "FILE-1004", uhid: P[3][0], patientName: P[3][1], fileType: "IP File", openedDate: day(890), storageLocation: "MRD Rack A-14", status: "Active" },
    { fileNo: "FILE-1005", uhid: P[4][0], patientName: P[4][1], fileType: "OP File", openedDate: day(180), storageLocation: "MRD Rack A-15", status: "Active" },
    { fileNo: "FILE-1006", uhid: P[5][0], patientName: P[5][1], fileType: "Maternity File", openedDate: day(120), storageLocation: "MRD Rack B-02", status: "Lost" },
  ],
  complaint_types: [
    { code: "CMP-01", complaintType: "Waiting Time", description: "Long OP consultation waiting.", active: "Yes" },
    { code: "CMP-02", complaintType: "Billing Dispute", description: "Disagreement with billed amount.", active: "Yes" },
    { code: "CMP-03", complaintType: "Cleanliness", description: "Ward / room hygiene complaints.", active: "Yes" },
    { code: "CMP-04", complaintType: "Staff Behaviour", description: "Conduct of hospital staff.", active: "No" },
  ],
  patient_complaints: [
    { complaintNo: "PCM-2026-00078", uhid: P[0][0], patientName: P[0][1], complaintType: "Waiting Time", raisedDate: day(1), description: "Waited 90 minutes for OP token 12.", status: "In Review" },
    { complaintNo: "PCM-2026-00077", uhid: P[1][0], patientName: P[1][1], complaintType: "Billing Dispute", raisedDate: day(2), description: "Discount not applied on consultation bill.", status: "Open" },
    { complaintNo: "PCM-2026-00076", uhid: P[4][0], patientName: P[4][1], complaintType: "Cleanliness", raisedDate: day(4), description: "GW-08 washroom not cleaned overnight.", status: "Resolved" },
    { complaintNo: "PCM-2026-00075", uhid: P[6][0], patientName: P[6][1], complaintType: "Waiting Time", raisedDate: day(6), description: "Dialysis slot started 45 minutes late.", status: "Resolved" },
    { complaintNo: "PCM-2026-00074", uhid: P[7][0], patientName: P[7][1], complaintType: "Billing Dispute", raisedDate: day(8), description: "Pharmacy invoice mismatch with printed MRP.", status: "Open" },
  ],
  file_types: [
    { code: "FT-01", typeName: "OP File", retentionYears: 3, department: "Medical Records", active: "Yes" },
    { code: "FT-02", typeName: "IP File", retentionYears: 10, department: "Medical Records", active: "Yes" },
    { code: "FT-03", typeName: "Maternity File", retentionYears: 10, department: "Medical Records", active: "Yes" },
    { code: "FT-04", typeName: "Lab Report File", retentionYears: 5, department: "Pathology", active: "Yes" },
    { code: "FT-05", typeName: "Discharge Summary", retentionYears: 10, department: "Medical Records", active: "No" },
  ],
  icd_codings: [
    { code: "I10", description: "Essential (primary) hypertension", category: "Circulatory system", version: "ICD-10", active: "Yes" },
    { code: "N18.3", description: "Chronic kidney disease, stage 3", category: "Genitourinary system", version: "ICD-10", active: "Yes" },
    { code: "E11.9", description: "Type 2 diabetes mellitus without complications", category: "Endocrine system", version: "ICD-10", active: "Yes" },
    { code: "M54.5", description: "Low back pain", category: "Musculoskeletal system", version: "ICD-10", active: "Yes" },
    { code: "A09", description: "Gastroenteritis and colitis of infectious origin", category: "Digestive system", version: "ICD-10", active: "Yes" },
    { code: "R07.9", description: "Chest pain, unspecified", category: "Symptoms and signs", version: "ICD-10", active: "No" },
  ],
  icpm_codings: [
    { code: "ICPM-01-01", description: "Haemodialysis, single session", category: "Dialysis", version: "ICPM-2018", active: "Yes" },
    { code: "ICPM-05-02", description: "CT scan of head with contrast", category: "Imaging", version: "ICPM-2018", active: "Yes" },
    { code: "ICPM-08-01", description: "Closed reduction of fracture", category: "Procedures", version: "ICPM-2018", active: "Yes" },
    { code: "ICPM-12-03", description: "Intravenous infusion, simple", category: "Therapeutic", version: "ICPM-2018", active: "Yes" },
  ],

  /* --------------------------- Operation Theatre ---------------------- */
  ot_cases: [
    { caseNo: "OT-2026-00412", uhid: P[4][0], patientName: P[4][1], procedure: "Lumbar discectomy L4-L5", surgeon: "Dr. R. Nambiar", otNo: "OT-02", scheduledDate: day(0), charge: 68000, status: "In Surgery" },
    { caseNo: "OT-2026-00411", uhid: P[1][0], patientName: P[1][1], procedure: "Coronary angiography", surgeon: "Dr. S. Krishnan", otNo: "OT-01", scheduledDate: day(0), charge: 42000, status: "Scheduled" },
    { caseNo: "OT-2026-00410", uhid: P[5][0], patientName: P[5][1], procedure: "Lower segment caesarean section", surgeon: "Dr. K. Menon", otNo: "OT-03", scheduledDate: day(5), charge: 55000, status: "Completed" },
    { caseNo: "OT-2026-00409", uhid: P[7][0], patientName: P[7][1], procedure: "Laparoscopic cholecystectomy", surgeon: "Dr. A. Fernandes", otNo: "OT-02", scheduledDate: day(7), charge: 72000, status: "Completed" },
    { caseNo: "OT-2026-00408", uhid: P[2][0], patientName: P[2][1], procedure: "Incision and drainage - abscess", surgeon: "Dr. A. Fernandes", otNo: "OT-01", scheduledDate: day(9), charge: 12500, status: "Cancelled" },
  ],

  /* ------------------------------ Pharmacy ---------------------------- */
  pharmacy_sales: [
    { invoiceNo: "PH-2026-004471", uhid: P[0][0], patientName: P[0][1], medicineName: "Paracetamol 650mg", quantity: 15, unitPrice: 4.5, discount: 0, netAmount: 67.5, salesType: "Cash", paymentMode: "UPI", invoiceDate: day(0) },
    { invoiceNo: "PH-2026-004470", uhid: P[1][0], patientName: P[1][1], medicineName: "Telmisartan 40mg", quantity: 30, unitPrice: 12.4, discount: 5, netAmount: 367, salesType: "Cash", paymentMode: "Card", invoiceDate: day(0) },
    { invoiceNo: "PH-2026-004469", uhid: P[3][0], patientName: P[3][1], medicineName: "Erythropoietin Injection", quantity: 4, unitPrice: 680, discount: 0, netAmount: 2720, salesType: "Insurance", paymentMode: "Cash", invoiceDate: day(1) },
    { invoiceNo: "PH-2026-004468", uhid: P[2][0], patientName: P[2][1], medicineName: "Ferrous Ascorbate + Folic Acid", quantity: 20, unitPrice: 8.2, discount: 0, netAmount: 164, salesType: "Cash", paymentMode: "Cash", invoiceDate: day(1) },
    { invoiceNo: "PH-2026-004467", uhid: P[4][0], patientName: P[4][1], medicineName: "Aceclofenac 100mg", quantity: 15, unitPrice: 6.8, discount: 0, netAmount: 102, salesType: "Cash", paymentMode: "UPI", invoiceDate: day(2) },
    { invoiceNo: "PH-2026-004466", uhid: P[6][0], patientName: P[6][1], medicineName: "Apixaban 5mg", quantity: 20, unitPrice: 28.5, discount: 10, netAmount: 513, salesType: "Credit", paymentMode: "Cash", invoiceDate: day(3) },
    { invoiceNo: "PH-2026-004465", uhid: P[7][0], patientName: P[7][1], medicineName: "Metformin 500mg", quantity: 60, unitPrice: 3.2, discount: 0, netAmount: 192, salesType: "Cash", paymentMode: "Cash", invoiceDate: day(5) },
    { invoiceNo: "PH-2026-004464", uhid: P[5][0], patientName: P[5][1], medicineName: "Ondansetron 4mg", quantity: 10, unitPrice: 9.5, discount: 0, netAmount: 95, salesType: "Cash", paymentMode: "UPI", invoiceDate: day(6) },
  ],
  pharmacy_rx_sales: [
    { rxNo: "RX-2026-00452", invoiceNo: "PH-2026-004471", uhid: P[0][0], patientName: P[0][1], doctor: "Dr. Ananya Mehta", medicineName: "Paracetamol 650mg", quantity: 15, dosage: "1 TDS x 3 days", netAmount: 67.5, date: day(0) },
    { rxNo: "RX-2026-00451", invoiceNo: "PH-2026-004470", uhid: P[1][0], patientName: P[1][1], doctor: "Dr. S. Krishnan", medicineName: "Telmisartan 40mg", quantity: 30, dosage: "1 OD", netAmount: 367, date: day(0) },
    { rxNo: "RX-2026-00450", invoiceNo: "PH-2026-004469", uhid: P[3][0], patientName: P[3][1], doctor: "Dr. P. Deshmukh", medicineName: "Erythropoietin Injection", quantity: 4, dosage: "Weekly", netAmount: 2720, date: day(1) },
    { rxNo: "RX-2026-00449", invoiceNo: "PH-2026-004467", uhid: P[4][0], patientName: P[4][1], doctor: "Dr. R. Nambiar", medicineName: "Aceclofenac 100mg", quantity: 15, dosage: "1 BD x 5 days", netAmount: 102, date: day(2) },
    { rxNo: "RX-2026-00448", invoiceNo: "PH-2026-004465", uhid: P[7][0], patientName: P[7][1], doctor: "Dr. Ananya Mehta", medicineName: "Metformin 500mg", quantity: 60, dosage: "1 BD", netAmount: 192, date: day(5) },
  ],
  pharmacy_patient_bills: [
    { billNo: "PB-2026-002241", uhid: P[0][0], patientName: P[0][1], department: "General Medicine", medicineName: "Paracetamol 650mg", quantity: 15, netAmount: 67.5, paymentMode: "UPI", billDate: day(0), status: "Paid" },
    { billNo: "PB-2026-002240", uhid: P[1][0], patientName: P[1][1], department: "Cardiology", medicineName: "Telmisartan 40mg", quantity: 30, netAmount: 367, paymentMode: "Card", billDate: day(0), status: "Paid" },
    { billNo: "PB-2026-002239", uhid: P[3][0], patientName: P[3][1], department: "Nephrology", medicineName: "Erythropoietin Injection", quantity: 4, netAmount: 2720, paymentMode: "Insurance", billDate: day(1), status: "Partially Paid" },
    { billNo: "PB-2026-002238", uhid: P[2][0], patientName: P[2][1], department: "General Medicine", medicineName: "Ferrous Ascorbate + Folic Acid", quantity: 20, netAmount: 164, paymentMode: "Cash", billDate: day(1), status: "Paid" },
    { billNo: "PB-2026-002237", uhid: P[6][0], patientName: P[6][1], department: "Cardiology", medicineName: "Apixaban 5mg", quantity: 20, netAmount: 513, paymentMode: "Credit", billDate: day(3), status: "Unpaid" },
    { billNo: "PB-2026-002236", uhid: P[7][0], patientName: P[7][1], department: "General Medicine", medicineName: "Metformin 500mg", quantity: 60, netAmount: 192, paymentMode: "Cash", billDate: day(5), status: "Paid" },
  ],
  pharmacy_returns: [
    { returnNo: "RET-2026-00061", invoiceNo: "PH-2026-004464", uhid: P[5][0], patientName: P[5][1], medicineName: "Ondansetron 4mg", quantity: 4, refundAmount: 38, reason: "Wrong medicine dispensed.", returnDate: day(5) },
    { returnNo: "RET-2026-00060", invoiceNo: "PH-2026-004467", uhid: P[4][0], patientName: P[4][1], medicineName: "Aceclofenac 100mg", quantity: 5, refundAmount: 34, reason: "Patient developed rash.", returnDate: day(2) },
    { returnNo: "RET-2026-00059", invoiceNo: "PH-2026-004465", uhid: P[7][0], patientName: P[7][1], medicineName: "Metformin 500mg", quantity: 10, refundAmount: 32, reason: "Excess quantity billed.", returnDate: day(4) },
    { returnNo: "RET-2026-00058", invoiceNo: "PH-2026-004466", uhid: P[6][0], patientName: P[6][1], medicineName: "Apixaban 5mg", quantity: 2, refundAmount: 57, reason: "Near expiry batch returned.", returnDate: day(3) },
  ],
  discounts: [
    { code: "DISC-10", discountName: "Senior Citizen 10%", scope: "Patient", percentage: 10, validFrom: day(120), validTo: day(-60), status: "Active" },
    { code: "DISC-05", discountName: "Staff Discount 5%", scope: "Bill", percentage: 5, validFrom: day(365), validTo: day(-100), status: "Active" },
    { code: "DISC-15", discountName: "Festive Offer 15%", scope: "Item", percentage: 15, validFrom: day(30), validTo: day(-3), status: "Inactive" },
    { code: "DISC-20", discountName: "Insurance Copay 20%", scope: "Patient", percentage: 20, validFrom: day(180), validTo: day(-30), status: "Active" },
  ],
  payment_modes: [
    { code: "PM-CASH", modeName: "Cash", accountRef: "CASH-01", active: "Yes" },
    { code: "PM-CARD", modeName: "Card", accountRef: "HDFC-POS-02", active: "Yes" },
    { code: "PM-UPI", modeName: "UPI", accountRef: "UPI-HMS-01", active: "Yes" },
    { code: "PM-WALLET", modeName: "Wallet", accountRef: "WALLET-01", active: "Yes" },
    { code: "PM-INS", modeName: "Insurance", accountRef: "INS-LEDGER", active: "Yes" },
    { code: "PM-CRED", modeName: "Credit", accountRef: "CREDIT-AR", active: "No" },
  ],
  purchase_invoices: [
    { invoiceNo: "PUR-2026-000356", supplier: "Sunrise Pharma Distributors", invoiceDate: day(2), medicineName: "Paracetamol 650mg", quantity: 5000, unitPrice: 2.8, taxAmount: 2520, totalAmount: 16520, dueDate: day(-28), status: "Approved" },
    { invoiceNo: "PUR-2026-000355", supplier: "MediCorp Supplies", invoiceDate: day(4), medicineName: "Telmisartan 40mg", quantity: 3000, unitPrice: 8.6, taxAmount: 4644, totalAmount: 30444, dueDate: day(-26), status: "Paid" },
    { invoiceNo: "PUR-2026-000354", supplier: "Sunrise Pharma Distributors", invoiceDate: day(7), medicineName: "Erythropoietin Injection", quantity: 200, unitPrice: 480, taxAmount: 17280, totalAmount: 113280, dueDate: day(-23), status: "Pending" },
    { invoiceNo: "PUR-2026-000353", supplier: "Nova Surgicals", invoiceDate: day(10), medicineName: "Surgical Suture 3-0", quantity: 800, unitPrice: 22, taxAmount: 3168, totalAmount: 20768, dueDate: day(-20), status: "Approved" },
    { invoiceNo: "PUR-2026-000352", supplier: "MediCorp Supplies", invoiceDate: day(14), medicineName: "Metformin 500mg", quantity: 4000, unitPrice: 1.9, taxAmount: 1368, totalAmount: 8968, dueDate: day(-16), status: "Paid" },
  ],
  purchase_returns: [
    { returnNo: "PRT-2026-00019", invoiceNo: "PUR-2026-000354", supplier: "Sunrise Pharma Distributors", medicineName: "Erythropoietin Injection", quantity: 20, refundAmount: 11328, reason: "Cold chain breach on receipt.", returnDate: day(5) },
    { returnNo: "PRT-2026-00018", invoiceNo: "PUR-2026-000353", supplier: "Nova Surgicals", medicineName: "Surgical Suture 3-0", quantity: 50, refundAmount: 1298, reason: "Damaged packaging.", returnDate: day(8) },
    { returnNo: "PRT-2026-00017", invoiceNo: "PUR-2026-000352", supplier: "MediCorp Supplies", medicineName: "Metformin 500mg", quantity: 200, refundAmount: 448, reason: "Short expiry batch.", returnDate: day(12) },
  ],
  stock: [
    { itemCode: "MED-PCM-650", medicineName: "Paracetamol 650mg", batch: "B2601", store: "Main Store", quantity: 4820, reorderLevel: 1000, unit: "Tablet", lastUpdated: day(0) },
    { itemCode: "MED-TEL-40", medicineName: "Telmisartan 40mg", batch: "B2614", store: "Pharmacy", quantity: 2380, reorderLevel: 800, unit: "Tablet", lastUpdated: day(0) },
    { itemCode: "MED-EPO-10K", medicineName: "Erythropoietin Injection", batch: "B2588", store: "Main Store", quantity: 96, reorderLevel: 50, unit: "Vial", lastUpdated: day(1) },
    { itemCode: "MED-MET-500", medicineName: "Metformin 500mg", batch: "B2607", store: "Pharmacy", quantity: 3640, reorderLevel: 1000, unit: "Tablet", lastUpdated: day(2) },
    { itemCode: "MED-ACE-100", medicineName: "Aceclofenac 100mg", batch: "B2599", store: "Issue Counter", quantity: 740, reorderLevel: 500, unit: "Tablet", lastUpdated: day(3) },
    { itemCode: "MED-API-5", medicineName: "Apixaban 5mg", batch: "B2621", store: "Pharmacy", quantity: 410, reorderLevel: 300, unit: "Tablet", lastUpdated: day(3) },
    { itemCode: "SUR-SUT-30", medicineName: "Surgical Suture 3-0", batch: "B2571", store: "Ward Stock", quantity: 220, reorderLevel: 150, unit: "Piece", lastUpdated: day(6) },
    { itemCode: "MED-OND-4", medicineName: "Ondansetron 4mg", batch: "B2611", store: "Main Store", quantity: 60, reorderLevel: 200, unit: "Tablet", lastUpdated: day(6) },
  ],
  stock_adjustments: [
    { adjustmentNo: "ADJ-2026-00095", itemCode: "MED-OND-4", medicineName: "Ondansetron 4mg", batch: "B2611", adjustType: "Decrease", quantity: 40, reason: "Breakage during handling.", adjustedBy: "Priya Nair", adjustedAt: day(6) },
    { adjustmentNo: "ADJ-2026-00094", itemCode: "MED-PCM-650", medicineName: "Paracetamol 650mg", batch: "B2601", adjustType: "Increase", quantity: 25, reason: "Found in return bin, counted back.", adjustedBy: "Priya Nair", adjustedAt: day(4) },
    { adjustmentNo: "ADJ-2026-00093", itemCode: "SUR-SUT-30", medicineName: "Surgical Suture 3-0", batch: "B2571", adjustType: "Decrease", quantity: 12, reason: "Expired stock written off.", adjustedBy: "Priya Nair", adjustedAt: day(9) },
    { adjustmentNo: "ADJ-2026-00092", itemCode: "MED-EPO-10K", medicineName: "Erythropoietin Injection", batch: "B2588", adjustType: "Decrease", quantity: 4, reason: "Cold chain excursion - discarded.", adjustedBy: "Priya Nair", adjustedAt: day(11) },
  ],
  stock_transfers: [
    { transferNo: "TRF-2026-00134", itemCode: "MED-PCM-650", medicineName: "Paracetamol 650mg", batch: "B2601", quantity: 500, fromStore: "Main Store", toStore: "Pharmacy", requestedBy: "Priya Nair", transferDate: day(0), status: "Received" },
    { transferNo: "TRF-2026-00133", itemCode: "MED-API-5", medicineName: "Apixaban 5mg", batch: "B2621", quantity: 100, fromStore: "Pharmacy", toStore: "Ward Stock", requestedBy: "Priya Nair", transferDate: day(1), status: "In Transit" },
    { transferNo: "TRF-2026-00132", itemCode: "SUR-SUT-30", medicineName: "Surgical Suture 3-0", batch: "B2571", quantity: 60, fromStore: "Main Store", toStore: "Ward Stock", requestedBy: "Priya Nair", transferDate: day(3), status: "Received" },
    { transferNo: "TRF-2026-00131", itemCode: "MED-MET-500", medicineName: "Metformin 500mg", batch: "B2607", quantity: 800, fromStore: "Main Store", toStore: "Issue Counter", requestedBy: "Priya Nair", transferDate: day(5), status: "Requested" },
  ],
  item_balances: [
    { itemCode: "MED-PCM-650", medicineName: "Paracetamol 650mg", batch: "B2601", openingQty: 5000, receivedQty: 5000, issuedQty: 5180, closingQty: 4820, balanceDate: day(0) },
    { itemCode: "MED-TEL-40", medicineName: "Telmisartan 40mg", batch: "B2614", openingQty: 3000, receivedQty: 3000, issuedQty: 3620, closingQty: 2380, balanceDate: day(0) },
    { itemCode: "MED-EPO-10K", medicineName: "Erythropoietin Injection", batch: "B2588", openingQty: 200, receivedQty: 200, issuedQty: 104, closingQty: 96, balanceDate: day(1) },
    { itemCode: "MED-MET-500", medicineName: "Metformin 500mg", batch: "B2607", openingQty: 4000, receivedQty: 4000, issuedQty: 4360, closingQty: 3640, balanceDate: day(2) },
    { itemCode: "MED-ACE-100", medicineName: "Aceclofenac 100mg", batch: "B2599", openingQty: 1000, receivedQty: 0, issuedQty: 260, closingQty: 740, balanceDate: day(3) },
    { itemCode: "MED-API-5", medicineName: "Apixaban 5mg", batch: "B2621", openingQty: 500, receivedQty: 0, issuedQty: 90, closingQty: 410, balanceDate: day(3) },
  ],
  batches: [
    { batchNo: "B2601", medicineName: "Paracetamol 650mg", manufacturer: "Cipla Ltd", expiryDate: day(-420), quantity: 4820, purchasePrice: 2.8, mrp: 4.5, store: "Main Store" },
    { batchNo: "B2614", medicineName: "Telmisartan 40mg", manufacturer: "Sun Pharma", expiryDate: day(-540), quantity: 2380, purchasePrice: 8.6, mrp: 12.4, store: "Pharmacy" },
    { batchNo: "B2588", medicineName: "Erythropoietin Injection", manufacturer: "Biocon", expiryDate: day(-120), quantity: 96, purchasePrice: 480, mrp: 680, store: "Main Store" },
    { batchNo: "B2607", medicineName: "Metformin 500mg", manufacturer: "USV Ltd", expiryDate: day(-700), quantity: 3640, purchasePrice: 1.9, mrp: 3.2, store: "Pharmacy" },
    { batchNo: "B2599", medicineName: "Aceclofenac 100mg", manufacturer: "Zydus Cadila", expiryDate: day(-60), quantity: 740, purchasePrice: 4.4, mrp: 6.8, store: "Issue Counter" },
    { batchNo: "B2621", medicineName: "Apixaban 5mg", manufacturer: "AstraZeneca", expiryDate: day(-360), quantity: 410, purchasePrice: 21, mrp: 28.5, store: "Pharmacy" },
    { batchNo: "B2571", medicineName: "Surgical Suture 3-0", manufacturer: "Nova Surgicals", expiryDate: day(-25), quantity: 220, purchasePrice: 16, mrp: 24, store: "Ward Stock" },
  ],
  pharmacy_payments: [
    { paymentNo: "PAY-2026-000741", invoiceNo: "PUR-2026-000355", payerName: "MediCorp Supplies", mode: "Card", amount: 30444, paidAt: day(4), status: "Received" },
    { paymentNo: "PAY-2026-000740", invoiceNo: "PUR-2026-000352", payerName: "MediCorp Supplies", mode: "UPI", amount: 8968, paidAt: day(13), status: "Received" },
    { paymentNo: "PAY-2026-000739", invoiceNo: "PUR-2026-000356", payerName: "Sunrise Pharma Distributors", mode: "Credit", amount: 16520, paidAt: day(2), status: "Pending" },
    { paymentNo: "PAY-2026-000738", invoiceNo: "PH-2026-004471", payerName: P[0][1], mode: "UPI", amount: 67.5, paidAt: day(0), status: "Received" },
    { paymentNo: "PAY-2026-000737", invoiceNo: "PH-2026-004470", payerName: P[1][1], mode: "Card", amount: 367, paidAt: day(0), status: "Received" },
    { paymentNo: "PAY-2026-000736", invoiceNo: "PH-2026-004466", payerName: P[6][1], mode: "Credit", amount: 513, paidAt: day(3), status: "Pending" },
  ],
  pharmacy_collections: [
    { collectionNo: "COL-2026-000519", uhid: P[0][0], patientName: P[0][1], invoiceNo: "PH-2026-004471", amount: 67.5, mode: "UPI", collectedBy: "Priya Nair", collectedAt: day(0) },
    { collectionNo: "COL-2026-000518", uhid: P[1][0], patientName: P[1][1], invoiceNo: "PH-2026-004470", amount: 367, mode: "Card", collectedBy: "Priya Nair", collectedAt: day(0) },
    { collectionNo: "COL-2026-000517", uhid: P[3][0], patientName: P[3][1], invoiceNo: "PH-2026-004469", amount: 2720, mode: "Insurance", collectedBy: "Priya Nair", collectedAt: day(1) },
    { collectionNo: "COL-2026-000516", uhid: P[4][0], patientName: P[4][1], invoiceNo: "PH-2026-004467", amount: 102, mode: "UPI", collectedBy: "Priya Nair", collectedAt: day(2) },
    { collectionNo: "COL-2026-000515", uhid: P[7][0], patientName: P[7][1], invoiceNo: "PH-2026-004465", amount: 192, mode: "Cash", collectedBy: "Priya Nair", collectedAt: day(5) },
  ],
  pharmacy_outstanding: [
    { refNo: "OUT-2026-000207", uhid: P[3][0], patientName: P[3][1], invoiceNo: "PB-2026-002239", outstandingAmount: 1360, dueDate: day(-1), ageDays: 1, bucket: "0-30" },
    { refNo: "OUT-2026-000206", uhid: P[6][0], patientName: P[6][1], invoiceNo: "PB-2026-002237", outstandingAmount: 513, dueDate: day(-3), ageDays: 3, bucket: "0-30" },
    { refNo: "OUT-2026-000205", uhid: P[1][0], patientName: P[1][1], invoiceNo: "BILL-2026-019283", outstandingAmount: 2189.5, dueDate: day(-10), ageDays: 10, bucket: "0-30" },
    { refNo: "OUT-2026-000204", uhid: P[3][0], patientName: P[3][1], invoiceNo: "BILL-2026-019281", outstandingAmount: 2593.5, dueDate: day(-45), ageDays: 45, bucket: "31-60" },
    { refNo: "OUT-2026-000203", uhid: P[6][0], patientName: P[6][1], invoiceNo: "BILL-2026-019278", outstandingAmount: 1250, dueDate: day(-75), ageDays: 75, bucket: "60+" },
  ],
  medicines: [
    { code: "MED-PCM-650", medicineName: "Paracetamol 650mg", generic: "Paracetamol", manufacturer: "Cipla Ltd", category: "Tablet", unit: "Tablet", mrp: 4.5, status: "Active" },
    { code: "MED-TEL-40", medicineName: "Telmisartan 40mg", generic: "Telmisartan", manufacturer: "Sun Pharma", category: "Tablet", unit: "Tablet", mrp: 12.4, status: "Active" },
    { code: "MED-EPO-10K", medicineName: "Erythropoietin Injection", generic: "Epoetin Alfa", manufacturer: "Biocon", category: "Injection", unit: "Vial", mrp: 680, status: "Active" },
    { code: "MED-MET-500", medicineName: "Metformin 500mg", generic: "Metformin", manufacturer: "USV Ltd", category: "Tablet", unit: "Tablet", mrp: 3.2, status: "Active" },
    { code: "MED-ACE-100", medicineName: "Aceclofenac 100mg", generic: "Aceclofenac", manufacturer: "Zydus Cadila", category: "Tablet", unit: "Tablet", mrp: 6.8, status: "Active" },
    { code: "MED-API-5", medicineName: "Apixaban 5mg", generic: "Apixaban", manufacturer: "AstraZeneca", category: "Tablet", unit: "Tablet", mrp: 28.5, status: "Active" },
    { code: "MED-OND-4", medicineName: "Ondansetron 4mg", generic: "Ondansetron", manufacturer: "Ranbaxy", category: "Tablet", unit: "Tablet", mrp: 9.5, status: "Active" },
    { code: "MED-ORS-21", medicineName: "ORS Sachet 21g", generic: "Oral Rehydration Salts", manufacturer: "FDC Ltd", category: "Drops", unit: "Sachet", mrp: 22, status: "Active" },
    { code: "MED-SYT-100", medicineName: "Syrup Cough 100ml", generic: "Dextromethorphan", manufacturer: "Glenmark", category: "Syrup", unit: "Bottle", mrp: 96, status: "Active" },
    { code: "MED-OBM-30", medicineName: "Ointment Mupirocin 30g", generic: "Mupirocin", manufacturer: "GlaxoSmithKline", category: "Ointment", unit: "Tube", mrp: 78, status: "Inactive" },
  ],
  manufacturers: [
    { code: "MFR-CIPLA", manufacturerName: "Cipla Ltd", contactPerson: "Rahul Verma", phone: "9820011223", email: "orders@cipla.example", city: "Mumbai", status: "Active" },
    { code: "MFR-SUN", manufacturerName: "Sun Pharma", contactPerson: "Neha Joshi", phone: "9820022334", email: "sales@sunpharma.example", city: "Ahmedabad", status: "Active" },
    { code: "MFR-BIOCON", manufacturerName: "Biocon", contactPerson: "Arjun Rao", phone: "9820033445", email: "bio@biocon.example", city: "Bengaluru", status: "Active" },
    { code: "MFR-USV", manufacturerName: "USV Ltd", contactPerson: "Kavita Shinde", phone: "9820044556", email: "orders@usv.example", city: "Mumbai", status: "Active" },
    { code: "MFR-ZYDUS", manufacturerName: "Zydus Cadila", contactPerson: "Pankaj Shah", phone: "9820055667", email: "sales@zydus.example", city: "Ahmedabad", status: "Inactive" },
  ],
  suppliers: [
    { code: "SUP-SUNRISE", supplierName: "Sunrise Pharma Distributors", contactPerson: "Manish Gupta", phone: "9845011223", email: "contact@sunrisepharma.example", city: "Chennai", gstNo: "33AABCS1234F1Z5", status: "Active" },
    { code: "SUP-MEDICORP", supplierName: "MediCorp Supplies", contactPerson: "Divya Menon", phone: "9845022334", email: "orders@medicorp.example", city: "Kochi", gstNo: "32AABCM5678G1Z3", status: "Active" },
    { code: "SUP-NOVA", supplierName: "Nova Surgicals", contactPerson: "Suresh Pillai", phone: "9845033445", email: "sales@novasurgical.example", city: "Bengaluru", gstNo: "29AABCN9012H1Z7", status: "Active" },
    { code: "SUP-HEALTHLINE", supplierName: "Healthline Traders", contactPerson: "Anil Kumar", phone: "9845044556", email: "info@healthline.example", city: "Hyderabad", gstNo: "36AABCH3456J1Z1", status: "Active" },
    { code: "SUP-CAREMED", supplierName: "CareMed Instruments", contactPerson: "Ritu Jain", phone: "9845055667", email: "orders@caremed.example", city: "Delhi", gstNo: "07AABCC7890K1Z9", status: "Inactive" },
  ],
  generics: [
    { code: "GEN-PCM", genericName: "Paracetamol", therapeuticClass: "Analgesic / Antipyretic", status: "Active" },
    { code: "GEN-TEL", genericName: "Telmisartan", therapeuticClass: "Antihypertensive - ARB", status: "Active" },
    { code: "GEN-MET", genericName: "Metformin", therapeuticClass: "Antidiabetic - Biguanide", status: "Active" },
    { code: "GEN-ACE", genericName: "Aceclofenac", therapeuticClass: "NSAID", status: "Active" },
    { code: "GEN-API", genericName: "Apixaban", therapeuticClass: "Anticoagulant", status: "Active" },
    { code: "GEN-OND", genericName: "Ondansetron", therapeuticClass: "Antiemetic", status: "Active" },
  ],
  item_categories: [
    { code: "CAT-TAB", categoryName: "Tablets", description: "Solid oral dosage forms.", status: "Active" },
    { code: "CAT-CAP", categoryName: "Capsules", description: "Hard and soft gelatin capsules.", status: "Active" },
    { code: "CAT-SYP", categoryName: "Syrups", description: "Liquid orals and suspensions.", status: "Active" },
    { code: "CAT-INJ", categoryName: "Injections", description: "Sterile parenteral products.", status: "Active" },
    { code: "CAT-OTC", categoryName: "OTC", description: "Over the counter products.", status: "Active" },
    { code: "CAT-SUR", categoryName: "Surgical", description: "Sutures, dressings and disposables.", status: "Inactive" },
  ],
  units: [
    { code: "U-TAB", unitName: "Tablet", description: "Solid unit dose." },
    { code: "U-CAP", unitName: "Capsule", description: "Capsule unit dose." },
    { code: "U-ML", unitName: "ml", description: "Millilitre liquid measure." },
    { code: "U-VIAL", unitName: "Vial", description: "Parenteral vial." },
    { code: "U-PIECE", unitName: "Piece", description: "Discrete piece count." },
  ],
  taxes: [
    { code: "GST-12", taxName: "GST 12%", rate: 12, status: "Active" },
    { code: "GST-18", taxName: "GST 18%", rate: 18, status: "Active" },
    { code: "GST-5", taxName: "GST 5%", rate: 5, status: "Active" },
    { code: "GST-0", taxName: "Nil rated", rate: 0, status: "Active" },
  ],

  /* ------------------------------- Optical ---------------------------- */
  optical_sales: [
    { invoiceNo: "OPT-2026-000376", customerName: "Rajesh Kumar", phone: "9845010001", itemDescription: "Frame + Single Vision Lenses", lensType: "Single Vision", quantity: 1, netAmount: 4200, paymentMode: "UPI", invoiceDate: day(1) },
    { invoiceNo: "OPT-2026-000375", customerName: "Lakshmi Narayanan", phone: "9845010002", itemDescription: "Frame only - Progressive", lensType: "Progressive", quantity: 1, netAmount: 5600, paymentMode: "Card", invoiceDate: day(2) },
    { invoiceNo: "OPT-2026-000374", customerName: "Aisha Khan", phone: "9845010003", itemDescription: "Contact Lens - Monthly", lensType: "Single Vision", quantity: 2, netAmount: 2400, paymentMode: "Cash", invoiceDate: day(3) },
    { invoiceNo: "OPT-2026-000373", customerName: "Suresh Babu", phone: "9845010004", itemDescription: "Zero Power Blue Cut", lensType: "Zero Power", quantity: 1, netAmount: 1800, paymentMode: "UPI", invoiceDate: day(5) },
    { invoiceNo: "OPT-2026-000372", customerName: "Priya Sharma", phone: "9845010005", itemDescription: "Frame + Bifocal Lenses", lensType: "Bifocal", quantity: 1, netAmount: 3100, paymentMode: "Cash", invoiceDate: day(7) },
  ],
  optical_customers: [
    { customerCode: "OC-0001", customerName: "Rajesh Kumar", phone: "9845010001", email: "rajesh.k@example.com", prescriptionNo: "RXOP-0044", lastVisit: day(1), status: "Active" },
    { customerCode: "OC-0002", customerName: "Lakshmi Narayanan", phone: "9845010002", email: "lakshmi.n@example.com", prescriptionNo: "RXOP-0043", lastVisit: day(2), status: "Active" },
    { customerCode: "OC-0003", customerName: "Aisha Khan", phone: "9845010003", email: "aisha.k@example.com", prescriptionNo: "RXOP-0042", lastVisit: day(3), status: "Active" },
    { customerCode: "OC-0004", customerName: "Suresh Babu", phone: "9845010004", email: "", prescriptionNo: "RXOP-0041", lastVisit: day(5), status: "Active" },
    { customerCode: "OC-0005", customerName: "Priya Sharma", phone: "9845010005", email: "priya.s@example.com", prescriptionNo: "RXOP-0040", lastVisit: day(7), status: "Inactive" },
  ],
  optical_manufacturers: [
    { code: "OM-ESSILOR", manufacturerName: "Essilor India", brand: "Essilor", country: "India", status: "Active" },
    { code: "OM-HOYA", manufacturerName: "Hoya Lens India", brand: "Hoya", country: "Japan", status: "Active" },
    { code: "OM-FARESIN", manufacturerName: "Faresin Frames", brand: "Faresin", country: "Italy", status: "Active" },
    { code: "OM-RAINBOW", manufacturerName: "Rainbow Optics", brand: "Rainbow", country: "India", status: "Inactive" },
  ],

  /* -------------------------------- HRM ------------------------------- */
  employee_transactions: [
    { entryNo: "HR-TRX-000901", employeeId: "EMP-0042", employeeName: "Sister Grace Riley", transactionType: "Increment", effectiveDate: day(15), department: "Nursing", remarks: "Annual increment - 8%." },
    { entryNo: "HR-TRX-000900", employeeId: "EMP-0117", employeeName: "Rohan Iyer", transactionType: "Transfer", effectiveDate: day(10), department: "Pathology", remarks: "Transferred from Radiology to Pathology." },
    { entryNo: "HR-TRX-000899", employeeId: "EMP-0203", employeeName: "Meera Khan", transactionType: "Leave", effectiveDate: day(4), department: "Reception", remarks: "Casual leave - 3 days." },
    { entryNo: "HR-TRX-000898", employeeId: "EMP-0310", employeeName: "Joseph Thomas", transactionType: "Joining", effectiveDate: day(60), department: "Medical Records", remarks: "Joined as MRD Officer." },
    { entryNo: "HR-TRX-000897", employeeId: "EMP-0088", employeeName: "Ajay Prakash", transactionType: "Exit", effectiveDate: day(20), department: "Pharmacy", remarks: "Resigned - relieved after notice period." },
  ],
  employees: [
    { employeeCode: "EMP-0042", employeeName: "Sister Grace Riley", department: "Nursing", designation: "Senior Staff Nurse", joiningDate: day(1500), phone: "9845020001", status: "Active" },
    { employeeCode: "EMP-0117", employeeName: "Rohan Iyer", department: "Pathology", designation: "Laboratory Technician", joiningDate: day(900), phone: "9845020002", status: "Active" },
    { employeeCode: "EMP-0203", employeeName: "Meera Khan", department: "Reception", designation: "Front Desk Executive", joiningDate: day(700), phone: "9845020003", status: "Active" },
    { employeeCode: "EMP-0310", employeeName: "Joseph Thomas", department: "Medical Records", designation: "MRD Officer", joiningDate: day(60), phone: "9845020004", status: "Active" },
    { employeeCode: "EMP-0088", employeeName: "Ajay Prakash", department: "Pharmacy", designation: "Pharmacy Assistant", joiningDate: day(1100), phone: "9845020005", status: "Resigned" },
    { employeeCode: "EMP-0155", employeeName: "Kavita Desai", department: "Nursing", designation: "Staff Nurse", joiningDate: day(420), phone: "9845020006", status: "On Leave" },
    { employeeCode: "EMP-0190", employeeName: "Sunil Kadam", department: "Administration", designation: "Office Assistant", joiningDate: day(300), phone: "9845020007", status: "Active" },
    { employeeCode: "EMP-0221", employeeName: "Farhan Qureshi", department: "Finance", designation: "Accounts Executive", joiningDate: day(150), phone: "9845020008", status: "Active" },
  ],
  enterprises: [
    { code: "ENT-001", enterpriseName: "Star Logistics Pvt Ltd", industry: "Logistics", city: "Chennai", phone: "044-45001001", status: "Active" },
    { code: "ENT-002", enterpriseName: "TechNova Systems", industry: "Information Technology", city: "Bengaluru", phone: "080-45001002", status: "Active" },
    { code: "ENT-003", enterpriseName: "Green Fields Agro", industry: "Agriculture", city: "Coimbatore", phone: "0422-45001003", status: "Active" },
    { code: "ENT-004", enterpriseName: "Metro Retail Chain", industry: "Retail", city: "Hyderabad", phone: "040-45001004", status: "Inactive" },
  ],
  holiday_types: [
    { code: "HT-NAT", holidayName: "National Holiday", paid: "Yes", description: "Gazetted national holidays.", status: "Active" },
    { code: "HT-REL", holidayName: "Religious Holiday", paid: "Yes", description: "Festival holidays.", status: "Active" },
    { code: "HT-LOC", holidayName: "Local Holiday", paid: "No", description: "Regional observances.", status: "Active" },
    { code: "HT-ORG", holidayName: "Organisational Holiday", paid: "Yes", description: "Hospital foundation day etc.", status: "Active" },
  ],
  holidays: [
    { title: "Hospital Foundation Day", holidayType: "Organisational Holiday", fromDate: day(-30), toDate: day(-30), description: "Annual foundation day - OP closed, emergency open." },
    { title: "Diwali", holidayType: "Religious Holiday", fromDate: day(-10), toDate: day(-9), description: "Diwali break - skeleton OP staff." },
    { title: "Christmas", holidayType: "National Holiday", fromDate: day(78), toDate: day(78), description: "Christmas day." },
    { title: "Republic Day", holidayType: "National Holiday", fromDate: day(105), toDate: day(105), description: "Republic Day." },
  ],

  /* ------------------------------ Purchase ---------------------------- */
  purchase_transactions: [
    { poNo: "PO-2026-000482", supplier: "Sunrise Pharma Distributors", itemName: "Paracetamol 650mg", quantity: 5000, unitPrice: 2.8, totalAmount: 14000, poDate: day(4), status: "Received" },
    { poNo: "PO-2026-000481", supplier: "MediCorp Supplies", itemName: "Telmisartan 40mg", quantity: 3000, unitPrice: 8.6, totalAmount: 25800, poDate: day(6), status: "Received" },
    { poNo: "PO-2026-000480", supplier: "Sunrise Pharma Distributors", itemName: "Erythropoietin Injection", quantity: 200, unitPrice: 480, totalAmount: 96000, poDate: day(9), status: "Issued" },
    { poNo: "PO-2026-000479", supplier: "Nova Surgicals", itemName: "Surgical Suture 3-0", quantity: 800, unitPrice: 22, totalAmount: 17600, poDate: day(12), status: "Issued" },
    { poNo: "PO-2026-000478", supplier: "Healthline Traders", itemName: "ORS Sachet 21g", quantity: 1500, unitPrice: 14, totalAmount: 21000, poDate: day(15), status: "Draft" },
  ],
  item_balance_updates: [
    { itemCode: "MED-PCM-650", medicineName: "Paracetamol 650mg", batch: "B2601", currentBalance: 4795, updatedBalance: 4820, reason: "Physical stock count correction.", updatedBy: "Priya Nair", updatedAt: day(0) },
    { itemCode: "MED-EPO-10K", medicineName: "Erythropoietin Injection", batch: "B2588", currentBalance: 100, updatedBalance: 96, reason: "Vials broken in transit within store.", updatedBy: "Priya Nair", updatedAt: day(1) },
    { itemCode: "MED-OND-4", medicineName: "Ondansetron 4mg", batch: "B2611", currentBalance: 100, updatedBalance: 60, reason: "Expiry write-off.", updatedBy: "Priya Nair", updatedAt: day(6) },
    { itemCode: "SUR-SUT-30", medicineName: "Surgical Suture 3-0", batch: "B2571", currentBalance: 232, updatedBalance: 220, reason: "Damage write-off.", updatedBy: "Priya Nair", updatedAt: day(9) },
  ],

  /* -------------------------------- Admin ----------------------------- */
  roles: Object.entries(ROLE_LABELS).map(([key, label]) => ({
    roleName: label,
    roleKey: key,
    description:
      key === "SUPER_ADMIN"
        ? "Unrestricted access to every module, screen and tool."
        : `Standard access profile for ${label.toLowerCase()} users.`,
    status: "Active",
  })),
  audit_logs: [
    { at: day(0), user: "admin", action: "login", module: "-", screen: "Login", record: "admin", summary: "Successful sign-in", ip: "127.0.0.1" },
    { at: day(0), user: "reception", action: "create", module: "opd", screen: "Registration", record: "OP-2026-008922", summary: "Created OP registration for Rajesh Kumar", ip: "127.0.0.1" },
    { at: day(0), user: "reception", action: "create", module: "opd", screen: "OP Billing", record: "BILL-2026-019284", summary: "Created bill of net amount 1522.5", ip: "127.0.0.1" },
    { at: day(0), user: "labtech", action: "update", module: "laboratory", screen: "Observation", record: "UH-2026-1001", summary: "Released Haemoglobin observation", ip: "127.0.0.1" },
    { at: day(0), user: "pharmacist", action: "create", module: "pharmacy", screen: "Sales Invoice", record: "PH-2026-004471", summary: "Created invoice of net amount 67.5", ip: "127.0.0.1" },
    { at: day(1), user: "doctor", action: "create", module: "opd", screen: "Prescription", record: "RX-2026-00452", summary: "Issued prescription for UH-2026-1001", ip: "127.0.0.1" },
    { at: day(1), user: "mrd", action: "create", module: "mrd", screen: "File Movement", record: "MOV-2026-00265", summary: "Issued FILE-1002 to Ward GW-12", ip: "127.0.0.1" },
    { at: day(1), user: "admin", action: "update", module: "admin", screen: "Users", record: "labtech", summary: "Updated role of user labtech", ip: "127.0.0.1" },
    { at: day(2), user: "billing", action: "update", module: "opd", screen: "OP Billing", record: "BILL-2026-019283", summary: "Recorded partial payment 2000", ip: "127.0.0.1" },
    { at: day(2), user: "insurance", action: "export", module: "insurance", screen: "Claims Report", record: "RPT-CLM-01", summary: "Exported claims report to Excel", ip: "127.0.0.1" },
    { at: day(3), user: "purchase", action: "create", module: "purchase", screen: "Purchase Transaction", record: "PO-2026-000480", summary: "Raised PO for Erythropoietin Injection", ip: "127.0.0.1" },
    { at: day(3), user: "admin", action: "delete", module: "admin", screen: "System Configuration", record: "CFG-OLD-01", summary: "Removed obsolete configuration key", ip: "127.0.0.1" },
    { at: day(4), user: "pharmacist", action: "delete", module: "pharmacy", screen: "Returns", record: "RET-2026-00060", summary: "Reversed erroneous return entry", ip: "127.0.0.1" },
    { at: day(5), user: "hr", action: "create", module: "hrm", screen: "Add HolidayType", record: "Diwali", summary: "Created holiday 10-11 Oct", ip: "127.0.0.1" },
    { at: day(6), user: "admin", action: "logout", module: "-", screen: "Header", record: "admin", summary: "Signed out", ip: "127.0.0.1" },
  ],
  system_configs: [
    { configKey: "hospital.name", configValue: "Zhanx Hospital", description: "Display name on invoices and reports.", updatedBy: "admin", updatedAt: day(30) },
    { configKey: "op.prefix", configValue: "OP-2026-", description: "OP number prefix.", updatedBy: "admin", updatedAt: day(60) },
    { configKey: "ip.prefix", configValue: "IP-2026-", description: "IP number prefix.", updatedBy: "admin", updatedAt: day(60) },
    { configKey: "invoice.prefix", configValue: "BILL-2026-", description: "Billing document prefix.", updatedBy: "admin", updatedAt: day(45) },
    { configKey: "session.timeout.minutes", configValue: "720", description: "Idle session timeout in minutes.", updatedBy: "admin", updatedAt: day(90) },
    { configKey: "pharmacy.stock.reorder.alert", configValue: "true", description: "Enable reorder level alerts.", updatedBy: "admin", updatedAt: day(20) },
    { configKey: "mrd.retention.default.years", configValue: "3", description: "Default file retention period.", updatedBy: "admin", updatedAt: day(120) },
    { configKey: "backup.schedule.cron", configValue: "0 2 * * *", description: "Nightly backup schedule.", updatedBy: "admin", updatedAt: day(15) },
  ],
  backups: [
    { backupNo: "BKP-2026-00045", takenAt: day(0), type: "Incremental", sizeMB: 128, status: "Completed", initiatedBy: "system" },
    { backupNo: "BKP-2026-00044", takenAt: day(1), type: "Incremental", sizeMB: 121, status: "Completed", initiatedBy: "system" },
    { backupNo: "BKP-2026-00043", takenAt: day(2), type: "Incremental", sizeMB: 119, status: "Failed", initiatedBy: "system" },
    { backupNo: "BKP-2026-00042", takenAt: day(3), type: "Full", sizeMB: 942, status: "Completed", initiatedBy: "admin" },
    { backupNo: "BKP-2026-00041", takenAt: day(4), type: "Incremental", sizeMB: 117, status: "Completed", initiatedBy: "system" },
  ],
};

function buildAccessRows() {
  const permissions = [];
  const moduleAccess = [];
  const menuAccess = [];

  for (const [role, grants] of Object.entries(ROLE_PERMISSIONS)) {
    const isAdminRole = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
    const allowedIds = grants.includes("*")
      ? MENU.map((m) => m.id)
      : grants;

    for (const mod of MENU) {
      const allowed = allowedIds.includes(mod.id);
      const moduleLabel = `${mod.id} ${mod.slug}`;
      const access = allowed ? "Granted" : "Denied";

      moduleAccess.push({ role, module: moduleLabel, access });
      permissions.push({
        role,
        module: moduleLabel,
        view: allowed ? "Yes" : "No",
        create: allowed ? "Yes" : "No",
        edit: allowed ? "Yes" : "No",
        delete: allowed && isAdminRole ? "Yes" : "No",
      });

      for (const category of mod.categories) {
        for (const item of category.items) {
          menuAccess.push({
            role,
            menu: `${mod.slug}/${category.slug}/${item.slug}`,
            access,
          });
        }
      }
    }
  }

  return { permissions, moduleAccess, menuAccess };
}

async function main() {
  const client = new MongoClient(URI, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();
  } catch (error) {
    console.error("Cannot reach MongoDB at " + URI);
    console.error(error.message);
    process.exit(1);
  }

  const db = client.db(DB_NAME);
  await db.dropDatabase();

  const passwordHash = (password) => bcrypt.hashSync(password, 10);

  const users = SEED_USERS.map((user) => ({
    username: user.username,
    name: user.name,
    role: user.role,
    designation: user.designation,
    department: user.department,
    email: user.email,
    passwordHash: passwordHash(user.password),
    status: "Active",
    createdAt: new Date().toISOString(),
  }));

  const { permissions, moduleAccess, menuAccess } = buildAccessRows();

  const seedSets = { ...DATA, users, permissions, module_access: moduleAccess, menu_access: menuAccess };
  if (!seedSets.menu_access.length) delete seedSets.menu_access;

  let total = 0;
  for (const [name, rows] of Object.entries(seedSets)) {
    if (!Array.isArray(rows) || rows.length === 0) {
      console.warn(`  skip  ${name} (no rows)`);
      continue;
    }
    const stamped = rows.map((row) => ({ ...row, createdAt: new Date().toISOString() }));
    await db.collection(name).insertMany(stamped);
    total += stamped.length;
    console.log(`  ok    ${name} (${stamped.length})`);
  }

  await db.collection("users").createIndex({ username: 1 }, { unique: true });
  await db.collection("audit_logs").createIndex({ at: -1, user: 1 });
  await db.collection("patients").createIndex({ uhid: 1 }, { unique: true });
  await db.collection("op_registrations").createIndex({ opNo: 1 }, { unique: true });
  await db.collection("op_registrations").createIndex({ doctor: 1, visitDate: 1, slotStart: 1 });
  await db.collection("op_doctor_schedules").createIndex({ doctor: 1 });
  await db.collection("op_appointment_blocks").createIndex({ doctor: 1, date: 1 });
  await db.collection("op_bills").createIndex({ billNo: 1 }, { unique: true });
  await db.collection("op_treatment_schedules").createIndex({ planNo: 1, sessionNo: 1 });
  await db.collection("medicines").createIndex({ code: 1 }, { unique: true });

  console.log(`\nSeeded ${Object.keys(seedSets).length} collections, ${total} documents into ${DB_NAME}.`);
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
