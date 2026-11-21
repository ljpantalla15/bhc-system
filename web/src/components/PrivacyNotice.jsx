import React, { useState, useEffect } from 'react';
import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';

const ackKey = (userId) => `bhc.privacy.ack.${userId}`;

/** The notice text, shared by the dialog. Based on the Data Privacy Act of 2012 (RA 10173). */
export function PrivacyNoticeBody() {
  return (
    <div className="privacy-notice">
      <p className="privacy-lead">
        Barangay Tago Health Center collects and processes resident information to keep household
        profiles and program masterlists. This notice explains what we keep, why, and who can see it,
        as required by the Data Privacy Act of 2012 (RA 10173).
      </p>

      <h3>What we collect</h3>
      <p>
        Household and resident details: name, birthdate, sex, address and purok, civil status,
        contact details, and program-related health information (for example immunization, maternal
        and senior-citizen program flags). Health information is <strong>sensitive personal information</strong>.
      </p>

      <h3>Why we collect it</h3>
      <ul>
        <li>To identify residents and households served by the health center.</li>
        <li>To prepare masterlists for health programs and plan visits.</li>
        <li>To keep an accountable record of who changed what, and when.</li>
      </ul>

      <h3>Who can see it</h3>
      <ul>
        <li><strong>Barangay health workers</strong> see and update residents in their assigned puroks only.</li>
        <li><strong>Midwives</strong> can view residents in all puroks, read only.</li>
        <li><strong>Administrators</strong> manage staff accounts and cannot open resident health data.</li>
      </ul>
      <p>Information is not shared with outside parties.</p>

      <h3>How we protect it</h3>
      <ul>
        <li>Access is by personal account, and the server checks your role on every request.</li>
        <li>The connection is encrypted (HTTPS) and passwords are stored hashed.</li>
        <li>Every change is logged under the name of the staff member who made it.</li>
        <li>Records are never deleted. They are deactivated, so the history stays intact.</li>
      </ul>

      <h3>Your duties as staff</h3>
      <ul>
        <li>Use resident information only for health center work.</li>
        <li>Do not share your password, and sign out on shared devices.</li>
        <li>Do not copy, photograph, or send resident data outside the system.</li>
        <li>Report any suspected leak or unauthorized access to the health center head right away.</li>
      </ul>

      <h3>Resident rights</h3>
      <p>
        Residents may ask to be informed about, see, correct, or object to the processing of their data,
        and may file a complaint with the National Privacy Commission. Requests go to the health center,
        which will act on them through the staff who maintain the record.
      </p>

      <p className="privacy-note">
        This is an academic project (MIS 215). The health center is fictional and all data is synthetic.
      </p>
    </div>
  );
}

/** A dialog that shows the notice. Pass `onAccept` to turn it into an acknowledgment. */
export function PrivacyNoticeDialog({ isOpen, onClose, onAccept }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isLarge
      title="Data privacy notice"
      subtitle="Please read before handling resident records"
      footer={onAccept
        ? <Button variant="primary" onClick={onAccept}>I have read and understood</Button>
        : <Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <PrivacyNoticeBody />
    </Modal>
  );
}

/** Shows the notice once per staff account after sign-in, until acknowledged. */
export function PrivacyAcknowledgment({ userId }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(ackKey(userId)) === '1'; } catch { /* storage blocked: show it */ }
    setOpen(!seen);
  }, [userId]);

  const accept = () => {
    try { localStorage.setItem(ackKey(userId), '1'); } catch { /* ignore */ }
    setOpen(false);
  };

  // Escape or the X closes it for now; it will show again next sign-in until accepted.
  return <PrivacyNoticeDialog isOpen={open} onClose={() => setOpen(false)} onAccept={accept} />;
}
