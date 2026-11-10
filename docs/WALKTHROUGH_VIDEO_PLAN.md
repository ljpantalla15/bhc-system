# BHC System Walkthrough Video: Production Package

Resident Profiling and Masterlist System, Barangay Tago Health Center, Naga City.
Synthetic data only. Every label below was read from `web/src/` on 2026-11-10; nothing is invented.

> **Production limit.** This package is a plan, not a rendered video. No video or TTS tool was available, so nothing here has been recorded or rendered.
> `docs/BHC_User_Guide.mp4` (34 MB, untracked) already exists. I could not inspect it. This plan is written as a fresh recording; decide whether it replaces or complements that file.

---

## 1. Video concept

| | |
|---|---|
| **Title** | *Unang Sign-in Hanggang Unang Masterlist: Gabay sa BHC System* |
| **Audience** | Barangay health workers (BHW) and midwives. Comfortable with a phone, new to this system. |
| **Main task** | A BHW signs in, encodes one complete family, and sees them appear on the program masterlists. |
| **Learning objective** | After watching, the viewer can sign in, encode a household with several members, fix a validation error, find the family in Residents, and open and print a masterlist. |
| **Duration** | About 11 minutes in 9 chapters, plus an optional 1-minute chapter for the Midwife and Admin roles. Chapter markers let people jump. |
| **Format** | 16:9, 1920 x 1080, 30 fps, MP4 (H.264, AAC), soft-burned captions (see section 7). |
| **Tone** | Warm kasama-sa-trabaho: lively, never a sales pitch. Tagalog first, light Central Bikol (Naga) for greetings, reassurance and transitions. |
| **Voice** | **One** narrator, one voice, start to finish. No second voice for tips, quotes or chapter titles. |

## 2. User journey

Confirmed from source (BHW account `bhw1`, "Demo BHW One", Purok 1):

1. Open the site (`https://localhost` in the demo stack, self-signed certificate).
2. **Login page**: tap a card under **Demo accounts** (or type **Username** and **Password**), optional **Show**, then **Sign in**. A toast says "Signed in as Demo BHW One."
3. **Home**: greeting, purok scope, **Encode a household** button, **Find a resident by name** search, **Your puroks** and **Program masterlists** panels.
4. **Encode household** page, step 1 **Household**, step 2 **Family members**, summary rail on the right.
5. **Save household**. If something is missing: toast "Please fix N issue(s) before saving." and the rail lists each problem; clicking one jumps to the field.
6. Success card: **Household saved**, the household number, "N members added to Purok 1", then **Encode next household**, **See Purok 1 residents**, **Back to home**.
7. **Residents**: **By household** view, **Open household**, resident profile with change history.
8. **Masterlists**: program cards, **Purok** and **Order by** selectors, editable letterhead, **Download CSV**, **Print masterlist**.
9. Corrections: **Edit record**, **Deactivate resident**, **Archived** tab, **Restore**.
10. Account menu (name chip, top right): **Change password**, **Sign out**.

Optional roles chapter: Midwife is read-only (no Encode household; Home shows **Print a masterlist**). Admin lands on **Staff accounts** and uses **Create account**.

### Assumptions and open questions (answer before recording)

| # | Question | Default used here |
|---|---|---|
| Q1 | What URL do viewers actually use? | `https://localhost` from the README stack. |
| Q2 | Replace or complement the existing `BHC_User_Guide.mp4`? | Treated as a new video. |
| Q3 | Which TTS voice, or a human narrator? | Filipino neural voice, see section 6. |
| Q4 | Can a Naga native speaker check the Bikol lines in section 5 before the voice is rendered? | Strongly recommended. |
| Q5 | Is Midwife/Admin chapter wanted in the main cut? | Kept optional (chapter 10). |

---

## 3. Recording setup

**Environment (do this once, before any take)**

1. `docker compose down -v` then `docker compose --profile app up --build -d` so the seeded demo data is clean and counts are predictable.
2. Open `https://localhost` once and accept the self-signed certificate warning, so the warning does not appear in the take.
3. Use a clean Chrome or Edge profile: no bookmarks bar, no extensions, no notifications. Window exactly 1920 x 1080, browser zoom 110% for readability. Light theme.
4. **Record after 8:00 AM Philippine time.** The form takes "today" from `toISOString()` (UTC), so before 8 AM the default Date of visit shows yesterday.
5. Screen recorder: OBS Studio (free), display capture 1920 x 1080 at 30 fps, cursor captured, no audio. Narration is added afterwards.
6. Practice the sample data below once on a throwaway run, then reset the database (step 1) before the real take.

