"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Camera,
  FileSignature,
  Loader2,
  Plus,
  Save,
  Search,
  UserRound,
  X,
} from "lucide-react";
import PageSection from "@/components/ui/PageSection";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-xl border bg-ink-50/40 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 dark:bg-ink-900/40 dark:text-ink-100 dark:border-ink-700";
const selectCls = cn(inputCls, "cursor-pointer");
const textareaCls = cn(inputCls, "min-h-[80px] resize-y");

export default function DoctorManagement({ user }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    department: "",
    registrationNo: "",
    specialty: "",
    sex: "",
    age: "",
    phone: "",
    mobile: "",
    email: "",
    address: "",
    occupation: "",
    qualification: "",
    degree: "",
    city: "",
    postalCode: "",
    locality: "",
    district: "",
    state: "",
    country: "",
    panNumber: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    consultationFee: "",
    consultingDuration: "",
    serialNo: "",
    referredByCode: "",
    referredByName: "",
    onlineConsultation: "No",
    calendarType: "Default",
    doctorPercentage: "",
    doctorShareAmount: "",
    photoUrl: "",
    signatureUrl: "",
    status: "Active",
  });
  const [errors, setErrors] = useState({});
  const [codeChecking, setCodeChecking] = useState(false);

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/resource/lab_doctors?limit=200", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setDoctors(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/resource/lab_doctors?limit=200", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          setDoctors(Array.isArray(data.rows) ? data.rows : []);
        }
      } catch {
        if (!cancelled) setDoctors([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = doctors.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [d.code, d.name, d.specialty, d.phone, d.mobile].some((v) =>
      String(v || "").toLowerCase().includes(q)
    );
  });

  function startNew() {
    setEditing("new");
    setFormData({
      code: "",
      name: "",
      department: "",
      registrationNo: "",
      specialty: "",
      sex: "",
      age: "",
      phone: "",
      mobile: "",
      email: "",
      address: "",
      occupation: "",
      qualification: "",
      degree: "",
      city: "",
      postalCode: "",
      locality: "",
      district: "",
      state: "",
      country: "",
      panNumber: "",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      consultationFee: "",
      consultingDuration: "",
      serialNo: "",
      referredByCode: "",
      referredByName: "",
      onlineConsultation: "No",
      calendarType: "Default",
      doctorPercentage: "",
      doctorShareAmount: "",
      photoUrl: "",
      signatureUrl: "",
      status: "Active",
    });
    setErrors({});
  }

  function editDoctor(doc) {
    setEditing(doc._id);
    setFormData({
      code: doc.code || "",
      name: doc.name || "",
      department: doc.department || "",
      registrationNo: doc.registrationNo || "",
      specialty: doc.specialty || "",
      sex: doc.sex || "",
      age: doc.age || "",
      phone: doc.phone || "",
      mobile: doc.mobile || "",
      email: doc.email || "",
      address: doc.address || "",
      occupation: doc.occupation || "",
      qualification: doc.qualification || "",
      degree: doc.degree || "",
      city: doc.city || "",
      postalCode: doc.postalCode || "",
      locality: doc.locality || "",
      district: doc.district || "",
      state: doc.state || "",
      country: doc.country || "",
      panNumber: doc.panNumber || "",
      bankName: doc.bankName || "",
      accountNumber: doc.accountNumber || "",
      ifscCode: doc.ifscCode || "",
      consultationFee: doc.consultationFee || "",
      consultingDuration: doc.consultingDuration || "",
      serialNo: doc.serialNo || "",
      referredByCode: doc.referredByCode || "",
      referredByName: doc.referredByName || "",
      onlineConsultation: doc.onlineConsultation || "No",
      calendarType: doc.calendarType || "Default",
      doctorPercentage: doc.doctorPercentage || "",
      doctorShareAmount: doc.doctorShareAmount || "",
      photoUrl: doc.photoUrl || "",
      signatureUrl: doc.signatureUrl || "",
      status: doc.status || "Active",
    });
    setErrors({});
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (name === "code") {
      setErrors((p) => {
        const n = { ...p };
        delete n.code;
        return n;
      });
    }
  }

  async function uploadFile(type) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = type === "photo" ? "image/*" : "image/*,application/pdf";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (type === "photo") setUploadingPhoto(true);
      else setUploadingSig(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("type", type);
        const res = await fetch("/api/attachments/doctor", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok && data.url) {
          if (type === "photo") setFormData((p) => ({ ...p, photoUrl: data.url }));
          else setFormData((p) => ({ ...p, signatureUrl: data.url }));
        } else {
          alert(data.error || "Upload failed");
        }
      } catch {
        alert("Upload failed");
      } finally {
        if (type === "photo") setUploadingPhoto(false);
        else setUploadingSig(false);
      }
    };
    input.click();
  }

  async function saveDoctor() {
    const errs = {};
    if (!formData.code?.trim()) errs.code = "Doctor Code is required";
    if (!formData.name?.trim()) errs.name = "Doctor Name is required";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const codeOk = await checkCodeUniqueness(formData.code);
    if (!codeOk) {
      return;
    }
    setSaving(true);
    try {
      if (editing === "new") {
        const res = await fetch("/api/resource/lab_doctors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || "Failed to save");
          return;
        }
        alert("Doctor created successfully");
      } else {
        const res = await fetch(`/api/resource/lab_doctors/${editing}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || "Failed to save");
          return;
        }
        alert("Doctor updated successfully");
      }
      setEditing(null);
      loadDoctors();
    } catch {
      alert("Failed to save doctor");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">
              {editing === "new" ? "Add New Doctor" : "Edit Doctor"}
            </h2>
            <p className="text-sm text-ink-500">Doctor Management</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(null)}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-ink-50 dark:hover:bg-ink-800"
            >
              <X className="h-4 w-4" /> Close
            </button>
            <button
              onClick={saveDoctor}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>
        </div>

        <PageSection title="Personal Details" icon={<UserRound className="h-4 w-4" />}>
          <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Doctor Code *" error={errors.code}>
              <input
                name="code"
                value={formData.code}
                onChange={handleChange}
                onBlur={() => checkCodeUniqueness(formData.code)}
                className={inputCls}
              />
            </Field>
            <Field label="Doctor Name *" error={errors.name}>
              <input name="name" value={formData.name} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Mobile">
              <input name="mobile" value={formData.mobile} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input name="phone" value={formData.phone} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Email ID">
              <input name="email" type="email" value={formData.email} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Sex">
              <select name="sex" value={formData.sex} onChange={handleChange} className={selectCls}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Age">
              <input name="age" type="number" value={formData.age} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Address" className="md:col-span-2 lg:col-span-3">
              <textarea name="address" value={formData.address} onChange={handleChange} className={textareaCls} />
            </Field>
            <Field label="City">
              <input name="city" value={formData.city} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Locality">
              <input name="locality" value={formData.locality} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="District">
              <input name="district" value={formData.district} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="State">
              <input name="state" value={formData.state} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Country">
              <input name="country" value={formData.country} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Postal Code">
              <input name="postalCode" value={formData.postalCode} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="PAN Number">
              <input name="panNumber" value={formData.panNumber} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Bank Name">
              <input name="bankName" value={formData.bankName} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Account Number">
              <input name="accountNumber" value={formData.accountNumber} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="IFSC Code">
              <input name="ifscCode" value={formData.ifscCode} onChange={handleChange} className={inputCls} />
            </Field>
          </div>
        </PageSection>

        <PageSection title="Professional Details" icon={<UserRound className="h-4 w-4" />}>
          <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Speciality">
              <input name="specialty" value={formData.specialty} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Qualification">
              <input name="qualification" value={formData.qualification} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Degree">
              <input name="degree" value={formData.degree} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Medical Registration Number">
              <input name="registrationNo" value={formData.registrationNo} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Doctor Percentage">
              <input name="doctorPercentage" type="number" value={formData.doctorPercentage} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Doctor Status">
              <select name="status" value={formData.status} onChange={handleChange} className={selectCls}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </Field>
            <Field label="Department">
              <input name="department" value={formData.department} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Occupation">
              <input name="occupation" value={formData.occupation} onChange={handleChange} className={inputCls} />
            </Field>
          </div>
        </PageSection>

        <PageSection title="Consultation Details" icon={<UserRound className="h-4 w-4" />}>
          <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Consultation Fee">
              <input name="consultationFee" type="number" value={formData.consultationFee} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Consulting Duration (Minutes)">
              <input name="consultingDuration" type="number" value={formData.consultingDuration} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="S.No">
              <input name="serialNo" type="number" value={formData.serialNo} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Doctor Share Amount">
              <input name="doctorShareAmount" type="number" value={formData.doctorShareAmount} onChange={handleChange} className={inputCls} />
            </Field>
          </div>
        </PageSection>

        <PageSection title="Referring Doctor" icon={<UserRound className="h-4 w-4" />}>
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <Field label="Referred By Code">
              <input name="referredByCode" value={formData.referredByCode} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Referred By Name">
              <input name="referredByName" value={formData.referredByName} onChange={handleChange} className={inputCls} />
            </Field>
          </div>
        </PageSection>

        <PageSection title="Online Consultation & Calendar Settings" icon={<UserRound className="h-4 w-4" />}>
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <Field label="Online Consultation">
              <select name="onlineConsultation" value={formData.onlineConsultation} onChange={handleChange} className={selectCls}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </Field>
            <Field label="Doctor Calendar Type">
              <select name="calendarType" value={formData.calendarType} onChange={handleChange} className={selectCls}>
                <option value="Default">Default</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </Field>
          </div>
        </PageSection>

        <PageSection title="Doctor Photo and Signature" icon={<Camera className="h-4 w-4" />}>
          <div className="grid gap-6 p-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium">Doctor Photo</p>
              {formData.photoUrl ? (
                <img src={formData.photoUrl} alt="Doctor" className="mb-2 h-32 w-32 rounded-lg object-cover" />
              ) : (
                <div className="mb-2 flex h-32 w-32 items-center justify-center rounded-lg bg-ink-100 dark:bg-ink-800">
                  <UserRound className="h-12 w-12 text-ink-400" />
                </div>
              )}
              <button
                onClick={() => uploadFile("photo")}
                disabled={uploadingPhoto}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-800"
              >
                {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Upload Photo
              </button>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Doctor Signature</p>
              {formData.signatureUrl ? (
                <img src={formData.signatureUrl} alt="Signature" className="mb-2 h-20 w-40 rounded-lg object-contain bg-white" />
              ) : (
                <div className="mb-2 flex h-20 w-40 items-center justify-center rounded-lg bg-ink-100 dark:bg-ink-800">
                  <FileSignature className="h-8 w-8 text-ink-400" />
                </div>
              )}
              <button
                onClick={() => uploadFile("signature")}
                disabled={uploadingSig}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-800"
              >
                {uploadingSig ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
                Upload Signature
              </button>
            </div>
          </div>
        </PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">Doctor Management</h2>
          <p className="text-sm text-ink-500">Manage doctor records</p>
        </div>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> New Doctor
        </button>
      </div>

      <PageSection title="Doctor List" icon={<UserRound className="h-4 w-4" />}>
        <div className="border-b border-ink-100 p-4 dark:border-ink-800">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code, name, specialty..."
              className={cn(inputCls, "pl-9")}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 dark:border-ink-800">
                <th className="px-4 py-2 text-left font-medium text-ink-600">Code</th>
                <th className="px-4 py-2 text-left font-medium text-ink-600">Name</th>
                <th className="px-4 py-2 text-left font-medium text-ink-600">Specialty</th>
                <th className="px-4 py-2 text-left font-medium text-ink-600">Mobile</th>
                <th className="px-4 py-2 text-left font-medium text-ink-600">Consultation Fee</th>
                <th className="px-4 py-2 text-left font-medium text-ink-600">Status</th>
                <th className="px-4 py-2 text-left font-medium text-ink-600">Online</th>
                <th className="px-4 py-2 text-right font-medium text-ink-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-ink-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-ink-500">
                    No doctors found
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => (
                  <tr key={doc._id} className="border-b border-ink-100 hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-900/40">
                    <td className="px-4 py-2">{doc.code}</td>
                    <td className="px-4 py-2 font-medium">{doc.name}</td>
                    <td className="px-4 py-2">{doc.specialty}</td>
                    <td className="px-4 py-2">{doc.mobile || doc.phone}</td>
                    <td className="px-4 py-2">{doc.consultationFee}</td>
                    <td className="px-4 py-2">{doc.status}</td>
                    <td className="px-4 py-2">{doc.onlineConsultation}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => editDoctor(doc)} className="text-brand-600 hover:underline">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageSection>
    </div>
  );
}

function Field({ label, error, children, className }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-rose-500">{error}</span> : null}
    </label>
  );
}
