import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput, Modal, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import axios from "axios";
import API from "../../api/api";
import { colors } from "../../theme";

const GREEN = "#15A765";
const AMBER = "#E0A800";

// Tappable 1–5 star row.
function StarRow({ value = 0, onRate, size = 26 }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity key={i} onPress={() => onRate(i === value ? 0 : i)} hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }} style={{ paddingHorizontal: 2 }}>
          <Ionicons name={i <= value ? "star" : "star-outline"} size={size} color={i <= value ? AMBER : "#C9CDD3"} />
        </TouchableOpacity>
      ))}
    </View>
  );
}
function StarsStatic({ value = 0, size = 14 }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= value ? "star" : "star-outline"} size={size} color={i <= value ? AMBER : "#C9CDD3"} />
      ))}
    </View>
  );
}

// Coach/substitute progress — rate students against syllabus topics, view reports.
export default function TrainerProgress() {
  const [combos, setCombos] = useState([]);
  const [combo, setCombo] = useState(null); // {sport, standard}
  const [tab, setTab] = useState("rate"); // "rate" | "reports"
  const [loading, setLoading] = useState(true);

  const loadCombos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API.BASE_URL}/syllabus/mine`);
      // only combos that actually have topics to rate against
      const list = (res.data?.combos || []).filter((c) => (c.entries ? c.entries.length : c.total) > 0);
      setCombos(list);
    } catch {
      setCombos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCombos(); }, [loadCombos]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerBar}>
        {combo ? (
          <TouchableOpacity onPress={() => setCombo(null)} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.headerTitle}>{combo ? `${combo.sport} · Std ${combo.standard}` : "Progress"}</Text>
      </View>

      {!combo ? (
        <ComboPicker combos={combos} loading={loading} onPick={setCombo} onRefresh={loadCombos} />
      ) : (
        <>
          <View style={styles.segment}>
            {[["rate", "Rate"], ["reports", "Reports"], ["history", "History"]].map(([k, label]) => (
              <TouchableOpacity key={k} onPress={() => setTab(k)} style={[styles.segBtn, tab === k && styles.segBtnActive]}>
                <Text style={[styles.segText, tab === k && styles.segTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {tab === "rate" ? <RateView combo={combo} /> : tab === "reports" ? <ReportsView combo={combo} /> : <HistoryView combo={combo} />}
        </>
      )}
    </SafeAreaView>
  );
}

function ComboPicker({ combos, loading, onPick, onRefresh }) {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={GREEN} />}
    >
      <Text style={styles.pickLabel}>Choose a class to track</Text>
      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color={GREEN} /></View>
      ) : combos.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="trending-up-outline" size={34} color={colors.borderDark} />
          <Text style={styles.emptyTitle}>Nothing to track yet</Text>
          <Text style={styles.emptyDesc}>Once your admin adds a syllabus for your sport, you can rate students here.</Text>
        </View>
      ) : (
        combos.map((c) => (
          <TouchableOpacity key={`${c.sport}|${c.standard}`} style={styles.comboRow} onPress={() => onPick({ sport: c.sport, standard: c.standard })}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.comboTitle}>{c.sport}{c.standard ? ` · Std ${c.standard}` : ""}</Text>
              <Text style={styles.comboMeta}>{(c.entries ? c.entries.length : c.total)} topic(s){c.isToday ? " · today" : ""}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSub} />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

// ── Rate: pick a topic → tap stars per student ──
function RateView({ combo }) {
  const [data, setData] = useState({ topics: [], students: [], ratings: {} });
  const [topicIdx, setTopicIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [remarkFor, setRemarkFor] = useState(null); // {studentId, name, entryId, stars, remark}

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API.BASE_URL}/progress/matrix`, { params: { sport: combo.sport, standard: combo.standard } });
      setData({ topics: res.data?.topics || [], students: res.data?.students || [], ratings: res.data?.ratings || {} });
    } catch (e) {
      setData({ topics: [], students: [], ratings: {} });
    } finally {
      setLoading(false);
    }
  }, [combo]);

  useEffect(() => { load(); }, [load]);

  const topic = data.topics[topicIdx];
  const keyFor = (sid) => `${sid}|${topic?._id}`;

  const rate = async (sid, stars, remark) => {
    if (!topic) return;
    const k = keyFor(sid);
    const prev = data.ratings[k];
    const next = stars > 0 ? { stars, remark: remark != null ? remark : (prev?.remark || "") } : null;
    setData((d) => {
      const r = { ...d.ratings };
      if (next) r[k] = next; else delete r[k];
      return { ...d, ratings: r };
    });
    try {
      await axios.post(`${API.BASE_URL}/progress/rate`, { studentId: sid, syllabusEntryId: topic._id, stars, remark: next ? next.remark : "" });
    } catch (e) {
      setData((d) => ({ ...d, ratings: { ...d.ratings, [k]: prev } })); // revert
      Alert.alert("Couldn't save", e.response?.data?.error || "Try again.");
    }
  };

  const submitReport = () => {
    const rated = Object.keys(data.ratings).length;
    if (!rated) { Alert.alert("Nothing to submit", "Rate at least one student first."); return; }
    Alert.alert(
      "Submit session report?",
      "This saves the current ratings to History as a read-only report. You can keep rating for the next session afterwards.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit", style: "default",
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await axios.post(`${API.BASE_URL}/progress/submit`, { sport: combo.sport, standard: combo.standard });
              Alert.alert("Saved to history", `Report for ${res.data?.submission?.studentsCount || 0} student(s) frozen.`);
            } catch (e) {
              Alert.alert("Couldn't submit", e.response?.data?.error || "Try again.");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <View style={styles.loadingBox}><ActivityIndicator color={GREEN} /></View>;
  if (data.topics.length === 0) return <View style={styles.emptyBox}><Text style={styles.emptyDesc}>No syllabus topics for this class.</Text></View>;
  if (data.students.length === 0) return <View style={styles.emptyBox}><Text style={styles.emptyDesc}>No students in this standard yet.</Text></View>;

  return (
    <View style={{ flex: 1 }}>
      {/* topic chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {data.topics.map((t, i) => (
          <TouchableOpacity key={t._id} onPress={() => setTopicIdx(i)} style={[styles.chip, i === topicIdx && styles.chipActive]}>
            <Text style={[styles.chipText, i === topicIdx && styles.chipTextActive]}>W{t.weekNumber} · {t.topic}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        <Text style={styles.rateHint}>Tap a star to rate each student on “{topic?.topic}”.</Text>
        {data.students.map((s, idx) => {
          const r = data.ratings[keyFor(s._id)];
          return (
            <View key={s._id} style={styles.studentRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.studentName}>{idx + 1}. {s.name}</Text>
                {s.rollNo ? <Text style={styles.studentRoll}>#{s.rollNo}</Text> : null}
                {r?.remark ? <Text style={styles.remarkPreview} numberOfLines={1}>“{r.remark}”</Text> : null}
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <StarRow value={r?.stars || 0} onRate={(n) => rate(s._id, n)} />
                <TouchableOpacity onPress={() => setRemarkFor({ studentId: s._id, name: s.name, entryId: topic._id, stars: r?.stars || 0, remark: r?.remark || "" })}>
                  <Text style={styles.noteLink}>{r?.remark ? "Edit note" : "Add note"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <TouchableOpacity onPress={submitReport} disabled={submitting} style={styles.submitBtn}>
          {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark-done" size={18} color="#fff" />}
          <Text style={styles.submitBtnText}>Submit session report</Text>
        </TouchableOpacity>
        <Text style={styles.submitHint}>Freezes the current ratings into History (read-only).</Text>
      </ScrollView>

      <RemarkModal
        data={remarkFor}
        onClose={() => setRemarkFor(null)}
        onSave={(remark) => { if (remarkFor) rate(remarkFor.studentId, remarkFor.stars || 0, remark); setRemarkFor(null); }}
      />
    </View>
  );
}

// Module-scope so the TextInput doesn't remount (keyboard-drop safe).
function RemarkModal({ data, onClose, onSave }) {
  const [text, setText] = useState("");
  useEffect(() => { setText(data?.remark || ""); }, [data]);
  if (!data) return null;
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Note · {data.name}</Text>
          <Text style={styles.modalSub}>{data.stars ? `${data.stars}/5 stars` : "Not rated yet"}</Text>
          <TextInput
            value={text} onChangeText={setText} placeholder="e.g. Good grip, needs footwork work"
            placeholderTextColor={colors.textSub} style={styles.modalInput} multiline
          />
          <View style={styles.modalBtns}>
            <TouchableOpacity onPress={onClose} style={styles.modalBtnGhost}><Text style={styles.modalBtnGhostText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => onSave(text.trim())} style={styles.modalBtnPrimary}><Text style={styles.modalBtnPrimaryText}>Save</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Reports: student list → tap → report card → share PDF ──
function ReportsView({ combo }) {
  const [students, setStudents] = useState([]);
  const [totalTopics, setTotalTopics] = useState(0);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API.BASE_URL}/progress/students`, { params: { sport: combo.sport, standard: combo.standard } });
      setStudents(res.data?.students || []);
      setTotalTopics(res.data?.totalTopics || 0);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [combo]);

  useEffect(() => { load(); }, [load]);

  const open = async (sid) => {
    setReportLoading(true);
    try {
      const res = await axios.get(`${API.BASE_URL}/progress/student/${sid}`, { params: { sport: combo.sport } });
      setReport(res.data);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.error || "Failed to load report");
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) return <View style={styles.loadingBox}><ActivityIndicator color={GREEN} /></View>;
  if (report || reportLoading) return <ReportCard report={report} loading={reportLoading} onBack={() => setReport(null)} />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={GREEN} />}>
      {students.length === 0 ? (
        <View style={styles.emptyBox}><Text style={styles.emptyDesc}>No students in this standard yet.</Text></View>
      ) : students.map((s, i) => (
        <TouchableOpacity key={s._id} style={styles.studentRow} onPress={() => open(s._id)}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.studentName}>{i + 1}. {s.name}</Text>
            <Text style={styles.studentRoll}>{s.rated}/{s.totalTopics} topics rated</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 3 }}>
            <StarsStatic value={Math.round(s.average)} />
            <Text style={styles.avgText}>{s.average || "—"} / 5</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function ReportCard({ report, loading, onBack }) {
  const [sharing, setSharing] = useState(false);
  if (loading || !report) return <View style={styles.loadingBox}><ActivityIndicator color={GREEN} /></View>;

  const sharePdf = async () => {
    setSharing(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: reportHtml(report) });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Share progress report" });
    } catch (e) {
      Alert.alert("Error", "Couldn't create the PDF.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
      <View style={styles.reportHeadRow}>
        <TouchableOpacity onPress={onBack}><Ionicons name="chevron-back" size={22} color={colors.text} /></TouchableOpacity>
        <TouchableOpacity onPress={sharePdf} disabled={sharing} style={styles.pdfBtn}>
          {sharing ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="share-outline" size={15} color="#fff" />}
          <Text style={styles.pdfBtnText}>PDF</Text>
        </TouchableOpacity>
      </View>

      {report.schoolName ? <Text style={styles.reportSchool}>{report.schoolName}</Text> : null}
      <Text style={styles.reportName}>{report.student?.name}</Text>
      <Text style={styles.reportSub}>Std {report.student?.standard}{report.student?.rollNo ? ` · Roll #${report.student.rollNo}` : ""}</Text>
      <View style={styles.overallRow}>
        <StarsStatic value={Math.round(report.overall?.average || 0)} size={18} />
        <Text style={styles.overallText}>Overall {report.overall?.average || "—"} / 5 · {report.overall?.rated}/{report.overall?.total} topics</Text>
      </View>

      {report.trend && report.trend.length > 1 ? (
        <View style={styles.trendBox}>
          <Text style={styles.trendBoxLabel}>PROGRESS OVER TIME</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {report.trend.map((p, i) => (
              <View key={i} style={styles.trendChip}>
                <Text style={styles.trendChipAvg}>{p.average}★</Text>
                <Text style={styles.trendChipDate}>{fmtDate(p.at)}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {(report.sports || []).length === 0 ? (
        <Text style={styles.emptyDesc}>No topics rated yet.</Text>
      ) : report.sports.map((sp) => (
        <View key={sp.sport} style={styles.reportSport}>
          <View style={styles.reportSportHead}>
            <Text style={styles.reportSportName}>{sp.sport}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <StarsStatic value={Math.round(sp.average)} />
              <Text style={styles.avgText}>{sp.average || "—"} / 5</Text>
            </View>
          </View>
          {sp.topics.map((t, i) => (
            <View key={i} style={styles.reportTopicRow}>
              <Text style={styles.weekTag}>W{t.weekNumber}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.reportTopic}>{t.topic}</Text>
                {t.remark ? <Text style={styles.reportRemark}>“{t.remark}”</Text> : null}
                {t.history && t.history.length > 1 ? (
                  <Text style={styles.trendLine}>Trend: {t.history.map((h) => h.stars).join(" → ")}</Text>
                ) : null}
              </View>
              {t.stars ? <StarsStatic value={t.stars} /> : <Text style={styles.dash}>—</Text>}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

// ── History: list of frozen session reports → read-only snapshot ──
function HistoryView({ combo }) {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snap, setSnap] = useState(null);
  const [snapLoading, setSnapLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API.BASE_URL}/progress/history`, { params: { sport: combo.sport, standard: combo.standard } });
      setSubs(res.data?.submissions || []);
    } catch { setSubs([]); } finally { setLoading(false); }
  }, [combo]);
  useEffect(() => { load(); }, [load]);

  const open = async (id) => {
    setSnapLoading(true);
    try {
      const res = await axios.get(`${API.BASE_URL}/progress/history/submission/${id}`);
      setSnap(res.data);
    } catch (e) { Alert.alert("Error", e.response?.data?.error || "Failed to load"); } finally { setSnapLoading(false); }
  };

  if (loading) return <View style={styles.loadingBox}><ActivityIndicator color={GREEN} /></View>;
  if (snap || snapLoading) return <SnapshotView snap={snap} loading={snapLoading} onBack={() => setSnap(null)} />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={GREEN} />}>
      {subs.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="time-outline" size={32} color={colors.borderDark} />
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptyDesc}>Submit a session report in the Rate tab and it'll appear here, read-only.</Text>
        </View>
      ) : subs.map((s) => (
        <TouchableOpacity key={s._id} style={styles.studentRow} onPress={() => open(s._id)}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.studentName}>{fmtDate(s.createdAt)}</Text>
            <Text style={styles.studentRoll}>{s.studentsCount} student(s) · {s.topicsCount} topic(s){s.submittedByName ? ` · ${s.submittedByName}` : ""}</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 3 }}>
            <StarsStatic value={Math.round(s.average)} />
            <Text style={styles.avgText}>{s.average || "—"} / 5</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function SnapshotView({ snap, loading, onBack }) {
  if (loading || !snap) return <View style={styles.loadingBox}><ActivityIndicator color={GREEN} /></View>;
  const s = snap.submission || {};
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
      <View style={styles.reportHeadRow}>
        <TouchableOpacity onPress={onBack}><Ionicons name="chevron-back" size={22} color={colors.text} /></TouchableOpacity>
        <View style={styles.roBadge}><Text style={styles.roBadgeText}>READ ONLY</Text></View>
      </View>
      <Text style={styles.reportName}>{fmtDate(s.createdAt)}</Text>
      <Text style={styles.reportSub}>{s.sport} · Std {s.standard}{s.submittedByName ? ` · by ${s.submittedByName}` : ""}</Text>

      {(snap.students || []).map((st) => (
        <View key={st.studentId} style={styles.reportSport}>
          <View style={styles.reportSportHead}>
            <Text style={styles.reportSportName}>{st.name}{st.rollNo ? ` · #${st.rollNo}` : ""}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <StarsStatic value={Math.round(st.average)} />
              <Text style={styles.avgText}>{st.average || "—"}</Text>
            </View>
          </View>
          {st.topics.map((t, i) => (
            <View key={i} style={styles.reportTopicRow}>
              <Text style={styles.weekTag}>W{t.weekNumber}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.reportTopic}>{t.topic}</Text>
                {t.remark ? <Text style={styles.reportRemark}>“{t.remark}”</Text> : null}
              </View>
              <StarsStatic value={t.stars} />
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
  catch { return String(d || ""); }
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function reportHtml(r) {
  const star = (n) => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
  const fmt = (d) => { try { return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" }); } catch { return ""; } };
  const trendHtml = (r.trend && r.trend.length > 1)
    ? `<div class="trend"><span class="tl">Progress over time:</span> ${r.trend.map((p) => `<span class="tp">${fmt(p.at)} · ${p.average}★</span>`).join(" → ")}</div>`
    : "";
  const sportsHtml = (r.sports || []).map((sp) => `
    <div class="sport">
      <div class="sport-head"><span>${esc(sp.sport)}</span><span class="avg">${star(Math.round(sp.average))} ${sp.average || "—"} / 5</span></div>
      <table><thead><tr><th>Week</th><th>Topic</th><th>Rating</th><th>Over time</th><th>Remark</th></tr></thead><tbody>
        ${sp.topics.map((t) => `<tr><td>W${t.weekNumber}</td><td>${esc(t.topic)}</td><td class="stars">${t.stars ? star(t.stars) : "—"}</td><td class="ot">${(t.history && t.history.length) ? t.history.map((h) => h.stars).join(" → ") : "—"}</td><td>${esc(t.remark) || "—"}</td></tr>`).join("")}
      </tbody></table>
    </div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1a181b;margin:28px}
    .head{border-bottom:3px solid #15A765;padding-bottom:12px;margin-bottom:18px}
    .school{color:#15A765;font-weight:700;font-size:12px;letter-spacing:.04em;text-transform:uppercase}
    h1{margin:6px 0 2px;font-size:22px} .sub{color:#555;font-size:12px}
    .overall{margin-top:8px;font-size:13px} .overall .stars{color:#e0a800;font-size:16px;letter-spacing:2px}
    .sport{margin-top:16px;border:1px solid #e3e6ea;border-radius:8px;overflow:hidden}
    .sport-head{display:flex;justify-content:space-between;background:#f3f6f4;padding:8px 12px;font-weight:700;font-size:13px}
    .avg{color:#777;font-weight:600;font-size:11px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{text-align:left;color:#888;text-transform:uppercase;font-size:10px;padding:7px 12px;border-bottom:1px solid #e3e6ea}
    td{padding:7px 12px;border-bottom:1px solid #eef1f3} tr:last-child td{border-bottom:none}
    .stars{color:#e0a800;letter-spacing:2px;white-space:nowrap}
    .ot{color:#15A765;font-weight:600;white-space:nowrap}
    .trend{margin-top:8px;font-size:11px;color:#444} .trend .tl{color:#888;text-transform:uppercase;font-size:10px;letter-spacing:.04em}
    .trend .tp{background:#f0f5f2;border-radius:4px;padding:1px 6px;white-space:nowrap}
    .foot{margin-top:22px;color:#999;font-size:11px;text-align:center}
  </style></head><body>
    <div class="head">
      ${r.schoolName ? `<div class="school">${esc(r.schoolName)}</div>` : ""}
      <h1>${esc(r.student?.name || "")}</h1>
      <div class="sub">Std ${esc(r.student?.standard || "")}${r.student?.rollNo ? ` · Roll #${esc(r.student.rollNo)}` : ""}</div>
      <div class="overall"><span class="stars">${star(Math.round(r.overall?.average || 0))}</span> Overall ${r.overall?.average || "—"} / 5 · ${r.overall?.rated}/${r.overall?.total} topics rated</div>
      ${trendHtml}
    </div>
    ${sportsHtml || "<p>No topics rated yet.</p>"}
    <div class="foot">Generated by Chalo Khelne · Progress report</div>
  </body></html>`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background || "#FAFAFA" },
  headerBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, gap: 4 },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 18, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text, flex: 1 },

  segment: { flexDirection: "row", backgroundColor: "#EDEFF2", borderRadius: 10, padding: 3, marginHorizontal: 16, marginBottom: 8 },
  segBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: "center" },
  segBtnActive: { backgroundColor: GREEN },
  segText: { fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "600", color: colors.textSub },
  segTextActive: { color: "#fff" },

  pickLabel: { fontSize: 12, fontFamily: "Montserrat_500Medium", color: colors.textSub, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  loadingBox: { paddingVertical: 40, alignItems: "center" },
  emptyBox: { marginTop: 24, marginHorizontal: 16, padding: 24, borderRadius: 14, backgroundColor: colors.white, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  emptyTitle: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.text, marginTop: 10 },
  emptyDesc: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, textAlign: "center", marginTop: 4, lineHeight: 18 },

  comboRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  comboTitle: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.text },
  comboMeta: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 2 },

  chipsRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "600", color: colors.text },
  chipTextActive: { color: "#fff" },
  rateHint: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginBottom: 10, marginTop: 2 },

  studentRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10, gap: 10 },
  studentName: { fontSize: 14, fontFamily: "Montserrat_500Medium", fontWeight: "600", color: colors.text },
  studentRoll: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 1 },
  remarkPreview: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 3, fontStyle: "italic" },
  noteLink: { fontSize: 11, fontFamily: "Montserrat_500Medium", fontWeight: "600", color: GREEN },
  avgText: { fontSize: 11, fontFamily: "Montserrat_500Medium", color: colors.textSub },

  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: colors.white, borderRadius: 16, padding: 18 },
  modalTitle: { fontSize: 15, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.text },
  modalSub: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 2, marginBottom: 10 },
  modalInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 13, fontFamily: "Montserrat_400Regular", color: colors.text, minHeight: 70, textAlignVertical: "top" },
  modalBtns: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 14 },
  modalBtnGhost: { paddingVertical: 9, paddingHorizontal: 14 },
  modalBtnGhostText: { fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "600", color: colors.textSub },
  modalBtnPrimary: { backgroundColor: GREEN, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 10 },
  modalBtnPrimaryText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: "#fff" },

  reportHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  pdfBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: GREEN, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  pdfBtnText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: "#fff" },
  reportSchool: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: GREEN, letterSpacing: 0.5, textTransform: "uppercase" },
  reportName: { fontSize: 20, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text, marginTop: 2 },
  reportSub: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 2 },
  overallRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 6 },
  overallText: { fontSize: 12, fontFamily: "Montserrat_500Medium", color: colors.text },
  reportSport: { marginTop: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden", backgroundColor: colors.white },
  reportSportHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "rgba(21,167,101,0.06)" },
  reportSportName: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.text },
  reportTopicRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.borderLight || "#F0F0F0" },
  weekTag: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: GREEN, backgroundColor: "rgba(21,167,101,0.10)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, overflow: "hidden" },
  reportTopic: { fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "600", color: colors.text },
  reportRemark: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: colors.textSub, fontStyle: "italic", marginTop: 2 },
  trendLine: { fontSize: 11, fontFamily: "Montserrat_500Medium", fontWeight: "600", color: GREEN, marginTop: 3 },
  dash: { fontSize: 13, color: colors.textSub },

  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: GREEN, paddingVertical: 13, borderRadius: 12, marginTop: 8 },
  submitBtnText: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: "#fff" },
  submitHint: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: colors.textSub, textAlign: "center", marginTop: 6 },

  roBadge: { backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  roBadgeText: { fontSize: 10, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.textSub, letterSpacing: 0.5 },

  trendBox: { marginTop: 10, marginBottom: 4, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12 },
  trendBoxLabel: { fontSize: 10, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.textSub, letterSpacing: 0.5, marginBottom: 8 },
  trendChip: { backgroundColor: "rgba(21,167,101,0.08)", borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12, alignItems: "center", minWidth: 64 },
  trendChipAvg: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: GREEN },
  trendChipDate: { fontSize: 10, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 2 },
});