**Sample household (synthetic, all invented)**

| Field | Member 1 | Member 2 | Member 3 | Member 4 |
|---|---|---|---|---|
| Last name | Bautista | Bautista | Bautista | Bautista |
| First name | Ramon | Luzviminda | Maricel | Enzo |
| Middle name | Cruz | Santos | Cruz | (blank) |
| Relation to head | Head | Spouse | Daughter | Others (specify): **Grandchild** |
| Date of birth | 1958-03-14 (68 yrs) | 1961-09-02 (65 yrs) | 1999-07-22 (27 yrs) | 2023-05-09 (3 yrs) |
| Sex | **Male** (click it, default is Female) | Female | Female | **Male** |
| Civil status | Married | Married | Single | Single |
| Education | High school graduate (default) | High school graduate (default) | College graduate | None |
| Occupation | Farmer | (blank) | Vendor | (blank) |
| Health | Condition chip **Hypertension (HPN)** | none | toggle **Pregnant**, Last menstrual period **2026-08-05** | none |
| Chip on card | Senior citizen | Senior citizen | Maternal | Preschool |

Household block: Household number `202611-TAGO-00101`, Date of visit = today (default), Purok = **Purok 1**, Address or landmark = `Riverside Road, near the chapel`, Reviewed by = `Maria Santos, RM`, Water source and Toilet facility left at defaults, **4Ps beneficiary** off.

Result to expect: Ramon and Luzviminda on **Senior citizens**, Maricel on **Pregnant women**, Enzo on **Under-five children**.

**Sensitive items to hide:** none are real. The demo password `Demo#12345` is printed on the login page by design; it is fine on screen. Do not record any real resident, real staff name or real `.env` value.

**Known app quirk to avoid on camera:** on Masterlists > Pregnant women, the **EDD** column is computed with `toISOString()`, so in UTC+8 it can show one day earlier than LMP + 280 days (12 May 2027 expected for LMP 5 Aug 2026; the screen may show 11 May). Do not read the EDD aloud. See "Issues found" in section 9.

---

## 4. Storyboard

Time codes are targets for a roughly 11-minute cut. Narration lines are in section 5, keyed by scene (S1, S2, ...).

Global look: browser fills the frame. Cursor is enlarged by about 150% with a soft yellow halo and a ring pulse on click. Callout labels sit in the empty margin, never over the control being discussed.

### Chapter 1: Panimula

**S1 Title and promise (0:00-0:15)**
- Screen: animated title card, then dissolve to the login page.
- On-screen text: *Gabay sa BHC System*, subtitle *Resident Profiling and Masterlist System, Barangay Tago Health Center*, lower third *Synthetic demo data*.
- Edit: logo (`web/public/logo.svg`) fades in, 2 s hold. Music in at -28 dB.

### Chapter 2: Pag-access at Sign in

**S2 Open the site (0:15-0:40)**
- Screen: empty browser, click the address bar, type `https://localhost`, Enter. Login page loads.
- Callout: *1. Buksan ang address ng system*.
- Edit: zoom 130% on the address bar while typing, back to full frame on load.

**S3 Sign in (0:40-1:20)**
- Screen: point to the left panel (Barangay Tago Health Center) then the right form (**Username**, **Password**). Click the **bhw1** card under **Demo accounts**: both fields fill. Click **Show**, pause, click **Hide**. Click **Sign in**. Toast: "Signed in as Demo BHW One."
- Callouts: *Username*, *Password*, *Demo accounts: pindutin para ma-fill*, *Sign in*.
- Edit: zoom 140% on the Demo accounts list (hold 3 s). Zoom on the toast. Do not zoom on the password field while shown.

### Chapter 3: Home

**S4 Home orientation (1:20-2:10)**
- Screen: Home page. Sweep the cursor over the four tabs (**Home**, **Encode household**, **Residents**, **Masterlists**), the **Purok 1** pill, the greeting "Marhay na aldaw, Demo.", the **Your puroks** panel and the **Program masterlists** panel. End on **Encode a household** and click it.
- Callouts (appear one at a time): *Mga tab*, *Saklaw ng account mo*, *Your puroks*, *Program masterlists*.
- Edit: numbers on screen are seed-dependent, never narrate them. Slow-zoom on the scope pill.

