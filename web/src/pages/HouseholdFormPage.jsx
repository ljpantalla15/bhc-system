import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";
import { Alert } from "../components/Alert.jsx";
import { Modal } from "../components/Modal.jsx";
import { FormSection } from "../components/Card.jsx";
import { Button, IconButton } from "../components/Button.jsx";
import { Input, FormGroup, FormGrid } from "../components/Form.jsx";
import { showToast } from "../components/Toast.jsx";
import {
  ZONES,
  RELATIONS_TO_HEAD,
  CIVIL_STATUSES,
  EDUCATION_LEVELS,
  RELIGIONS,
  MEDICAL_CONDITIONS,
  DISABILITY_TYPES,
  FP_METHODS,
  FP_STATUSES,
  WATER_SOURCES,
  TOILET_FACILITIES,
  memberChip,
  CHIP_VAR,
} from "../constants.js";
import {
  Plus,
  Trash2,
  ChevronDown,
  CheckCircle2,
  Circle,
  UserCheck,
  AlertTriangle,
  Venus,
  Mars,
  Check,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Validation mirrors the API zod schemas (api/src/schemas/*).         */
/* ------------------------------------------------------------------ */
const DRAFT_KEY = "bhc_household_draft_v1";
const HOUSEHOLD_NO_RE = /^[0-9]{6}-[A-Za-z0-9]+-[0-9]{5}$/;
const PHILHEALTH_RE = /^[0-9]{12}$/;
const MIN_DOB = "1900-01-01";

const initialMember = () => ({
  last_name: "",
  first_name: "",
  middle_name: "",
  relation_to_head: "HEAD",
  relation_other: "",
  birth_date: "",
  sex: "F",
  civil_status_code: "S",
  education_code: "HG",
  religion_code: "RC",
  religion_other: "",
  ethnic_group: "NON_IP",
  occupation: "",
  philhealth_id: "",
  philhealth_membership: "",
  philhealth_category: "",
  is_pregnant: false,
  lmp_date: "",
  uses_fp: false,
  fp_method_code: "",
  fp_method_other: "",
  fp_status_code: "",
  is_pwd: false,
  disability_type_code: "",
  medical_conditions: [],
  other_condition_specify: "",
});

const defaultHousehold = (assignedZoneIds) => {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const randomSuffix = String(Math.floor(10000 + Math.random() * 90000));
  return {
    household_no: `${yyyymm}-TAGO-${randomSuffix}`,
    date_of_visit: now.toISOString().slice(0, 10),
    zone_id: assignedZoneIds.length > 0 ? assignedZoneIds[0] : 1,
    address_line: "",
    water_source_code: "LV3",
    toilet_facility_code: "P",
    is_4ps_household: false,
    fourps_household_id: "",
    reviewed_by_name: "",
  };
};

const computeAge = (dob, ref) => {
  if (!dob) return null;
  const b = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(b.getTime())) return null;
  let age = ref.getFullYear() - b.getFullYear();
  const m = ref.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < b.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

const relationLabel = (code) =>
  RELATIONS_TO_HEAD.find((r) => r.code === code)?.label || code;

/** Build every validation check for the current form state. */
function collectChecks(household, members, todayStr) {
  const checks = [];
  const add = (key, ok, message, section = "hh") =>
    checks.push({ key, ok, message, section });

  add(
    "household.household_no",
    HOUSEHOLD_NO_RE.test((household.household_no || "").trim()),
    "Household number must match the format yyyymm-FacilityCode-00000 (e.g. 202610-TAGO-00001).",
  );
  add(
    "household.date_of_visit",
    Boolean(household.date_of_visit) && household.date_of_visit <= todayStr,
    "Date of visit is required and cannot be in the future.",
  );
  add(
    "household.zone_id",
    Boolean(household.zone_id),
    "Select a Purok / health zone.",
  );
  if (household.is_4ps_household) {
    add(
      "household.fourps_household_id",
      (household.fourps_household_id || "").trim().length > 0,
      "4Ps Household ID is required for 4Ps beneficiary households.",
    );
  }

  const headIdx = members
    .map((m, i) => (m.relation_to_head === "HEAD" ? i : -1))
    .filter((i) => i >= 0);
  if (headIdx.length === 0) {
    add(
      "members.0.relation_to_head",
      false,
      "Designate exactly one family member as HEAD.",
      "roster",
    );
  } else if (headIdx.length > 1) {
    headIdx
      .slice(1)
      .forEach((i) =>
        add(
          `members.${i}.relation_to_head`,
          false,
          `Member #${i + 1} is also marked HEAD — only one HEAD is allowed.`,
          "roster",
        ),
      );
  } else {
    add(`members.${headIdx[0]}.relation_to_head`, true, "", "roster");
  }

  members.forEach((m, i) => {
    const who =
      m.first_name || m.last_name
        ? `Member #${i + 1} (${[m.first_name, m.last_name].filter(Boolean).join(" ")})`
        : `Member #${i + 1}`;
    const at = (name) => `members.${i}.${name}`;

    add(
      at("last_name"),
      (m.last_name || "").trim().length > 0,
      `${who}: last name is required.`,
      "roster",
    );
    add(
      at("first_name"),
      (m.first_name || "").trim().length > 0,
      `${who}: first name is required.`,
      "roster",
    );
    const dob = m.birth_date || "";
    add(
      at("birth_date"),
      Boolean(dob) && dob >= MIN_DOB && dob <= todayStr,
      `${who}: birth date is required and must be between ${MIN_DOB} and today.`,
      "roster",
    );

    if (m.relation_to_head === "OTHER") {
      add(
        at("relation_other"),
        (m.relation_other || "").trim().length > 0,
        `${who}: specify the relation to the household head.`,
        "roster",
      );
    }
    if (m.religion_code === "OTH") {
      add(
        at("religion_other"),
        (m.religion_other || "").trim().length > 0,
        `${who}: specify the religion.`,
        "roster",
      );
    }
    const ph = (m.philhealth_id || "").trim();
    if (ph) {
      add(
        at("philhealth_id"),
        PHILHEALTH_RE.test(ph),
        `${who}: PhilHealth ID must be exactly 12 digits.`,
        "roster",
      );
    }
    if (m.sex === "F" && m.is_pregnant) {
      add(
        at("lmp_date"),
        Boolean(m.lmp_date) && m.lmp_date <= todayStr,
        `${who}: LMP date is required during pregnancy and cannot be in the future.`,
        "roster",
      );
    }
    if (m.sex === "F" && m.uses_fp) {
      add(
        at("fp_method_code"),
        Boolean(m.fp_method_code),
        `${who}: select a family planning method.`,
        "roster",
      );
      if (m.fp_method_code === "OTH") {
        add(
          at("fp_method_other"),
          (m.fp_method_other || "").trim().length > 0,
          `${who}: specify the family planning method.`,
          "roster",
        );
      }
    }
    if (m.is_pwd) {
      add(
        at("disability_type_code"),
        Boolean(m.disability_type_code),
        `${who}: select a disability type.`,
        "roster",
      );
    }
    if ((m.medical_conditions || []).includes("OTH")) {
      add(
        at("other_condition_specify"),
        (m.other_condition_specify || "").trim().length > 0,
        `${who}: specify the medical condition.`,
        "roster",
      );
    }
  });

  return checks;
}

export function HouseholdFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const assignedZoneIds = user?.zone_ids || [];
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const ageRef = useMemo(() => new Date(`${todayStr}T00:00:00`), [todayStr]);

  /* Draft autosave (session only — cleared on submit, discard, or tab close). */
  const savedDraft = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (
        !d ||
        typeof d !== "object" ||
        !d.household ||
        !Array.isArray(d.members) ||
        d.members.length === 0
      )
        return null;
      return d;
    } catch {
      return null;
    }
  }, []);

  const [household, setHousehold] = useState(() => ({
    ...defaultHousehold(assignedZoneIds),
    ...(savedDraft ? savedDraft.household : {}),
  }));
  const [members, setMembers] = useState(() =>
    savedDraft
      ? savedDraft.members.map((m) => ({ ...initialMember(), ...m }))
      : [initialMember()],
  );
  const [draftRestored, setDraftRestored] = useState(Boolean(savedDraft));

  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [removeIdx, setRemoveIdx] = useState(null);

  /* Autosave on every change while not submitting / after success. */
  useEffect(() => {
    if (submitting || success) return;
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ household, members, savedAt: Date.now() }),
      );
    } catch {
      /* storage unavailable — form still works */
    }
  }, [household, members, submitting, success]);

  /* Live validation state (mirrors what the server would reject). */
  const checks = useMemo(
    () => collectChecks(household, members, todayStr),
    [household, members, todayStr],
  );
  const failing = checks.filter((c) => !c.ok);
  const failMap = new Map(failing.map((c) => [c.key, c.message]));
  const hhDone = (() => {
    const s = checks.filter((c) => c.section === "hh");
    return s.length > 0 && s.every((c) => c.ok);
  })();
  const rosterDone = (() => {
    const s = checks.filter((c) => c.section === "roster");
    return s.length > 0 && s.every((c) => c.ok);
  })();
  const ready = failing.length === 0;

  const bad = (key) => attempted && failMap.has(key);
  const errFor = (key) => (attempted ? failMap.get(key) : undefined);
  const invalidCls = (key) => (bad(key) ? "invalid" : "");

  const focusField = (key) => {
    /* Auto-expand a collapsed member card so its field can receive focus. */
    const m = key.match(/^members\.(\d+)\./);
    if (m) {
      const i = Number(m[1]);
      setCollapsed((prev) => (prev[i] ? { ...prev, [i]: false } : prev));
    }
    window.setTimeout(() => {
      const el = document.querySelector(`[data-field="${key}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => {
        try {
          el.focus({ preventScroll: true });
        } catch {
          /* non-focusable */
        }
      }, 250);
    }, 60);
  };

  const handleHouseholdChange = (field, value) =>
    setHousehold((prev) => ({ ...prev, [field]: value }));
  const handleMemberChange = (index, field, value) =>
    setMembers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  const handleConditionToggle = (memberIndex, conditionCode) =>
    setMembers((prev) => {
      const updated = [...prev];
      const current = updated[memberIndex].medical_conditions || [];
      updated[memberIndex].medical_conditions = current.includes(conditionCode)
        ? current.filter((c) => c !== conditionCode)
        : [...current, conditionCode];
      return updated;
    });
  const handleSexChange = (index, sex) =>
    setMembers((prev) => {
      const updated = [...prev];
      const m = { ...updated[index] };
      if (m.sex === sex) return prev;
      m.sex = sex;
      if (sex === "M") {
        m.is_pregnant = false;
        m.lmp_date = "";
        m.uses_fp = false;
        m.fp_method_code = "";
        m.fp_method_other = "";
        m.fp_status_code = "";
      }
      updated[index] = m;
      return updated;
    });

  const addMember = () => {
    const newIndex = members.length;
    const newM = initialMember();
    newM.relation_to_head = members.some((m) => m.relation_to_head === "HEAD")
      ? "DAUGHTER"
      : "HEAD";
    setMembers((prev) => [...prev, newM]);
    setCollapsed((prev) => ({ ...prev, [newIndex]: false }));
    window.setTimeout(() => {
      document
        .getElementById(`member-card-${newIndex}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  const toggleMember = (i) =>
    setCollapsed((prev) => ({ ...prev, [i]: !prev[i] }));

  /** Swap roles with the current head instead of leaving two heads behind. */
  const setAsHead = (index) =>
    setMembers((prev) => {
      const headIdx = prev.findIndex((m) => m.relation_to_head === "HEAD");
      const selected = prev[index];
      if (headIdx === index) return prev;
      return prev.map((m, i) => {
        if (i === index)
          return { ...m, relation_to_head: "HEAD", relation_other: "" };
        if (i === headIdx) {
          const takesOther = selected.relation_to_head === "OTHER";
          return {
            ...m,
            relation_to_head: selected.relation_to_head,
            relation_other: takesOther ? selected.relation_other : "",
          };
        }
        return m;
      });
    });

  const memberDisplay = (i) => {
    const m = members[i];
    if (!m) return "this member";
    return m.first_name || m.last_name
      ? `${m.last_name || ""}, ${m.first_name || ""}`.replace(/^,\s*/, "")
      : `Member #${i + 1}`;
  };

  const confirmRemove = () => {
    const i = removeIdx;
    setRemoveIdx(null);
    if (i === null) return;
    if (members.length <= 1) {
      setError("A household must contain at least one member.");
      return;
    }
    setMembers((prev) => prev.filter((_, k) => k !== i));
    setCollapsed((prev) => {
      const next = {};
      Object.entries(prev).forEach(([k, v]) => {
        const kk = Number(k);
        if (kk < i) next[kk] = v;
        else if (kk > i) next[kk - 1] = v;
      });
      return next;
    });
    showToast({
      type: "info",
      message: `Member #${i + 1} removed from the roster.`,
    });
  };

  const discardDraft = () => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setHousehold(defaultHousehold(assignedZoneIds));
    setMembers([initialMember()]);
    setCollapsed({});
    setAttempted(false);
    setDraftRestored(false);
    setError("");
    setSuccess("");
    showToast({
      type: "info",
      message: "Draft discarded — starting a fresh household form.",
    });
  };

  const dupWith = (i) => {
    const m = members[i];
    const first = (m.first_name || "").trim().toLowerCase();
    const last = (m.last_name || "").trim().toLowerCase();
    if (!first || !last || !m.birth_date) return null;
    const idx = members.findIndex(
      (x, k) =>
        k !== i &&
        (x.first_name || "").trim().toLowerCase() === first &&
        (x.last_name || "").trim().toLowerCase() === last &&
        x.birth_date === m.birth_date,
    );
    return idx >= 0 ? idx : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const issues = collectChecks(household, members, todayStr).filter(
      (c) => !c.ok,
    );
    setAttempted(true);
    if (issues.length > 0) {
      showToast({
        type: "danger",
        message: `Please fix ${issues.length} issue${issues.length === 1 ? "" : "s"} before saving.`,
      });
      focusField(issues[0].key);
      return;
    }
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const cleanedMembers = members.map((m) => {
        const payload = {
          last_name: m.last_name.trim(),
          first_name: m.first_name.trim(),
          middle_name: m.middle_name ? m.middle_name.trim() : null,
          relation_to_head: m.relation_to_head,
          relation_other:
            m.relation_to_head === "OTHER" ? m.relation_other.trim() : null,
          birth_date: m.birth_date,
          sex: m.sex,
          civil_status_code: m.civil_status_code,
          education_code: m.education_code,
          religion_code: m.religion_code || null,
          religion_other:
            m.religion_code === "OTH" ? m.religion_other.trim() : null,
          ethnic_group: m.ethnic_group || null,
          occupation: m.occupation ? m.occupation.trim() : null,
          philhealth_id: m.philhealth_id ? m.philhealth_id.trim() : null,
          philhealth_membership: m.philhealth_membership || null,
          philhealth_category:
            m.philhealth_membership === "MEMBER" && m.philhealth_category
              ? m.philhealth_category
              : null,
          is_pregnant: m.sex === "F" ? Boolean(m.is_pregnant) : false,
          lmp_date: m.sex === "F" && m.is_pregnant ? m.lmp_date : null,
          uses_fp: m.sex === "F" ? Boolean(m.uses_fp) : null,
          fp_method_code: m.sex === "F" && m.uses_fp ? m.fp_method_code : null,
          fp_method_other:
            m.sex === "F" && m.uses_fp && m.fp_method_code === "OTH"
              ? m.fp_method_other.trim()
              : null,
          fp_status_code: m.sex === "F" && m.uses_fp ? m.fp_status_code : null,
          is_pwd: Boolean(m.is_pwd),
          disability_type_code: m.is_pwd ? m.disability_type_code : null,
        };
        payload.medical_conditions = (m.medical_conditions || []).map(
          (code) => ({
            condition_code: code,
            other_specify:
              code === "OTH"
                ? m.other_condition_specify
                  ? m.other_condition_specify.trim()
                  : "Other"
                : null,
          }),
        );
        return payload;
      });
      const body = {
        household_no: household.household_no.trim(),
        date_of_visit: household.date_of_visit,
        zone_id: parseInt(household.zone_id, 10),
        address_line: household.address_line
          ? household.address_line.trim()
          : null,
        water_source_code: household.water_source_code || null,
        toilet_facility_code: household.toilet_facility_code || null,
        is_4ps_household: Boolean(household.is_4ps_household),
        fourps_household_id:
          household.is_4ps_household && household.fourps_household_id
            ? household.fourps_household_id.trim()
            : null,
        reviewed_by_name: household.reviewed_by_name
          ? household.reviewed_by_name.trim()
          : null,
        members: cleanedMembers,
      };
      const res = await api("/api/households", {
        method: "POST",
        body: JSON.stringify(body),
      });
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setDraftRestored(false);
      setSuccess(
        `Household ${res.household_no} profiled with ${res.members?.length || 0} residents!`,
      );
      showToast({
        type: "success",
        message: `Household ${res.household_no} saved successfully.`,
      });
      setTimeout(() => navigate("/residents"), 1200);
    } catch (err) {
      setError(err.message || "Failed to save household profile.");
      showToast({
        type: "danger",
        message: "Failed to save household profile.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* Field helpers: plain functions (not components) so inputs keep focus. */
  const memberText = (index, name, label, { required, placeholder, maxLength = 100, className = "", inputMode, code } = {}) => {
    const key = `members.${index}.${name}`;
    return (
      <FormGroup label={label} required={required} error={errFor(key)} className={className}>
        <Input
          type="text"
          maxLength={maxLength}
          inputMode={inputMode}
          placeholder={placeholder}
          className={`${invalidCls(key)} ${code ? "code" : ""}`}
          data-field={key}
          aria-invalid={bad(key) || undefined}
          value={members[index][name]}
          onChange={(e) => handleMemberChange(index, name, e.target.value)}
          required={required}
        />
      </FormGroup>
    );
  };

  const memberSelect = (index, name, label, options, { required, placeholder, className = "" } = {}) => {
    const key = `members.${index}.${name}`;
    return (
      <FormGroup label={label} required={required} error={errFor(key)} className={className}>
        <select
          className={`form-select ${invalidCls(key)}`}
          data-field={key}
          aria-invalid={bad(key) || undefined}
          value={members[index][name]}
          onChange={(e) => handleMemberChange(index, name, e.target.value)}
          required={required}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.code} value={o.code}>{o.label}</option>
          ))}
        </select>
      </FormGroup>
    );
  };

  const memberName = (m, i) =>
    m.first_name || m.last_name
      ? `${m.last_name || ""}, ${m.first_name || ""}`.replace(/^,\s*/, "").replace(/,\s*$/, "")
      : `Member ${i + 1}`;

  const zoneName = ZONES.find((z) => String(z.id) === String(household.zone_id))?.name || "No purok";
  const hhIssues = failing.filter((c) => c.section === "hh");
  const rosterIssues = failing.filter((c) => c.section === "roster");

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Encode household</h1>
          <p className="page-subtitle">
            Fill in the family profile: the household first, then every member. Your draft is kept until you close this tab.
          </p>
        </div>
      </div>

      {draftRestored && !success && (
        <Alert
          type="info"
          onClose={() => setDraftRestored(false)}
          message={
            <span>
              Your unsaved draft from this session was restored.{" "}
              <button type="button" className="link-btn" onClick={discardDraft}>
                Discard it and start over
              </button>
            </span>
          }
        />
      )}
      <Alert type="danger" message={error} onClose={() => setError("")} />
      <Alert type="success" message={success} onClose={() => setSuccess("")} />

      <form className="hh-layout" onSubmit={handleSubmit} noValidate>
        <div className="hh-main">
          <FormSection
            step={1}
            done={hhDone}
            title="Household"
            desc="Where the family lives, and the water and toilet facilities."
          >
            <FormGrid cols={3}>
              <FormGroup label="Household number" required hint="Format YYYYMM-TAGO-00000" error={errFor("household.household_no")}>
                <Input
                  type="text"
                  maxLength={30}
                  placeholder="YYYYMM-TAGO-00000"
                  className={`code ${invalidCls("household.household_no")}`}
                  data-field="household.household_no"
                  aria-invalid={bad("household.household_no") || undefined}
                  value={household.household_no}
                  onChange={(e) => handleHouseholdChange("household_no", e.target.value)}
                  required
                />
              </FormGroup>
              <FormGroup label="Date of visit" required error={errFor("household.date_of_visit")}>
                <Input
                  type="date"
                  max={todayStr}
                  className={invalidCls("household.date_of_visit")}
                  data-field="household.date_of_visit"
                  aria-invalid={bad("household.date_of_visit") || undefined}
                  value={household.date_of_visit}
                  onChange={(e) => handleHouseholdChange("date_of_visit", e.target.value)}
                  required
                />
              </FormGroup>
              <FormGroup label="Purok" required error={errFor("household.zone_id")}>
                <select
                  className={`form-select ${invalidCls("household.zone_id")}`}
                  data-field="household.zone_id"
                  aria-invalid={bad("household.zone_id") || undefined}
                  value={household.zone_id}
                  onChange={(e) => handleHouseholdChange("zone_id", e.target.value)}
                  required
                >
                  {ZONES.map((z) => {
                    const isAssigned = assignedZoneIds.length === 0 || assignedZoneIds.includes(z.id);
                    return (
                      <option key={z.id} value={z.id} disabled={!isAssigned}>
                        {z.name}{!isAssigned ? " (not assigned to you)" : ""}
                      </option>
                    );
                  })}
                </select>
              </FormGroup>
              <FormGroup label="Address or landmark" className="span-2">
                <Input
                  type="text"
                  maxLength={200}
                  placeholder="House number, street, or nearby landmark"
                  value={household.address_line}
                  onChange={(e) => handleHouseholdChange("address_line", e.target.value)}
                />
              </FormGroup>
              <FormGroup label="Reviewed by">
                <Input
                  type="text"
                  maxLength={150}
                  placeholder="e.g. Maria Santos, RM"
                  value={household.reviewed_by_name}
                  onChange={(e) => handleHouseholdChange("reviewed_by_name", e.target.value)}
                />
              </FormGroup>
              <FormGroup label="Water source" className="span-2">
                <select className="form-select" value={household.water_source_code} onChange={(e) => handleHouseholdChange("water_source_code", e.target.value)}>
                  <option value="">Not stated</option>
                  {WATER_SOURCES.map((w) => <option key={w.code} value={w.code}>{w.label}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="Toilet facility">
                <select className="form-select" value={household.toilet_facility_code} onChange={(e) => handleHouseholdChange("toilet_facility_code", e.target.value)}>
                  <option value="">Not stated</option>
                  {TOILET_FACILITIES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
                </select>
              </FormGroup>
            </FormGrid>

            <div className="toggle-grid">
              <label className={`toggle-card ${household.is_4ps_household ? "on" : ""}`}>
                <input type="checkbox" checked={household.is_4ps_household} onChange={(e) => handleHouseholdChange("is_4ps_household", e.target.checked)} />
                <span><strong>4Ps beneficiary</strong><span>The household is registered with Pantawid Pamilya.</span></span>
              </label>
              {household.is_4ps_household && (
                <FormGroup label="4Ps household ID" required error={errFor("household.fourps_household_id")}>
                  <Input
                    type="text"
                    maxLength={100}
                    className={`code ${invalidCls("household.fourps_household_id")}`}
                    data-field="household.fourps_household_id"
                    aria-invalid={bad("household.fourps_household_id") || undefined}
                    value={household.fourps_household_id}
                    onChange={(e) => handleHouseholdChange("fourps_household_id", e.target.value)}
                    required
                  />
                </FormGroup>
              )}
            </div>
          </FormSection>

          <FormSection
            step={2}
            done={rosterDone}
            title="Family members"
            desc="Add everyone who lives in the household. Exactly one member is the head."
          >
            {members.map((member, index) => {
              const fk = (name) => `members.${index}.${name}`;
              const age = computeAge(member.birth_date, ageRef);
              const dupIdx = dupWith(index);
              const isCollapsed = Boolean(collapsed[index]);
              const chip = memberChip(member, ageRef);
              const meta = [
                member.relation_to_head === "HEAD" ? "Head of household" : relationLabel(member.relation_to_head),
                age !== null ? `${age} ${age === 1 ? "yr" : "yrs"}` : null,
                member.sex === "F" ? "Female" : "Male",
              ].filter(Boolean).join(", ");

              return (
                <div
                  key={index}
                  id={`member-card-${index}`}
                  className={`member-card ${isCollapsed ? "collapsed" : ""}`}
                  style={{ "--tab": CHIP_VAR[chip.cls] }}
                >
                  <div className="member-head">
                    <button type="button" className="member-id" onClick={() => toggleMember(index)} aria-expanded={!isCollapsed}>
                      <span className="member-no">{index + 1}</span>
                      <span style={{ minWidth: 0 }}>
                        <span className="member-name" style={{ display: "block" }}>{memberName(member, index)}</span>
                        <span className="member-meta">{meta}</span>
                      </span>
                    </button>
                    <div className="member-actions">
                      <span className={`pchip ${chip.cls}`}>{chip.label}</span>
                      {member.relation_to_head !== "HEAD" && (
                        <Button variant="ghost" size="sm" onClick={() => setAsHead(index)} title="Swap this member with the current head" iconLeft={<UserCheck className="h-3.5 w-3.5" />}>
                          Make head
                        </Button>
                      )}
                      {members.length > 1 && (
                        <IconButton variant="ghost-danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setRemoveIdx(index)} title="Remove member" />
                      )}
                      <IconButton
                        icon={<ChevronDown className="h-4 w-4" style={{ transform: isCollapsed ? "rotate(-90deg)" : "none", transition: "transform 0.2s ease" }} />}
                        onClick={() => toggleMember(index)}
                        title={isCollapsed ? "Show details" : "Hide details"}
                      />
                    </div>
                  </div>

                  {dupIdx !== null && (
                    <div className="field-warn" style={{ margin: "0 1.25rem 0.75rem 1.5rem" }}>
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Same name and birth date as member {dupIdx + 1}. Check that this is not a duplicate.
                    </div>
                  )}

                  {!isCollapsed && (
                    <div className="member-body">
                      <div>
                        <p className="field-block-title">Identity</p>
                        <FormGrid cols={3}>
                          {memberText(index, "last_name", "Last name", { required: true, placeholder: "e.g. Dela Cruz" })}
                          {memberText(index, "first_name", "First name", { required: true, placeholder: "e.g. Juan" })}
                          {memberText(index, "middle_name", "Middle name", { placeholder: "e.g. Santos" })}
                          {memberSelect(index, "relation_to_head", "Relation to head", RELATIONS_TO_HEAD, { required: true })}
                          <FormGroup label="Date of birth" required error={errFor(fk("birth_date"))}>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                              <Input
                                type="date"
                                min={MIN_DOB}
                                max={todayStr}
                                className={invalidCls(fk("birth_date"))}
                                data-field={fk("birth_date")}
                                aria-invalid={bad(fk("birth_date")) || undefined}
                                value={member.birth_date}
                                onChange={(e) => handleMemberChange(index, "birth_date", e.target.value)}
                                required
                              />
                              {age !== null && <span className="age-chip">{age} {age === 1 ? "yr" : "yrs"}</span>}
                            </div>
                          </FormGroup>
                          <FormGroup label="Sex" required>
                            <div className="seg-control" data-field={fk("sex")} role="group" aria-label="Sex">
                              <button type="button" className={`seg-btn ${member.sex === "F" ? "on" : ""}`} aria-pressed={member.sex === "F"} onClick={() => handleSexChange(index, "F")}>
                                <Venus size={15} strokeWidth={2.5} />Female
                              </button>
                              <button type="button" className={`seg-btn ${member.sex === "M" ? "on" : ""}`} aria-pressed={member.sex === "M"} onClick={() => handleSexChange(index, "M")}>
                                <Mars size={15} strokeWidth={2.5} />Male
                              </button>
                            </div>
                          </FormGroup>
                          {member.relation_to_head === "OTHER" &&
                            memberText(index, "relation_other", "Specify relation", { required: true, placeholder: "e.g. Grandparent, boarder", className: "span-3" })}
                        </FormGrid>
                      </div>

                      <div>
                        <p className="field-block-title">Background and PhilHealth</p>
                        <FormGrid cols={3}>
                          {memberSelect(index, "civil_status_code", "Civil status", CIVIL_STATUSES, { required: true })}
                          {memberSelect(index, "education_code", "Education", EDUCATION_LEVELS, { required: true })}
                          {memberSelect(index, "religion_code", "Religion", RELIGIONS)}
                          {member.religion_code === "OTH" &&
                            memberText(index, "religion_other", "Specify religion", { required: true, className: "span-3" })}
                          {memberText(index, "occupation", "Occupation", { placeholder: "e.g. Farmer, vendor, student" })}
                          {memberText(index, "philhealth_id", "PhilHealth ID", { placeholder: "12 digits", maxLength: 12, inputMode: "numeric", code: true })}
                          {member.philhealth_id ? (
                            memberSelect(index, "philhealth_membership", "PhilHealth membership", [
                              { code: "MEMBER", label: "Member" },
                              { code: "DEPENDENT", label: "Dependent" },
                            ], { placeholder: "Select" })
                          ) : <div />}
                          {member.philhealth_id && member.philhealth_membership === "MEMBER" &&
                            memberSelect(index, "philhealth_category", "PhilHealth category", [
                              { code: "DIRECT", label: "Direct contributor" },
                              { code: "INDIRECT", label: "Indirect contributor" },
                            ], { placeholder: "Select" })}
                        </FormGrid>
                      </div>

                      <div>
                        <p className="field-block-title">Health</p>
                        <div className="toggle-grid">
                          {member.sex === "F" && (
                            <label className={`toggle-card t-maternal ${member.is_pregnant ? "on" : ""}`}>
                              <input type="checkbox" checked={member.is_pregnant} onChange={(e) => handleMemberChange(index, "is_pregnant", e.target.checked)} />
                              <span><strong>Pregnant</strong><span>Adds her to the pregnant women masterlist.</span></span>
                            </label>
                          )}
                          {member.sex === "F" && (
                            <label className={`toggle-card ${member.uses_fp ? "on" : ""}`}>
                              <input type="checkbox" checked={member.uses_fp} onChange={(e) => handleMemberChange(index, "uses_fp", e.target.checked)} />
                              <span><strong>Uses family planning</strong><span>Record the method and status.</span></span>
                            </label>
                          )}
                          <label className={`toggle-card t-pwd ${member.is_pwd ? "on" : ""}`}>
                            <input type="checkbox" checked={member.is_pwd} onChange={(e) => handleMemberChange(index, "is_pwd", e.target.checked)} />
                            <span><strong>Person with disability</strong><span>Adds them to the PWD masterlist.</span></span>
                          </label>
                        </div>

                        {(member.is_pregnant || member.uses_fp || member.is_pwd) && (
                          <FormGrid cols={3} className="mt-4">
                            {member.sex === "F" && member.is_pregnant && (
                              <FormGroup label="Last menstrual period" required error={errFor(fk("lmp_date"))}>
                                <Input
                                  type="date"
                                  max={todayStr}
                                  className={invalidCls(fk("lmp_date"))}
                                  data-field={fk("lmp_date")}
                                  aria-invalid={bad(fk("lmp_date")) || undefined}
                                  value={member.lmp_date}
                                  onChange={(e) => handleMemberChange(index, "lmp_date", e.target.value)}
                                  required
                                />
                              </FormGroup>
                            )}
                            {member.sex === "F" && member.uses_fp &&
                              memberSelect(index, "fp_method_code", "Family planning method", FP_METHODS, { required: true, placeholder: "Select method" })}
                            {member.sex === "F" && member.uses_fp && member.fp_method_code === "OTH" &&
                              memberText(index, "fp_method_other", "Specify method", { required: true })}
                            {member.sex === "F" && member.uses_fp &&
                              memberSelect(index, "fp_status_code", "Family planning status", FP_STATUSES, { placeholder: "Select status" })}
                            {member.is_pwd &&
                              memberSelect(index, "disability_type_code", "Disability type", DISABILITY_TYPES, { required: true, placeholder: "Select type" })}
                          </FormGrid>
                        )}

                        <p className="form-label" style={{ marginTop: "1rem" }}>Diagnosed conditions</p>
                        <div className="chip-row" role="group" aria-label="Diagnosed conditions">
                          {MEDICAL_CONDITIONS.map((cond) => {
                            const checked = (member.medical_conditions || []).includes(cond.code);
                            return (
                              <button
                                type="button"
                                key={cond.code}
                                className={`condition-chip ${checked ? "active" : ""}`}
                                aria-pressed={checked}
                                onClick={() => handleConditionToggle(index, cond.code)}
                              >
                                <span className="chip-mark">{checked ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</span>
                                {cond.label}
                              </button>
                            );
                          })}
                        </div>
                        {(member.medical_conditions || []).includes("OTH") && (
                          <div style={{ marginTop: "0.65rem", maxWidth: "360px" }}>
                            {memberText(index, "other_condition_specify", "Specify condition", { required: true })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <button type="button" className="add-member" onClick={addMember}>
              <Plus className="h-4 w-4" /> Add family member
            </button>
          </FormSection>
        </div>

        <aside className="hh-rail" aria-label="Household summary">
          <div className="rail-card">
            <div className="rail-head">
              <code>{household.household_no || "No household number"}</code>
              <span>{zoneName}, visited {household.date_of_visit || "date not set"}</span>
            </div>

            <div className="rail-section">
              <p className="rail-label">{members.length} {members.length === 1 ? "member" : "members"}</p>
              <ul className="rail-roster">
                {members.map((m, i) => {
                  const chip = memberChip(m, ageRef);
                  return (
                    <li key={i}>
                      <button type="button" onClick={() => focusField(`members.${i}.last_name`)} title={chip.label}>
                        <span className="dot" style={{ "--tab": CHIP_VAR[chip.cls] }} />
                        <span className="nm">{memberName(m, i)}</span>
                        <span className="rl">{m.relation_to_head === "HEAD" ? "Head" : relationLabel(m.relation_to_head)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rail-section">
              <ul className="check-list">
                <li>
                  {hhDone ? <CheckCircle2 className="h-4 w-4 ok" /> : <Circle className="h-4 w-4 todo" />}
                  Household details{!hhDone && hhIssues.length > 0 ? ` (${hhIssues.length} to fix)` : ""}
                </li>
                <li>
                  {rosterDone ? <CheckCircle2 className="h-4 w-4 ok" /> : <Circle className="h-4 w-4 todo" />}
                  Family members{!rosterDone && rosterIssues.length > 0 ? ` (${rosterIssues.length} to fix)` : ""}
                </li>
              </ul>
              {attempted && failing.length > 0 && (
                <ul className="issue-list">
                  {failing.slice(0, 6).map((c) => (
                    <li key={c.key}>
                      <button type="button" onClick={() => focusField(c.key)}>
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ marginTop: 2 }} />
                        {c.message}
                      </button>
                    </li>
                  ))}
                  {failing.length > 6 && <li className="rail-note">and {failing.length - 6} more</li>}
                </ul>
              )}
            </div>

            <div className="rail-actions">
              <Button variant="primary" type="submit" size="lg" className="btn-block" loading={submitting} disabled={submitting}>
                {submitting ? "Saving household…" : "Save household"}
              </Button>
              <Button variant="ghost" className="btn-block" onClick={() => navigate("/residents")}>
                Cancel
              </Button>
              <p className="rail-note">
                {ready ? "Everything required is filled in." : "Save checks every field and lists anything missing here."}{" "}
                <button type="button" className="link-btn" onClick={discardDraft}>Clear the form</button>
              </p>
            </div>
          </div>
        </aside>
      </form>

      <Modal
        isOpen={removeIdx !== null}
        onClose={() => setRemoveIdx(null)}
        title="Remove this member?"
        subtitle={removeIdx !== null ? memberDisplay(removeIdx) : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveIdx(null)}>Keep member</Button>
            <Button variant="danger" onClick={confirmRemove}>Remove member</Button>
          </>
        }
      >
        <div className="notice notice-danger">
          <AlertTriangle className="h-[18px] w-[18px] shrink-0" />
          <span>Everything entered for <strong>{removeIdx !== null ? memberDisplay(removeIdx) : ""}</strong> will be cleared from this form.</span>
        </div>
        <p className="form-hint">To change who heads the household, use <strong>Make head</strong> instead.</p>
      </Modal>
    </div>
  );
}
