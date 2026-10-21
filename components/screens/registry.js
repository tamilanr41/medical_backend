import MedicineLookup from "./MedicineLookup";
import AppointmentByDoctor from "./AppointmentByDoctor";
import AppointmentAllDoctors from "./AppointmentAllDoctors";
import OpRegister from "./OpRegister";
import PatientBilling from "./PatientBilling";
import DoctorConsultation from "./DoctorConsultation";
import PatientHistory from "./PatientHistory";
import OpClinicalInfo from "./OpClinicalInfo";
import IssueCertificate from "./IssueCertificate";
import ReferToHospital from "./ReferToHospital";
import OnlineConsultation from "./OnlineConsultation";
import TreatmentPlanScheduling from "./TreatmentPlanScheduling";
import TreatmentPlanAllocation from "./TreatmentPlanAllocation";
import SponsorBilling from "./SponsorBilling";
import PostponeAppointment from "./PostponeAppointment";
import OpRegistrationReport from "./OpRegistrationReport";
import OpFinancialReport from "./OpFinancialReport";
import IpFinancialReport from "./IpFinancialReport";
import AdmissionRegister from "./AdmissionRegister";
import RoomStatus from "./RoomStatus";
import IpClinicalRecords from "./IpClinicalRecords";
import IpBillingRecords from "./IpBillingRecords";
import LabBill from "./LabBill";
import LabExternalTests from "./LabExternalTests";
import LabOrders from "./LabOrders";
import LabReport from "./LabReport";
import LabResults from "./LabResults";
import LabSponsorDues from "./LabSponsorDues";
import DiagOrders from "./DiagOrders";
import DoctorManagement from "./DoctorManagement";
import PharmacySale from "./PharmacySale";
import PharmacyPurchase from "./PharmacyPurchase";

/**
 * Custom screen overrides keyed by full item route (`module/category/item`).
 * Takes priority over collection-level overrides. Use this when only one menu
 * item behind a shared collection needs bespoke behaviour.
 */