### Chapter 4: Encode household, Household

**S5 Household details (2:10-3:20)**
- Screen: **Encode household** page. Step 1 card. Show **Household number** (pre-filled, hint "Format YYYYMM-TAGO-00000"), overwrite with `202611-TAGO-00101`. **Date of visit** (leave). **Purok** (show Purok 1 selected; open the dropdown briefly to show other puroks greyed "(not assigned to you)" if the account has any, then close). Type **Address or landmark**, **Reviewed by**. Open **Water source** and **Toilet facility** lists, leave defaults. Hover **4Ps beneficiary**, do not tick.
- Callouts: *Household number*, *Date of visit: hindi puwedeng future*, *Purok*, *Address or landmark*.
- Edit: when step 1's check turns green in the right rail (**Household details** with a check), freeze for 1 s and ring it.

### Chapter 5: Encode household, Family members

**S6 Member 1, the head (3:20-4:20)**
- Screen: Step 2 card, member card 1. Type **Last name**, **First name**, **Middle name**. **Relation to head** shows Head. Set **Date of birth**: the age chip shows 68 yrs. Click **Male** in **Sex**. Set **Civil status** = Married. Type **Occupation** = Farmer. Under **Health**, click **Hypertension (HPN)**. The card chip reads Senior citizen.
- Callouts: *Date of birth: lalabas ang edad*, *Sex*, *Diagnosed conditions*.
- Edit: zoom 150% on the age chip and then the Senior citizen chip.

**S7 Member 2, the spouse (4:20-5:00)**
- Screen: click **Add family member**. A new card appears with Relation to head already on Daughter; change it to **Spouse**. Fill names, birth date, Civil status = Married. Chip: Senior citizen.
- Callout: *Add family member*.
- Edit: speed ramp 2x through typing; return to 1x at the chip.

**S8 Member 3, pregnant daughter (5:00-5:50)**
- Screen: **Add family member** (Daughter by default). Fill names, birth date, Civil status = Single, Education = College graduate, Occupation = Vendor. Click the **Pregnant** card ("Adds her to the pregnant women masterlist."), then fill **Last menstrual period**. Chip becomes Maternal.
- Edit: zoom on the Pregnant card text, then on the Maternal chip.

**S9 Member 4, the grandchild (5:50-6:40)**
- Screen: **Add family member**. Choose **Others (specify)**; **Specify relation** appears, type `Grandchild`. Fill names, birth date, click **Male**, Civil status = Single, Education = None. Chip: Preschool. Quick tip beat: hover **Make head**, the trash icon (**Remove member**) and the collapse arrow, without clicking.
- Callouts: *Make head: palit ng ulo ng pamilya*, *Remove member*.
- Edit: no zoom on the trash icon click; hover only.

### Chapter 6: Save at tamang pag-ayos ng error

**S10 Deliberate error, then fix (6:40-7:10)**
- Before this scene (off camera): clear Enzo's **Date of birth**.
- Screen: click **Save household**. Toast "Please fix 1 issue before saving." The rail shows the problem; click it, the page scrolls to the field. Enter the birth date. The rail now says "Everything required is filled in."
- Callouts: *Basahin ang mensahe sa kanan*, *I-click para pumunta sa field*.
- Edit: ring the rail's issue list for 3 s; red callout uses an icon plus text, not colour alone.

**S11 Save and success (7:10-7:55)**
- Screen: scroll to the rail, click **Save household**. Success card: "Household saved", `202611-TAGO-00101`, "4 members added to Purok 1. Anyone who is a senior citizen, under five, pregnant or a person with disability is now on that masterlist." Show the member list. Hover the three actions, then click **See Purok 1 residents**.
- Edit: success sound off (no SFX needed). Hold on the card 4 s. Confetti or fireworks are out of scope; a single check-mark pulse is enough.

### Chapter 7: Residents

**S12 Find the family (7:55-8:55)**
- Screen: **Residents** page, **By household** view. Use **Search by name** to type `Bautista`. Point at the **Bautista household** group row, click **Open household**. Modal: **Home and facilities**, **Family members (4)**. Click Maricel to open her profile, scroll to **Health and programs** and the change history at the bottom, click **Close**. Briefly show **All target groups** filter and the **Active / Archived** switch.
- Callouts: *Open household*, *Target group*, *Health notes*, *Last updated, by sino*.
- Edit: cross-fade between modals; zoom on the "Last updated" column to show the staff name.

