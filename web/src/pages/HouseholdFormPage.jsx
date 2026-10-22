import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";
import { Alert } from "../components/Alert.jsx";
import { Modal } from "../components/Modal.jsx";
import { Card, SectionCard } from "../components/Card.jsx";
import { Button, IconButton } from "../components/Button.jsx";
import { Input, FormGroup, FormGrid, FormCheck } from "../components/Form.jsx";
import { Stepper, Step } from "../components/Stepper.jsx";
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
} from "../constants.js";
import {
  Home,
  Users,
  Plus,
  Trash2,
  Heart,
  Accessibility,
  ChevronDown,
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

  const rosterDesc =
    "Enumerate all family members — exactly one must be designated HEAD.";

  return (
    <div
      className="page-narrow page-stack"
      style={{ animation: "fadeInUp 0.3s ease backwards" }}
    >
      <nav className="breadcrumb">
        <span>Dashboard</span> <span className="breadcrumb-sep">›</span>
        <span>Encode household</span>
      </nav>

      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Encode household</h1>
          <p className="page-subtitle">
            Household metadata and every resident family member. Progress is autosaved in this session.
          </p>
        </div>
      </div>

      {draftRestored && !success && (
        <Alert
          type="info"
          onClose={() => setDraftRestored(false)}
          message={
            <span>
              Draft restored — unsaved entries from this session were recovered.
              <button
                type="button"
                onClick={discardDraft}
                style={{
                  marginLeft: "0.6rem",
                  background: "none",
                  border: "none",
                  padding: 0,
                  font: "inherit",
                  fontWeight: 700,
                  color: "inherit",
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                  cursor: "pointer",
                }}
              >
                Discard draft &amp; start over
              </button>
            </span>
          }
        />
      )}

      <Alert type="danger" message={error} onClose={() => setError("")} />
      <Alert type="success" message={success} onClose={() => setSuccess("")} />

      <Stepper>
        <Step
          label="Household info"
          subtitle="Location & sanitation"
          completed={hhDone}
          active={!hhDone}
        />
        <Step
          label="Resident roster"
          subtitle="Family members"
          completed={rosterDone}
          active={hhDone && !rosterDone}
        />
        <Step
          label="Validation"
          subtitle="Review & save"
          completed={ready}
          active={hhDone && rosterDone && !ready}
        />
      </Stepper>

      <form className="form-stack" onSubmit={handleSubmit} noValidate>
        <SectionCard
          title="Household information"
          icon={<Home className="h-4 w-4" />}
          desc="Official DOH / Barangay Health Center form header."
        >
          <FormGrid cols={3}>
            <FormGroup
              label="Household number"
              required
              hint="Standard format: YYYYMM-TAGO-#####"
              error={errFor("household.household_no")}
            >
              <Input
                type="text"
                maxLength={30}
                placeholder="YYYYMM-TAGO-00000"
                className={invalidCls("household.household_no")}
                data-field="household.household_no"
                aria-invalid={bad("household.household_no") || undefined}
                value={household.household_no}
                onChange={(e) =>
                  handleHouseholdChange("household_no", e.target.value)
                }
                required
              />
            </FormGroup>
            <FormGroup
              label="Date of visit"
              required
              error={errFor("household.date_of_visit")}
            >
              <Input
                type="date"
                max={todayStr}
                className={invalidCls("household.date_of_visit")}
                data-field="household.date_of_visit"
                aria-invalid={bad("household.date_of_visit") || undefined}
                value={household.date_of_visit}
                onChange={(e) =>
                  handleHouseholdChange("date_of_visit", e.target.value)
                }
                required
              />
            </FormGroup>
            <FormGroup
              label="Purok / health zone"
              required
              error={errFor("household.zone_id")}
            >
              <select
                className={`form-select ${invalidCls("household.zone_id")}`}
                data-field="household.zone_id"
                aria-invalid={bad("household.zone_id") || undefined}
                value={household.zone_id}
                onChange={(e) =>
                  handleHouseholdChange("zone_id", e.target.value)
                }
                required
              >
                {ZONES.map((z) => {
                  const isAssigned =
                    assignedZoneIds.length === 0 ||
                    assignedZoneIds.includes(z.id);
                  return (
                    <option key={z.id} value={z.id} disabled={!isAssigned}>
                      {z.name} {!isAssigned ? "(Unassigned)" : ""}
                    </option>
                  );
                })}
              </select>
            </FormGroup>
            <FormGroup label="Address line / landmark" className="span-2">
              <Input
                type="text"
                maxLength={200}
                placeholder="Street name, landmark, house number"
                value={household.address_line}
                onChange={(e) =>
                  handleHouseholdChange("address_line", e.target.value)
                }
              />
            </FormGroup>
            <FormGroup label="Water source type">
              <select
                className="form-select"
                value={household.water_source_code}
                onChange={(e) =>
                  handleHouseholdChange("water_source_code", e.target.value)
                }
              >
                <option value="">-- None / Unspecified --</option>
                {WATER_SOURCES.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.label}
                  </option>
                ))}
              </select>
            </FormGroup>
            <FormGroup label="Toilet facility type">
              <select
                className="form-select"
                value={household.toilet_facility_code}
                onChange={(e) =>
                  handleHouseholdChange("toilet_facility_code", e.target.value)
                }
              >
                <option value="">-- None / Unspecified --</option>
                {TOILET_FACILITIES.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FormGroup>
            <FormGroup label="4Ps Pantawid beneficiary?">
              <FormCheck
                label="Yes, registered 4Ps household"
                checked={household.is_4ps_household}
                onChange={(e) =>
                  handleHouseholdChange("is_4ps_household", e.target.checked)
                }
              />
            </FormGroup>
            {household.is_4ps_household && (
              <FormGroup
                label="4Ps household id"
                required
                className="span-3"
                error={errFor("household.fourps_household_id")}
              >
                <Input
                  type="text"
                  maxLength={100}
                  placeholder="Official 4Ps ID Number"
                  className={invalidCls("household.fourps_household_id")}
                  data-field="household.fourps_household_id"
                  aria-invalid={
                    bad("household.fourps_household_id") || undefined
                  }
                  value={household.fourps_household_id}
                  onChange={(e) =>
                    handleHouseholdChange("fourps_household_id", e.target.value)
                  }
                  required
                />
              </FormGroup>
            )}
            <FormGroup label="Reviewed by (supervisor / midwife)">
              <Input
                type="text"
                maxLength={150}
                placeholder="e.g. Maria Santos, RM"
                value={household.reviewed_by_name}
                onChange={(e) =>
                  handleHouseholdChange("reviewed_by_name", e.target.value)
                }
              />
            </FormGroup>
          </FormGrid>
        </SectionCard>

        <SectionCard
          title="Family members roster"
          icon={<Users className="h-4 w-4" />}
          desc={rosterDesc}
        >
          <div style={{ marginBottom: "0.75rem" }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={addMember}
              iconLeft={<Plus className="h-3.5 w-3.5" />}
            >
              Add Family Member
            </Button>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {members.map((member, index) => {
              const fk = (name) => `members.${index}.${name}`;
              const age = computeAge(member.birth_date, ageRef);
              const dupIdx = dupWith(index);
              const isCollapsed = Boolean(collapsed[index]);
              const displayName =
                member.first_name || member.last_name
                  ? `${member.last_name || ""}, ${member.first_name || ""}`.replace(
                      /^,\s*/,
                      "",
                    )
                  : "New Resident Member";

              return (
                <Card
                  key={index}
                  className={`member-card ${isCollapsed ? "collapsed" : ""}`}
                  padding={false}
                  style={{ marginBottom: 0 }}
                  id={`member-card-${index}`}
                >
                  <div className="member-head">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.55rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "var(--radius-full)",
                          background: "var(--raised)",
                          color: "var(--slate-600)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 600,
                          fontSize: "var(--fs-xs)",
                          flexShrink: 0,
                        }}
                      >
                        {(member.first_name || String(index + 1))
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <span className="badge badge-slate">
                        Member #{index + 1}
                      </span>
                      <strong style={{ color: "var(--text-heading)" }}>
                        {displayName}
                      </strong>
                      {member.relation_to_head === "HEAD" ? (
                        <span className="badge badge-teal">Head of household</span>
                      ) : (
                        <span className="badge badge-slate">
                          {relationLabel(member.relation_to_head)}
                        </span>
                      )}
                      {member.sex === "F" && member.is_pregnant && (
                        <span className="badge badge-rose">Pregnant</span>
                      )}
                      {member.is_pwd && (
                        <span className="badge badge-slate">PWD</span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      {member.relation_to_head !== "HEAD" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setAsHead(index)}
                          title="Swap this member with the current head"
                          iconLeft={<UserCheck className="h-3.5 w-3.5" />}
                        >
                          Make Head
                        </Button>
                      )}
                      {members.length > 1 && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setRemoveIdx(index)}
                          iconLeft={<Trash2 className="h-3.5 w-3.5" />}
                        >
                          Remove
                        </Button>
                      )}
                      <IconButton
                        icon={
                          <ChevronDown
                            className="h-4 w-4"
                            style={{
                              transform: isCollapsed
                                ? "rotate(-90deg)"
                                : "none",
                              transition: "transform 0.2s ease",
                            }}
                          />
                        }
                        onClick={() => toggleMember(index)}
                        title={
                          isCollapsed
                            ? "Expand member details"
                            : "Collapse member details"
                        }
                      />
                    </div>
                  </div>

                  {dupIdx !== null && (
                    <div className="field-warn">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Same name and birth date as Member #{dupIdx + 1} —
                      possible duplicate entry.
                    </div>
                  )}

                  {!isCollapsed && (
                    <>
                      <FormGrid cols={3}>
                        <FormGroup
                          label="Last name"
                          required
                          error={errFor(fk("last_name"))}
                        >
                          <Input
                            type="text"
                            maxLength={100}
                            placeholder="e.g. Dela Cruz"
                            className={invalidCls(fk("last_name"))}
                            data-field={fk("last_name")}
                            aria-invalid={bad(fk("last_name")) || undefined}
                            value={member.last_name}
                            onChange={(e) =>
                              handleMemberChange(
                                index,
                                "last_name",
                                e.target.value,
                              )
                            }
                            required
                          />
                        </FormGroup>
                        <FormGroup
                          label="First name"
                          required
                          error={errFor(fk("first_name"))}
                        >
                          <Input
                            type="text"
                            maxLength={100}
                            placeholder="e.g. Juan"
                            className={invalidCls(fk("first_name"))}
                            data-field={fk("first_name")}
                            aria-invalid={bad(fk("first_name")) || undefined}
                            value={member.first_name}
                            onChange={(e) =>
                              handleMemberChange(
                                index,
                                "first_name",
                                e.target.value,
                              )
                            }
                            required
                          />
                        </FormGroup>
                        <FormGroup label="Middle name">
                          <Input
                            type="text"
                            maxLength={100}
                            placeholder="e.g. Santos"
                            value={member.middle_name}
                            onChange={(e) =>
                              handleMemberChange(
                                index,
                                "middle_name",
                                e.target.value,
                              )
                            }
                          />
                        </FormGroup>
                        <FormGroup
                          label="Relation to head"
                          required
                          error={errFor(fk("relation_to_head"))}
                        >
                          <select
                            className={`form-select ${invalidCls(fk("relation_to_head"))}`}
                            data-field={fk("relation_to_head")}
                            aria-invalid={
                              bad(fk("relation_to_head")) || undefined
                            }
                            value={member.relation_to_head}
                            onChange={(e) =>
                              handleMemberChange(
                                index,
                                "relation_to_head",
                                e.target.value,
                              )
                            }
                            required
                          >
                            {RELATIONS_TO_HEAD.map((r) => (
                              <option key={r.code} value={r.code}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </FormGroup>
                        {member.relation_to_head === "OTHER" && (
                          <FormGroup
                            label="Specify relation"
                            required
                            className="span-3"
                            error={errFor(fk("relation_other"))}
                          >
                            <Input
                              type="text"
                              maxLength={100}
                              placeholder="e.g. Boarder, Grandparent"
                              className={invalidCls(fk("relation_other"))}
                              data-field={fk("relation_other")}
                              aria-invalid={
                                bad(fk("relation_other")) || undefined
                              }
                              value={member.relation_other}
                              onChange={(e) =>
                                handleMemberChange(
                                  index,
                                  "relation_other",
                                  e.target.value,
                                )
                              }
                              required
                            />
                          </FormGroup>
                        )}
                        <FormGroup
                          label="Date of birth"
                          required
                          error={errFor(fk("birth_date"))}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              alignItems: "center",
                            }}
                          >
                            <Input
                              type="date"
                              min={MIN_DOB}
                              max={todayStr}
                              className={invalidCls(fk("birth_date"))}
                              data-field={fk("birth_date")}
                              aria-invalid={bad(fk("birth_date")) || undefined}
                              value={member.birth_date}
                              onChange={(e) =>
                                handleMemberChange(
                                  index,
                                  "birth_date",
                                  e.target.value,
                                )
                              }
                              required
                            />
                            {age !== null && (
                              <span className="age-chip">
                                {age} {age === 1 ? "yr" : "yrs"} old
                              </span>
                            )}
                          </div>
                        </FormGroup>
                        <FormGroup label="Sex" required>
                          <div
                            className="seg-control"
                            data-field={fk("sex")}
                            role="group"
                            aria-label="Sex"
                          >
                            <button
                              type="button"
                              className={`seg-btn ${member.sex === "F" ? "on-f" : ""}`}
                              aria-pressed={member.sex === "F"}
                              onClick={() => handleSexChange(index, "F")}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                              }}
                            >
                              <Venus size={16} strokeWidth={2.5} />
                              Female
                            </button>

                            <button
                              type="button"
                              className={`seg-btn ${member.sex === "M" ? "on-m" : ""}`}
                              aria-pressed={member.sex === "M"}
                              onClick={() => handleSexChange(index, "M")}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                              }}
                            >
                              <Mars size={16} strokeWidth={2.5} />
                              Male
                            </button>
                          </div>
                        </FormGroup>
                        <FormGroup label="Civil status" required>
                          <select
                            className="form-select"
                            value={member.civil_status_code}
                            onChange={(e) =>
                              handleMemberChange(
                                index,
                                "civil_status_code",
                                e.target.value,
                              )
                            }
                            required
                          >
                            {CIVIL_STATUSES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </FormGroup>
                        <FormGroup label="Education" required>
                          <select
                            className="form-select"
                            value={member.education_code}
                            onChange={(e) =>
                              handleMemberChange(
                                index,
                                "education_code",
                                e.target.value,
                              )
                            }
                            required
                          >
                            {EDUCATION_LEVELS.map((ed) => (
                              <option key={ed.code} value={ed.code}>
                                {ed.label}
                              </option>
                            ))}
                          </select>
                        </FormGroup>
                        <FormGroup label="Religion">
                          <select
                            className="form-select"
                            value={member.religion_code}
                            onChange={(e) =>
                              handleMemberChange(
                                index,
                                "religion_code",
                                e.target.value,
                              )
                            }
                          >
                            {RELIGIONS.map((rel) => (
                              <option key={rel.code} value={rel.code}>
                                {rel.label}
                              </option>
                            ))}
                          </select>
                        </FormGroup>
                        {member.religion_code === "OTH" && (
                          <FormGroup
                            label="Specify religion"
                            required
                            className="span-3"
                            error={errFor(fk("religion_other"))}
                          >
                            <Input
                              type="text"
                              maxLength={100}
                              className={invalidCls(fk("religion_other"))}
                              data-field={fk("religion_other")}
                              aria-invalid={
                                bad(fk("religion_other")) || undefined
                              }
                              value={member.religion_other}
                              onChange={(e) =>
                                handleMemberChange(
                                  index,
                                  "religion_other",
                                  e.target.value,
                                )
                              }
                              required
                            />
                          </FormGroup>
                        )}
                        <FormGroup label="Occupation">
                          <Input
                            type="text"
                            maxLength={100}
                            placeholder="e.g. Farmer, Vendor, Student"
                            value={member.occupation}
                            onChange={(e) =>
                              handleMemberChange(
                                index,
                                "occupation",
                                e.target.value,
                              )
                            }
                          />
                        </FormGroup>
                        <FormGroup
                          label="PhilHealth ID (12 digits)"
                          error={errFor(fk("philhealth_id"))}
                        >
                          <Input
                            type="text"
                            maxLength={12}
                            inputMode="numeric"
                            placeholder="123456789012"
                            className={invalidCls(fk("philhealth_id"))}
                            data-field={fk("philhealth_id")}
                            aria-invalid={bad(fk("philhealth_id")) || undefined}
                            value={member.philhealth_id}
                            onChange={(e) =>
                              handleMemberChange(
                                index,
                                "philhealth_id",
                                e.target.value,
                              )
                            }
                          />
                        </FormGroup>
                        {member.philhealth_id && (
                          <>
                            <FormGroup label="PhilHealth membership">
                              <select
                                className="form-select"
                                value={member.philhealth_membership}
                                onChange={(e) =>
                                  handleMemberChange(
                                    index,
                                    "philhealth_membership",
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="">-- Select --</option>
                                <option value="MEMBER">Member</option>
                                <option value="DEPENDENT">Dependent</option>
                              </select>
                            </FormGroup>
                            {member.philhealth_membership === "MEMBER" && (
                              <FormGroup label="PhilHealth category">
                                <select
                                  className="form-select"
                                  value={member.philhealth_category}
                                  onChange={(e) =>
                                    handleMemberChange(
                                      index,
                                      "philhealth_category",
                                      e.target.value,
                                    )
                                  }
                                >
                                  <option value="">-- Select --</option>
                                  <option value="DIRECT">
                                    Direct Contributor
                                  </option>
                                  <option value="INDIRECT">
                                    Indirect Contributor
                                  </option>
                                </select>
                              </FormGroup>
                            )}
                          </>
                        )}
                      </FormGrid>

                      {member.sex === "F" && (
                        <SectionCard
                          title="Maternal & family planning"
                          icon={<Heart className="h-4 w-4" />}
                          style={{ marginTop: "0.75rem" }}
                        >
                          <FormGrid cols={3}>
                            <div style={{ gridColumn: "span 3" }}>
                              <FormCheck
                                label="Currently pregnant"
                                checked={member.is_pregnant}
                                onChange={(e) =>
                                  handleMemberChange(
                                    index,
                                    "is_pregnant",
                                    e.target.checked,
                                  )
                                }
                              />
                            </div>
                            {member.is_pregnant && (
                              <FormGroup
                                label="LMP date"
                                required
                                style={{ gridColumn: "span 3" }}
                                error={errFor(fk("lmp_date"))}
                              >
                                <Input
                                  type="date"
                                  max={todayStr}
                                  className={invalidCls(fk("lmp_date"))}
                                  data-field={fk("lmp_date")}
                                  aria-invalid={
                                    bad(fk("lmp_date")) || undefined
                                  }
                                  value={member.lmp_date}
                                  onChange={(e) =>
                                    handleMemberChange(
                                      index,
                                      "lmp_date",
                                      e.target.value,
                                    )
                                  }
                                  required
                                />
                              </FormGroup>
                            )}
                            <div style={{ gridColumn: "span 3" }}>
                              <FormCheck
                                label="Uses family planning"
                                checked={member.uses_fp}
                                onChange={(e) =>
                                  handleMemberChange(
                                    index,
                                    "uses_fp",
                                    e.target.checked,
                                  )
                                }
                              />
                            </div>
                            {member.uses_fp && (
                              <>
                                <FormGroup
                                  label="FP method"
                                  required
                                  style={{ gridColumn: "span 3" }}
                                  error={errFor(fk("fp_method_code"))}
                                >
                                  <select
                                    className={`form-select ${invalidCls(fk("fp_method_code"))}`}
                                    data-field={fk("fp_method_code")}
                                    aria-invalid={
                                      bad(fk("fp_method_code")) || undefined
                                    }
                                    value={member.fp_method_code}
                                    onChange={(e) =>
                                      handleMemberChange(
                                        index,
                                        "fp_method_code",
                                        e.target.value,
                                      )
                                    }
                                    required
                                  >
                                    <option value="">
                                      -- Select Method --
                                    </option>
                                    {FP_METHODS.map((fp) => (
                                      <option key={fp.code} value={fp.code}>
                                        {fp.label}
                                      </option>
                                    ))}
                                  </select>
                                </FormGroup>
                                {member.fp_method_code === "OTH" && (
                                  <FormGroup
                                    label="Specify FP method"
                                    required
                                    style={{ gridColumn: "span 3" }}
                                    error={errFor(fk("fp_method_other"))}
                                  >
                                    <Input
                                      type="text"
                                      maxLength={100}
                                      className={invalidCls(
                                        fk("fp_method_other"),
                                      )}
                                      data-field={fk("fp_method_other")}
                                      aria-invalid={
                                        bad(fk("fp_method_other")) || undefined
                                      }
                                      value={member.fp_method_other}
                                      onChange={(e) =>
                                        handleMemberChange(
                                          index,
                                          "fp_method_other",
                                          e.target.value,
                                        )
                                      }
                                      required
                                    />
                                  </FormGroup>
                                )}
                                <FormGroup label="FP status">
                                  <select
                                    className="form-select"
                                    value={member.fp_status_code}
                                    onChange={(e) =>
                                      handleMemberChange(
                                        index,
                                        "fp_status_code",
                                        e.target.value,
                                      )
                                    }
                                  >
                                    <option value="">
                                      -- Select Status --
                                    </option>
                                    {FP_STATUSES.map((st) => (
                                      <option key={st.code} value={st.code}>
                                        {st.label}
                                      </option>
                                    ))}
                                  </select>
                                </FormGroup>
                              </>
                            )}
                          </FormGrid>
                        </SectionCard>
                      )}

                      <SectionCard
                        title="Disability / PWD"
                        icon={<Accessibility className="h-4 w-4" />}
                        style={{ marginTop: "0.75rem" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <FormCheck
                            label="Person with disability (PWD)"
                            checked={member.is_pwd}
                            onChange={(e) =>
                              handleMemberChange(
                                index,
                                "is_pwd",
                                e.target.checked,
                              )
                            }
                          />
                          {member.is_pwd && (
                            <div style={{ flex: 1, minWidth: "260px" }}>
                              <FormGroup
                                label="Disability type"
                                required
                                error={errFor(fk("disability_type_code"))}
                              >
                                <select
                                  className={`form-select ${invalidCls(fk("disability_type_code"))}`}
                                  data-field={fk("disability_type_code")}
                                  aria-invalid={
                                    bad(fk("disability_type_code")) || undefined
                                  }
                                  value={member.disability_type_code}
                                  onChange={(e) =>
                                    handleMemberChange(
                                      index,
                                      "disability_type_code",
                                      e.target.value,
                                    )
                                  }
                                  required
                                >
                                  <option value="">-- Select --</option>
                                  {DISABILITY_TYPES.map((d) => (
                                    <option key={d.code} value={d.code}>
                                      {d.label}
                                    </option>
                                  ))}
                                </select>
                              </FormGroup>
                            </div>
                          )}
                        </div>
                      </SectionCard>

                      <div style={{ marginTop: "0.75rem" }}>
                        <label
                          className="form-label"
                          style={{ marginBottom: "0.6rem" }}
                        >
                          Diagnosed medical conditions
                        </label>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.6rem",
                            flexWrap: "wrap",
                          }}
                        >
                          {MEDICAL_CONDITIONS.map((cond) => {
                            const checked = (
                              member.medical_conditions || []
                            ).includes(cond.code);
                            return (
                              <div
                                key={cond.code}
                                className={`condition-chip ${checked ? "active" : ""}`}
                                onClick={() =>
                                  handleConditionToggle(index, cond.code)
                                }
                              >
                                <span className="chip-mark">
                                  {checked ? (
                                    <Check className="h-3.5 w-3.5" />
                                  ) : (
                                    <Plus className="h-3.5 w-3.5" />
                                  )}
                                </span>
                                <span>{cond.label}</span>
                              </div>
                            );
                          })}
                        </div>
                        {(member.medical_conditions || []).includes("OTH") && (
                          <div
                            style={{ marginTop: "0.65rem", maxWidth: "360px" }}
                          >
                            <FormGroup
                              error={errFor(fk("other_condition_specify"))}
                            >
                              <Input
                                type="text"
                                maxLength={100}
                                placeholder="Specify other condition"
                                className={invalidCls(
                                  fk("other_condition_specify"),
                                )}
                                data-field={fk("other_condition_specify")}
                                aria-invalid={
                                  bad(fk("other_condition_specify")) ||
                                  undefined
                                }
                                value={member.other_condition_specify}
                                onChange={(e) =>
                                  handleMemberChange(
                                    index,
                                    "other_condition_specify",
                                    e.target.value,
                                  )
                                }
                                required
                              />
                            </FormGroup>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </Card>
              );
            })}
          </div>

          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.6rem" }}>
            <Button
              variant="secondary"
              onClick={addMember}
              iconLeft={<Plus className="h-4 w-4" />}
            >
              Add Another Family Member
            </Button>
          </div>
        </SectionCard>

        <div className="form-actions">
          <Button variant="secondary" onClick={() => navigate("/residents")}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={submitting}
            disabled={submitting}
          >
            {submitting ? "Saving Profile…" : "Save & Submit Household"}
          </Button>
        </div>
      </form>

      <Modal
        isOpen={removeIdx !== null}
        onClose={() => setRemoveIdx(null)}
        title="Remove family member?"
        subtitle={removeIdx !== null ? `Member #${removeIdx + 1}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveIdx(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmRemove}>
              Remove Member
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-start",
              padding: "1rem",
              background: "var(--danger-bg)",
              border: "1px solid var(--danger-border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <AlertTriangle
              className="h-[18px] w-[18px] shrink-0"
              style={{ color: "var(--danger)", flexShrink: 0 }}
            />
            <div
              style={{
                fontSize: "var(--fs-sm)",
                color: "var(--danger-dark)",
                lineHeight: 1.55,
              }}
            >
              All information entered for{" "}
              <strong>
                {removeIdx !== null ? memberDisplay(removeIdx) : ""}
              </strong>{" "}
              will be discarded. This cannot be undone.
            </div>
          </div>
          <p
            style={{
              fontSize: "var(--fs-xs)",
              color: "var(--text-muted)",
              lineHeight: 1.5,
            }}
          >
            Tip: use <strong>Make head</strong> instead if you are only
            reassigning the head of household.
          </p>
        </div>
      </Modal>
    </div>
  );
}