export const SCREEN_BY_ITEM = {
  "opd/transaction/appointment-by-doctor": AppointmentByDoctor,
  "opd/transaction/appointment-all-doctors": AppointmentAllDoctors,
  "opd/transaction/op-register": OpRegister,
  "opd/transaction/op-register-college": OpRegister,
  "opd/transaction/patient-billing": PatientBilling,
  "opd/transaction/doctor-consultation": DoctorConsultation,
  "opd/transaction/patient-history": PatientHistory,
  "opd/transaction/patient-clinical-info": OpClinicalInfo,
  "opd/transaction/issue-certificate": IssueCertificate,
  "opd/transaction/refer-to-other-hospital": ReferToHospital,
  "opd/transaction/online-doctor-consultation": OnlineConsultation,
  "opd/transaction/treatment-plan-scheduling": TreatmentPlanScheduling,
  "opd/transaction/treatment-plan-execution": TreatmentPlanScheduling,
  "opd/transaction/treatment-plan-allocation": TreatmentPlanAllocation,
  "opd/transaction/sponsor-billing": SponsorBilling,
  "opd/transaction/postpone-appointment": PostponeAppointment,
  "opd/report/registration": OpRegistrationReport,
  "opd/report/op-collection-expense": OpFinancialReport,
  "opd/report/clinical": OpFinancialReport,
  "opd/report/collection": OpFinancialReport,
  "opd/report/billing": OpFinancialReport,
  "opd/report/advance-refund-due": OpFinancialReport,
  "opd/report/sponsor-wise-collection-due": OpFinancialReport,
  "opd/report/expenses": OpFinancialReport,
  "opd/report/op-ip-monthly-collection": OpFinancialReport,
  "opd/report/excel-export": OpFinancialReport,
  "opd/report/patient-billing-report": OpFinancialReport,
  "opd/report/privilege-card-report": OpFinancialReport,
  "ipd/report/ip-advance-detail": IpFinancialReport,
  "ipd/report/ip-payment-detail": IpFinancialReport,
  "ipd/report/ip-daily-collection-report": IpFinancialReport,
  "ipd/report/ip-mis-reports": IpFinancialReport,
  "ipd/report/excel-export": IpFinancialReport,
  "ipd/report/ip-turn-around-time": IpFinancialReport,
  "ipd/transaction/admission-register": AdmissionRegister,
  "ipd/transaction/admission-register-college": AdmissionRegister,
  "ipd/transaction/room-status": RoomStatus,
  "ipd/transaction/initial-assessment": IpClinicalRecords,
  "ipd/transaction/doctors-order": IpClinicalRecords,
  "ipd/transaction/case-sheet": IpClinicalRecords,
  "ipd/transaction/schedule-doctor-visit": IpClinicalRecords,
  "ipd/transaction/discharge-advice": IpClinicalRecords,
  "ipd/transaction/discharge-summary": IpClinicalRecords,
  "ipd/transaction/patient-feedback": IpClinicalRecords,
  "ipd/transaction/ip-advance-request": IpBillingRecords,
  "ipd/transaction/ip-advance-collection": IpBillingRecords,
  "ipd/transaction/discount-authorization": IpBillingRecords,
  "ipd/transaction/ip-doctor-share-distribution": IpBillingRecords,
  "ipd/transaction/inpatient-write-off": IpBillingRecords,
  "ipd/transaction/ip-posting-to-finance": IpBillingRecords,
  "ipd/transaction/doctor-settlement-ip": IpBillingRecords,
  "ipd/transaction/doctor-settlement-approval-ip": IpBillingRecords,
  "ipd/transaction/cancel-receipt": IpBillingRecords,
  "laboratory/frontoffice/bill": LabBill,
  "laboratory/frontoffice/sponsor-due-collection": LabSponsorDues,
  "laboratory/lab/patient-checkin-register-lab": LabOrders,
  "laboratory/lab/sample-collection-by-checkin": LabOrders,
  "laboratory/lab/sample-collection-register": LabOrders,
  "laboratory/lab/lab-test-pending": LabOrders,
  "laboratory/lab/lab-test-sent-to-external-org": LabExternalTests,
  "laboratory/lab/lab-test-sent-to-external-org-edit-amount": LabExternalTests,
  "laboratory/lab/labresult-register": LabResults,
  "laboratory/lab/directresult-register": LabResults,
  "laboratory/lab/lab-result-approval": LabResults,
  "laboratory/lab/lab-result-dispatch": LabResults,
  "laboratory/lab/lab-test-repeat": LabResults,
  "laboratory/report/lab-test-profile": LabReport,
  "laboratory/report/lab-externalorg-share": LabReport,
  "laboratory/report/excel-export": LabReport,
  "laboratory/master/doctor-list": DoctorManagement,
  "laboratory/master/doctor": DoctorManagement,
  "xray/transaction/xray-register": DiagOrders,
  "xray/transaction/xray-result": DiagOrders,
  "xray/transaction/xray-test-sent-to-external-org": DiagOrders,
  "xray/transaction/xray-issue-register": DiagOrders,
  "xray/transaction/credit-bill": DiagOrders,
  "xray/transaction/sponsor-due-collection": DiagOrders,
  "scan/transaction/scan-register": DiagOrders,
  "scan/transaction/scheduling-scan": DiagOrders,
  "scan/transaction/scan-test-sent-to-external-org": DiagOrders,
  "scan/transaction/credit-bill": DiagOrders,
  "scan/transaction/sponsor-due-collection": DiagOrders,
  "specialty-tests/transaction/cardiology-register": DiagOrders,
  "specialty-tests/transaction/diabetology-register": DiagOrders,
  "physiotherapy/transaction/physiotherapy-register": DiagOrders,
  "physiotherapy/transaction/credit-bill": DiagOrders,
  "physiotherapy/transaction/pending-payment": DiagOrders,
  "physiotherapy/transaction/physio-service-return": DiagOrders,
  "dialysis/transaction/dialysis-register": DiagOrders,
  "dialysis/transaction/service-request": DiagOrders,
  "dialysis/transaction/credit-bill": DiagOrders,
  "dialysis/transaction/pending-payment": DiagOrders,
  "dialysis/transaction/sponsor-due-collection": DiagOrders,
  "pharmacy/sales/cash-sale": PharmacySale,
  "pharmacy/purchase/cash-purchase": PharmacyPurchase,
  "pharmacy/purchase/purchase-request": PharmacyPurchase,
  "pharmacy/purchase/purchase-order": PharmacyPurchase,
  "pharmacy/purchase/goods-receipt": PharmacyPurchase,
  "pharmacy/purchase/purchase-return": PharmacyPurchase,
};

/**
 * Custom screen overrides keyed by Mongo collection. Any menu item wired to a
 * collection listed here renders the bespoke screen instead of the generic
 * CRUD/list/report placeholder (see app/(app)/[module]/[category]/[item]).
 */
export const SCREEN_BY_COLLECTION = {
  medicines: MedicineLookup,
};

export function getCustomScreen({ module, category, item }) {
  if (item && module && category) {
    const itemScreen =
      SCREEN_BY_ITEM[`${module.slug}/${category.slug}/${item.slug}`];
    if (itemScreen) return itemScreen;
  }
  const collection = item && item.screen ? item.screen.collection : null;
  return (collection && SCREEN_BY_COLLECTION[collection]) || null;
}

export function getCustomScreenByCollection(collection) {
  return (collection && SCREEN_BY_COLLECTION[collection]) || null;
}