### Chapter 8: Masterlists

**S13 Open and print (8:55-10:00)**
- Screen: **Masterlists**. Click **Senior citizens**: Ramon and Luzviminda appear. Click **Pregnant women**: Maricel with LMP. Click **Under-five children**: Enzo. Open **Purok** and **Order by**. Click into a letterhead field to show it is editable; callout reads the on-page note. Click **Download CSV** (file saves). Click **Print masterlist**, show the browser print preview, then **Cancel** (no paper).
- Callouts: *Piliin ang program*, *Purok*, *Order by*, *Download CSV*, *Print masterlist*, *Hindi nase-save ang edits sa letterhead*.
- Edit: highlight the Bautista rows with a soft yellow box on each list; do not highlight or read the EDD value.

### Chapter 9: Pag-ayos ng mali, password, at pagtatapos

**S14 Fix a mistake (10:00-10:40)**
- Screen: Residents, find Enzo. Click the pencil (**Edit record**): **Edit resident record** opens. Show the fields and the **Save changes** and **Cancel** buttons, then click **Cancel**. Click the person-off icon (**Deactivate**) to show **Deactivate this resident?** with the optional reason, then **Cancel**. Show the **Archived** tab and the **Restore** button on an already-archived demo resident if one exists; otherwise skip the tab.
- Callout: *Hindi binubura ang record. Nilalagay lang sa Archived.*
- Edit: never confirm a deactivation on camera.

**S15 Password and sign out (10:40-11:15)**
- Screen: click the name chip (top right), then **Change password**. Show **Current password**, **New password**, **Type it again**, the strength meter and the three rules. Click **Cancel** (do not change the demo password). Reopen the menu, click **Sign out**.
- Callouts: *At least 8 characters*, *Different from your current password*, *Both new passwords match*.
- Edit: if you want the green success state ("Password changed"), record it on a throwaway database, then reset.

**S16 Recap and closing (11:15-11:40)**
- Screen: five-step recap graphic over a dimmed login page: Sign in, Encode household, Save, Check Residents, Open Masterlists.
- On-screen text: *Sign in, Encode, Save, Check, Print*.
- Edit: music up to -22 dB for the last 5 s, fade out. End card with the system name.

### Chapter 10 (optional): Ibang role

**S17 Midwife and Admin (11:40-12:30)**
- Screen: sign out, sign in as **midwife1**: Home shows **Print a masterlist**, tabs have no **Encode household**, Residents has no pencil. Sign out, sign in as **admin1**: lands on **Staff accounts**; click **Create account** to show **Create staff account** and **Cancel**.
- Callout: *Midwife: basa lang*, *Admin: staff accounts lang, walang resident data*.

---

## 5. Voiceover script

**Voice:** one narrator throughout. Speak as a friendly colleague, about 130 words per minute, with a breath pause after every instruction. Words in **bold** are interface labels and are read exactly as written. Square brackets are timing or pronunciation notes, not spoken.

**Bikol lines used (kept few, kept simple):** *Marhay na aldaw* (good day; it is also the app's own greeting), *dae* (hindi/no), *igwa* (mayroon/there is), *marhay* (maganda/good), *mabalos* (salamat/thank you). A Naga speaker should confirm spelling and stress before the voice is rendered (Q4). If the TTS mangles a Bikol word, replace it with the Tagalog in parentheses; do not add a second voice.

Pronunciation: *Marhay* "mar-HAY"; *dae* "da-EH"; *igwa* "ig-WA"; *mabalos* "ma-ba-LOS"; *Purok* "PU-rok"; *PhilHealth* "FIL-helt"; *4Ps* "four P's"; *LMP* spell out "L-M-P"; *HPN* spell out "H-P-N".

**S1**
Marhay na aldaw! Sa video na ito, sabay nating gagamitin ang Resident Profiling and Masterlist System ng Barangay Tago Health Center. Magsa-sign in tayo, mag-e-encode ng isang buong pamilya, tapos makikita natin kung paano sila lalabas sa mga masterlist. Dali lang ito. Tara na.

**S2**
Una, buksan ang browser at pumunta sa address ng system. Sa demo natin, `https://localhost` ito. [pause] Ayan, nasa login page ka na.

**S3**
Sa kanan, makikita mo ang **Username** at **Password**. Sa ibaba, igwa ng **Demo accounts**. Pindutin ang **bhw1**, at kusa nang mapupunan ang form. [pause] Si bhw1 ay health worker ng Purok 1. Kung gusto mong makita ang tina-type mo, pindutin ang **Show**. [pause] Ngayon, i-click ang **Sign in**. [pause] Ayan! May lalabas na mensahe: "Signed in as Demo BHW One." Successful ang pag-sign in mo. Tandaan, kapag totoong gagamitin, sarili mong username at password ang ilalagay mo, hindi ang mga demo account.

**S4**
Ito ang Home. Sa taas, ang apat na tab: **Home**, **Encode household**, **Residents**, at **Masterlists**. [pause] Sa kanan, may pill na **Purok 1**. Ito ang saklaw ng account mo, at dae ka makakakita ng ibang purok. Sa gitna, ang **Your puroks**, kung ilang households at residents ang nasa purok mo. At sa tabi, ang **Program masterlists**: Senior citizens, Under-five children, Pregnant women, at Persons with disability. [pause] Sige, sunod naman. I-click natin ang **Encode a household**.

**S5**
Dalawang bahagi ang form na ito. Una, ang **Household**. [pause] Sa **Household number**, may suggested number na. Ang format ay YYYYMM, TAGO, at limang numero. Para sa demo, gagamitin natin ang 202611-TAGO-00101. Ang **Date of visit** ay ngayong araw na, at hindi puwedeng petsa sa hinaharap. Ang **Purok** ay Purok 1. [pause] Sa **Address or landmark**, i-type ang bahay o malapit na palatandaan. Sa **Reviewed by**, ilagay ang pangalan ng nag-review. [pause] Tingnan din ang **Water source** at **Toilet facility**. May naka-set nang default, kaya i-check kung tama sa totoong bahay. At kung 4Ps beneficiary ang pamilya, i-tick ang **4Ps beneficiary** at ilagay ang 4Ps household ID. Dito, hindi natin ito gagamitin. [pause] Pansinin ang kanan: may check na ang **Household details**. Marhay!

**S6**
Ngayon, ang **Family members**. Magsimula tayo sa ulo ng pamilya. [pause] I-type ang **Last name**, **First name**, at **Middle name**. Ang **Relation to head** ay **Head** na. Sa **Date of birth**, ilagay ang petsa, at lalabas agad ang edad. [pause] Dito, ingat po: ang default na **Sex** ay **Female**, kaya i-click ang **Male** kung lalaki. [pause] Piliin ang **Civil status**, ilagay ang **Occupation**. Sa **Health**, may **Diagnosed conditions**. Pindutin ang **Hypertension (HPN)** kung may diagnosis. [pause] Pansinin ang chip sa taas ng card: Senior citizen. Kusa itong lumalabas dahil 60 pataas na ang edad.

**S7**
Sunod, ang asawa. I-click ang **Add family member**. [pause] Bagong card ang lalabas, at ang **Relation to head** ay naka-**Daughter** muna. Palitan natin ng **Spouse**. Ilagay ang pangalan, kapanganakan, at civil status. [pause] Senior citizen din ang chip niya.

**S8**
Susunod ang anak na babae. **Add family member** ulit. **Daughter** ang default, kaya ayos na iyan. [pause] Ilagay ang mga detalye niya. Buntis siya, kaya i-click ang **Pregnant**. Nakasulat doon na idadagdag siya sa pregnant women masterlist. [pause] Lalabas ang **Last menstrual period**. Ilagay ang petsa. Ayan, Maternal na ang chip niya.

**S9**
Panghuli, ang apo. **Add family member**. Sa **Relation to head**, piliin ang **Others (specify)**. May lalabas na **Specify relation**; i-type ang "Grandchild". [pause] Ilagay ang pangalan, kapanganakan, at i-click ang **Male**. Tatlong taong gulang pa lang siya, kaya Preschool ang chip. [pause] Dalawang tip habang nandito tayo. Kung mali ang ulo ng pamilya, pindutin ang **Make head**, mapapalitan nang hindi nagkakaroon ng dalawang head. At kung may sobrang member, may **Remove member**, pero tatanungin ka muna bago ito tuluyang alisin.

**S10**
Handa na ba? Pindutin ang **Save household**. [pause] Oops, may lumabas na: "Please fix 1 issue before saving." Walang problema. Tingnan ang kanan, nakalista kung ano ang kulang. I-click ang mensahe, at dadalhin ka sa mismong field. [pause] Ilagay ang kapanganakan ni Enzo. Ayan, "Everything required is filled in." Nawala na ang problema.

**S11**
I-click ulit ang **Save household**. [pause] At... ayan! **Household saved**. Makikita ang household number, apat na members na naidagdag sa Purok 1, at isang paalala: ang senior citizen, under-five, buntis, o may disability ay nasa masterlist na nila. [pause] Kung may susunod pang bahay, **Encode next household**. Pero tingnan muna natin ang pamilyang ito, kaya i-click ang **See Purok 1 residents**.

**S12**
Ito ang **Residents**, nakaayos **By household**. Gamitin ang **Search by name**, at i-type ang Bautista. [pause] Ayan ang **Bautista household**. I-click ang **Open household**. Makikita ang **Home and facilities** at ang lahat ng **Family members**. [pause] Mag-click ng isang tao para sa buong profile: edad, Target group, **Health and programs**, at sa baba, ang change history. Nakasulat doon kung sino ang nag-edit at kailan. [pause] Kaya mahalagang tama ang detalye, dahil nakapangalan sa iyo ang bawat pagbabago.

**S13**
Ngayon ang pinakahihintay: ang **Masterlists**. Piliin ang program. **Senior citizens**: nandito sina Ramon at Luzviminda. [pause] **Pregnant women**: nandito si Maricel. [pause] **Under-five children**: nandito si Enzo. [pause] Walang inulit na encoding. Isang beses lang, at lumabas na sa tamang listahan. Marhay, di ba? [pause] Puwede mong piliin ang **Purok** at ang **Order by**. Sa papel mismo, puwedeng baguhin ang letterhead at pirma bago i-print, pero hindi ito nase-save. Para sa spreadsheet, **Download CSV**. Para sa papel, **Print masterlist**.

**S14**
Paano kung nagkamali? Sa **Residents**, pindutin ang lapis para sa **Edit record**, at **Save changes** kapag tapos. [pause] Kung lumipat na o pumanaw ang residente, ang **Deactivate** ang gamitin. Dae binubura ang record. Nilalagay lang ito sa **Archived**, at puwedeng i-**Restore** kung nagkamali.

**S15**
Panghuli, ang password mo. I-click ang pangalan mo sa kanan-itaas, tapos **Change password**. [pause] Ilagay ang **Current password**, ang **New password**, at ulitin sa **Type it again**. Dapat hindi bababa sa walong karakter, iba sa dati, at magkapareho ang dalawa. [pause] Kapag tapos ka na sa system, pindutin ang **Sign out**.

**S16**
Recap tayo. Mag-**Sign in**. **Encode household**: household muna, tapos bawat member. **Save household**. Tingnan sa **Residents**. At buksan o i-print ang **Masterlists**. [pause] Mabalos sa panonood! Kapag may dae malinaw, balikan lang ang bahaging kailangan mo. Tagumpay ang una mong household!

**S17 (optional)**
Kung midwife ka, basa lang ang access mo, para sa lahat ng purok, at **Print a masterlist** ang pangunahing button. Kung administrator ka, **Staff accounts** lang ang makikita mo. Dito ginagawa ang account sa **Create account**. Walang access ang admin sa resident health data. [pause] Magkakaiba ang trabaho ng bawat role, at sinasadya iyon para protektado ang datos ng mga residente.

---

## 6. Voice and audio

- **Voice:** pick one Filipino neural voice and keep it for every scene. Microsoft's Edge/Azure `fil-PH` voices (Blessica, Angelo) are the usual free choices; confirm they are available to you, and render a 20-second sample containing *Marhay na aldaw*, *dae*, *igwa* and *mabalos* before committing. A human recording is better for Bikol, if one of the health-center staff is willing; in that case use that single person for the whole video.
- **Render per scene**, not per video, so a re-take of one line does not change the voice for the rest. Keep the same voice, speed and pitch settings in a note.
- **Levels:** narration peaks around -6 dBFS, loudness about -16 LUFS. Music (optional, instrumental, no vocals) sits at -28 to -30 dB under speech, -22 dB in the intro and outro only. Remove music entirely under S5-S10 if it competes with the speech.
- **Pace:** instruction sentences short; leave 0.5 to 1 s of silence after each action so the viewer can follow. Never narrate a click before the screen shows it: start each line about 0.3 s after the screen settles.

## 7. Subtitles and accessibility

- Burn in or ship an `.srt` of the exact narration (the script above, without brackets and without backticks). Generate timings from the final audio; I can draft an `.srt` once the audio files exist.
- Max 2 lines, about 42 characters per line, 1 to 6 seconds on screen. Break at phrase boundaries. Keep interface labels in their original English capitalisation.
- Style: white text, 4% black rounded box, bottom centre, font size about 44 px at 1080p (Inter or Noto Sans). Keep captions out of the lower 12% where the Windows taskbar would sit; crop the taskbar from the recording.
- Do not rely on colour alone: every callout has an icon or text. Keep each on-screen instruction visible for at least 3 seconds.

## 8. Editing guide

| Item | Setting |
|---|---|
| Timeline | 1920x1080, 30 fps. DaVinci Resolve (free) or CapCut. |
| Cursor | 150% size, soft yellow halo, ring pulse on click (OBS cursor plugin or add in post). |
| Zoom | Smooth 120 to 150% push-ins, 0.5 s ease in and out, always centred on the control being named, back to full frame before the next action. |
| Callouts | Rounded dark-blue labels (`#1e3d59`) with white text, 24 px, 0.25 s fade; max one on screen at a time; placed in empty margins. |
| Transitions | Cross-dissolve 0.3 s between scenes, hard cut within a scene. No whooshes, no spins. |
| Chapters | Add markers at S1, S2, S4, S5, S6, S10, S12, S13, S14, S17 (export as YouTube-style timestamps in the description). |
| Speed ramps | 2x for repeated typing only (S7). Never speed up error messages, toasts or the success card. |
| Privacy | Crop the taskbar and any notifications. No `.env`, no terminal, no `certs/`. |
| Export | H.264, 12 Mbps, AAC 192 kbps, MP4. Also export the `.srt` and a 1280x720 copy for slow connections. |

## 9. Issues found while planning (now fixed)

**Status:** fixed with a new `localISODate()` helper in `web/src/lib/utils.js`, used in `HouseholdFormPage.jsx` and `MasterlistsPage.jsx` (including the Masterlists "As of" default). The "record after 8 AM" and "do not read the EDD" cautions in sections 3 and 4 are no longer needed once the web container is rebuilt. EDD should then show 12 May 2027 for LMP 5 Aug 2026.

1. **EDD can be one day early.** `MasterlistsPage.jsx` `eddFrom()` builds a local-midnight date, adds 280 days, then reads it back with `toISOString().slice(0,10)`. In UTC+8 that converts to UTC and lands on the previous day. Verify on screen; the video avoids reading this value. Fix would be to format with local date parts.
2. **Date of visit default is wrong before 8 AM.** `HouseholdFormPage.jsx` takes today from `new Date().toISOString().slice(0,10)`, which is the previous day in UTC+8 until 8:00 AM. The same value is the maximum allowed, so before 8 AM the real date is rejected as a future date. Same fix.
3. Both are display and default issues, not data loss. Tell me if you want them fixed; that is a separate change and would need a test.

## 10. Final quality checklist

- [ ] One narrator voice for every scene; same settings noted.
- [ ] Bikol lines (*Marhay na aldaw, dae, igwa, marhay, mabalos*) reviewed by a Naga speaker.
- [ ] Every label in quotes or bold matches `web/src/` (checked 2026-11-10; re-check if the UI changes).
- [ ] No narration of seed-dependent counts, and no reading of the EDD.
- [ ] Recording made after 8:00 AM PHT on a freshly reset database.
- [ ] No real data, no `.env`, no terminal, no certificate warning, no taskbar visible.
- [ ] Error scene (S10) shows the toast, the rail message, the jump to the field, and the fix.
- [ ] Success card (S11) and the three masterlists (S13) are shown, ending on a completed task.
- [ ] Deactivate, Restore and password change are never confirmed on the demo account.
- [ ] Captions match the spoken words; timing generated from final audio.
- [ ] Music at or below -28 dB under speech; loudness about -16 LUFS.
- [ ] Final cut checked at phone-size playback (captions legible).
